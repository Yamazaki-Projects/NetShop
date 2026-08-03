
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../services/dbService';
import { useAppContext } from '../App';
import { MallOpeningStatus, UserStatus, AgencyApplicationStatus, UserRole, Case, User, ProgressComment, InitialCommission, isAdminRole } from '../types';
import { Card, Button, Badge, Input, Select, Textarea } from '../components/UI';
import InfoRow from '../components/InfoRow';

type TabType = 'opening' | 'basic';

const formatToWareki = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ja-JP-u-ca-japanese', { dateStyle: 'long' }).format(date);
};

const CaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('opening');
  const [isEditing, setIsEditing] = useState(false);
  const [editedCase, setEditedCase] = useState<any>(null);
  
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [customerUser, setCustomerUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [commission, setCommission] = useState<InitialCommission | null>(null);
  const [commissionUpdating, setCommissionUpdating] = useState(false);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState('');

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const c = await db.getCaseById(id);
      if (c) {
        setCaseData(c);
        const [u, commissions] = await Promise.all([
          db.getUserByLoginId(c.id),
          db.getInitialCommissions()
        ]);
        setCustomerUser(u);
        const caseCommission = commissions.find(ic => (ic.caseId || '').toLowerCase() === (c.id || '').toLowerCase());
        setCommission(caseCommission || null);
      }
    } catch (err) {
      console.error("Failed to load details", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleFieldChange = useCallback((value: string, field: string, group?: string) => {
    setEditedCase((prev: any) => {
      if (!prev) return prev;
      if (group) {
        return {
          ...prev,
          [group]: {
            ...(prev[group] || {}),
            [field]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
      </div>
    );
  }

  if (!caseData || !user) return <div style={{ padding: '64px', textAlign: 'center' }}>データが見つかりませんでした。</div>;

  const isAdmin = isAdminRole(user.role);

  const handleApplyForAgency = async () => {
    setApplicationLoading(true);
    try {
      const res = await db.applyForAgency(caseData, user);
      if (res.ok) {
        alert('代理店昇格申請を送信しました。管理者の承認をお待ちください。');
        await loadData();
      } else {
        alert(`申請に失敗しました。\n理由: ${res.error?.message || "データの更新に失敗しました。"}`);
      }
    } catch (e: any) {
      alert('システムエラーが発生しました: ' + e.message);
    } finally {
      setApplicationLoading(false);
    }
  };

  const handleCancelAgency = async () => {
    if (!customerUser || !window.confirm('代理店昇格申請を取り消しますか？')) return;
    setApplicationLoading(true);
    try {
      const res = await db.cancelAgencyApplication(customerUser.loginId);
      if (res.ok) {
        await loadData();
      } else {
        alert('取り消しに失敗しました。');
      }
    } catch (e: any) {
      alert('エラー: ' + e.message);
    } finally {
      setApplicationLoading(false);
    }
  };

  const handleReissueCode = async () => {
    if (!customerUser || !window.confirm('新しい登録コードを発行しますか？以前のコードは無効になります。')) return;
    const res = await db.reissueRegistrationCode(customerUser.loginId);
    if (res.ok) {
      alert('登録コードを再発行しました。');
      await loadData();
    }
  };

  const startEdit = () => {
    setEditedCase({ ...caseData });
    setIsEditing(true);
  };

  const saveChanges = async () => {
    if (caseData && editedCase) {
      try {
        const result = await db.updateCase(caseData.id, editedCase, user);
        if (result) {
          setIsEditing(false);
          await loadData();
        } else {
          alert('保存に失敗しました。データが見つかりませんでした。');
        }
      } catch (err: any) {
        alert('保存エラー: ' + (err.message || '不明なエラー'));
        console.error('saveChanges error:', err);
      }
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const comment: ProgressComment = {
      id: Date.now().toString(),
      text: newComment,
      createdAt: new Date().toISOString()
    };
    const updatedComments = [...(caseData.progressComments || []), comment];
    const result = await db.updateCase(caseData.id, { progressComments: updatedComments }, user);
    if (result) {
      setNewComment('');
      await loadData();
    }
  };

  const isRegisteredAgency = customerUser?.status === UserStatus.AGENCY;
  const isApproved = customerUser?.agencyApplicationStatus === AgencyApplicationStatus.APPROVED;
  const isUsed = !!customerUser?.registrationCodeUsedAt;
  const showCodeArea = isApproved && !isRegisteredAgency && !isUsed;

  const mallStatusOptions = Object.values(MallOpeningStatus).map(s => ({ label: s, value: s }));

  const isMobile = windowWidth < 768;

  const handleCommissionStatusToggle = async () => {
    if (!commission) return;
    setCommissionUpdating(true);
    const newStatus = commission.status === 'pending' ? 'paid' : 'pending';
    await db.updateInitialCommissionStatus(commission.id, newStatus);
    await loadData();
    setCommissionUpdating(false);
  };

  const handleAmountSave = async () => {
    if (!commission) return;
    const parsed = parseInt(amountInput.replace(/,/g, ''), 10);
    if (isNaN(parsed) || parsed < 0) return;
    setCommissionUpdating(true);
    await db.updateInitialCommissionAmount(commission.id, parsed);
    setEditingAmount(false);
    await loadData();
    setCommissionUpdating(false);
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', marginBottom: '40px', gap: '20px' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Link to="/cases" style={{ color: 'var(--text-sub)', textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem' }}><i className="fa-solid fa-arrow-left"></i> 顧客一覧に戻る</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ color: 'var(--text-sub)', fontWeight: 800, fontSize: '0.85rem' }}>顧客ID: {(caseData.id || '').toLowerCase()}</span>
          </div>
          <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.03em' }}>
            {[caseData.repLastName, caseData.repFirstName].filter(Boolean).join(' ') || caseData.companyName} <span style={{fontSize: '1.2rem', color: 'var(--text-sub)'}}>様</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
          {!isEditing ? (
            <Button onClick={startEdit} variant="ghost" style={{ flex: isMobile ? 1 : 'none', border: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
              <i className="fa-solid fa-pen-to-square"></i> 編集
            </Button>
          ) : (
            <>
              <Button onClick={() => setIsEditing(false)} variant="ghost" style={{ flex: 1 }}>キャンセル</Button>
              <Button onClick={saveChanges} style={{ flex: 1 }}>保存</Button>
            </>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '32px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <button onClick={() => setActiveTab('opening')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'opening' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'opening' ? '4px solid var(--primary)' : '4px solid transparent' }}>ショップ開設</button>
        <button onClick={() => setActiveTab('basic')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'basic' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'basic' ? '4px solid var(--primary)' : '4px solid transparent' }}>顧客基本情報</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '100%' : '1fr 420px', gap: '32px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0 }}>
          {activeTab === 'opening' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <Card title="050番号情報">
                <InfoRow label="電話タイプ" value={isEditing ? editedCase.subline?.phoneType : caseData.subline?.phoneType} field="phoneType" group="subline" type="select" options={[{label: '050番号', value: '050'}, {label: '固定電話', value: 'landline'}]} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                { (isEditing ? editedCase.subline?.phoneType : caseData.subline?.phoneType) !== 'landline' && (
                  <>
                    <InfoRow label="050番号" value={isEditing ? editedCase.subline?.number050 : caseData.subline?.number050} field="number050" group="subline" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                    <InfoRow label="取得サイト" value={isEditing ? editedCase.subline?.siteType : caseData.subline?.siteType} field="siteType" group="subline" type="select" options={[{label: 'subline', value: 'subline'}, {label: '他のサイト', value: 'other'}]} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                    { (isEditing ? editedCase.subline?.siteType : caseData.subline?.siteType) === 'other' && (
                      <InfoRow label="URL" value={isEditing ? editedCase.subline?.otherUrl : caseData.subline?.otherUrl} field="otherUrl" group="subline" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                    )}
                    <InfoRow label="ID" value={isEditing ? editedCase.subline?.loginId : caseData.subline?.loginId} field="loginId" group="subline" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                    <InfoRow label="パスワード" value={isEditing ? editedCase.subline?.password : caseData.subline?.password} field="password" group="subline" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                  </>
                )}
                { (isEditing ? editedCase.subline?.phoneType : caseData.subline?.phoneType) === 'landline' && (
                  <InfoRow label="電話番号" value={isEditing ? editedCase.subline?.number050 : caseData.subline?.number050} field="number050" group="subline" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                )}
              </Card>

              <Card title="e-mail.jp 情報">
                <InfoRow label="ドメイン" value={isEditing ? editedCase.emailJp?.domainType : caseData.emailJp?.domainType} field="domainType" group="emailJp" type="select" options={[{label: 'e-mail.jp', value: 'email_jp'}, {label: 'ほかのドメイン', value: 'other'}]} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                { (isEditing ? editedCase.emailJp?.domainType : caseData.emailJp?.domainType) === 'other' && (
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

          {activeTab === 'basic' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <Card title="基本情報">
                <InfoRow label="区分" value={isEditing ? editedCase.customerType : caseData.customerType} field="customerType" type="select" options={[{label: '法人', value: 'corporation'}, {label: '個人事業主', value: 'sole_proprietor'}]} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                <InfoRow label="法人名/屋号" value={isEditing ? editedCase.companyName : caseData.companyName} field="companyName" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                <InfoRow label="法人名/屋号 ふりがな" value={isEditing ? editedCase.companyNameKana : caseData.companyNameKana} field="companyNameKana" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                <InfoRow label="郵便番号" value={isEditing ? editedCase.companyZipCode : caseData.companyZipCode} field="companyZipCode" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                <InfoRow label="住所" value={isEditing ? editedCase.companyAddress : caseData.companyAddress} field="companyAddress" type="textarea" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                <InfoRow label="住所 ふりがな" value={isEditing ? editedCase.companyAddressKana : caseData.companyAddressKana} field="companyAddressKana" type="textarea" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                { (isEditing ? editedCase.customerType : caseData.customerType) === 'corporation' && (
                  <InfoRow label="法人番号" value={isEditing ? editedCase.corporateNumber : caseData.corporateNumber} field="corporateNumber" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                )}
                <InfoRow label="設立/開業年月日" value={isEditing ? editedCase.establishedDate : caseData.establishedDate} field="establishedDate" type="date" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
              </Card>

              { (isEditing ? editedCase.customerType : caseData.customerType) === 'corporation' && (
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

              <Card title="連絡先・報酬情報">
                <InfoRow label="携帯電話番号" value={isEditing ? editedCase.phone : caseData.phone} field="phone" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                <InfoRow label="メールアドレス" value={isEditing ? editedCase.email : caseData.email} field="email" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                <InfoRow label="金額" value={isEditing ? editedCase.baseAmount : caseData.baseAmount} field="baseAmount" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                <InfoRow label="デポジット有無" value={isEditing ? String(editedCase.deposit) : String(caseData.deposit)} field="deposit" type="select" options={[{label: '有', value: 'true'}, {label: '無', value: 'false'}]} isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                { (isEditing ? String(editedCase.deposit) === 'true' : caseData.deposit) && (
                  <InfoRow label="デポジット金額" value={isEditing ? editedCase.depositAmount : caseData.depositAmount} field="depositAmount" isEditing={isEditing} onChange={handleFieldChange} formatToWareki={formatToWareki} />
                )}
              </Card>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <Card title="代理店アカウント管理">
            {isRegisteredAgency ? (
              <div style={{ textAlign: 'center' }}>
                <Badge color="#10b981" style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}>
                  <i className="fa-solid fa-check-circle"></i> 代理店登録済み
                </Badge>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '12px', fontWeight: 600 }}>ID: {(caseData.id || '').toLowerCase()} で運用中</p>
              </div>
            ) : showCodeArea ? (
              <div style={{ textAlign: 'left' }}>
                <Badge color="#0ea5e9" style={{ width: '100%', padding: '12px', fontSize: '0.9rem', marginBottom: '16px' }}>
                  <i className="fa-solid fa-star"></i> 昇格承認済み
                </Badge>
                <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1.5px dashed var(--border)', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 800, marginBottom: '8px' }}>顧客へ共有する情報:</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>顧客ID:</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--primary)' }}>{(caseData.id || '').toLowerCase()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>登録コード:</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--accent)' }}>{customerUser?.registrationCode}</span>
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: '16px', fontWeight: 600, lineHeight: 1.5 }}>
                  顧客へ「顧客ID」と「登録コード」を伝え、ログイン画面のリンクからパスワード設定を依頼してください。
                </p>
                <Button onClick={handleReissueCode} variant="ghost" style={{ width: '100%', border: '1px solid var(--border)', fontSize: '0.8rem' }}>
                  登録コードを再発行する
                </Button>
              </div>
            ) : (customerUser?.agencyApplicationStatus === AgencyApplicationStatus.PENDING) ? (
              <div style={{ textAlign: 'center' }}>
                <Badge color="#f59e0b" style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}>
                  <i className="fa-solid fa-clock"></i> 昇格申請中
                </Badge>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '12px', fontWeight: 600 }}>管理者の承認をお待ちください。</p>
                <Button
                  onClick={handleCancelAgency}
                  variant="ghost"
                  disabled={applicationLoading}
                  style={{ width: '100%', marginTop: '12px', fontSize: '0.8rem', border: '1px solid var(--border)', color: '#ef4444' }}
                >
                  {applicationLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : '申請を取り消す'}
                </Button>
              </div>
            ) : isUsed ? (
              <div style={{ textAlign: 'center' }}>
                <Badge color="#94a3b8" style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}>登録コード使用済み</Badge>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '12px', fontWeight: 600 }}>登録処理が完了しました。</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '16px', fontWeight: 600 }}>この顧客を代理店へ昇格させることができます。</p>
                <Button 
                  onClick={handleApplyForAgency} 
                  disabled={applicationLoading} 
                  style={{ width: '100%', height: '50px' }}
                >
                  {applicationLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : '代理店昇格を申請する'}
                </Button>
              </>
            )}
          </Card>

          {isAdmin && commission && (
            <Card title="初期報酬 (管理者)" style={{ border: '1px solid var(--primary)', background: 'rgba(79, 70, 229, 0.02)' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px' }}>受取代理店</div>
                <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{commission.recipientName}</div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)' }}>報酬額</span>
                  {!editingAmount && (
                    <button
                      onClick={() => { setEditingAmount(true); setAmountInput(String(commission.amount)); }}
                      style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                    >
                      <i className="fa-solid fa-pen"></i> 変更
                    </button>
                  )}
                </div>
                {editingAmount ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--text-sub)' }}>¥</span>
                      <input
                        type="number"
                        value={amountInput}
                        onChange={e => setAmountInput(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px 10px 28px', border: '2px solid var(--primary)', borderRadius: '10px', fontSize: '1.1rem', fontWeight: 800, outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                        autoFocus
                      />
                    </div>
                    <Button onClick={handleAmountSave} disabled={commissionUpdating} style={{ padding: '10px 16px', fontSize: '0.8rem' }}>保存</Button>
                    <Button variant="ghost" onClick={() => setEditingAmount(false)} style={{ padding: '10px 12px', fontSize: '0.8rem' }}>✕</Button>
                  </div>
                ) : (
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    ¥{commission.amount.toLocaleString()}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '6px' }}>支払い状況</div>
                <span style={{
                  fontSize: '0.8rem', fontWeight: 800, padding: '4px 12px', borderRadius: '8px',
                  background: commission.status === 'paid' ? '#dcfce7' : '#fef3c7',
                  color: commission.status === 'paid' ? '#16a34a' : '#b45309'
                }}>
                  {commission.status === 'paid' ? `支払済 (${commission.paidAt ? new Date(commission.paidAt).toLocaleDateString('ja-JP') : ''})` : '未払い'}
                </span>
              </div>

              <Button
                onClick={handleCommissionStatusToggle}
                disabled={commissionUpdating}
                variant={commission.status === 'paid' ? 'ghost' : undefined}
                style={{ width: '100%', fontSize: '0.8rem' }}
              >
                {commissionUpdating
                  ? <i className="fa-solid fa-spinner fa-spin"></i>
                  : commission.status === 'paid' ? '未払いに戻す' : '支払済にする'}
              </Button>
            </Card>
          )}

          <Card title="進捗コメント">
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'flex-start' }}>
              <Input
                placeholder="進捗コメントを入力..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                containerStyle={{ marginBottom: 0, flex: 1 }}
              />
              <Button onClick={handleAddComment} disabled={!newComment.trim()} style={{ height: '50px', flexShrink: 0 }}>追加</Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {caseData.progressComments?.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '20px' }}>コメントはありません。</div>
              ) : (
                [...(caseData.progressComments || [])].reverse().map(c => (
                  <div key={c.id} style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 800 }}>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'pre-wrap' }}>{c.text}</div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {isEditing && (
        <div style={{
          position: 'sticky',
          bottom: 0,
          marginTop: '32px',
          padding: '16px 0',
          background: 'var(--bg-main)',
          borderTop: '2px solid var(--border)',
          display: 'flex',
          gap: '12px',
          zIndex: 100,
        }}>
          <Button onClick={() => setIsEditing(false)} variant="ghost" style={{ flex: 1 }}>キャンセル</Button>
          <Button onClick={saveChanges} style={{ flex: 1 }}>保存</Button>
        </div>
      )}
    </div>
  );
};

export default CaseDetailPage;
