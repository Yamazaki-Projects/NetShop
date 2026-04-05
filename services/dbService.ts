import {
  User,
  Case,
  CaseStatus,
  UserRole,
  UserStatus,
  AgencyApplicationStatus,
  PlatformType,
  MallOpeningStatus
} from '../types';
import { supabase } from './supabaseClient.browser';
import { mockUsers, mockCases } from './mockData';

class DBService {
  private isDemoMode: boolean = !supabase;

  private handleNetworkError(e: any): never {
    if (e?.message?.includes('fetch') || e?.message?.includes('NetworkError')) {
      throw new Error('ネットワークエラーが発生しました。インターネット接続を確認するか、しばらく時間をおいてから再試行してください。');
    }
    throw e;
  }

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
    if (Array.isArray(data)) return data.map((item) => this.normalizePayload(item));
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
        } catch {
          return null;
        }
      }
      return null;
    }

    try {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session || !session.user) return null;

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_uid', session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      return profile ? this.mapUser(profile) : null;
    } catch (e: any) {
      this.handleNetworkError(e);
    }
  }

  async login(loginId: string, pass: string): Promise<User | null> {
    const normalizedLoginId = loginId.trim().toLowerCase();

    if (this.isDemoMode) {
      const user = mockUsers.find(
        (u) =>
          (u.loginId || '').toLowerCase() === normalizedLoginId ||
          (u.email || '').toLowerCase() === normalizedLoginId
      );

      const isPassOk = user && (((user as any).password === pass) || pass === 'demo');

      if (user && isPassOk) {
        localStorage.setItem('netshop_demo_user', JSON.stringify(user));
        return user;
      }
      return null;
    }

    try {
      // usersテーブルからloginIdに対応するメールアドレスを取得（EC0001などの新ID対応）
      let email = this.toInternalEmail(normalizedLoginId);
      const { data: userRecord } = await supabase
        .from('users')
        .select('email')
        .ilike('login_id', normalizedLoginId)
        .maybeSingle();
      if (userRecord?.email) email = userRecord.email;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });

      if (authError || !authData.user) {
        if (authError?.message?.includes('fetch') || authError?.name === 'TypeError') {
          this.handleNetworkError(authError);
        }
        console.error('Login failed:', authError);
        return null;
      }

      const authUid = authData.user.id;

      const { data: profile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_uid', authUid)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // 初回ログイン救済：auth_uid がまだ紐づいていない場合
      if (!profile) {
        const { data: linkedProfile, error: updateError } = await supabase
          .from('users')
          .update({ auth_uid: authUid })
          .ilike('login_id', normalizedLoginId)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        return linkedProfile ? this.mapUser(linkedProfile) : null;
      }

      return this.mapUser(profile);
    } catch (e: any) {
      this.handleNetworkError(e);
      return null;
    }
  }

  async logout(): Promise<void> {
    if (this.isDemoMode) {
      localStorage.removeItem('netshop_demo_user');
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (e: any) {
      console.error('Logout error:', e);
      if (e?.message?.includes('fetch') || e?.name === 'TypeError') {
        this.handleNetworkError(e);
      }
    }
  }

  async getUsers(): Promise<User[]> {
    if (this.isDemoMode) return mockUsers;

    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) {
        console.warn('Error fetching users:', error.message);
        return [];
      }
      return (data || []).map((u: any) => this.mapUser(u));
    } catch (e: any) {
      this.handleNetworkError(e);
    }
  }

  async getCases(user: User): Promise<Case[]> {
    if (!user) return [];

    if (this.isDemoMode) {
      const uId = (user.id || '').toLowerCase();
      const lId = (user.loginId || '').toLowerCase();
      return mockCases.filter((c) => {
        const rId = (c.referrerId || '').toLowerCase();
        return rId === uId || (lId && rId === lId);
      });
    }

    try {
      const { data: allData, error } = await supabase.from('cases').select('*');
      if (error) throw error;
      if (!allData) return [];

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
    } catch (e: any) {
      this.handleNetworkError(e);
    }
  }

  async getAllCases(): Promise<Case[]> {
    if (this.isDemoMode) return mockCases;

    try {
      const { data, error } = await supabase.from('cases').select('*').order('updated_at', { ascending: false });
      if (error) {
        console.warn('Error fetching all cases:', error.message);
        return [];
      }
      return (data || []).map((c: any) => this.mapCase(c));
    } catch (e: any) {
      this.handleNetworkError(e);
    }
  }

  async getCaseById(id: string): Promise<Case | null> {
    if (this.isDemoMode) {
      return mockCases.find((c) => (c.id || '').toLowerCase() === (id || '').toLowerCase()) || null;
    }

    try {
      const { data, error } = await supabase.from('cases').select('*').ilike('id', id).maybeSingle();
      if (error) throw error;
      return data ? this.mapCase(data) : null;
    } catch (e: any) {
      this.handleNetworkError(e);
    }
  }

  async createCase(newCaseData: any, actor: User, customReferrerId?: string): Promise<Case | null> {
    if (this.isDemoMode) {
      const newCase: Case = {
        ...newCaseData,
        id: `pa${String(mockCases.length + 1).padStart(4, '0')}`,
        referrerId: customReferrerId || actor.id,
        status: CaseStatus.SUBMITTED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tasks: [],
        documents: [],
        reviews: [],
        mallProgress: {
          rakuten: MallOpeningStatus.NOT_STARTED,
          yahoo: MallOpeningStatus.NOT_STARTED,
          aupay: MallOpeningStatus.NOT_STARTED
        },
        subline: { status: 'none', siteType: 'subline' },
        emailJp: { status: 'none', domainType: 'email_jp' },
        rakutenInfo: { needsShipping: 'unnecessary' },
        progressComments: [],
        baseAmount: 198000,
        deposit: false,
        depositAmount: 30000
      };
      mockCases.unshift(newCase);
      return newCase;
    }

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.user) throw new Error('セッションが見つかりません。');

      const { data: me } = await supabase
        .from('users')
        .select('id')
        .eq('auth_uid', session.user.id)
        .maybeSingle();

      if (!me) throw new Error('プロフィールが見つかりません。');

      const referrerIdForCase = customReferrerId || me.id;

      let referrerUuidForUser: string | null = null;
      if (customReferrerId) {
        if ((customReferrerId || '').toLowerCase().startsWith('pa')) {
          const { data: refUser } = await supabase
            .from('users')
            .select('id')
            .ilike('login_id', customReferrerId)
            .maybeSingle();
          referrerUuidForUser = refUser ? refUser.id : null;
        } else {
          referrerUuidForUser = customReferrerId;
        }
      } else {
        referrerUuidForUser = me.id;
      }

      let referrerName = actor.name;
      if (customReferrerId && customReferrerId !== me.id) {
        const { data: refUser } = await supabase
          .from('users')
          .select('name')
          .or(`id.eq.${customReferrerId},login_id.eq.${customReferrerId}`)
          .maybeSingle();
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

      let maxCaseNum = 0;
      let maxUserNum = 0;

      if (lastCases && lastCases.length > 0) {
        maxCaseNum = parseInt(lastCases[0].id.replace(/pa/i, ''), 10);
      }
      if (lastUsers && lastUsers.length > 0) {
        maxUserNum = parseInt(lastUsers[0].login_id.replace(/pa/i, ''), 10);
      }

      const nextIdNum = Math.max(maxCaseNum, maxUserNum) + 1;
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

      const { data: caseResult, error: caseError } = await supabase
        .from('cases')
        .insert([this.normalizePayload(dbPayload)])
        .select()
        .single();

      if (caseError) {
        console.error('Case insertion failed:', caseError);
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
        console.error('User profile insertion failed:', userError);
        throw new Error(`案件は作成されましたが、ユーザープロファイルの作成に失敗しました: ${userError.message}`);
      }

      return caseResult ? this.mapCase(caseResult) : null;
    } catch (e: any) {
      this.handleNetworkError(e);
    }
  }

  async updateCase(id: string, updates: any, actor: User): Promise<Case | null> {
    if (this.isDemoMode) {
      const idx = mockCases.findIndex((c) => (c.id || '').toLowerCase() === (id || '').toLowerCase());
      if (idx !== -1) {
        mockCases[idx] = { ...mockCases[idx], ...updates, updatedAt: new Date().toISOString() };
        return mockCases[idx];
      }
      return null;
    }

    try {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      const mappings: Record<string, string> = {
        status: 'status',
        platform: 'platform',
        customerType: 'customer_type',
        companyName: 'company_name',
        companyNameKana: 'company_name_kana',
        representativeName: 'representative_name',
        representativeNameKana: 'representative_name_kana',
        repName: 'rep_name',
        repNameKana: 'rep_name_kana',
        repBirthDate: 'rep_birth_date',
        repZipCode: 'rep_zip_code',
        repAddress: 'rep_address',
        phone: 'phone',
        email: 'email',
        mallProgress: 'mall_progress',
        rakutenInfo: 'rakuten_info',
        subline: 'subline',
        emailJp: 'email_jp',
        tasks: 'tasks',
        isManualAdjustment: 'is_manual_adjustment',
        manualAgencyAmount: 'manual_agency_amount',
        baseAmount: 'base_amount',
        progressComments: 'progress_comments',
        yahooFreeInput: 'yahoo_free_input',
        aupayFreeInput: 'aupay_free_input',
        companyZipCode: 'company_zip_code',
        companyAddress: 'company_address',
        companyAddressKana: 'company_address_kana',
        corporateNumber: 'corporate_number',
        establishedDate: 'established_date',
        repLastName: 'rep_last_name',
        repFirstName: 'rep_first_name',
        repLastNameKana: 'rep_last_name_kana',
        repFirstNameKana: 'rep_first_name_kana',
        repAddressKana: 'rep_address_kana',
        staffLastName: 'staff_last_name',
        staffFirstName: 'staff_first_name',
        staffLastNameKana: 'staff_last_name_kana',
        staffFirstNameKana: 'staff_first_name_kana',
        staffBirthDate: 'staff_birth_date',
        staffZipCode: 'staff_zip_code',
        staffAddress: 'staff_address',
        staffAddressKana: 'staff_address_kana',
        deposit: 'deposit',
        depositAmount: 'deposit_amount'
      };

      Object.keys(updates).forEach((k) => {
        if (mappings[k]) dbUpdates[mappings[k]] = updates[k];
      });

      const { data, error } = await supabase
        .from('cases')
        .update(this.normalizePayload(dbUpdates))
        .ilike('id', id)
        .select()
        .single();

      if (error) throw error;
      return data ? this.mapCase(data) : null;
    } catch (e: any) {
      this.handleNetworkError(e);
    }
  }

  async applyForAgency(caseData: Case, actor: User): Promise<{ ok: boolean; error?: any }> {
    if (this.isDemoMode) {
      const user = mockUsers.find((u) => (u.loginId || '').toLowerCase() === (caseData.id || '').toLowerCase());
      if (user) {
        user.agencyApplicationStatus = AgencyApplicationStatus.PENDING;
      }
      return { ok: true };
    }

    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.user) return { ok: false, error: { message: 'セッションが見つかりません。' } };

      const { data: me } = await supabase
        .from('users')
        .select('id')
        .eq('auth_uid', session.user.id)
        .maybeSingle();

      if (!me) return { ok: false, error: { message: '現在のユーザープロフィールが見つかりません。' } };

      const referrerUuid = me.id;
      const normalizedLoginId = (caseData.id || '').toLowerCase();

      const { data, error } = await supabase
        .from('users')
        .update({
          agency_application_status: AgencyApplicationStatus.PENDING,
          referrer_id: referrerUuid,
          email: this.toInternalEmail(caseData.id),
          name: caseData.companyName || `${caseData.repLastName || ''} ${caseData.repFirstName || ''}`.trim() || '新規顧客'
        })
        .ilike('login_id', normalizedLoginId)
        .select();

      await supabase
        .from('cases')
        .update({ referrer_id: referrerUuid })
        .ilike('id', normalizedLoginId);

      return { ok: !error && !!data && data.length > 0, error };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false, error: e };
    }
  }

  async approveApplication(loginId: string): Promise<{ ok: boolean; message?: string }> {
    if (this.isDemoMode) {
      const user = mockUsers.find((u) => (u.loginId || '').toLowerCase() === loginId.trim().toLowerCase());
      if (user) {
        user.agencyApplicationStatus = AgencyApplicationStatus.APPROVED;
        user.registrationCode = this.generateRandomCode();
      }
      return { ok: true };
    }

    try {
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
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false, message: e.message };
    }
  }

  async reissueRegistrationCode(loginId: string): Promise<{ ok: boolean; code?: string }> {
    if (this.isDemoMode) {
      const user = mockUsers.find((u) => (u.loginId || '').toLowerCase() === loginId.trim().toLowerCase());
      const newCode = this.generateRandomCode();
      if (user) user.registrationCode = newCode;
      return { ok: true, code: newCode };
    }

    try {
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
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false };
    }
  }

  async calculateRate(userId: string): Promise<number> {
    if (this.isDemoMode) {
      const approvedCount = mockCases.filter(
        (c) => (c.referrerId || '').toLowerCase() === (userId || '').toLowerCase() && c.status === CaseStatus.APPROVED
      ).length;
      return approvedCount >= 11 ? 0.5 : approvedCount >= 2 ? 0.4 : 0.3;
    }

    try {
      const { count } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', userId)
        .eq('status', CaseStatus.APPROVED);

      const approvedCount = count || 0;
      return approvedCount >= 11 ? 0.5 : approvedCount >= 2 ? 0.4 : 0.3;
    } catch (e: any) {
      this.handleNetworkError(e);
      return 0.3;
    }
  }

  async getApprovedCount(userId: string): Promise<number> {
    if (this.isDemoMode) {
      return mockCases.filter(
        (c) => (c.referrerId || '').toLowerCase() === (userId || '').toLowerCase() && c.status === CaseStatus.APPROVED
      ).length;
    }

    try {
      const { count } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', userId)
        .eq('status', CaseStatus.APPROVED);
      return count || 0;
    } catch (e: any) {
      this.handleNetworkError(e);
      return 0;
    }
  }

  async getTeamCases(user: User): Promise<Case[]> {
    if (!user) return [];

    if (this.isDemoMode) {
      const uId = (user.id || '').toLowerCase();
      const lId = (user.loginId || '').toLowerCase();

      const getDownlineIds = (parentUserId: string, parentLoginId: string, isRoot: boolean = true): string[] => {
        const children = mockCases.filter((c) => {
          const rId = (c.referrerId || '').toLowerCase();
          return rId === (parentUserId || '').toLowerCase() || rId === (parentLoginId || '').toLowerCase();
        });

        let ids: string[] = isRoot ? [] : children.map((c) => c.id);
        for (const child of children) {
          const linkedUser = mockUsers.find((u) => (u.loginId || '').toLowerCase() === (child.id || '').toLowerCase());
          if (linkedUser) {
            ids = [...ids, ...getDownlineIds(linkedUser.id, linkedUser.loginId, false)];
          }
        }
        return ids;
      };

      const downlineIds = Array.from(new Set(getDownlineIds(uId, lId, true)));
      return mockCases.filter((c) => downlineIds.includes(c.id));
    }

    try {
      const { data: allCasesData, error: cError } = await supabase.from('cases').select('id, referrer_id');
      const { data: allUsersData, error: uError } = await supabase.from('users').select('id, login_id');

      if (cError) throw cError;
      if (uError) throw uError;
      if (!allCasesData) return [];
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

      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .in('id', downlineIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((c: any) => this.mapCase(c));
    } catch (e: any) {
      this.handleNetworkError(e);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;

    if (this.isDemoMode) {
      return mockUsers.find((u) => (u.email || '').toLowerCase() === email.trim().toLowerCase()) || null;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (error) return null;
      return data ? this.mapUser(data) : null;
    } catch (e: any) {
      this.handleNetworkError(e);
      return null;
    }
  }

  async getUserByLoginId(loginId: string): Promise<User | null> {
    if (!loginId) return null;

    if (this.isDemoMode) {
      return mockUsers.find((u) => (u.loginId || '').toLowerCase() === loginId.trim().toLowerCase()) || null;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('login_id', loginId.trim())
        .maybeSingle();

      if (error) return null;
      return data ? this.mapUser(data) : null;
    } catch (e: any) {
      this.handleNetworkError(e);
      return null;
    }
  }

  async checkRegistrationEligibility(
    loginId: string,
    registrationCode: string
  ): Promise<{ ok: boolean; reason?: string; email?: string }> {
    if (this.isDemoMode) {
      const user = mockUsers.find((u) => (u.loginId || '').toLowerCase() === loginId.trim().toLowerCase());
      if (!user) return { ok: false, reason: 'not_found' };
      return { ok: true, email: user.email };
    }

    try {
      const { data: user } = await supabase
        .from('users')
        .select('*')
        .ilike('login_id', loginId.trim())
        .maybeSingle();

      if (!user) return { ok: false, reason: 'not_found' };
      if (user.status === UserStatus.AGENCY) return { ok: false, reason: 'already_registered' };
      if (user.agency_application_status !== AgencyApplicationStatus.APPROVED) return { ok: false, reason: 'not_approved' };
      if (user.registration_code !== registrationCode) return { ok: false, reason: 'invalid_code' };
      if (user.registration_code_used_at) return { ok: false, reason: 'code_used' };

      return { ok: true, email: user.email };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false, reason: 'network_error' };
    }
  }

  async completeRegistration(
    loginId: string,
    registrationCode: string,
    password: string
  ): Promise<{ ok: boolean }> {
    const normalizedId = loginId.trim().toLowerCase();

    if (this.isDemoMode) {
      const user = mockUsers.find((u) => (u.loginId || '').toLowerCase() === normalizedId);
      if (user) {
        user.status = UserStatus.AGENCY;
        (user as any).password = password;
      }
      return { ok: true };
    }

    try {
      const { data: result, error: funcError } = await supabase.functions.invoke(
        'agency-complete-registration',
        {
          body: {
            login_id: normalizedId,
            registration_code: registrationCode,
            password
          }
        }
      );

      if (funcError) {
        console.error('Registration function error:', funcError);
        throw new Error(`登録に失敗しました: ${funcError.message || 'Unknown error'}`);
      }

      if (!result || !result.ok) {
        throw new Error(result?.error || 'registration_failed');
      }

      const email = `${normalizedId}@net-shop.com`;
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

      if (loginError) {
        console.warn('Auto-login after registration failed, but registration was successful:', loginError);
        await this.login(normalizedId, password);
      }

      return { ok: true };
    } catch (e: any) {
      this.handleNetworkError(e);
    }
  }

  async updateUserRewardConfig(userId: string, config: any, actor: User): Promise<{ ok: boolean }> {
    if (this.isDemoMode) {
      const user = mockUsers.find((u) => u.id === userId);
      if (user) {
        user.manualBaseAmountOverride = config.manualBaseAmountOverride;
        user.manualRateOverride = config.manualRateOverride;
      }
      return { ok: true };
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          manual_base_amount_override: config.manualBaseAmountOverride,
          manual_rate_override: config.manualRateOverride
        })
        .eq('id', userId);

      return { ok: !error };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false };
    }
  }

  private mapUser(u: any): User {
    if (!u) return {} as User;
    return {
      id: u.id || '',
      auth_uid: u.auth_uid || '',
      loginId: u.login_id || '',
      email: u.email || '',
      name: u.name || '',
      role: (u.role as UserRole) || UserRole.AGENCY,
      status: (u.status as UserStatus) || UserStatus.CUSTOMER,
      referrerId: u.referrer_id || '',
      agencyApplicationStatus: (u.agency_application_status as AgencyApplicationStatus) || AgencyApplicationStatus.NONE,
      manualRateOverride: u.manual_rate_override,
      manualBaseAmountOverride: u.manual_base_amount_override,
      registrationCode: u.registration_code,
      registrationCodeUsedAt: u.registration_code_used_at,
      createdAt: u.created_at || new Date().toISOString()
    };
  }

  private mapCase(c: any): Case {
    if (!c) return {} as Case;
    return {
      id: c.id || '',
      agencyId: c.agency_id || '',
      agencyName: c.agency_name || '',
      referrerId: c.referrer_id || '',
      status: (c.status as CaseStatus) || CaseStatus.DRAFT,
      platform: (c.platform as PlatformType) || PlatformType.RAKUTEN,
      customerType: c.customer_type || 'corporation',
      companyName: c.company_name || '',
      companyNameKana: c.company_name_kana || '',
      companyZipCode: c.company_zip_code,
      companyAddress: c.company_address,
      companyAddressKana: c.company_address_kana,
      corporateNumber: c.corporate_number,
      establishedDate: c.established_date,
      repLastName: c.rep_last_name,
      repFirstName: c.rep_first_name,
      repLastNameKana: c.rep_last_name_kana,
      repFirstNameKana: c.rep_first_name_kana,
      repBirthDate: c.rep_birth_date,
      repZipCode: c.rep_zip_code,
      repAddress: c.rep_address,
      repAddressKana: c.rep_address_kana,
      staffLastName: c.staff_last_name,
      staffFirstName: c.staff_first_name,
      staffLastNameKana: c.staff_last_name_kana,
      staffFirstNameKana: c.staff_first_name_kana,
      staffBirthDate: c.staff_birth_date,
      staffZipCode: c.staff_zip_code,
      staffAddress: c.staff_address,
      staffAddressKana: c.staff_address_kana,
      phone: c.phone || '',
      email: c.email || '',
      customerName: c.company_name || c.rep_last_name || '不明',
      baseAmount: Number(c.base_amount || 198000),
      deposit: !!c.deposit,
      depositAmount: Number(c.deposit_amount || 30000),
      appliedRate: Number(c.applied_rate || 0),
      isManualAdjustment: !!c.is_manual_adjustment,
      manualAgencyAmount: Number(c.manual_agency_amount || 0),
      tasks: c.tasks || [],
      mallProgress: c.mall_progress || {
        rakuten: MallOpeningStatus.NOT_STARTED,
        yahoo: MallOpeningStatus.NOT_STARTED,
        aupay: MallOpeningStatus.NOT_STARTED
      },
      subline: c.subline || { status: 'none', siteType: 'subline' },
      emailJp: c.email_jp || { status: 'none', domainType: 'email_jp' },
      rakutenInfo: c.rakuten_info || { needsShipping: 'unnecessary' },
      progressComments: c.progress_comments || [],
      yahooFreeInput: c.yahoo_free_input,
      aupayFreeInput: c.aupay_free_input,
      createdAt: c.created_at || new Date().toISOString(),
      updatedAt: c.updated_at || new Date().toISOString(),
      documents: [],
      reviews: []
    };
  }
}

export const db = new DBService();