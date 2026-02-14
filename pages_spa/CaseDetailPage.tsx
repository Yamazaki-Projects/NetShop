
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
          // メールアドレスに紐づくユーザーを取得（代理店申請状況の確認用）
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
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '16px 0', alignItems: 'center' }}>
      <div style={{ width: '180px', color: 'var(--text-sub)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ flex: 1, color: 'var(--text-main)', fontWeight: 700, fontSize: '0.95rem' }}>
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
            {isDate && value ? <>{value} <span style={{ color: 'var(--text-sub)', fontSize: '0.8rem', fontWeight: 600 }}>（{formatToWareki(String(value))}）</span></> : (value || '---')}
            {!isEditing && value && (
              <button onClick={() => navigator.clipboard.writeText(String(value))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.85rem', opacity: 0.6 }}>
                <i className="fa-regular fa-copy"></i>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const MallStatusPanel = ({ mall, color, title }: { mall: 'rakuten' | 'yahoo' | 'aupay', color: string, title: string }) => (
    <div style={{ padding: '28px', background: 'var(--bg-card)', borderRadius: '20px', marginBottom: '24px', border: `1px solid var(--border)`, borderLeft: `8px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)' }}>
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '4px', textTransform: 'uppercase' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Badge color={color}>{caseData.mallProgress[mall]}</Badge>
          {caseData.mallProgress[mall] === MallOpeningStatus.OPENED && <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i>}
        </div>
      </div>
      <div style={{ width: '220px' }}>
        <Select value={caseData.mallProgress[mall]} onChange={(e) => handleMallStatusChange(mall, e.target.value as MallOpeningStatus)} style={{ marginBottom: 0, fontSize: '0.85rem', height: '42px', fontWeight: 700 }}>
          {Object.values(MallOpeningStatus).map(status => <option key={status} value={status}>{status}</option>)}
        </Select>
      </div>
    </div>
  );

  const agencyAmount = caseData.isManualAdjustment ? (caseData.manualAgencyAmount || 0) : (caseData.baseAmount * caseData.appliedRate);

  // 代理店昇格関連の判定
  const isAgency = customerUser?.status === UserStatus.AGENCY;
  const applicationStatus = customerUser?.agencyApplicationStatus || AgencyApplicationStatus.NONE;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Link to="/cases" style={{ color: 'var(--text-sub)', textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem' }}><i className="fa-solid fa-arrow-left"></i> 顧客一覧に戻る</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ color: 'var(--text-sub)', fontWeight: 800, fontSize: '0.85rem' }}>顧客ID: {caseData.id}</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            {caseData.companyName || caseData.repName} <span style={{fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-sub)'}}>様</span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {!isEditing ? (
            <Button onClick={startEdit} variant="ghost" style={{ border: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
              <i className="fa-solid fa-pen-to-square"></i> 基本情報を編集
            </Button>
          ) : (
            <>
              <Button onClick={() => setIsEditing(false)} variant="ghost">キャンセル</Button>
              <Button onClick={saveChanges}>変更を保存</Button>
            </>
          )}
        </div>
      </header>

      {isAdmin && (
        <Card title="収益設定 (管理者権限)" style={{ border: '2px solid var(--primary)', background: 'rgba(79, 70, 229, 0.02)', marginBottom: '32px' }}>
          <div style={{ padding: '28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '8px', textTransform: 'uppercase' }}>総受注金額 (税込)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Input type="number" value={caseData.baseAmount} onChange={(e) => handleFinancialUpdate({ baseAmount: parseInt(e.target.value, 10) })} style={{ marginBottom: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)' }} />
                  <span style={{ fontWeight: 800 }}>円</span>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '8px', textTransform: 'uppercase' }}>計算アルゴリズム</label>
                <Select value={caseData.isManualAdjustment ? 'manual' : 'auto'} onChange={(e) => handleFinancialUpdate({ isManualAdjustment: e.target.value === 'manual' })} style={{ marginBottom: 0, fontWeight: 800 }}>
                  <option value="auto">自動料率 (現在の料率: {Math.round(caseData.appliedRate * 100)}%)</option>
                  <option value="manual">マニュアル設定 (金額指定)</option>
                </Select>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '40px' }}>
        <button onClick={() => setActiveTab('rakuten')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem', color: activeTab === 'rakuten' ? '#bf0000' : 'var(--text-sub)', borderBottom: activeTab === 'rakuten' ? '4px solid #bf0000' : '4px solid transparent', transition: 'all 0.2s' }}>楽天市場</button>
        <button onClick={() => setActiveTab('yahoo')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem', color: activeTab === 'yahoo' ? '#ff0033' : 'var(--text-sub)', borderBottom: activeTab === 'yahoo' ? '4px solid #ff0033' : '4px solid transparent', transition: 'all 0.2s' }}>Yahoo!</button>
        <button onClick={() => setActiveTab('aupay')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem', color: activeTab === 'aupay' ? '#f58220' : 'var(--text-sub)', borderBottom: activeTab === 'aupay' ? '4px solid #f58220' : '4px solid transparent', transition: 'all 0.2s' }}>au PAY</button>
        <button onClick={() => setActiveTab('customer')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem', color: activeTab === 'customer' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'customer' ? '4px solid var(--primary)' : '4px solid transparent', transition: 'all 0.2s' }}>顧客基本情報</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {activeTab === 'rakuten' && <div className="animate-fade-in"><MallStatusPanel mall="rakuten" color="#bf0000" title="楽天市場" /></div>}
          {activeTab === 'yahoo' && <div className="animate-fade-in"><MallStatusPanel mall="yahoo" color="#ff0033" title="Yahoo! ショッピング" /></div>}
          {activeTab === 'aupay' && <div className="animate-fade-in"><MallStatusPanel mall="aupay" color="#f58220" title="au PAY マーケット" /></div>}
          {activeTab === 'customer' && (
            <div className="animate-fade-in">
              <Card title="顧客プロフィール">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="顧客区分" value={caseData.customerType === 'corporation' ? '法人' : '個人事業主'} field="customerType" />
                  <InfoRow label="名称" value={caseData.companyName} field="companyName" />
                  <InfoRow label="連絡先電話番号" value={caseData.phone} field="phone" />
                  <InfoRow label="連絡用メール" value={caseData.email} field="email" />
                </div>
              </Card>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* 代理店昇格申請カード - ロジックを確実化 */}
          {!isAgency && (
            <Card title="代理店パートナー申請" style={{ border: '2px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)', boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.1)' }}>
              <div style={{ padding: '24px', textAlign: 'center' }}>
                {applicationStatus === AgencyApplicationStatus.NONE ? (
                  <>
                    <div style={{ width: '60px', height: '60px', background: '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', margin: '0 auto 16px' }}>
                      <i className="fa-solid fa-user-plus"></i>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '20px', fontWeight: 700, lineHeight: 1.6 }}>
                      この顧客を「代理店」へ昇格させます。<br/>昇格後は専用の管理画面が発行されます。
                    </p>
                    <Button onClick={handleApplyAgency} style={{ width: '100%', background: '#f59e0b', color: 'white', height: '48px', fontSize: '1rem' }}>
                      昇格申請を行う
                    </Button>
                  </>
                ) : (
                  <div>
                    <Badge color="#f59e0b" style={{ width: '100%', padding: '14px', fontSize: '0.9rem', marginBottom: '12px' }}>
                      <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '8px' }}></i> 
                      {applicationStatus === AgencyApplicationStatus.PENDING ? '代理店昇格 審査中' : '審査承認済 (登録待ち)'}
                    </Badge>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600 }}>
                      {applicationStatus === AgencyApplicationStatus.PENDING 
                        ? '管理者の承認が完了するまでお待ちください。' 
                        : '本登録URLからパスワード設定を行ってください。'}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card title="ToDo 進捗管理">
            <div style={{ padding: '24px' }}>
              {caseData.tasks.length > 0 ? caseData.tasks.map(task => (
                <div key={task.id} onClick={() => handleTaskToggle(task.id, task.status)} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px', background: 'var(--bg-main)', borderRadius: '14px', marginBottom: '10px', cursor: 'pointer', border: '1px solid var(--border)', transition: 'all 0.2s' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{task.title}</div>
                  <Badge color="#4f46e5" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>{task.status.toUpperCase()}</Badge>
                </div>
              )) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <i className="fa-solid fa-list-check" style={{ fontSize: '2rem', opacity: 0.1, marginBottom: '12px' }}></i>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', fontWeight: 700 }}>タスクは登録されていません</p>
                </div>
              )}
            </div>
          </Card>
          
          <Card title="報酬サマリー">
            <div style={{ padding: '28px', textAlign: 'center' }}>
               <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '8px', textTransform: 'uppercase' }}>見込み獲得報酬</div>
               <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                 <span style={{ fontSize: '1.25rem', fontWeight: 800, marginRight: '4px' }}>¥</span>
                 {Math.floor(agencyAmount).toLocaleString()}
               </div>
               <div style={{ marginTop: '12px' }}>
                 <Badge color="rgba(16, 185, 129, 0.1)" style={{ color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.75rem' }}>料率ベース計算済</Badge>
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CaseDetailPage;
