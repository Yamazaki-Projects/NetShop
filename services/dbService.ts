
import { 
  User, Case, CaseStatus, AuditLog, UserRole, UserStatus, TaskStatus, MallOpeningStatus, AgencyApplicationStatus
} from '../types';
import { supabase } from './supabaseClient';

class DBService {
  // ログインIDを内部用メールアドレスに変換
  private toInternalEmail(loginId: string): string {
    if (loginId.includes('@')) return loginId;
    return `${loginId}@net-shop.com`;
  }

  /**
   * ログイン処理 (Supabase Auth)
   */
  async login(loginId: string, pass: string): Promise<User | null> {
    const email = this.toInternalEmail(loginId);
    
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
  }

  /**
   * メールアドレスからユーザーを取得
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    if (error) return null;
    return this.mapUser(data);
  }

  /**
   * 管理者：承認待ちの申請一覧を取得
   */
  async getPendingApplications(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('agency_application_status', AgencyApplicationStatus.PENDING)
      .order('created_at', { ascending: true });
    
    if (error) return [];
    return (data as any[]).map(u => this.mapUser(u));
  }

  /**
   * 代理店昇格申請を行う
   */
  async applyForAgency(userId: string, actor: User): Promise<{ ok: boolean }> {
    const { error } = await supabase
      .from('users')
      .update({ agency_application_status: AgencyApplicationStatus.PENDING })
      .eq('id', userId);
    return { ok: !error };
  }

  /**
   * 管理者：代理店申請を承認 (Vercel API経由)
   */
  async approveApplication(customerId: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch('/api/admin/agent-applications/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId })
      });
      return await res.json();
    } catch (e) {
      return { ok: false, message: '通信エラーが発生しました' };
    }
  }

  /**
   * 管理者：代理店申請を却下 (Vercel API経由)
   */
  async rejectApplication(customerId: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await fetch('/api/admin/agent-applications/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId })
      });
      return await res.json();
    } catch (e) {
      return { ok: false, message: '通信エラーが発生しました' };
    }
  }

  /**
   * 新規登録：顧客IDの有効性チェック (Vercel API経由)
   */
  async checkRegistrationEligibility(customerId: string): Promise<{ ok: boolean; reason?: string }> {
    try {
      const res = await fetch(`/api/agent-registration/check?customerId=${customerId}`);
      return await res.json();
    } catch (e) {
      return { ok: false, reason: 'network_error' };
    }
  }

  /**
   * 新規登録：パスワード設定と完了 (Vercel API経由)
   */
  async completeRegistration(customerId: string, password: string): Promise<{ ok: boolean; reason?: string }> {
    try {
      const res = await fetch('/api/agent-registration/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, password })
      });
      return await res.json();
    } catch (e) {
      return { ok: false, reason: 'network_error' };
    }
  }

  // 既存のメソッドはそのまま（必要に応じてマッピング調整）
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data as any[]).map(u => this.mapUser(u));
  }

  async getCases(user: User): Promise<Case[]> {
    let query = supabase.from('cases').select('*');
    if (user.role !== UserRole.ADMIN) {
      query = query.eq('referrer_id', user.id);
    }
    const { data, error } = await query.order('updated_at', { ascending: false });
    return (data as any[] || []).map(c => this.mapCase(c));
  }

  async getAllCases(): Promise<Case[]> {
    const { data, error } = await supabase.from('cases').select('*').order('updated_at', { ascending: false });
    return (data as any[] || []).map(c => this.mapCase(c));
  }

  async getCaseById(id: string): Promise<Case | null> {
    const { data, error } = await supabase.from('cases').select('*').eq('id', id).single();
    if (error) return null;
    return this.mapCase(data);
  }

  async createCase(newCaseData: any, actor: User): Promise<Case | null> {
    const rate = await this.calculateRate(actor.id);
    const baseAmount = actor.manualBaseAmountOverride || 198000;
    const dbPayload = {
      ...newCaseData,
      agency_id: actor.id,
      agency_name: actor.name,
      referrer_id: actor.id,
      status: CaseStatus.DRAFT,
      base_amount: baseAmount,
      applied_rate: rate,
      mall_progress: { rakuten: '申請中', yahoo: '申請中', aupay: '申請中' },
      tasks: [{ id: 't1', title: '本人確認書類の提出', status: TaskStatus.TODO }]
    };
    const { data, error } = await supabase.from('cases').insert([dbPayload]).select().single();
    if (error) return null;
    return this.mapCase(data);
  }

  async updateCase(id: string, updates: any, actor: User): Promise<Case | null> {
    const { data, error } = await supabase.from('cases').update(updates).eq('id', id).select().single();
    if (error) return null;
    return this.mapCase(data);
  }

  async getApprovedCount(userId: string): Promise<number> {
    const { count } = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('referrer_id', userId).eq('status', CaseStatus.APPROVED);
    return count || 0;
  }

  async calculateRate(userId: string): Promise<number> {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!data) return 0.3;
    if (data.manual_rate_override != null) return data.manual_rate_override;
    const count = await this.getApprovedCount(userId);
    return count >= 11 ? 0.5 : (count >= 2 ? 0.4 : 0.3);
  }

  async getTeamCases(user: User): Promise<Case[]> {
    const ids = await this.getDownlineUserIds(user.id);
    if (ids.length === 0) return [];
    const { data } = await supabase.from('cases').select('*').in('referrer_id', ids);
    return (data as any[] || []).map(c => this.mapCase(c));
  }

  async getDownlineUserIds(userId: string): Promise<string[]> {
    const { data } = await supabase.from('users').select('id').eq('referrer_id', userId);
    if (!data) return [];
    let ids = data.map(u => u.id);
    for (const id of data.map(u => u.id)) {
      const subIds = await this.getDownlineUserIds(id);
      ids = [...ids, ...subIds];
    }
    return Array.from(new Set(ids));
  }

  /**
   * ユーザーの報酬設定を更新する
   */
  async updateUserRewardConfig(userId: string, config: { manualBaseAmountOverride: number, manualRateOverride: number }, actor: User): Promise<{ ok: boolean }> {
    const { error } = await supabase
      .from('users')
      .update({
        manual_base_amount_override: config.manualBaseAmountOverride,
        manual_rate_override: config.manualRateOverride
      })
      .eq('id', userId);
    return { ok: !error };
  }

  private mapUser(u: any): User {
    return {
      id: u.id,
      loginId: u.login_id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      referrerId: u.referrer_id,
      agencyApplicationStatus: u.agency_application_status,
      manualRateOverride: u.manual_rate_override,
      manualBaseAmountOverride: u.manual_base_amount_override,
      createdAt: u.created_at
    };
  }

  private mapCase(c: any): Case {
    return {
      id: c.id,
      agencyId: c.agency_id,
      agencyName: c.agency_name,
      referrerId: c.referrer_id,
      status: c.status,
      platform: c.platform,
      customerType: c.customer_type,
      companyName: c.company_name,
      companyNameKana: c.company_name_kana,
      representativeName: c.representative_name,
      representativeNameKana: c.representative_name_kana,
      corporateNumber: c.corporate_number,
      establishedDate: c.established_date,
      zipCode: c.zip_code,
      address: c.address,
      repName: c.rep_name,
      repNameKana: c.rep_name_kana,
      repBirthDate: c.rep_birth_date,
      repZipCode: c.rep_zip_code,
      repAddress: c.rep_address,
      phone: c.phone,
      email: c.email,
      customerName: c.rep_name || c.company_name,
      baseAmount: c.base_amount,
      appliedRate: c.applied_rate,
      isManualAdjustment: c.is_manual_adjustment,
      manualAgencyAmount: c.manual_agency_amount,
      tasks: c.tasks || [],
      mallProgress: c.mall_progress || {},
      subline: c.subline || { status: 'none' },
      emailJp: c.email_jp || { status: 'none' },
      rakutenInfo: c.rakuten_info || {},
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      documents: [],
      reviews: []
    };
  }
}

export const db = new DBService();
