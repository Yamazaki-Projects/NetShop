
import { 
  User, Case, CaseStatus, AuditLog, UserRole, UserStatus, TaskStatus, MallOpeningStatus, CaseDocument, AgencyApplicationStatus
} from '../types';
import { mockUsers, mockCases, mockAuditLogs } from './mockData';

class DBService {
  private users: User[] = [...mockUsers];
  private cases: Case[] = [...mockCases];
  private auditLogs: AuditLog[] = [...mockAuditLogs];

  login(loginId: string, pass: string): User | undefined {
    const user = this.users.find(u => u.loginId === loginId);
    if (!user || user.password !== pass) return undefined;

    if (user.role === UserRole.ADMIN) return user;

    if (user.status === UserStatus.CUSTOMER && user.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) {
      user.status = UserStatus.AGENCY;
      this.logAction(user, '初回ログイン完了: 代理店ステータス有効化', 'user', user.id, { previousStatus: UserStatus.CUSTOMER });
      return user;
    }

    if (user.status === UserStatus.CUSTOMER) return undefined; 
    return user;
  }

  getUsers(): User[] { return [...this.users]; }
  getUserById(id: string): User | undefined { return this.users.find(u => u.id === id); }
  getUserByEmail(email: string): User | undefined { return this.users.find(u => u.email === email); }

  // --- 管理者専用：ユーザーの報酬設定更新 ---
  updateUserRewardConfig(userId: string, config: { manualRateOverride?: number, manualBaseAmountOverride?: number }, actor: User) {
    if (actor.role !== UserRole.ADMIN) return false;
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex] = { ...this.users[userIndex], ...config };
      this.logAction(actor, `代理店報酬設定の個別更新: ${this.users[userIndex].name}`, 'user', userId, config);
      return true;
    }
    return false;
  }

  calculateRate(userId: string): number {
    const user = this.users.find(u => u.id === userId);
    if (!user) return 0.3;
    // 管理者による個別設定が最優先
    if (user.manualRateOverride !== undefined) return user.manualRateOverride;
    
    if (user.status === UserStatus.CUSTOMER) return 0;
    const count = this.getApprovedCount(userId);
    if (count >= 11) return 0.50;
    if (count >= 2) return 0.40;
    return 0.30;
  }

  getApprovedCount(userId: string): number {
    return this.cases.filter(c => c.referrerId === userId && c.status === CaseStatus.APPROVED).length;
  }

  getCases(user: User): Case[] { return this.cases.filter(c => c.referrerId === user.id); }
  getAllCases(): Case[] { return [...this.cases]; }

  getCaseById(id: string): Case | undefined { return this.cases.find(c => c.id === id); }

  createCase(newCaseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'documents' | 'reviews' | 'baseAmount' | 'appliedRate' | 'isManualAdjustment'>, actor: User) {
    let targetUser = this.getUserByEmail(newCaseData.email);
    const actorUser = this.getUserById(actor.id);
    
    if (!targetUser) {
      targetUser = {
        id: `U-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        loginId: this.getNextPartnerId(), 
        name: newCaseData.companyName || newCaseData.customerName,
        email: newCaseData.email,
        role: UserRole.AGENCY, 
        status: UserStatus.CUSTOMER,
        agencyApplicationStatus: AgencyApplicationStatus.NONE,
        referrerId: actor.id,
        createdAt: new Date().toISOString()
      };
      this.users.push(targetUser);
    }

    // 代理店に設定されたデフォルト案件価格を使用。設定がなければ198,000円
    const initialBaseAmount = actorUser?.manualBaseAmountOverride || 198000;
    const currentRate = this.calculateRate(actor.id);

    const caseObj: Case = {
      ...newCaseData,
      id: `C-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      referrerId: actor.id, 
      baseAmount: initialBaseAmount,
      appliedRate: currentRate,
      isManualAdjustment: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: [
        { id: 't1', title: '本人確認書類の提出', status: TaskStatus.TODO },
        { id: 't2', title: '口座情報の登録', status: TaskStatus.TODO },
      ],
      documents: [],
      reviews: [],
      rakutenInfo: {},
      mallProgress: {
        rakuten: MallOpeningStatus.APPLYING,
        yahoo: MallOpeningStatus.APPLYING,
        aupay: MallOpeningStatus.APPLYING
      },
      subline: { status: 'none' },
      emailJp: { status: 'none' }
    };
    this.cases.unshift(caseObj);
    this.logAction(actor, '案件作成', 'case', caseObj.id, { baseAmount: initialBaseAmount, rate: currentRate });
    return caseObj;
  }

  updateCase(id: string, updates: Partial<Case>, actor: User) {
    const index = this.cases.findIndex(c => c.id === id);
    if (index !== -1) {
      // 財務情報の更新は管理者のみ許可
      if ((updates.baseAmount !== undefined || updates.appliedRate !== undefined) && actor.role !== UserRole.ADMIN) {
        delete updates.baseAmount;
        delete updates.appliedRate;
      }
      
      const updatedCase = { ...this.cases[index], ...updates, updatedAt: new Date().toISOString() };
      this.cases[index] = updatedCase;
      this.logAction(actor, '案件更新', 'case', id, updates);
      return this.cases[index];
    }
  }

  private getNextPartnerId(): string {
    const partnerUsers = this.users.filter(u => u.loginId.startsWith('PA'));
    if (partnerUsers.length === 0) return 'PA0001';
    const ids = partnerUsers.map(u => parseInt(u.loginId.replace('PA', ''), 10)).filter(n => !isNaN(n));
    return `PA${String(Math.max(...ids) + 1).padStart(4, '0')}`;
  }

  private logAction(actor: User, action: string, targetType: AuditLog['targetType'], targetId: string, metadata: any) {
    const log: AuditLog = {
      id: `LOG-${Date.now()}`,
      actorUserId: actor.id,
      actorName: actor.name,
      action,
      targetType,
      targetId,
      metadata,
      createdAt: new Date().toISOString()
    };
    this.auditLogs.push(log);
  }

  // 顧客の削除申請フラグを設定する
  requestUserDeletion(userId: string, actor: User): boolean {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].isDeletionPending = true;
      this.logAction(actor, `顧客削除申請: ${this.users[userIndex].name}`, 'user', userId, {});
      return true;
    }
    return false;
  }

  // 顧客の削除申請を却下しフラグを解除する
  cancelUserDeletion(userId: string, actor: User): boolean {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].isDeletionPending = false;
      this.logAction(actor, `顧客削除申請却下: ${this.users[userIndex].name}`, 'user', userId, {});
      return true;
    }
    return false;
  }

  // 顧客を物理削除し、関連案件も消去する
  confirmUserDeletion(userId: string, actor: User): boolean {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      const targetUser = this.users[userIndex];
      this.users.splice(userIndex, 1);
      this.cases = this.cases.filter(c => c.email !== targetUser.email);
      this.logAction(actor, `顧客削除完了: ${targetUser.name}`, 'user', userId, {});
      return true;
    }
    return false;
  }

  // 代理店昇格の申請を行う
  applyForAgency(customerUserId: string, actor: User): boolean {
    const userIndex = this.users.findIndex(u => u.id === customerUserId);
    if (userIndex !== -1) {
      this.users[userIndex].agencyApplicationStatus = AgencyApplicationStatus.PENDING;
      this.logAction(actor, `代理店昇格申請: ${this.users[userIndex].name}`, 'user', customerUserId, {});
      return true;
    }
    return false;
  }

  // 代理店昇格を承認する
  approveAgency(customerUserId: string, actor: User): boolean {
    const userIndex = this.users.findIndex(u => u.id === customerUserId);
    if (userIndex !== -1) {
      this.users[userIndex].agencyApplicationStatus = AgencyApplicationStatus.APPROVED;
      this.logAction(actor, `代理店昇格承認: ${this.users[userIndex].name}`, 'user', customerUserId, {});
      return true;
    }
    return false;
  }

  // 登録用ID（PAXXXX）の有効性を検証する
  verifyRegistrationId(loginId: string): User | null {
    const user = this.users.find(u => 
      u.loginId === loginId && 
      u.status === UserStatus.CUSTOMER && 
      u.agencyApplicationStatus === AgencyApplicationStatus.APPROVED
    );
    return user || null;
  }

  // パスワード設定と代理店としての登録を完了する
  completeRegistration(userId: string, password: string): boolean {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].password = password;
      this.users[userIndex].status = UserStatus.AGENCY;
      this.logAction(this.users[userIndex], '本登録完了', 'user', userId, {});
      return true;
    }
    return false;
  }

  // 指定ユーザーの全階層下位組織の案件を取得する
  getTeamCases(user: User): Case[] {
    const downlineIds = this.getDownlineUserIds(user.id);
    return this.cases.filter(c => downlineIds.includes(c.referrerId || ''));
  }

  // 下位組織に属する全ユーザーIDを再帰的に取得する
  getDownlineUserIds(userId: string): string[] {
    const directDownline = this.users.filter(u => u.referrerId === userId).map(u => u.id);
    let allDownline = [...directDownline];
    for (const id of directDownline) {
      allDownline = [...allDownline, ...this.getDownlineUserIds(id)];
    }
    return Array.from(new Set(allDownline));
  }
}

export const db = new DBService();
