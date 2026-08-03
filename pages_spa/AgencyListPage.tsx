
import { useState, useEffect } from 'react';
import { db } from '../services/dbService';
import { useAppContext } from '../App';
import { User, UserRole, MembershipPlan, isAdminRole } from '../types';
import { Card, Button, Badge } from '../components/UI';

const PLAN_LABELS: Record<MembershipPlan, string> = {
  'free': '無料',
  '30k':  '30,000円',
  '198k': '198,000円',
};

const PLAN_COLORS: Record<MembershipPlan, string> = {
  'free':  '#94a3b8',
  '30k':   '#f59e0b',
  '198k':  'var(--primary)',
};

const PlanBadge = ({ plan }: { plan?: MembershipPlan }) => {
  const p = plan || '198k';
  return (
    <Badge color={PLAN_COLORS[p]} style={{ fontSize: '0.75rem', padding: '3px 10px', fontWeight: 800 }}>
      {PLAN_LABELS[p]}
    </Badge>
  );
};

const AgencyListPage = () => {
  const { user: currentUser } = useAppContext();
  const [agencies, setAgencies] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<MembershipPlan>('198k');
  const [saving, setSaving] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const loadAgencies = async () => {
    setLoading(true);
    const allUsers = await db.getUsers();
    setAgencies(allUsers.filter(u => !isAdminRole(u.role)));
    setLoading(false);
  };

  useEffect(() => {
    if (isAdminRole(currentUser?.role)) loadAgencies();
  }, [currentUser]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAdminRole(currentUser?.role)) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>このページを表示する権限がありません。</div>;
  }

  const handleEditClick = (agency: User) => {
    setEditingUserId(agency.id);
    setEditPlan(agency.membershipPlan || '198k');
  };

  const handleSave = async () => {
    if (!editingUserId) return;
    setSaving(true);
    await db.updateUserMembershipPlan(editingUserId, editPlan);
    setSaving(false);
    setEditingUserId(null);
    await loadAgencies();
  };

  const isMobile = windowWidth < 768;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '40px', textAlign: 'left' }}>
        <h1 style={{ fontSize: isMobile ? '1.5rem' : '2.25rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>代理店管理</h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600 }}>代理店パートナーのメンバーシッププランを管理します。</p>
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
                  {!isMobile && <th className="align-left">メールアドレス</th>}
                  <th className="align-center">プラン</th>
                  {!isMobile && <th className="align-center">報酬率（直/2段）</th>}
                  <th className="align-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map(agency => {
                  const plan = agency.membershipPlan || '198k';
                  const directRate = plan === '198k' ? '2%' : '1%';
                  const secondRate = plan === '198k' ? '1%' : 'なし';
                  const shopRate  = plan === '198k' ? '4%' : 'なし';
                  return (
                    <tr key={agency.id}>
                      <td className="align-left">
                        <div style={{ fontWeight: 800 }}>{agency.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 700 }}>
                          {(agency.loginId || '').toLowerCase()}
                        </div>
                      </td>
                      {!isMobile && <td className="align-left" style={{ fontSize: '0.85rem' }}>{agency.email}</td>}
                      <td className="align-center">
                        <PlanBadge plan={plan} />
                      </td>
                      {!isMobile && (
                        <td className="align-center">
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.8 }}>
                            <span style={{ color: 'var(--primary)' }}>自店: {shopRate}</span>
                            {' / '}直: {directRate}
                            {' / '}2段: {secondRate}
                          </div>
                        </td>
                      )}
                      <td className="align-right">
                        <Button
                          variant="ghost"
                          onClick={() => handleEditClick(agency)}
                          style={{ border: '1px solid var(--border)', padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          プラン変更
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
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '440px', borderRadius: '24px', padding: '40px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '8px' }}>メンバーシッププラン変更</h2>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '28px' }}>
              {agencies.find(a => a.id === editingUserId)?.name}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {(['198k', '30k', '198k'] as MembershipPlan[]).map(plan => {
                const directRate = plan === '198k' ? '2%' : '1%';
                const secondRate = plan === '198k' ? '1%' : 'なし';
                const shopRate   = plan === '198k' ? '4%' : 'なし';
                const selected   = editPlan === plan;
                return (
                  <button
                    key={plan}
                    onClick={() => setEditPlan(plan)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderRadius: '14px',
                      border: selected ? `2px solid ${PLAN_COLORS[plan]}` : '2px solid var(--border)',
                      background: selected ? `${PLAN_COLORS[plan]}15` : 'var(--bg-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 900, color: selected ? PLAN_COLORS[plan] : 'var(--text-main)', fontSize: '1rem' }}>
                        {PLAN_LABELS[plan]}プラン
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 700, marginTop: '3px' }}>
                        自店: {shopRate} / 直紹介: {directRate} / 2段目: {secondRate}
                      </div>
                    </div>
                    {plan === '198k' && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'white', background: PLAN_COLORS[plan], padding: '2px 8px', borderRadius: '6px' }}>
                        20%ボーナスあり
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="ghost" onClick={() => setEditingUserId(null)} style={{ flex: 1 }}>キャンセル</Button>
              <Button onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
                {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : '保存する'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgencyListPage;
