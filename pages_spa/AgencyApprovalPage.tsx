
import React, { useState, useEffect } from 'react';
import { db } from '../services/dbService';
import { useAppContext } from '../App';
import { User, UserRole, AgencyApplicationStatus } from '../types';
import { Card, Button, Badge } from '../components/UI';

const AgencyApprovalPage = () => {
  const { user: currentUser } = useAppContext();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await db.getPendingApplications();
    setPendingUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser?.role === UserRole.ADMIN) {
      loadData();
    }
  }, [currentUser]);

  const handleApprove = async (customerId: string) => {
    if (!window.confirm(`顧客ID: ${customerId} の代理店昇格を承認しますか？`)) return;
    setActionLoading(customerId);
    const result = await db.approveApplication(customerId);
    if (result.ok) {
      alert('承認しました。対象の顧客IDで本登録が可能になります。');
      loadData();
    } else {
      alert(result.message || 'エラーが発生しました。');
    }
    setActionLoading(null);
  };

  const handleReject = async (customerId: string) => {
    if (!window.confirm(`顧客ID: ${customerId} の申請を却下しますか？`)) return;
    setActionLoading(customerId);
    const result = await db.rejectApplication(customerId);
    if (result.ok) {
      alert('却下しました。');
      loadData();
    } else {
      alert(result.message || 'エラーが発生しました。');
    }
    setActionLoading(null);
  };

  if (currentUser?.role !== UserRole.ADMIN) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>アクセス権限がありません。</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>代理店申請承認</h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px' }}>パートナー各社からの代理店昇格申請を管理します。</p>
      </header>

      <Card title={`未処理の申請 (${pendingUsers.length})`}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-sub)' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-sub)' }}>
            <i className="fa-solid fa-clipboard-check" style={{ fontSize: '3rem', marginBottom: '20px', opacity: 0.2 }}></i>
            <p style={{ fontWeight: 700 }}>現在、未処理の申請はありません。</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '800px' }}>
              <thead>
                <tr>
                  <th className="align-left">顧客ID</th>
                  <th className="align-left">氏名/屋号</th>
                  <th className="align-left">申請日時</th>
                  <th className="align-right">アクション</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map(user => (
                  <tr key={user.id}>
                    <td className="align-left">
                      <Badge color="var(--primary)" style={{ fontWeight: 800 }}>{user.loginId}</Badge>
                    </td>
                    <td className="align-left">
                      <div style={{ fontWeight: 800 }}>{user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{user.email}</div>
                    </td>
                    <td className="align-left" style={{ fontSize: '0.85rem', color: 'var(--text-sub)' }}>
                      {new Date(user.createdAt).toLocaleString()}
                    </td>
                    <td className="align-right">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Button 
                          variant="ghost" 
                          onClick={() => handleReject(user.loginId)}
                          disabled={!!actionLoading}
                          style={{ color: '#ef4444', border: '1px solid #fee2e2' }}
                        >
                          却下
                        </Button>
                        <Button 
                          onClick={() => handleApprove(user.loginId)}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === user.loginId ? <i className="fa-solid fa-spinner fa-spin"></i> : '承認する'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div style={{ marginTop: '40px', padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '12px' }}>承認後の流れ</h3>
        <ul style={{ fontSize: '0.85rem', color: 'var(--text-sub)', fontWeight: 600, lineHeight: 1.8, paddingLeft: '20px' }}>
          <li>承認されると、対象の顧客IDは「登録可能」な状態になります。</li>
          <li>顧客（または担当代理店）は、新規代理店登録画面で顧客IDを入力し、パスワードを設定できるようになります。</li>
          <li>パスワード設定が完了すると、自動的に「代理店」ステータスへ移行し、システムへのログインが可能になります。</li>
        </ul>
      </div>
    </div>
  );
};

export default AgencyApprovalPage;
