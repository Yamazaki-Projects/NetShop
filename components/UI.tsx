
import React from 'react';
import { CaseStatus } from '../types';
import { STATUS_LABELS } from '../constants';

export const Badge = ({ children, color }: { children?: React.ReactNode, color: string }) => (
  <span className="badge" style={{ 
    backgroundColor: color, 
    color: '#fff', 
    padding: '6px 14px', 
    borderRadius: '30px', 
    fontSize: '0.75rem', 
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
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

// Added key to interface to avoid TS errors when Card is used within a map()
export const Card = ({ children, className = "", title, style }: { children?: React.ReactNode, className?: string, title?: string, style?: React.CSSProperties, key?: React.Key }) => (
  <div className={`card ${className}`} style={style}>
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
  onClick?: () => void; 
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
