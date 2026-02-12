
import { User, UserRole, UserStatus, Case, CaseStatus, PlatformType, MallOpeningStatus, TaskStatus, AuditLog, AgencyApplicationStatus } from '../types';

/**
 * ユーザー階層 (ティアツリー)
 * システム管理者 (u1)
 * ├── デモ代理店 (u6)
 * │   ├── 田中代理店 (u2)
 * │   │   └── 小林フード (u9)
 * │   ├── 伊藤代理店 (u5)
 * │   │   └── 佐藤商事 (u12)
 * │   └── 鈴木サービス (u10)
 * ├── 高橋商店 (u7)
 * └── 渡辺製作所 (u11)
 */

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
  
  // システム管理者の直紹介 (My Cases)
  { id: 'u6', loginId: 'PA0001', name: 'デモ代理店', email: 'demo@example.com', role: UserRole.AGENCY, status: UserStatus.AGENCY, referrerId: 'u1', password: 'demo', createdAt: '2023-02-01T00:00:00Z' },
  { id: 'u7', loginId: 'PA0005', name: '高橋 商店', email: 'takahashi@example.com', role: UserRole.AGENCY, status: UserStatus.CUSTOMER, agencyApplicationStatus: AgencyApplicationStatus.NONE, referrerId: 'u1', createdAt: '2024-01-10T00:00:00Z' },
  { id: 'u11', loginId: 'PA0008', name: '渡辺 製作所', email: 'watanabe@example.com', role: UserRole.AGENCY, status: UserStatus.CUSTOMER, agencyApplicationStatus: AgencyApplicationStatus.NONE, referrerId: 'u1', createdAt: '2024-05-15T00:00:00Z' },

  // デモ代理店の直紹介 (Admin's Team Cases)
  { id: 'u2', loginId: 'PA0002', name: '田中 代理店', email: 'tanaka@example.com', role: UserRole.AGENCY, status: UserStatus.AGENCY, referrerId: 'u6', password: 'demo', createdAt: '2023-03-01T00:00:00Z' },
  { id: 'u5', loginId: 'PA0003', name: '伊藤 代理店', email: 'ito@example.com', role: UserRole.AGENCY, status: UserStatus.AGENCY, referrerId: 'u6', password: 'demo', createdAt: '2023-05-01T00:00:00Z' },
  { id: 'u10', loginId: 'PA0007', name: '鈴木 サービス', email: 'suzuki@example.com', role: UserRole.AGENCY, status: UserStatus.CUSTOMER, agencyApplicationStatus: AgencyApplicationStatus.APPROVED, referrerId: 'u6', createdAt: '2024-04-01T00:00:00Z' },

  // 田中代理店の直紹介 (Admin's Team Cases)
  { id: 'u9', loginId: 'PA0006', name: '小林 フード', email: 'kobayashi@example.com', role: UserRole.AGENCY, status: UserStatus.CUSTOMER, agencyApplicationStatus: AgencyApplicationStatus.PENDING, referrerId: 'u2', createdAt: '2024-03-01T00:00:00Z' },

  // 伊藤代理店の直紹介 (Admin's Team Cases)
  { id: 'u12', loginId: 'PA0010', name: '佐藤 商事', email: 'sato@example.com', role: UserRole.AGENCY, status: UserStatus.CUSTOMER, agencyApplicationStatus: AgencyApplicationStatus.NONE, referrerId: 'u5', createdAt: '2024-06-01T00:00:00Z' }
];

export const mockCases: Case[] = [
  // --- システム管理者の直紹介 (自分の案件タブ) ---
  {
    id: 'CASE-ADMIN-DEMO',
    agencyId: 'admin_ag',
    agencyName: 'システム管理者',
    referrerId: 'u1',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'sole_proprietor',
    companyName: 'デモ代理店',
    companyNameKana: 'でもだいりてん',
    representativeName: 'デモ 太郎',
    representativeNameKana: 'でも たろう',
    repName: 'デモ 太郎',
    repNameKana: 'でも たろう',
    customerName: 'デモ代理店',
    phone: '090-1234-5678',
    email: 'demo@example.com',
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
    id: 'CASE-ADMIN-WATANABE',
    agencyId: 'admin_ag',
    agencyName: 'システム管理者',
    referrerId: 'u1',
    status: CaseStatus.DRAFT,
    platform: PlatformType.AU_PAY,
    customerType: 'corporation',
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
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: {},
    mallProgress: { rakuten: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
    subline: { status: 'none' },
    emailJp: { status: 'none' }
  },

  // --- デモ代理店の紹介 (チームの案件) ---
  {
    id: 'CASE-DEMO-TANAKA',
    agencyId: 'ag_demo',
    agencyName: 'デモ代理店',
    referrerId: 'u6',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'sole_proprietor',
    companyName: '田中 代理店',
    // Fix: Added missing required properties
    companyNameKana: 'たなか だいりてん',
    representativeName: '田中 太郎',
    representativeNameKana: 'たなか たろう',
    repNameKana: 'たなか たろう',
    customerName: '田中 代理店',
    email: 'tanaka@example.com',
    repName: '田中 太郎',
    phone: '080-1111-2222',
    baseAmount: 198000,
    appliedRate: 0.4,
    isManualAdjustment: false,
    createdAt: '2023-03-01T10:00:00Z',
    updatedAt: '2023-03-10T10:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: {},
    mallProgress: { rakuten: MallOpeningStatus.OPENED, yahoo: MallOpeningStatus.OPENED, aupay: MallOpeningStatus.OPENED },
    subline: { status: 'active' },
    emailJp: { status: 'active' }
  },
  {
    id: 'CASE-DEMO-ITO',
    agencyId: 'ag_demo',
    agencyName: 'デモ代理店',
    referrerId: 'u6',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'sole_proprietor',
    companyName: '伊藤 代理店',
    // Fix: Added missing required properties
    companyNameKana: 'いとう だいりてん',
    representativeName: '伊藤 次郎',
    representativeNameKana: 'いとう じろう',
    repNameKana: 'いとう じろう',
    customerName: '伊藤 代理店',
    email: 'ito@example.com',
    repName: '伊藤 次郎',
    phone: '080-3333-4444',
    baseAmount: 198000,
    appliedRate: 0.4,
    isManualAdjustment: false,
    createdAt: '2023-05-01T10:00:00Z',
    updatedAt: '2023-05-10T10:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: {},
    mallProgress: { rakuten: MallOpeningStatus.OPENED, yahoo: MallOpeningStatus.OPENED, aupay: MallOpeningStatus.OPENED },
    subline: { status: 'active' },
    emailJp: { status: 'active' }
  },
  {
    id: 'CASE-DEMO-SUZUKI',
    agencyId: 'ag_demo',
    agencyName: 'デモ代理店',
    referrerId: 'u6',
    status: CaseStatus.SUBMITTED,
    platform: PlatformType.YAHOO,
    customerType: 'corporation',
    companyName: '鈴木 サービス',
    // Fix: Added missing required properties
    companyNameKana: 'すずき さーびす',
    representativeName: '鈴木 三郎',
    representativeNameKana: 'すずき さぶろう',
    repNameKana: 'すずき さぶろう',
    customerName: '鈴木 サービス',
    email: 'suzuki@example.com',
    repName: '鈴木 三郎',
    phone: '03-5555-6666',
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

  // --- 田中代理店の紹介 (チームの案件) ---
  {
    id: 'CASE-TANAKA-KOBAYASHI',
    agencyId: 'ag1',
    agencyName: '田中 代理店',
    referrerId: 'u2',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'sole_proprietor',
    companyName: '小林 フード',
    // Fix: Added missing required properties
    companyNameKana: 'こばやし ふーど',
    representativeName: '小林 四郎',
    representativeNameKana: 'こばやし しろう',
    repNameKana: 'こばやし しろう',
    customerName: '小林 フード',
    email: 'kobayashi@example.com',
    repName: '小林 四郎',
    phone: '080-9999-8888',
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

  // --- 伊藤代理店の紹介 (チームの案件) ---
  {
    id: 'CASE-ITO-SATO',
    agencyId: 'ag3',
    agencyName: '伊藤 代理店',
    referrerId: 'u5',
    status: CaseStatus.REVIEWING,
    platform: PlatformType.RAKUTEN,
    customerType: 'corporation',
    companyName: '佐藤 商事',
    // Fix: Added missing required properties
    companyNameKana: 'さとう しょうじ',
    representativeName: '佐藤 五郎',
    representativeNameKana: 'さとう ごろう',
    repNameKana: 'さとう ごろう',
    customerName: '佐藤 商事',
    email: 'sato@example.com',
    repName: '佐藤 五郎',
    phone: '070-1234-5678',
    baseAmount: 198000,
    appliedRate: 0.3,
    isManualAdjustment: false,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-02T10:00:00Z',
    tasks: [],
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
