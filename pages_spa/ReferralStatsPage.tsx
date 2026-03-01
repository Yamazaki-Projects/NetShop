
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { Case, User } from '../types';
import { Card, AgencyStatusBadge } from '../components/UI';

const ReferralStatsPage = () => {
  const { user } = useAppContext();
  const [myCases, setMyCases] = useState<Case[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [cases, users] = await Promise.all([
          db.getCases(user),
          db.getUsers()
        ]);
        setMyCases(cases);
        setAllUsers(users);
      } catch (e) {
        console.error("Failed to load referral stats", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const cumulative = myCases.length;
    const monthly = myCases.filter(c => {
      const d = new Date(c.createdAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    // 月ごとの集計
    const monthlyBreakdown: Record<string, number> = {};
    myCases.forEach(c => {
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}/${d.getMonth() + 1}`;
      monthlyBreakdown[key] = (monthlyBreakdown[key] || 0) + 1;
    });

    // 直近6ヶ月分を生成
    const recentMonths = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}/${d.getMonth() + 1}`;
      recentMonths.push({
        label: `${d.getFullYear()}年${d.getMonth() + 1}月`,
        count: monthlyBreakdown[key] || 0
      });
    }

    return { cumulative, monthly, recentMonths };
  }, [myCases]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em' }}>
          紹介統計 <span style={{ color: 'var(--primary)' }}>.</span>
        </h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px' }}>
          あなたの紹介実績を確認できます。
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: '12px' }}>累計直紹介数</div>
          <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>{stats.cumulative}</div>
          <div style={{ marginTop: '12px', color: 'var(--text-sub)', fontWeight: 700 }}>件</div>
        </Card>

        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: '12px' }}>今月の直紹介数</div>
          <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>{stats.monthly}</div>
          <div style={{ marginTop: '12px', color: 'var(--text-sub)', fontWeight: 700 }}>件</div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <Card title="月次推移 (直近6ヶ月)">
          <div style={{ padding: '20px' }}>
            {stats.recentMonths.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx === stats.recentMonths.length - 1 ? 'none' : '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{m.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '100px', height: '8px', background: 'var(--bg-main)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, (m.count / (Math.max(...stats.recentMonths.map(x => x.count)) || 1)) * 100)}%`, height: '100%', background: 'var(--primary)' }}></div>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)', minWidth: '30px', textAlign: 'right' }}>{m.count}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="最近の紹介案件">
          {myCases.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-sub)', fontWeight: 700 }}>まだ紹介案件がありません。</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="align-left" style={{ padding: '16px', color: 'var(--text-sub)', fontSize: '0.75rem', textTransform: 'uppercase' }}>顧客名</th>
                    <th className="align-center" style={{ padding: '16px', color: 'var(--text-sub)', fontSize: '0.75rem', textTransform: 'uppercase' }}>代理店状況</th>
                    <th className="align-right" style={{ padding: '16px', color: 'var(--text-sub)', fontSize: '0.75rem', textTransform: 'uppercase' }}>登録日</th>
                  </tr>
                </thead>
                <tbody>
                  {myCases.slice(0, 5).map(c => (
                    <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="align-left" style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{c.customerName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>{(c.id || '').toLowerCase()}</div>
                      </td>
                      <td className="align-center" style={{ padding: '16px' }}>
                        <AgencyStatusBadge caseId={c.id} email={c.email} allUsers={allUsers} />
                      </td>
                      <td className="align-right" style={{ padding: '16px', fontWeight: 700, color: 'var(--text-sub)' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
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

export default ReferralStatsPage;
