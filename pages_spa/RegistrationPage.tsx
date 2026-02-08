
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../services/dbService';
import { Card, Button, Input } from '../components/UI';
import { User } from '../types';

const RegistrationPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [targetUser, setTargetUser] = useState<User | null>(null);

  const handleVerifyId = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = db.verifyRegistrationId(loginId);
    if (user) {
      setTargetUser(user);
      setStep(2);
    } else {
      setError('入力されたIDは存在しないか、代理店としての登録が許可されていません。管理者にお問い合わせください。');
    }
  };

  const handleCompleteRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }
    
    if (password.length < 4) {
      setError('パスワードは4文字以上で設定してください。');
      return;
    }

    if (targetUser) {
      db.completeRegistration(targetUser.id, password);
      alert('登録が完了しました。ログインしてください。');
      navigate('/login');
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
      <div style={{ width: '100%', maxWidth: '480px', padding: '24px' }} className="animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ margin: '0', fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>新規代理店登録</h1>
          <p style={{ color: 'var(--text-sub)', marginTop: '10px', fontWeight: 600 }}>ID認証を行い、パスワードを設定してください</p>
        </div>

        <Card style={{ padding: '40px' }}>
          {step === 1 ? (
            <form onSubmit={handleVerifyId} className="animate-fade-in">
              <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '12px', border: '1px solid rgba(79, 70, 229, 0.1)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, lineHeight: 1.6 }}>
                  管理者から承認された「顧客ID（PAXXXX）」を入力してください。承認されていないIDでは登録を進めることができません。
                </p>
              </div>

              <Input 
                label="承認済み顧客ID" 
                type="text" 
                value={loginId} 
                onChange={(e) => setLoginId(e.target.value)} 
                required 
                placeholder="例: PA0005" 
              />
              
              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '24px' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i>
                  {error}
                </div>
              )}
              
              <Button type="submit" style={{ width: '100%', padding: '16px' }}>
                IDを認証する <i className="fa-solid fa-shield-check" style={{ marginLeft: '8px' }}></i>
              </Button>

              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Link to="/login" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-sub)', textDecoration: 'none' }}>
                  ログイン画面に戻る
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCompleteRegistration} className="animate-fade-in">
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', fontWeight: 800 }}>認証済みID</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)' }}>{targetUser?.loginId}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '4px' }}>{targetUser?.name} 様</div>
              </div>

              <Input 
                label="新しいパスワード" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••" 
              />

              <Input 
                label="パスワード（確認用）" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                placeholder="••••••••" 
              />
              
              {error && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '24px' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i>
                  {error}
                </div>
              )}
              
              <Button type="submit" style={{ width: '100%', padding: '16px' }}>
                登録を完了する <i className="fa-solid fa-check-circle" style={{ marginLeft: '8px' }}></i>
              </Button>

              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-sub)', cursor: 'pointer' }}>
                  ID入力に戻る
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default RegistrationPage;
