import { 
  User, Case, CaseStatus, UserRole, UserStatus, AgencyApplicationStatus, PlatformType, MallOpeningStatus
} from '../types';
import { supabase } from './supabaseClient.browser';

class DBService {
  /**
   * ログインIDを内部用メールアドレスに変換
   */
  private toInternalEmail(loginId: string): string {
    const trimmedId = loginId.trim();
    if (trimmedId.includes('@')) return trimmedId;
    return `${trimmedId}@net-shop.com`;
  }

  /**
   * 日付文字列が空の場合は null を、それ以外はその値を返すヘルパー
   * PostgreSQL の date 型に "" を送るとエラーになるのを防ぐ
   */
  private toNullableDate(val: any): string | null {
    if (val === undefined || val === null || val === '') return null;
    return val;
  }

  /**
   * ユーザーログイン
   */
  async login(loginId: string, pass: string): Promise<User | null> {
    const email = this.toInternalEmail(loginId);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (authError || !authData.user) return null;

      let { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        // オートプロビジョニング: 管理者メールアドレス判定
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
    } catch (e) {
      console.error('Login error:', e);
      return null;
    }
  }

  /**
   * 全ユーザー取得
   */
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(u => this.mapUser(u));
  }

  /**
   * 特定ユーザーの紹介案件取得
   */
  async getCases(user: User): Promise<Case[]> {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('referrer_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(c => this.mapCase(c));
  }

  /**
   * 全案件取得 (管理者用)
   */
  async getAllCases(): Promise<Case[]> {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(c => this.mapCase(c));
  }

  /**
   * IDで案件取得
   */
  async getCaseById(id: string): Promise<Case | null> {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapCase(data) : null;
  }

  /**
   * 案件作成
   */
  async createCase(newCaseData: any, actor: User): Promise<Case | null> {
    const rate = await this.calculateRate(actor.id);
    const dbPayload = {
      id: `CASE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
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
      representative_name: newCaseData.representativeName,
      representative_name_kana: newCaseData.representativeNameKana,
      corporate_number: newCaseData.corporateNumber,
      established_date: this.toNullableDate(newCaseData.establishedDate), // Helper applied
      zip_code: newCaseData.zipCode,
      address: newCaseData.address,
      rep_name: newCaseData.repName,
      rep_name_kana: newCaseData.repNameKana,
      rep_birth_date: this.toNullableDate(newCaseData.repBirthDate), // Helper applied
      rep_zip_code: newCaseData.repZipCode,
      rep_address: newCaseData.repAddress,
      phone: newCaseData.phone,
      email: newCaseData.email,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('cases').insert([dbPayload]).select().single();
    if (error) throw error;
    return data ? this.mapCase(data) : null;
  }

  /**
   * 案件更新
   */
  async updateCase(id: string, updates: any, actor: User): Promise<Case | null> {
    const dbUpdates: any = { ...updates, updated_at: new Date().toISOString() };
    
    // スネークケースへのマッピング
    if (updates.mallProgress) { dbUpdates.mall_progress = updates.mallProgress; delete dbUpdates.mallProgress; }
    if (updates.rakutenInfo) { dbUpdates.rakuten_info = updates.rakutenInfo; delete dbUpdates.rakutenInfo; }
    if (updates.subline) { dbUpdates.subline = updates.subline; delete dbUpdates.subline; }
    if (updates.emailJp) { dbUpdates.email_jp = updates.emailJp; delete dbUpdates.emailJp; }
    if (updates.customerType) { dbUpdates.customer_type = updates.customerType; delete dbUpdates.customerType; }
    if (updates.companyName) { dbUpdates.company_name = updates.companyName; delete dbUpdates.companyName; }
    
    // 日付型カラムの変換（establishedDate / repBirthDate が含まれている場合）
    if ('establishedDate' in updates) { 
      dbUpdates.established_date = this.toNullableDate(updates.establishedDate); 
      delete dbUpdates.establishedDate; 
    }
    if ('repBirthDate' in updates) { 
      dbUpdates.rep_birth_date = this.toNullableDate(updates.repBirthDate); 
      delete dbUpdates.repBirthDate; 
    }

    if (updates.isManualAdjustment !== undefined) { dbUpdates.is_manual_adjustment = updates.isManualAdjustment; delete dbUpdates.isManualAdjustment; }
    if (updates.manualAgencyAmount !== undefined) { dbUpdates.manual_agency_amount = updates.manualAgencyAmount; delete dbUpdates.manualAgencyAmount; }
    if (updates.baseAmount !== undefined) { dbUpdates.base_amount = updates.baseAmount; delete dbUpdates.baseAmount; }

    const { data, error } = await supabase
      .from('cases')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data ? this.mapCase(data) : null;
  }

  /**
   * 承認済み案件数の取得
   */
  async getApprovedCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', userId)
      .eq('status', CaseStatus.APPROVED);
    if (error) throw error;
    return count || 0;
  }

  /**
   * 報酬率の動的計算
   */
  async calculateRate(userId: string): Promise<number> {
    const count = await this.getApprovedCount(userId);
    if (count >= 11) return 0.5;
    if (count >= 2) return 0.4;
    return 0.3;
  }

  /**
   * チーム案件の取得
   */
  async getTeamCases(user: User): Promise<Case[]> {
    const downlineIds = await this.getDownlineUserIds(user.id);
    if (downlineIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .in('referrer_id', downlineIds)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(c => this.mapCase(c));
  }

  /**
   * 直紹介ユーザーID一覧の取得
   */
  private async getDownlineUserIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('referrer_id', userId);
    if (error) throw error;
    return (data || []).map(u => u.id);
  }

  /**
   * メールアドレスでユーザー検索
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapUser(data) : null;
  }

  /**
   * 代理店昇格申請中のユーザー一覧
   */
  async getPendingApplications(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('agency_application_status', AgencyApplicationStatus.PENDING);
    if (error) throw error;
    return (data || []).map(u => this.mapUser(u));
  }

  /**
   * 代理店申請の承認
   */
  async approveApplication(customerId: string): Promise<{ ok: boolean, message?: string }> {
    const { error } = await supabase
      .from('users')
      .update({ agency_application_status: AgencyApplicationStatus.APPROVED })
      .eq('login_id', customerId);
    return { ok: !error, message: error?.message };
  }

  /**
   * 代理店申請の却下
   */
  async rejectApplication(customerId: string): Promise<{ ok: boolean, message?: string }> {
    const { error } = await supabase
      .from('users')
      .update({ agency_application_status: AgencyApplicationStatus.NONE })
      .eq('login_id', customerId);
    return { ok: !error, message: error?.message };
  }

  /**
   * 代理店昇格への申請
   */
  async applyForAgency(userId: string, actor: User): Promise<{ ok: boolean }> {
    const { error } = await supabase
      .from('users')
      .update({ agency_application_status: AgencyApplicationStatus.PENDING })
      .eq('id', userId);
    return { ok: !error };
  }

  /**
   * 登録資格の確認
   */
  async checkRegistrationEligibility(customerId: string): Promise<{ ok: boolean, reason?: string }> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('login_id', customerId)
      .maybeSingle();
    
    if (error || !user) return { ok: false, reason: 'not_approved' };
    if (user.status === UserStatus.AGENCY) return { ok: false, reason: 'already_registered' };
    if (user.agency_application_status !== AgencyApplicationStatus.APPROVED) return { ok: false, reason: 'not_approved' };
    
    return { ok: true };
  }

  /**
   * 代理店本登録完了
   */
  async completeRegistration(customerId: string, password: string): Promise<{ ok: boolean }> {
    const { error } = await supabase
      .from('users')
      .update({ status: UserStatus.AGENCY, role: UserRole.AGENCY })
      .eq('login_id', customerId);
    return { ok: !error };
  }

  /**
   * 報酬設定の更新 (管理者用)
   */
  async updateUserRewardConfig(userId: string, config: any, actor: User): Promise<{ ok: boolean }> {
    const { error } = await supabase
      .from('users')
      .update({
        manual_base_amount_override: config.manualBaseAmountOverride,
        manual_rate_override: config.manualRateOverride
      })
      .eq('id', userId);
    return { ok: !error };
  }

  /**
   * マッピング処理 (DBスネークケース -> アプリキャメルケース)
   */
  private mapUser(u: any): User {
    return {
      id: u.id,
      loginId: u.login_id,
      email: u.email,
      name: u.name,
      role: u.role as UserRole,
      status: u.status as UserStatus,
      referrerId: u.referrer_id,
      agencyApplicationStatus: u.agency_application_status as AgencyApplicationStatus,
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
      status: c.status as CaseStatus,
      platform: c.platform as PlatformType,
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
      baseAmount: Number(c.base_amount || 0),
      appliedRate: Number(c.applied_rate || 0),
      isManualAdjustment: !!c.is_manual_adjustment,
      manualAgencyAmount: Number(c.manual_agency_amount || 0),
      tasks: c.tasks || [],
      mallProgress: c.mall_progress || { rakuten: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
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
