
import React, { useState, useEffect } from 'react';
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
      const results = await Promise.allSettled([
        db.getCases(user),
        db.getAllCases(),
        db.getUsers(),
        db.getApprovedCount(user.id),
        db.calculateRate(user.id)
      ]);

      if (results[0].status === 'fulfilled') setCases(results[0].value);
      if (results[1].status === 'fulfilled') setAllCases(results[1].value);
      if (results[2].status === 'fulfilled') setUsers(results[2].value);
      if (results[3].status === 'fulfilled') setApprovedCount(results[3].value);
      if (results[4].status === 'fulfilled') setCurrentRate(results[4].value);
      
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

  const now = new Date();
  const currentMonthCount = cases.filter(c => {
    const d = new Date(c.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '48px', textAlign: 'left' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>Welcome back, {user.name} <span style={{ color: 'var(--accent)' }}>👋</span></h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600, fontSize: '1.1rem', marginTop: '8px' }}>
          ログインID: <Badge color="var(--primary)" style={{ fontSize: '0.85rem' }}>{user.loginId.toLowerCase()}</Badge> として認証されています。
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
            <StatCard title="累計直紹介数" value={`${cases.length} 件`} icon="fa-user-plus" gradient="var(--grad-primary)" />
            <StatCard title="今月の直紹介数" value={`${currentMonthCount} 件`} icon="fa-calendar-check" gradient="linear-gradient(135deg, #0ea5e9, #38bdf8)" />
            <StatCard title="確定報酬額" value={`¥${estimatedRevenue.toLocaleString()}`} icon="fa-sack-dollar" gradient="linear-gradient(135deg, #10b981, #34d399)" />
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
