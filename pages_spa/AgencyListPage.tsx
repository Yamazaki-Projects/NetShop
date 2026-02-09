
import React, { useState, useEffect } from 'react';
import { db } from '../services/dbService';
import { useAppContext } from '../App';
import { User, UserRole, UserStatus } from '../types';
import { Card, Input, Button, Badge } from '../components/UI';

const AgencyListPage = () => {
  const { user: currentUser } = useAppContext();
  const [agencies, setAgencies] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, { count: number; rate: number }>>({});
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    manualBaseAmountOverride: 198000,
    manualRateOverride: 0.3
  });

  const loadAgencies = async () => {
    setLoading(true);
    const allUsers = await db.getUsers();
    const filteredAgencies = allUsers.filter(u => u.status === UserStatus.AGENCY && u.role !== UserRole.ADMIN);
    setAgencies(filteredAgencies);

    // 各代理店の統計情報を並列取得
    const stats: Record<string, { count: number; rate: number }> = {};
    await Promise.all(filteredAgencies.map(async (a) => {
      const [count, rate] = await Promise.all([
        db.getApprovedCount(a.id),
        db.calculateRate(a.id)
      ]);
      stats[a.id] = { count, rate };
    }));
    setStatsMap(stats);
    setLoading(false);
  };

  useEffect(() => {
    if (currentUser?.role === UserRole.ADMIN) {
      loadAgencies();
    }
  }, [currentUser]);

  if (currentUser?.role !== UserRole.ADMIN) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>このページを表示する権限がありません。</div>;
  }

  const handleEditClick = (agency: User) => {
    const stat = statsMap[agency.id];
    setEditingUserId(agency.id);
    setEditForm({
      manualBaseAmountOverride: agency.manualBaseAmountOverride || 198000,
      manualRateOverride: agency.manualRateOverride !== undefined ? agency.manualRateOverride : (stat?.rate || 0.3)
    });
  };

  const handleSave = async () => {
    if (editingUserId && currentUser) {
      await db.updateUserRewardConfig(editingUserId, editForm, currentUser);
      setEditingUserId(null);
      await loadAgencies(); // リロード
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '40px', textAlign: 'left' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>代理店管理</h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600 }}>代理店パートナーごとの基本報酬条件を設定します。</p>
      </header>

      <Card>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>読み込み中...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th className="align-left">代理店名 / ID</th>
                  <th className="align-left">メールアドレス</th>
                  <th className="align-center">承認案件数</th>
                  <th className="align-right">報酬設定</th>
                  <th className="align-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map(agency => {
                  const stat = statsMap[agency.id];
                  return (
                    <tr key={agency.id}>
                      <td className="align-left">
                        <div style={{ fontWeight: 800 }}>{agency.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 700 }}>{agency.loginId}</div>
                      </td>
                      <td className="align-left" style={{ fontSize: '0.85rem' }}>{agency.email}</td>
                      <td className="align-center">
                        <Badge color="var(--accent)">{stat?.count || 0} 件</Badge>
                      </td>
                      <td className="align-right">
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          ¥{(agency.manualBaseAmountOverride || 198000).toLocaleString()} / {Math.round((agency.manualRateOverride !== undefined ? agency.manualRateOverride : (stat?.rate || 0)) * 100)}%
                        </div>
                        {agency.manualRateOverride !== undefined && <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800 }}>個別設定適用中</div>}
                      </td>
                      <td className="align-right">
                        <Button variant="ghost" onClick={() => handleEditClick(agency)} style={{ border: '1px solid var(--border)', padding: '6px 12px', fontSize: '0.8rem' }}>
                          設定変更
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editingUserId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '480px', borderRadius: '24px', padding: '40px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px' }}>報酬条件の個別設定</h2>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', fontWeight: 800, marginBottom: '4px' }}>対象代理店</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900 }}>{agencies.find(a => a.id === editingUserId)?.name}</div>
            </div>

            <Input 
              label="案件基本単価 (円)" 
              type="number" 
              value={editForm.manualBaseAmountOverride} 
              onChange={e => setEditForm({...editForm, manualBaseAmountOverride: parseInt(e.target.value, 10)})} 
            />
            
            <Input 
              label="報酬率 (0.3 = 30%)" 
              type="number" 
              step="0.01"
              value={editForm.manualRateOverride} 
              onChange={e => setEditForm({...editForm, manualRateOverride: parseFloat(e.target.value)})} 
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <Button variant="ghost" onClick={() => setEditingUserId(null)} style={{ flex: 1 }}>キャンセル</Button>
              <Button onClick={handleSave} style={{ flex: 2 }}>設定を保存</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyListPage;
