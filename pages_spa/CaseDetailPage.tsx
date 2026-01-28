
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../services/dbService';
import { useAppContext } from '../App';
import { CaseStatus, TaskStatus, UserRole, PlatformType, MallOpeningStatus } from '../types';
import { Card, Button, StatusBadge, Badge, Input, Select } from '../components/UI';
import { STATUS_LABELS, TASK_STATUS_COLORS } from '../constants';

const CaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedCase, setEditedCase] = useState<any>(null);

  const caseData = db.getCaseById(id || '');

  if (!caseData) return <div style={{ padding: '48px', textAlign: 'center' }}>案件が見つかりませんでした。</div>;

  const handleTaskToggle = (taskId: string, currentStatus: TaskStatus) => {
    if (!user) return;
    const statuses: TaskStatus[] = [TaskStatus.TODO, TaskStatus.DOING, TaskStatus.WAITING, TaskStatus.DONE];
    const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    db.updateTaskStatus(caseData.id, taskId, statuses[nextIndex], user);
    navigate(0);
  };

  const handleStatusChange = (newStatus: CaseStatus) => {
    if (!user) return;
    db.updateCase(caseData.id, { status: newStatus }, user);
    navigate(0);
  };

  const handleMallStatusChange = (mall: 'rakuten' | 'yahoo' | 'aupay', status: MallOpeningStatus) => {
    if (!user) return;
    const updatedMallProgress = { ...caseData.mallProgress, [mall]: status };
    db.updateCase(caseData.id, { mallProgress: updatedMallProgress }, user);
    navigate(0);
  };

  const startEdit = () => {
    setEditedCase({ ...caseData });
    setIsEditing(true);
  };

  const saveChanges = () => {
    if (!user || !editedCase) return;
    db.updateCase(caseData.id, editedCase, user);
    setIsEditing(false);
    navigate(0);
  };

  const InfoRow = ({ label, value, field, group }: { label: string; value?: string | React.ReactNode, field?: string, group?: string }) => (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '16px 0', alignItems: 'center' }}>
      <div style={{ width: '160px', color: 'var(--text-sub)', fontWeight: 700, fontSize: '0.85rem' }}>{label}</div>
      <div style={{ flex: 1, color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem' }}>
        {isEditing && field ? (
          group === 'subline' ? (
            <Input value={editedCase.subline?.[field] || ''} onChange={e => setEditedCase({...editedCase, subline: {...editedCase.subline, [field]: e.target.value}})} style={{ marginBottom: 0 }} />
          ) : group === 'emailJp' ? (
            <Input value={editedCase.emailJp?.[field] || ''} onChange={e => setEditedCase({...editedCase, emailJp: {...editedCase.emailJp, [field]: e.target.value}})} style={{ marginBottom: 0 }} />
          ) : group === 'rakuten' ? (
            <Input value={editedCase.rakutenInfo?.[field] || ''} onChange={e => setEditedCase({...editedCase, rakutenInfo: {...editedCase.rakutenInfo, [field]: e.target.value}})} style={{ marginBottom: 0 }} />
          ) : (
            <Input value={editedCase[field] || ''} onChange={e => setEditedCase({...editedCase, [field]: e.target.value})} style={{ marginBottom: 0 }} />
          )
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {value || '---'}
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Link to="/cases" style={{ color: 'var(--text-sub)', textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem' }}>
              <i className="fa-solid fa-arrow-left"></i> 案件一覧
            </Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ color: 'var(--text-sub)', fontWeight: 700, fontSize: '0.9rem' }}>{caseData.id}</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            {caseData.customerName} 様
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!isEditing ? (
            <>
              <div style={{ marginRight: '12px' }}>
                <Select 
                  value={caseData.status} 
                  onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
                  style={{ marginBottom: 0, padding: '8px 16px', fontWeight: 700 }}
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
              <Button onClick={startEdit} variant="ghost" style={{ border: '1.5px solid var(--border)' }}>
                <i className="fa-solid fa-pen-to-square"></i> 編集
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(false)} variant="ghost">キャンセル</Button>
              <Button onClick={saveChanges}>変更を保存</Button>
            </>
          )}
        </div>
      </header>

      {/* 3 Mall Progress Panel - Visual Improvement */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {[
          { key: 'rakuten', name: '楽天', color: '#bf0000' },
          { key: 'yahoo', name: 'Yahoo!ショッピング', color: '#ff0033' },
          { key: 'aupay', name: 'au PAY マーケット', color: '#f58220' }
        ].map(mall => (
          <Card key={mall.key} style={{ padding: '24px', textAlign: 'center', borderTop: `4px solid ${mall.color}` }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '8px' }}>{mall.name} 進捗</div>
            <div style={{ marginBottom: '12px' }}>
              <Badge color={mall.color}>{caseData.mallProgress[mall.key as keyof typeof caseData.mallProgress]}</Badge>
            </div>
            {/* 視認性改善: パディングと高さを調整し、文字が確実に見えるように修正 */}
            <Select 
              value={caseData.mallProgress[mall.key as keyof typeof caseData.mallProgress]}
              onChange={(e) => handleMallStatusChange(mall.key as any, e.target.value as MallOpeningStatus)}
              style={{ 
                marginBottom: 0, 
                fontSize: '0.75rem', 
                height: 'auto', 
                padding: '8px 12px',
                textAlign: 'center',
                fontWeight: 700
              }}
            >
              {Object.values(MallOpeningStatus).map(status => <option key={status} value={status}>{status}</option>)}
            </Select>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <Card title="楽天詳細設定">
            <div style={{ padding: '0 28px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '10px', textTransform: 'uppercase' }}>申し込み/基本設定</div>
                  <InfoRow label="申込ID" value={caseData.rakutenInfo?.applyId} field="applyId" group="rakuten" />
                  <InfoRow label="申込パスワード" value={caseData.rakutenInfo?.applyPass} field="applyPass" group="rakuten" />
                  <div style={{ marginTop: '24px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '10px', textTransform: 'uppercase' }}>R-Login設定</div>
                  <InfoRow label="R-Login ID" value={caseData.rakutenInfo?.rLoginId} field="rLoginId" group="rakuten" />
                  <InfoRow label="R-Login PASS" value={caseData.rakutenInfo?.rLoginPass} field="rLoginPass" group="rakuten" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '10px', textTransform: 'uppercase' }}>個人ID設定</div>
                  <InfoRow label="個人ID" value={caseData.rakutenInfo?.personalId} field="personalId" group="rakuten" />
                  <InfoRow label="個人パスワード" value={caseData.rakutenInfo?.personalPass} field="personalPass" group="rakuten" />
                  <div style={{ marginTop: '24px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '10px', textTransform: 'uppercase' }}>billpay設定</div>
                  <InfoRow label="billpay ID" value={caseData.rakutenInfo?.billpayId} field="billpayId" group="rakuten" />
                  <InfoRow label="billpay PASS" value={caseData.rakutenInfo?.billpayPass} field="billpayPass" group="rakuten" />
                </div>
              </div>
            </div>
          </Card>

          <Card title="インフラ取得情報">
            <div style={{ padding: '0 28px 28px' }}>
              <div style={{ marginTop: '20px', paddingBottom: '10px', borderBottom: '2px solid var(--border)', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-phone"></i> subline (050番号)
              </div>
              <InfoRow label="050電話番号" value={caseData.subline?.number050} field="number050" group="subline" />
              <InfoRow label="ログインID" value={caseData.subline?.loginId} field="loginId" group="subline" />
              <InfoRow label="パスワード" value={caseData.subline?.password} field="password" group="subline" />
              
              <div style={{ marginTop: '30px', paddingBottom: '10px', borderBottom: '2px solid var(--border)', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-envelope"></i> e-mail.jp (メールアドレス)
              </div>
              <InfoRow label="メールアドレス" value={caseData.emailJp?.email} field="email" group="emailJp" />
              <InfoRow label="メールパスワード" value={caseData.emailJp?.password} field="password" group="emailJp" />
            </div>
          </Card>

          <Card title="顧客基本情報">
            <div style={{ padding: '0 28px 28px' }}>
              <InfoRow label="顧客種別" value={caseData.customerType === 'corporation' ? '法人' : '個人'} />
              <InfoRow label="会社名" value={caseData.companyName} field="companyName" />
              <InfoRow label="電話番号" value={caseData.phone} field="phone" />
              <InfoRow label="メールアドレス" value={caseData.email} field="email" />
              <InfoRow label="住所" value={caseData.address} field="address" />
              <InfoRow label="備考" value={caseData.notes} field="notes" />
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <Card title="ToDoチェックリスト">
            <div style={{ padding: '24px' }}>
              {caseData.tasks.map(task => (
                <div key={task.id} 
                  onClick={() => handleTaskToggle(task.id, task.status)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '16px', 
                    background: 'var(--bg-main)', 
                    borderRadius: '14px', 
                    marginBottom: '12px',
                    cursor: 'pointer',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.875rem' }}>{task.title}</div>
                  <span className={`${TASK_STATUS_COLORS[task.status]} px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card title="最近のアクティビティ">
            <div style={{ padding: '24px' }}>
              <div style={{ borderLeft: '2px solid var(--border)', paddingLeft: '20px', marginLeft: '10px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-27px', top: '0', width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '50%' }}></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 800 }}>{new Date(caseData.updatedAt).toLocaleString()}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '4px' }}>情報を更新しました</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default CaseDetailPage;
