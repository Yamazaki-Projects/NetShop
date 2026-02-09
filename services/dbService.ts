
import { 
  User, Case, CaseStatus, AuditLog, UserRole, UserStatus, TaskStatus, MallOpeningStatus, AgencyApplicationStatus
} from '../types';
import { supabase } from './supabaseClient';

class DBService {
  /**
   * ログイン処理
   * 1. Supabase Auth での認証を試行 (emailの場合)
   * 2. 失敗した場合、usersテーブルの login_id と password を直接照合 (フォールバック)
   */
  async login(identity: string, pass: string): Promise<User | null> {
    // 1. Supabase Auth 試行 (メールアドレス形式の場合)
    if (identity.includes('@')) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: identity,
        password: pass,
      });

      if (!authError && authData.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        if (profile) return this.mapUser(profile);
      }
    }

    // 2. フォールバック: usersテーブルを直接検索 (login_id または email)
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .or(`login_id.eq.${identity},email.eq.${identity}`)
      .eq('password', pass) // 注意: 開発/移行用。本番ではハッシュ化が推奨されます
      .single();

    if (userError || !userRecord) return null;
    return this.mapUser(userRecord);
  }

  /**
   * ユーザー一覧取得
   */
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data as any[]).map((u: any) => this.mapUser(u));
  }

  /**
   * メールアドレスからユーザーを取得する
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error) return null;
    return this.mapUser(data);
  }

  /**
   * 案件一覧取得
   */
  async getCases(user: User): Promise<Case[]> {
    let query = supabase.from('cases').select('*');
    if (user.role !== UserRole.ADMIN) {
      query = query.eq('referrer_id', user.id);
    }
    const { data, error } = await query.order('updated_at', { ascending: false });
    if (error) return [];
    return (data as any[]).map((c: any) => this.mapCase(c));
  }

  async getAllCases(): Promise<Case[]> {
    const { data, error } = await supabase.from('cases').select('*').order('updated_at', { ascending: false });
    return ((data as any[]) || []).map((c: any) => this.mapCase(c));
  }

  async getCaseById(id: string): Promise<Case | null> {
    const { data, error } = await supabase.from('cases').select('*').eq('id', id).single();
    if (error) return null;
    return this.mapCase(data);
  }

  async createCase(newCaseData: Partial<Case>, actor: User): Promise<Case | null> {
    const rate = await this.calculateRate(actor.id);
    const baseAmount = actor.manualBaseAmountOverride || 198000;
    
    const dbPayload = {
      agency_id: actor.id,
      agency_name: actor.name,
      referrer_id: actor.id,
      status: CaseStatus.DRAFT,
      platform: newCaseData.platform,
      customer_type: newCaseData.customerType,
      company_name: newCaseData.companyName,
      company_name_kana: newCaseData.companyNameKana,
      representative_name: newCaseData.representativeName,
      representative_name_kana: newCaseData.representativeNameKana,
      corporate_number: newCaseData.corporateNumber,
      established_date: newCaseData.establishedDate,
      zip_code: newCaseData.zipCode,
      address: newCaseData.address,
      rep_name: newCaseData.repName,
      rep_name_kana: newCaseData.repNameKana,
      rep_birth_date: newCaseData.repBirthDate,
      rep_zip_code: newCaseData.repZipCode,
      rep_address: newCaseData.repAddress,
      phone: newCaseData.phone,
      email: newCaseData.email,
      base_amount: baseAmount,
      applied_rate: rate,
      mall_progress: { rakuten: '申請中', yahoo: '申請中', aupay: '申請中' },
      tasks: [
        { id: 't1', title: '本人確認書類の提出', status: TaskStatus.TODO },
        { id: 't2', title: '口座情報の登録', status: TaskStatus.TODO },
      ]
    };

    const { data, error } = await supabase.from('cases').insert([dbPayload]).select().single();
    if (error) return null;
    await this.logAction(actor, '案件作成', 'case', data.id, { baseAmount });
    return this.mapCase(data);
  }

  async updateCase(id: string, updates: any, actor: User): Promise<Case | null> {
    const { data, error } = await supabase.from('cases').update(updates).eq('id', id).select().single();
    if (error) return null;
    await this.logAction(actor, '案件更新', 'case', id, updates);
    return this.mapCase(data);
  }

  async getApprovedCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', userId)
      .eq('status', CaseStatus.APPROVED);
    return count || 0;
  }

  async calculateRate(userId: string): Promise<number> {
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) return 0.3;
    if (user.manual_rate_override !== null && user.manual_rate_override !== undefined) return user.manual_rate_override;
    const count = await this.getApprovedCount(userId);
    if (count >= 11) return 0.50;
    if (count >= 2) return 0.40;
    return 0.30;
  }

  async getTeamCases(user: User): Promise<Case[]> {
    const downlineIds = await this.getDownlineUserIds(user.id);
    if (downlineIds.length === 0) return [];
    const { data, error } = await supabase.from('cases').select('*').in('referrer_id', downlineIds);
    if (error) return [];
    return (data as any[]).map((c: any) => this.mapCase(c));
  }

  async getDownlineUserIds(userId: string): Promise<string[]> {
    const { data } = await supabase.from('users').select('id').eq('referrer_id', userId);
    if (!data) return [];
    let ids = (data as any[]).map((u: any) => u.id);
    for (const id of (data as any[]).map((u: any) => u.id)) {
      const subIds = await this.getDownlineUserIds(id);
      ids = [...ids, ...subIds];
    }
    return Array.from(new Set(ids));
  }

  async logAction(actor: User, action: string, targetType: string, targetId: string, metadata: any) {
    await supabase.from('audit_logs').insert([{
      actor_user_id: actor.id,
      actor_name: actor.name,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata
    }]);
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

  async approveAgency(userId: string, actor: User) {
    await supabase.from('users').update({ agency_application_status: AgencyApplicationStatus.APPROVED }).eq('id', userId);
    await this.logAction(actor, '代理店昇格承認', 'user', userId, {});
  }

  async applyForAgency(userId: string, actor: User) {
    await supabase.from('users').update({ agency_application_status: AgencyApplicationStatus.PENDING }).eq('id', userId);
    await this.logAction(actor, '代理店昇格申請', 'user', userId, {});
  }

  /**
   * 認証用IDの有効性チェック
   */
  async verifyRegistrationId(loginId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('login_id', loginId)
      .eq('agency_application_status', AgencyApplicationStatus.APPROVED)
      .eq('status', UserStatus.CUSTOMER)
      .single();
    if (error) return null;
    return this.mapUser(data);
  }

  /**
   * パスワード設定と代理店ステータスへの更新
   */
  async completeRegistration(userId: string, password: string): Promise<void> {
    await supabase.from('users').update({ 
      status: UserStatus.AGENCY,
      password: password
    }).eq('id', userId);
  }

  /**
   * 代理店の報酬設定変更
   */
  async updateUserRewardConfig(userId: string, config: any, actor: User) {
    const updates = {
      manual_base_amount_override: config.manualBaseAmountOverride,
      manual_rate_override: config.manualRateOverride
    };
    await supabase.from('users').update(updates).eq('id', userId);
    await this.logAction(actor, '報酬設定変更', 'user', userId, config);
  }
}

export const db = new DBService();
