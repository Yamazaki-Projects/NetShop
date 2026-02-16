
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const idParam = params.get('id');
    if (idParam) setCustomerId(idParam.toUpperCase());
  }, [location]);

  const handleCheckId = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await db.checkRegistrationEligibility(customerId);
    if (result.ok) {
      setStep(2);
    } else {
      if (result.reason === 'not_found') setError('顧客IDが見つかりません。');
      else if (result.reason === 'already_registered') setError('すでに登録済みです。');
      else if (result.reason === 'not_approved') setError('管理者の承認が完了していません。担当者へお問い合わせください。');
      else setError('エラーが発生しました。');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError('パスワードが一致しません。'); return; }
    setLoading(true);
    try {
      const result = await db.completeRegistration(customerId, password);
      if (result.ok) { alert('本登録が完了しました。'); navigate('/login'); }
    } catch (err: any) { setError('登録に失敗しました。'); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div style={{ width: '100%', maxWidth: '460px', padding: '24px' }}>
        <h1 style={{ textAlign: 'center', fontWeight: 900 }}>Account <span style={{color:'var(--primary)'}}>Setup</span></h1>
        <Card style={{ padding: '40px', marginTop: '24px' }}>
          {step === 1 ? (
            <form onSubmit={handleCheckId}>
              <Input label="顧客ID" value={customerId} onChange={e => setCustomerId(e.target.value.toUpperCase())} required />
              {error && <div style={{ color: '#ef4444', marginBottom: '20px', fontWeight: 700 }}>{error}</div>}
              <Button type="submit" disabled={loading} style={{ width: '100%' }}>設定を開始する</Button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <div style={{textAlign:'center', marginBottom: '24px'}}><Badge color="var(--primary)">ID: {customerId}</Badge></div>
              <Input label="パスワード" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              <Input label="確認用パスワード" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              {error && <div style={{ color: '#ef4444', marginBottom: '20px', fontWeight: 700 }}>{error}</div>}
              <Button type="submit" disabled={loading} style={{ width: '100%' }}>パスワードを確定</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default RegistrationPage;
