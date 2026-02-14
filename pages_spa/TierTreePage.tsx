
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { User, UserStatus, UserRole, AgencyApplicationStatus } from '../types';
import { Badge, Button } from '../components/UI';

const TreeNode = ({ user, level, isAdmin, currentUser, allUsers }: { 
  user: User; 
  level: number; 
  isAdmin: boolean; 
  currentUser: User; 
  allUsers: User[]; 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();

  // 下位の紹介ユーザーを計算
  const children = useMemo(() => {
    return allUsers.filter(u => u.referrerId === user.id && u.id !== user.id);
  }, [user, allUsers]);

  const isSelf = currentUser.id === user.id;

  // ステータス表示情報の判定
  const getDisplayInfo = () => {
    // 管理者ロールの場合
    if (user.role === UserRole.ADMIN) {
      return { 
        label: '管理者', 
        color: 'var(--primary)', 
        icon: 'fa-crown', 
        bg: 'rgba(79, 70, 229, 0.08)' 
      };
    }
    
    // 代理店（本登録済み）
    if (user.status === UserStatus.AGENCY) {
      return { 
        label: '代理店', 
        color: '#1e293b', 
        icon: 'fa-user-tie', 
        bg: 'rgba(30, 41, 59, 0.05)' 
      };
    }
    
    // 代理店承認済
    if (user.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) {
      return { 
        label: '代理店承認済', 
        color: '#0ea5e9', 
        icon: 'fa-user-check', 
        bg: 'rgba(14, 165, 233, 0.05)' 
      };
    }

    // 代理店申請中
    if (user.agencyApplicationStatus === AgencyApplicationStatus.PENDING) {
      return { 
        label: '代理店申請中', 
        color: '#f59e0b', 
        icon: 'fa-clock', 
        bg: 'rgba(245, 158, 11, 0.05)' 
      };
    }
    
    // 顧客
    return { 
      label: '顧客', 
      color: '#64748b', 
      icon: 'fa-user', 
      bg: 'white' 
    };
  };

  const info = getDisplayInfo();

  return (
    <div style={{ 
      marginLeft: level === 0 ? 0 : '40px', 
      marginBottom: '12px', 
      borderLeft: level === 0 ? 'none' : '2px solid var(--border)', 
      paddingLeft: level === 0 ? 0 : '30px', 
      position: 'relative' 
    }}>
      {/* 接続線 (L字) */}
      {level > 0 && (
        <div style={{ 
          position: 'absolute', 
          left: '-2px', 
          top: '24px', 
          width: '32px', 
          height: '2px', 
          background: 'var(--border)' 
        }}></div>
      )}

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        padding: '14px 18px', 
        background: isSelf ? 'rgba(79, 70, 229, 0.04)' : info.bg, 
        borderRadius: '16px',
        border: isSelf ? '2.5px solid var(--primary)' : `1.5px solid var(--border)`,
        boxShadow: isSelf ? '0 10px 15px -3px rgba(79, 70, 229, 0.15)' : 'var(--shadow-sm)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 1,
        maxWidth: '580px'
      }}
      className="tree-node-hover"
      >
        {/* 展開ボタン */}
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (children.length > 0) setIsExpanded(!isExpanded);
          }}
          style={{ 
            width: '26px', 
            height: '26px', 
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
            <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ fontSize: '0.7rem' }}></i>
          ) : (
            <div style={{ width: '4px', height: '4px', background: 'var(--border)', borderRadius: '50%' }}></div>
          )}
        </div>

        {/* アイコン */}
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '12px', 
          background: isSelf ? 'var(--grad-primary)' : info.color + '11',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: isSelf ? 'white' : info.color,
          fontSize: '1.1rem',
          boxShadow: isSelf ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
        }}>
          <i className={`fa-solid ${info.icon}`}></i>
        </div>

        {/* テキスト情報 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-sub)', background: 'var(--bg-main)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
              {user.loginId}
            </span>
            {isSelf && <Badge color="var(--primary)" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>あなた</Badge>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
             <i className={`fa-solid ${info.icon}`} style={{ fontSize: '0.65rem', color: info.color }}></i>
             <span style={{ fontSize: '0.7rem', fontWeight: 800, color: info.color }}>{info.label}</span>
          </div>
        </div>

        {/* 管理用アクション */}
        {isAdmin && !isSelf && (
          <Button 
            variant="ghost" 
            onClick={(e) => { e.stopPropagation(); navigate(`/agencies`); }} 
            style={{ padding: '6px 12px', fontSize: '0.7rem', fontWeight: 800, border: '1.5px solid var(--border)', borderRadius: '10px' }}
          >
            管理
          </Button>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          {children.map((child) => (
            <TreeNode 
              key={child.id} 
              user={child} 
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
      try {
        const u = await db.getUsers();
        setAllUsers(u);
      } catch (e) {
        console.error("Failed to load tree data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const rootUsers = useMemo((): User[] => {
    if (!user) return [];
    
    // 管理者の場合は、トップレベルのユーザー（紹介者なし、または管理者自身）を表示
    if (user.role === UserRole.ADMIN) {
      return allUsers.filter(u => !u.referrerId || u.role === UserRole.ADMIN);
    }
    
    // 一般ユーザーの場合は自分をトップに
    return [user];
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
            代理店パートナーの組織構造を可視化します。
          </p>
        </div>
        
        {/* 凡例 */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          padding: '12px 20px', 
          background: 'var(--bg-card)', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          fontSize: '0.7rem',
          fontWeight: 800,
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
          maxWidth: '550px',
          justifyContent: 'flex-end'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b' }}><i className="fa-solid fa-user-tie"></i> 代理店</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0ea5e9' }}><i className="fa-solid fa-user-check"></i> 承認済</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}><i className="fa-solid fa-clock"></i> 申請中</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b' }}><i className="fa-solid fa-user"></i> 顧客</div>
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
        {rootUsers.length > 0 ? rootUsers.map((rootUser) => (
          <TreeNode 
            key={rootUser.id} 
            user={rootUser} 
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
          box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.08) !important;
          border-color: var(--primary) !important;
        }
      `}</style>
    </div>
  );
};

export default TierTreePage;
