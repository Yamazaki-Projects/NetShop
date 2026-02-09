
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus, UserStatus, UserRole, Case, User } from '../types';
import { Card, Badge } from '../components/UI';

const StatCard = ({ title, value, icon, gradient, subtext }: { title: string; value: string | number; icon: string; gradient: string; subtext?: string }) => (
  <Card style={{ padding: '32px', display: 'flex', alignItems: 'center', gap: '28px', border: 'none', background: 'var(--bg-card)' }}>
    <div style={{ width: '72px', height: '72px', background: gradient, color: 'white', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <div>
      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>{value}</div>
      {subtext && <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>{subtext}</div>}
    </div>
  </Card>
);

const Dashboard = () => {
  const { user } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [approvedCount, setApprovedCount] = useState(0);
  const [currentRate, setCurrentRate] = useState(0.3);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setLoading(true);
      const [userCases, sysCases, sysUsers, count, rate] = await Promise.all([
        db.getCases(user),
        db.getAllCases(),
        db.getUsers(),
        db.getApprovedCount(user.id),
        db.calculateRate(user.id)
      ]);
      setCases(userCases);
      setAllCases(sysCases);
      setUsers(sysUsers);
      setApprovedCount(count);
      setCurrentRate(rate);
      setLoading(false);
    };
    loadData();
  }, [user]);

  if (!user || loading) return (
    <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
    </div>
  );

  const isAdmin = user.role === UserRole.ADMIN;

  const estimatedRevenue = cases
    .filter(c => c.status === CaseStatus.APPROVED)
    .reduce((sum, c) => sum + (c.isManualAdjustment ? (c.manualAgencyAmount || 0) : (c.baseAmount * c.appliedRate)), 0);

  const totalSystemRevenue = allCases
    .filter(c => c.status === CaseStatus.APPROVED)
    .reduce((sum, c) => sum + c.baseAmount, 0);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '48px', textAlign: 'left' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Welcome back, {user.name} <span style={{ color: 'var(--accent)' }}>👋</span></h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600, fontSize: '1.1rem', marginTop: '8px' }}>
          ログインID: <Badge color="var(--primary)" style={{ fontSize: '0.85rem' }}>{user.loginId}</Badge> として認証されています。
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', marginBottom: '48px' }}>
        {isAdmin ? (
          <>
            <StatCard title="全代理店数" value={`${users.filter(u => u.status === UserStatus.AGENCY).length} 名`} icon="fa-users" gradient="var(--grad-primary)" />
            <StatCard title="総承認案件" value={`${allCases.filter(c => c.status === CaseStatus.APPROVED).length} 件`} icon="fa-check-double" gradient="linear-gradient(135deg, #0ea5e9, #38bdf8)" />
            <StatCard title="流通総額" value={`¥${totalSystemRevenue.toLocaleString()}`} icon="fa-chart-line" gradient="linear-gradient(135deg, #10b981, #34d399)" />
          </>
        ) : (
          <>
            <StatCard title="現在の報酬率" value={`${Math.round(currentRate * 100)}%`} icon="fa-percent" gradient="var(--grad-primary)" subtext={`承認数 ${approvedCount}件 に基づく`} />
            <StatCard title="承認案件数" value={`${approvedCount} 件`} icon="fa-handshake" gradient="linear-gradient(135deg, #0ea5e9, #38bdf8)" />
            <StatCard title="確定報酬額" value={`¥${estimatedRevenue.toLocaleString()}`} icon="fa-sack-dollar" gradient="linear-gradient(135deg, #10b981, #34d399)" />
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
        <Card title="最近の案件" style={{ textAlign: 'left' }}>
          <table>
            <thead>
              <tr><th>顧客名</th><th className="align-right">進捗</th></tr>
            </thead>
            <tbody>
              {cases.length > 0 ? cases.slice(0, 5).map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 800 }}>{c.customerName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{c.id}</div>
                  </td>
                  <td className="align-right">
                    <Badge color="var(--primary)" style={{ fontSize: '0.7rem' }}>{c.status}</Badge>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={2} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-sub)' }}>案件がありません</td></tr>
              )}
            </tbody>
          </table>
          <div style={{ padding: '20px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <Link to="/cases" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 800, textDecoration: 'none' }}>すべての案件を見る</Link>
          </div>
        </Card>

        <Card title="システム通知" style={{ textAlign: 'left' }}>
           <div style={{ padding: '24px' }}>
             <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
               <div style={{ padding: '10px', background: '#eff6ff', borderRadius: '10px', height: 'fit-content' }}>
                 <i className="fa-solid fa-bell" style={{ color: '#3b82f6' }}></i>
               </div>
               <div>
                 <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>報酬率アップのチャンス</div>
                 <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '4px', lineHeight: 1.5 }}>承認案件が2件以上になると報酬率が40%にアップします。現在の承認数は {approvedCount}件 です。</p>
               </div>
             </div>
             <div style={{ display: 'flex', gap: '16px' }}>
               <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '10px', height: 'fit-content' }}>
                 <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }}></i>
               </div>
               <div>
                 <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>本人確認の不備にご注意ください</div>
                 <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '4px', lineHeight: 1.5 }}>最近、提出書類の画像が不鮮明なケースが増えています。スキャナまたは高解像度カメラをご利用ください。</p>
               </div>
             </div>
           </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
