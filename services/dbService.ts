
import { 
  User, Case, CaseStatus, UserRole, UserStatus, AgencyApplicationStatus, PlatformType, MallOpeningStatus
} from '../types';
import { supabase } from './supabaseClient.browser';
import { mockUsers, mockCases } from './mockData';

class DBService {
  private isDemoMode: boolean = !supabase || !(import.meta as any).env?.VITE_SUPABASE_URL;
  private toInternalEmail(loginId: string): string {
    const trimmedId = loginId.trim().toLowerCase();
    if (trimmedId.includes('@')) return trimmedId;
    return `${trimmedId}@net-shop.com`;
  }

  private generateRandomCode(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private normalizePayload(data: any): any {
    if (data === null || data === undefined) return null;
    if (typeof data === 'string') return data.trim() === '' ? null : data;
    if (Array.isArray(data)) return data.map(item => this.normalizePayload(item));
    if (typeof data === 'object') {
      const normalized: any = {};
      for (const key in data) normalized[key] = this.normalizePayload(data[key]);
      return normalized;
    }
    return data;
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.isDemoMode) {
      const savedUser = localStorage.getItem('netshop_demo_user');
      if (savedUser) {
        try {
          return JSON.parse(savedUser);
        } catch (e) {
          return null;
        }
      }
      return null;
    }
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session || !session.user) return null;
      
      const { data: profile } = await supabase.from('users')
        .select('*')
        .eq('auth_uid', session.user.id)
        .maybeSingle();
        
      return profile ? this.mapUser(profile) : null;
    } catch (e) {
      return null;
    }
  }

  async login(loginId: string, pass: string): Promise<User | null> {
    const normalizedLoginId = loginId.trim().toLowerCase();
    
    if (this.isDemoMode) {
      console.log("Demo login attempt:", normalizedLoginId);
      const user = mockUsers.find(u => 
        (u.loginId || '').toLowerCase() === normalizedLoginId || 
        (u.email || '').toLowerCase() === normalizedLoginId
      );
      
      const isPassOk = user && ((user as any).password === pass || pass === 'demo');
      
      if (user && isPassOk) {
        localStorage.setItem('netshop_demo_user', JSON.stringify(user));
        return user;
      }
      return null;
    }
    // 1. ユーザープロファイルを先に取得して、登録されているメールアドレスを確認する
    const { data: profileByLoginId } = await supabase
      .from('users')
      .select('email, auth_uid')
      .ilike('login_id', normalizedLoginId)
      .maybeSingle();

    // 試行するメールアドレスのリスト
    const emailsToTry = new Set<string>();
    
    // 入力自体がメールアドレス形式ならそれを最優先
    if (normalizedLoginId.includes('@')) {
      emailsToTry.add(normalizedLoginId);
    } else {
      // ログインID形式なら、生成された内部メールを最初に入れる
      emailsToTry.add(`${normalizedLoginId}@net-shop.com`);
    }
    
    // プロファイルが見つかれば、そこに登録されているメールも試行リストに追加
    if (profileByLoginId?.email) {
      emailsToTry.add((profileByLoginId.email || '').toLowerCase());
    }

    let lastAuthError: any = null;
    let authUser: any = null;

    // 候補のメールアドレスで順次ログインを試みる
    for (const email of Array.from(emailsToTry)) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (!authError && authData.user) {
          authUser = authData.user;
          break;
        }
        lastAuthError = authError;
      } catch (e) {
        lastAuthError = e;
      }
    }

    if (!authUser) {
      console.error("Login failed for all email candidates. Last error:", lastAuthError);
      return null;
    }
    
    const authUid = authUser.id;

    // ログイン成功後、auth_uid でプロファイルを再取得
    const { data: profile } = await supabase.from('users')
      .select('*')
      .eq('auth_uid', authUid)
      .maybeSingle();
      
    // プロファイルが見つからない場合、ログインIDで紐付けを試みる（初回ログイン時などの救済）
    if (!profile && !normalizedLoginId.includes('@')) {
      const { data: linkedProfile } = await supabase.from('users')
        .update({ auth_uid: authUid })
        .ilike('login_id', normalizedLoginId)
        .select()
        .maybeSingle();
      return linkedProfile ? this.mapUser(linkedProfile) : null;
    }

    return profile ? this.mapUser(profile) : null;
  }

  async getUsers(): Promise<User[]> {
    if (this.isDemoMode) return mockUsers;
    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) {
        console.warn("Error fetching users (likely RLS):", error.message);
        return [];
      }
      return (data || []).map((u: any) => this.mapUser(u));
    } catch (e) {
      return [];
    }
  }

  async getCases(user: User): Promise<Case[]> {
    if (!user) return [];
    if (this.isDemoMode) {
      const uId = (user.id || '').toLowerCase();
      const lId = (user.loginId || '').toLowerCase();
      return mockCases.filter(c => {
        const rId = (c.referrerId || '').toLowerCase();
        return rId === uId || (lId && rId === lId);
      });
    }
    // 確実にマッチさせるため、一度取得してからメモリ上でフィルタリング
    // これにより、UUID/ログインIDの混在や大文字小文字の差異を確実に吸収できる
    const { data: allData, error } = await supabase.from('cases').select('*');
    if (error || !allData) {
      if (error) console.error("Error in getCases:", error);
      return [];
    }
    
    const uId = (user.id || '').toLowerCase();
    const lId = (user.loginId || '').toLowerCase();
    
    const filtered = allData.filter((c: any) => {
      if (!c.referrer_id) return false;
      const rId = (c.referrer_id || '').toLowerCase();
      return rId === uId || (lId && rId === lId);
    });
    
    return filtered
      .map((c: any) => this.mapCase(c))
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getAllCases(): Promise<Case[]> {
    if (this.isDemoMode) return mockCases;
    try {
      const { data, error } = await supabase.from('cases').select('*').order('updated_at', { ascending: false });
      if (error) {
        console.warn("Error fetching all cases (likely RLS):", error.message);
        return [];
      }
      return (data || []).map((c: any) => this.mapCase(c));
    } catch (e) {
      return [];
    }
  }

  async getCaseById(id: string): Promise<Case | null> {
    if (this.isDemoMode) return mockCases.find(c => (c.id || '').toLowerCase() === (id || '').toLowerCase()) || null;
    // ilike を使用して大文字小文字の差異を許容する
    const { data, error } = await supabase.from('cases').select('*').ilike('id', id).maybeSingle();
    if (error) throw error;
    return data ? this.mapCase(data) : null;
  }

  async createCase(newCaseData: any, actor: User, customReferrerId?: string): Promise<Case | null> {
    if (this.isDemoMode) {
      const newCase: Case = {
        ...newCaseData,
        id: `CASE-${this.generateRandomCode(6)}`,
        referrerId: customReferrerId || actor.id,
        status: CaseStatus.SUBMITTED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks: [],
        documents: [],
        reviews: [],
        mallProgress: { rakuten: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
        subline: { status: 'none' },
        emailJp: { status: 'none' },
        rakutenInfo: {}
      };
      mockCases.unshift(newCase);
      return newCase;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("セッションが見つかりません。");
    
    const { data: me } = await supabase.from('users')
      .select('id')
      .eq('auth_uid', session.user.id)
      .maybeSingle();
      
    if (!me) throw new Error("プロフィールが見つかりません。");
    
    // 指定された紹介者IDがあればそれを使用、なければ自分
    const referrerIdForCase = customReferrerId || me.id;
    
    // users テーブルの referrer_id は UUID 型のため、paXXXX の場合は UUID に変換を試みる
    let referrerUuidForUser: string | null = null;
    if (customReferrerId) {
      if ((customReferrerId || '').toLowerCase().startsWith('pa')) {
        const { data: refUser } = await supabase.from('users').select('id').ilike('login_id', customReferrerId).maybeSingle();
        referrerUuidForUser = refUser ? refUser.id : null;
      } else {
        referrerUuidForUser = customReferrerId;
      }
    } else {
      referrerUuidForUser = me.id;
    }
    
    // 紹介者の名前を取得
    let referrerName = actor.name;
    if (customReferrerId && customReferrerId !== me.id) {
      const { data: refUser } = await supabase.from('users').select('name').or(`id.eq.${customReferrerId},login_id.eq.${customReferrerId}`).maybeSingle();
      if (refUser) referrerName = refUser.name;
    }

    const rate = await this.calculateRate(referrerIdForCase);
    
    const { data: lastCases } = await supabase
      .from('cases')
      .select('id')
      .ilike('id', 'pa%')
      .order('id', { ascending: false })
      .limit(1);

    const { data: lastUsers } = await supabase
      .from('users')
      .select('login_id')
      .ilike('login_id', 'pa%')
      .order('login_id', { ascending: false })
      .limit(1);

    let nextIdNum = 1;
    let maxCaseNum = 0;
    let maxUserNum = 0;

    if (lastCases && lastCases.length > 0) {
      maxCaseNum = parseInt(lastCases[0].id.replace(/pa/i, ''), 10);
    }
    if (lastUsers && lastUsers.length > 0) {
      maxUserNum = parseInt(lastUsers[0].login_id.replace(/pa/i, ''), 10);
    }

    nextIdNum = Math.max(maxCaseNum, maxUserNum) + 1;
    const nextId = `pa${String(nextIdNum).padStart(4, '0')}`;

    const dbPayload = {
      id: nextId,
      agency_id: referrerIdForCase,
      agency_name: referrerName,
      referrer_id: referrerIdForCase,
      status: CaseStatus.DRAFT,
      platform: PlatformType.RAKUTEN,
      base_amount: 198000,
      applied_rate: rate,
      customer_type: newCaseData.customerType,
      company_name: newCaseData.companyName,
      company_name_kana: newCaseData.companyNameKana || '',
      representative_name: newCaseData.repName,
      representative_name_kana: newCaseData.repNameKana || '',
      rep_name: newCaseData.repName,
      rep_name_kana: newCaseData.repNameKana || '',
      phone: newCaseData.phone || '',
      email: newCaseData.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: caseResult, error: caseError } = await supabase.from('cases').insert([this.normalizePayload(dbPayload)]).select().single();
    if (caseError) {
      console.error("Case insertion failed:", caseError);
      throw caseError;
    }

    const newUser = {
      login_id: nextId, 
      email: this.toInternalEmail(nextId),
      name: newCaseData.companyName || newCaseData.repName,
      role: UserRole.AGENCY,
      status: UserStatus.CUSTOMER,
      referrer_id: referrerUuidForUser, 
      agency_application_status: AgencyApplicationStatus.NONE,
      created_at: new Date().toISOString()
    };
    
    const { error: userError } = await supabase.from('users').insert([newUser]);
    if (userError) {
      console.error("User profile insertion failed:", userError);
      // 案件は作成されているがユーザー作成に失敗した場合の処理
      // 本来はトランザクションが望ましいが、SupabaseクライアントではRPCが必要
      throw new Error(`案件は作成されましたが、ユーザープロファイルの作成に失敗しました: ${userError.message}`);
    }

    return caseResult ? this.mapCase(caseResult) : null;
  }

  async updateCase(id: string, updates: any, actor: User): Promise<Case | null> {
    if (this.isDemoMode) {
      const idx = mockCases.findIndex(c => (c.id || '').toLowerCase() === (id || '').toLowerCase());
      if (idx !== -1) {
        mockCases[idx] = { ...mockCases[idx], ...updates, updatedAt: new Date().toISOString() };
        return mockCases[idx];
      }
      return null;
    }
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    const mappings: Record<string, string> = {
      status: 'status', platform: 'platform', customerType: 'customer_type', companyName: 'company_name',
      companyNameKana: 'company_name_kana', representativeName: 'representative_name', representativeNameKana: 'representative_name_kana',
      repName: 'rep_name', repNameKana: 'rep_name_kana', repBirthDate: 'rep_birth_date', repZipCode: 'rep_zip_code',
      repAddress: 'rep_address', phone: 'phone', email: 'email', mallProgress: 'mall_progress', rakutenInfo: 'rakuten_info',
      subline: 'subline', emailJp: 'email_jp', tasks: 'tasks', isManualAdjustment: 'is_manual_adjustment',
      manualAgencyAmount: 'manual_agency_amount', baseAmount: 'base_amount'
    };
    Object.keys(updates).forEach(k => { if (mappings[k]) dbUpdates[mappings[k]] = updates[k]; });
    const { data, error } = await supabase.from('cases').update(this.normalizePayload(dbUpdates)).ilike('id', id).select().single();
    if (error) throw error;
    return data ? this.mapCase(data) : null;
  }

  async applyForAgency(caseData: Case, actor: User): Promise<{ ok: boolean, error?: any }> {
    if (this.isDemoMode) {
      const user = mockUsers.find(u => (u.loginId || '').toLowerCase() === (caseData.id || '').toLowerCase());
      if (user) {
        user.agencyApplicationStatus = AgencyApplicationStatus.PENDING;
      }
      return { ok: true };
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { ok: false, error: { message: "セッションが見つかりません。" } };

    const { data: me } = await supabase
      .from('users')
      .select('id')
      .eq('auth_uid', session.user.id)
      .maybeSingle();

    if (!me) return { ok: false, error: { message: "現在のユーザープロフィールが見つかりません。" } };
    
    const referrerUuid = me.id;
    const normalizedLoginId = (caseData.id || '').toLowerCase();

    // usersテーブルの更新
    const { data, error } = await supabase
      .from('users')
      .update({ 
        agency_application_status: AgencyApplicationStatus.PENDING,
        referrer_id: referrerUuid, 
        email: this.toInternalEmail(caseData.id), 
        name: caseData.companyName || caseData.repName || '新規顧客'
      })
      .ilike('login_id', normalizedLoginId)
      .select();

    // casesテーブルの紹介者情報も更新
    await supabase
      .from('cases')
      .update({ referrer_id: referrerUuid })
      .ilike('id', normalizedLoginId);
      
    return { ok: !error && data && data.length > 0, error };
  }

  async approveApplication(loginId: string): Promise<{ ok: boolean, message?: string }> {
    if (this.isDemoMode) {
      const user = mockUsers.find(u => (u.loginId || '').toLowerCase() === loginId.trim().toLowerCase());
      if (user) {
        user.agencyApplicationStatus = AgencyApplicationStatus.APPROVED;
        user.registrationCode = this.generateRandomCode();
      }
      return { ok: true };
    }
    const code = this.generateRandomCode();
    const { error } = await supabase
      .from('users')
      .update({ 
        agency_application_status: AgencyApplicationStatus.APPROVED,
        registration_code: code,
        registration_code_used_at: null 
      })
      .ilike('login_id', loginId);
    return { ok: !error, message: error?.message };
  }

  async reissueRegistrationCode(loginId: string): Promise<{ ok: boolean, code?: string }> {
    if (this.isDemoMode) {
      const user = mockUsers.find(u => (u.loginId || '').toLowerCase() === loginId.trim().toLowerCase());
      const newCode = this.generateRandomCode();
      if (user) user.registrationCode = newCode;
      return { ok: true, code: newCode };
    }
    const newCode = this.generateRandomCode();
    const { error } = await supabase
      .from('users')
      .update({ 
        registration_code: newCode,
        registration_code_used_at: null 
      })
      .ilike('login_id', loginId)
      .is('registration_code_used_at', null); 
    return { ok: !error, code: newCode };
  }

  async calculateRate(userId: string): Promise<number> {
    if (this.isDemoMode) {
      const approvedCount = mockCases.filter(c => (c.referrerId || '').toLowerCase() === (userId || '').toLowerCase() && c.status === CaseStatus.APPROVED).length;
      return approvedCount >= 11 ? 0.5 : (approvedCount >= 2 ? 0.4 : 0.3);
    }
    const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('referrer_id', userId).eq('status', CaseStatus.APPROVED);
    const approvedCount = count || 0;
    return approvedCount >= 11 ? 0.5 : (approvedCount >= 2 ? 0.4 : 0.3);
  }

  async getApprovedCount(userId: string): Promise<number> {
    if (this.isDemoMode) {
      return mockCases.filter(c => (c.referrerId || '').toLowerCase() === (userId || '').toLowerCase() && c.status === CaseStatus.APPROVED).length;
    }
    const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('referrer_id', userId).eq('status', CaseStatus.APPROVED);
    return count || 0;
  }

  async getTeamCases(user: User): Promise<Case[]> {
    if (!user) return [];
    if (this.isDemoMode) {
      const uId = (user.id || '').toLowerCase();
      const lId = (user.loginId || '').toLowerCase();
      
      const getDownlineIds = (parentUserId: string, parentLoginId: string, isRoot: boolean = true): string[] => {
        const children = mockCases.filter(c => {
          const rId = (c.referrerId || '').toLowerCase();
          return rId === (parentUserId || '').toLowerCase() || rId === (parentLoginId || '').toLowerCase();
        });
        
        let ids: string[] = isRoot ? [] : children.map(c => c.id);
        for (const child of children) {
          const linkedUser = mockUsers.find(u => (u.loginId || '').toLowerCase() === (child.id || '').toLowerCase());
          if (linkedUser) {
            ids = [...ids, ...getDownlineIds(linkedUser.id, linkedUser.loginId, false)];
          }
        }
        return ids;
      };

      const downlineIds = Array.from(new Set(getDownlineIds(uId, lId, true)));
      return mockCases.filter(c => downlineIds.includes(c.id));
    }

    // 全案件と全ユーザーのID情報を取得してメモリ上でツリーを辿る
    const { data: allCasesData, error: cError } = await supabase.from('cases').select('id, referrer_id');
    const { data: allUsersData, error: uError } = await supabase.from('users').select('id, login_id');
    
    if (cError || !allCasesData) return [];
    const users = allUsersData || [];

    const getDownlineIds = (parentUserId: string, parentLoginId: string, isRoot: boolean = true): string[] => {
      if (!parentUserId && !parentLoginId) return [];
      
      const children = allCasesData.filter((c: any) => {
        if (!c.referrer_id) return false;
        const refId = (c.referrer_id || '').toLowerCase();
        return (parentUserId && refId === (parentUserId || '').toLowerCase()) || 
               (parentLoginId && refId === (parentLoginId || '').toLowerCase());
      });
      
      let ids: string[] = [];
      if (!isRoot) ids = children.map((c: any) => c.id);
      
      for (const child of children as any[]) {
        const linkedUser = users.find((u: any) => u.login_id && (u.login_id || '').toLowerCase() === (child.id || '').toLowerCase());
        if (linkedUser) {
          ids = [...ids, ...getDownlineIds(linkedUser.id, linkedUser.login_id, false)];
        }
      }
      return ids;
    };

    const downlineIds = Array.from(new Set(getDownlineIds(user.id, user.loginId, true)));
    if (downlineIds.length === 0) return [];

    const { data, error } = await supabase.from('cases').select('*').in('id', downlineIds).order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((c: any) => this.mapCase(c));
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    if (this.isDemoMode) return mockUsers.find(u => (u.email || '').toLowerCase() === email.trim().toLowerCase()) || null;
    const { data, error } = await supabase.from('users').select('*').eq('email', email.trim().toLowerCase()).maybeSingle();
    if (error) return null;
    return data ? this.mapUser(data) : null;
  }

  async getUserByLoginId(loginId: string): Promise<User | null> {
    if (!loginId) return null;
    if (this.isDemoMode) return mockUsers.find(u => (u.loginId || '').toLowerCase() === (loginId || '').trim().toLowerCase()) || null;
    const { data, error } = await supabase.from('users').select('*').ilike('login_id', loginId.trim()).maybeSingle();
    if (error) return null;
    return data ? this.mapUser(data) : null;
  }

  async checkRegistrationEligibility(loginId: string, registrationCode: string): Promise<{ ok: boolean, reason?: string, email?: string }> {
    if (this.isDemoMode) {
      const user = mockUsers.find(u => (u.loginId || '').toLowerCase() === loginId.trim().toLowerCase());
      if (!user) return { ok: false, reason: 'not_found' };
      return { ok: true, email: user.email };
    }
    const { data: user } = await supabase.from('users').select('*').ilike('login_id', loginId.trim()).maybeSingle();
    if (!user) return { ok: false, reason: 'not_found' };
    if (user.status === UserStatus.AGENCY) return { ok: false, reason: 'already_registered' };
    if (user.agency_application_status !== AgencyApplicationStatus.APPROVED) return { ok: false, reason: 'not_approved' };
    if (user.registration_code !== registrationCode) return { ok: false, reason: 'invalid_code' };
    if (user.registration_code_used_at) return { ok: false, reason: 'code_used' };
    
    return { ok: true, email: user.email };
  }

  async completeRegistration(
    loginId: string,
    registrationCode: string,
    password: string
  ): Promise<{ ok: boolean }> {
    const normalizedId = loginId.trim().toLowerCase();
    
    if (this.isDemoMode) {
      const user = mockUsers.find(u => (u.loginId || '').toLowerCase() === normalizedId);
      if (user) {
        user.status = UserStatus.AGENCY;
        (user as any).password = password;
      }
      return { ok: true };
    }
    
    // Edge Function の URL を構築
    const { data: { publicUrl } } = supabase.storage.from('dummy').getPublicUrl('');
    const projectUrl = publicUrl.split('/storage/v1')[0];
    const functionUrl = `${projectUrl}/functions/v1/agency-complete-registration`;

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(supabase as any).supabaseKey}` // 匿名キーまたはサービスロールキー
      },
      body: JSON.stringify({
        login_id: normalizedId,
        registration_code: registrationCode,
        password
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Registration function error:", result);
      const errorMsg = result.detail || result.error || 'registration_failed';
      throw new Error(`登録に失敗しました: ${errorMsg}`);
    }
    
    if (!result.ok) {
      throw new Error(result.error || 'registration_failed');
    }

    const email = `${normalizedId}@net-shop.com`;
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      console.warn("Auto-login after registration failed, but registration was successful:", loginError);
      // 登録自体は成功しているので、ここではエラーを投げず、ユーザーに手動ログインを促すか、
      // あるいは login メソッドを再利用して試行する
      await this.login(normalizedId, password);
    }
    return { ok: true };
  }

  async updateUserRewardConfig(userId: string, config: any, actor: User): Promise<{ ok: boolean }> {
    if (this.isDemoMode) {
      const user = mockUsers.find(u => u.id === userId);
      if (user) {
        user.manualBaseAmountOverride = config.manualBaseAmountOverride;
        user.manualRateOverride = config.manualRateOverride;
      }
      return { ok: true };
    }
    const { error } = await supabase.from('users').update({ 
      manual_base_amount_override: config.manualBaseAmountOverride, 
      manual_rate_override: config.manualRateOverride 
    }).eq('id', userId);
    return { ok: !error };
  }

  async logout(): Promise<void> {
    if (this.isDemoMode) {
      localStorage.removeItem('netshop_demo_user');
      return;
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    }
  }

  private mapUser(u: any): User {
    if (!u) return {} as User;
    return {
      id: u.id || '', auth_uid: u.auth_uid || '', loginId: u.login_id || '', email: u.email || '', name: u.name || '', role: (u.role as UserRole) || UserRole.AGENCY,
      status: (u.status as UserStatus) || UserStatus.CUSTOMER, referrerId: u.referrer_id || '',
      agencyApplicationStatus: (u.agency_application_status as AgencyApplicationStatus) || AgencyApplicationStatus.NONE,
      manualRateOverride: u.manual_rate_override, manualBaseAmountOverride: u.manual_base_amount_override,
      registrationCode: u.registration_code,
      registrationCodeUsedAt: u.registration_code_used_at,
      createdAt: u.created_at || new Date().toISOString()
    };
  }

  private mapCase(c: any): Case {
    if (!c) return {} as Case;
    return {
      id: c.id || '', agencyId: c.agency_id || '', agencyName: c.agency_name || '', referrerId: c.referrer_id || '',
      status: (c.status as CaseStatus) || CaseStatus.DRAFT, platform: (c.platform as PlatformType) || PlatformType.RAKUTEN, customerType: c.customer_type || 'corporation',
      companyName: c.company_name || '', companyNameKana: c.company_name_kana || '', representativeName: c.representative_name || '',
      representativeNameKana: c.representative_name_kana || '', corporateNumber: c.corporate_number, establishedDate: c.established_date,
      zipCode: c.zip_code, address: c.address, repName: c.rep_name || '', repNameKana: c.rep_name_kana || '',
      repBirthDate: c.rep_birth_date, repZipCode: c.rep_zip_code, repAddress: c.rep_address, phone: c.phone || '', email: c.email || '',
      customerName: c.rep_name || c.company_name || '不明', baseAmount: Number(c.base_amount || 0), appliedRate: Number(c.applied_rate || 0),
      isManualAdjustment: !!c.is_manual_adjustment, manualAgencyAmount: Number(c.manual_agency_amount || 0), tasks: c.tasks || [],
      mallProgress: c.mall_progress || { rakuten: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
      subline: c.subline || { status: 'none' }, emailJp: c.email_jp || { status: 'none' }, rakutenInfo: c.rakuten_info || {},
      createdAt: c.created_at || new Date().toISOString(), updatedAt: c.updated_at || new Date().toISOString(), documents: [], reviews: []
    };
  }
}
export const db = new DBService();
