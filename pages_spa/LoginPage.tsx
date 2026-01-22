import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { Card, Button, Input } from '../components/UI';

const LoginPage = () => {
  const { setUser } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('api18958@gmail.com');
  const [password, setPassword] = useState('aaaa1111');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = db.login(email, password);
    if (user) {
      setUser(user);
      navigate('/');
    } else {
      setError('認証に失敗しました。情報を確認してください。');
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
            <Input label="メールアドレス" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="api18958@gmail.com" />
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
              letterSpacing: '0.05em' 
            }}>
              ログイン <i className="fa-solid fa-arrow-right" style={{ marginLeft: '4px', fontSize: '0.9rem' }}></i>
            </Button>
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