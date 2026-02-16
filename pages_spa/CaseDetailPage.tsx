
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../services/dbService';
import { useAppContext } from '../App';
import { TaskStatus, MallOpeningStatus, UserStatus, AgencyApplicationStatus, UserRole, Case, User } from '../types';
import { Card, Button, Badge, Input, Select } from '../components/UI';

type TabType = 'rakuten' | 'yahoo' | 'aupay' | 'customer';

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
  const [activeTab, setActiveTab] = useState<TabType>('rakuten');
  const [isEditing, setIsEditing] = useState(false);
  const [editedCase, setEditedCase] = useState<any>(null);
  
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [customerUser, setCustomerUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicationLoading, setApplicationLoading] = useState(false);

  // データ再取得用
  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const c = await db.getCaseById(id);
      if (c) {
        setCaseData(c);
        const u = await db.getUserByEmail(c.email);
        setCustomerUser(u);
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

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
      </div>
    );
  }

  if (!caseData || !user) return <div style={{ padding: '64px', textAlign: 'center' }}>データが見つかりませんでした。</div>;

  const isAdmin = user.role === UserRole.ADMIN;

  const handleApplyForAgency = async () => {
    console.log("handleApplyForAgency triggered", { customerUser, caseData });
    
    if (!customerUser) {
      alert(`診断エラー:\nこの案件のメールアドレス「${caseData.email}」に一致するユーザーレコードがusersテーブルに見つかりません。\n\n確認事項:\n1. usersテーブルに「email: ${caseData.email}」の行が存在するか\n2. 前後に不要なスペースが含まれていないか\n3. RLS設定によりアクセスが拒否されていないか`);
      return;
    }
    
    setApplicationLoading(true);
    try {
      const res = await db.applyForAgency(customerUser.loginId);
      if (res.ok) {
        alert('代理店昇格申請を送信しました。管理者の承認をお待ちください。');
        await loadData(); // ページリロードせずデータを再取得
      } else {
        const errorMsg = res.error?.message || "更新された行がありません。";
        alert(`申請に失敗しました。\n理由: ${errorMsg}\n\nヒント: RLS(行セキュリティ)で、代理店によるusersテーブルの更新が許可されているか確認してください。`);
      }
    } catch (e: any) {
      console.error("Application error:", e);
      alert('システムエラーが発生しました: ' + e.message);
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

  const handleMallStatusChange = async (mall: 'rakuten' | 'yahoo' | 'aupay', status: MallOpeningStatus) => {
    const updatedMallProgress = { ...caseData.mallProgress, [mall]: status };
    await db.updateCase(caseData.id, { mallProgress: updatedMallProgress }, user);
    await loadData();
  };

  const startEdit = () => {
    setEditedCase({ ...caseData });
    setIsEditing(true);
  };

  const saveChanges = async () => {
    if (caseData && editedCase) {
      const result = await db.updateCase(caseData.id, editedCase, user);
      if (result) {
        setIsEditing(false);
        await loadData();
      }
    }
  };

  const InfoRow = ({ label, value, field, group, isDate }: { label: string; value?: string | React.ReactNode, field?: string, group?: string, isDate?: boolean }) => (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '14px 0', alignItems: 'center' }}>
      <div style={{ width: '220px', color: 'var(--text-sub)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ flex: 1, color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem' }}>
        {isEditing && field ? (
          <Input 
            type={isDate ? 'date' : 'text'}
            value={group ? (editedCase[group]?.[field] || '') : (editedCase[field] || '')} 
            onChange={e => {
              if (group) setEditedCase({...editedCase, [group]: {...editedCase[group], [field]: e.target.value}});
              else setEditedCase({...editedCase, [field]: e.target.value});
            }} 
            style={{ marginBottom: 0 }} 
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDate && value ? <>{value} <span style={{ color: 'var(--text-sub)', fontSize: '0.75rem' }}>（{formatToWareki(String(value))}）</span></> : (value || <span style={{color: 'var(--border)'}}>---</span>)}
            {!isEditing && value && (
              <button onClick={() => navigator.clipboard.writeText(String(value))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.8rem', opacity: 0.5 }}>
                <i className="fa-regular fa-copy"></i>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const StatusSection = ({ title, status, mall, color }: { title: string, status: string, mall: 'rakuten' | 'yahoo' | 'aupay', color: string }) => (
    <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--border)', borderLeft: `6px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px', textTransform: 'uppercase' }}>{title}</div>
        <Badge color={color}>{status}</Badge>
      </div>
      <div style={{ width: '360px' }}>
        <Select value={status} onChange={(e) => handleMallStatusChange(mall, e.target.value as MallOpeningStatus)} style={{ marginBottom: 0, height: '48px', fontSize: '0.95rem', fontWeight: 700, padding: '0 16px', width: '100%' }}>
          {Object.values(MallOpeningStatus).map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
    </div>
  );

  const agencyAmount = caseData.isManualAdjustment ? (caseData.manualAgencyAmount || 0) : (caseData.baseAmount * caseData.appliedRate);
  
  const isRegisteredAgency = customerUser?.status === UserStatus.AGENCY;
  const isApproved = customerUser?.agencyApplicationStatus === AgencyApplicationStatus.APPROVED;
  const isUsed = !!customerUser?.registrationCodeUsedAt;
  const showCodeArea = isApproved && !isRegisteredAgency && !isUsed;

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Link to="/cases" style={{ color: 'var(--text-sub)', textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem' }}><i className="fa-solid fa-arrow-left"></i> 顧客一覧に戻る</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ color: 'var(--text-sub)', fontWeight: 800, fontSize: '0.85rem' }}>顧客ID: {caseData.id}</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.03em' }}>
            {caseData.companyName || caseData.repName} <span style={{fontSize: '1.2rem', color: 'var(--text-sub)'}}>様</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isEditing ? (
            <Button onClick={startEdit} variant="ghost" style={{ border: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
              <i className="fa-solid fa-pen-to-square"></i> 編集
            </Button>
          ) : (
            <><Button onClick={() => setIsEditing(false)} variant="ghost">キャンセル</Button><Button onClick={saveChanges}>保存</Button></>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '32px' }}>
        <button onClick={() => setActiveTab('rakuten')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'rakuten' ? '#bf0000' : 'var(--text-sub)', borderBottom: activeTab === 'rakuten' ? '4px solid #bf0000' : '4px solid transparent' }}>楽天市場</button>
        <button onClick={() => setActiveTab('yahoo')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'yahoo' ? '#ff0033' : 'var(--text-sub)', borderBottom: activeTab === 'yahoo' ? '4px solid #ff0033' : '4px solid transparent' }}>Yahoo!</button>
        <button onClick={() => setActiveTab('aupay')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'aupay' ? '#f58220' : 'var(--text-sub)', borderBottom: activeTab === 'aupay' ? '4px solid #f58220' : '4px solid transparent' }}>au PAY</button>
        <button onClick={() => setActiveTab('customer')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'customer' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'customer' ? '4px solid var(--primary)' : '4px solid transparent' }}>顧客基本情報</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {activeTab === 'rakuten' && (
            <div className="animate-fade-in">
              <StatusSection title="楽天市場 開設状況" status={caseData.mallProgress.rakuten} mall="rakuten" color="#bf0000" />
              <Card title="楽天アカウント情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="申込ID" value={caseData.rakutenInfo?.applyId} field="applyId" group="rakutenInfo" />
                  <InfoRow label="申込パスワード" value={caseData.rakutenInfo?.applyPass} field="applyPass" group="rakutenInfo" />
                </div>
              </Card>
            </div>
          )}
          {activeTab === 'customer' && (
            <div className="animate-fade-in">
              <Card title="法人/事業主情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="法人名/屋号" value={caseData.companyName} field="companyName" />
                  <InfoRow label="代表者氏名" value={caseData.representativeName} field="representativeName" />
                  <InfoRow label="メールアドレス" value={caseData.email} field="email" />
                </div>
              </Card>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <Card title="代理店アカウント管理">
            <div style={{ padding: '24px' }}>
              {isRegisteredAgency ? (
                <div style={{ textAlign: 'center' }}>
                  <Badge color="#10b981" style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}>
                    <i className="fa-solid fa-check-circle"></i> 代理店登録済み
                  </Badge>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '12px', fontWeight: 600 }}>ID: {caseData.id} で運用中</p>
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
                      <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--primary)' }}>{caseData.id}</span>
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
              ) : customerUser?.agencyApplicationStatus === AgencyApplicationStatus.PENDING ? (
                <div style={{ textAlign: 'center' }}>
                  <Badge color="#f59e0b" style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}>
                    <i className="fa-solid fa-clock"></i> 昇格申請中
                  </Badge>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '12px', fontWeight: 600 }}>管理者の承認をお待ちください。</p>
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
            </div>
          </Card>

          {isAdmin && (
            <Card title="収益サマリー (管理者)" style={{ border: '1px solid var(--primary)', background: 'rgba(79, 70, 229, 0.02)' }}>
              <div style={{ padding: '24px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px' }}>代理店報酬</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>¥{agencyAmount.toLocaleString()}</div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseDetailPage;
