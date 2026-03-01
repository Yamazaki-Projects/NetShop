
import React from 'react';
import { CaseStatus, UserStatus, AgencyApplicationStatus, User } from '../types';
import { STATUS_LABELS } from '../constants';

// Added optional style prop to Badge component to fix TS errors in consumers
export const Badge = ({ children, color, style }: { children?: React.ReactNode, color: string, style?: React.CSSProperties }) => (
  <span className="badge" style={{ 
    backgroundColor: color, 
    color: '#fff', 
    padding: '6px 14px', 
    borderRadius: '30px', 
    fontSize: '0.75rem', 
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style
  }}>
    {children}
  </span>
);

export const StatusBadge = ({ status }: { status: CaseStatus }) => {
  const colorMap: Record<CaseStatus, string> = {
    'draft': '#94a3b8',
    'submitted': '#6366f1',
    'reviewing': '#f59e0b',
    'needs_fix': '#ef4444',
    'approved': '#10b981',
    'rejected': '#7f1d1d',
    'active': '#0ea5e9'
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <Badge color={colorMap[status]}>
        {STATUS_LABELS[status]}
      </Badge>
    </div>
  );
};

export const AgencyStatusBadge = ({ user, email, caseId, allUsers }: { user?: User | null, email?: string, caseId?: string, allUsers?: User[] }) => {
  let u = user;
  if (!u && allUsers && (caseId || email)) {
    u = allUsers.find(x => 
      (caseId && (x.loginId || '').toLowerCase() === (caseId || '').toLowerCase()) || 
      (email && x.email === email)
    ) || null;
  }

  if (!u || u.agencyApplicationStatus === AgencyApplicationStatus.NONE) return <Badge color="#94a3b8">顧客</Badge>;
  if (u.status === UserStatus.AGENCY) return <Badge color="#10b981">代理店</Badge>;
  if (u.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) return <Badge color="#0ea5e9">承認済</Badge>;
  if (u.agencyApplicationStatus === AgencyApplicationStatus.PENDING) return <Badge color="#f59e0b">申請中</Badge>;
  return <Badge color="#94a3b8">未申請</Badge>;
};

// Added onClick prop to Card component to allow event manipulation (e.g., stopPropagation) in consumers
export const Card = ({ children, className = "", title, style, onClick }: { children?: React.ReactNode, className?: string, title?: string, style?: React.CSSProperties, key?: React.Key, onClick?: React.MouseEventHandler<HTMLDivElement> }) => (
  <div className={`card ${className}`} style={style} onClick={onClick}>
    {title && (
      <div style={{ 
        padding: '24px 28px', 
        borderBottom: '1px solid var(--border)', 
        fontWeight: 800, 
        fontSize: '1.1rem',
        background: 'rgba(0,0,0,0.01)',
        color: 'var(--text-main)',
        textAlign: 'left' // カードタイトルは左揃え
      }}>
        {title}
      </div>
    )}
    <div style={{ padding: title ? '0' : '28px' }}>
      {children}
    </div>
  </div>
);

// Updated onClick type to accept React.MouseEvent to allow event manipulation in consumers
export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = "", 
  disabled = false,
  type = "button",
  style
}: { 
  children?: React.ReactNode; 
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'; 
  className?: string; 
  disabled?: boolean;
  type?: "button" | "submit";
  style?: React.CSSProperties;
}) => {
  const variantClass = variant === 'ghost' ? 'btn-ghost' : 'btn-primary';
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

export const Input = ({ label, error, style: customStyle, ...props }: { label?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div style={{ marginBottom: '24px', textAlign: 'left' }}>
    {label && <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main)' }}>{label}</label>}
    <input 
      {...props} 
      className="input-field"
      style={{
        ...customStyle,
        color: 'var(--text-main)'
      }}
    />
    {error && <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '8px', fontWeight: 700 }}>{error}</p>}
  </div>
);

export const Select = ({ label, error, children, style: customStyle, ...props }: { label?: string; error?: string; children?: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div style={{ marginBottom: '24px', textAlign: 'left' }}>
    {label && <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main)' }}>{label}</label>}
    <select 
      {...props} 
      className="input-field"
      style={{
        ...customStyle,
        color: 'var(--text-main)'
      }}
    >
      {children}
    </select>
  </div>
);
