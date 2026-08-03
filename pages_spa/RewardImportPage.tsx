import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import {
  distributeReward,
  matchRowToTarget,
  buildMatchTargets,
  findMatchTarget,
  MatchTarget,
  RewardDistributionResult
} from '../services/rewardDistribution';
import { Case, User, UserRole, RewardBatch, RewardPayout, RewardRow } from '../types';
import { Card, Button, Badge, Input, Textarea, Select } from '../components/UI';

interface DraftRow {
  ownerName: string;
  mallType: string;
  shopUrl?: string;
  salesAmount?: number;
  rewardAmount: number;
  matchedCaseId: string | null;
}

const blankDraftRow = (): DraftRow => ({
  ownerName: '',
  mallType: '',
  shopUrl: undefined,
  salesAmount: undefined,
  rewardAmount: 0,
  matchedCaseId: null
});

// 過去に法人名などで保存された行を編集画面で開いたときも、マッチ済みの相手が分かれば
// 個人名優先の表記に揃え直す。
const rewardRowToDraft = (r: RewardRow, allCases: Case[], allUsers: User[]): DraftRow => {
  const targets = buildMatchTargets(allCases, allUsers, c => resolveCaseDisplayName(c, allUsers));
  const matched = findMatchTarget(r.matchedCaseId, targets);
  return {
    ownerName: matched ? matched.name : r.ownerName,
    mallType: r.mallType,
    shopUrl: r.shopUrl,
    salesAmount: r.salesAmount,
    rewardAmount: r.rewardAmount,
    matchedCaseId: r.matchedCaseId || null
  };
};

const draftRowToInput = (r: DraftRow) => ({
  ownerName: r.ownerName,
  mallType: r.mallType,
  shopUrl: r.shopUrl,
  salesAmount: r.salesAmount,
  rewardAmount: r.rewardAmount,
  matchedCaseId: r.matchedCaseId
});

const computeDistributions = (rows: DraftRow[], allCases: Case[], allUsers: User[]): (RewardDistributionResult | null)[] => {
  const targets = buildMatchTargets(allCases, allUsers, c => resolveCaseDisplayName(c, allUsers));
  return rows.map(row => {
    const matched = findMatchTarget(row.matchedCaseId, targets);
    if (!matched || !row.rewardAmount) return null;
    return distributeReward(matched, row.rewardAmount, allCases, allUsers);
  });
};

const buildPayoutsByRowIndex = (rows: DraftRow[], distributions: (RewardDistributionResult | null)[]) =>
  rows.map((_, idx) => {
    const dist = distributions[idx];
    if (!dist) return [];
    const payouts: { recipientType: 'l1' | 'l2' | 'ecp'; recipientUserId: string | null; recipientName: string; amount: number }[] = [];
    if (dist.l1) payouts.push({ recipientType: 'l1', recipientUserId: dist.l1.userId, recipientName: dist.l1.name, amount: dist.l1.amount });
    if (dist.l2) payouts.push({ recipientType: 'l2', recipientUserId: dist.l2.userId, recipientName: dist.l2.name, amount: dist.l2.amount });
    payouts.push({ recipientType: 'ecp', recipientUserId: null, recipientName: 'ECP', amount: dist.ecpAmount });
    return payouts;
  });

const parseNumber = (s: string): number | undefined => {
  const cleaned = (s || '').replace(/[,\s¥]/g, '');
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
};

const parsePastedTable = (text: string): DraftRow[] =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const cols = line.split('\t').map(c => c.trim());
      const [ownerName = '', mallType = '', shopUrl = '', salesRaw = '', rewardRaw = ''] = cols;
      return {
        ownerName,
        mallType,
        shopUrl: shopUrl || undefined,
        salesAmount: parseNumber(salesRaw),
        rewardAmount: parseNumber(rewardRaw) ?? 0,
        matchedCaseId: null
      };
    });

const currentMonthValue = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ツリー画面(TierTreePage の displayName)と同じ優先順位：代表者名 → ユーザーアカウントの
// 個人名 → 会社名。法人の案件で代表者名が未入力でも、会社名より先にアカウントの個人名を
// 使うことで「誰なのか会社名だとわからない」状態を避ける。
const resolveCaseDisplayName = (c: Case, allUsers: User[]): string => {
  const repName = [c.repLastName, c.repFirstName].filter(Boolean).join(' ');
  if (repName) return repName;
  const owner = allUsers.find(u => (u.loginId || '').toLowerCase() === (c.id || '').toLowerCase());
  return owner?.name || c.companyName || '不明';
};

const cellInputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '32px',
  padding: '4px 6px',
  fontSize: '0.8rem',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  background: 'var(--bg-main)',
  color: 'var(--text-main)',
  boxSizing: 'border-box'
};

// 取り込みプレビュー・バッチ編集の両方で使う、行の編集可能テーブル。
const RewardRowsEditor = ({ rows, allCases, allUsers, onChangeRow, onRemoveRow, onAddRow }: {
  rows: DraftRow[];
  allCases: Case[];
  allUsers: User[];
  onChangeRow: (idx: number, patch: Partial<DraftRow>) => void;
  onRemoveRow: (idx: number) => void;
  onAddRow: () => void;
}) => {
  const distributions = useMemo(() => computeDistributions(rows, allCases, allUsers), [rows, allCases, allUsers]);
  const matchTargets = useMemo(
    () => buildMatchTargets(allCases, allUsers, c => resolveCaseDisplayName(c, allUsers)),
    [allCases, allUsers]
  );
  const unmatchedCount = rows.filter(r => !r.matchedCaseId).length;

  return (
    <>
      {unmatchedCount > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <Badge color="#f59e0b">{unmatchedCount}件が未マッチングです</Badge>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
          <thead>
            <tr>
              <th className="align-left" style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-sub)' }}>オーナー名</th>
              <th className="align-left" style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-sub)' }}>モール</th>
              <th className="align-right" style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-sub)' }}>報酬額</th>
              <th className="align-left" style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-sub)' }}>対応する案件・スタッフ</th>
              <th className="align-left" style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-sub)' }}>1段目</th>
              <th className="align-left" style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-sub)' }}>2段目</th>
              <th className="align-right" style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-sub)' }}>ECP</th>
              <th style={{ padding: '8px', width: '32px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const dist = distributions[idx];
              return (
                <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '6px' }}>
                    <input style={cellInputStyle} value={row.ownerName} onChange={e => onChangeRow(idx, { ownerName: e.target.value })} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input style={cellInputStyle} value={row.mallType} onChange={e => onChangeRow(idx, { mallType: e.target.value })} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input
                      style={{ ...cellInputStyle, textAlign: 'right' }}
                      value={row.rewardAmount || ''}
                      inputMode="numeric"
                      onChange={e => onChangeRow(idx, { rewardAmount: parseNumber(e.target.value) ?? 0 })}
                    />
                  </td>
                  <td style={{ padding: '6px', minWidth: '220px' }}>
                    <Select
                      value={row.matchedCaseId || ''}
                      onChange={e => {
                        const newId = e.target.value || null;
                        const matched = findMatchTarget(newId, matchTargets);
                        onChangeRow(idx, {
                          matchedCaseId: newId,
                          ownerName: matched ? matched.name : row.ownerName
                        });
                      }}
                      containerStyle={{ marginBottom: 0 }}
                      style={{ minHeight: '32px', fontSize: '0.8rem' }}
                    >
                      <option value="">-- 選択してください --</option>
                      <optgroup label="案件">
                        {matchTargets.filter(t => t.kind === 'case').map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="スタッフ本人のショップ">
                        {matchTargets.filter(t => t.kind === 'staff').map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </optgroup>
                    </Select>
                  </td>
                  <td className="align-left" style={{ padding: '8px', fontSize: '0.8rem' }}>
                    {dist ? (dist.l1 ? `${dist.l1.name} ¥${dist.l1.amount.toLocaleString()}` : 'ECPが吸収') : '-'}
                  </td>
                  <td className="align-left" style={{ padding: '8px', fontSize: '0.8rem' }}>
                    {dist ? (dist.l2 ? `${dist.l2.name} ¥${dist.l2.amount.toLocaleString()}` : 'ECPが吸収') : '-'}
                  </td>
                  <td className="align-right" style={{ padding: '8px', fontWeight: 800 }}>
                    {dist ? `¥${dist.ecpAmount.toLocaleString()}` : '-'}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'center' }}>
                    <button
                      onClick={() => onRemoveRow(idx)}
                      title="この行を削除"
                      style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '12px' }}>
        <Button variant="ghost" onClick={onAddRow} style={{ fontSize: '0.75rem', padding: '6px 14px' }}>
          <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>行を追加
        </Button>
      </div>
    </>
  );
};

const BatchHistoryRow = ({ batch, allCases, allUsers, isMobile, onDeleted }: {
  batch: RewardBatch;
  allCases: Case[];
  allUsers: User[];
  isMobile: boolean;
  onDeleted: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState<RewardRow[]>([]);
  const [payouts, setPayouts] = useState<RewardPayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editMonth, setEditMonth] = useState(batch.month);
  const [editRows, setEditRows] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRows = async () => {
    setLoading(true);
    const [r, p] = await Promise.all([db.getRewardRows(batch.id), db.getRewardPayouts(batch.id)]);
    setRows(r);
    setPayouts(p);
    setLoading(false);
    return r;
  };

  const toggle = async () => {
    if (!expanded && rows.length === 0) await loadRows();
    setExpanded(v => !v);
  };

  const startEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentRows = rows.length > 0 ? rows : await loadRows();
    setEditRows(currentRows.map(r => rewardRowToDraft(r, allCases, allUsers)));
    setEditMonth(batch.month);
    setSaveError(null);
    setEditing(true);
    setExpanded(true);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(false);
    setSaveError(null);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`${batch.month} の分配データを削除します。この操作は元に戻せません。よろしいですか？`)) return;
    setDeleting(true);
    const result = await db.deleteRewardBatch(batch.id);
    setDeleting(false);
    if (result.ok) onDeleted();
    else alert('削除に失敗しました。');
  };

  const handleSaveEdit = async () => {
    const unmatchedCount = editRows.filter(r => !r.matchedCaseId).length;
    if (unmatchedCount > 0) {
      setSaveError(`${unmatchedCount}件が案件と紐付いていません。すべての行で対応する案件を選択してください。`);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (editMonth !== batch.month) {
        const monthResult = await db.updateRewardBatchMonth(batch.id, editMonth);
        if (!monthResult.ok) throw new Error('対象月の更新に失敗しました。');
      }
      const distributions = computeDistributions(editRows, allCases, allUsers);
      const payoutsByRowIndex = buildPayoutsByRowIndex(editRows, distributions);
      const result = await db.replaceRewardRowsAndPayouts(batch.id, editRows.map(draftRowToInput), payoutsByRowIndex);
      if (!result.ok) throw new Error('保存に失敗しました。');
      setEditing(false);
      await loadRows();
    } catch (e: any) {
      setSaveError(e.message || '保存中にエラーが発生しました。');
    } finally {
      setSaving(false);
    }
  };

  const recipientTotals = useMemo(() => {
    const totals: Record<string, { name: string; type: string; amount: number }> = {};
    payouts.forEach(p => {
      const key = `${p.recipientType}:${p.recipientUserId || p.recipientName}`;
      if (!totals[key]) totals[key] = { name: p.recipientName, type: p.recipientType, amount: 0 };
      totals[key].amount += p.amount;
    });
    return Object.values(totals).sort((a, b) => b.amount - a.amount);
  }, [payouts]);

  const totalReward = useMemo(() => rows.reduce((s, r) => s + (r.rewardAmount || 0), 0), [rows]);

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        onClick={toggle}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer', gap: '12px', flexWrap: 'wrap' }}
      >
        <div style={{ fontWeight: 800 }}>
          <i className={`fa-solid ${expanded ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ marginRight: '10px', color: 'var(--text-sub)' }}></i>
          {batch.month}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: 'var(--text-sub)', fontSize: '0.8rem', fontWeight: 700 }}>
            {new Date(batch.createdAt).toLocaleDateString('ja-JP')}
          </div>
          {!editing && (
            <Button variant="ghost" onClick={startEdit} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              <i className="fa-solid fa-pen" style={{ marginRight: '6px' }}></i>編集
            </Button>
          )}
          <Button variant="danger" onClick={handleDelete} disabled={deleting} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
            {deleting ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-trash" style={{ marginRight: '6px' }}></i>削除</>}
          </Button>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: '0 16px 20px' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}><i className="fa-solid fa-circle-notch fa-spin"></i></div>
          ) : editing ? (
            <div onClick={e => e.stopPropagation()}>
              <Input
                label="対象月"
                type="month"
                value={editMonth}
                onChange={e => setEditMonth(e.target.value)}
                containerStyle={{ maxWidth: '240px' }}
              />
              <RewardRowsEditor
                rows={editRows}
                allCases={allCases}
                allUsers={allUsers}
                onChangeRow={(idx, patch) => setEditRows(rs => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)))}
                onRemoveRow={idx => setEditRows(rs => rs.filter((_, i) => i !== idx))}
                onAddRow={() => setEditRows(rs => [...rs, blankDraftRow()])}
              />
              {saveError && (
                <div style={{ marginTop: '16px', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>{saveError}</div>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : '変更を保存する'}
                </Button>
                <Button variant="ghost" onClick={cancelEdit} disabled={saving}>キャンセル</Button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', fontWeight: 700, marginBottom: '12px' }}>
                対象ショップ数: {rows.length} / 報酬合計: ¥{totalReward.toLocaleString()}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '400px' : 'auto' }}>
                  <thead>
                    <tr>
                      <th className="align-left" style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-sub)' }}>受取</th>
                      <th className="align-left" style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-sub)' }}>区分</th>
                      <th className="align-right" style={{ padding: '8px', fontSize: '0.75rem', color: 'var(--text-sub)' }}>合計支払額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipientTotals.map((t, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                        <td className="align-left" style={{ padding: '8px', fontWeight: 700 }}>{t.name}</td>
                        <td className="align-left" style={{ padding: '8px' }}>
                          <Badge color={t.type === 'ecp' ? '#4f46e5' : t.type === 'l1' ? '#0ea5e9' : '#8b5cf6'}>
                            {t.type === 'ecp' ? 'ECP' : t.type === 'l1' ? '直紹介' : '2段目'}
                          </Badge>
                        </td>
                        <td className="align-right" style={{ padding: '8px', fontWeight: 900 }}>¥{t.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const RewardImportPage = () => {
  const { user } = useAppContext();
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [batches, setBatches] = useState<RewardBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [month, setMonth] = useState(currentMonthValue());
  const [pasteText, setPasteText] = useState('');
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [cases, users, batchList] = await Promise.all([db.getAllCases(), db.getUsers(), db.getRewardBatches()]);
    setAllCases(cases);
    setAllUsers(users);
    setBatches(batchList);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isMobile = windowWidth < 768;

  const handleParse = () => {
    const targets = buildMatchTargets(allCases, allUsers, c => resolveCaseDisplayName(c, allUsers));
    const parsed = parsePastedTable(pasteText).map(row => {
      const matched = matchRowToTarget(row.ownerName, allCases, allUsers, targets);
      return matched
        ? { ...row, ownerName: matched.name, matchedCaseId: matched.id }
        : { ...row, matchedCaseId: null };
    });
    setDraftRows(parsed);
    setSaveError(null);
  };

  const handleSave = async () => {
    const unmatchedCount = draftRows.filter(r => !r.matchedCaseId).length;
    if (unmatchedCount > 0) {
      setSaveError(`${unmatchedCount}件が案件と紐付いていません。すべての行で対応する案件を選択してください。`);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const batch = await db.createRewardBatch(month);
      if (!batch) throw new Error('バッチの作成に失敗しました。');

      const distributions = computeDistributions(draftRows, allCases, allUsers);
      const payoutsByRowIndex = buildPayoutsByRowIndex(draftRows, distributions);
      const result = await db.saveRewardRowsAndPayouts(batch.id, draftRows.map(draftRowToInput), payoutsByRowIndex);
      if (!result.ok) throw new Error('保存に失敗しました。');

      setDraftRows([]);
      setPasteText('');
      await loadData();
    } catch (e: any) {
      setSaveError(e.message || '保存中にエラーが発生しました。');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== UserRole.ADMIN) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-sub)' }}>
        <p style={{ fontWeight: 700 }}>このページは管理者のみ利用できます。</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: isMobile ? '1.5rem' : '2.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em' }}>
          月次報酬分配 <span style={{ color: 'var(--primary)' }}>.</span>
        </h1>
        <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px' }}>
          モールから届く月次報酬明細を取り込み、紹介チェーンに沿って直紹介1/2・2段目1/4・ECP残りに分配します。
        </p>
      </header>

      <div style={{ marginBottom: '32px' }}>
        <Card title="報酬明細の取り込み">
          <Input
            label="対象月"
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            containerStyle={{ maxWidth: '240px' }}
          />
          <Textarea
            label="スプレッドシートからコピーして貼り付け（オーナー名・モール・URL・売上・報酬額の順）"
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            style={{ minHeight: '200px', fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
          <Button onClick={handleParse} disabled={!pasteText.trim()}>
            <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '8px' }}></i>解析する
          </Button>
        </Card>
      </div>

      {draftRows.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <Card title={`プレビュー・案件マッチング確認（${draftRows.length}件）`}>
            <RewardRowsEditor
              rows={draftRows}
              allCases={allCases}
              allUsers={allUsers}
              onChangeRow={(idx, patch) => setDraftRows(rs => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)))}
              onRemoveRow={idx => setDraftRows(rs => rs.filter((_, i) => i !== idx))}
              onAddRow={() => setDraftRows(rs => [...rs, blankDraftRow()])}
            />

            {saveError && (
              <div style={{ marginTop: '16px', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>{saveError}</div>
            )}

            <div style={{ marginTop: '24px' }}>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : 'この内容で保存する'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Card title="分配履歴">
        {batches.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-sub)', fontWeight: 700 }}>まだ分配履歴がありません。</div>
        ) : (
          <div>
            {batches.map(b => (
              <BatchHistoryRow key={b.id} batch={b} allCases={allCases} allUsers={allUsers} isMobile={isMobile} onDeleted={loadData} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default RewardImportPage;
