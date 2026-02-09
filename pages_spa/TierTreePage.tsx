
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { User, UserStatus, UserRole, Case } from '../types';
import { Badge, Button, Card } from '../components/UI';

// パートナー（User）を表示するためのコンポーネント
const TreeNode = ({ node, level, isAdmin, currentUser, allUsers, allCases }: { 
  node: User; 
  level: number; 
  isAdmin: boolean; 
  currentUser: User; 
  allUsers: User[]; 
  allCases: Case[];
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [stats, setStats] = useState<{ count: number; rate: number } | null>(null);
  const navigate = useNavigate();
  
  const children = useMemo(() => 
    allUsers.filter(u => u.referrerId === node.id),
    [allUsers, node.id]
  );

  useEffect(() => {
    const loadStats = async () => {
      const [count, rate] = await Promise.all([
        db.getApprovedCount(node.id),
        db.calculateRate(node.id)
      ]);
      setStats({ count, rate });
    };
    loadStats();
  }, [node.id]);

  const isSelf = currentUser.id === node.id;

  return (
    <div style={{ marginLeft: level === 0 ? 0 : '32px', marginBottom: '12px', borderLeft: level === 0 ? 'none' : '2px solid var(--border)', paddingLeft: level === 0 ? 0 : '24px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        padding: '16px 20px', 
        background: isSelf ? 'rgba(79, 70, 229, 0.05)' : 'var(--bg-card)', 
        borderRadius: '16px',
        border: isSelf ? '2px solid var(--primary)' : '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.2s'
      }}>
        <div 
          onClick={() => children.length > 0 && setIsExpanded(!isExpanded)}
          style={{ 
            width: '24px', 
            height: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: children.length > 0 ? 'pointer' : 'default',
            color: children.length > 0 ? 'var(--primary)' : 'var(--border)'
          }}
        >
          {children.length > 0 && (
            <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ fontSize: '0.8rem' }}></i>
          )}
        </div>

        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '10px', 
          background: node.role === UserRole.ADMIN ? 'var(--grad-primary)' : 'linear-gradient(45deg, #1e293b, #334155)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'white'
        }}>
          <i className={`fa-solid ${node.role === UserRole.ADMIN ? 'fa-crown' : 'fa-user'}`}></i>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>{node.name}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)' }}>{node.loginId}</span>
            {isSelf && <Badge color="var(--primary)">あなた</Badge>}
            {node.status === UserStatus.CUSTOMER && <Badge color="#94a3b8">顧客</Badge>}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
            {stats && (
              <>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)' }}>
                  承認案件: <span style={{ color: 'var(--accent)' }}>{stats.count}件</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)' }}>
                  報酬率: <span style={{ color: 'var(--primary)' }}>{Math.round(stats.rate * 100)}%</span>
                </div>
              </>
            )}
          </div>
        </div>

        {isAdmin && (
          <Button variant="ghost" onClick={() => navigate(`/agencies`)} style={{ padding: '8px 12px', fontSize: '0.75rem' }}>
            詳細
          </Button>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          {children.map(child => (
            <TreeNode 
              key={child.id} 
              node={child} 
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
      const [u, c] = await Promise.all([
        db.getUsers(),
        db.getAllCases()
      ]);
      setAllUsers(u);
      setAllCases(c);
      setLoading(false);
    };
    loadData();
  }, []);

  // 表示の起点となるユーザー（管理者の場合は最上位、代理店の場合は自分）
  const rootUsers = useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.ADMIN) {
      return allUsers.filter(u => !u.referrerId || u.role === UserRole.ADMIN);
    }
    return allUsers.filter(u => u.id === user.id);
  }, [allUsers, user]);

  if (loading || !user) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>読み込み中...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '40px', textAlign: 'left' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>ティアツリー <span style={{ color: 'var(--accent)' }}>.</span></h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600 }}>代理店パートナーの組織図と報酬ランクを可視化します。</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {rootUsers.map(root => (
          <TreeNode 
            key={root.id} 
            node={root} 
            level={0} 
            isAdmin={user.role === UserRole.ADMIN} 
            currentUser={user}
            allUsers={allUsers}
            allCases={allCases}
          />
        ))}
      </div>
    </div>
  );
};

export default TierTreePage;
