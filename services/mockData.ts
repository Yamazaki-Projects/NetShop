
import { User, UserRole, Agency, AgencyReferral, Case, CaseStatus, PlatformType, TaskStatus, AuditLog } from '../types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'システム管理者', email: 'api18958@gmail.com', role: UserRole.ADMIN },
  { id: 'u2', name: 'Agency A (Root)', email: 'a@example.com', role: UserRole.AGENCY, agencyId: 'ag1' },
  { id: 'u3', name: 'Agency B (A child)', email: 'b@example.com', role: UserRole.AGENCY, agencyId: 'ag2' },
  { id: 'u4', name: 'Agency C (B child)', email: 'c@example.com', role: UserRole.AGENCY, agencyId: 'ag3' },
  { id: 'u5', name: 'Agency D (C child)', email: 'd@example.com', role: UserRole.AGENCY, agencyId: 'ag4' },
];

export const mockAgencies: Agency[] = [
  { id: 'ag1', name: 'Agency Root A', status: 'active', createdAt: '2023-01-01T00:00:00Z' },
  { id: 'ag2', name: 'Agency Sub B', status: 'active', createdAt: '2023-02-01T00:00:00Z' },
  { id: 'ag3', name: 'Agency Sub C', status: 'active', createdAt: '2023-03-01T00:00:00Z' },
  { id: 'ag4', name: 'Agency Sub D', status: 'active', createdAt: '2023-04-01T00:00:00Z' },
];

export const mockReferrals: AgencyReferral[] = [
  { parentAgencyId: 'ag1', childAgencyId: 'ag2', createdAt: '2023-02-01T00:00:00Z' },
  { parentAgencyId: 'ag2', childAgencyId: 'ag3', createdAt: '2023-03-01T00:00:00Z' },
  { parentAgencyId: 'ag3', childAgencyId: 'ag4', createdAt: '2023-04-01T00:00:00Z' },
];

export const mockCases: Case[] = [
  {
    id: 'c1',
    agencyId: 'ag1',
    agencyName: 'Agency Root A',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'corporation',
    customerName: '田中 一郎',
    companyName: '株式会社テスト商事',
    phone: '03-1234-5678',
    email: 'tanaka@test.com',
    address: '東京都新宿区1-1-1',
    notes: '初期案件。',
    createdAt: '2023-05-01T10:00:00Z',
    updatedAt: '2023-05-10T15:00:00Z',
    tasks: [{ id: 't1', title: '審査書類送付', status: TaskStatus.DONE }],
    documents: [{ id: 'd1', docType: '本人確認', fileName: 'id.pdf', createdAt: '2023-05-01T10:05:00Z' }],
    reviews: []
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'l1',
    actorUserId: 'u1',
    actorName: 'システム管理者',
    action: 'システム起動',
    targetType: 'user',
    targetId: 'u1',
    metadata: {},
    createdAt: new Date().toISOString()
  }
];
