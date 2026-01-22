
import React from 'react';
import { CaseStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';

export const Badge = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${className}`}>
    {children}
  </span>
);

export const StatusBadge = ({ status }: { status: CaseStatus }) => (
  <Badge className={`${STATUS_COLORS[status]} text-white`}>
    {STATUS_LABELS[status]}
  </Badge>
);

export const Card = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white dark:bg-bg-darkSub border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm ${className}`}>
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
  const variants = {
    primary: 'bg-primary hover:bg-primary-hover text-white',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    ghost: 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, error, ...props }: { label?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1 w-full text-left">
    {label && <label className="text-sm font-medium text-text-main dark:text-text-darkMain block mb-1">{label}</label>}
    <input 
      {...props} 
      className={`
        w-full px-4 py-2 rounded-lg border bg-white dark:bg-bg-darkSub text-text-main dark:text-text-darkMain
        focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all
        ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}
      `}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

export const Select = ({ label, error, children, ...props }: { label?: string; error?: string; children?: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="space-y-1 w-full text-left">
    {label && <label className="text-sm font-medium text-text-main dark:text-text-darkMain block mb-1">{label}</label>}
    <select 
      {...props} 
      className={`
        w-full px-4 py-2 rounded-lg border bg-white dark:bg-bg-darkSub text-text-main dark:text-text-darkMain
        focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all
        ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-800'}
      `}
    >
      {children}
    </select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);
