import { User, UserRole, UserStatus, Case, CaseStatus, PlatformType, MallOpeningStatus, TaskStatus, AuditLog, AgencyApplicationStatus } from '../types';

/**
 * ユーザー階層 (ティアツリー)
 * 株式会社ECパートナーズ
 * ├── EC0001: 山田 太郎（管理者）
 * │   ├── PA0001: デモ代理店
 * │   │   ├── PA0002: 田中 代理店
 * │   │   │   └── PA0006: 小林 フード（申請中）
 * │   │   ├── PA0003: 伊藤 代理店
 * │   │   │   └── PA0010: 佐藤 商事
 * │   │   └── PA0007: 鈴木 サービス（承認済）
 * │   ├── PA0005: 高橋 商店
 * │   └── PA0008: 渡辺 製作所
 * └── EC0002: 鈴木 花子（管理者）
 */

export const mockUsers: User[] = [
  // ─── ECパートナーズ スタッフ ───────────────────────────────
  {
    id: 'u1',
    loginId: 'EC0001',
    name: '山田 太郎',
    email: 'yamada@ec-partners.co.jp',
    role: UserRole.ADMIN,
    status: UserStatus.AGENCY,
    password: 'aaaa1111',
    createdAt: '2023-01-01T00:00:00Z'
  },
  {
    id: 'u13',
    loginId: 'EC0002',
    name: '鈴木 花子',
    email: 'suzukih@ec-partners.co.jp',
    role: UserRole.ADMIN,
    status: UserStatus.AGENCY,
    password: 'aaaa1111',
    createdAt: '2023-01-01T00:00:00Z'
  },

  // ─── 代理店（EC0001の直紹介）────────────────────────────────
  { id: 'u6',  loginId: 'PA0001', name: 'デモ代理店',   email: 'demo@example.com',        role: UserRole.AGENCY, status: UserStatus.AGENCY,    referrerId: 'u1',  password: 'demo', createdAt: '2023-02-01T00:00:00Z' },
  { id: 'u7',  loginId: 'PA0005', name: '高橋 商店',    email: 'takahashi@example.com',   role: UserRole.AGENCY, status: UserStatus.CUSTOMER,  agencyApplicationStatus: AgencyApplicationStatus.NONE,    referrerId: 'u1',  createdAt: '2024-01-10T00:00:00Z' },
  { id: 'u11', loginId: 'PA0008', name: '渡辺 製作所',  email: 'watanabe@example.com',    role: UserRole.AGENCY, status: UserStatus.CUSTOMER,  agencyApplicationStatus: AgencyApplicationStatus.NONE,    referrerId: 'u1',  createdAt: '2024-05-15T00:00:00Z' },

  // ─── 代理店（PA0001の直紹介）────────────────────────────────
  { id: 'u2',  loginId: 'PA0002', name: '田中 代理店',  email: 'tanaka@example.com',      role: UserRole.AGENCY, status: UserStatus.AGENCY,    referrerId: 'u6',  password: 'demo', createdAt: '2023-03-01T00:00:00Z' },
  { id: 'u5',  loginId: 'PA0003', name: '伊藤 代理店',  email: 'ito@example.com',         role: UserRole.AGENCY, status: UserStatus.AGENCY,    referrerId: 'u6',  password: 'demo', createdAt: '2023-05-01T00:00:00Z' },
  { id: 'u10', loginId: 'PA0007', name: '鈴木 サービス',email: 'suzuki@example.com',      role: UserRole.AGENCY, status: UserStatus.CUSTOMER,  agencyApplicationStatus: AgencyApplicationStatus.APPROVED, referrerId: 'u6',  createdAt: '2024-04-01T00:00:00Z' },

  // ─── 顧客（PA0002の直紹介）──────────────────────────────────
  { id: 'u9',  loginId: 'PA0006', name: '小林 フード',  email: 'kobayashi@example.com',   role: UserRole.AGENCY, status: UserStatus.CUSTOMER,  agencyApplicationStatus: AgencyApplicationStatus.PENDING,  referrerId: 'u2',  createdAt: '2024-03-01T00:00:00Z' },

  // ─── 顧客（PA0003の直紹介）──────────────────────────────────
  { id: 'u12', loginId: 'PA0010', name: '佐藤 商事',    email: 'sato@example.com',        role: UserRole.AGENCY, status: UserStatus.CUSTOMER,  agencyApplicationStatus: AgencyApplicationStatus.NONE,     referrerId: 'u5',  createdAt: '2024-06-01T00:00:00Z' },
];

export const mockCases: Case[] = [
  // ─── EC0001（山田）の直紹介 ──────────────────────────────────
  {
    id: 'CASE-ADMIN-DEMO',
    agencyId: 'u1',
    agencyName: '山田 太郎（ECパートナーズ）',
    referrerId: 'u1',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'sole_proprietor',
    companyName: 'デモ代理店',
    companyNameKana: 'でもだいりてん',
    repLastName: 'デモ', repFirstName: '太郎',
    repLastNameKana: 'でも', repFirstNameKana: 'たろう',
    customerName: 'デモ代理店',
    phone: '090-1234-5678',
    email: 'demo@example.com',
    baseAmount: 198000, appliedRate: 0.5, isManualAdjustment: false,
    createdAt: '2023-02-01T10:00:00Z', updatedAt: '2023-02-10T10:00:00Z',
    tasks: [], documents: [], reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.OPENED, yahoo: MallOpeningStatus.OPENED, aupay: MallOpeningStatus.OPENED },
    subline: { status: 'active', siteType: 'subline' },
    emailJp: { status: 'active', domainType: 'email_jp' },
    deposit: false, depositAmount: 30000, progressComments: []
  },
  {
    id: 'CASE-ADMIN-TAKAHASHI',
    agencyId: 'u1',
    agencyName: '山田 太郎（ECパートナーズ）',
    referrerId: 'u1',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'corporation',
    companyName: '高橋 商店',
    companyNameKana: 'たかはししょうてん',
    repLastName: '高橋', repFirstName: '一郎',
    repLastNameKana: 'たかはし', repFirstNameKana: 'いちろう',
    customerName: '高橋 商店',
    phone: '09011112222',
    email: 'takahashi@example.com',
    baseAmount: 198000, appliedRate: 0.3, isManualAdjustment: false,
    createdAt: '2024-01-10T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z',
    tasks: [], documents: [], reviews: [],
    subline: { status: 'active', siteType: 'subline' },
    emailJp: { status: 'active', domainType: 'email_jp' },
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.OPENED, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
    deposit: false, depositAmount: 30000, progressComments: []
  },
  {
    id: 'CASE-ADMIN-WATANABE',
    agencyId: 'u1',
    agencyName: '山田 太郎（ECパートナーズ）',
    referrerId: 'u1',
    status: CaseStatus.DRAFT,
    platform: PlatformType.AU_PAY,
    customerType: 'corporation',
    companyName: '渡辺 製作所',
    companyNameKana: 'わたなべせいさくじょ',
    repLastName: '渡辺', repFirstName: '四郎',
    repLastNameKana: 'わたなべ', repFirstNameKana: 'しろう',
    customerName: '渡辺 製作所',
    phone: '050-1111-2222',
    email: 'watanabe@example.com',
    baseAmount: 198000, appliedRate: 0.3, isManualAdjustment: false,
    createdAt: '2024-05-15T10:00:00Z', updatedAt: '2024-05-15T10:00:00Z',
    tasks: [], documents: [], reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
    subline: { status: 'none', siteType: 'subline' },
    emailJp: { status: 'none', domainType: 'email_jp' },
    deposit: false, depositAmount: 30000, progressComments: []
  },

  // ─── PA0001（デモ代理店）の紹介 ─────────────────────────────
  {
    id: 'CASE-DEMO-TANAKA',
    agencyId: 'u6',
    agencyName: 'デモ代理店',
    referrerId: 'u6',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'sole_proprietor',
    companyName: '田中 代理店',
    companyNameKana: 'たなか だいりてん',
    repLastName: '田中', repFirstName: '太郎',
    repLastNameKana: 'たなか', repFirstNameKana: 'たろう',
    customerName: '田中 代理店',
    email: 'tanaka@example.com', phone: '080-1111-2222',
    baseAmount: 198000, appliedRate: 0.4, isManualAdjustment: false,
    createdAt: '2023-03-01T10:00:00Z', updatedAt: '2023-03-10T10:00:00Z',
    tasks: [], documents: [], reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.OPENED, yahoo: MallOpeningStatus.OPENED, aupay: MallOpeningStatus.OPENED },
    subline: { status: 'active', siteType: 'subline' },
    emailJp: { status: 'active', domainType: 'email_jp' },
    deposit: false, depositAmount: 30000, progressComments: []
  },
  {
    id: 'CASE-DEMO-ITO',
    agencyId: 'u6',
    agencyName: 'デモ代理店',
    referrerId: 'u6',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'sole_proprietor',
    companyName: '伊藤 代理店',
    companyNameKana: 'いとう だいりてん',
    repLastName: '伊藤', repFirstName: '次郎',
    repLastNameKana: 'いとう', repFirstNameKana: 'じろう',
    customerName: '伊藤 代理店',
    email: 'ito@example.com', phone: '080-3333-4444',
    baseAmount: 198000, appliedRate: 0.4, isManualAdjustment: false,
    createdAt: '2023-05-01T10:00:00Z', updatedAt: '2023-05-10T10:00:00Z',
    tasks: [], documents: [], reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.OPENED, yahoo: MallOpeningStatus.OPENED, aupay: MallOpeningStatus.OPENED },
    subline: { status: 'active', siteType: 'subline' },
    emailJp: { status: 'active', domainType: 'email_jp' },
    deposit: false, depositAmount: 30000, progressComments: []
  },
  {
    id: 'CASE-DEMO-SUZUKI',
    agencyId: 'u6',
    agencyName: 'デモ代理店',
    referrerId: 'u6',
    status: CaseStatus.SUBMITTED,
    platform: PlatformType.YAHOO,
    customerType: 'corporation',
    companyName: '鈴木 サービス',
    companyNameKana: 'すずき さーびす',
    repLastName: '鈴木', repFirstName: '三郎',
    repLastNameKana: 'すずき', repFirstNameKana: 'さぶろう',
    customerName: '鈴木 サービス',
    email: 'suzuki@example.com', phone: '03-5555-6666',
    baseAmount: 198000, appliedRate: 0.3, isManualAdjustment: false,
    createdAt: '2024-04-01T11:00:00Z', updatedAt: '2024-04-05T11:00:00Z',
    tasks: [], documents: [], reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
    subline: { status: 'pending', siteType: 'subline' },
    emailJp: { status: 'pending', domainType: 'email_jp' },
    deposit: false, depositAmount: 30000, progressComments: []
  },

  // ─── PA0002（田中代理店）の紹介 ─────────────────────────────
  {
    id: 'CASE-TANAKA-KOBAYASHI',
    agencyId: 'u2',
    agencyName: '田中 代理店',
    referrerId: 'u2',
    status: CaseStatus.APPROVED,
    platform: PlatformType.RAKUTEN,
    customerType: 'sole_proprietor',
    companyName: '小林 フード',
    companyNameKana: 'こばやし ふーど',
    repLastName: '小林', repFirstName: '四郎',
    repLastNameKana: 'こばやし', repFirstNameKana: 'しろう',
    customerName: '小林 フード',
    email: 'kobayashi@example.com', phone: '080-9999-8888',
    baseAmount: 198000, appliedRate: 0.3, isManualAdjustment: false,
    createdAt: '2024-03-01T10:00:00Z', updatedAt: '2024-03-05T10:00:00Z',
    tasks: [], documents: [], reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.OPENED, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
    subline: { status: 'active', siteType: 'subline' },
    emailJp: { status: 'active', domainType: 'email_jp' },
    deposit: false, depositAmount: 30000, progressComments: []
  },

  // ─── PA0003（伊藤代理店）の紹介 ─────────────────────────────
  {
    id: 'CASE-ITO-SATO',
    agencyId: 'u5',
    agencyName: '伊藤 代理店',
    referrerId: 'u5',
    status: CaseStatus.REVIEWING,
    platform: PlatformType.RAKUTEN,
    customerType: 'corporation',
    companyName: '佐藤 商事',
    companyNameKana: 'さとう しょうじ',
    repLastName: '佐藤', repFirstName: '五郎',
    repLastNameKana: 'さとう', repFirstNameKana: 'ごろう',
    customerName: '佐藤 商事',
    email: 'sato@example.com', phone: '070-1234-5678',
    baseAmount: 198000, appliedRate: 0.3, isManualAdjustment: false,
    createdAt: '2024-06-01T10:00:00Z', updatedAt: '2024-06-02T10:00:00Z',
    tasks: [], documents: [], reviews: [],
    rakutenInfo: { needsShipping: 'unnecessary' },
    mallProgress: { rakuten: MallOpeningStatus.APPLYING, yahoo: MallOpeningStatus.APPLYING, aupay: MallOpeningStatus.APPLYING },
    subline: { status: 'none', siteType: 'subline' },
    emailJp: { status: 'none', domainType: 'email_jp' },
    deposit: false, depositAmount: 30000, progressComments: []
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'log1',
    actorUserId: 'u1',
    actorName: '山田 太郎（ECパートナーズ）',
    action: '案件作成: デモ代理店',
    targetType: 'case',
    targetId: 'CASE-ADMIN-DEMO',
    metadata: {},
    createdAt: '2023-02-01T10:00:00Z'
  }
];
