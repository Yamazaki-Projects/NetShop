
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus, UserRole, TaskStatus } from '../types';
import { Card, Button, StatusBadge, Badge, Input, Select } from '../components/UI';
// Fix: Added missing STATUS_COLORS to the import
import { STATUS_LABELS, REASON_TEMPLATES, TASK_STATUS_COLORS, STATUS_COLORS } from '../constants';

const CaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(() => db.getCaseById(id!));
  
  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<CaseStatus>(CaseStatus.APPROVED);
  const [reasonTemplate, setReasonTemplate] = useState('');
  const [reasonNote, setReasonNote] = useState('');

  if (!caseData) return <div className="p-8 text-center">案件が見つかりません</div>;

  const isEditable = user?.role === UserRole.AGENCY && 
                     (caseData.status === CaseStatus.DRAFT || caseData.status === CaseStatus.NEEDS_FIX);

  const canSubmit = user?.role === UserRole.AGENCY && 
                    (caseData.status === CaseStatus.DRAFT || caseData.status === CaseStatus.NEEDS_FIX);

  const canReview = user?.role === UserRole.ADMIN && 
                    [CaseStatus.SUBMITTED, CaseStatus.REVIEWING, CaseStatus.NEEDS_FIX].includes(caseData.status);

  const handleSubmit = () => {
    if (window.confirm('この案件を審査に提出しますか？提出後は運営による承認または差戻しがあるまで編集できません。')) {
      const updated = db.updateCase(caseData.id, { status: CaseStatus.SUBMITTED }, user!);
      if (updated) setCaseData({ ...updated });
    }
  };

  const handleReviewSubmit = () => {
    const updated = db.reviewCase(caseData.id, reviewAction, reasonTemplate, reasonNote, user!);
    if (updated) {
      setCaseData({ ...updated });
      setShowReviewModal(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const updated = db.addDocument(caseData.id, {
        docType: '本人確認書類',
        fileName: file.name,
        note: '代理店による手動アップロード'
      }, user!);
      if (updated) setCaseData({ ...updated });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white/80 dark:bg-bg-darkMain/80 backdrop-blur-md z-10 py-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/cases')}>
            <i className="fa-solid fa-arrow-left"></i>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-text-main dark:text-text-darkMain">
                {caseData.customerName} {caseData.companyName ? `(${caseData.companyName})` : ''}
              </h1>
              <StatusBadge status={caseData.status} />
            </div>
            <p className="text-sm text-text-sub dark:text-text-darkSub">案件ID: {caseData.id} • 担当: {caseData.agencyName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canSubmit && (
            <Button onClick={handleSubmit} variant="primary" className="shadow-lg shadow-primary/20">
              <i className="fa-solid fa-paper-plane mr-2"></i>審査に提出
            </Button>
          )}
          {canReview && (
            <Button onClick={() => setShowReviewModal(true)} variant="success" className="shadow-lg shadow-green-600/20">
              <i className="fa-solid fa-magnifying-glass mr-2"></i>審査アクション
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 border-b pb-2 dark:border-slate-800">顧客詳細情報</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <DetailRow label="顧客種別" value={caseData.customerType === 'individual' ? '個人' : '法人'} />
              <DetailRow label="プラットフォーム" value={caseData.platform} />
              <DetailRow label="メールアドレス" value={caseData.email} />
              <DetailRow label="電話番号" value={caseData.phone} />
              <DetailRow label="住所" value={caseData.address} className="sm:col-span-2" />
              <DetailRow label="登録日" value={new Date(caseData.createdAt).toLocaleString('ja-JP')} />
              <DetailRow label="最終更新" value={new Date(caseData.updatedAt).toLocaleString('ja-JP')} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 border-b pb-2 dark:border-slate-800 flex justify-between items-center">
              進捗状況
              {isEditable && <Badge className="bg-primary/10 text-primary">編集中</Badge>}
            </h3>
            <div className="space-y-2">
              {caseData.tasks.length > 0 ? caseData.tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                    <span className="text-sm font-medium text-text-main dark:text-text-darkMain">{task.title}</span>
                  </div>
                  <Badge className={TASK_STATUS_COLORS[task.status]}>{task.status.toUpperCase()}</Badge>
                </div>
              )) : <p className="text-sm text-text-sub italic">タスクが設定されていません</p>}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4 border-b pb-2 dark:border-slate-800">提出書類</h3>
            <div className="space-y-3">
              {caseData.documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 mr-4">
                      <i className="fa-solid fa-file-pdf text-xl"></i>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main dark:text-text-darkMain">{doc.docType}</p>
                      <p className="text-xs text-text-sub dark:text-text-darkSub">{doc.fileName} • {new Date(doc.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button variant="ghost" className="text-primary hover:bg-primary/5">
                    <i className="fa-solid fa-download"></i>
                  </Button>
                </div>
              ))}
              
              {isEditable && (
                <div className="mt-4">
                  <input type="file" id="doc-upload" className="hidden" onChange={handleFileUpload} />
                  <label htmlFor="doc-upload" className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/20 group-hover:text-primary mb-3 transition-all">
                      <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                    </div>
                    <span className="text-sm font-medium text-text-main dark:text-text-darkMain">書類を追加アップロード</span>
                    <span className="text-xs text-text-sub mt-1">PDF, JPG, PNG (最大 10MB)</span>
                  </label>
                </div>
              )}
              {caseData.documents.length === 0 && !isEditable && (
                <p className="text-sm text-text-sub italic text-center py-4">書類はまだ提出されていません</p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 border-l-4 border-l-primary">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <i className="fa-solid fa-history text-primary text-sm"></i>
              審査・修正履歴
            </h3>
            <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
              {caseData.reviews.length > 0 ? caseData.reviews.map((review, idx) => (
                <div key={review.id} className="relative pl-8">
                  <div className={`absolute left-0 top-1.5 w-[24px] h-[24px] rounded-full border-4 border-white dark:border-bg-darkSub flex items-center justify-center text-[10px] text-white ${STATUS_COLORS[review.action]}`}>
                    {idx === 0 ? <i className="fa-solid fa-check"></i> : null}
                  </div>
                  <div className="mb-1 flex items-center justify-between">
                    <StatusBadge status={review.action} />
                    <span className="text-[10px] text-text-sub dark:text-text-darkSub font-mono">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                  {review.reasonTemplate && (
                    <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">{review.reasonTemplate}</p>
                  )}
                  {review.reasonNote && (
                    <p className="text-xs text-text-main dark:text-text-darkMain bg-slate-100 dark:bg-slate-800 p-2 rounded italic">
                      "{review.reasonNote}"
                    </p>
                  )}
                  <p className="text-[10px] text-text-sub mt-2">審査員: {review.createdByAdminName}</p>
                </div>
              )) : (
                <div className="text-center py-4">
                   <p className="text-sm text-text-sub italic">履歴はありません</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold mb-3">案件メモ (代理店用)</h3>
            <div className="text-sm text-text-main dark:text-text-darkMain bg-bg-sub dark:bg-bg-darkSub p-4 rounded-xl min-h-[120px] whitespace-pre-wrap leading-relaxed">
              {caseData.notes || 'メモはありません'}
            </div>
          </Card>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg p-6 space-y-6 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-main dark:text-text-darkMain">審査アクションの実行</h2>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="space-y-4">
              <Select label="判定結果" value={reviewAction} onChange={(e) => setReviewAction(e.target.value as CaseStatus)}>
                <option value={CaseStatus.APPROVED}>承認 (Approved)</option>
                <option value={CaseStatus.NEEDS_FIX}>差戻し / 要修正 (Needs Fix)</option>
                <option value={CaseStatus.REJECTED}>却下 (Rejected)</option>
                <option value={CaseStatus.REVIEWING}>継続確認中 (Reviewing)</option>
                <option value={CaseStatus.ACTIVE}>運用開始 (Active)</option>
              </Select>

              {reviewAction === CaseStatus.NEEDS_FIX && (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <Select label="理由テンプレート" value={reasonTemplate} onChange={(e) => setReasonTemplate(e.target.value)}>
                    <option value="">-- 定型文を選択 --</option>
                    {REASON_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">詳細コメント (代理店に表示されます)</label>
                    <textarea 
                      className="w-full px-4 py-3 rounded-xl border bg-white dark:bg-bg-darkSub border-slate-200 dark:border-slate-800 h-32 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      value={reasonNote}
                      onChange={(e) => setReasonNote(e.target.value)}
                      placeholder="具体的な修正箇所や不足書類について指示してください"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={() => setShowReviewModal(false)}>キャンセル</Button>
              <Button onClick={handleReviewSubmit} variant={reviewAction === CaseStatus.APPROVED ? 'success' : reviewAction === CaseStatus.NEEDS_FIX ? 'danger' : 'primary'}>
                判定を確定する
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ label, value, className = "" }: { label: string; value: string; className?: string }) => (
  <div className={`p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg ${className}`}>
    <dt className="text-[10px] text-text-sub uppercase mb-1 tracking-widest font-bold">{label}</dt>
    <dd className="text-text-main dark:text-text-darkMain font-medium">{value || '-'}</dd>
  </div>
);

export default CaseDetailPage;
