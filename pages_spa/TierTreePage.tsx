
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { User, UserStatus, UserRole, AgencyApplicationStatus, Case } from '../types';
import { Badge, Button } from '../components/UI';

// ノードの型定義（ユーザーまたは案件）
type TreeElement = 
  | { type: 'user'; data: User }
  | { type: 'case'; data: Case };

// Added key?: React.Key to props to fix TS error in recursive calls and parent usage
const TreeNode = ({ element, level, isAdmin, currentUser, allUsers, allCases }: { 
  element: TreeElement; 
  level: number; 
  isAdmin: boolean; 
  currentUser: User; 
  allUsers: User[]; 
  allCases: Case[];
  key?: React.Key;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();

  // 子要素（紹介したユーザー + 紹介した案件）を計算
  const children = useMemo((): TreeElement[] => {
    if (element.type === 'case') return []; // 案件は末端ノード

    const userId = element.data.id;
    const subUsers: TreeElement[] = allUsers
      .filter(u => u.referrerId === userId && u.id !== userId)
      .map(u => ({ type: 'user', data: u }));
    
    const subCases: TreeElement[] = allCases
      .filter(c => c.referrerId === userId)
      .map(c => ({ type: 'case', data: c }));

    return [...subUsers, ...subCases];
  }, [element, allUsers, allCases]);

  const isSelf = element.type === 'user' && currentUser.id === element.data.id;

  // ユーザーステータスから表示情報を取得する共通関数
  const getStatusInfo = (targetUser?: User) => {
    if (!targetUser) return { label: '顧客', color: '#94a3b8', icon: 'fa-user', bg: 'var(--bg-card)' };
    
    if (targetUser.role === UserRole.ADMIN) {
      return { label: '管理者', color: 'var(--primary)', icon: 'fa-crown', bg: 'rgba(79, 70, 229, 0.1)' };
    }
    
    if (targetUser.status === UserStatus.AGENCY) {
      return { label: '代理店', color: 'var(--text-main)', icon: 'fa-user-tie', bg: 'rgba(30, 41, 59, 0.1)' };
    }
    
    if (targetUser.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) {
      return { label: '承認済', color: '#0ea5e9', icon: 'fa-user-check', bg: 'rgba(14, 165, 233, 0.1)' };
    }

    if (targetUser.agencyApplicationStatus === AgencyApplicationStatus.PENDING) {
      return { label: '申請中', color: '#f59e0b', icon: 'fa-clock', bg: 'rgba(245, 158, 11, 0.1)' };
    }
    
    return { label: '顧客', color: '#94a3b8', icon: 'fa-user', bg: 'var(--bg-card)' };
  };

  // 表示用情報の計算
  const getDisplayInfo = () => {
    if (element.type === 'case') {
      const c = element.data;
      const associatedUser = allUsers.find(u => u.email === c.email);
      const statusInfo = getStatusInfo(associatedUser);
      
      return {
        ...statusInfo,
        name: c.companyName || c.repName || '名称未設定',
        id: c.id,
        icon: 'fa-briefcase',
        isCase: true
      };
    }

    const u = element.data;
    const statusInfo = getStatusInfo(u);
    return {
      ...statusInfo,
      name: u.name,
      id: u.loginId,
      isCase: false
    };
  };

  const info = getDisplayInfo();

  return (
    <div style={{ 
      marginLeft: level === 0 ? 0 : '40px', 
      marginBottom: '12px', 
      borderLeft: level === 0 ? 'none' : '2.5px solid var(--border)', 
      paddingLeft: level === 0 ? 0 : '30px', 
      position: 'relative' 
    }}>
      {level > 0 && (
        <div style={{ position: 'absolute', left: '-2.5px', top: '24px', width: '32px', height: '2.5px', background: 'var(--border)' }}></div>
      )}

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        padding: '14px 18px', 
        background: isSelf ? 'rgba(79, 70, 229, 0.1)' : info.bg, 
        borderRadius: '16px',
        border: isSelf ? '2.5px solid var(--primary)' : `1.5px solid var(--border)`,
        boxShadow: isSelf ? '0 10px 15px -3px rgba(79, 70, 229, 0.2)' : 'var(--shadow-sm)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 1,
        maxWidth: '580px',
        cursor: info.isCase ? 'pointer' : 'default'
      }}
      className="tree-node-hover"
      onClick={() => info.isCase && navigate(`/cases/${element.data.id}`)}
      >
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
            color: children.length > 0 ? 'var(--primary)' : 'var(--text-sub)',
            background: 'var(--bg-main)',
            borderRadius: '8px',
            border: '1.5px solid var(--border)',
            transition: 'all 0.2s'
          }}
        >
          {children.length > 0 ? (
            <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ fontSize: '0.7rem' }}></i>
          ) : (
            <div style={{ width: '4px', height: '4px', background: 'var(--text-sub)', borderRadius: '50%', opacity: 0.3 }}></div>
          )}
        </div>

        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '12px', 
          background: isSelf ? 'var(--grad-primary)' : 'var(--bg-main)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: isSelf ? 'white' : info.color,
          fontSize: '1.1rem',
          boxShadow: isSelf ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
          border: isSelf ? 'none' : '1px solid var(--border)'
        }}>
          <i className={`fa-solid ${info.icon}`}></i>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {info.name}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-sub)', background: 'var(--bg-main)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
              {info.id}
            </span>
            {isSelf && <Badge color="var(--primary)" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>あなた</Badge>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
             <i className={`fa-solid ${info.icon}`} style={{ fontSize: '0.65rem', color: info.color }}></i>
             <span style={{ fontSize: '0.7rem', fontWeight: 800, color: info.color }}>{info.label}</span>
          </div>
        </div>

        {(isAdmin || isSelf) && (
          <Button 
            variant="ghost" 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (info.isCase) navigate(`/cases/${element.data.id}`);
              else navigate(isAdmin ? `/agencies` : `/cases`);
            }} 
            style={{ padding: '6px 12px', fontSize: '0.7rem', fontWeight: 800, border: '1.5px solid var(--border)', borderRadius: '10px', background: 'var(--bg-main)' }}
          >
            {info.isCase ? '詳細' : (isAdmin ? '管理' : '顧客一覧')}
          </Button>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          {children.map((child, idx) => (
            <TreeNode 
              key={child.type + child.data.id + idx} 
              element={child} 
              level={level + 1} 
              isAdmin={isAdmin} 
              currentUser={currentUser}
              allUsers={allUsers}
              allCases={allCases}
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
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [u, c] = await Promise.all([
          db.getUsers(),
          db.getAllCases()
        ]);
        setAllUsers(u);
        setAllCases(c);
      } catch (e) {
        console.error("Failed to load tree data", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const rootElements = useMemo((): TreeElement[] => {
    if (!user) return [];
    if (user.role === UserRole.ADMIN) {
      return allUsers
        .filter(u => !u.referrerId || u.role === UserRole.ADMIN)
        .map(u => ({ type: 'user', data: u }));
    }
    return [{ type: 'user', data: user }];
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
            パートナーの組織構造と顧客の状況を可視化します。
          </p>
        </div>
        
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}><i className="fa-solid fa-user-tie"></i> 代理店</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0ea5e9' }}><i className="fa-solid fa-user-check"></i> 承認済</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}><i className="fa-solid fa-clock"></i> 申請中</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}><i className="fa-solid fa-user"></i> 顧客</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-sub)', borderLeft: '1px solid var(--border)', paddingLeft: '12px' }}><i className="fa-solid fa-briefcase"></i> 案件（顧客）</div>
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
        {rootElements.length > 0 ? rootElements.map((root, idx) => (
          <TreeNode 
            key={root.type + root.data.id + idx} 
            element={root} 
            level={0} 
            isAdmin={user.role === UserRole.ADMIN} 
            currentUser={user}
            allUsers={allUsers}
            allCases={allCases}
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
          box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.2) !important;
          border-color: var(--primary) !important;
        }
      `}</style>
    </div>
  );
};

export default TierTreePage;
