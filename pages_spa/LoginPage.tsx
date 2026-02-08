
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { Card, Button, Input } from '../components/UI';

const LoginPage = () => {
  const { setUser } = useAppContext();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('admin');
  const [password, setPassword] = useState('aaaa1111');
  const [error, setError] = useState('');

  const handleLogin = (eId: string, ePass: string) => {
    const user = db.login(eId, ePass);
    if (user) {
      setUser(user);
      navigate('/');
    } else {
      setError('認証に失敗しました。ログインIDまたはパスワードを確認してください。');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(loginId, password);
  };

  const quickLogin = (type: 'admin' | 'agency') => {
    if (type === 'admin') {
      setLoginId('admin');
      setPassword('aaaa1111');
      handleLogin('admin', 'aaaa1111');
    } else {
      setLoginId('PA0001');
      setPassword('demo');
      handleLogin('PA0001', 'demo');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: 'var(--bg-main)',
      transition: 'background-color 0.4s ease'
    }}>
      <div style={{ width: '100%', maxWidth: '420px', padding: '24px' }} className="animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '72px', 
            height: '72px', 
            background: 'var(--grad-primary)', 
            color: 'white', 
            borderRadius: '20px', 
            fontSize: '1.75rem', 
            marginBottom: '20px', 
            boxShadow: '0 12px 20px -5px rgba(79, 70, 229, 0.4)' 
          }}>
            <i className="fa-solid fa-bolt"></i>
          </div>
          <h1 style={{ margin: '0', fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Partner Portal</h1>
          <p style={{ color: 'var(--text-sub)', marginTop: '10px', fontWeight: 600 }}>プロフェッショナルのための管理システム</p>
        </div>

        <Card style={{ padding: '40px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <Input label="ログインID" type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} required placeholder="admin / PA0001" />
            <Input label="パスワード" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            
            {error && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: '#ef4444', 
                padding: '12px', 
                borderRadius: '10px', 
                fontSize: '0.85rem', 
                fontWeight: 700, 
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i>
                {error}
              </div>
            )}
            
            <Button type="submit" style={{ 
              width: '100%', 
              padding: '16px', 
              fontSize: '1.05rem', 
              letterSpacing: '0.05em',
              marginBottom: '24px'
            }}>
              ログイン <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px', fontSize: '0.9rem' }}></i>
            </Button>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Link to="/register" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                新規代理店登録はこちら <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem', marginLeft: '4px' }}></i>
              </Link>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>デモアカウントでクイックログイン</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button"
                  onClick={() => quickLogin('admin')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-main)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: 'var(--text-main)', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <i className="fa-solid fa-shield-halved" style={{ marginRight: '6px', color: 'var(--primary)' }}></i> admin
                </button>
                <button 
                  type="button"
                  onClick={() => quickLogin('agency')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-main)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', color: 'var(--text-main)', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <i className="fa-solid fa-briefcase" style={{ marginRight: '6px', color: 'var(--accent)' }}></i> PA0001
                </button>
              </div>
            </div>
          </form>
        </Card>
        
        <div style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-sub)', fontSize: '0.85rem', fontWeight: 600 }}>
          &copy; 2024 NetShop Co., Ltd.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
