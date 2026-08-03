
import React, { useState, useEffect } from 'react';
import { db } from '../services/dbService';
import { useAppContext } from '../App';
import { User, UserRole, UserStatus, isAdminRole } from '../types';
import { Card, Button, Badge, Input, Select } from '../components/UI';

const ROLE_LABELS: Record<string, string> = {
  [UserRole.ADMIN]:     '管理者',
  [UserRole.CO_OWNER]:  '共同経営者',
  [UserRole.EXECUTIVE]: '幹部',
};

const ROLE_COLORS: Record<string, string> = {
  [UserRole.ADMIN]:     '#4f46e5',
  [UserRole.CO_OWNER]:  '#0ea5e9',
  [UserRole.EXECUTIVE]: '#10b981',
};

const StaffManagementPage = () => {
  const { user: currentUser } = useAppContext();
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.EXECUTIVE);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ loginId: string; code: string } | null>(null);

  const loadStaff = async () => {
    setLoading(true);
    const all = await db.getUsers();
    setStaffList(all.filter(u => isAdminRole(u.role)));
    setLoading(false);
  };

  useEffect(() => {
    if (isAdminRole(currentUser?.role)) loadStaff();
  }, [currentUser]);

  if (currentUser?.role !== UserRole.ADMIN) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>このページを表示する権限がありません。</div>;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !loginId.trim()) return;
    setSubmitting(true);
    const res = await db.createAdminUser(name.trim(), loginId.trim(), role);
    setSubmitting(false);
    if (res.ok && res.code) {
      setResult({ loginId: loginId.trim().toLowerCase(), code: res.code });
      setName('');
      setLoginId('');
      setRole(UserRole.EXECUTIVE);
      setShowForm(false);
      await loadStaff();
    } else {
      alert(res.error || '作成に失敗しました。');
    }
  };

  const isRegistered = (u: User) => u.status === UserStatus.AGENCY && !!u.auth_uid;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>スタッフ管理</h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px' }}>共同経営者・幹部アカウントの発行と管理</p>
        </div>
        <Button onClick={() => { setShowForm(v => !v); setResult(null); }}>
          <i className="fa-solid fa-plus" style={{ marginRight: '8px' }}></i>新しいスタッフを追加
        </Button>
      </header>

      {showForm && (
        <Card style={{ marginBottom: '32px', border: '2px solid var(--primary)' }}>
          <h3 style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '24px' }}>
            スタッフアカウントを発行
          </h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <Input
                label="名前"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="山田 太郎"
                required
                containerStyle={{ marginBottom: 0 }}
              />
              <Input
                label="ログインID"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                placeholder="co001 / ex001"
                required
                containerStyle={{ marginBottom: 0 }}
              />
              <Select
                label="ロール"
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                containerStyle={{ marginBottom: 0 }}
              >
                <option value={UserRole.CO_OWNER}>共同経営者</option>
                <option value={UserRole.EXECUTIVE}>幹部</option>
              </Select>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button type="submit" disabled={submitting} style={{ flex: 1 }}>
                {submitting ? <i className="fa-solid fa-spinner fa-spin"></i> : '登録コードを発行する'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>
                キャンセル
              </Button>
            </div>
          </form>
        </Card>
      )}

      {result && (
        <Card style={{ marginBottom: '32px', border: '2px solid #10b981', background: '#f0fdf4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <i className="fa-solid fa-check-circle" style={{ color: '#10b981', fontSize: '1.4rem' }}></i>
            <h3 style={{ fontWeight: 900, color: '#065f46', margin: 0 }}>登録コードを発行しました</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 600, marginBottom: '16px' }}>
            以下の情報をスタッフに共有してください。登録ページでパスワードを設定することで利用開始できます。
          </p>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #a7f3d0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)' }}>ログインID</span>
              <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1rem' }}>{result.loginId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)' }}>登録コード</span>
              <span style={{ fontWeight: 900, color: '#059669', fontSize: '1.1rem', letterSpacing: '0.1em' }}>{result.code}</span>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600, marginTop: '12px' }}>
            ※ 登録ページ: ログイン画面の「新規代理店登録はこちら」から進んでください。
          </p>
          <Button
            variant="ghost"
            onClick={() => setResult(null)}
            style={{ width: '100%', marginTop: '12px', fontSize: '0.8rem' }}
          >
            閉じる
          </Button>
        </Card>
      )}

      <Card title="スタッフ一覧">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
          </div>
        ) : staffList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-sub)', fontWeight: 600 }}>
            スタッフが登録されていません
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {staffList.map(u => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'var(--bg-main)',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: ROLE_COLORS[u.role] || '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 900, fontSize: '1rem', flexShrink: 0,
                  }}>
                    {(u.name || '?')[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, color: 'var(--text-main)', fontSize: '0.95rem' }}>{u.name || '(名前未設定)'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', fontWeight: 700 }}>ID: {u.loginId}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Badge color={ROLE_COLORS[u.role] || '#94a3b8'} style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                    {ROLE_LABELS[u.role] || u.role}
                  </Badge>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', borderRadius: '8px',
                    background: isRegistered(u) ? '#dcfce7' : '#fef3c7',
                    color: isRegistered(u) ? '#16a34a' : '#b45309',
                  }}>
                    {isRegistered(u) ? '登録済み' : '未登録'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default StaffManagementPage;
