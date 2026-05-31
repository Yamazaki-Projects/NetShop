
import React, { useState } from 'react';
// Migrated to useNavigate for v6 compatibility
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { Card, Button, Input } from '../components/UI';

const LoginPage = () => {
  const { setUser } = useAppContext();
  // Migrated to useNavigate for v6 compatibility
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await db.login(loginId, password);
      if (user) {
        setUser(user);
        navigate('/');
      } else {
        setError('ログインに失敗しました。ログインIDまたはパスワードが正しくありません。');
      }
    } catch (err: any) {
      setError(err.message || 'サーバーとの通信に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '24px' }} className="animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em' }}>Partner Login</h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px' }}>パートナーシステムへログイン</p>
        </div>
        <Card style={{ padding: '40px' }}>
          <form onSubmit={handleSubmit}>
            <Input 
              label="ログインID" 
              type="text" 
              value={loginId} 
              onChange={(e) => setLoginId(e.target.value)} 
              required 
              placeholder="admin または 顧客ID" 
              autoComplete="username"
            />
            <Input 
              label="パスワード" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••" 
              autoComplete="current-password"
            />
            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, marginBottom: '20px', padding: '12px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fee2e2' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
                {error}
              </div>
            )}
            <Button type="submit" disabled={loading} style={{ width: '100%', height: '50px' }}>
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'ログイン'}
            </Button>

            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--text-sub)' }}>
              <p style={{ fontWeight: 800, marginBottom: '4px', color: 'var(--primary)' }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: '6px' }}></i>
                デモ用ログイン情報
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>ID: <code style={{ fontWeight: 900, color: 'var(--text-main)' }}>admin</code></div>
                <div>PW: <code style={{ fontWeight: 900, color: 'var(--text-main)' }}>demo</code></div>
                <div>ID: <code style={{ fontWeight: 900, color: 'var(--text-main)' }}>PA0001</code></div>
                <div>PW: <code style={{ fontWeight: 900, color: 'var(--text-main)' }}>demo</code></div>
              </div>
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
              <Link to="/register" style={{ fontSize: '0.9rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 800 }}>
                新規代理店登録はこちら <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px', fontSize: '0.8rem' }}></i>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
