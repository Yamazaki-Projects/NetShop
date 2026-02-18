
import { 
  User, Case, CaseStatus, UserRole, UserStatus, AgencyApplicationStatus, PlatformType, MallOpeningStatus
} from '../types';
import { supabase } from './supabaseClient.browser';

class DBService {
  private toInternalEmail(loginId: string): string {
    const trimmedId = loginId.trim();
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
    const email = this.toInternalEmail(loginId);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (authError || !authData.user) {
        console.error("Auth error:", authError);
        return null;
      }
      
      const authUid = authData.user.id;

      let { data: profile } = await supabase.from('users')
        .select('*')
        .eq('auth_uid', authUid)
        .maybeSingle();

      if (!profile) {
        const { data: legacyProfile } = await supabase.from('users')
          .select('*')
          .eq('login_id', loginId)
          .maybeSingle();

        if (legacyProfile) {
          const { data: updatedProfile, error: updateError } = await supabase.from('users')
            .update({ auth_uid: authUid })
            .eq('id', legacyProfile.id)
            .select()
            .single();
          
          if (!updateError) {
            profile = updatedProfile;
          }
        }
      }
        
      return profile ? this.mapUser(profile) : null;
    } catch (e) {
      console.error("Login exception:", e);
      return null;
    }
  }

  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(u => this.mapUser(u));
  }

  async getCases(user: User): Promise<Case[]> {
    const { data, error } = await supabase.from('cases').select('*').eq('referrer_id', user.id).order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(c => this.mapCase(c));
  }

  async getAllCases(): Promise<Case[]> {
    const { data, error } = await supabase.from('cases').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(c => this.mapCase(c));
  }

  async getCaseById(id: string): Promise<Case | null> {
    const { data, error } = await supabase.from('cases').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? this.mapCase(data) : null;
  }

  async createCase(newCaseData: any, actor: User): Promise<Case | null> {
    // 【最重要】上位代理店の UUID を取得
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("セッションが見つかりません。");
    const { data: me } = await supabase.from('users').select('id').eq('auth_uid', session.user.id).maybeSingle();
    if (!me) throw new Error("プロフィールが見つかりません。");
    const referrerUuid = me.id;

    const rate = await this.calculateRate(referrerUuid);
    
    const { data: lastCases, error: fetchError } = await supabase
      .from('cases')
      .select('id')
      .like('id', 'PA%')
      .order('id', { ascending: false })
      .limit(1);

    let nextId = 'PA0001';
    if (!fetchError && lastCases && lastCases.length > 0) {
      const lastIdStr = lastCases[0].id;
      const currentNum = parseInt(lastIdStr.replace('PA', ''), 10);
      if (!isNaN(currentNum)) {
        nextId = `PA${String(currentNum + 1).padStart(4, '0')}`;
      }
    }

    const dbPayload = {
      id: nextId,
      agency_id: referrerUuid,
      agency_name: actor.name,
      referrer_id: referrerUuid,
      status: CaseStatus.DRAFT,
      platform: PlatformType.RAKUTEN,
      base_amount: 198000,
      applied_rate: rate,
      customer_type: newCaseData.customerType,
      company_name: newCaseData.companyName,
      company_name_kana: newCaseData.companyNameKana,
      representative_name: newCaseData.repName,
      representative_name_kana: newCaseData.repNameKana,
      rep_name: newCaseData.repName,
      rep_name_kana: newCaseData.repNameKana,
      phone: newCaseData.phone,
      email: newCaseData.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: caseResult, error: caseError } = await supabase.from('cases').insert([this.normalizePayload(dbPayload)]).select().single();
    if (caseError) throw caseError;

    const newUser = {
      // id は DB 側で自動生成 (UUID)
      login_id: nextId, 
      email: newCaseData.email,
      name: newCaseData.companyName || newCaseData.repName,
      role: UserRole.AGENCY,
      status: UserStatus.CUSTOMER,
      referrer_id: referrerUuid, 
      agency_application_status: AgencyApplicationStatus.NONE,
      created_at: new Date().toISOString()
    };
    await supabase.from('users').insert([newUser]);

    return caseResult ? this.mapCase(caseResult) : null;
  }

  async updateCase(id: string, updates: any, actor: User): Promise<Case | null> {
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
    const { data, error } = await supabase.from('cases').update(this.normalizePayload(dbUpdates)).eq('id', id).select().single();
    if (error) throw error;
    return data ? this.mapCase(data) : null;
  }

  async applyForAgency(caseData: Case, actor: User): Promise<{ ok: boolean, error?: any }> {
    // 【最重要】セッションから auth_uid を取得し、それを使って自身の users.id (UUID) を取得する
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { ok: false, error: { message: "セッションが見つかりません。" } };

    const { data: me } = await supabase
      .from('users')
      .select('id')
      .eq('auth_uid', session.user.id)
      .maybeSingle();

    if (!me) return { ok: false, error: { message: "現在のユーザープロフィールが見つかりません。" } };
    
    const referrerUuid = me.id; // これが確実に users.id (UUID)

    // login_id で既存ユーザーを確認
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('login_id', caseData.id)
      .maybeSingle();

    if (!existingUser) {
      // 存在しない場合は新規作成（申請中ステータスで作成）
      const newUser = {
        // id カラム (UUID) は省略してDB側で自動生成させる
        login_id: caseData.id, 
        email: caseData.email,
        name: caseData.companyName || caseData.repName || '新規顧客',
        role: UserRole.AGENCY,
        status: UserStatus.CUSTOMER,
        referrer_id: referrerUuid, 
        agency_application_status: AgencyApplicationStatus.PENDING,
        created_at: new Date().toISOString()
      };
      const { data, error } = await supabase.from('users').insert([newUser]).select();
      return { ok: !error && data && data.length > 0, error };
    } else {
      // 存在する場合は申請中ステータスに更新
      const { data, error } = await supabase
        .from('users')
        .update({ 
          agency_application_status: AgencyApplicationStatus.PENDING,
          referrer_id: referrerUuid, // UUID を使用
          email: caseData.email, 
          name: caseData.companyName || caseData.repName || '新規顧客'
        })
        .eq('login_id', caseData.id)
        .select();
      return { ok: !error && data && data.length > 0, error };
    }
  }

  async approveApplication(loginId: string): Promise<{ ok: boolean, message?: string }> {
    const code = this.generateRandomCode();
    const { error } = await supabase
      .from('users')
      .update({ 
        agency_application_status: AgencyApplicationStatus.APPROVED,
        registration_code: code,
        registration_code_used_at: null 
      })
      .eq('login_id', loginId);
    return { ok: !error, message: error?.message };
  }

  async reissueRegistrationCode(loginId: string): Promise<{ ok: boolean, code?: string }> {
    const newCode = this.generateRandomCode();
    const { error } = await supabase
      .from('users')
      .update({ 
        registration_code: newCode,
        registration_code_used_at: null 
      })
      .eq('login_id', loginId)
      .is('registration_code_used_at', null); 
    return { ok: !error, code: newCode };
  }

  async calculateRate(userId: string): Promise<number> {
    const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('referrer_id', userId).eq('status', CaseStatus.APPROVED);
    const approvedCount = count || 0;
    return approvedCount >= 11 ? 0.5 : (approvedCount >= 2 ? 0.4 : 0.3);
  }

  async getApprovedCount(userId: string): Promise<number> {
    const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('referrer_id', userId).eq('status', CaseStatus.APPROVED);
    return count || 0;
  }

  async getTeamCases(user: User): Promise<Case[]> {
    const { data: downline } = await supabase.from('users').select('id').eq('referrer_id', user.id);
    const ids = (downline || []).map(u => u.id);
    if (ids.length === 0) return [];
    const { data, error } = await supabase.from('cases').select('*').in('referrer_id', ids).order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(c => this.mapCase(c));
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null;
    const { data, error } = await supabase.from('users').select('*').eq('email', email.trim()).maybeSingle();
    if (error) {
      console.error("DB Error fetching user by email:", error);
      return null;
    }
    return data ? this.mapUser(data) : null;
  }

  async getUserByLoginId(loginId: string): Promise<User | null> {
    if (!loginId) return null;
    const { data, error } = await supabase.from('users').select('*').eq('login_id', loginId.trim()).maybeSingle();
    if (error) {
      console.error("DB Error fetching user by login_id:", error);
      return null;
    }
    return data ? this.mapUser(data) : null;
  }

  async checkRegistrationEligibility(loginId: string, registrationCode: string): Promise<{ ok: boolean, reason?: string, email?: string }> {
    const { data: user } = await supabase.from('users').select('*').eq('login_id', loginId).maybeSingle();
    if (!user) return { ok: false, reason: 'not_found' };
    if (user.status === UserStatus.AGENCY) return { ok: false, reason: 'already_registered' };
    if (user.agency_application_status !== AgencyApplicationStatus.APPROVED) return { ok: false, reason: 'not_approved' };
    if (user.registration_code !== registrationCode) return { ok: false, reason: 'invalid_code' };
    if (user.registration_code_used_at) return { ok: false, reason: 'code_used' };
    
    return { ok: true, email: user.email };
  }

  async completeRegistration(loginId: string, registrationCode: string, password: string): Promise<{ ok: boolean }> {
    const check = await this.checkRegistrationEligibility(loginId, registrationCode);
    if (!check.ok) throw new Error(check.reason);

    const email = this.toInternalEmail(loginId);
    
    const { data: authUser, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) throw signUpError;

    const { error } = await supabase.from('users').update({ 
      auth_uid: authUser.user?.id, 
      status: UserStatus.AGENCY, 
      role: UserRole.AGENCY,
      registration_code_used_at: new Date().toISOString()
    }).eq('login_id', loginId);
    
    return { ok: !error };
  }

  async updateUserRewardConfig(userId: string, config: any, actor: User): Promise<{ ok: boolean }> {
    const { error } = await supabase.from('users').update({ manual_base_amount_override: config.manualBaseAmountOverride, manual_rate_override: config.manualRateOverride }).eq('id', userId);
    return { ok: !error };
  }

  private mapUser(u: any): User {
    return {
      id: u.id, auth_uid: u.auth_uid, loginId: u.login_id, email: u.email, name: u.name, role: u.role as UserRole,
      status: u.status as UserStatus, referrerId: u.referrer_id,
      agencyApplicationStatus: u.agency_application_status as AgencyApplicationStatus,
      manualRateOverride: u.manual_rate_override, manualBaseAmountOverride: u.manual_base_amount_override,
      registrationCode: u.registration_code,
      registrationCodeUsedAt: u.registration_code_used_at,
      createdAt: u.created_at
    };
  }

  private mapCase(c: any): Case {
    return {
      id: c.id, agencyId: c.agency_id, agencyName: c.agency_name, referrerId: c.referrer_id,
      status: c.status as CaseStatus, platform: c.platform as PlatformType, customerType: c.customer_type,
      companyName: c.company_name, companyNameKana: c.company_name_kana, representativeName: c.representative_name,
      representativeNameKana: c.representative_name_kana, corporateNumber: c.corporate_number, establishedDate: c.established_date,
      zipCode: c.zip_code, address: c.address, repName: c.rep_name, repNameKana: c.rep_name_kana,
      repBirthDate: c.rep_birth_date, repZipCode: c.rep_zip_code, repAddress: c.rep_address, phone: c.phone, email: c.email,
      customerName: c.rep_name || c.company_name, baseAmount: Number(c.base_amount || 0), appliedRate: Number(c.applied_rate || 0),
      isManualAdjustment: !!c.is_manual_adjustment, manualAgencyAmount: Number(c.manual_agency_amount || 0), tasks: c.tasks || [],
      mallProgress: c.mall_progress || { rakuten: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
      subline: c.subline || { status: 'none' }, emailJp: c.email_jp || { status: 'none' }, rakutenInfo: c.rakuten_info || {},
      createdAt: c.created_at, updatedAt: c.updated_at, documents: [], reviews: []
    };
  }
}
export const db = new DBService();
