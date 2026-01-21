
import { 
  User, Agency, Case, AgencyReferral, CaseStatus, AuditLog, UserRole, CaseDocument 
} from '../types';
import { mockUsers, mockAgencies, mockCases, mockReferrals, mockAuditLogs } from './mockData';

export interface InviteInfo {
  code: string;
  type: UserRole;
  expiresAt: string;
  createdBy: string;
}

export const getVisibleAgencyIds = (agencyId: string, referrals: AgencyReferral[]): string[] => {
  const visibleIds = [agencyId];
  const children = referrals.filter(r => r.parentAgencyId === agencyId).map(r => r.childAgencyId);
  visibleIds.push(...children);
  children.forEach(childId => {
    const grandchildren = referrals.filter(r => r.parentAgencyId === childId).map(r => r.childAgencyId);
    visibleIds.push(...grandchildren);
  });
  return Array.from(new Set(visibleIds));
};

class DBService {
  private users: User[] = [...mockUsers];
  private agencies: Agency[] = [...mockAgencies];
  private cases: Case[] = [...mockCases];
  private referrals: AgencyReferral[] = [...mockReferrals];
  private auditLogs: AuditLog[] = [...mockAuditLogs];
  private invites: InviteInfo[] = [];

  login(email: string, pass: string): User | undefined {
    // 規定のシステム管理者
    if (email === 'api18958@gmail.com' && pass === 'aaaa1111') {
      return this.users.find(u => u.email === email);
    }
    // その他のモックユーザー用（簡易パスワードチェックなしログイン）
    return this.users.find(u => u.email === email);
  }

  getCurrentUser(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  getCases(user: User): Case[] {
    if (user.role === UserRole.ADMIN) return this.cases;
    if (user.agencyId) {
      const visibleIds = getVisibleAgencyIds(user.agencyId, this.referrals);
      return this.cases.filter(c => visibleIds.includes(c.agencyId));
    }
    return [];
  }

  getCaseById(id: string): Case | undefined {
    return this.cases.find(c => c.id === id);
  }

  createCase(newCase: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'tasks' | 'documents' | 'reviews'>, actor: User) {
    const caseObj: Case = {
      ...newCase,
      id: `C-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: [
        { id: 't1', title: '本人確認書類の提出', status: 'todo' as any },
        { id: 't2', title: '口座情報の登録', status: 'todo' as any },
      ],
      documents: [],
      reviews: []
    };
    this.cases.unshift(caseObj);
    this.logAction(actor, '案件作成', 'case', caseObj.id, { status: caseObj.status });
    return caseObj;
  }

  updateCase(id: string, updates: Partial<Case>, actor: User) {
    const index = this.cases.findIndex(c => c.id === id);
    if (index !== -1) {
      this.cases[index] = { ...this.cases[index], ...updates, updatedAt: new Date().toISOString() };
      this.logAction(actor, '案件更新', 'case', id, updates);
      return this.cases[index];
    }
  }

  addDocument(caseId: string, doc: Omit<CaseDocument, 'id' | 'createdAt'>, actor: User) {
    const targetCase = this.cases.find(c => c.id === caseId);
    if (targetCase) {
      const newDoc = { ...doc, id: `D-${Date.now()}`, createdAt: new Date().toISOString() };
      targetCase.documents.push(newDoc);
      this.logAction(actor, '書類アップロード', 'case', caseId, { docType: doc.docType });
      return targetCase;
    }
  }

  reviewCase(caseId: string, action: CaseStatus, reasonTemplate: string, reasonNote: string, actor: User) {
    const targetCase = this.cases.find(c => c.id === caseId);
    if (!targetCase) return;
    const review = { id: `r${Date.now()}`, action, reasonTemplate, reasonNote, createdByAdminName: actor.name, createdAt: new Date().toISOString() };
    targetCase.status = action;
    targetCase.reviews.unshift(review);
    this.logAction(actor, `審査完了: ${action}`, 'case', caseId, { action });
    return targetCase;
  }

  getAgencies() { return this.agencies; }

  updateAgencyStatus(agencyId: string, status: 'active' | 'suspended', actor: User) {
    const agency = this.agencies.find(a => a.id === agencyId);
    if (agency) {
      agency.status = status;
      this.logAction(actor, '代理店ステータス変更', 'agency', agencyId, { status });
    }
  }

  updateReferral(childId: string, parentId: string, actor: User) {
    const existingIndex = this.referrals.findIndex(r => r.childAgencyId === childId);
    if (existingIndex !== -1) {
      this.referrals[existingIndex].parentAgencyId = parentId;
    } else {
      this.referrals.push({ childAgencyId: childId, parentAgencyId: parentId, createdAt: new Date().toISOString() });
    }
    this.logAction(actor, '紹介関係変更', 'referral', childId, { newParent: parentId });
  }

  getAuditLogs() { return [...this.auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }

  // 招待機能
  generateInvite(type: UserRole, actor: User): string {
    const code = Math.random().toString(36).substr(2, 10).toUpperCase();
    const invite: InviteInfo = {
      code,
      type,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdBy: actor.id
    };
    this.invites.push(invite);
    this.logAction(actor, `招待URL発行 (${type})`, 'user', code, { type });
    return code;
  }

  validateInvite(code: string): InviteInfo | undefined {
    const invite = this.invites.find(i => i.code === code);
    if (invite && new Date(invite.expiresAt) > new Date()) return invite;
    return undefined;
  }

  registerUser(code: string, name: string, email: string): User | undefined {
    const invite = this.validateInvite(code);
    if (!invite) return undefined;

    const newUser: User = {
      id: `u${this.users.length + 1}`,
      name,
      email,
      role: invite.type
    };

    if (invite.type === UserRole.AGENCY) {
      const newAgency: Agency = {
        id: `ag${this.agencies.length + 1}`,
        name: `${name}代理店`,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      this.agencies.push(newAgency);
      newUser.agencyId = newAgency.id;
      
      // ルール：システム管理者の代理店（ag1）の下に紐付ける
      this.referrals.push({
        parentAgencyId: 'ag1',
        childAgencyId: newAgency.id,
        createdAt: new Date().toISOString()
      });
    }

    this.users.push(newUser);
    // 招待を使用済みに（モックなので削除）
    this.invites = this.invites.filter(i => i.code !== code);
    
    this.logAction(newUser, '新規登録完了', 'user', newUser.id, { role: newUser.role });
    return newUser;
  }

  private logAction(actor: User, action: string, targetType: AuditLog['targetType'], targetId: string, metadata: any) {
    const log: AuditLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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

  getReferralTree() { return this.referrals; }
}

export const db = new DBService();
