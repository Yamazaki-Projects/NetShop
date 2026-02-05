
import { User, UserRole, Agency, AgencyReferral, Case, CaseStatus, PlatformType, TaskStatus, AuditLog, MallOpeningStatus } from '../types';

export const mockUsers: User[] = [
  { id: 'u1', name: 'システム管理者', email: 'api18958@gmail.com', role: UserRole.ADMIN },
  { id: 'u2', name: 'Agency A (Root)', email: 'a@example.com', role: UserRole.AGENCY, agencyId: 'ag1' },
  { id: 'u3', name: 'Agency B (A child)', email: 'b@example.com', role: UserRole.AGENCY, agencyId: 'ag2' },
  { id: 'u4', name: 'Agency C (B child)', email: 'c@example.com', role: UserRole.AGENCY, agencyId: 'ag3' },
  { id: 'u5', name: 'Agency D (C child)', email: 'd@example.com', role: UserRole.AGENCY, agencyId: 'ag4' },
  { id: 'u6', name: 'テスト代理店ユーザー', email: 'api18959@gmail.com', role: UserRole.AGENCY, agencyId: 'ag5' },
];

export const mockAgencies: Agency[] = [
  { id: 'ag1', name: 'Agency Root A', status: 'active', createdAt: '2023-01-01T00:00:00Z' },
  { id: 'ag2', name: 'Agency Sub B', status: 'active', createdAt: '2023-02-01T00:00:00Z' },
  { id: 'ag3', name: 'Agency Sub C', status: 'active', createdAt: '2023-03-01T00:00:00Z' },
  { id: 'ag4', name: 'Agency Sub D', status: 'active', createdAt: '2023-04-01T00:00:00Z' },
  { id: 'ag5', name: 'テスト代理店株式会社', status: 'active', createdAt: '2024-01-01T00:00:00Z' },
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
    reviews: [],
    subline: {
      number050: '050-1234-5678',
      loginId: 'subline_user_01',
      password: 'password123',
      status: 'active'
    },
    emailJp: {
      email: 'shop-tanaka@e-mail.jp',
      password: 'emailpassword',
      status: 'active'
    },
    rakutenInfo: {
      applyId: 'rakuten_apply_88',
      applyPass: 'apply_pass_99',
      rLoginId: 'r_login_user',
      rLoginPass: 'r_login_pass',
      personalId: 'personal_id_test',
      personalPass: 'personal_pass_test',
      billpayId: 'bill_pay_777',
      billpayPass: 'bill_pay_pass'
    },
    mallProgress: {
      rakuten: MallOpeningStatus.OPEN,
      yahoo: MallOpeningStatus.PREPARING,
      aupay: MallOpeningStatus.APPLYING
    }
  },
  {
    id: 'c2',
    agencyId: 'ag5',
    agencyName: 'テスト代理店株式会社',
    status: CaseStatus.SUBMITTED,
    platform: PlatformType.YAHOO,
    customerType: 'corporation',
    customerName: '佐藤 健二',
    companyName: 'サトウ・エンジニアリング',
    phone: '06-9876-5432',
    email: 'sato@example.jp',
    address: '大阪府大阪市北区2-2-2',
    notes: '新規開拓案件です。',
    createdAt: '2024-02-15T09:00:00Z',
    updatedAt: '2024-02-15T09:00:00Z',
    tasks: [
      { id: 't1', title: '本人確認書類の提出', status: TaskStatus.DONE },
      { id: 't2', title: '口座情報の登録', status: TaskStatus.DOING },
      { id: 't3', title: 'ショップ開設審査', status: TaskStatus.TODO },
    ],
    documents: [],
    reviews: [],
    subline: { status: 'pending' },
    emailJp: { status: 'pending' },
    rakutenInfo: {},
    mallProgress: {
      rakuten: MallOpeningStatus.NOT_STARTED,
      yahoo: MallOpeningStatus.APPLYING,
      aupay: MallOpeningStatus.NOT_STARTED
    }
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
