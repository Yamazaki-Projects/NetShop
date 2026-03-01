
import React, { useState, useEffect } from 'react';
import { db } from '../services/dbService';
import { useAppContext } from '../App';
import { User, UserRole, UserStatus, AgencyApplicationStatus } from '../types';
import { Card, Button, Badge } from '../components/UI';

const AgencyApprovalPage = () => {
  const { user: currentUser } = useAppContext();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  const loadData = async () => {
    setLoading(true);
    const all = await db.getUsers();
    setPendingUsers(all.filter(u => u.agencyApplicationStatus === AgencyApplicationStatus.PENDING));
    setApprovedUsers(all.filter(u => u.agencyApplicationStatus === AgencyApplicationStatus.APPROVED && u.status === UserStatus.CUSTOMER));
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser?.role === UserRole.ADMIN) {
      loadData();
    }
  }, [currentUser]);

  const handleApprove = async (customerId: string) => {
    if (!window.confirm(`顧客ID: ${customerId} の代理店昇格を承認しますか？承認と同時に登録コードが発行されます。`)) return;
    setActionLoading(customerId);
    const result = await db.approveApplication(customerId);
    if (result.ok) {
      alert('承認完了しました。登録コードが生成されました。');
      loadData();
    } else {
      alert(result.message || 'エラーが発生しました。');
    }
    setActionLoading(null);
  };

  if (currentUser?.role !== UserRole.ADMIN) return null;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)' }}>代理店昇格 承認管理</h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px' }}>パートナー各社からの昇格申請の確認と、登録コードの発行状況を管理します。</p>
      </header>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '32px' }}>
        <button onClick={() => setActiveTab('pending')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'pending' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'pending' ? '4px solid var(--primary)' : '4px solid transparent' }}>
          未処理の申請 ({pendingUsers.length})
        </button>
        <button onClick={() => setActiveTab('approved')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'approved' ? 'var(--accent)' : 'var(--text-sub)', borderBottom: activeTab === 'approved' ? '4px solid var(--accent)' : '4px solid transparent' }}>
          承認済み/未登録 ({approvedUsers.length})
        </button>
      </div>

      <Card title={activeTab === 'pending' ? "昇格申請一覧" : "承認済み（登録待ち）一覧"}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i></div>
        ) : (activeTab === 'pending' ? pendingUsers : approvedUsers).length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-sub)' }}>
            <p style={{ fontWeight: 700 }}>表示するデータがありません。</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th className="align-left">顧客ID</th>
                  <th className="align-left">氏名/屋号</th>
                  {activeTab === 'approved' && <th className="align-center">登録コード</th>}
                  <th className="align-right">{activeTab === 'pending' ? '申請日' : '承認日'}</th>
                  <th className="align-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'pending' ? pendingUsers : approvedUsers).map(user => (
                  <tr key={user.id}>
                    <td className="align-left"><Badge color="var(--primary)">{(user.loginId || '').toLowerCase()}</Badge></td>
                    <td className="align-left">
                      <div style={{ fontWeight: 800 }}>{user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{user.email}</div>
                    </td>
                    {activeTab === 'approved' && (
                      <td className="align-center">
                        <div style={{ background: '#f0f9ff', padding: '4px 12px', borderRadius: '8px', border: '1px solid #bae6fd', color: '#0369a1', fontWeight: 900, fontFamily: 'monospace', fontSize: '1.1rem' }}>
                          {user.registrationCode}
                        </div>
                      </td>
                    )}
                    <td className="align-right" style={{ color: 'var(--text-sub)', fontSize: '0.85rem' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="align-right">
                      {activeTab === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <Button variant="ghost" style={{ color: '#ef4444' }}>却下</Button>
                          <Button onClick={() => handleApprove(user.loginId)} disabled={!!actionLoading}>
                            {actionLoading === user.loginId ? <i className="fa-solid fa-spinner fa-spin"></i> : '承認する'}
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" style={{ border: '1px solid var(--border)' }} onClick={() => db.reissueRegistrationCode(user.loginId).then(loadData)}>再発行</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AgencyApprovalPage;
