
import { 
  User, Case, CaseStatus, UserRole, UserStatus, TaskStatus, MallOpeningStatus, AgencyApplicationStatus
} from '../types';
import { supabase } from './supabaseClient';

class DBService {
  /**
   * 入力されたIDをシステム内部のメールアドレス形式に変換します。
   * 例: "admin" -> "admin@net-shop.com"
   */
  private toInternalEmail(loginId: string): string {
    if (loginId.includes('@')) return loginId;
    return `${loginId.trim()}@net-shop.com`;
  }

  async login(loginId: string, pass: string): Promise<User | null> {
    const email = this.toInternalEmail(loginId);
    console.log(`[Login] Attempting auth for: ${email}`);

    try {
      // 1. Supabase Authで認証
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (authError || !authData.user) {
        console.error("[Login] Auth failed:", authError?.message);
        return null;
      }

      const authId = authData.user.id;
      console.log(`[Login] Auth successful. UUID: ${authId}`);

      // 2. usersテーブルからプロフィールを取得
      let { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authId)
        .maybeSingle();

      // 3. プロフィールが存在しない場合、その場で自動作成（オートプロビジョニング）
      if (!profile) {
        console.log(`[Login] Profile missing in 'users' table. Creating auto-profile for: ${email}`);
        
        // admin@net-shop.com の場合は特権管理者として作成
        const isAdmin = email.toLowerCase() === 'admin@net-shop.com';
        
        const newProfile = {
          id: authId,
          login_id: loginId.includes('@') ? loginId.split('@')[0] : loginId,
          email: email,
          name: isAdmin ? 'システム管理者' : '新規ユーザー',
          role: isAdmin ? UserRole.ADMIN : UserRole.AGENCY,
          status: isAdmin ? UserStatus.AGENCY : UserStatus.CUSTOMER,
          agency_application_status: isAdmin ? AgencyApplicationStatus.APPROVED : AgencyApplicationStatus.NONE,
          created_at: new Date().toISOString()
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('users')
          .insert([newProfile])
          .select()
          .single();

        if (insertError) {
          console.error("[Login] Failed to auto-create user profile:", insertError);
          // 既存のメールアドレスで別のUUIDがある可能性を考慮し、メールアドレスで再検索
          const { data: existingByEmail } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();
          
          if (existingByEmail) {
            console.log("[Login] Found existing profile by email. Syncing UUID...");
            await supabase.from('users').update({ id: authId }).eq('email', email);
            profile = { ...existingByEmail, id: authId };
          } else {
            alert("ログインは成功しましたが、データベースの初期化に失敗しました。管理者にお問い合わせください。");
            return null;
          }
        } else {
          profile = insertedData;
          console.log("[Login] Auto-profile created successfully.");
        }
      }

      return profile ? this.mapUser(profile) : null;
    } catch (e) {
      console.error("[Login] Critical error:", e);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (error || !data) return null;
      return this.mapUser(data);
    } catch (e) {
      console.error("Fetch user error:", e);
      return null;
    }
  }

  async getPendingApplications(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('agency_application_status', AgencyApplicationStatus.PENDING);
      if (error) throw error;
      return (data || []).map(u => this.mapUser(u));
    } catch (e) {
      console.error("Fetch pending applications error:", e);
      return [];
    }
  }

  async approveApplication(customerId: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ agency_application_status: AgencyApplicationStatus.APPROVED })
        .eq('login_id', customerId);
      return { ok: !error, message: error?.message };
    } catch (e) {
      return { ok: false, message: "Connection failed" };
    }
  }

  async rejectApplication(customerId: string): Promise<{ ok: boolean; message?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ agency_application_status: AgencyApplicationStatus.NONE })
        .eq('login_id', customerId);
      return { ok: !error, message: error?.message };
    } catch (e) {
      return { ok: false, message: "Connection failed" };
    }
  }

  async checkRegistrationEligibility(customerId: string): Promise<{ ok: boolean; reason?: string }> {
    try {
      const { data: user, error } = await supabase.from('users').select('*').eq('login_id', customerId).maybeSingle();
      if (error || !user) return { ok: false, reason: 'not_approved' };
      
      const mappedUser = this.mapUser(user);
      if (mappedUser.status === UserStatus.AGENCY) return { ok: false, reason: 'already_registered' };
      if (mappedUser.agencyApplicationStatus !== AgencyApplicationStatus.APPROVED) return { ok: false, reason: 'not_approved' };
      
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'system_error' };
    }
  }

  async completeRegistration(customerId: string, password: string): Promise<{ ok: boolean; reason?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          status: UserStatus.AGENCY,
          role: UserRole.AGENCY,
          agency_application_status: AgencyApplicationStatus.APPROVED 
        })
        .eq('login_id', customerId);
      return { ok: !error };
    } catch (e) {
      return { ok: false };
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(u => this.mapUser(u));
    } catch (e) {
      console.error("Get users error:", e);
      return [];
    }
  }

  async getCases(user: User): Promise<Case[]> {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('referrer_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(c => this.mapCase(c));
    } catch (e) {
      console.error("Get cases error:", e);
      return [];
    }
  }

  async getAllCases(): Promise<Case[]> {
    try {
      const { data, error } = await supabase.from('cases').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(c => this.mapCase(c));
    } catch (e) {
      console.error("Get all cases error:", e);
      return [];
    }
  }

  async getCaseById(id: string): Promise<Case | null> {
    try {
      const { data, error } = await supabase.from('cases').select('*').eq('id', id).maybeSingle();
      if (error || !data) return null;
      return this.mapCase(data);
    } catch (e) {
      console.error("Get case by id error:", e);
      return null;
    }
  }

  async createCase(newCaseData: any, actor: User): Promise<Case | null> {
    try {
      const rate = await this.calculateRate(actor.id);
      const baseAmount = actor.manualBaseAmountOverride || 198000;
      
      const dbPayload = {
        id: `CASE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        agency_id: actor.id,
        agency_name: actor.name,
        referrer_id: actor.id,
        status: CaseStatus.DRAFT,
        base_amount: baseAmount,
        applied_rate: rate,
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
        mall_progress: { rakuten: '申請中', yahoo: '申請中', aupay: '申請中' },
        tasks: [{ id: 't1', title: '本人確認書類の提出', status: TaskStatus.TODO }],
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('cases').insert([dbPayload]).select().single();
      if (error) throw error;
      return this.mapCase(data);
    } catch (e) {
      console.error("Create case error:", e);
      return null;
    }
  }

  async updateCase(id: string, updates: any, actor: User): Promise<Case | null> {
    try {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      
      const mapKeys: Record<string, string> = {
        agencyId: 'agency_id',
        agencyName: 'agency_name',
        referrerId: 'referrer_id',
        customerType: 'customer_type',
        companyName: 'company_name',
        companyNameKana: 'company_name_kana',
        representativeName: 'representative_name',
        representativeNameKana: 'representative_name_kana',
        corporateNumber: 'corporate_number',
        establishedDate: 'established_date',
        zipCode: 'zip_code',
        repName: 'rep_name',
        repNameKana: 'rep_name_kana',
        repBirthDate: 'rep_birth_date',
        repZipCode: 'rep_zip_code',
        repAddress: 'rep_address',
        baseAmount: 'base_amount',
        appliedRate: 'applied_rate',
        isManualAdjustment: 'is_manual_adjustment',
        manualAgencyAmount: 'manual_agency_amount',
        mallProgress: 'mall_progress',
        rakutenInfo: 'rakuten_info',
        subline: 'subline',
        emailJp: 'email_jp'
      };

      Object.keys(updates).forEach(key => {
        const dbKey = mapKeys[key] || key;
        dbUpdates[dbKey] = updates[key];
      });

      const { data, error } = await supabase.from('cases').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      return this.mapCase(data);
    } catch (e) {
      console.error("Update case error:", e);
      return null;
    }
  }

  async getApprovedCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', userId)
        .eq('status', CaseStatus.APPROVED);
      if (error) return 0;
      return count || 0;
    } catch (e) {
      return 0;
    }
  }

  async calculateRate(userId: string): Promise<number> {
    try {
      const { data: user, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (error || !user) return 0.3;
      
      const mappedUser = this.mapUser(user);
      if (mappedUser.manualRateOverride != null) return mappedUser.manualRateOverride;

      const count = await this.getApprovedCount(userId);
      return count >= 11 ? 0.5 : (count >= 2 ? 0.4 : 0.3);
    } catch (e) {
      return 0.3;
    }
  }

  async getTeamCases(user: User): Promise<Case[]> {
    try {
      const ids = await this.getDownlineUserIds(user.id);
      if (ids.length === 0) return [];

      const { data, error } = await supabase.from('cases').select('*').in('referrer_id', ids);
      if (error) throw error;
      return (data || []).map(c => this.mapCase(c));
    } catch (e) {
      return [];
    }
  }

  async getDownlineUserIds(userId: string): Promise<string[]> {
    try {
      const { data: users, error } = await supabase.from('users').select('id').eq('referrer_id', userId);
      
      if (error || !users) return [];
      const directIds = (users as any[]).map(u => u.id);
      let allDescendantIds = [...directIds];

      for (const id of directIds) {
        const descendants = await this.getDownlineUserIds(id);
        allDescendantIds = [...allDescendantIds, ...descendants];
      }
      
      return Array.from(new Set(allDescendantIds));
    } catch (e) {
      return [];
    }
  }

  async applyForAgency(userId: string, actor: User): Promise<{ ok: boolean }> {
    try {
      const { error } = await supabase.from('users').update({ agency_application_status: AgencyApplicationStatus.PENDING }).eq('id', userId);
      return { ok: !error };
    } catch (e) {
      return { ok: false };
    }
  }

  async updateUserRewardConfig(userId: string, config: { manualBaseAmountOverride: number, manualRateOverride: number }, actor: User): Promise<{ ok: boolean }> {
    try {
      const { error } = await supabase.from('users').update({
          manual_base_amount_override: config.manualBaseAmountOverride,
          manual_rate_override: config.manualRateOverride
      }).eq('id', userId);
      return { ok: !error };
    } catch (e) {
      return { ok: false };
    }
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
      baseAmount: Number(c.base_amount || 0),
      appliedRate: Number(c.applied_rate || 0),
      isManualAdjustment: !!c.is_manual_adjustment,
      manualAgencyAmount: Number(c.manual_agency_amount || 0),
      tasks: c.tasks || [],
      mallProgress: c.mall_progress || { rakuten: '申請中', yahoo: '申請中', aupay: '申請中' },
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
