
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      setLoading(true);
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
    };
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
      </div>
    );
  }

  if (!caseData || !user) return <div style={{ padding: '64px', textAlign: 'center' }}>データが見つかりませんでした。</div>;

  const isAdmin = user.role === UserRole.ADMIN;

  const handleTaskToggle = async (taskId: string, currentStatus: TaskStatus) => {
    const statuses: TaskStatus[] = [TaskStatus.TODO, TaskStatus.DOING, TaskStatus.WAITING, TaskStatus.DONE];
    const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    await db.updateCase(caseData.id, { 
      tasks: caseData.tasks.map(t => t.id === taskId ? { ...t, status: statuses[nextIndex] } : t)
    }, user);
    navigate(0);
  };

  const handleMallStatusChange = async (mall: 'rakuten' | 'yahoo' | 'aupay', status: MallOpeningStatus) => {
    const updatedMallProgress = { ...caseData.mallProgress, [mall]: status };
    await db.updateCase(caseData.id, { mallProgress: updatedMallProgress }, user);
    navigate(0);
  };

  const handleFinancialUpdate = async (updates: Partial<Case>) => {
    if (!isAdmin) return;
    await db.updateCase(caseData.id, updates, user);
    navigate(0);
  };

  const handleApplyAgency = async () => {
    if (!window.confirm('この顧客を代理店パートナーへ昇格申請しますか？')) return;
    const ok = await db.applyForAgencyByCase(caseData, user);
    if (ok) {
      alert('代理店昇格申請を受け付けました。管理者の承認完了までしばらくお待ちください。');
      navigate(0);
    } else {
      alert('申請処理中にエラーが発生しました。');
    }
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
        navigate(0);
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

  const StatusSection = ({ title, status, mall, color }: { title: string, status: string, mall?: 'rakuten' | 'yahoo' | 'aupay', color: string }) => (
    <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '16px', marginBottom: '24px', border: '1px solid var(--border)', borderLeft: `6px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px', textTransform: 'uppercase' }}>{title}</div>
        <Badge color={color}>{status}</Badge>
      </div>
      {mall && (
        <div style={{ width: '360px' }}>
          <Select value={status} onChange={(e) => handleMallStatusChange(mall, e.target.value as MallOpeningStatus)} style={{ marginBottom: 0, height: '48px', fontSize: '0.95rem', fontWeight: 700, padding: '0 16px', width: '100%' }}>
            {Object.values(MallOpeningStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      )}
    </div>
  );

  const agencyAmount = caseData.isManualAdjustment ? (caseData.manualAgencyAmount || 0) : (caseData.baseAmount * caseData.appliedRate);
  const isAgency = customerUser?.status === UserStatus.AGENCY;
  const applicationStatus = customerUser?.agencyApplicationStatus || AgencyApplicationStatus.NONE;

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
                  <InfoRow label="R-Login ID" value={caseData.rakutenInfo?.rLoginId} field="rLoginId" group="rakutenInfo" />
                  <InfoRow label="R-Login パスワード" value={caseData.rakutenInfo?.rLoginPass} field="rLoginPass" group="rakutenInfo" />
                  <InfoRow label="個人ID" value={caseData.rakutenInfo?.personalId} field="personalId" group="rakutenInfo" />
                  <InfoRow label="個人パスワード" value={caseData.rakutenInfo?.personalPass} field="personalPass" group="rakutenInfo" />
                  <InfoRow label="billpay ID" value={caseData.rakutenInfo?.billpayId} field="billpayId" group="rakutenInfo" />
                  <InfoRow label="billpay パスワード" value={caseData.rakutenInfo?.billpayPass} field="billpayPass" group="rakutenInfo" />
                </div>
              </Card>

              <div style={{marginTop: '32px'}}>
                <Card title="050番号 (Subline)">
                  <div style={{ padding: '0 28px 28px' }}>
                    <InfoRow label="050番号" value={caseData.subline?.number050} field="number050" group="subline" />
                    <InfoRow label="ログインID" value={caseData.subline?.loginId} field="loginId" group="subline" />
                    <InfoRow label="パスワード" value={caseData.subline?.password} field="password" group="subline" />
                  </div>
                </Card>
              </div>

              <div style={{marginTop: '32px'}}>
                <Card title="e-mail.jp">
                  <div style={{ padding: '0 28px 28px' }}>
                    <InfoRow label="メールアドレス" value={caseData.emailJp?.email} field="email" group="emailJp" />
                    <InfoRow label="パスワード" value={caseData.emailJp?.password} field="password" group="emailJp" />
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'yahoo' && (
            <div className="animate-fade-in">
              <StatusSection title="Yahoo! ショッピング 開設状況" status={caseData.mallProgress.yahoo} mall="yahoo" color="#ff0033" />
              <Card title="Yahoo! アカウント情報">
                <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.85rem' }}>
                  Yahoo!ショッピングのアカウント詳細は準備中です。
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'aupay' && (
            <div className="animate-fade-in">
              <StatusSection title="au PAY マーケット 開設状況" status={caseData.mallProgress.aupay} mall="aupay" color="#f58220" />
              <Card title="au PAY アカウント情報">
                <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.85rem' }}>
                  au PAY マーケットのアカウント詳細は準備中です。
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'customer' && (
            <div className="animate-fade-in">
              <Card title="法人/事業主情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="顧客種別" value={caseData.customerType === 'corporation' ? '法人' : '個人事業主'} field="customerType" />
                  <InfoRow label="法人名/屋号" value={caseData.companyName} field="companyName" />
                  <InfoRow label="法人名(かな)" value={caseData.companyNameKana} field="companyNameKana" />
                  <InfoRow label="代表者氏名" value={caseData.representativeName} field="representativeName" />
                  <InfoRow label="代表者氏名(かな)" value={caseData.representativeNameKana} field="representativeNameKana" />
                  <InfoRow label="代表者生年月日" value={caseData.repBirthDate} field="repBirthDate" isDate />
                  <InfoRow label="法人番号" value={caseData.corporateNumber} field="corporateNumber" />
                  <InfoRow label="設立年月日" value={caseData.establishedDate} field="establishedDate" isDate />
                  <InfoRow label="所在地郵便番号" value={caseData.zipCode} field="zipCode" />
                  <InfoRow label="所在地住所" value={caseData.address} field="address" />
                </div>
              </Card>
              <div style={{marginTop: '32px'}}>
                <Card title="担当者個人情報">
                  <div style={{ padding: '0 28px 28px' }}>
                    <InfoRow label="氏名(漢字)" value={caseData.repName} field="repName" />
                    <InfoRow label="氏名(かな)" value={caseData.repNameKana} field="repNameKana" />
                    <InfoRow label="生年月日" value={caseData.repBirthDate} field="repBirthDate" isDate />
                    <InfoRow label="携帯電話番号" value={caseData.phone} field="phone" />
                    <InfoRow label="メールアドレス" value={caseData.email} field="email" />
                    <InfoRow label="自宅郵便番号" value={caseData.repZipCode} field="repZipCode" />
                    <InfoRow label="自宅住所" value={caseData.repAddress} field="repAddress" />
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* パートナー昇格申請 */}
          {!isAgency && (
            <Card title="パートナー昇格申請" style={{ border: '2px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                {applicationStatus === AgencyApplicationStatus.NONE ? (
                  <>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '16px', fontWeight: 700, lineHeight: 1.5 }}>
                      この顧客を代理店パートナーへ昇格させることができます。
                    </p>
                    <Button onClick={handleApplyAgency} style={{ width: '100%', background: '#f59e0b', color: 'white' }}>
                      <i className="fa-solid fa-user-plus"></i> 代理店として申請する
                    </Button>
                  </>
                ) : (
                  <Badge color="#f59e0b" style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}>
                    <i className="fa-solid fa-clock-rotate-left"></i> {applicationStatus === AgencyApplicationStatus.PENDING ? '審査中' : '承認済 (パスワード設定待ち)'}
                  </Badge>
                )}
              </div>
            </Card>
          )}

          {isAdmin && (
            <Card title="収益サマリー (管理者)" style={{ border: '1px solid var(--primary)', background: 'rgba(79, 70, 229, 0.02)' }}>
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)' }}>合計金額 (税込)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Input type="number" value={caseData.baseAmount} onChange={(e) => handleFinancialUpdate({ baseAmount: parseInt(e.target.value, 10) })} style={{ marginBottom: 0, fontSize: '1.25rem', fontWeight: 900 }} />
                    <span style={{ fontWeight: 800 }}>円</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px' }}>代理店報酬</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>¥{agencyAmount.toLocaleString()}</div>
              </div>
            </Card>
          )}

          <Card title="ToDo 進捗">
            <div style={{ padding: '20px' }}>
              {caseData.tasks.length > 0 ? caseData.tasks.map(task => (
                <div key={task.id} onClick={() => handleTaskToggle(task.id, task.status)} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', background: 'var(--bg-main)', borderRadius: '14px', marginBottom: '8px', cursor: 'pointer', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{task.title}</div>
                  <Badge color="#4f46e5" style={{ fontSize: '0.65rem' }}>{task.status}</Badge>
                </div>
              )) : <div style={{textAlign:'center', color:'var(--text-sub)', fontSize:'0.8rem'}}>タスクなし</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CaseDetailPage;
