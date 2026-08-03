import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { MallOpeningStatus, Case } from '../types';
import { Card, Button, Input } from '../components/UI';
import InfoRow from '../components/InfoRow';

type TabType = 'opening' | 'basic' | 'account';

const formatToWareki = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ja-JP-u-ca-japanese', { dateStyle: 'long' }).format(date);
};

const ProfilePage = () => {
  const { user } = useAppContext();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [activeTab, setActiveTab] = useState<TabType>('opening');
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCase, setEditedCase] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadCase = useCallback(async () => {
    if (!user?.loginId) { setLoading(false); return; }
    try {
      const c = await db.getCaseById(user.loginId);
      setCaseData(c);
    } catch (e) {
      console.error('Failed to load case', e);
    } finally {
      setLoading(false);
    }
  }, [user?.loginId]);

  useEffect(() => {
    setLoading(true);
    loadCase();
  }, [loadCase]);

  const handleFieldChange = useCallback((value: string, field: string, group?: string) => {
    setEditedCase((prev: any) => {
      if (!prev) return prev;
      if (group) {
        return { ...prev, [group]: { ...(prev[group] || {}), [field]: value } };
      }
      return { ...prev, [field]: value };
    });
  }, []);

  const isMobile = windowWidth < 768;

  if (!user) return null;

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
      </div>
    );
  }

  const mallStatusOptions = Object.values(MallOpeningStatus).map(s => ({ label: s, value: s }));

  const startEdit = () => {
    if (caseData) {
      setEditedCase({ ...caseData });
      setIsEditing(true);
    }
  };

  const saveChanges = async () => {
    if (caseData && editedCase) {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      try {
        const profileFields = [
          'customerType','companyName','companyNameKana','companyZipCode',
          'companyAddress','companyAddressKana','corporateNumber','establishedDate',
          'repLastName','repFirstName','repLastNameKana','repFirstNameKana',
          'repBirthDate','repZipCode','repAddress','repAddressKana',
          'staffLastName','staffFirstName','staffLastNameKana','staffFirstNameKana',
          'staffBirthDate','staffZipCode','staffAddress','staffAddressKana',
          'phone','email','mallProgress','rakutenInfo','mercariInfo',
          'aupayInfo','subline','emailJp','yahooFreeInput'
        ];
        const subset: any = {};
        profileFields.forEach(k => { subset[k] = editedCase[k]; });
        const result = await db.updateCase(caseData.id, subset, user);
        if (result) {
          setIsEditing(false);
          setSaveSuccess(true);
          await loadCase();
          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          setSaveError('保存に失敗しました。権限がないか、データが見つかりません。');
        }
      } catch (e: any) {
        setSaveError(e.message || '保存中にエラーが発生しました。');
      } finally {
        setSaving(false);
      }
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'err', text: 'パスワードは8文字以上で設定してください。' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'err', text: 'パスワードが一致しません。' });
      return;
    }
    setPasswordSaving(true);
    const result = await db.updatePassword(newPassword);
    if (result.ok) {
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ type: 'ok', text: 'パスワードを変更しました。' });
    } else {
      setPasswordMsg({ type: 'err', text: result.error || 'パスワード変更に失敗しました。' });
    }
    setPasswordSaving(false);
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setIsEditing(false);
  };

  const tabStyle = (tab: TabType) => ({
    padding: isMobile ? '10px 16px' : '16px 28px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: isMobile ? '0.85rem' : '1rem',
    color: activeTab === tab ? 'var(--primary)' : 'var(--text-sub)',
    borderBottom: activeTab === tab ? '4px solid var(--primary)' : '4px solid transparent',
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', marginBottom: '40px', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2.25rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
            プロフィール設定
          </h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px' }}>
            {user.name} 様の情報
          </p>
        </div>
        {activeTab !== 'account' && caseData && (
          <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
            {!isEditing ? (
              <Button onClick={startEdit} variant="ghost" style={{ flex: isMobile ? 1 : 'none', border: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
                <i className="fa-solid fa-pen-to-square"></i> 編集
              </Button>
            ) : (
              <>
                <Button onClick={() => setIsEditing(false)} variant="ghost" style={{ flex: 1 }}>キャンセル</Button>
                <Button onClick={saveChanges} disabled={saving} style={{ flex: 1 }}>
                  {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : '保存'}
                </Button>
              </>
            )}
          </div>
        )}
      </header>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '32px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button onClick={() => switchTab('opening')} style={tabStyle('opening')}>ショップ開設</button>
        <button onClick={() => switchTab('basic')} style={tabStyle('basic')}>顧客基本情報</button>
        <button onClick={() => switchTab('account')} style={tabStyle('account')}>アカウント設定</button>
      </div>

      {saveSuccess && (
        <div style={{ marginBottom: '24px', padding: '12px 16px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 700, fontSize: '0.9rem' }}>
          <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i>保存しました。
        </div>
      )}
      {saveError && (
        <div style={{ marginBottom: '24px', padding: '12px 16px', borderRadius: '10px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', fontWeight: 700, fontSize: '0.9rem' }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>{saveError}
        </div>
      )}

      {activeTab !== 'account' && !caseData && (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-sub)', fontWeight: 600 }}>
          案件データが見つかりませんでした。
        </div>
      )}

      {activeTab === 'opening' && caseData && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <Card title="050番号情報">
            <InfoRow label="電話タイプ" value={isEditing ? editedCase.subline?.phoneType : caseData.subline?.phoneType} field="phoneType" group="subline" type="select" options={[{label: '050番号', value: '050'}, {label: '固定電話', value: 'landline'}]} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            {(isEditing ? editedCase.subline?.phoneType : caseData.subline?.phoneType) !== 'landline' && (
              <>
                <InfoRow label="050番号" value={isEditing ? editedCase.subline?.number050 : caseData.subline?.number050} field="number050" group="subline" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                <InfoRow label="取得サイト" value={isEditing ? editedCase.subline?.siteType : caseData.subline?.siteType} field="siteType" group="subline" type="select" options={[{label: 'subline', value: 'subline'}, {label: '他のサイト', value: 'other'}]} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                {(isEditing ? editedCase.subline?.siteType : caseData.subline?.siteType) === 'other' && (
                  <InfoRow label="URL" value={isEditing ? editedCase.subline?.otherUrl : caseData.subline?.otherUrl} field="otherUrl" group="subline" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                )}
                <InfoRow label="ID" value={isEditing ? editedCase.subline?.loginId : caseData.subline?.loginId} field="loginId" group="subline" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                <InfoRow label="パスワード" value={isEditing ? editedCase.subline?.password : caseData.subline?.password} field="password" group="subline" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
              </>
            )}
            {(isEditing ? editedCase.subline?.phoneType : caseData.subline?.phoneType) === 'landline' && (
              <InfoRow label="電話番号" value={isEditing ? editedCase.subline?.number050 : caseData.subline?.number050} field="number050" group="subline" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            )}
          </Card>

          <Card title="e-mail.jp 情報">
            <InfoRow label="ドメイン" value={isEditing ? editedCase.emailJp?.domainType : caseData.emailJp?.domainType} field="domainType" group="emailJp" type="select" options={[{label: 'e-mail.jp', value: 'email_jp'}, {label: 'ほかのドメイン', value: 'other'}]} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            {(isEditing ? editedCase.emailJp?.domainType : caseData.emailJp?.domainType) === 'other' && (
              <InfoRow label="ドメイン名" value={isEditing ? editedCase.emailJp?.otherDomain : caseData.emailJp?.otherDomain} field="otherDomain" group="emailJp" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            )}
            <InfoRow label="メールアドレス" value={isEditing ? editedCase.emailJp?.email : caseData.emailJp?.email} field="email" group="emailJp" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="パスワード" value={isEditing ? editedCase.emailJp?.password : caseData.emailJp?.password} field="password" group="emailJp" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
          </Card>

          <Card title="楽天市場 開設情報">
            <InfoRow label="開設状況" value={isEditing ? editedCase.mallProgress?.rakuten : caseData.mallProgress?.rakuten} field="rakuten" group="mallProgress" type="select" options={mallStatusOptions} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="荷物郵送の必要性" value={isEditing ? editedCase.rakutenInfo?.needsShipping : caseData.rakutenInfo?.needsShipping} field="needsShipping" group="rakutenInfo" type="select" options={[{label: '必要', value: 'necessary'}, {label: '不必要', value: 'unnecessary'}]} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="申込ID" value={isEditing ? editedCase.rakutenInfo?.applyId : caseData.rakutenInfo?.applyId} field="applyId" group="rakutenInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="申込パスワード" value={isEditing ? editedCase.rakutenInfo?.applyPass : caseData.rakutenInfo?.applyPass} field="applyPass" group="rakutenInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="R-login ID" value={isEditing ? editedCase.rakutenInfo?.rLoginId : caseData.rakutenInfo?.rLoginId} field="rLoginId" group="rakutenInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="R-login パスワード" value={isEditing ? editedCase.rakutenInfo?.rLoginPass : caseData.rakutenInfo?.rLoginPass} field="rLoginPass" group="rakutenInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="個人ID" value={isEditing ? editedCase.rakutenInfo?.personalId : caseData.rakutenInfo?.personalId} field="personalId" group="rakutenInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="個人パスワード" value={isEditing ? editedCase.rakutenInfo?.personalPass : caseData.rakutenInfo?.personalPass} field="personalPass" group="rakutenInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="billpay ID" value={isEditing ? editedCase.rakutenInfo?.billpayId : caseData.rakutenInfo?.billpayId} field="billpayId" group="rakutenInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="billpay パスワード" value={isEditing ? editedCase.rakutenInfo?.billpayPass : caseData.rakutenInfo?.billpayPass} field="billpayPass" group="rakutenInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
          </Card>

          <Card title="メルカリショップス 開設情報">
            <InfoRow label="開設状況" value={isEditing ? editedCase.mallProgress?.mercari : caseData.mallProgress?.mercari} field="mercari" group="mallProgress" type="select" options={mallStatusOptions} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="メールアドレス" value={isEditing ? editedCase.mercariInfo?.email : caseData.mercariInfo?.email} field="email" group="mercariInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="パスワード" value={isEditing ? editedCase.mercariInfo?.password : caseData.mercariInfo?.password} field="password" group="mercariInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="電話番号" value={isEditing ? editedCase.mercariInfo?.phone : caseData.mercariInfo?.phone} field="phone" group="mercariInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
          </Card>

          <Card title="au PAY マーケット 開設情報">
            <InfoRow label="開設状況" value={isEditing ? editedCase.mallProgress?.aupay : caseData.mallProgress?.aupay} field="aupay" group="mallProgress" type="select" options={mallStatusOptions} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="メールアドレス" value={isEditing ? editedCase.aupayInfo?.email : caseData.aupayInfo?.email} field="email" group="aupayInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="Wow! manager ID" value={isEditing ? editedCase.aupayInfo?.wowManagerId : caseData.aupayInfo?.wowManagerId} field="wowManagerId" group="aupayInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="Wow! manager パスワード" value={isEditing ? editedCase.aupayInfo?.wowManagerPass : caseData.aupayInfo?.wowManagerPass} field="wowManagerPass" group="aupayInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="au PAY マーケット Salon ID" value={isEditing ? editedCase.aupayInfo?.salonId : caseData.aupayInfo?.salonId} field="salonId" group="aupayInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="au PAY マーケット Salon パスワード" value={isEditing ? editedCase.aupayInfo?.salonPass : caseData.aupayInfo?.salonPass} field="salonPass" group="aupayInfo" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
          </Card>

          <Card title="Yahoo!ショッピング 開設情報">
            <InfoRow label="開設状況" value={isEditing ? editedCase.mallProgress?.yahoo : caseData.mallProgress?.yahoo} field="yahoo" group="mallProgress" type="select" options={mallStatusOptions} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="フリー入力" value={isEditing ? editedCase.yahooFreeInput : caseData.yahooFreeInput} field="yahooFreeInput" type="textarea" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
          </Card>
        </div>
      )}

      {activeTab === 'basic' && caseData && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <Card title="基本情報">
            <InfoRow label="区分" value={isEditing ? editedCase.customerType : caseData.customerType} field="customerType" type="select" options={[{label: '法人', value: 'corporation'}, {label: '個人事業主', value: 'sole_proprietor'}]} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="法人名/屋号" value={isEditing ? editedCase.companyName : caseData.companyName} field="companyName" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="法人名/屋号 ふりがな" value={isEditing ? editedCase.companyNameKana : caseData.companyNameKana} field="companyNameKana" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="郵便番号" value={isEditing ? editedCase.companyZipCode : caseData.companyZipCode} field="companyZipCode" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="住所" value={isEditing ? editedCase.companyAddress : caseData.companyAddress} field="companyAddress" type="textarea" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="住所 ふりがな" value={isEditing ? editedCase.companyAddressKana : caseData.companyAddressKana} field="companyAddressKana" type="textarea" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            {(isEditing ? editedCase.customerType : caseData.customerType) === 'corporation' && (
              <InfoRow label="法人番号" value={isEditing ? editedCase.corporateNumber : caseData.corporateNumber} field="corporateNumber" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            )}
            <InfoRow label="設立/開業年月日" value={isEditing ? editedCase.establishedDate : caseData.establishedDate} field="establishedDate" type="date" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
          </Card>

          {(isEditing ? editedCase.customerType : caseData.customerType) === 'corporation' && (
            <Card title="代表取締役情報">
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px', minWidth: '260px' }}><InfoRow label="姓" value={isEditing ? editedCase.repLastName : caseData.repLastName} field="repLastName" layout="vertical" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} /></div>
                <div style={{ flex: '1 1 260px', minWidth: '260px' }}><InfoRow label="名" value={isEditing ? editedCase.repFirstName : caseData.repFirstName} field="repFirstName" layout="vertical" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} /></div>
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px', minWidth: '260px' }}><InfoRow label="姓 ふりがな" value={isEditing ? editedCase.repLastNameKana : caseData.repLastNameKana} field="repLastNameKana" layout="vertical" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} /></div>
                <div style={{ flex: '1 1 260px', minWidth: '260px' }}><InfoRow label="名 ふりがな" value={isEditing ? editedCase.repFirstNameKana : caseData.repFirstNameKana} field="repFirstNameKana" layout="vertical" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} /></div>
              </div>
              <InfoRow label="生年月日" value={isEditing ? editedCase.repBirthDate : caseData.repBirthDate} field="repBirthDate" type="date" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
              <InfoRow label="郵便番号" value={isEditing ? editedCase.repZipCode : caseData.repZipCode} field="repZipCode" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
              <InfoRow label="住所" value={isEditing ? editedCase.repAddress : caseData.repAddress} field="repAddress" type="textarea" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
              <InfoRow label="住所 ふりがな" value={isEditing ? editedCase.repAddressKana : caseData.repAddressKana} field="repAddressKana" type="textarea" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            </Card>
          )}

          <Card title="担当者情報">
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 260px', minWidth: '260px' }}><InfoRow label="姓" value={isEditing ? editedCase.staffLastName : caseData.staffLastName} field="staffLastName" layout="vertical" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} /></div>
              <div style={{ flex: '1 1 260px', minWidth: '260px' }}><InfoRow label="名" value={isEditing ? editedCase.staffFirstName : caseData.staffFirstName} field="staffFirstName" layout="vertical" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} /></div>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 260px', minWidth: '260px' }}><InfoRow label="姓 ふりがな" value={isEditing ? editedCase.staffLastNameKana : caseData.staffLastNameKana} field="staffLastNameKana" layout="vertical" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} /></div>
              <div style={{ flex: '1 1 260px', minWidth: '260px' }}><InfoRow label="名 ふりがな" value={isEditing ? editedCase.staffFirstNameKana : caseData.staffFirstNameKana} field="staffFirstNameKana" layout="vertical" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} /></div>
            </div>
            <InfoRow label="生年月日" value={isEditing ? editedCase.staffBirthDate : caseData.staffBirthDate} field="staffBirthDate" type="date" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="郵便番号" value={isEditing ? editedCase.staffZipCode : caseData.staffZipCode} field="staffZipCode" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="住所" value={isEditing ? editedCase.staffAddress : caseData.staffAddress} field="staffAddress" type="textarea" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="住所 ふりがな" value={isEditing ? editedCase.staffAddressKana : caseData.staffAddressKana} field="staffAddressKana" type="textarea" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
          </Card>

          <Card title="連絡先情報">
            <InfoRow label="携帯電話番号" value={isEditing ? editedCase.phone : caseData.phone} field="phone" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
            <InfoRow label="メールアドレス" value={isEditing ? editedCase.email : caseData.email} field="email" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
          </Card>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="animate-fade-in" style={{ maxWidth: '640px' }}>
          <Card title="アカウント情報" style={{ marginBottom: '32px' }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px' }}>ログインID</div>
              <div style={{ fontWeight: 900, color: 'var(--primary)', fontFamily: 'monospace', fontSize: '1rem' }}>{(user.loginId || '').toLowerCase()}</div>
            </div>
          </Card>

          <Card title="パスワード変更">
            <form onSubmit={handlePasswordSave}>
              <Input
                label="新しいパスワード"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="8文字以上"
                required
              />
              <Input
                label="パスワード（確認）"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="もう一度入力"
                required
              />
              {passwordMsg && (
                <div style={{
                  marginBottom: '20px', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700,
                  background: passwordMsg.type === 'ok' ? '#f0fdf4' : '#fef2f2',
                  color: passwordMsg.type === 'ok' ? '#16a34a' : '#ef4444',
                  border: `1px solid ${passwordMsg.type === 'ok' ? '#bbf7d0' : '#fee2e2'}`
                }}>
                  <i className={`fa-solid ${passwordMsg.type === 'ok' ? 'fa-circle-check' : 'fa-triangle-exclamation'}`} style={{ marginRight: '8px' }}></i>
                  {passwordMsg.text}
                </div>
              )}
              <Button type="submit" disabled={passwordSaving} style={{ width: '100%' }}>
                {passwordSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : 'パスワードを変更する'}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
