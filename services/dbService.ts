
import { 
  User, Agency, Case, AgencyReferral, CaseStatus, AuditLog, UserRole, CaseDocument, TaskStatus, MallOpeningStatus
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
    return this.users.find(u => u.email === email);
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
        { id: 't1', title: '本人確認書類の提出', status: TaskStatus.TODO },
        { id: 't2', title: '口座情報の登録', status: TaskStatus.TODO },
        { id: 't3', title: 'ショップ開設審査', status: TaskStatus.TODO },
      ],
      documents: [],
      reviews: [],
      rakutenInfo: {},
      mallProgress: {
        rakuten: MallOpeningStatus.NOT_STARTED,
        yahoo: MallOpeningStatus.NOT_STARTED,
        aupay: MallOpeningStatus.NOT_STARTED
      }
    };
    this.cases.unshift(caseObj);
    this.logAction(actor, '案件作成', 'case', caseObj.id, { status: caseObj.status });
    return caseObj;
  }

  updateCase(id: string, updates: Partial<Case>, actor: User) {
    const index = this.cases.findIndex(c => c.id === id);
    if (index !== -1) {
      this.cases[index] = { ...this.cases[index], ...updates, updatedAt: new Date().toISOString() };
      this.logAction(actor, '案件情報更新', 'case', id, updates);
      return this.cases[index];
    }
  }

  updateTaskStatus(caseId: string, taskId: string, status: TaskStatus, actor: User) {
    const targetCase = this.cases.find(c => c.id === caseId);
    if (targetCase) {
      const task = targetCase.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = status;
        targetCase.updatedAt = new Date().toISOString();
        this.logAction(actor, `タスク更新: ${task.title}`, 'case', caseId, { status });
        return targetCase;
      }
    }
  }

  addDocument(caseId: string, doc: Omit<CaseDocument, 'id' | 'createdAt'>, actor: User) {
    const targetCase = this.cases.find(c => c.id === caseId);
    if (targetCase) {
      const newDoc = { ...doc, id: `D-${Date.now()}`, createdAt: new Date().toISOString() };
      targetCase.documents.push(newDoc);
      targetCase.updatedAt = new Date().toISOString();
      this.logAction(actor, '書類追加', 'case', caseId, { docType: doc.docType });
      return targetCase;
    }
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

  getAuditLogs() { return [...this.auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
  getAgencies() { return this.agencies; }
}

export const db = new DBService();
