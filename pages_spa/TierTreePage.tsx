
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { User, UserStatus, UserRole, AgencyApplicationStatus } from '../types';
import { Badge, Button } from '../components/UI';

const TreeNode = ({ node, level, isAdmin, currentUser, allUsers }: { 
  node: User; 
  level: number; 
  isAdmin: boolean; 
  currentUser: User; 
  allUsers: User[]; 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();
  
  const children = useMemo(() => 
    allUsers.filter(u => u.referrerId === node.id),
    [allUsers, node.id]
  );

  const isSelf = currentUser.id === node.id;

  // ステータス情報の判定
  const getStatusInfo = () => {
    if (node.role === UserRole.ADMIN) {
      return { label: '管理者', color: 'var(--primary)', icon: 'fa-crown', bg: 'rgba(79, 70, 229, 0.1)' };
    }
    if (node.status === UserStatus.AGENCY) {
      return { label: '代理店', color: '#1e293b', icon: 'fa-user-tie', bg: 'rgba(30, 41, 59, 0.1)' };
    }
    if (node.agencyApplicationStatus === AgencyApplicationStatus.PENDING) {
      return { label: '申請中', color: '#f59e0b', icon: 'fa-clock', bg: 'rgba(245, 158, 11, 0.1)' };
    }
    if (node.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) {
      return { label: '承認済', color: '#0ea5e9', icon: 'fa-user-check', bg: 'rgba(14, 165, 233, 0.1)' };
    }
    return { label: '顧客', color: '#94a3b8', icon: 'fa-user', bg: 'rgba(148, 163, 184, 0.1)' };
  };

  const status = getStatusInfo();

  return (
    <div style={{ 
      marginLeft: level === 0 ? 0 : '40px', 
      marginBottom: '16px', 
      borderLeft: level === 0 ? 'none' : '2px solid var(--border)', 
      paddingLeft: level === 0 ? 0 : '30px', 
      position: 'relative' 
    }}>
      {/* 接続線 (L字) */}
      {level > 0 && (
        <div style={{ 
          position: 'absolute', 
          left: '-2px', 
          top: '28px', 
          width: '32px', 
          height: '2px', 
          background: 'var(--border)' 
        }}></div>
      )}

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        padding: '16px 20px', 
        background: isSelf ? 'rgba(79, 70, 229, 0.03)' : 'var(--bg-card)', 
        borderRadius: '16px',
        border: isSelf ? '2px solid var(--primary)' : '1px solid var(--border)',
        boxShadow: isSelf ? '0 10px 15px -3px rgba(79, 70, 229, 0.1)' : 'var(--shadow-sm)',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s',
        position: 'relative',
        zIndex: 1,
        maxWidth: '600px'
      }}
      className="tree-node-hover"
      >
        {/* 展開ボタン */}
        <div 
          onClick={() => children.length > 0 && setIsExpanded(!isExpanded)}
          style={{ 
            width: '28px', 
            height: '28px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: children.length > 0 ? 'pointer' : 'default',
            color: children.length > 0 ? 'var(--primary)' : 'var(--border)',
            background: 'var(--bg-main)',
            borderRadius: '8px',
            border: '1.5px solid var(--border)',
            transition: 'all 0.2s'
          }}
        >
          {children.length > 0 ? (
            <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ fontSize: '0.75rem' }}></i>
          ) : (
            <div style={{ width: '4px', height: '4px', background: 'var(--border)', borderRadius: '50%' }}></div>
          )}
        </div>

        {/* アイコン */}
        <div style={{ 
          width: '44px', 
          height: '44px', 
          borderRadius: '12px', 
          background: node.role === UserRole.ADMIN ? 'var(--grad-primary)' : status.bg,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: node.role === UserRole.ADMIN ? 'white' : status.color,
          fontSize: '1.2rem',
          boxShadow: node.role === UserRole.ADMIN ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
        }}>
          <i className={`fa-solid ${status.icon}`}></i>
        </div>

        {/* テキスト情報 */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>{node.name}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>{node.loginId}</span>
            {isSelf && <Badge color="var(--primary)" style={{ fontSize: '0.65rem', padding: '3px 8px' }}>あなた</Badge>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
             <i className={`fa-solid ${status.icon}`} style={{ fontSize: '0.7rem', color: status.color }}></i>
             <span style={{ fontSize: '0.75rem', fontWeight: 800, color: status.color }}>{status.label}</span>
          </div>
        </div>

        {/* アクション */}
        {(isAdmin || isSelf) && (
          <Button variant="ghost" onClick={() => navigate(isAdmin ? `/agencies` : `/cases`)} style={{ padding: '8px 14px', fontSize: '0.75rem', fontWeight: 800, border: '1px solid var(--border)', borderRadius: '10px' }}>
            <i className={`fa-solid ${isAdmin ? 'fa-gear' : 'fa-list-check'}`} style={{ marginRight: '6px' }}></i>
            {isAdmin ? '管理' : '案件'}
          </Button>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          {children.map(child => (
            <TreeNode 
              key={child.id} 
              node={child} 
              level={level + 1} 
              isAdmin={isAdmin} 
              currentUser={currentUser}
              allUsers={allUsers}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TierTreePage = () => {
  const { user } = useAppContext();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const u = await db.getUsers();
      setAllUsers(u);
      setLoading(false);
    };
    loadData();
  }, []);

  const rootUsers = useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.ADMIN) {
      return allUsers.filter(u => !u.referrerId || u.role === UserRole.ADMIN);
    }
    return allUsers.filter(u => u.id === user.id);
  }, [allUsers, user]);

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '40px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em', margin: 0 }}>
            ティアツリー <span style={{ color: 'var(--primary)' }}>.</span>
          </h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px', fontSize: '1.1rem' }}>
            組織の紹介関係と各パートナーのステータスを可視化します。
          </p>
        </div>
        
        {/* 凡例 */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          padding: '12px 20px', 
          background: 'var(--bg-card)', 
          borderRadius: '12px', 
          border: '1px solid var(--border)',
          fontSize: '0.75rem',
          fontWeight: 800
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}><i className="fa-solid fa-user-tie"></i> 代理店</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}><i className="fa-solid fa-user"></i> 顧客</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}><i className="fa-solid fa-clock"></i> 申請中</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0ea5e9' }}><i className="fa-solid fa-user-check"></i> 承認済</div>
        </div>
      </header>

      <div style={{ 
        padding: '48px', 
        background: 'var(--bg-card)', 
        borderRadius: '32px', 
        border: '1px solid var(--border)',
        minHeight: '600px',
        boxShadow: 'var(--shadow-md)',
        backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }}>
        {rootUsers.length > 0 ? rootUsers.map(root => (
          <TreeNode 
            key={root.id} 
            node={root} 
            level={0} 
            isAdmin={user.role === UserRole.ADMIN} 
            currentUser={user}
            allUsers={allUsers}
          />
        )) : (
          <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-sub)' }}>
            <i className="fa-solid fa-sitemap" style={{ fontSize: '3rem', opacity: 0.1, marginBottom: '20px' }}></i>
            <p style={{ fontWeight: 700 }}>表示可能な組織データがありません。</p>
          </div>
        )}
      </div>

      <style>{`
        .tree-node-hover:hover {
          transform: translateX(8px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
          border-color: var(--primary);
        }
      `}</style>
    </div>
  );
};

export default TierTreePage;
