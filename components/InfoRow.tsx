import React from 'react';
import { Input, Select, Textarea } from './UI';

interface InfoRowProps {
  label: string;
  value?: any;
  field?: string;
  group?: string;
  type?: 'text' | 'date' | 'select' | 'textarea';
  options?: { label: string; value: string }[];
  layout?: 'horizontal' | 'vertical';
  labelWidth?: string;
  isEditing: boolean;
  onChange: (value: string, field: string, group?: string) => void;
  formatToWareki: (dateStr?: string) => string;
}

const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  field,
  group,
  type = 'text',
  options,
  layout = 'horizontal',
  labelWidth = '220px',
  isEditing,
  onChange,
  formatToWareki
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (field) {
      onChange(e.target.value, field, group);
    }
  };

  const displayValue = () => {
    if (type === 'date' && value) {
      return <>{value} <span style={{ color: 'var(--text-sub)', fontSize: '0.75rem' }}>（{formatToWareki(String(value))}）</span></>;
    }
    if (type === 'select' && options) {
      const matched = options.find(o => o.value === String(value ?? ''));
      return matched?.label || value || <span style={{ color: 'var(--border)' }}>---</span>;
    }
    return value || <span style={{ color: 'var(--border)' }}>---</span>;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: layout === 'vertical' ? 'column' : 'row',
      flexWrap: layout === 'vertical' ? undefined : 'wrap',
      borderBottom: '1px solid var(--border)',
      padding: '14px 0',
      alignItems: layout === 'vertical' ? 'flex-start' : 'center',
      gap: layout === 'vertical' ? '8px' : '0'
    }}>
      <div style={{
        width: layout === 'vertical' ? '100%' : labelWidth,
        minWidth: layout === 'vertical' ? undefined : labelWidth,
        color: 'var(--text-sub)',
        fontWeight: 800,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        marginBottom: layout === 'vertical' ? '4px' : '0',
        flexShrink: 0
      }}>
        {label}
      </div>
      <div style={{ flex: '1 1 180px', minWidth: '180px', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem' }}>
        {isEditing && field ? (
          <>
            {type === 'select' ? (
              <Select
                value={value || ''}
                onChange={handleChange}
                containerStyle={{ marginBottom: 0 }}
              >
                <option value="">選択してください</option>
                {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            ) : type === 'textarea' ? (
              <Textarea
                value={value || ''}
                onChange={handleChange}
                containerStyle={{ marginBottom: 0 }}
                rows={3}
              />
            ) : (
              <Input
                type={type}
                value={value || ''}
                onChange={handleChange}
                containerStyle={{ marginBottom: 0 }}
              />
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px' }}>
            <div style={{ flex: 1, whiteSpace: 'pre-wrap' }}>
              {displayValue()}
            </div>
            {!isEditing && value && type !== 'textarea' && (
              <button
                onClick={() => navigator.clipboard.writeText(String(value))}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.8rem', opacity: 0.5, flexShrink: 0 }}
                title="コピー"
              >
                <i className="fa-regular fa-copy"></i>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(InfoRow);
