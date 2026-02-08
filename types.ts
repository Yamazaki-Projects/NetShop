
export enum UserRole {
  ADMIN = 'admin',
  AGENCY = 'agency',
}

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
  APPLYING = '申請中',
  OVERSEAS_PREP = '海外メーカー準備中',
  OPENED = 'オープン済',
  SUSPENDED = '休止中',
}

export interface User {
  id: string;
  loginId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  name: string;
  agencyId?: string;
  referrerId?: string;
  password?: string;
  agencyApplicationStatus?: AgencyApplicationStatus;
  isDeletionPending?: boolean;
  manualRateOverride?: number; 
  manualBaseAmountOverride?: number;
  createdAt: string;
}

export interface Case {
  id: string;
  agencyId: string;
  agencyName: string;
  referrerId?: string;
  status: CaseStatus;
  platform: PlatformType;
  customerType: 'corporation' | 'sole_proprietor';
  
  // 法人情報
  companyName: string; // 法人名/屋号
  companyNameKana: string; // 法人名/屋号ふりがな
  representativeName: string; // 代表者名
  representativeNameKana: string; // 代表者名ふりがな
  corporateNumber?: string; // 法人番号
  establishedDate?: string; // 設立年月日 (YYYY-MM-DD)
  zipCode?: string; // 法人郵便番号
  address?: string; // 法人住所
  
  // 代表者情報 (個人)
  repName: string; // 名前
  repNameKana: string; // 名前ふりがな
  repBirthDate?: string; // 生年月日 (YYYY-MM-DD)
  repZipCode?: string; // 代表者郵便番号
  repAddress?: string; // 代表者住所
  phone: string; // 携帯電話番号 (ハイフンなし)
  
  // レガシー互換・表示用
  customerName: string; // 一覧表示用の名称 (基本的には repName)
  email: string;
  notes?: string;
  
  baseAmount: number;
  appliedRate: number; 
  isManualAdjustment: boolean;
  manualAgencyAmount?: number; // マニュアル調整時の代理店報酬額
  
  createdAt: string;
  updatedAt: string;
  tasks: CaseTask[];
  documents: CaseDocument[];
  reviews: CaseReview[];
  subline: SublineInfo;
  emailJp: EmailJpInfo;
  rakutenInfo: RakutenInfo;
  mallProgress: MallProgress;
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
  number050?: string;
  loginId?: string;
  password?: string;
  status: 'active' | 'pending' | 'none';
}

export interface EmailJpInfo {
  email?: string;
  password?: string;
  status: 'active' | 'pending' | 'none';
}

export interface RakutenInfo {
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
  yahoo: MallOpeningStatus;
  aupay: MallOpeningStatus;
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
