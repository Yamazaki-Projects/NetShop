
export enum UserRole {
  ADMIN = 'admin',
  CO_OWNER = 'co_owner',
  EXECUTIVE = 'executive',
  AGENCY = 'agency',
}

export const isAdminRole = (role?: UserRole): boolean =>
  role === UserRole.ADMIN || role === UserRole.CO_OWNER || role === UserRole.EXECUTIVE;

export enum UserStatus {
  CUSTOMER = 'customer',
  AGENCY = 'agency',
}

export enum AgencyApplicationStatus {
  NONE = 'none',
  PENDING = 'pending',
  APPROVED = 'approved',
}

export enum CaseStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  REVIEWING = 'reviewing',
  NEEDS_FIX = 'needs_fix',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
}

export enum PlatformType {
  RAKUTEN = 'Rakuten',
  YAHOO = 'Yahoo! Shopping',
  AU_PAY = 'au PAY Market',
  AMAZON = 'Amazon',
  BASE = 'BASE',
  OTHERS = 'Others',
}

export enum TaskStatus {
  TODO = 'todo',
  DOING = 'doing',
  WAITING = 'waiting',
  DONE = 'done',
}

export enum MallOpeningStatus {
  NOT_STARTED = '未着手',
  APPLYING = '申請中',
  OVERSEAS_PREP = '海外メーカー準備中',
  OPENED = 'オープン済',
  REJECTED = '否決',
}

export type MembershipPlan = 'free' | '30k' | '198k';

export interface User {
  id: string; // 内部管理用 UUID (Primary Key)
  auth_uid?: string; // Supabase Auth の UID
  loginId: string; // 顧客ID (PA0001など)
  email: string;
  role: UserRole;
  status: UserStatus;
  name: string;
  agencyId?: string;
  referrerId?: string;
  password?: string;
  agencyApplicationStatus?: AgencyApplicationStatus;
  isDeletionPending?: boolean;
  membershipPlan?: MembershipPlan;
  registrationCode?: string;
  registrationCodeUsedAt?: string | null;
  createdAt: string;
}

export interface InitialCommission {
  id: string;
  caseId: string;
  caseCompanyName: string;
  recipientUserId: string;
  recipientName: string;
  amount: number;
  status: 'pending' | 'paid';
  paidAt?: string;
  createdAt: string;
}

export interface Case {
  id: string;
  agencyId: string;
  agencyName: string;
  referrerId?: string;
  sortOrder?: number; // ティアツリーでの兄弟ノード表示順（手動並び替え用）
  status: CaseStatus;
  platform: PlatformType;
  customerType: 'corporation' | 'sole_proprietor';
  companyName: string;
  companyNameKana: string;
  companyZipCode?: string;
  companyAddress?: string;
  companyAddressKana?: string;
  corporateNumber?: string;
  establishedDate?: string;
  repLastName?: string;
  repFirstName?: string;
  repLastNameKana?: string;
  repFirstNameKana?: string;
  repBirthDate?: string;
  repZipCode?: string;
  repAddress?: string;
  repAddressKana?: string;
  staffLastName?: string;
  staffFirstName?: string;
  staffLastNameKana?: string;
  staffFirstNameKana?: string;
  staffBirthDate?: string;
  staffZipCode?: string;
  staffAddress?: string;
  staffAddressKana?: string;
  phone: string;
  customerName: string;
  email: string;
  notes?: string;
  baseAmount: number;
  deposit: boolean;
  depositAmount: number;
  createdAt: string;
  updatedAt: string;
  tasks: CaseTask[];
  documents: CaseDocument[];
  reviews: CaseReview[];
  subline: SublineInfo;
  emailJp: EmailJpInfo;
  rakutenInfo: RakutenInfo;
  mercariInfo?: MercariInfo;
  aupayInfo?: AupayInfo;
  mallProgress: MallProgress;
  progressComments: ProgressComment[];
  mercariFreeInput?: string;
  yahooFreeInput?: string;
  aupayFreeInput?: string;
}

export interface ProgressComment {
  id: string;
  text: string;
  createdAt: string;
}

export interface CaseTask {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface CaseDocument {
  id: string;
  docType: string;
  fileName: string;
  note?: string;
  expiresOn?: string;
  createdAt: string;
}

export interface CaseReview {
  id: string;
  action: CaseStatus;
  reasonTemplate?: string;
  reasonNote?: string;
  createdByAdminName: string;
  createdAt: string;
}

export interface SublineInfo {
  phoneType?: '050' | 'landline';
  number050?: string;
  siteType: 'subline' | 'other';
  loginId?: string;
  password?: string;
  otherUrl?: string;
  status: 'active' | 'pending' | 'none';
}

export interface MercariInfo {
  email?: string;
  password?: string;
  phone?: string;
}

export interface AupayInfo {
  email?: string;
  wowManagerId?: string;
  wowManagerPass?: string;
  salonId?: string;
  salonPass?: string;
}

export interface EmailJpInfo {
  email?: string;
  password?: string;
  domainType: 'email_jp' | 'other';
  otherDomain?: string;
  status: 'active' | 'pending' | 'none';
}

export interface RakutenInfo {
  needsShipping: 'necessary' | 'unnecessary';
  applyId?: string;
  applyPass?: string;
  rLoginId?: string;
  rLoginPass?: string;
  personalId?: string;
  personalPass?: string;
  billpayId?: string;
  billpayPass?: string;
}

export interface MallProgress {
  rakuten: MallOpeningStatus;
  mercari: MallOpeningStatus;
  aupay: MallOpeningStatus;
  yahoo: MallOpeningStatus;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorName: string;
  action: string;
  targetType: 'case' | 'agency' | 'user' | 'referral';
  targetId: string;
  metadata: any;
  createdAt: string;
}

// 月次報酬分配（モール側から届く報酬明細をECP・紹介者2段階に分配する仕組み）
export type RewardRecipientType = 'l1' | 'l2' | 'ecp';

export interface RewardBatch {
  id: string;
  month: string; // 'YYYY-MM'
  createdAt: string;
}

export interface RewardRow {
  id: string;
  batchId: string;
  ownerName: string; // モール明細に記載のオーナー(代表者)名
  mallType: string; // '楽天' | 'メルカリ' など、明細の表記そのまま
  shopUrl?: string;
  salesAmount?: number; // 明細の売上らしき数値（参考値）
  rewardAmount: number; // 分配対象の報酬額 R
  matchedCaseId?: string | null; // 自動/手動マッチング済みの案件ID
  createdAt: string;
}

export interface RewardPayout {
  id: string;
  batchId: string;
  rowId: string;
  recipientType: RewardRecipientType;
  recipientUserId?: string | null; // ECPの場合はnull
  recipientName: string;
  amount: number;
  createdAt: string;
}
