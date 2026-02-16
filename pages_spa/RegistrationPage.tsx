
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { db } from '../services/dbService';
import { Card, Button, Input, Badge } from '../components/UI';

const RegistrationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<1 | 2>(1);
  const [customerId, setCustomerId] = useState('');
  const [regCode, setRegCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idParam = params.get('id');
    if (idParam) setCustomerId(idParam.toUpperCase());
  }, [location]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await db.checkRegistrationEligibility(customerId, regCode.toUpperCase());
      if (result.ok) {
        setStep(2);
      } else {
        if (result.reason === 'not_found') setError('顧客IDが見つかりません。');
        else if (result.reason === 'already_registered') setError('このIDはすでに登録済みです。');
        else if (result.reason === 'not_approved') setError('管理者の承認が完了していません。');
        else if (result.reason === 'invalid_code') setError('登録コードが正しくありません。');
        else if (result.reason === 'code_used') setError('この登録コードは既に使用されています。');
        else setError('エラーが発生しました。');
      }
    } catch (err) {
      setError('サーバー通信に失敗しました。');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('パスワードは8文字以上で設定してください。'); return; }
    if (password !== confirmPassword) { setError('パスワードが一致しません。'); return; }
    
    setLoading(true);
    try {
      const result = await db.completeRegistration(customerId, regCode.toUpperCase(), password);
      if (result.ok) { 
        alert('本登録が完了しました。設定したパスワードでログインしてください。'); 
        navigate('/login'); 
      }
    } catch (err: any) { 
      setError('登録処理中にエラーが発生しました。'); 
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div style={{ width: '100%', maxWidth: '460px', padding: '24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em' }}>Account <span style={{color:'var(--primary)'}}>Setup</span></h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px' }}>代理店アカウントの本登録を完了します。</p>
        </div>

        <Card style={{ padding: '40px' }}>
          {step === 1 ? (
            <form onSubmit={handleVerify}>
              <Input 
                label="顧客ID" 
                placeholder="PA0001" 
                value={customerId} 
                onChange={e => setCustomerId(e.target.value.toUpperCase())} 
                required 
              />
              <Input 
                label="登録コード (8桁)" 
                placeholder="英数字8桁" 
                value={regCode} 
                onChange={e => setRegCode(e.target.value.toUpperCase())} 
                required 
              />
              {error && (
                <div style={{ color: '#ef4444', marginBottom: '20px', padding: '12px', background: '#fef2f2', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-circle-exclamation" style={{marginRight:'8px'}}></i>
                  {error}
                </div>
              )}
              <Button type="submit" disabled={loading} style={{ width: '100%', height: '50px' }}>
                {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : '認証して次へ'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{ textAlign: 'center', marginBottom: '24px', background: 'var(--bg-main)', padding: '12px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 800, marginBottom: '4px' }}>登録対象ID</div>
                <Badge color="var(--primary)" style={{ fontSize: '1rem', padding: '8px 16px' }}>{customerId}</Badge>
              </div>
              <Input 
                label="新しいパスワード" 
                type="password" 
                placeholder="8文字以上"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
              <Input 
                label="パスワード再確認" 
                type="password" 
                placeholder="もう一度入力"
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                required 
              />
              {error && (
                <div style={{ color: '#ef4444', marginBottom: '20px', padding: '12px', background: '#fef2f2', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-circle-exclamation" style={{marginRight:'8px'}}></i>
                  {error}
                </div>
              )}
              <Button type="submit" disabled={loading} style={{ width: '100%', height: '50px' }}>
                {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'パスワードを設定して完了'}
              </Button>
            </form>
          )}
        </Card>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: '0.9rem', color: 'var(--text-sub)', textDecoration: 'none', fontWeight: 700 }}>
            <i className="fa-solid fa-arrow-left" style={{marginRight:'8px'}}></i> ログイン画面に戻る
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;
