
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { db } from '../services/dbService';
import { Card, Button, Input, Badge } from '../components/UI';

const RegistrationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const [customerId, setCustomerId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // URLパラメータからIDを取得 (?id=PA0001)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idParam = params.get('id');
    if (idParam) {
      setCustomerId(idParam.toUpperCase());
    }
  }, [location]);

  // ステップ1: IDチェック
  const handleCheckId = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await db.checkRegistrationEligibility(customerId);
    if (result.ok) {
      setStep(2);
    } else {
      if (result.reason === 'not_found') {
        setError('この顧客IDは見つかりませんでした。正しいIDを入力してください。');
      } else if (result.reason === 'already_registered') {
        setError('この顧客IDはすでに登録済みです。ログイン画面からログインしてください。');
      } else {
        setError('IDの確認中にエラーが発生しました。');
      }
    }
    setLoading(false);
  };

  // ステップ2: パスワード設定
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください。');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await db.completeRegistration(customerId, password);
      if (result.ok) {
        alert('アカウントの有効化が完了しました。設定したパスワードでログインしてください。');
        navigate('/login');
      } else {
        setError('登録処理に失敗しました。');
      }
    } catch (err: any) {
      setError('登録中にエラーが発生しました。' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div style={{ width: '100%', maxWidth: '460px', padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
            Account <span style={{ color: 'var(--primary)' }}>Setup</span>
          </h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px' }}>
            代理店アカウントの初期設定を行います
          </p>
        </div>

        <Card style={{ padding: '40px' }}>
          {step === 1 ? (
            <form onSubmit={handleCheckId} className="animate-fade-in">
              <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '12px', border: '1px solid rgba(79, 70, 229, 0.1)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, lineHeight: 1.5 }}>
                  <i className="fa-solid fa-circle-info" style={{ marginRight: '6px' }}></i>
                  案件登録時に発行された「顧客ID（PAから始まる番号）」を入力してください。
                </p>
              </div>
              <Input 
                label="顧客ID (Login ID)" 
                placeholder="例: PA0001" 
                value={customerId} 
                onChange={e => setCustomerId(e.target.value.toUpperCase())}
                required
              />
              {error && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, marginBottom: '20px', padding: '12px', background: '#fef2f2', borderRadius: '10px' }}>
                  {error}
                </div>
              )}
              <Button type="submit" disabled={loading} style={{ width: '100%', height: '50px' }}>
                {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : '設定を開始する'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="animate-fade-in">
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <Badge color="var(--primary)" style={{ fontSize: '1rem', padding: '10px 20px' }}>ID: {customerId}</Badge>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginTop: '16px', fontWeight: 600 }}>
                  ログインに使用するパスワードを設定してください
                </p>
              </div>
              <Input 
                label="パスワード (8文字以上)" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                autoComplete="new-password"
              />
              <Input 
                label="パスワード確認" 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
                autoComplete="new-password"
              />
              {error && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, marginBottom: '20px', padding: '12px', background: '#fef2f2', borderRadius: '10px' }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                <Button variant="ghost" onClick={() => setStep(1)} disabled={loading} style={{ flex: 1 }}>戻る</Button>
                <Button type="submit" disabled={loading} style={{ flex: 2, height: '50px' }}>
                  {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'パスワードを確定'}
                </Button>
              </div>
            </form>
          )}

          <div style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
            <Link to="/login" style={{ fontSize: '0.9rem', color: 'var(--text-sub)', textDecoration: 'none', fontWeight: 800 }}>
              <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i> ログイン画面へ戻る
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegistrationPage;
