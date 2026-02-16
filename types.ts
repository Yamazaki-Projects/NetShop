
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
  id: string; // 固定のPA番号 (Primary Key)
  auth_uid?: string; // Supabase Auth の UID
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
  registrationCode?: string;
  registrationCodeUsedAt?: string | null;
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
  companyName: string;
  companyNameKana: string;
  representativeName: string;
  representativeNameKana: string;
  corporateNumber?: string;
  establishedDate?: string;
  zipCode?: string;
  address?: string;
  repName: string;
  repNameKana: string;
  repBirthDate?: string;
  repZipCode?: string;
  repAddress?: string;
  phone: string;
  customerName: string;
  email: string;
  notes?: string;
  baseAmount: number;
  appliedRate: number; 
  isManualAdjustment: boolean;
  manualAgencyAmount?: number;
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
