
import { User, UserRole, UserStatus, Case, CaseStatus, PlatformType, MallOpeningStatus, TaskStatus, AuditLog, AgencyApplicationStatus } from '../types';

export const mockUsers: User[] = [
  { 
    id: 'u1', 
    loginId: 'admin', 
    name: 'システム管理者', 
    email: 'api18958@gmail.com', 
    role: UserRole.ADMIN, 
    status: UserStatus.AGENCY, 
    password: 'aaaa1111',
    createdAt: '2023-01-01T00:00:00Z' 
  },
  
  // PA0001: 最初の代理店
  { id: 'u6', loginId: 'PA0001', name: 'デモ代理店', email: 'a@example.com', role: UserRole.AGENCY, status: UserStatus.AGENCY, agencyId: 'ag_demo', referrerId: 'u1', password: 'demo', createdAt: '2023-02-01T00:00:00Z' },
  
  // 既存の代理店
  { id: 'u2', loginId: 'PA0002', name: '田中 代理店', email: 'tanaka@example.com', role: UserRole.AGENCY, status: UserStatus.AGENCY, agencyId: 'ag1', referrerId: 'u6', password: 'demo', createdAt: '2023-02-01T00:00:00Z' },
  { id: 'u5', loginId: 'PA0003', name: '伊藤 代理店', email: 'ito@example.com', role: UserRole.AGENCY, status: UserStatus.AGENCY, agencyId: 'ag3', referrerId: 'u6', password: 'demo', createdAt: '2023-05-01T00:00:00Z' },
  
  // 【ステータス：顧客】代理店昇格申請 未実施 (NONE)
  { 
    id: 'u7', 
    loginId: 'PA0005', 
    name: '高橋 商店', 
    email: 'takahashi@example.com', 
    role: UserRole.AGENCY, 
    status: UserStatus.CUSTOMER, 
    agencyApplicationStatus: AgencyApplicationStatus.NONE,
    referrerId: 'u1', 
    createdAt: '2024-01-10T00:00:00Z' 
  },
  
  // 【ステータス：顧客】代理店昇格 申請中 (PENDING)
  { 
    id: 'u9', 
    loginId: 'PA0006', 
    name: '小林 フード', 
    email: 'kobayashi@example.com', 
    role: UserRole.AGENCY, 
    status: UserStatus.CUSTOMER, 
    agencyApplicationStatus: AgencyApplicationStatus.PENDING,
    referrerId: 'u2', 
    createdAt: '2024-03-01T00:00:00Z' 
  },

  // 【ステータス：顧客】代理店昇格 承認済み・本登録待ち (APPROVED)
  { 
    id: 'u10', 
    loginId: 'PA0007', 
    name: '鈴木 サービス', 
    email: 'suzuki@example.com', 
    role: UserRole.AGENCY, 
    status: UserStatus.CUSTOMER, 
    agencyApplicationStatus: AgencyApplicationStatus.APPROVED,
    referrerId: 'u6', 
    createdAt: '2024-04-01T00:00:00Z' 
  },

  // 【ステータス：顧客】新規案件 (NONE)
  { 
    id: 'u11', 
    loginId: 'PA0008', 
    name: '渡辺 製作所', 
    email: 'watanabe@example.com', 
    role: UserRole.AGENCY, 
    status: UserStatus.CUSTOMER, 
    agencyApplicationStatus: AgencyApplicationStatus.NONE,
    referrerId: 'u1', 
    createdAt: '2024-05-15T00:00:00Z' 
  },
];

export const mockCases: Case[] = [
  {
    id: 'CASE-ADMIN-DEMO',
    agencyId: 'admin_ag',
    agencyName: 'システム管理者',
    referrerId: 'u1',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'sole_proprietor',
    // Fix: Added missing required properties for Case interface
    companyName: 'デモ代理店',
    companyNameKana: 'でもだいりてん',
    representativeName: 'デモ 太郎',
    representativeNameKana: 'でも たろう',
    repName: 'デモ 太郎',
    repNameKana: 'でも たろう',
    customerName: 'デモ代理店',
    phone: '090-1234-5678',
    email: 'a@example.com',
    baseAmount: 198000,
    appliedRate: 0.5,
    isManualAdjustment: false,
    createdAt: '2023-02-01T10:00:00Z',
    updatedAt: '2023-02-10T10:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: {},
    mallProgress: { rakuten: MallOpeningStatus.OPENED, yahoo: MallOpeningStatus.OPENED, aupay: MallOpeningStatus.OPENED },
    subline: { status: 'active' },
    emailJp: { status: 'active' }
  },
  {
    id: 'CASE-ADMIN-TAKAHASHI',
    agencyId: 'admin_ag',
    agencyName: 'システム管理者',
    referrerId: 'u1',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'corporation',
    // Fix: Added missing required properties for Case interface
    companyName: '高橋 商店',
    companyNameKana: 'たかはししょうてん',
    representativeName: '高橋 一郎',
    representativeNameKana: 'たかはし いちろう',
    repName: '高橋 一郎',
    repNameKana: 'たかはし いちろう',
    customerName: '高橋 商店',
    phone: '09011112222',
    email: 'takahashi@example.com',
    baseAmount: 198000,
    appliedRate: 0.3,
    isManualAdjustment: false,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    subline: { status: 'active' },
    emailJp: { status: 'active' },
    rakutenInfo: {},
    mallProgress: { rakuten: MallOpeningStatus.OPENED, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING }
  },
  {
    id: 'CASE-DEMO-SUZUKI',
    agencyId: 'ag_demo',
    agencyName: 'デモ代理店',
    referrerId: 'u6',
    status: CaseStatus.SUBMITTED,
    platform: PlatformType.YAHOO,
    customerType: 'corporation',
    // Fix: Added missing required properties for Case interface
    companyName: '鈴木 サービス',
    companyNameKana: 'すずきさーびす',
    representativeName: '鈴木 二郎',
    representativeNameKana: 'すずき じろう',
    repName: '鈴木 二郎',
    repNameKana: 'すずき じろう',
    customerName: '鈴木 サービス',
    phone: '03-5555-6666',
    email: 'suzuki@example.com',
    baseAmount: 198000,
    appliedRate: 0.3,
    isManualAdjustment: false,
    createdAt: '2024-04-01T11:00:00Z',
    updatedAt: '2024-04-05T11:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: {},
    mallProgress: { rakuten: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
    subline: { status: 'pending' },
    emailJp: { status: 'pending' }
  },
  {
    id: 'CASE-TANAKA-KOBAYASHI',
    agencyId: 'ag1',
    agencyName: '田中 代理店',
    referrerId: 'u2',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'sole_proprietor',
    // Fix: Added missing required properties for Case interface
    companyName: '小林 フード',
    companyNameKana: 'こばやしふーど',
    representativeName: '小林 三郎',
    representativeNameKana: 'こばやし さぶろう',
    repName: '小林 三郎',
    repNameKana: 'こばやし さぶろう',
    customerName: '小林 フード',
    phone: '080-9999-8888',
    email: 'kobayashi@example.com',
    baseAmount: 198000,
    appliedRate: 0.3,
    isManualAdjustment: false,
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-05T10:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: {},
    mallProgress: { rakuten: MallOpeningStatus.OPENED, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
    subline: { status: 'active' },
    emailJp: { status: 'active' }
  },
  {
    id: 'CASE-ADMIN-WATANABE',
    agencyId: 'admin_ag',
    agencyName: 'システム管理者',
    referrerId: 'u1',
    status: CaseStatus.DRAFT,
    platform: PlatformType.AU_PAY,
    customerType: 'corporation',
    // Fix: Added missing required properties for Case interface
    companyName: '渡辺 製作所',
    companyNameKana: 'わたなべせいさくじょ',
    representativeName: '渡辺 四郎',
    representativeNameKana: 'わたなべ しろう',
    repName: '渡辺 四郎',
    repNameKana: 'わたなべ しろう',
    customerName: '渡辺 製作所',
    phone: '050-1111-2222',
    email: 'watanabe@example.com',
    baseAmount: 198000,
    appliedRate: 0.3,
    isManualAdjustment: false,
    createdAt: '2024-05-15T10:00:00Z',
    updatedAt: '2024-05-15T10:00:00Z',
    tasks: [
      { id: 't1', title: '本人確認書類の提出', status: TaskStatus.TODO },
      { id: 't2', title: '口座情報の登録', status: TaskStatus.TODO },
    ],
    documents: [],
    reviews: [],
    rakutenInfo: {},
    mallProgress: { rakuten: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
    subline: { status: 'none' },
    emailJp: { status: 'none' }
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'log1',
    actorUserId: 'u1',
    actorName: 'システム管理者',
    action: '案件作成: デモ代理店',
    targetType: 'case',
    targetId: 'CASE-ADMIN-DEMO',
    metadata: {},
    createdAt: '2023-02-01T10:00:00Z'
  }
];
