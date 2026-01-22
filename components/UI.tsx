import React from 'react';
import { CaseStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';

export const Badge = ({ children, className = "", style = {} }: { children?: React.ReactNode, className?: string, style?: React.CSSProperties }) => (
  <span 
    className={`px-2 py-1 text-xs font-semibold rounded-full ${className}`}
    style={{ display: 'inline-block', ...style }}
  >
    {children}
  </span>
);

export const StatusBadge = ({ status }: { status: CaseStatus }) => {
  // Tailwindが効かなくても色がわかるように直接Styleを適用
  const colorMap: Record<CaseStatus, string> = {
    'draft': '#64748b',
    'submitted': '#2563eb',
    'reviewing': '#f59e0b',
    'needs_fix': '#dc2626',
    'approved': '#16a34a',
    'rejected': '#991b1b',
    'active': '#0d9488'
  };
  return (
    <Badge style={{ backgroundColor: colorMap[status], color: 'white' }}>
      {STATUS_LABELS[status]}
    </Badge>
  );
};

export const Card = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div 
    className={`rounded-xl border border-slate-200 bg-white ${className}`}
    style={{ overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
  >
    {children}
  </div>
);

export const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = "", 
  disabled = false,
  type = "button"
}: { 
  children?: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'; 
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) => {
  const baseStyle: React.CSSProperties = {
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'all 0.2s'
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: '#2563eb', color: 'white' },
    secondary: { backgroundColor: '#f1f5f9', color: '#475569' },
    danger: { backgroundColor: '#dc2626', color: 'white' },
    success: { backgroundColor: '#16a34a', color: 'white' },
    ghost: { backgroundColor: 'transparent', color: '#64748b' }
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      style={{ ...baseStyle, ...variants[variant] }}
      className={className}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, error, ...props }: { label?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div style={{ width: '100%', marginBottom: '1rem' }}>
    {label && <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>{label}</label>}
    <input 
      {...props} 
      style={{
        width: '100%',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        border: `1px solid ${error ? '#ef4444' : '#e2e8f0'}`,
        outline: 'none',
        boxSizing: 'border-box'
      }}
    />
    {error && <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>{error}</p>}
  </div>
);

export const Select = ({ label, error, children, ...props }: { label?: string; error?: string; children?: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div style={{ width: '100%', marginBottom: '1rem' }}>
    {label && <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>{label}</label>}
    <select 
      {...props} 
      style={{
        width: '100%',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        border: `1px solid ${error ? '#ef4444' : '#e2e8f0'}`,
        outline: 'none',
        boxSizing: 'border-box'
      }}
    >
      {children}
    </select>
    {error && <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>{error}</p>}
  </div>
);
