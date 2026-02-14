
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../services/dbService';
import { useAppContext } from '../App';
import { TaskStatus, MallOpeningStatus, UserStatus, AgencyApplicationStatus, UserRole, Case, User } from '../types';
import { Card, Button, Badge, Input, Select } from '../components/UI';
import { TASK_STATUS_COLORS } from '../constants';

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
      const c = await db.getCaseById(id);
      if (c) {
        setCaseData(c);
        const u = await db.getUserByEmail(c.email);
        setCustomerUser(u);
      }
      setLoading(false);
    };
    loadData();
  }, [id]);

  if (loading) return <div style={{ padding: '48px', textAlign: 'center' }}>読み込み中...</div>;
  if (!caseData || !user) return <div style={{ padding: '48px', textAlign: 'center' }}>顧客データが見つかりませんでした。</div>;

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
    const ok = await db.applyForAgencyByCase(caseData, user);
    if (ok) {
      alert('代理店昇格申請を送信しました。管理者の承認をお待ちください。');
      navigate(0);
    } else {
      alert('申請に失敗しました。');
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
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '16px 0', alignItems: 'center' }}>
      <div style={{ width: '180px', color: 'var(--text-sub)', fontWeight: 700, fontSize: '0.85rem' }}>{label}</div>
      <div style={{ flex: 1, color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem' }}>
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
            {isDate && value ? <>{value} <span style={{ color: 'var(--text-sub)', fontSize: '0.8rem' }}>（{formatToWareki(String(value))}）</span></> : (value || '---')}
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
        <Select value={caseData.mallProgress[mall]} onChange={(e) => handleMallStatusChange(mall, e.target.value as MallOpeningStatus)} style={{ marginBottom: 0, fontSize: '0.85rem', height: 'auto', padding: '8px 12px', fontWeight: 700 }}>
          {Object.values(MallOpeningStatus).map(status => <option key={status} value={status}>{status}</option>)}
        </Select>
      </div>
    </div>
  );

  const agencyAmount = caseData.isManualAdjustment ? (caseData.manualAgencyAmount || 0) : (caseData.baseAmount * caseData.appliedRate);
  const adminAmount = caseData.baseAmount - agencyAmount;

  // 昇格ボタンの表示判定
  const isAgency = customerUser?.status === UserStatus.AGENCY;
  const applicationStatus = customerUser?.agencyApplicationStatus || AgencyApplicationStatus.NONE;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Link to="/cases" style={{ color: 'var(--text-sub)', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}><i className="fa-solid fa-arrow-left"></i> 一覧に戻る</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ color: 'var(--text-sub)', fontWeight: 700, fontSize: '0.9rem' }}>顧客ID: {caseData.id}</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
            {caseData.companyName || caseData.repName} 様
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isEditing ? <Button onClick={startEdit} variant="ghost" style={{ border: '1.5px solid var(--border)' }}><i className="fa-solid fa-pen-to-square"></i> 編集</Button> : <><Button onClick={() => setIsEditing(false)} variant="ghost">キャンセル</Button><Button onClick={saveChanges}>保存</Button></>}
        </div>
      </header>

      {isAdmin && (
        <Card title="収益条件調整 (管理者専用)" style={{ border: '2px solid var(--primary)', background: 'rgba(79, 70, 229, 0.02)', marginBottom: '32px' }}>
          <div style={{ padding: '28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '8px' }}>合計金額 (税込)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Input type="number" value={caseData.baseAmount} onChange={(e) => handleFinancialUpdate({ baseAmount: parseInt(e.target.value, 10) })} style={{ marginBottom: 0, fontSize: '1.25rem', fontWeight: 900 }} />
                  <span style={{ fontWeight: 800 }}>円</span>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '8px' }}>報酬計算モード</label>
                <Select value={caseData.isManualAdjustment ? 'manual' : 'auto'} onChange={(e) => handleFinancialUpdate({ isManualAdjustment: e.target.value === 'manual' })} style={{ marginBottom: 0, fontWeight: 700 }}>
                  <option value="auto">標準計算 (料率ベース: {Math.round(caseData.appliedRate * 100)}%)</option>
                  <option value="manual">マニュアル調整 (金額固定)</option>
                </Select>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '32px' }}>
        <button onClick={() => setActiveTab('rakuten')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'rakuten' ? '#bf0000' : 'var(--text-sub)', borderBottom: activeTab === 'rakuten' ? '3px solid #bf0000' : '3px solid transparent' }}>楽天市場</button>
        <button onClick={() => setActiveTab('yahoo')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'yahoo' ? '#ff0033' : 'var(--text-sub)', borderBottom: activeTab === 'yahoo' ? '3px solid #ff0033' : '3px solid transparent' }}>Yahoo!</button>
        <button onClick={() => setActiveTab('aupay')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'aupay' ? '#f58220' : 'var(--text-sub)', borderBottom: activeTab === 'aupay' ? '3px solid #f58220' : '3px solid transparent' }}>au PAY</button>
        <button onClick={() => setActiveTab('customer')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'customer' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'customer' ? '3px solid var(--primary)' : '3px solid transparent' }}>顧客情報</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {activeTab === 'rakuten' && <div className="animate-fade-in"><MallStatusPanel mall="rakuten" color="#bf0000" title="楽天市場" /></div>}
          {activeTab === 'customer' && (
            <div className="animate-fade-in">
              <Card title="顧客基本情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="顧客種別" value={caseData.customerType === 'corporation' ? '法人' : '個人事業主'} field="customerType" />
                  <InfoRow label="法人名/屋号" value={caseData.companyName} field="companyName" />
                  <InfoRow label="携帯電話番号" value={caseData.phone} field="phone" />
                  <InfoRow label="メールアドレス" value={caseData.email} field="email" />
                </div>
              </Card>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* 昇格申請カード */}
          {!isAgency && (
            <Card title="パートナー昇格申請" style={{ border: '2px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                {applicationStatus === AgencyApplicationStatus.NONE ? (
                  <>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '16px', fontWeight: 700 }}>
                      この顧客を代理店パートナーへ昇格させることができます。
                    </p>
                    <Button onClick={handleApplyAgency} style={{ width: '100%', background: '#f59e0b', color: 'white' }}>
                      <i className="fa-solid fa-user-plus"></i> 代理店として申請する
                    </Button>
                  </>
                ) : (
                  <Badge color="#f59e0b" style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}>
                    <i className="fa-solid fa-clock-rotate-left"></i> {applicationStatus === AgencyApplicationStatus.PENDING ? '代理店申請中' : '承認済 (パスワード設定待ち)'}
                  </Badge>
                )}
              </div>
            </Card>
          )}

          <Card title="ToDo進捗"><div style={{ padding: '20px' }}>{caseData.tasks.length > 0 ? caseData.tasks.map(task => (<div key={task.id} onClick={() => handleTaskToggle(task.id, task.status)} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer' }}><div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{task.title}</div><Badge color="#4f46e5" style={{ fontSize: '0.65rem' }}>{task.status}</Badge></div>)) : <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-sub)' }}>タスクはありません</p>}</div></Card>
          
          <Card title="報酬状況">
            <div style={{ padding: '24px', textAlign: 'center' }}>
               <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px' }}>見込み報酬額</div>
               <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)' }}>¥{agencyAmount.toLocaleString()}</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CaseDetailPage;
