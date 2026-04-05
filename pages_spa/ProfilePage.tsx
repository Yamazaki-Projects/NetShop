import React, { useState } from 'react';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { Card, Input, Button } from '../components/UI';
import { UserRole, UserStatus } from '../types';

const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
  <Card style={{ padding: 32, marginBottom: 24 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'var(--grad-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: '1rem'
      }}>
        <i className={`fa-solid ${icon}`} />
      </div>
      <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{title}</h2>
    </div>
    {children}
  </Card>
);

const ProfilePage = () => {
  const { user, setUser } = useAppContext();

  // ── プロフィール編集 ──────────────────────
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── パスワード変更 ────────────────────────
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!user) return null;

  const getRoleLabel = () => {
    if (user.role === UserRole.ADMIN) return 'ECパートナーズ（管理者）';
    if (user.status === UserStatus.AGENCY) return '代理店';
    return '顧客';
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const result = await db.updateProfile(user.id, { name, email });
      if (result.ok) {
        setUser({ ...user, name, email });
        setProfileMsg({ type: 'success', text: 'プロフィールを更新しました。' });
      } else {
        setProfileMsg({ type: 'error', text: result.message ?? '更新に失敗しました。' });
      }
    } catch (e: any) {
      setProfileMsg({ type: 'error', text: e.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPass.length < 8) {
      setPassMsg({ type: 'error', text: 'パスワードは8文字以上で設定してください。' });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ type: 'error', text: '新しいパスワードが一致しません。' });
      return;
    }
    setPassLoading(true);
    try {
      const result = await db.updatePassword(newPass);
      if (result.ok) {
        setCurrentPass(''); setNewPass(''); setConfirmPass('');
        setPassMsg({ type: 'success', text: 'パスワードを変更しました。' });
      } else {
        setPassMsg({ type: 'error', text: result.message ?? '変更に失敗しました。' });
      }
    } catch (e: any) {
      setPassMsg({ type: 'error', text: e.message });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em', margin: 0 }}>
          プロフィール <span style={{ color: 'var(--primary)' }}>.</span>
        </h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: 8 }}>アカウント情報の確認・変更ができます。</p>
      </header>

      {/* アカウント情報（読み取り専用） */}
      <Section title="アカウント情報" icon="fa-id-card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'ログインID', value: user.loginId },
            { label: 'ロール', value: getRoleLabel() },
            { label: '登録日', value: new Date(user.createdAt).toLocaleDateString('ja-JP') },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '14px 16px', background: 'var(--bg-main)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{value}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* プロフィール編集 */}
      <Section title="基本情報の編集" icon="fa-user-pen">
        <form onSubmit={handleProfileSave}>
          <Input
            label="氏名"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <Input
            label="メールアドレス"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          {profileMsg && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: '0.875rem', fontWeight: 600,
              background: profileMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${profileMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: profileMsg.type === 'success' ? '#166534' : '#dc2626',
            }}>
              <i className={`fa-solid ${profileMsg.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`} style={{ marginRight: 8 }} />
              {profileMsg.text}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" disabled={profileLoading} style={{ minWidth: 160 }}>
              {profileLoading ? <i className="fa-solid fa-spinner fa-spin" /> : '変更を保存'}
            </Button>
          </div>
        </form>
      </Section>

      {/* パスワード変更 */}
      <Section title="パスワード変更" icon="fa-lock">
        <form onSubmit={handlePasswordSave}>
          <Input
            label="新しいパスワード"
            type="password"
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            required
            placeholder="8文字以上"
          />
          <Input
            label="新しいパスワード（確認）"
            type="password"
            value={confirmPass}
            onChange={e => setConfirmPass(e.target.value)}
            required
            placeholder="もう一度入力"
          />
          {passMsg && (
            <div style={{
              padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: '0.875rem', fontWeight: 600,
              background: passMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${passMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              color: passMsg.type === 'success' ? '#166534' : '#dc2626',
            }}>
              <i className={`fa-solid ${passMsg.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`} style={{ marginRight: 8 }} />
              {passMsg.text}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" disabled={passLoading} style={{ minWidth: 160 }}>
              {passLoading ? <i className="fa-solid fa-spinner fa-spin" /> : 'パスワードを変更'}
            </Button>
          </div>
        </form>
      </Section>
    </div>
  );
};

export default ProfilePage;
