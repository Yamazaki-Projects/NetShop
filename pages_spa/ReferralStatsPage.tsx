
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { Case, User, InitialCommission, UserRole, isAdminRole } from '../types';
import { Card, AgencyStatusBadge } from '../components/UI';

const ReferralStatsPage = () => {
  const { user } = useAppContext();
  const [myCases, setMyCases] = useState<Case[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [commissions, setCommissions] = useState<InitialCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const isAdmin = isAdminRole(user?.role);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          db.getCases(user),
          db.getUsers(),
          db.getAllCases(),
          isAdmin ? db.getInitialCommissions() : db.getInitialCommissions(user.id)
        ]);
        if (results[0].status === 'fulfilled') setMyCases(results[0].value);
        if (results[1].status === 'fulfilled') setAllUsers(results[1].value);
        if (results[2].status === 'fulfilled') setAllCases(results[2].value);
        if (results[3].status === 'fulfilled') setCommissions(results[3].value as InitialCommission[]);
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

    const monthlyBreakdown: Record<string, number> = {};
    myCases.forEach(c => {
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}/${d.getMonth() + 1}`;
      monthlyBreakdown[key] = (monthlyBreakdown[key] || 0) + 1;
    });

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

  // 月次報酬ツリー: 誰から何%もらえるかを計算
  const commissionTree = useMemo(() => {
    if (!user || isAdmin) return [];
    const plan = user.membershipPlan || 'free';
    const userId = (user.id || '').toLowerCase();
    const loginId = (user.loginId || '').toLowerCase();

    // 直紹介案件 (level=1)
    const directCases = allCases.filter(c => {
      const rId = (c.referrerId || '').toLowerCase();
      return rId === userId || rId === loginId;
    });

    const result: { caseId: string; companyName: string; level: number; rate: number; color: string }[] = [];

    directCases.forEach(c => {
      const directRate = plan === '198k' ? 2 : 1;
      result.push({
        caseId: c.id,
        companyName: [c.repLastName, c.repFirstName].filter(Boolean).join(' ') || c.companyName || c.id,
        level: 1,
        rate: directRate,
        color: plan === '198k' ? '#10b981' : '#0ea5e9'
      });

      // 2段目 (198kプランのみ)
      if (plan === '198k') {
        const childUser = allUsers.find(u => (u.loginId || '').toLowerCase() === (c.id || '').toLowerCase());
        if (childUser) {
          const childId = (childUser.id || '').toLowerCase();
          const childLoginId = (childUser.loginId || '').toLowerCase();
          const secondCases = allCases.filter(sc => {
            const rId = (sc.referrerId || '').toLowerCase();
            return rId === childId || rId === childLoginId;
          });
          secondCases.forEach(sc => {
            result.push({
              caseId: sc.id,
              companyName: sc.companyName || sc.id,
              level: 2,
              rate: 1,
              color: '#8b5cf6'
            });
          });
        }
      }
    });

    return result;
  }, [user, allCases, allUsers, isAdmin]);

  const totalCommissionAmount = useMemo(() =>
    commissions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0),
  [commissions]);

  const pendingCommissionAmount = useMemo(() =>
    commissions.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0),
  [commissions]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
      </div>
    );
  }

  const isMobile = windowWidth < 768;

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: isMobile ? '1.5rem' : '2.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em' }}>
          報酬統計 <span style={{ color: 'var(--primary)' }}>.</span>
        </h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px' }}>
          紹介実績と報酬の状況を確認できます。
        </p>
      </header>

      {/* 紹介件数サマリー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '12px' }}>累計直紹介数</div>
          <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>{stats.cumulative}</div>
          <div style={{ marginTop: '12px', color: 'var(--text-sub)', fontWeight: 700 }}>件</div>
        </Card>
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '12px' }}>今月の直紹介数</div>
          <div style={{ fontSize: '4rem', fontWeight: 900, color: '#0ea5e9', lineHeight: 1 }}>{stats.monthly}</div>
          <div style={{ marginTop: '12px', color: 'var(--text-sub)', fontWeight: 700 }}>件</div>
        </Card>
      </div>

      {/* 20%初期報酬 */}
      <div style={{ marginBottom: '40px' }}>
        <Card title={isAdmin ? '初期報酬一覧 (全代理店)' : '20%初期報酬 (ショット)'}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', padding: '16px 0', marginBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '6px' }}>支払済合計</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a' }}>¥{totalCommissionAmount.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '6px' }}>未払い合計</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#b45309' }}>¥{pendingCommissionAmount.toLocaleString()}</div>
            </div>
          </div>

          {commissions.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-sub)', fontWeight: 700 }}>
              {user?.membershipPlan !== '198k' && !isAdmin
                ? '198,000円プランのみ20%初期報酬の対象です。'
                : '初期報酬の記録がありません。'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {isAdmin && <th className="align-left" style={{ padding: '12px 16px', color: 'var(--text-sub)', fontSize: '0.75rem' }}>受取代理店</th>}
                    <th className="align-left" style={{ padding: '12px 16px', color: 'var(--text-sub)', fontSize: '0.75rem' }}>案件（会社名）</th>
                    <th className="align-right" style={{ padding: '12px 16px', color: 'var(--text-sub)', fontSize: '0.75rem' }}>報酬額</th>
                    <th className="align-center" style={{ padding: '12px 16px', color: 'var(--text-sub)', fontSize: '0.75rem' }}>状況</th>
                    <th className="align-right" style={{ padding: '12px 16px', color: 'var(--text-sub)', fontSize: '0.75rem' }}>発生日</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map(c => (
                    <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                      {isAdmin && (
                        <td className="align-left" style={{ padding: '14px 16px', fontWeight: 800 }}>{c.recipientName}</td>
                      )}
                      <td className="align-left" style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{c.caseCompanyName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>{c.caseId.toLowerCase()}</div>
                      </td>
                      <td className="align-right" style={{ padding: '14px 16px', fontWeight: 900, fontSize: '1.05rem' }}>
                        ¥{c.amount.toLocaleString()}
                      </td>
                      <td className="align-center" style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px',
                          background: c.status === 'paid' ? '#dcfce7' : '#fef3c7',
                          color: c.status === 'paid' ? '#16a34a' : '#b45309'
                        }}>
                          {c.status === 'paid' ? '支払済' : '未払い'}
                        </span>
                      </td>
                      <td className="align-right" style={{ padding: '14px 16px', color: 'var(--text-sub)', fontWeight: 700, fontSize: '0.85rem' }}>
                        {new Date(c.createdAt).toLocaleDateString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '24px' }}>
        {/* 月次売上報酬ツリー */}
        {!isAdmin && (
          <Card title="月次売上報酬の対象ショップ">
            {commissionTree.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-sub)', fontWeight: 700 }}>
                報酬対象のショップがありません。
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {commissionTree.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: idx === commissionTree.length - 1 ? 'none' : '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.9rem' }}>{item.companyName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 700 }}>{item.caseId.toLowerCase()}</div>
                    </div>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 900, padding: '4px 12px', borderRadius: '8px',
                      background: item.color, color: 'white', whiteSpace: 'nowrap'
                    }}>
                      {item.level === 1 ? '直紹介' : '2段目'} {item.rate}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 月次推移 */}
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

        {/* 最近の紹介案件 */}
        <Card title="最近の紹介案件">
          {myCases.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-sub)', fontWeight: 700 }}>まだ紹介案件がありません。</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="align-left" style={{ padding: '16px', color: 'var(--text-sub)', fontSize: '0.75rem' }}>顧客名</th>
                    <th className="align-center" style={{ padding: '16px', color: 'var(--text-sub)', fontSize: '0.75rem' }}>代理店状況</th>
                    <th className="align-right" style={{ padding: '16px', color: 'var(--text-sub)', fontSize: '0.75rem' }}>登録日</th>
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
