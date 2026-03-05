import React, { useMemo } from 'react';
import { CaseStatus, UserStatus, AgencyApplicationStatus, User } from '../types';
import { STATUS_LABELS } from '../constants';

/**
 * Badge
 * - style を受け取れる
 * - inline-flex で安定
 */
export const Badge = ({
  children,
  color,
  style
}: {
  children?: React.ReactNode;
  color: string;
  style?: React.CSSProperties;
}) => (
  <span
    className="badge"
    style={{
      backgroundColor: color,
      color: '#fff',
      padding: '6px 14px',
      borderRadius: '30px',
      fontSize: '0.75rem',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      ...style
    }}
  >
    {children}
  </span>
);

/**
 * StatusBadge
 * - CaseStatus をラベル表示
 */
export const StatusBadge = ({ status }: { status: CaseStatus }) => {
  const colorMap: Record<CaseStatus, string> = {
    draft: '#94a3b8',
    submitted: '#6366f1',
    reviewing: '#f59e0b',
    needs_fix: '#ef4444',
    approved: '#10b981',
    rejected: '#7f1d1d',
    active: '#0ea5e9'
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <Badge color={colorMap[status]}>{STATUS_LABELS[status]}</Badge>
    </div>
  );
};

/**
 * AgencyStatusBadge
 * - user が無い場合でも allUsers + caseId/email から推測
 * - render毎の find で重くならないよう useMemo 化
 */
export const AgencyStatusBadge = ({
  user,
  email,
  caseId,
  allUsers
}: {
  user?: User | null;
  email?: string;
  caseId?: string;
  allUsers?: User[];
}) => {
  const resolvedUser = useMemo(() => {
    if (user) return user;
    if (!allUsers || allUsers.length === 0) return null;

    const cid = (caseId || '').toLowerCase().trim();
    const em = (email || '').toLowerCase().trim();

    if (!cid && !em) return null;

    return (
      allUsers.find((x) => {
        const lid = (x.loginId || '').toLowerCase().trim();
        const uxEmail = (x.email || '').toLowerCase().trim();
        return (cid && lid === cid) || (em && uxEmail === em);
      }) || null
    );
  }, [user, allUsers, caseId, email]);

  const u = resolvedUser;

  if (!u || u.agencyApplicationStatus === AgencyApplicationStatus.NONE) return <Badge color="#94a3b8">顧客</Badge>;
  if (u.status === UserStatus.AGENCY) return <Badge color="#10b981">代理店</Badge>;
  if (u.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) return <Badge color="#0ea5e9">承認済</Badge>;
  if (u.agencyApplicationStatus === AgencyApplicationStatus.PENDING) return <Badge color="#f59e0b">申請中</Badge>;
  return <Badge color="#94a3b8">未申請</Badge>;
};

/**
 * Card
 * - titleがあっても中身に padding を常に入れる（フォームが端に張り付かない）
 * - onClick 受け取り
 */
export const Card = ({
  children,
  className = '',
  title,
  style,
  onClick
}: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}) => (
  <div className={`card ${className}`} style={style} onClick={onClick}>
    {title && (
      <div
        style={{
          padding: '24px 28px',
          borderBottom: '1px solid var(--border)',
          fontWeight: 800,
          fontSize: '1.1rem',
          background: 'rgba(0,0,0,0.01)',
          color: 'var(--text-main)',
          textAlign: 'left'
        }}
      >
        {title}
      </div>
    )}

    {/* ✅ titleがある/ないに関わらず常にpaddingを入れる */}
    <div style={{ padding: '28px' }}>{children}</div>
  </div>
);

/**
 * Button
 * - variant を正しく反映
 */
export const Button = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button',
  style
}: {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}) => {
  const variantClass =
    variant === 'ghost'
      ? 'btn-ghost'
      : variant === 'secondary'
      ? 'btn-secondary'
      : variant === 'danger'
      ? 'btn-danger'
      : variant === 'success'
      ? 'btn-success'
      : 'btn-primary';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variantClass} ${className}`}
      style={{ ...style }}
    >
      {children}
    </button>
  );
};

/**
 * Input / Select / Textarea
 * ✅ 入力枠が狭くなる原因の多くは width:100% が無いこと
 * ✅ container自体も width:100% を保証する
 * ✅ boxSizing を入れる
 * ✅ minHeight 入れてタップ/クリックしやすく
 */
const baseFieldStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  minHeight: '44px',
  padding: '10px 12px',
  borderRadius: '10px'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '10px',
  fontSize: '0.875rem',
  fontWeight: 800,
  color: 'var(--text-main)'
};

const errorStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#ef4444',
  marginTop: '8px',
  fontWeight: 700
};

export const Input = ({
  label,
  error,
  containerStyle,
  style: customStyle,
  ...props
}: {
  label?: string;
  error?: string;
  containerStyle?: React.CSSProperties;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div
    style={{
      marginBottom: '24px',
      textAlign: 'left',
      width: '100%',
      ...containerStyle
    }}
  >
    {label && <label style={labelStyle}>{label}</label>}
    <input
      {...props}
      className="input-field"
      style={{
        ...baseFieldStyle,
        color: 'var(--text-main)',
        ...customStyle
      }}
    />
    {error && <p style={errorStyle}>{error}</p>}
  </div>
);

export const Select = ({
  label,
  error,
  children,
  containerStyle,
  style: customStyle,
  ...props
}: {
  label?: string;
  error?: string;
  children?: React.ReactNode;
  containerStyle?: React.CSSProperties;
} & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div
    style={{
      marginBottom: '24px',
      textAlign: 'left',
      width: '100%',
      ...containerStyle
    }}
  >
    {label && <label style={labelStyle}>{label}</label>}
    <select
      {...props}
      className="input-field"
      style={{
        ...baseFieldStyle,
        color: 'var(--text-main)',
        ...customStyle
      }}
    >
      {children}
    </select>
    {error && <p style={errorStyle}>{error}</p>}
  </div>
);

export const Textarea = ({
  label,
  error,
  containerStyle,
  style: customStyle,
  ...props
}: {
  label?: string;
  error?: string;
  containerStyle?: React.CSSProperties;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <div
    style={{
      marginBottom: '24px',
      textAlign: 'left',
      width: '100%',
      ...containerStyle
    }}
  >
    {label && <label style={labelStyle}>{label}</label>}
    <textarea
      {...props}
      className="input-field"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        minHeight: '120px',
        padding: '12px',
        borderRadius: '10px',
        resize: 'vertical',
        color: 'var(--text-main)',
        fontFamily: 'inherit',
        ...customStyle
      }}
    />
    {error && <p style={errorStyle}>{error}</p>}
  </div>
);