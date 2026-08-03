
import { User, UserRole, UserStatus, Case, CaseStatus, PlatformType, MallOpeningStatus, TaskStatus, AuditLog, AgencyApplicationStatus, InitialCommission } from '../types';

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
  { id: 'u6', loginId: 'PA0001', name: 'デモ代理店', email: 'demo@example.com', role: UserRole.AGENCY, status: UserStatus.AGENCY, referrerId: 'u1', password: 'demo', membershipPlan: '198k' as const, createdAt: '2023-02-01T00:00:00Z' },
  { id: 'u7', loginId: 'PA0005', name: '高橋 商店', email: 'takahashi@example.com', role: UserRole.AGENCY, status: UserStatus.CUSTOMER, agencyApplicationStatus: AgencyApplicationStatus.NONE, referrerId: 'u1', membershipPlan: 'free' as const, createdAt: '2024-01-10T00:00:00Z' },
  { id: 'u11', loginId: 'PA0008', name: '渡辺 製作所', email: 'watanabe@example.com', role: UserRole.AGENCY, status: UserStatus.CUSTOMER, agencyApplicationStatus: AgencyApplicationStatus.NONE, referrerId: 'u1', membershipPlan: 'free' as const, createdAt: '2024-05-15T00:00:00Z' },

  // デモ代理店の直紹介 (Admin's Team Cases)
  { id: 'u2', loginId: 'PA0002', name: '田中 代理店', email: 'tanaka@example.com', role: UserRole.AGENCY, status: UserStatus.AGENCY, referrerId: 'u6', password: 'demo', membershipPlan: '198k' as const, createdAt: '2023-03-01T00:00:00Z' },
  { id: 'u5', loginId: 'PA0003', name: '伊藤 代理店', email: 'ito@example.com', role: UserRole.AGENCY, status: UserStatus.AGENCY, referrerId: 'u6', password: 'demo', membershipPlan: '198k' as const, createdAt: '2023-05-01T00:00:00Z' },
  { id: 'u10', loginId: 'PA0007', name: '鈴木 サービス', email: 'suzuki@example.com', role: UserRole.AGENCY, status: UserStatus.CUSTOMER, agencyApplicationStatus: AgencyApplicationStatus.APPROVED, referrerId: 'u6', membershipPlan: '30k' as const, createdAt: '2024-04-01T00:00:00Z' },

  // 田中代理店の直紹介 (Admin's Team Cases)
  { id: 'u9', loginId: 'PA0006', name: '小林 フード', email: 'kobayashi@example.com', role: UserRole.AGENCY, status: UserStatus.CUSTOMER, agencyApplicationStatus: AgencyApplicationStatus.PENDING, referrerId: 'u2', membershipPlan: '30k' as const, createdAt: '2024-03-01T00:00:00Z' },

  // 伊藤代理店の直紹介 (Admin's Team Cases)
  { id: 'u12', loginId: 'PA0010', name: '佐藤 商事', email: 'sato@example.com', role: UserRole.AGENCY, status: UserStatus.CUSTOMER, agencyApplicationStatus: AgencyApplicationStatus.NONE, referrerId: 'u5', membershipPlan: 'free' as const, createdAt: '2024-06-01T00:00:00Z' }
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
    repLastName: 'デモ',
    repFirstName: '太郎',
    repLastNameKana: 'でも',
    repFirstNameKana: 'たろう',
    customerName: 'デモ代理店',
    phone: '090-1234-5678',
    email: 'demo@example.com',
    baseAmount: 198000,
    createdAt: '2023-02-01T10:00:00Z',
    updatedAt: '2023-02-10T10:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.OPENED, mercari: MallOpeningStatus.NOT_STARTED, aupay: MallOpeningStatus.NOT_STARTED, yahoo: MallOpeningStatus.OPENED },
    subline: { status: 'active', siteType: 'subline' },
    emailJp: { status: 'active', domainType: 'email_jp' },
    deposit: false,
    depositAmount: 30000,
    progressComments: []
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
    repLastName: '高橋',
    repFirstName: '一郎',
    repLastNameKana: 'たかはし',
    repFirstNameKana: 'いちろう',
    customerName: '高橋 商店',
    phone: '09011112222',
    email: 'takahashi@example.com',
    baseAmount: 198000,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    subline: { status: 'active', siteType: 'subline' },
    emailJp: { status: 'active', domainType: 'email_jp' },
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.OPENED, mercari: MallOpeningStatus.NOT_STARTED, aupay: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING },
    deposit: false,
    depositAmount: 30000,
    progressComments: []
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
    repLastName: '渡辺',
    repFirstName: '四郎',
    repLastNameKana: 'わたなべ',
    repFirstNameKana: 'しろう',
    customerName: '渡辺 製作所',
    phone: '050-1111-2222',
    email: 'watanabe@example.com',
    baseAmount: 198000,
    createdAt: '2024-05-15T10:00:00Z',
    updatedAt: '2024-05-15T10:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.APPLYING, mercari: MallOpeningStatus.NOT_STARTED, aupay: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING },
    subline: { status: 'none', siteType: 'subline' },
    emailJp: { status: 'none', domainType: 'email_jp' },
    deposit: false,
    depositAmount: 30000,
    progressComments: []
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
    companyNameKana: 'たなか だいりてん',
    repLastName: '田中',
    repFirstName: '太郎',
    repLastNameKana: 'たなか',
    repFirstNameKana: 'たろう',
    customerName: '田中 代理店',
    email: 'tanaka@example.com',
    phone: '080-1111-2222',
    baseAmount: 198000,
    createdAt: '2023-03-01T10:00:00Z',
    updatedAt: '2023-03-10T10:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.OPENED, mercari: MallOpeningStatus.NOT_STARTED, aupay: MallOpeningStatus.NOT_STARTED, yahoo: MallOpeningStatus.OPENED },
    subline: { status: 'active', siteType: 'subline' },
    emailJp: { status: 'active', domainType: 'email_jp' },
    deposit: false,
    depositAmount: 30000,
    progressComments: []
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
    companyNameKana: 'いとう だいりてん',
    repLastName: '伊藤',
    repFirstName: '次郎',
    repLastNameKana: 'いとう',
    repFirstNameKana: 'じろう',
    customerName: '伊藤 代理店',
    email: 'ito@example.com',
    phone: '080-3333-4444',
    baseAmount: 198000,
    createdAt: '2023-05-01T10:00:00Z',
    updatedAt: '2023-05-10T10:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.OPENED, mercari: MallOpeningStatus.NOT_STARTED, aupay: MallOpeningStatus.NOT_STARTED, yahoo: MallOpeningStatus.OPENED },
    subline: { status: 'active', siteType: 'subline' },
    emailJp: { status: 'active', domainType: 'email_jp' },
    deposit: false,
    depositAmount: 30000,
    progressComments: []
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
    companyNameKana: 'すずき さーびす',
    repLastName: '鈴木',
    repFirstName: '三郎',
    repLastNameKana: 'すずき',
    repFirstNameKana: 'さぶろう',
    customerName: '鈴木 サービス',
    email: 'suzuki@example.com',
    phone: '03-5555-6666',
    baseAmount: 198000,
    createdAt: '2024-04-01T11:00:00Z',
    updatedAt: '2024-04-05T11:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.APPLYING, mercari: MallOpeningStatus.NOT_STARTED, aupay: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING },
    subline: { status: 'pending', siteType: 'subline' },
    emailJp: { status: 'pending', domainType: 'email_jp' },
    deposit: false,
    depositAmount: 30000,
    progressComments: []
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
    companyNameKana: 'こばやし ふーど',
    repLastName: '小林',
    repFirstName: '四郎',
    repLastNameKana: 'こばやし',
    repFirstNameKana: 'しろう',
    customerName: '小林 フード',
    email: 'kobayashi@example.com',
    phone: '080-9999-8888',
    baseAmount: 198000,
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-05T10:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.OPENED, mercari: MallOpeningStatus.NOT_STARTED, aupay: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING },
    subline: { status: 'active', siteType: 'subline' },
    emailJp: { status: 'active', domainType: 'email_jp' },
    deposit: false,
    depositAmount: 30000,
    progressComments: []
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
    companyNameKana: 'さとう しょうじ',
    repLastName: '佐藤',
    repFirstName: '五郎',
    repLastNameKana: 'さとう',
    repFirstNameKana: 'ごろう',
    customerName: '佐藤 商事',
    email: 'sato@example.com',
    phone: '070-1234-5678',
    baseAmount: 198000,
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-02T10:00:00Z',
    tasks: [],
    documents: [],
    reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.APPLYING, mercari: MallOpeningStatus.NOT_STARTED, aupay: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING },
    subline: { status: 'none', siteType: 'subline' },
    emailJp: { status: 'none', domainType: 'email_jp' },
    deposit: false,
    depositAmount: 30000,
    progressComments: []
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

// 初期報酬 (20%ショット): 案件登録時に自動生成、金額は手動変更可能
export const mockInitialCommissions: InitialCommission[] = [
  {
    id: 'ic1',
    caseId: 'CASE-DEMO-TANAKA',
    caseCompanyName: '田中 代理店',
    recipientUserId: 'u6',
    recipientName: 'デモ代理店',
    amount: 39600,
    status: 'paid',
    paidAt: '2023-04-30T00:00:00Z',
    createdAt: '2023-03-01T10:00:00Z'
  },
  {
    id: 'ic2',
    caseId: 'CASE-DEMO-ITO',
    caseCompanyName: '伊藤 代理店',
    recipientUserId: 'u6',
    recipientName: 'デモ代理店',
    amount: 39600,
    status: 'paid',
    paidAt: '2023-06-30T00:00:00Z',
    createdAt: '2023-05-01T10:00:00Z'
  },
  {
    id: 'ic3',
    caseId: 'CASE-DEMO-SUZUKI',
    caseCompanyName: '鈴木 サービス',
    recipientUserId: 'u6',
    recipientName: 'デモ代理店',
    amount: 39600,
    status: 'pending',
    createdAt: '2024-04-01T11:00:00Z'
  },
  {
    id: 'ic4',
    caseId: 'CASE-TANAKA-KOBAYASHI',
    caseCompanyName: '小林 フード',
    recipientUserId: 'u2',
    recipientName: '田中 代理店',
    amount: 39600,
    status: 'pending',
    createdAt: '2024-03-01T10:00:00Z'
  },
  {
    id: 'ic5',
    caseId: 'CASE-ITO-SATO',
    caseCompanyName: '佐藤 商事',
    recipientUserId: 'u5',
    recipientName: '伊藤 代理店',
    amount: 39600,
    status: 'pending',
    createdAt: '2024-06-01T10:00:00Z'
  },
  {
    id: 'ic6',
    caseId: 'CASE-ADMIN-DEMO',
    caseCompanyName: 'デモ代理店',
    recipientUserId: 'u1',
    recipientName: 'システム管理者',
    amount: 39600,
    status: 'paid',
    paidAt: '2023-03-01T00:00:00Z',
    createdAt: '2023-02-01T10:00:00Z'
  },
  {
    id: 'ic7',
    caseId: 'CASE-ADMIN-TAKAHASHI',
    caseCompanyName: '高橋 商店',
    recipientUserId: 'u1',
    recipientName: 'システム管理者',
    amount: 39600,
    status: 'paid',
    paidAt: '2024-02-01T00:00:00Z',
    createdAt: '2024-01-10T10:00:00Z'
  },
  {
    id: 'ic8',
    caseId: 'CASE-ADMIN-WATANABE',
    caseCompanyName: '渡辺 製作所',
    recipientUserId: 'u1',
    recipientName: 'システム管理者',
    amount: 39600,
    status: 'pending',
    createdAt: '2024-05-15T10:00:00Z'
  }
];
