
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../services/dbService';
import { useAppContext } from '../App';
import { CaseStatus, TaskStatus, UserRole, PlatformType, MallOpeningStatus } from '../types';
import { Card, Button, StatusBadge, Badge, Input, Select } from '../components/UI';
import { STATUS_LABELS, TASK_STATUS_COLORS } from '../constants';

type TabType = 'rakuten' | 'yahoo' | 'aupay' | 'customer';

const CaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('rakuten');
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
      <div style={{ width: '180px', color: 'var(--text-sub)', fontWeight: 700, fontSize: '0.85rem' }}>{label}</div>
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

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
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

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '32px' }}>
        <button onClick={() => setActiveTab('rakuten')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, color: activeTab === 'rakuten' ? '#bf0000' : 'var(--text-sub)', borderBottom: activeTab === 'rakuten' ? '3px solid #bf0000' : '3px solid transparent', transition: 'all 0.2s', marginBottom: '-2px' }}>
          <i className="fa-solid fa-shop" style={{ marginRight: '8px' }}></i>楽天市場
        </button>
        <button onClick={() => setActiveTab('yahoo')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, color: activeTab === 'yahoo' ? '#ff0033' : 'var(--text-sub)', borderBottom: activeTab === 'yahoo' ? '3px solid #ff0033' : '3px solid transparent', transition: 'all 0.2s', marginBottom: '-2px' }}>
          <i className="fa-solid fa-cart-shopping" style={{ marginRight: '8px' }}></i>Yahoo!ショッピング
        </button>
        <button onClick={() => setActiveTab('aupay')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, color: activeTab === 'aupay' ? '#f58220' : 'var(--text-sub)', borderBottom: activeTab === 'aupay' ? '3px solid #f58220' : '3px solid transparent', transition: 'all 0.2s', marginBottom: '-2px' }}>
          <i className="fa-solid fa-store" style={{ marginRight: '8px' }}></i>au PAY マーケット
        </button>
        <button onClick={() => setActiveTab('customer')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, color: activeTab === 'customer' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'customer' ? '3px solid var(--primary)' : '3px solid transparent', transition: 'all 0.2s', marginBottom: '-2px' }}>
          <i className="fa-solid fa-user-tie" style={{ marginRight: '8px' }}></i>顧客基本情報
        </button>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
        
        {/* Tab Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {activeTab === 'rakuten' && (
            <div className="animate-fade-in">
              <MallStatusPanel mall="rakuten" color="#bf0000" title="楽天市場" />

              {/* Quick Links Section */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-link" style={{ color: '#bf0000' }}></i> クイックアクセス
                </div>
                
                <LinkGroupHeader title="楽天市場 出店手続き" color="#bf0000" />
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                  <ExternalLinkCard title="楽天市場申込URL" url="https://ecappfrm.rakuten.co.jp/entry/form/front/group/merchantDirectApplication" icon="fa-file-signature" color="#bf0000" />
                  <ExternalLinkCard title="楽天市場 登録フォームURL" url="https://ecappfrm.rakuten.co.jp/entry/login" icon="fa-pen-to-square" color="#bf0000" />
                  <ExternalLinkCard title="RMS ログイン" url="https://glogin.rms.rakuten.co.jp/?sp_id=1" icon="fa-right-to-bracket" color="#bf0000" />
                  <ExternalLinkCard title="Rakuten BillPay" url="https://billpay.rakuten.co.jp/login" icon="fa-credit-card" color="#bf0000" />
                </div>

                <LinkGroupHeader title="銀行口座 (楽天銀行)" color="#bf0000" />
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                  <ExternalLinkCard title="楽天銀行 法人口座" url="https://www.rakuten-bank.co.jp/business/" icon="fa-building-columns" color="#bf0000" />
                  <ExternalLinkCard title="楽天銀行 個人口座" url="https://www.rakuten-bank.co.jp/account/" icon="fa-user-shield" color="#bf0000" />
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
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginTop: '20px', marginBottom: '10px', textTransform: 'uppercase', borderLeft: '3px solid var(--primary)', paddingLeft: '8px' }}>申し込み/基本設定</div>
                      <InfoRow label="申込ID" value={caseData.rakutenInfo?.applyId} field="applyId" group="rakuten" />
                      <InfoRow label="申込パスワード" value={caseData.rakutenInfo?.applyPass} field="applyPass" group="rakuten" />
                      <div style={{ marginTop: '24px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '10px', textTransform: 'uppercase', borderLeft: '3px solid var(--primary)', paddingLeft: '8px' }}>R-Login設定</div>
                      <InfoRow label="R-Login ID" value={caseData.rakutenInfo?.rLoginId} field="rLoginId" group="rakuten" />
                      <InfoRow label="R-Login PASS" value={caseData.rakutenInfo?.rLoginPass} field="rLoginPass" group="rakuten" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginTop: '20px', marginBottom: '10px', textTransform: 'uppercase', borderLeft: '3px solid var(--primary)', paddingLeft: '8px' }}>個人ID設定</div>
                      <InfoRow label="個人ID" value={caseData.rakutenInfo?.personalId} field="personalId" group="rakuten" />
                      <InfoRow label="個人パスワード" value={caseData.rakutenInfo?.personalPass} field="personalPass" group="rakuten" />
                      <div style={{ marginTop: '24px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', marginBottom: '10px', textTransform: 'uppercase', borderLeft: '3px solid var(--primary)', paddingLeft: '8px' }}>billpay設定</div>
                      <InfoRow label="billpay ID" value={caseData.rakutenInfo?.billpayId} field="billpayId" group="rakuten" />
                      <InfoRow label="billpay PASS" value={caseData.rakutenInfo?.billpayPass} field="billpayPass" group="rakuten" />
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
                      <i className="fa-solid fa-envelope"></i> e-mail.jp (メールアドレス)
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
                  現在、Yahoo!ショッピング固有の設定項目はありません。<br />
                  共通インフラ情報は「楽天市場」タブをご確認ください。
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
                  現在、au PAY マーケット固有の設定項目はありません。<br />
                  共通インフラ情報は「楽天市場」タブをご確認ください。
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'customer' && (
            <div className="animate-fade-in">
              <Card title="顧客基本情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="顧客種別" value={caseData.customerType === 'corporation' ? '法人' : '個人'} />
                  <InfoRow label="会社名" value={caseData.companyName} field="companyName" />
                  <InfoRow label="代表者/顧客名" value={caseData.customerName} field="customerName" />
                  <InfoRow label="電話番号" value={caseData.phone} field="phone" />
                  <InfoRow label="メールアドレス" value={caseData.email} field="email" />
                  <InfoRow label="住所" value={caseData.address} field="address" />
                  <InfoRow label="備考" value={caseData.notes} field="notes" />
                </div>
              </Card>

              <div style={{ marginTop: '32px' }}>
                <Card title="提出書類・ライブラリ">
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th className="align-left">書類名</th>
                          <th className="align-left">ファイル</th>
                          <th className="align-right">有効期限</th>
                          <th style={{ width: '60px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {caseData.documents.length > 0 ? caseData.documents.map(doc => (
                          <tr key={doc.id}>
                            <td className="align-left" style={{ fontWeight: 800 }}>{doc.docType}</td>
                            <td className="align-left">
                              <span style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>
                                <i className="fa-solid fa-file-pdf"></i> {doc.fileName}
                              </span>
                            </td>
                            <td className="align-right" style={{ color: 'var(--text-sub)', fontWeight: 700 }}>
                              {doc.expiresOn || 'なし'}
                            </td>
                            <td className="align-right">
                              <Button variant="ghost" style={{ padding: '8px' }}><i className="fa-solid fa-download"></i></Button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-sub)' }}>書類がアップロードされていません。</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar - Global for all tabs */}
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
