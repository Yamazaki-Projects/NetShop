
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../services/dbService';
import { useAppContext } from '../App';
import { MallOpeningStatus, UserStatus, AgencyApplicationStatus, UserRole, Case, User, ProgressComment } from '../types';
import { Card, Button, Badge, Input, Select } from '../components/UI';

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

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const c = await db.getCaseById(id);
      if (c) {
        setCaseData(c);
        const u = await db.getUserByLoginId(c.id);
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
      const result = await db.updateCase(caseData.id, editedCase, user);
      if (result) {
        setIsEditing(false);
        await loadData();
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

  const InfoRow = ({ label, value, field, group, type = 'text', options }: { label: string; value?: any, field?: string, group?: string, type?: 'text' | 'date' | 'select' | 'textarea', options?: {label: string, value: string}[] }) => (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '14px 0', alignItems: 'center' }}>
      <div style={{ width: '220px', color: 'var(--text-sub)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ flex: 1, color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem' }}>
        {isEditing && field ? (
          <>
            {type === 'select' ? (
              <Select 
                value={group ? (editedCase[group]?.[field] || '') : (editedCase[field] || '')}
                onChange={e => {
                  if (group) setEditedCase({...editedCase, [group]: {...editedCase[group], [field]: e.target.value}});
                  else setEditedCase({...editedCase, [field]: e.target.value});
                }}
                style={{ marginBottom: 0 }}
              >
                <option value="">選択してください</option>
                {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            ) : type === 'textarea' ? (
              <textarea 
                value={group ? (editedCase[group]?.[field] || '') : (editedCase[field] || '')}
                onChange={e => {
                  if (group) setEditedCase({...editedCase, [group]: {...editedCase[group], [field]: e.target.value}});
                  else setEditedCase({...editedCase, [field]: e.target.value});
                }}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', font: 'inherit' }}
                rows={3}
              />
            ) : (
              <Input 
                type={type}
                value={group ? (editedCase[group]?.[field] || '') : (editedCase[field] || '')} 
                onChange={e => {
                  if (group) setEditedCase({...editedCase, [group]: {...editedCase[group], [field]: e.target.value}});
                  else setEditedCase({...editedCase, [field]: e.target.value});
                }} 
                style={{ marginBottom: 0 }} 
              />
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {type === 'date' && value ? <>{value} <span style={{ color: 'var(--text-sub)', fontSize: '0.75rem' }}>（{formatToWareki(String(value))}）</span></> : (value || <span style={{color: 'var(--border)'}}>---</span>)}
            {!isEditing && value && type !== 'textarea' && (
              <button onClick={() => navigator.clipboard.writeText(String(value))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.8rem', opacity: 0.5 }}>
                <i className="fa-regular fa-copy"></i>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const isRegisteredAgency = customerUser?.status === UserStatus.AGENCY;
  const isApproved = customerUser?.agencyApplicationStatus === AgencyApplicationStatus.APPROVED;
  const isUsed = !!customerUser?.registrationCodeUsedAt;
  const showCodeArea = isApproved && !isRegisteredAgency && !isUsed;

  const mallStatusOptions = Object.values(MallOpeningStatus).map(s => ({ label: s, value: s }));

  const agencyAmount = caseData.isManualAdjustment ? (caseData.manualAgencyAmount || 0) : (caseData.baseAmount * caseData.appliedRate);

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Link to="/cases" style={{ color: 'var(--text-sub)', textDecoration: 'none', fontWeight: 800, fontSize: '0.85rem' }}><i className="fa-solid fa-arrow-left"></i> 顧客一覧に戻る</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ color: 'var(--text-sub)', fontWeight: 800, fontSize: '0.85rem' }}>顧客ID: {(caseData.id || '').toLowerCase()}</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.03em' }}>
            {caseData.companyName || `${caseData.repLastName} ${caseData.repFirstName}`} <span style={{fontSize: '1.2rem', color: 'var(--text-sub)'}}>様</span>
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
        <button onClick={() => setActiveTab('opening')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'opening' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'opening' ? '4px solid var(--primary)' : '4px solid transparent' }}>ショップ開設</button>
        <button onClick={() => setActiveTab('basic')} style={{ padding: '16px 28px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'basic' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'basic' ? '4px solid var(--primary)' : '4px solid transparent' }}>顧客基本情報</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {activeTab === 'opening' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <Card title="050番号情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="050番号" value={caseData.subline?.number050} field="number050" group="subline" />
                  <InfoRow label="取得サイト" value={caseData.subline?.siteType === 'subline' ? 'subline' : '他のサイト'} field="siteType" group="subline" type="select" options={[{label: 'subline', value: 'subline'}, {label: '他のサイト', value: 'other'}]} />
                  { (isEditing ? editedCase.subline?.siteType : caseData.subline?.siteType) === 'other' && (
                    <InfoRow label="URL" value={caseData.subline?.otherUrl} field="otherUrl" group="subline" />
                  )}
                  <InfoRow label="ID" value={caseData.subline?.loginId} field="loginId" group="subline" />
                  <InfoRow label="パスワード" value={caseData.subline?.password} field="password" group="subline" />
                </div>
              </Card>

              <Card title="e-mail.jp 情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="ドメイン" value={caseData.emailJp?.domainType === 'email_jp' ? 'e-mail.jp' : 'ほかのドメイン'} field="domainType" group="emailJp" type="select" options={[{label: 'e-mail.jp', value: 'email_jp'}, {label: 'ほかのドメイン', value: 'other'}]} />
                  { (isEditing ? editedCase.emailJp?.domainType : caseData.emailJp?.domainType) === 'other' && (
                    <InfoRow label="ドメイン名" value={caseData.emailJp?.otherDomain} field="otherDomain" group="emailJp" />
                  )}
                  <InfoRow label="メールアドレス" value={caseData.emailJp?.email} field="email" group="emailJp" />
                  <InfoRow label="パスワード" value={caseData.emailJp?.password} field="password" group="emailJp" />
                </div>
              </Card>

              <Card title="楽天市場 開設情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="開設状況" value={caseData.mallProgress?.rakuten} field="rakuten" group="mallProgress" type="select" options={mallStatusOptions} />
                  <InfoRow label="荷物郵送の必要性" value={caseData.rakutenInfo?.needsShipping === 'necessary' ? '必要' : '不必要'} field="needsShipping" group="rakutenInfo" type="select" options={[{label: '必要', value: 'necessary'}, {label: '不必要', value: 'unnecessary'}]} />
                  <InfoRow label="申込ID" value={caseData.rakutenInfo?.applyId} field="applyId" group="rakutenInfo" />
                  <InfoRow label="申込パスワード" value={caseData.rakutenInfo?.applyPass} field="applyPass" group="rakutenInfo" />
                  <InfoRow label="R-login ID" value={caseData.rakutenInfo?.rLoginId} field="rLoginId" group="rakutenInfo" />
                  <InfoRow label="R-login パスワード" value={caseData.rakutenInfo?.rLoginPass} field="rLoginPass" group="rakutenInfo" />
                  <InfoRow label="個人ID" value={caseData.rakutenInfo?.personalId} field="personalId" group="rakutenInfo" />
                  <InfoRow label="個人パスワード" value={caseData.rakutenInfo?.personalPass} field="personalPass" group="rakutenInfo" />
                  <InfoRow label="billpay ID" value={caseData.rakutenInfo?.billpayId} field="billpayId" group="rakutenInfo" />
                  <InfoRow label="billpay パスワード" value={caseData.rakutenInfo?.billpayPass} field="billpayPass" group="rakutenInfo" />
                </div>
              </Card>

              <Card title="Yahoo!ショッピング 開設情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="開設状況" value={caseData.mallProgress?.yahoo} field="yahoo" group="mallProgress" type="select" options={mallStatusOptions} />
                  <InfoRow label="フリー入力" value={caseData.yahooFreeInput} field="yahooFreeInput" type="textarea" />
                </div>
              </Card>

              <Card title="au PAY マーケット 開設情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="開設状況" value={caseData.mallProgress?.aupay} field="aupay" group="mallProgress" type="select" options={mallStatusOptions} />
                  <InfoRow label="フリー入力" value={caseData.aupayFreeInput} field="aupayFreeInput" type="textarea" />
                </div>
              </Card>

              <Card title="進捗コメント">
                <div style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <Input 
                      placeholder="進捗コメントを入力..." 
                      value={newComment} 
                      onChange={e => setNewComment(e.target.value)} 
                      style={{ marginBottom: 0, flex: 1 }}
                    />
                    <Button onClick={handleAddComment} disabled={!newComment.trim()}>追加</Button>
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
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'basic' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <Card title="基本情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="区分" value={caseData.customerType === 'corporation' ? '法人' : '個人事業主'} field="customerType" type="select" options={[{label: '法人', value: 'corporation'}, {label: '個人事業主', value: 'sole_proprietor'}]} />
                  <InfoRow label="法人名/屋号" value={caseData.companyName} field="companyName" />
                  <InfoRow label="法人名/屋号 ふりがな" value={caseData.companyNameKana} field="companyNameKana" />
                  <InfoRow label="郵便番号" value={caseData.companyZipCode} field="companyZipCode" />
                  <InfoRow label="住所" value={caseData.companyAddress} field="companyAddress" />
                  <InfoRow label="住所 ふりがな" value={caseData.companyAddressKana} field="companyAddressKana" />
                  { (isEditing ? editedCase.customerType : caseData.customerType) === 'corporation' && (
                    <InfoRow label="法人番号" value={caseData.corporateNumber} field="corporateNumber" />
                  )}
                  <InfoRow label="設立/開業年月日" value={caseData.establishedDate} field="establishedDate" type="date" />
                </div>
              </Card>

              { (isEditing ? editedCase.customerType : caseData.customerType) === 'corporation' && (
                <Card title="代表取締役情報">
                  <div style={{ padding: '0 28px 28px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}><InfoRow label="姓" value={caseData.repLastName} field="repLastName" /></div>
                      <div style={{ flex: 1 }}><InfoRow label="名" value={caseData.repFirstName} field="repFirstName" /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}><InfoRow label="姓 ふりがな" value={caseData.repLastNameKana} field="repLastNameKana" /></div>
                      <div style={{ flex: 1 }}><InfoRow label="名 ふりがな" value={caseData.repFirstNameKana} field="repFirstNameKana" /></div>
                    </div>
                    <InfoRow label="生年月日" value={caseData.repBirthDate} field="repBirthDate" type="date" />
                    <InfoRow label="郵便番号" value={caseData.repZipCode} field="repZipCode" />
                    <InfoRow label="住所" value={caseData.repAddress} field="repAddress" />
                    <InfoRow label="住所 ふりがな" value={caseData.repAddressKana} field="repAddressKana" />
                  </div>
                </Card>
              )}

              <Card title="担当者情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}><InfoRow label="姓" value={caseData.staffLastName} field="staffLastName" /></div>
                    <div style={{ flex: 1 }}><InfoRow label="名" value={caseData.staffFirstName} field="staffFirstName" /></div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}><InfoRow label="姓 ふりがな" value={caseData.staffLastNameKana} field="staffLastNameKana" /></div>
                    <div style={{ flex: 1 }}><InfoRow label="名 ふりがな" value={caseData.staffFirstNameKana} field="staffFirstNameKana" /></div>
                  </div>
                  <InfoRow label="生年月日" value={caseData.staffBirthDate} field="staffBirthDate" type="date" />
                  <InfoRow label="郵便番号" value={caseData.staffZipCode} field="staffZipCode" />
                  <InfoRow label="住所" value={caseData.staffAddress} field="staffAddress" />
                  <InfoRow label="住所 ふりがな" value={caseData.staffAddressKana} field="staffAddressKana" />
                </div>
              </Card>

              <Card title="連絡先・報酬情報">
                <div style={{ padding: '0 28px 28px' }}>
                  <InfoRow label="携帯電話番号" value={caseData.phone} field="phone" />
                  <InfoRow label="メールアドレス" value={caseData.email} field="email" />
                  <InfoRow label="金額" value={`¥${(caseData.baseAmount || 0).toLocaleString()}`} field="baseAmount" />
                  <InfoRow label="デポジット有無" value={caseData.deposit ? '有' : '無'} field="deposit" type="select" options={[{label: '有', value: 'true'}, {label: '無', value: 'false'}]} />
                  { (isEditing ? String(editedCase.deposit) === 'true' : caseData.deposit) && (
                    <InfoRow label="デポジット金額" value={`¥${(caseData.depositAmount || 0).toLocaleString()}`} field="depositAmount" />
                  )}
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
