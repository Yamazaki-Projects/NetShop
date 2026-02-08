
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { User, UserStatus, UserRole } from '../types';
import { Badge, Button } from '../components/UI';

// パートナー（User）を表示するためのコンポーネント
const TreeNode = ({ node, level, isAdmin, currentUser }: { node: User; level: number; isAdmin: boolean; currentUser: User; key?: React.Key }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();
  
  // このユーザーが「直紹介」したユーザー（代理店 or 顧客）をすべて抽出
  const subUsers = db.getUsers().filter(u => u.referrerId === node.id);
  
  const approvedCount = db.getApprovedCount(node.id);
  const currentRate = db.calculateRate(node.id);

  // このユーザーに関連する案件を検索
  const associatedCase = db.getAllCases().find(c => c.email === node.email);

  const hasSubItems = subUsers.length > 0;

  const handleNodeClick = (e: React.MouseEvent) => {
    // 展開ボタン（chevron）のクリック時は遷移させない
    if ((e.target as HTMLElement).closest('.chevron-btn')) return;
    
    if (associatedCase) {
      navigate(`/cases/${associatedCase.id}`);
    }
  };

  return (
    <div style={{ marginLeft: level === 0 ? 0 : '32px', marginBottom: '12px' }}>
      <div 
        onClick={handleNodeClick}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '12px 16px', 
          background: 'var(--bg-card)', 
          borderRadius: '12px',
          border: '1px solid var(--border)',
          boxShadow: level === 0 ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          cursor: associatedCase ? 'pointer' : 'default'
        }}
        onMouseOver={(e) => {
          if (associatedCase) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 20px -5px rgba(0,0,0,0.1)';
            e.currentTarget.style.borderColor = 'var(--primary)';
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = level === 0 ? 'var(--shadow-md)' : 'var(--shadow-sm)';
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        <div 
          className="chevron-btn"
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} 
          style={{ cursor: hasSubItems ? 'pointer' : 'default', width: '20px', textAlign: 'center', color: 'var(--text-sub)', zIndex: 10 }}
        >
          {hasSubItems && (
            <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ fontSize: '0.7rem' }}></i>
          )}
        </div>
        
        <div style={{ 
          width: '36px', 
          height: '36px', 
          borderRadius: '50%', 
          background: node.role === UserRole.ADMIN ? 'var(--grad-primary)' : (node.status === UserStatus.AGENCY ? 'var(--primary)' : '#e2e8f0'), 
          color: node.status === UserStatus.AGENCY || node.role === UserRole.ADMIN ? 'white' : '#64748b', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '0.9rem',
          boxShadow: node.role === UserRole.ADMIN ? '0 4px 10px rgba(79, 70, 229, 0.3)' : 'none'
        }}>
          <i className={`fa-solid ${node.role === UserRole.ADMIN ? 'fa-shield-halved' : 'fa-user'}`}></i>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{node.name}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 700 }}>({node.loginId})</span>
            {node.status === UserStatus.AGENCY ? (
              <Badge color="var(--primary)">代理店</Badge>
            ) : (
              <Badge color="#94a3b8">顧客</Badge>
            )}
            {node.isDeletionPending && (
               <Badge color="#ef4444">削除申請中</Badge>
            )}
            {node.id === currentUser.id && level === 0 && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)' }}>(自分)</span>}
          </div>
        </div>

        {(isAdmin || currentUser.id === node.id) && node.role !== UserRole.ADMIN && node.status === UserStatus.AGENCY && (
          <div style={{ display: 'flex', gap: '20px', padding: '0 12px', borderLeft: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-sub)', fontWeight: 800 }}>承認案件</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 900 }}>{approvedCount}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-sub)', fontWeight: 800 }}>報酬率</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--primary)' }}>{Math.round(currentRate * 100)}%</div>
            </div>
          </div>
        )}
        
        {associatedCase && (
          <div style={{ paddingLeft: '12px', color: 'var(--primary)', opacity: 0.5 }}>
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.75rem' }}></i>
          </div>
        )}
      </div>

      {isExpanded && (
        <div style={{ marginTop: '8px' }}>
          {subUsers.map(child => (
            <TreeNode key={child.id} node={child} level={level + 1} isAdmin={isAdmin} currentUser={currentUser} />
          ))}
        </div>
      )}
    </div>
  );
};

const TierTreePage = () => {
  const { user } = useAppContext();
  
  const rootUsers = useMemo(() => {
    if (!user) return [];
    return [user];
  }, [user]);

  const LegendItem = ({ icon, label, color }: { icon: string, label: string, color: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
      <div style={{ 
        width: '24px', height: '24px', borderRadius: '6px', background: color, color: color === '#e2e8f0' ? '#64748b' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <span style={{ color: 'var(--text-sub)' }}>{label}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '40px', textAlign: 'left' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>ティアツリー</h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600 }}>紹介ネットワークを視覚化します。各ノードをクリックすると、その顧客の案件詳細を確認できます。</p>
      </header>

      {/* Legend / Legend Bar */}
      <div style={{ 
        background: 'var(--bg-card)', padding: '16px 24px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '32px',
        display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center'
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>凡例:</div>
        <LegendItem icon="fa-user" label="代理店 (パートナー)" color="var(--primary)" />
        <LegendItem icon="fa-user" label="獲得した顧客" color="#e2e8f0" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700, marginLeft: 'auto' }}>
           <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: 'var(--primary)' }}></i>
           <span style={{ color: 'var(--text-sub)' }}>案件詳細へ移動可能</span>
        </div>
      </div>

      <div style={{ padding: '8px' }}>
        {rootUsers.map(root => (
          <TreeNode 
            key={root.id} 
            node={root} 
            level={0} 
            isAdmin={user?.role === UserRole.ADMIN} 
            currentUser={user!} 
          />
        ))}
      </div>
    </div>
  );
};

export default TierTreePage;
