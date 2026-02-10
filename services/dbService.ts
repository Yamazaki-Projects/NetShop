
import { 
  User, Case, CaseStatus, AuditLog, UserRole, UserStatus, TaskStatus, MallOpeningStatus, AgencyApplicationStatus
} from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { mockUsers, mockCases } from './mockData';

class DBService {
  // メモリ内での状態管理（バックエンドがない場合のデモ用）
  private localUsers: User[] = [...mockUsers];
  private localCases: Case[] = [...mockCases];

  private toInternalEmail(loginId: string): string {
    if (loginId.includes('@')) return loginId;
    return `${loginId}@net-shop.com`;
  }

  /**
   * 汎用的なデータ取得/実行ラッパー
   */
  private async execute<T>(
    supabaseOp: () => any,
    mockOp: () => T
  ): Promise<T> {
    if (!isSupabaseConfigured) {
      return mockOp();
    }
    try {
      const { data, error } = await supabaseOp();
      if (error) throw error;
      return data as unknown as T;
    } catch (e) {
      console.warn("Supabase operation failed, falling back to mock:", e);
      return mockOp();
    }
  }

  async login(loginId: string, pass: string): Promise<User | null> {
    if (!isSupabaseConfigured) {
      const user = this.localUsers.find(u => u.loginId === loginId && (u as any).password === pass);
      return user || null;
    }

    const email = this.toInternalEmail(loginId);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (authError || !authData.user) return null;

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) return null;
      return this.mapUser(profile);
    } catch (e) {
      return this.login(loginId, pass); 
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.execute(
      () => supabase.from('users').select('*').eq('email', email).single(),
      () => this.localUsers.find(u => u.email === email) || null
    ).then(res => res ? (isSupabaseConfigured ? this.mapUser(res) : res) : null);
  }

  async getPendingApplications(): Promise<User[]> {
    return this.execute(
      () => supabase.from('users').select('*').eq('agency_application_status', AgencyApplicationStatus.PENDING),
      () => this.localUsers.filter(u => u.agencyApplicationStatus === AgencyApplicationStatus.PENDING)
    ).then(res => (res as any[]).map(u => isSupabaseConfigured ? this.mapUser(u) : u));
  }

  async approveApplication(customerId: string): Promise<{ ok: boolean; message?: string }> {
    if (!isSupabaseConfigured) {
      const user = this.localUsers.find(u => u.loginId === customerId);
      if (user) {
        user.agencyApplicationStatus = AgencyApplicationStatus.APPROVED;
        return { ok: true };
      }
      return { ok: false, message: 'ユーザーが見つかりません' };
    }

    const { error } = await supabase
      .from('users')
      .update({ agency_application_status: AgencyApplicationStatus.APPROVED })
      .eq('login_id', customerId);
    
    return { ok: !error, message: error?.message };
  }

  async rejectApplication(customerId: string): Promise<{ ok: boolean; message?: string }> {
    if (!isSupabaseConfigured) {
      const user = this.localUsers.find(u => u.loginId === customerId);
      if (user) {
        user.agencyApplicationStatus = AgencyApplicationStatus.NONE;
        return { ok: true };
      }
      return { ok: false, message: 'ユーザーが見つかりません' };
    }

    const { error } = await supabase
      .from('users')
      .update({ agency_application_status: AgencyApplicationStatus.NONE })
      .eq('login_id', customerId);
    
    return { ok: !error, message: error?.message };
  }

  async checkRegistrationEligibility(customerId: string): Promise<{ ok: boolean; reason?: string }> {
    const user = await this.execute(
      () => supabase.from('users').select('*').eq('login_id', customerId).single(),
      () => this.localUsers.find(u => u.loginId === customerId) || null
    );

    if (!user) return { ok: false, reason: 'not_approved' };
    
    const status = isSupabaseConfigured ? (user as any).agency_application_status : (user as User).agencyApplicationStatus;
    const userStatus = isSupabaseConfigured ? (user as any).status : (user as User).status;

    if (userStatus === UserStatus.AGENCY) return { ok: false, reason: 'already_registered' };
    if (status !== AgencyApplicationStatus.APPROVED) return { ok: false, reason: 'not_approved' };
    
    return { ok: true };
  }

  async completeRegistration(customerId: string, password: string): Promise<{ ok: boolean; reason?: string }> {
    if (!isSupabaseConfigured) {
      const user = this.localUsers.find(u => u.loginId === customerId);
      if (user) {
        user.status = UserStatus.AGENCY;
        user.role = UserRole.AGENCY;
        (user as any).password = password; 
        return { ok: true };
      }
      return { ok: false, reason: 'not_found' };
    }

    const { error } = await supabase
      .from('users')
      .update({ 
        status: UserStatus.AGENCY,
        role: UserRole.AGENCY,
        agency_application_status: AgencyApplicationStatus.APPROVED 
      })
      .eq('login_id', customerId);

    return { ok: !error };
  }

  async getUsers(): Promise<User[]> {
    return this.execute(
      () => supabase.from('users').select('*').order('created_at', { ascending: false }),
      () => this.localUsers
    ).then(res => (res as any[]).map(u => isSupabaseConfigured ? this.mapUser(u) : u));
  }

  /**
   * ユーザーの「直紹介案件」のみを取得します。
   * 管理者の場合でも全件ではなく、自身の紹介案件に絞り込みます。
   */
  async getCases(user: User): Promise<Case[]> {
    return this.execute(
      () => supabase.from('cases').select('*').eq('referrer_id', user.id).order('updated_at', { ascending: false }),
      () => this.localCases.filter(c => c.referrerId === user.id)
    ).then(res => (res as any[]).map(c => isSupabaseConfigured ? this.mapCase(c) : c));
  }

  async getAllCases(): Promise<Case[]> {
    return this.execute(
      () => supabase.from('cases').select('*').order('updated_at', { ascending: false }),
      () => this.localCases
    ).then(res => (res as any[]).map(c => isSupabaseConfigured ? this.mapCase(c) : c));
  }

  async getCaseById(id: string): Promise<Case | null> {
    return this.execute(
      () => supabase.from('cases').select('*').eq('id', id).single(),
      () => this.localCases.find(c => c.id === id) || null
    ).then(res => res ? (isSupabaseConfigured ? this.mapCase(res) : res) : null);
  }

  async createCase(newCaseData: any, actor: User): Promise<Case | null> {
    const rate = await this.calculateRate(actor.id);
    const baseAmount = actor.manualBaseAmountOverride || 198000;
    const dbPayload = {
      ...newCaseData,
      id: `CASE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      agency_id: actor.id,
      agency_name: actor.name,
      referrer_id: actor.id,
      status: CaseStatus.DRAFT,
      base_amount: baseAmount,
      applied_rate: rate,
      mall_progress: { rakuten: '申請中', yahoo: '申請中', aupay: '申請中' },
      tasks: [{ id: 't1', title: '本人確認書類の提出', status: TaskStatus.TODO }],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured) {
      const mapped = this.mapCase(dbPayload); 
      this.localCases.push(mapped);
      return mapped;
    }

    const { data, error } = await supabase.from('cases').insert([dbPayload]).select().single();
    if (error) return null;
    return this.mapCase(data);
  }

  async updateCase(id: string, updates: any, actor: User): Promise<Case | null> {
    if (!isSupabaseConfigured) {
      const index = this.localCases.findIndex(c => c.id === id);
      if (index !== -1) {
        this.localCases[index] = { ...this.localCases[index], ...updates, updatedAt: new Date().toISOString() };
        return this.localCases[index];
      }
      return null;
    }

    const { data, error } = await supabase.from('cases').update(updates).eq('id', id).select().single();
    if (error) return null;
    return this.mapCase(data);
  }

  async getApprovedCount(userId: string): Promise<number> {
    if (!isSupabaseConfigured) {
      return this.localCases.filter(c => c.referrerId === userId && c.status === CaseStatus.APPROVED).length;
    }
    const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('referrer_id', userId).eq('status', CaseStatus.APPROVED);
    return count || 0;
  }

  async calculateRate(userId: string): Promise<number> {
    const user = await this.execute(
      () => supabase.from('users').select('*').eq('id', userId).single(),
      () => this.localUsers.find(u => u.id === userId) || null
    );
    if (!user) return 0.3;
    
    const manualRate = isSupabaseConfigured ? (user as any).manual_rate_override : (user as User).manualRateOverride;
    if (manualRate != null) return manualRate;

    const count = await this.getApprovedCount(userId);
    return count >= 11 ? 0.5 : (count >= 2 ? 0.4 : 0.3);
  }

  async getTeamCases(user: User): Promise<Case[]> {
    const ids = await this.getDownlineUserIds(user.id);
    if (ids.length === 0) return [];

    return this.execute(
      () => supabase.from('cases').select('*').in('referrer_id', ids),
      () => this.localCases.filter(c => ids.includes(c.referrerId || ''))
    ).then(res => (res as any[]).map(c => isSupabaseConfigured ? this.mapCase(c) : c));
  }

  async getDownlineUserIds(userId: string): Promise<string[]> {
    const users = await this.execute(
      () => supabase.from('users').select('id').eq('referrer_id', userId),
      () => this.localUsers.filter(u => u.referrerId === userId).map(u => ({ id: u.id }))
    );
    
    if (!users) return [];
    let ids = (users as any[]).map(u => u.id);
    for (const id of ids) {
      const subIds = await this.getDownlineUserIds(id);
      ids = [...ids, ...subIds];
    }
    return Array.from(new Set(ids));
  }

  async applyForAgency(userId: string, actor: User): Promise<{ ok: boolean }> {
    if (!isSupabaseConfigured) {
      const user = this.localUsers.find(u => u.id === userId);
      if (user) {
        user.agencyApplicationStatus = AgencyApplicationStatus.PENDING;
        return { ok: true };
      }
      return { ok: false };
    }
    const { error } = await supabase.from('users').update({ agency_application_status: AgencyApplicationStatus.PENDING }).eq('id', userId);
    return { ok: !error };
  }

  async updateUserRewardConfig(userId: string, config: { manualBaseAmountOverride: number, manualRateOverride: number }, actor: User): Promise<{ ok: boolean }> {
    if (!isSupabaseConfigured) {
      const user = this.localUsers.find(u => u.id === userId);
      if (user) {
        user.manualBaseAmountOverride = config.manualBaseAmountOverride;
        user.manualRateOverride = config.manualRateOverride;
        return { ok: true };
      }
      return { ok: false };
    }
    const { error } = await supabase.from('users').update({
        manual_base_amount_override: config.manualBaseAmountOverride,
        manual_rate_override: config.manualRateOverride
    }).eq('id', userId);
    return { ok: !error };
  }

  private mapUser(u: any): User {
    return {
      id: u.id,
      loginId: u.login_id || u.loginId,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      referrerId: u.referrer_id || u.referrerId,
      agencyApplicationStatus: u.agency_application_status || u.agencyApplicationStatus,
      manualRateOverride: u.manual_rate_override || u.manualRateOverride,
      manualBaseAmountOverride: u.manual_base_amount_override || u.manualBaseAmountOverride,
      createdAt: u.created_at || u.createdAt
    };
  }

  private mapCase(c: any): Case {
    return {
      id: c.id,
      agencyId: c.agency_id || c.agencyId,
      agencyName: c.agency_name || c.agencyName,
      referrerId: c.referrer_id || c.referrerId,
      status: c.status,
      platform: c.platform,
      customerType: c.customer_type || c.customerType,
      companyName: c.company_name || c.companyName,
      companyNameKana: c.company_name_kana || c.companyNameKana,
      representativeName: c.representative_name || c.representativeName,
      representativeNameKana: c.representative_name_kana || c.representativeNameKana,
      corporateNumber: c.corporate_number || c.corporateNumber,
      establishedDate: c.established_date || c.establishedDate,
      zipCode: c.zip_code || c.zipCode,
      address: c.address,
      repName: c.rep_name || c.repName,
      repNameKana: c.rep_name_kana || c.repNameKana,
      repBirthDate: c.rep_birth_date || c.repBirthDate,
      repZipCode: c.rep_zip_code || c.repZipCode,
      repAddress: c.rep_address || c.repAddress,
      phone: c.phone,
      email: c.email,
      customerName: c.rep_name || c.repName || c.company_name || c.companyName,
      baseAmount: c.base_amount || c.baseAmount,
      appliedRate: c.applied_rate || c.appliedRate,
      isManualAdjustment: c.is_manual_adjustment || c.isManualAdjustment,
      manualAgencyAmount: c.manual_agency_amount || c.manualAgencyAmount,
      tasks: c.tasks || [],
      mallProgress: c.mall_progress || c.mallProgress || {},
      subline: c.subline || { status: 'none' },
      emailJp: c.email_jp || c.emailJp || { status: 'none' },
      rakutenInfo: c.rakuten_info || c.rakutenInfo || {},
      createdAt: c.created_at || c.createdAt,
      updatedAt: c.updated_at || c.updatedAt,
      documents: [],
      reviews: []
    };
  }
}

export const db = new DBService();
