
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus, UserStatus, UserRole, AgencyApplicationStatus } from '../types';
import { Card, Button, Badge } from '../components/UI';

const StatCard = ({ title, value, icon, gradient, subtext }: { title: string; value: string | number; icon: string; gradient: string; subtext?: string }) => (
  <Card style={{ 
    padding: '32px', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '28px',
    border: 'none',
    background: 'var(--bg-card)',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{ 
      width: '72px', 
      height: '72px', 
      background: gradient, 
      color: 'white', 
      borderRadius: '20px', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      fontSize: '1.75rem',
      zIndex: 2
    }}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <div style={{ zIndex: 2 }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>{value}</div>
      {subtext && <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>{subtext}</div>}
    </div>
  </Card>
);

const Dashboard = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  if (!user) return null;

  const allCases = db.getCases(user);
  const allUsers = db.getUsers();
  
  const isAdmin = user.role === UserRole.ADMIN;
  const isAgency = user.status === UserStatus.AGENCY && !isAdmin;

  const approvedCount = db.getApprovedCount(user.id);
  const currentRate = db.calculateRate(user.id);
  const ratePercent = `${Math.round(currentRate * 100)}%`;
  
  const pendingAgencyApps = allUsers.filter(u => u.agencyApplicationStatus === AgencyApplicationStatus.PENDING);
  const pendingDeletions = allUsers.filter(u => u.isDeletionPending === true);

  const nextTierText = () => {
    if (user.manualRateOverride !== undefined) return "個別設定適用中";
    if (approvedCount >= 11) return "最高ランク達成中";
    if (approvedCount >= 2) return `あと ${11 - approvedCount} 件で 50%`;
    return `あと ${2 - approvedCount} 件で 40%`;
  };

  const estimatedRevenue = allCases
    .filter(c => c.status === CaseStatus.APPROVED)
    .reduce((sum, c) => {
      const reward = c.isManualAdjustment ? (c.manualAgencyAmount || 0) : (c.baseAmount * c.appliedRate);
      return sum + reward;
    }, 0);

  const totalSystemRevenue = db.getAllCases()
    .filter(c => c.status === CaseStatus.APPROVED)
    .reduce((sum, c) => sum + c.baseAmount, 0);
  const activeAgencies = allUsers.filter(u => u.status === UserStatus.AGENCY && u.role !== UserRole.ADMIN).length;

  const handleApprove = (userId: string) => {
    if (db.approveAgency(userId, user)) {
      alert('承認しました。');
      navigate(0);
    }
  };

  const handleConfirmDeletion = (userId: string) => {
    if (confirm('この顧客を完全に削除しますか？関連する案件データもすべて消去されます。')) {
      db.confirmUserDeletion(userId, user);
      alert('削除を完了しました。');
      navigate(0);
    }
  };

  const handleRejectDeletion = (userId: string) => {
    db.cancelUserDeletion(userId, user);
    alert('削除申請を却下しました。');
    navigate(0);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '48px', textAlign: 'left' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, marginBottom: '10px', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Welcome, {user.name.split(' ')[0]} <span style={{ color: 'var(--primary)' }}>.</span>
        </h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600, fontSize: '1.1rem' }}>
          {isAdmin ? 'システム全体の状況を確認できます。' : (isAgency ? '報酬状況と案件進捗を確認しましょう。' : '共同運営パートナーとして参加中です。')}
        </p>
      </header>

      {isAdmin ? (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '28px', 
            marginBottom: '48px' 
          }}>
            <StatCard title="全代理店数" value={`${activeAgencies} 名`} icon="fa-users" gradient="var(--grad-primary)" />
            <StatCard title="総承認案件数" value={`${db.getAllCases().filter(c => c.status === CaseStatus.APPROVED).length} 件`} icon="fa-check-double" gradient="linear-gradient(135deg, #0ea5e9, #38bdf8)" />
            <StatCard title="システム流通総額" value={`¥${totalSystemRevenue.toLocaleString()}`} icon="fa-chart-line" gradient="linear-gradient(135deg, #10b981, #34d399)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: pendingDeletions.length > 0 ? '1fr 1fr' : '1fr', gap: '32px', marginBottom: '48px' }}>
            {pendingAgencyApps.length > 0 && (
              <Card title="承認待ちの代理店申請" style={{ border: '2px solid var(--primary)' }}>
                <div style={{ padding: '0 28px 28px' }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: '0 12px' }}>
                    <tbody>
                      {pendingAgencyApps.map(appUser => (
                        <tr key={appUser.id} style={{ background: 'var(--bg-main)' }}>
                          <td style={{ padding: '16px', borderRadius: '12px 0 0 12px', fontWeight: 800 }}>
                            {appUser.name} <span style={{ color: 'var(--text-sub)', fontWeight: 600, fontSize: '0.8rem' }}>({appUser.loginId})</span>
                          </td>
                          <td style={{ padding: '16px', color: 'var(--text-sub)', fontSize: '0.85rem' }}>
                            紹介元: {db.getUserById(appUser.referrerId || '')?.name || '---'}
                          </td>
                          <td style={{ padding: '16px', borderRadius: '0 12px 12px 0', textAlign: 'right' }}>
                            <Button onClick={() => handleApprove(appUser.id)} style={{ padding: '8px 20px' }}>承認</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {pendingDeletions.length > 0 && (
              <Card title="削除申請中の顧客" style={{ border: '2px solid #ef4444' }}>
                <div style={{ padding: '0 28px 28px' }}>
                  <table style={{ borderCollapse: 'separate', borderSpacing: '0 12px' }}>
                    <tbody>
                      {pendingDeletions.map(delUser => (
                        <tr key={delUser.id} style={{ background: 'var(--bg-main)' }}>
                          <td style={{ padding: '16px', borderRadius: '12px 0 0 12px', fontWeight: 800 }}>
                            {delUser.name} <Badge color="#ef4444" style={{ marginLeft: '8px' }}>削除申請中</Badge>
                          </td>
                          <td style={{ padding: '16px', color: 'var(--text-sub)', fontSize: '0.85rem' }}>
                            申請者: {db.getUserById(delUser.referrerId || '')?.name || '---'}
                          </td>
                          <td style={{ padding: '16px', borderRadius: '0 12px 12px 0', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button onClick={() => handleConfirmDeletion(delUser.id)} variant="danger" style={{ padding: '8px 16px', background: '#ef4444' }}>削除承認</Button>
                            <Button onClick={() => handleRejectDeletion(delUser.id)} variant="ghost" style={{ padding: '8px 16px', border: '1px solid var(--border)' }}>却下</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </>
      ) : isAgency ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '28px', 
          marginBottom: '48px' 
        }}>
          <StatCard title="現在の報酬率" value={ratePercent} icon="fa-percent" gradient="var(--grad-primary)" subtext={nextTierText()} />
          <StatCard title="承認済み案件" value={`${approvedCount} 件`} icon="fa-handshake" gradient="linear-gradient(135deg, #0ea5e9, #38bdf8)" />
          <StatCard title="見込み報酬総額" value={`¥${estimatedRevenue.toLocaleString()}`} icon="fa-sack-dollar" gradient="linear-gradient(135deg, #10b981, #34d399)" />
        </div>
      ) : (
        <div style={{ 
          background: 'var(--bg-card)', 
          padding: '40px', 
          borderRadius: '24px', 
          border: '1px solid var(--border)', 
          marginBottom: '48px',
          textAlign: 'center'
        }}>
          <h2 style={{ fontWeight: 800, marginBottom: '16px' }}>代理店に昇格して報酬を受け取りましょう</h2>
          <p style={{ color: 'var(--text-sub)', marginBottom: '24px' }}>代理店になると、紹介1件につき最大 ¥99,000 (50%) の報酬が発生します。</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Badge color="#f59e0b">
              {user.agencyApplicationStatus === AgencyApplicationStatus.PENDING ? '紹介元代理店による申請を確認中...' : '紹介元代理店に申請を依頼してください'}
            </Badge>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '32px', alignItems: 'start' }}>
        <Card title={isAdmin ? "システム全体の最新案件" : "最近の案件状況"}>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th className="align-left">顧客名</th>
                  <th className="align-right">{isAdmin ? "代理店名" : "報酬(見込)"}</th>
                </tr>
              </thead>
              <tbody>
                {allCases.slice(0, 5).map(c => (
                  <tr key={c.id}>
                    <td className="align-left">
                      <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{c.customerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 700 }}>{c.platform}</div>
                    </td>
                    <td className="align-right">
                      {isAdmin ? (
                         <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.85rem' }}>{c.agencyName}</div>
                      ) : (
                        <div style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.85rem' }}>
                          {isAgency ? `¥${(c.isManualAdjustment ? (c.manualAgencyAmount || 0) : (c.baseAmount * c.appliedRate)).toLocaleString()}` : '¥0'}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="ティアツリー情報">
          <div style={{ padding: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }}></div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{isAdmin ? 'システム全参加者数' : '直紹介パートナー'}: {isAdmin ? allUsers.length - 1 : allUsers.filter(u => u.referrerId === user?.id).length}名</div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', lineHeight: '1.6' }}>
              あなたの紹介で参加したユーザーの階層構造を確認できます。
              承認案件数に応じて、報酬率がランクアップします。
            </p>
            <Link to="/tree">
              <button className="btn btn-ghost" style={{ width: '100%', marginTop: '16px', border: '1px solid var(--border)' }}>
                ツリー詳細を表示
              </button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
