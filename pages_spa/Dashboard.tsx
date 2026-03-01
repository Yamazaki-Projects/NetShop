import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus, UserStatus, UserRole, Case, User } from '../types';
import { Card, Badge } from '../components/UI';

const StatCard = ({
  title,
  value,
  icon,
  gradient,
  subtext
}: {
  title: string;
  value: string | number;
  icon: string;
  gradient: string;
  subtext?: string;
}) => (
  <Card
    style={{
      padding: '32px',
      display: 'flex',
      alignItems: 'center',
      gap: '28px',
      border: 'none',
      background: 'var(--bg-card)'
    }}
  >
    <div
      style={{
        width: '72px',
        height: '72px',
        background: gradient,
        color: 'white',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.75rem'
      }}
    >
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <div>
      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>{value}</div>
      {subtext && (
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>
          {subtext}
        </div>
      )}
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
    if (!user) {
      // userが無い場合もローディング解除しておく（白画面防止）
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        const results = await Promise.allSettled([
          db.getCases(user),
          db.getAllCases(),
          db.getUsers(),
          db.getApprovedCount(user.id),
          db.calculateRate(user.id)
        ]);

        if (cancelled) return;

        if (results[0].status === 'fulfilled') setCases(results[0].value);
        if (results[1].status === 'fulfilled') setAllCases(results[1].value);
        if (results[2].status === 'fulfilled') setUsers(results[2].value);
        if (results[3].status === 'fulfilled') setApprovedCount(results[3].value);
        if (results[4].status === 'fulfilled') setCurrentRate(results[4].value);
      } catch (e) {
        console.error('[Dashboard] data load error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // ✅ Hooksは「必ず毎回」同じ順序で呼ばれる位置に置く（早期returnより前）

  const isAdmin = user?.role === UserRole.ADMIN;

  const estimatedRevenue = useMemo(() => {
    try {
      const src = cases || [];
      return src
        .filter((c) => c && c.status === CaseStatus.APPROVED)
        .reduce((sum, c) => {
          const manual = c.isManualAdjustment ? Number(c.manualAgencyAmount) || 0 : null;
          const normal = (Number(c.baseAmount || 0) || 0) * (Number(c.appliedRate || 0) || 0);
          return sum + (manual !== null ? manual : normal);
        }, 0);
    } catch {
      return 0;
    }
  }, [cases]);

  const totalSystemRevenue = useMemo(() => {
    try {
      const src = allCases || [];
      return src
        .filter((c) => c && c.status === CaseStatus.APPROVED)
        .reduce((sum, c) => sum + (Number(c.baseAmount) || 0), 0);
    } catch {
      return 0;
    }
  }, [allCases]);

  const currentMonthCount = useMemo(() => {
    try {
      const now = new Date();
      const src = cases || [];
      return src.filter((c) => {
        if (!c?.createdAt) return false;
        const d = new Date(c.createdAt);
        if (isNaN(d.getTime())) return false;
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
    } catch {
      return 0;
    }
  }, [cases]);

  const ranking = useMemo(() => {
    try {
      if (!users?.length || !allCases?.length) return [];

      const counts: Record<string, number> = {};
      allCases.forEach((c) => {
        if (!c?.referrerId) return;
        const key = String(c.referrerId).toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      });

      return users
        .map((u) => {
          if (!u) return null;
          const uid = (u.id || '').toLowerCase();
          const lid = (u.loginId || '').toLowerCase();
          return {
            id: u.id || '',
            name: u.name || '不明',
            loginId: u.loginId || '',
            count: counts[uid] || counts[lid] || 0,
            role: u.role,
            status: u.status
          };
        })
        .filter((u): u is any => u !== null && u.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    } catch (e) {
      console.error('[Dashboard] ranking calculation error:', e);
      return [];
    }
  }, [users, allCases]);

  // ✅ ここで初めて早期return（Hooksの後）
  if (!user || loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '48px', textAlign: 'left' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em' }}>
          Welcome back, {user.name} <span style={{ color: 'var(--accent)' }}>👋</span>
        </h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600, fontSize: '1.1rem', marginTop: '8px' }}>
          ログインID:{' '}
          <Badge color="var(--primary)" style={{ fontSize: '0.85rem' }}>
            {(user.loginId || '').toLowerCase()}
          </Badge>{' '}
          として認証されています。
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '28px',
          marginBottom: '48px'
        }}
      >
        {isAdmin ? (
          <>
            <StatCard
              title="全代理店数"
              value={`${(users || []).filter((u) => u && u.status === UserStatus.AGENCY).length} 名`}
              icon="fa-users"
              gradient="var(--grad-primary)"
            />
            <StatCard
              title="総承認案件"
              value={`${(allCases || []).filter((c) => c && c.status === CaseStatus.APPROVED).length} 件`}
              icon="fa-check-double"
              gradient="linear-gradient(135deg, #0ea5e9, #38bdf8)"
            />
            <StatCard
              title="流通総額"
              value={`¥${(totalSystemRevenue || 0).toLocaleString()}`}
              icon="fa-chart-line"
              gradient="linear-gradient(135deg, #10b981, #34d399)"
            />
          </>
        ) : (
          <>
            <StatCard title="累計直紹介数" value={`${(cases || []).length} 件`} icon="fa-user-plus" gradient="var(--grad-primary)" />
            <StatCard
              title="今月の直紹介数"
              value={`${(currentMonthCount || 0)} 件`}
              icon="fa-calendar-check"
              gradient="linear-gradient(135deg, #0ea5e9, #38bdf8)"
            />
            <StatCard
              title="確定報酬額"
              value={`¥${(estimatedRevenue || 0).toLocaleString()}`}
              icon="fa-sack-dollar"
              gradient="linear-gradient(135deg, #10b981, #34d399)"
            />
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px' }}>
        <Card title="直紹介ランキング (TOP 10)">
          {ranking.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-sub)', fontWeight: 700 }}>
              ランキングデータがありません。
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th className="align-center" style={{ padding: '16px', width: '80px' }}>
                      順位
                    </th>
                    <th className="align-left" style={{ padding: '16px' }}>
                      氏名 / ID
                    </th>
                    <th className="align-center" style={{ padding: '16px' }}>
                      区分
                    </th>
                    <th className="align-right" style={{ padding: '16px' }}>
                      紹介件数
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r: any, idx: number) => (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: r.id === user.id ? 'rgba(79, 70, 229, 0.05)' : 'transparent'
                      }}
                    >
                      <td className="align-center" style={{ padding: '16px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background:
                              idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'var(--bg-main)',
                            color: idx < 3 ? 'white' : 'var(--text-sub)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            margin: '0 auto'
                          }}
                        >
                          {idx + 1}
                        </div>
                      </td>
                      <td className="align-left" style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                          {r.name}{' '}
                          {r.id === user.id && (
                            <Badge color="var(--primary)" style={{ fontSize: '0.6rem', marginLeft: '4px' }}>
                              あなた
                            </Badge>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 700 }}>
                          {(r.loginId || '').toLowerCase()}
                        </div>
                      </td>
                      <td className="align-center" style={{ padding: '16px' }}>
                        <Badge color={r.status === UserStatus.AGENCY ? 'var(--primary)' : '#94a3b8'}>
                          {r.status === UserStatus.AGENCY ? '代理店' : '顧客'}
                        </Badge>
                      </td>
                      <td className="align-right" style={{ padding: '16px' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)' }}>{r.count}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginLeft: '4px', fontWeight: 700 }}>
                          件
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;