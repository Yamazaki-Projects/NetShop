
import { CaseStatus, TaskStatus } from './types';

export const STATUS_COLORS: Record<CaseStatus, string> = {
  [CaseStatus.DRAFT]: 'bg-slate-500',
  [CaseStatus.SUBMITTED]: 'bg-blue-600',
  [CaseStatus.REVIEWING]: 'bg-amber-500',
  [CaseStatus.NEEDS_FIX]: 'bg-red-600',
  [CaseStatus.APPROVED]: 'bg-green-600',
  [CaseStatus.REJECTED]: 'bg-red-900',
  [CaseStatus.ACTIVE]: 'bg-teal-600',
};

export const STATUS_LABELS: Record<CaseStatus, string> = {
  [CaseStatus.DRAFT]: '下書き',
  [CaseStatus.SUBMITTED]: '提出済み',
  [CaseStatus.REVIEWING]: '審査中',
  [CaseStatus.NEEDS_FIX]: '要修正',
  [CaseStatus.APPROVED]: '承認',
  [CaseStatus.REJECTED]: '却下',
  [CaseStatus.ACTIVE]: '運用開始',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  [TaskStatus.DOING]: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  [TaskStatus.WAITING]: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  [TaskStatus.DONE]: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
};

export const REASON_TEMPLATES = [
  "本人確認書類が不鮮明です",
  "住所が申請内容と一致しません",
  "銀行口座名義が異なります",
  "店舗URLの入力が誤っています",
  "必要書類が不足しています",
];
