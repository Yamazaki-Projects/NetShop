
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../services/dbService';
import { useAppContext } from '../App';
import { TaskStatus, MallOpeningStatus, UserStatus, AgencyApplicationStatus, UserRole, Case } from '../types';
import { Card, Button, Badge, Input, Select } from '../components/UI';
import { TASK_STATUS_COLORS } from '../constants';

type TabType = 'rakuten' | 'yahoo' | 'aupay' | 'customer';

// 和暦変換ユーティリティ
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

  const caseData = db.getCaseById(id || '');
  const customerUser = caseData ? db.getUserByEmail(caseData.email) : null;

  if (!caseData || !user) return <div style={{ padding: '48px', textAlign: 'center' }}>案件が見つかりませんでした。</div>;

  const isAdmin = user.role === UserRole.ADMIN;

  const handleTaskToggle = (taskId: string, currentStatus: TaskStatus) => {
    const statuses: TaskStatus[] = [TaskStatus.TODO, TaskStatus.DOING, TaskStatus.WAITING, TaskStatus.DONE];
    const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    db.updateCase(caseData.id, { 
      tasks: caseData.tasks.map(t => t.id === taskId ? { ...t, status: statuses[nextIndex] } : t)
    }, user);
    navigate(0);
  };

  const handleMallStatusChange = (mall: 'rakuten' | 'yahoo' | 'aupay', status: MallOpeningStatus) => {
    const updatedMallProgress = { ...caseData.mallProgress, [mall]: status };
    db.updateCase(caseData.id, { mallProgress: updatedMallProgress }, user);
    navigate(0);
  };

  const handleFinancialUpdate = (updates: Partial<Case>) => {
    if (!isAdmin) return;
    db.updateCase(caseData.id, updates, user);
    navigate(0);
  };

  const handleApplyAgency = () => {
    if (customerUser && db.applyForAgency(customerUser.id, user)) {
      alert('代理店昇格申請を送信しました。');
      navigate(0);
    }
  };

  const startEdit = () => {
    setEditedCase({ ...caseData });
    setIsEditing(true);
  };

  const saveChanges = () => {
    db.updateCase(caseData.id, editedCase, user);
    setIsEditing(false);
    navigate(0);
  };

  const InfoRow = ({ label, value, field, group, isDate }: { label: string; value?: string | React.ReactNode, field?: string, group?: string, isDate?: boolean }) => (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '16px 0', alignItems: 'center' }}>
      <div style={{ width: '180px', color: 'var(--text-sub)', fontWeight: 700, fontSize: '0.85rem' }}>{label}</div>
      <div style={{ flex: 1, color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem' }}>
        {isEditing && field ? (
          <Input 
            type={isDate ? 'date' : 'text'}
            value={group ? (editedCase[group]?.[field] || '') : (editedCase[field] || '')} 
            onChange={e => {
              if (group) {
                setEditedCase({...editedCase, [group]: {...editedCase[group], [field]: e.target.value}});
              } else {
                setEditedCase({...editedCase, [field]: e.target.value});
              }
            }} 
            style={{ marginBottom: 0 }} 
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isDate && value ? (
              <>
                {value} <span style={{ color: 'var(--text-sub)', fontSize: '0.8rem' }}>（{formatToWareki(String(value))}）</span>
              </>
            ) : (
              value || '---'
            )}
            {!isEditing && value && (
              <button onClick={() => navigator.clipboard.writeText(String(value))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.75rem' }}>
                <i className="fa-regular fa-copy"></i>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const MallStatusPanel = ({ mall, color, title }: { mall: 'rakuten' | 'yahoo' | 'aupay', color: string, title: string }) => (
    <div style={{ padding: '24px', background: 'var(--bg-main)', borderRadius: '16px', marginBottom: '32px', border: `1px solid var(--border)`, borderLeft: `6px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px' }}>{title} 開設状況</div>
        <Badge color={color}>{caseData.mallProgress[mall]}</Badge>
      </div>
      <div style={{ width: '200px' }}>
        <Select 
          value={caseData.mallProgress[mall]}
          onChange={(e) => handleMallStatusChange(mall, e.target.value as MallOpeningStatus)}
          style={{ marginBottom: 0, fontSize: '0.85rem', height: 'auto', padding: '8px 12px', fontWeight: 700 }}
        >
          {Object.values(MallOpeningStatus).map(status => <option key={status} value={status}>{status}</option>)}
        </Select>
      </div>
    </div>
  );

  const ExternalLinkCard = ({ title, url, icon, color }: { title: string, url: string, icon: string, color: string }) => (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ 
      textDecoration: 'none', 
      minWidth: '240px',
      flex: '1 1 300px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px', 
      padding: '14px 18px', 
      background: 'var(--bg-card)', 
      border: '1.5px solid var(--border)', 
      borderRadius: '12px',
      transition: 'all 0.2s',
      color: 'var(--text-main)'
    }} onMouseOver={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${color}22`; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}11`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{title}</div>
      </div>
      <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.7rem', opacity: 0.3 }}></i>
    </a>
  );

  const LinkGroupHeader = ({ title, color }: { title: string, color: string }) => (
    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '12px', marginTop: '16px', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '4px', height: '12px', background: color, borderRadius: '2px' }}></div>
      {title}
    </div>
  );

  // 報酬計算ロジック
  const agencyAmount = caseData.isManualAdjustment 
    ? (caseData.manualAgencyAmount || 0) 
    : (caseData.baseAmount * caseData.appliedRate);
  const adminAmount = caseData.baseAmount - agencyAmount;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Link to="/cases" style={{ color: 'var(--text-sub)', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}><i className="fa-solid fa-arrow-left"></i> 案件一覧</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ color: 'var(--text-sub)', fontWeight: 700, fontSize: '0.9rem' }}>{caseData.id}</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
            {caseData.companyName || caseData.repName} 様
            {customerUser && (
              <span style={{ fontSize: '1rem', color: 'var(--text-sub)', fontWeight: 600, marginLeft: '12px', verticalAlign: 'middle' }}>
                ID: {customerUser.loginId}
              </span>
            )}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isEditing ? <Button onClick={startEdit} variant="ghost" style={{ border: '1.5px solid var(--border)' }}><i className="fa-solid fa-pen-to-square"></i> 編集</Button> : <><Button onClick={() => setIsEditing(false)} variant="ghost">キャンセル</Button><Button onClick={saveChanges}>保存</Button></>}
        </div>
      </header>

      {/* 管理者専用：財務詳細調整カード */}
      {isAdmin && (
        <Card title="案件財務調整 (管理者専用)" style={{ border: '2px solid var(--primary)', background: 'rgba(79, 70, 229, 0.02)', marginBottom: '32px' }}>
          <div style={{ padding: '28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '8px' }}>案件価格合計 (税込)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Input 
                    type="number" 
                    value={caseData.baseAmount} 
                    onChange={(e) => handleFinancialUpdate({ baseAmount: parseInt(e.target.value, 10) })} 
                    style={{ marginBottom: 0, fontSize: '1.25rem', fontWeight: 900 }} 
                  />
                  <span style={{ fontWeight: 800 }}>円</span>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '8px' }}>計算モード</label>
                <Select 
                  value={caseData.isManualAdjustment ? 'manual' : 'auto'} 
                  onChange={(e) => handleFinancialUpdate({ isManualAdjustment: e.target.value === 'manual' })}
                  style={{ marginBottom: 0, fontWeight: 700 }}
                >
                  <option value="auto">標準計算 (料率ベース: {Math.round(caseData.appliedRate * 100)}%)</option>
                  <option value="manual">マニュアル調整 (固定金額指定)</option>
                </Select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>代理店報酬額</span>
                  {caseData.isManualAdjustment && <Badge color="var(--primary)">金額指定中</Badge>}
                </div>
                {caseData.isManualAdjustment ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Input 
                      type="number" 
                      value={caseData.manualAgencyAmount || 0} 
                      onChange={(e) => handleFinancialUpdate({ manualAgencyAmount: parseInt(e.target.value, 10) })}
                      style={{ marginBottom: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }} 
                    />
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>円</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }}>
                    ¥{(caseData.baseAmount * caseData.appliedRate).toLocaleString()}
                  </div>
                )}
              </div>

              <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '12px' }}>システム(本部)収益額</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  ¥{adminAmount.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', marginTop: '4px' }}>
                  (合計 ¥{caseData.baseAmount.toLocaleString()} - 報酬 ¥{agencyAmount.toLocaleString()})
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '32px' }}>
        <button onClick={() => setActiveTab('rakuten')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'rakuten' ? '#bf0000' : 'var(--text-sub)', borderBottom: activeTab === 'rakuten' ? '3px solid #bf0000' : '3px solid transparent' }}>楽天市場</button>
        <button onClick={() => setActiveTab('yahoo')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'yahoo' ? '#ff0033' : 'var(--text-sub)', borderBottom: activeTab === 'yahoo' ? '3px solid #ff0033' : '3px solid transparent' }}>Yahoo!</button>
        <button onClick={() => setActiveTab('aupay')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'aupay' ? '#f58220' : 'var(--text-sub)', borderBottom: activeTab === 'aupay' ? '3px solid #f58220' : '3px solid transparent' }}>au PAY</button>
        <button onClick={() => setActiveTab('customer')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'customer' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'customer' ? '3px solid var(--primary)' : '3px solid transparent' }}>顧客基本情報</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {activeTab === 'rakuten' && (
            <div className="animate-fade-in">
              <MallStatusPanel mall="rakuten" color="#bf0000" title="楽天市場" />
              
              <div style={{ marginBottom: '32px' }}>
                <LinkGroupHeader title="楽天市場 出店手続き" color="#bf0000" />
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                  <ExternalLinkCard title="楽天市場申込URL" url="https://ecappfrm.rakuten.co.jp/entry/form/front/group/merchantDirectApplication" icon="fa-file-signature" color="#bf0000" />
                  <ExternalLinkCard title="RMS ログイン" url="https://glogin.rms.rakuten.co.jp/?sp_id=1" icon="fa-right-to-bracket" color="#bf0000" />
                  <ExternalLinkCard title="Rakuten BillPay" url="https://billpay.rakuten.co.jp/login" icon="fa-credit-card" color="#bf0000" />
                </div>

                <LinkGroupHeader title="共通インフラ作成" color="var(--accent)" />
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <ExternalLinkCard title="subline 作成" url="https://www.subline.jp/personal/" icon="fa-phone-volume" color="var(--accent)" />
                  <ExternalLinkCard title="e-mail.jp 作成" url="https://www.e-mail.jp" icon="fa-envelope-open-text" color="var(--primary)" />
                </div>
              </div>

              <Card title="楽天詳細設定 (ID・パスワード)">
                <div style={{ padding: '0 28px 28px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginTop: '20px', marginBottom: '10px', textTransform: 'uppercase', borderLeft: '3px solid var(--primary)', paddingLeft: '8px' }}>R-Login設定</div>
                      <InfoRow label="R-Login ID" value={caseData.rakutenInfo?.rLoginId} field="rLoginId" group="rakutenInfo" />
                      <InfoRow label="R-Login PASS" value={caseData.rakutenInfo?.rLoginPass} field="rLoginPass" group="rakutenInfo" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginTop: '20px', marginBottom: '10px', textTransform: 'uppercase', borderLeft: '3px solid var(--primary)', paddingLeft: '8px' }}>個人ID設定</div>
                      <InfoRow label="個人ID" value={caseData.rakutenInfo?.personalId} field="personalId" group="rakutenInfo" />
                      <InfoRow label="個人パスワード" value={caseData.rakutenInfo?.personalPass} field="personalPass" group="rakutenInfo" />
                    </div>
                  </div>
                </div>
              </Card>

              <div style={{ marginTop: '32px' }}>
                <Card title="共通インフラ取得情報">
                  <div style={{ padding: '0 28px 28px' }}>
                    <div style={{ marginTop: '20px', paddingBottom: '10px', borderBottom: '2px solid var(--border)', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className="fa-solid fa-phone"></i> subline (050番号)
                    </div>
                    <InfoRow label="050電話番号" value={caseData.subline?.number050} field="number050" group="subline" />
                    <InfoRow label="ログインID" value={caseData.subline?.loginId} field="loginId" group="subline" />
                    <InfoRow label="パスワード" value={caseData.subline?.password} field="password" group="subline" />
                    
                    <div style={{ marginTop: '30px', paddingBottom: '10px', borderBottom: '2px solid var(--border)', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className="fa-solid fa-envelope"></i> e-mail.jp
                    </div>
                    <InfoRow label="メールアドレス" value={caseData.emailJp?.email} field="email" group="emailJp" />
                    <InfoRow label="メールパスワード" value={caseData.emailJp?.password} field="password" group="emailJp" />
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'yahoo' && (
            <div className="animate-fade-in">
              <MallStatusPanel mall="yahoo" color="#ff0033" title="Yahoo!ショッピング" />
              <Card title="Yahoo!ショッピング 設定情報">
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-sub)' }}>
                  <i className="fa-solid fa-circle-info" style={{ fontSize: '2rem', marginBottom: '16px', display: 'block' }}></i>
                  現在、Yahoo!ショッピング固有の設定項目はありません。
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'aupay' && (
            <div className="animate-fade-in">
              <MallStatusPanel mall="aupay" color="#f58220" title="au PAY マーケット" />
              <Card title="au PAY マーケット 設定情報">
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-sub)' }}>
                  <i className="fa-solid fa-circle-info" style={{ fontSize: '2rem', marginBottom: '16px', display: 'block' }}></i>
                  現在、au PAY マーケット固有の設定項目はありません。
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'customer' && (
            <div className="animate-fade-in">
              <Card title="法人情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="顧客種別" value={caseData.customerType === 'corporation' ? '法人' : '個人事業主'} field="customerType" />
                  <InfoRow label="法人名/屋号" value={caseData.companyName} field="companyName" />
                  <InfoRow label="法人名/屋号ふりがな" value={caseData.companyNameKana} field="companyNameKana" />
                  <InfoRow label="代表者名" value={caseData.representativeName} field="representativeName" />
                  <InfoRow label="代表者名ふりがな" value={caseData.representativeNameKana} field="representativeNameKana" />
                  <InfoRow label="法人番号" value={caseData.corporateNumber} field="corporateNumber" />
                  <InfoRow label="設立年月日" value={caseData.establishedDate} field="establishedDate" isDate />
                  <InfoRow label="法人郵便番号" value={caseData.zipCode} field="zipCode" />
                  <InfoRow label="法人住所" value={caseData.address} field="address" />
                </div>
              </Card>

              <div style={{ marginTop: '32px' }}>
                <Card title="代表者情報 (個人)">
                  <div style={{ padding: '0 28px 28px' }}>
                    <InfoRow label="名前" value={caseData.repName} field="repName" />
                    <InfoRow label="名前ふりがな" value={caseData.repNameKana} field="repNameKana" />
                    <InfoRow label="生年月日" value={caseData.repBirthDate} field="repBirthDate" isDate />
                    <InfoRow label="代表者郵便番号" value={caseData.repZipCode} field="repZipCode" />
                    <InfoRow label="代表者住所" value={caseData.repAddress} field="repAddress" />
                    <InfoRow label="携帯電話番号" value={caseData.phone} field="phone" />
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* 代理店昇格申請セクション (顧客のみ表示) */}
          {customerUser && customerUser.status === UserStatus.CUSTOMER && (
            <Card title="代理店昇格申請" style={{ border: '1.5px solid #f59e0b', background: 'rgba(245, 158, 11, 0.03)' }}>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                {customerUser.agencyApplicationStatus === AgencyApplicationStatus.NONE ? (
                  <>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginBottom: '16px', lineHeight: '1.5', fontWeight: 600 }}>
                      この顧客を代理店パートナーへ昇格させる申請を行います。
                    </p>
                    <Button onClick={handleApplyAgency} style={{ width: '100%', background: '#f59e0b', color: 'white' }}>
                      <i className="fa-solid fa-user-plus"></i> 代理店昇格を申請
                    </Button>
                  </>
                ) : (
                  <Badge color="#f59e0b" style={{ width: '100%', padding: '12px', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-clock-rotate-left"></i> {customerUser.agencyApplicationStatus === AgencyApplicationStatus.PENDING ? '昇格申請中' : '承認済み (本登録待ち)'}
                  </Badge>
                )}
              </div>
            </Card>
          )}

          <Card title="ToDo進捗"><div style={{ padding: '20px' }}>{caseData.tasks.map(task => (<div key={task.id} onClick={() => handleTaskToggle(task.id, task.status)} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer' }}><div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{task.title}</div><Badge color="#4f46e5" style={{ fontSize: '0.65rem' }}>{task.status}</Badge></div>))}</div></Card>
          
          <Card title="報酬状況">
            <div style={{ padding: '24px', textAlign: 'center' }}>
               <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px' }}>見込み報酬額</div>
               <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>
                 ¥{agencyAmount.toLocaleString()}
               </div>
               <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-sub)', marginTop: '8px' }}>
                 {caseData.isManualAdjustment ? (
                   <Badge color="var(--primary)">マニュアル調整適用中</Badge>
                 ) : (
                   `(単価 ¥${caseData.baseAmount.toLocaleString()} × ${Math.round(caseData.appliedRate * 100)}%)`
                 )}
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CaseDetailPage;
