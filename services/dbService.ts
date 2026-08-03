import {
  User,
  Case,
  CaseStatus,
  UserRole,
  UserStatus,
  AgencyApplicationStatus,
  PlatformType,
  MallOpeningStatus,
  InitialCommission,
  MembershipPlan,
  isAdminRole,
  RewardBatch,
  RewardRow,
  RewardPayout
} from '../types';
import { supabase } from './supabaseClient.browser';

class DBService {
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

    try {
      console.log("[DBService] Login attempt for:", normalizedLoginId);

      const { data: profileByLoginId, error: profileError } = await supabase
        .from('users')
        .select('email, auth_uid')
        .ilike('login_id', normalizedLoginId)
        .maybeSingle();

      // 認証前は users テーブルを読めない（匿名読み取りをRLSで禁止しているため）。
      // ここは「login_id と異なるメールアドレスで登録されている場合」の救済用なので、
      // 引けなくてもログイン自体は loginId@net-shop.com で継続できる。
      if (profileError) {
        console.warn("[DBService] Profile lookup skipped during login:", profileError.message);
      }

      const emailsToTry = new Set<string>();

      if (normalizedLoginId.includes('@')) {
        emailsToTry.add(normalizedLoginId);
      } else {
        emailsToTry.add(`${normalizedLoginId}@net-shop.com`);
      }

      if (profileByLoginId?.email) {
        emailsToTry.add((profileByLoginId.email || '').toLowerCase());
      }

      let lastAuthError: any = null;
      let authUser: any = null;

      console.log("[DBService] Trying emails:", Array.from(emailsToTry));

      for (const email of Array.from(emailsToTry)) {
        try {
          console.log("[DBService] Attempting auth with:", email);
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password: pass
          });

          if (!authError && authData.user) {
            console.log("[DBService] Auth success for:", email);
            authUser = authData.user;
            break;
          }

          console.warn("[DBService] Auth failed for:", email, authError?.message);
          lastAuthError = authError;
        } catch (e: any) {
          console.error("[DBService] Auth exception for:", email, e);
          lastAuthError = e;
          if (e.message?.includes('fetch') || e.name === 'TypeError') {
            this.handleNetworkError(e);
          }
        }
      }

      if (!authUser) {
        console.error("[DBService] Login failed for all email candidates. Last error:", lastAuthError);
        if (lastAuthError?.message?.includes('fetch') || lastAuthError?.name === 'TypeError') {
          this.handleNetworkError(lastAuthError);
        }
        return null;
      }

      const authUid = authUser.id;

      const { data: profile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_uid', authUid)
        .maybeSingle();

      if (fetchError) {
        console.error("[DBService] Profile fetch error after login:", fetchError);
        throw fetchError;
      }

      if (!profile && !normalizedLoginId.includes('@')) {
        console.log("[DBService] Profile not found by auth_uid, attempting link with login_id:", normalizedLoginId);
        const { data: linkedProfile, error: updateError } = await supabase
          .from('users')
          .update({ auth_uid: authUid })
          .ilike('login_id', normalizedLoginId)
          .select()
          .maybeSingle();

        if (updateError) {
          console.error("[DBService] Profile link error:", updateError);
          throw updateError;
        }
        return linkedProfile ? this.mapUser(linkedProfile) : null;
      }

      return profile ? this.mapUser(profile) : null;
    } catch (e: any) {
      this.handleNetworkError(e);
      return null;
    }
  }

  async logout(): Promise<void> {
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

    try {
      const { data: allData, error } = await supabase.from('cases').select('*');
      if (error) throw error;
      if (!allData) return [];

      // admin/co_owner/executive は全案件を表示
      if (isAdminRole(user.role)) {
        return allData
          .map((c: any) => this.mapCase(c))
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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
    } catch (e: any) {
      this.handleNetworkError(e);
    }
  }

  async getAllCases(): Promise<Case[]> {
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
    try {
      const { data, error } = await supabase.from('cases').select('*').ilike('id', id).maybeSingle();
      if (error) throw error;
      return data ? this.mapCase(data) : null;
    } catch (e: any) {
      this.handleNetworkError(e);
    }
  }

  async createCase(newCaseData: any, actor: User, customReferrerId?: string): Promise<Case | null> {
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
        sort_order: Date.now(),
        status: CaseStatus.DRAFT,
        platform: PlatformType.RAKUTEN,
        base_amount: 198000,
        customer_type: newCaseData.customerType,
        company_name: newCaseData.companyName,
        company_name_kana: newCaseData.companyNameKana || '',
        representative_name: [newCaseData.repLastName, newCaseData.repFirstName].filter(Boolean).join(' ') || newCaseData.repName || '',
        rep_last_name: newCaseData.repLastName || '',
        rep_first_name: newCaseData.repFirstName || '',
        // 個人事業主は「代表取締役情報」カード自体が表示されないため、案件詳細で
        // 常に表示される「担当者情報」側にも同じ名前を入れておく（法人はここを
        // 別の担当者用に空けておきたいので対象外）。
        ...(newCaseData.customerType === 'sole_proprietor' ? {
          staff_last_name: newCaseData.repLastName || '',
          staff_first_name: newCaseData.repFirstName || ''
        } : {}),
        phone: newCaseData.phone || '',
        email: newCaseData.email || '',
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
        name: [newCaseData.repLastName, newCaseData.repFirstName].filter(Boolean).join(' ') || newCaseData.companyName || newCaseData.repName,
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

      // 案件登録時に初期報酬レコードを自動生成
      if (referrerUuidForUser) {
        await supabase.from('initial_commissions').insert([{
          case_id: nextId,
          case_company_name: newCaseData.companyName || newCaseData.repName,
          recipient_user_id: referrerUuidForUser,
          recipient_name: referrerName,
          amount: Math.floor(198000 * 0.2),
          status: 'pending',
          created_at: new Date().toISOString()
        }]);
      }

      return caseResult ? this.mapCase(caseResult) : null;
    } catch (e: any) {
      this.handleNetworkError(e);
    }
  }

  async updateCase(id: string, updates: any, actor: User): Promise<Case | null> {
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
        mercariInfo: 'mercari_info',
        aupayInfo: 'aupay_info',
        subline: 'subline',
        emailJp: 'email_jp',
        tasks: 'tasks',
        baseAmount: 'base_amount',
        progressComments: 'progress_comments',
        mercariFreeInput: 'mercari_free_input',
        yahooFreeInput: 'yahoo_free_input',
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

  // 顧客(案件)を削除する。管理者は誰でも、一般代理店は自分が直接紹介した顧客のみ削除できる。
  // 削除する顧客がさらに他の顧客を紹介している場合は、その紹介先を削除する顧客自身の
  // 紹介者（祖父母）に繰り上げてから削除し、紹介チェーンが途切れないようにする。
  async deleteCase(caseId: string, actor: User): Promise<{ ok: boolean; error?: string }> {
    try {
      const { data: targetCase, error: fetchError } = await supabase
        .from('cases')
        .select('*')
        .ilike('id', caseId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (!targetCase) return { ok: false, error: '案件が見つかりません。' };

      if (!isAdminRole(actor.role)) {
        const refId = (targetCase.referrer_id || '').toLowerCase();
        const actorId = (actor.id || '').toLowerCase();
        const actorLoginId = (actor.loginId || '').toLowerCase();
        if (refId !== actorId && refId !== actorLoginId) {
          return { ok: false, error: '自分が直接紹介した顧客のみ削除できます。' };
        }
      }

      const { data: targetUser } = await supabase
        .from('users')
        .select('id, login_id')
        .ilike('login_id', targetCase.id)
        .maybeSingle();

      const targetIdentifiers = [targetCase.id, targetUser?.id, targetUser?.login_id]
        .filter(Boolean)
        .map((v: string) => v.toLowerCase());
      const newReferrerId = targetCase.referrer_id || null;

      const { data: allCasesData } = await supabase.from('cases').select('id, referrer_id');
      const childCaseIds = (allCasesData || [])
        .filter((c: any) => targetIdentifiers.includes((c.referrer_id || '').toLowerCase()))
        .map((c: any) => c.id);
      if (childCaseIds.length > 0) {
        const { error: reparentCasesError } = await supabase
          .from('cases')
          .update({ referrer_id: newReferrerId })
          .in('id', childCaseIds);
        if (reparentCasesError) throw reparentCasesError;
      }

      const { data: allUsersData } = await supabase.from('users').select('id, referrer_id');
      const childUserIds = (allUsersData || [])
        .filter((u: any) => targetIdentifiers.includes((u.referrer_id || '').toLowerCase()))
        .map((u: any) => u.id);
      if (childUserIds.length > 0) {
        const { error: reparentUsersError } = await supabase
          .from('users')
          .update({ referrer_id: newReferrerId })
          .in('id', childUserIds);
        if (reparentUsersError) throw reparentUsersError;
      }

      await supabase.from('initial_commissions').delete().ilike('case_id', targetCase.id);

      if (targetUser?.id) {
        const { error: userDeleteError } = await supabase.from('users').delete().eq('id', targetUser.id);
        if (userDeleteError) throw userDeleteError;
      }

      const { error: caseDeleteError } = await supabase.from('cases').delete().ilike('id', targetCase.id);
      if (caseDeleteError) throw caseDeleteError;

      return { ok: true };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false, error: e?.message || '削除に失敗しました。' };
    }
  }

  // ティアツリー(リスト表示)での兄弟ノード間の並び替え。2件のsort_orderを入れ替える。
  async swapCaseSortOrder(caseIdA: string, sortOrderA: number, caseIdB: string, sortOrderB: number): Promise<{ ok: boolean }> {
    try {
      const { error: errorA } = await supabase.from('cases').update({ sort_order: sortOrderB }).ilike('id', caseIdA);
      if (errorA) throw errorA;
      const { error: errorB } = await supabase.from('cases').update({ sort_order: sortOrderA }).ilike('id', caseIdB);
      if (errorB) throw errorB;
      return { ok: true };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false };
    }
  }

  async applyForAgency(caseData: Case, actor: User): Promise<{ ok: boolean; error?: any }> {
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

      const normalizedLoginId = (caseData.id || '').toLowerCase();

      // 既存のreferrer_idを確認し、設定済みの場合は上書きしない
      const [{ data: targetUser }, { data: targetCase }] = await Promise.all([
        supabase.from('users').select('referrer_id').ilike('login_id', normalizedLoginId).maybeSingle(),
        supabase.from('cases').select('referrer_id').ilike('id', normalizedLoginId).maybeSingle(),
      ]);

      const userUpdatePayload: Record<string, any> = {
        agency_application_status: AgencyApplicationStatus.PENDING,
        email: this.toInternalEmail(caseData.id),
        name: caseData.companyName || `${caseData.repLastName || ''} ${caseData.repFirstName || ''}`.trim() || '新規顧客'
      };
      if (!targetUser?.referrer_id) {
        userUpdatePayload.referrer_id = me.id;
      }

      const { data, error } = await supabase
        .from('users')
        .update(userUpdatePayload)
        .ilike('login_id', normalizedLoginId)
        .select();

      if (!targetCase?.referrer_id) {
        await supabase
          .from('cases')
          .update({ referrer_id: me.id })
          .ilike('id', normalizedLoginId);
      }

      return { ok: !error && !!data && data.length > 0, error };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false, error: e };
    }
  }

  async approveApplication(loginId: string): Promise<{ ok: boolean; message?: string }> {
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

  async createAdminUser(name: string, loginId: string, role: UserRole): Promise<{ ok: boolean; code?: string; error?: string }> {
    try {
      const normalizedId = loginId.trim().toLowerCase();

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .ilike('login_id', normalizedId)
        .maybeSingle();

      if (existing) return { ok: false, error: 'このログインIDは既に使用されています。' };

      const code = this.generateRandomCode();
      const { error } = await supabase.from('users').insert([{
        login_id: normalizedId,
        email: `${normalizedId}@net-shop.com`,
        name,
        role,
        status: UserStatus.CUSTOMER,
        agency_application_status: AgencyApplicationStatus.APPROVED,
        registration_code: code,
        membership_plan: '198k',
        created_at: new Date().toISOString(),
      }]);

      if (error) return { ok: false, error: error.message };
      return { ok: true, code };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false, error: e.message };
    }
  }

  async cancelAgencyApplication(loginId: string): Promise<{ ok: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ agency_application_status: AgencyApplicationStatus.NONE })
        .ilike('login_id', loginId);
      return { ok: !error, error };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false, error: e };
    }
  }

  async reissueRegistrationCode(loginId: string): Promise<{ ok: boolean; code?: string }> {
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

  async getApprovedCount(userId: string): Promise<number> {
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

  async getInitialCommissions(recipientUserId?: string): Promise<InitialCommission[]> {
    try {
      let query = supabase.from('initial_commissions').select('*').order('created_at', { ascending: false });
      if (recipientUserId) query = query.eq('recipient_user_id', recipientUserId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        caseId: r.case_id,
        caseCompanyName: r.case_company_name,
        recipientUserId: r.recipient_user_id,
        recipientName: r.recipient_name,
        amount: Number(r.amount),
        status: r.status,
        paidAt: r.paid_at,
        createdAt: r.created_at
      }));
    } catch (e: any) {
      this.handleNetworkError(e);
      return [];
    }
  }

  async updateInitialCommissionAmount(id: string, amount: number): Promise<{ ok: boolean }> {
    try {
      const { error } = await supabase.from('initial_commissions').update({ amount }).eq('id', id);
      return { ok: !error };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false };
    }
  }

  async updateInitialCommissionStatus(id: string, status: 'pending' | 'paid'): Promise<{ ok: boolean }> {
    try {
      const updates: any = { status };
      if (status === 'paid') updates.paid_at = new Date().toISOString();
      const { error } = await supabase.from('initial_commissions').update(updates).eq('id', id);
      return { ok: !error };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false };
    }
  }

  async updateUserProfile(userId: string, updates: { name: string }): Promise<{ ok: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('users').update({ name: updates.name }).eq('id', userId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false, error: '更新に失敗しました' };
    }
  }

  async updatePassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false, error: 'パスワード更新に失敗しました' };
    }
  }

  async updateUserMembershipPlan(userId: string, plan: MembershipPlan): Promise<{ ok: boolean }> {
    try {
      const { error } = await supabase.from('users').update({ membership_plan: plan }).eq('id', userId);
      return { ok: !error };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false };
    }
  }

  async getTeamCases(user: User): Promise<Case[]> {
    if (!user) return [];

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

  // 登録前のチェックは未ログイン状態で行われる。以前は users テーブルを直接引いて
  // いたが、それを許すと登録コードを含む全ユーザー情報が匿名で読めてしまうため、
  // 判定結果(ok/reason)だけを返す SECURITY DEFINER 関数に問い合わせる。
  async checkRegistrationEligibility(
    loginId: string,
    registrationCode: string
  ): Promise<{ ok: boolean; reason?: string }> {
    try {
      const { data, error } = await supabase.rpc('check_registration_eligibility', {
        p_login_id: loginId.trim(),
        p_code: registrationCode.trim()
      });
      if (error) throw error;
      return (data as { ok: boolean; reason?: string }) || { ok: false, reason: 'network_error' };
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
      membershipPlan: (u.membership_plan as MembershipPlan) || '198k',
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
      sortOrder: c.sort_order != null ? Number(c.sort_order) : 0,
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
      customerName: [c.rep_last_name, c.rep_first_name].filter(Boolean).join(' ') || c.company_name || '不明',
      baseAmount: c.base_amount != null ? Number(c.base_amount) : 198000,
      deposit: !!c.deposit,
      depositAmount: Number(c.deposit_amount || 30000),
      tasks: c.tasks || [],
      mallProgress: c.mall_progress || {
        rakuten: MallOpeningStatus.NOT_STARTED,
        mercari: MallOpeningStatus.NOT_STARTED,
        aupay: MallOpeningStatus.NOT_STARTED,
        yahoo: MallOpeningStatus.NOT_STARTED
      },
      subline: c.subline || { status: 'none', siteType: 'subline' },
      emailJp: c.email_jp || { status: 'none', domainType: 'email_jp' },
      rakutenInfo: c.rakuten_info || { needsShipping: 'unnecessary' },
      mercariInfo: c.mercari_info || {},
      aupayInfo: c.aupay_info || {},
      progressComments: c.progress_comments || [],
      mercariFreeInput: c.mercari_free_input,
      yahooFreeInput: c.yahoo_free_input,
      aupayFreeInput: c.aupay_free_input,
      createdAt: c.created_at || new Date().toISOString(),
      updatedAt: c.updated_at || new Date().toISOString(),
      documents: [],
      reviews: []
    };
  }

  async createRewardBatch(month: string): Promise<RewardBatch | null> {
    try {
      const { data, error } = await supabase
        .from('reward_batches')
        .insert([{ month }])
        .select()
        .single();
      if (error) throw error;
      return { id: data.id, month: data.month, createdAt: data.created_at };
    } catch (e: any) {
      this.handleNetworkError(e);
      return null;
    }
  }

  async getRewardBatches(): Promise<RewardBatch[]> {
    try {
      const { data, error } = await supabase
        .from('reward_batches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((b: any) => ({ id: b.id, month: b.month, createdAt: b.created_at }));
    } catch (e: any) {
      this.handleNetworkError(e);
      return [];
    }
  }

  async saveRewardRowsAndPayouts(
    batchId: string,
    rows: Omit<RewardRow, 'id' | 'batchId' | 'createdAt'>[],
    payoutsByRowIndex: Omit<RewardPayout, 'id' | 'batchId' | 'rowId' | 'createdAt'>[][]
  ): Promise<{ ok: boolean }> {
    try {
      const { data: insertedRows, error: rowsError } = await supabase
        .from('reward_rows')
        .insert(
          rows.map(r => ({
            batch_id: batchId,
            owner_name: r.ownerName,
            mall_type: r.mallType,
            shop_url: r.shopUrl,
            sales_amount: r.salesAmount,
            reward_amount: r.rewardAmount,
            matched_case_id: r.matchedCaseId
          }))
        )
        .select();
      if (rowsError) throw rowsError;

      const payoutsToInsert = (insertedRows || []).flatMap((row: any, idx: number) =>
        (payoutsByRowIndex[idx] || []).map(p => ({
          batch_id: batchId,
          row_id: row.id,
          recipient_type: p.recipientType,
          recipient_user_id: p.recipientUserId,
          recipient_name: p.recipientName,
          amount: p.amount
        }))
      );

      if (payoutsToInsert.length > 0) {
        const { error: payoutsError } = await supabase.from('reward_payouts').insert(payoutsToInsert);
        if (payoutsError) throw payoutsError;
      }

      return { ok: true };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false };
    }
  }

  async getRewardRows(batchId: string): Promise<RewardRow[]> {
    try {
      const { data, error } = await supabase
        .from('reward_rows')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((r: any) => ({
        id: r.id,
        batchId: r.batch_id,
        ownerName: r.owner_name,
        mallType: r.mall_type,
        shopUrl: r.shop_url,
        salesAmount: r.sales_amount != null ? Number(r.sales_amount) : undefined,
        rewardAmount: Number(r.reward_amount),
        matchedCaseId: r.matched_case_id,
        createdAt: r.created_at
      }));
    } catch (e: any) {
      this.handleNetworkError(e);
      return [];
    }
  }

  async getRewardPayouts(batchId: string): Promise<RewardPayout[]> {
    try {
      const { data, error } = await supabase
        .from('reward_payouts')
        .select('*')
        .eq('batch_id', batchId);
      if (error) throw error;
      return (data || []).map((p: any) => ({
        id: p.id,
        batchId: p.batch_id,
        rowId: p.row_id,
        recipientType: p.recipient_type,
        recipientUserId: p.recipient_user_id,
        recipientName: p.recipient_name,
        amount: Number(p.amount),
        createdAt: p.created_at
      }));
    } catch (e: any) {
      this.handleNetworkError(e);
      return [];
    }
  }

  async deleteRewardBatch(batchId: string): Promise<{ ok: boolean }> {
    try {
      const { error } = await supabase.from('reward_batches').delete().eq('id', batchId);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false };
    }
  }

  async updateRewardBatchMonth(batchId: string, month: string): Promise<{ ok: boolean }> {
    try {
      const { error } = await supabase.from('reward_batches').update({ month }).eq('id', batchId);
      if (error) throw error;
      return { ok: true };
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false };
    }
  }

  // 既存バッチの行・分配額をまるごと置き換える（編集保存用）。
  // reward_rows を削除すると reward_payouts も ON DELETE CASCADE で一緒に消える。
  async replaceRewardRowsAndPayouts(
    batchId: string,
    rows: Omit<RewardRow, 'id' | 'batchId' | 'createdAt'>[],
    payoutsByRowIndex: Omit<RewardPayout, 'id' | 'batchId' | 'rowId' | 'createdAt'>[][]
  ): Promise<{ ok: boolean }> {
    try {
      const { error: delError } = await supabase.from('reward_rows').delete().eq('batch_id', batchId);
      if (delError) throw delError;
      return await this.saveRewardRowsAndPayouts(batchId, rows, payoutsByRowIndex);
    } catch (e: any) {
      this.handleNetworkError(e);
      return { ok: false };
    }
  }
}

export const db = new DBService();
