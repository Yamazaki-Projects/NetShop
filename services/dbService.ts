
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
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session || !session.user) return null;
    const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).maybeSingle();
    return profile ? this.mapUser(profile) : null;
  }

  async login(loginId: string, pass: string): Promise<User | null> {
    const email = this.toInternalEmail(loginId);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (authError || !authData.user) return null;
      let { data: profile } = await supabase.from('users').select('*').eq('id', authData.user.id).maybeSingle();
      if (!profile) {
        const isAdmin = email.toLowerCase() === 'api18958@gmail.com' || email.startsWith('admin');
        const newProfile = {
          id: authData.user.id,
          login_id: loginId.split('@')[0],
          email: email,
          name: isAdmin ? 'システム管理者' : '新規ユーザー',
          role: isAdmin ? UserRole.ADMIN : UserRole.AGENCY,
          status: isAdmin ? UserStatus.AGENCY : UserStatus.CUSTOMER,
          created_at: new Date().toISOString()
        };
        const { data } = await supabase.from('users').insert([newProfile]).select().single();
        profile = data;
      }
      return profile ? this.mapUser(profile) : null;
    } catch (e) { return null; }
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
    const rate = await this.calculateRate(actor.id);
    
    // 顧客IDの連番生成ロジック (PA0001〜)
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
      agency_id: actor.id,
      agency_name: actor.name,
      referrer_id: actor.id,
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
    const { data, error } = await supabase.from('cases').insert([this.normalizePayload(dbPayload)]).select().single();
    if (error) throw error;
    return data ? this.mapCase(data) : null;
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

  async getApprovedCount(userId: string): Promise<number> {
    const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('referrer_id', userId).eq('status', CaseStatus.APPROVED);
    return count || 0;
  }

  async calculateRate(userId: string): Promise<number> {
    const count = await this.getApprovedCount(userId);
    return count >= 11 ? 0.5 : (count >= 2 ? 0.4 : 0.3);
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
    const { data } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    return data ? this.mapUser(data) : null;
  }

  async getPendingApplications(): Promise<User[]> {
    const { data } = await supabase.from('users').select('*').eq('agency_application_status', AgencyApplicationStatus.PENDING);
    return (data || []).map(u => this.mapUser(u));
  }

  async approveApplication(loginId: string): Promise<{ ok: boolean, message?: string }> {
    const { error } = await supabase.from('users').update({ agency_application_status: AgencyApplicationStatus.APPROVED }).eq('login_id', loginId);
    return { ok: !error, message: error?.message };
  }

  async rejectApplication(loginId: string): Promise<{ ok: boolean, message?: string }> {
    const { error } = await supabase.from('users').update({ agency_application_status: AgencyApplicationStatus.NONE }).eq('login_id', loginId);
    return { ok: !error, message: error?.message };
  }

  async applyForAgencyByCase(caseData: Case, actor: User): Promise<{ ok: boolean }> {
    let { data: existingUser } = await supabase.from('users').select('*').eq('email', caseData.email).maybeSingle();
    
    if (existingUser) {
      const { error } = await supabase.from('users').update({ agency_application_status: AgencyApplicationStatus.PENDING }).eq('id', existingUser.id);
      return { ok: !error };
    } else {
      const newUser = {
        id: crypto.randomUUID(),
        login_id: caseData.id,
        email: caseData.email,
        name: caseData.companyName || caseData.repName,
        role: UserRole.AGENCY,
        status: UserStatus.CUSTOMER,
        referrer_id: actor.id,
        agency_application_status: AgencyApplicationStatus.PENDING,
        created_at: new Date().toISOString()
      };
      const { error } = await supabase.from('users').insert([newUser]);
      return { ok: !error };
    }
  }

  async checkRegistrationEligibility(loginId: string): Promise<{ ok: boolean, reason?: string }> {
    const { data: user } = await supabase.from('users').select('*').eq('login_id', loginId).maybeSingle();
    if (!user) return { ok: false, reason: 'not_approved' };
    if (user.status === UserStatus.AGENCY) return { ok: false, reason: 'already_registered' };
    if (user.agency_application_status !== AgencyApplicationStatus.APPROVED) return { ok: false, reason: 'not_approved' };
    return { ok: true };
  }

  async completeRegistration(loginId: string, password: string): Promise<{ ok: boolean }> {
    const { error } = await supabase.from('users').update({ status: UserStatus.AGENCY, role: UserRole.AGENCY }).eq('login_id', loginId);
    return { ok: !error };
  }

  async updateUserRewardConfig(userId: string, config: any, actor: User): Promise<{ ok: boolean }> {
    const { error } = await supabase.from('users').update({ manual_base_amount_override: config.manualBaseAmountOverride, manual_rate_override: config.manualRateOverride }).eq('id', userId);
    return { ok: !error };
  }

  private mapUser(u: any): User {
    return {
      id: u.id, loginId: u.login_id, email: u.email, name: u.name, role: u.role as UserRole,
      status: u.status as UserStatus, referrerId: u.referrer_id,
      agencyApplicationStatus: u.agency_application_status as AgencyApplicationStatus,
      manualRateOverride: u.manual_rate_override, manualBaseAmountOverride: u.manual_base_amount_override,
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
