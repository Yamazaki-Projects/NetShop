
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { Card, Button, Input } from '../components/UI';

const LoginPage = () => {
  const { setUser } = useAppContext();
  const navigate = useNavigate();
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await db.login(identity, password);
      if (user) {
        setUser(user);
        navigate('/');
      } else {
        setError('ログインに失敗しました。ID/メールアドレスとパスワードを確認してください。');
      }
    } catch (err: any) {
      setError(err.message || '通信エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '24px' }} className="animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>Partner Login</h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600 }}>ID または メールアドレスでログイン</p>
        </div>
        <Card style={{ padding: '40px' }}>
          <form onSubmit={handleSubmit}>
            <Input 
              label="ログインID または メールアドレス" 
              type="text" 
              value={identity} 
              onChange={(e) => setIdentity(e.target.value)} 
              required 
              placeholder="admin または yamada@example.com" 
            />
            <Input 
              label="パスワード" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••" 
            />
            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, marginBottom: '20px' }}>{error}</p>}
            <Button type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? '認証中...' : 'ログイン'}
            </Button>
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Link to="/register" style={{ fontSize: '0.85rem', color: 'var(--text-sub)', textDecoration: 'none', fontWeight: 700 }}>新規代理店の方はこちら</Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
