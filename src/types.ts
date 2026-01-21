
export enum UserRole {
  ADMIN = 'admin',
  AGENCY = 'agency',
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

export interface User {
  id: string;
  email: string;
  role: UserRole;
  agencyId?: string;
  name: string;
}

export interface Agency {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  createdAt: string;
}

export interface AgencyReferral {
  parentAgencyId: string;
  childAgencyId: string;
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

export interface Case {
  id: string;
  agencyId: string;
  agencyName: string;
  status: CaseStatus;
  platform: PlatformType;
  customerType: 'individual' | 'corporation';
  customerName: string;
  companyName?: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  tasks: CaseTask[];
  documents: CaseDocument[];
  reviews: CaseReview[];
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
