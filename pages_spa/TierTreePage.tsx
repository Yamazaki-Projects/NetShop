
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { User, UserStatus, UserRole, AgencyApplicationStatus, Case, MembershipPlan, isAdminRole, RewardBatch, RewardRow, RewardPayout } from '../types';
import { Badge, Button, Card, Input, Select, AgencyStatusBadge } from '../components/UI';

interface PayoutSource { fromName: string; mallType: string; amount: number; type: 'l1' | 'l2'; }
interface PayoutSummary { total: number; l1: number; l2: number; sources: PayoutSource[]; }
type PayoutMap = Map<string, PayoutSummary>;

const buildPayoutSummaries = (payouts: RewardPayout[], rows: RewardRow[]): { byRecipient: PayoutMap; ecpTotal: number } => {
  const rowsById = new Map(rows.map(r => [r.id, r]));
  const byRecipient: PayoutMap = new Map();
  let ecpTotal = 0;
  payouts.forEach(p => {
    if (p.recipientType === 'ecp' || !p.recipientUserId) {
      ecpTotal += p.amount;
      return;
    }
    const row = rowsById.get(p.rowId);
    const key = p.recipientUserId.toLowerCase();
    const cur = byRecipient.get(key) || { total: 0, l1: 0, l2: 0, sources: [] };
    cur.total += p.amount;
    if (p.recipientType === 'l1') cur.l1 += p.amount;
    if (p.recipientType === 'l2') cur.l2 += p.amount;
    cur.sources.push({
      fromName: row?.ownerName || '不明',
      mallType: row?.mallType || '',
      amount: p.amount,
      type: p.recipientType as 'l1' | 'l2'
    });
    byRecipient.set(key, cur);
  });
  return { byRecipient, ecpTotal };
};

// cases.referrer_id / reward_payouts.recipient_user_id には User.id(UUID) 形式と
// loginId(=Case.id) 形式が混在して保存されている。片方だけで突き合わせると紹介関係を
// 取りこぼすため、ノードの識別子は常に両方を候補キーとして扱う。
const identifierKeys = (entity: { id?: string; loginId?: string }): string[] =>
  [entity.id, entity.loginId]
    .filter((s): s is string => !!s)
    .map(s => s.toLowerCase());

const getPayoutForUser = (user: User, payoutMap: PayoutMap): PayoutSummary | undefined => {
  for (const key of identifierKeys(user)) {
    const found = payoutMap.get(key);
    if (found) return found;
  }
  return undefined;
};

const PayoutBreakdownList = ({ summary }: { summary: PayoutSummary }) => (
  <>
    {summary.sources.map((s, idx) => (
      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '5px 0' }}>
        <span style={{ color: 'var(--text-sub)', fontWeight: 700 }}>
          {s.fromName}（{s.mallType}）・{s.type === 'l1' ? '直紹介' : '2段目'}
        </span>
        <span style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>¥{s.amount.toLocaleString()}</span>
      </div>
    ))}
    <div style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
      <span>合計</span>
      <span>¥{summary.total.toLocaleString()}</span>
    </div>
  </>
);

// PC: マウスカーソル位置に追従するポップアップ（かざすと内訳が出る）。
// スマホ等タッチ環境: ホバーが存在しないため、タップでボトムシートを開いて内訳を表示する。
// どちらも position:fixed + createPortal で document.body 直下に描画するため、
// ツリーカードのホバー時 transform が作る containing block や overflow:auto の影響を受けない。
const PayoutHoverPopup = ({ summary, children, badgeStyle, isMobile }: {
  summary: PayoutSummary;
  children: React.ReactNode;
  badgeStyle: React.CSSProperties;
  isMobile?: boolean;
}) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isMobile) {
    return (
      <span
        onClick={(e) => { e.stopPropagation(); setSheetOpen(true); }}
        style={{ ...badgeStyle, cursor: 'pointer' }}
      >
        {children}
        {sheetOpen && createPortal(
          <div
            onClick={() => setSheetOpen(false)}
            onTouchEnd={() => setSheetOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999999, display: 'flex', alignItems: 'flex-end' }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                background: 'var(--bg-card)',
                borderRadius: '20px 20px 0 0',
                padding: '16px 20px 32px',
                boxShadow: '0 -10px 30px rgba(0,0,0,0.3)',
                fontSize: '0.85rem',
                maxHeight: '70vh',
                overflowY: 'auto',
                color: 'var(--text-main)'
              }}
            >
              <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 16px' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontWeight: 900 }}>今月の受取内訳</div>
                <button
                  onClick={() => setSheetOpen(false)}
                  style={{
                    border: 'none',
                    background: 'rgba(127, 127, 127, 0.15)',
                    color: 'var(--text-main)',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <PayoutBreakdownList summary={summary} />
            </div>
          </div>,
          document.body
        )}
      </span>
    );
  }

  return (
    <span
      onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
      style={badgeStyle}
    >
      {children}
      {pos && createPortal(
        <div
          style={{
            position: 'fixed',
            ...(pos.x > window.innerWidth / 2
              ? { right: window.innerWidth - pos.x + 4 }
              : { left: pos.x + 4 }),
            ...(pos.y > window.innerHeight / 2
              ? { bottom: window.innerHeight - pos.y + 4 }
              : { top: pos.y + 4 }),
            zIndex: 999999,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            fontSize: '0.75rem',
            minWidth: '220px',
            maxWidth: '280px',
            maxHeight: '60vh',
            overflowY: 'auto',
            color: 'var(--text-main)',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: '8px' }}>今月の受取内訳</div>
          <PayoutBreakdownList summary={summary} />
        </div>,
        document.body
      )}
    </span>
  );
};

const PayoutBadge = ({ summary, isMobile }: { summary: PayoutSummary; isMobile?: boolean }) => (
  <PayoutHoverPopup
    summary={summary}
    isMobile={isMobile}
    badgeStyle={{
      display: 'inline-flex',
      flexDirection: 'column',
      lineHeight: 1.3,
      fontSize: '0.65rem',
      fontWeight: 800,
      color: '#16a34a',
      background: 'rgba(22, 163, 74, 0.1)',
      padding: '2px 8px',
      borderRadius: '6px',
      whiteSpace: 'nowrap',
      cursor: 'default'
    }}
  >
    <span>今月 ¥{summary.total.toLocaleString()}</span>
    {(summary.l1 > 0 || summary.l2 > 0) && (
      <span style={{ fontWeight: 700, opacity: 0.8, fontSize: '0.6rem' }}>
        直¥{summary.l1.toLocaleString()} / 2段¥{summary.l2.toLocaleString()}
      </span>
    )}
  </PayoutHoverPopup>
);

const SummaryTile = ({ label, amount, color, note }: { label: string; amount: number; color: string; note?: string }) => (
  <div style={{
    padding: '12px 16px',
    background: 'var(--bg-main)',
    border: '1px solid var(--border)',
    borderRadius: '12px'
  }}>
    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-sub)' }}>{label}</div>
    <div style={{ fontSize: '1.4rem', fontWeight: 900, color, lineHeight: 1.3, marginTop: '2px' }}>
      ¥{amount.toLocaleString()}
    </div>
    {note && <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-sub)' }}>{note}</div>}
  </div>
);

// level=1 → 直紹介, level=2 → 2段目
const getCommissionBadge = (level: number, viewerPlan: MembershipPlan | undefined) => {
  if (level === 0) return null;
  const plan = viewerPlan || 'free';
  if (level === 1) {
    const rate = plan === '198k' ? '2%' : '1%';
    const color = plan === '198k' ? '#10b981' : '#0ea5e9';
    return { label: `直紹介 ${rate}`, color };
  }
  if (level === 2 && plan === '198k') {
    return { label: '2段目 1%', color: '#8b5cf6' };
  }
  return null;
};

// 子要素は cases テーブルの紹介関係を追う（縦リスト・横ツリー共通）
const getTreeChildren = (user: User, allCases: Case[], allUsers: User[]): User[] => {
  // User.id だけで照合すると、referrer_id が loginId 形式で保存された案件が
  // 子ノードとして現れず、傘下（とその報酬）が丸ごと欠落する。
  const keys = identifierKeys(user);
  const childCases = allCases
    .filter(c => {
      const refKey = (c.referrerId || '').toLowerCase();
      if (!refKey || !keys.includes(refKey)) return false;
      // 自己参照ノード（自分が自分の紹介者になっている案件）は子として展開しない
      return !keys.includes((c.id || '').toLowerCase());
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return childCases.map(c => {
    const u = allUsers.find(usr => (usr.loginId || '').toLowerCase() === (c.id || '').toLowerCase());
    if (u) return u;
    // ユーザーが見つからない場合は、案件情報から最小限のユーザーオブジェクトを作成
    return {
      id: c.id,
      loginId: c.id,
      name: [c.repLastName, c.repFirstName].filter(Boolean).join(' ') || c.companyName || '不明',
      role: UserRole.AGENCY,
      status: UserStatus.CUSTOMER,
      email: c.email,
      agencyApplicationStatus: AgencyApplicationStatus.NONE,
      createdAt: c.createdAt
    } as User;
  });
};

// 紐付く案件情報を取得（縦リスト・横ツリー共通）
const getAssociatedCase = (user: User, allCases: Case[]) => {
  return allCases.find(c => (c.id || '').toLowerCase() === (user.loginId || '').toLowerCase());
};

// viewer 自身 + viewer の紹介チェーン配下（ダウンライン）に属する識別子キーを列挙する。
// 報酬額は「自分と自分より下のメンバー」の分しか見せないため、そのホワイトリストになる。
// ノードごとに親を遡る方式だと referrerId の形式ゆれで途中で辿れなくなるうえ O(n^2) に
// なるので、紹介者キー→子案件のインデックスを作って viewer から下に一度だけ展開する。
const buildVisibleRecipientKeys = (viewer: User, allCases: Case[], allUsers: User[]): Set<string> => {
  const userByKey = new Map<string, User>();
  allUsers.forEach(u => identifierKeys(u).forEach(k => userByKey.set(k, u)));

  const childrenByReferrer = new Map<string, Case[]>();
  allCases.forEach(c => {
    const refKey = (c.referrerId || '').toLowerCase();
    if (!refKey) return;
    const list = childrenByReferrer.get(refKey);
    if (list) list.push(c);
    else childrenByReferrer.set(refKey, [c]);
  });

  const visible = new Set<string>();
  const queue: string[] = [];
  // 各キーは高々1回しか visible/queue に入らないため、紹介関係が循環していても停止する
  const push = (keys: string[]) => {
    keys.forEach(k => {
      if (!k || visible.has(k)) return;
      visible.add(k);
      queue.push(k);
    });
  };

  push(identifierKeys(viewer));
  while (queue.length > 0) {
    const key = queue.shift() as string;
    (childrenByReferrer.get(key) || []).forEach(c => {
      const caseKey = (c.id || '').toLowerCase();
      const childUser = userByKey.get(caseKey);
      push(childUser ? [...identifierKeys(childUser), caseKey] : [caseKey]);
    });
  }
  return visible;
};

// visibleKeys が null のときは全件閲覧可（管理者・共同経営者）
const canViewPayoutOf = (user: User, visibleKeys: Set<string> | null): boolean =>
  visibleKeys === null || identifierKeys(user).some(k => visibleKeys.has(k));

const TreeNode = ({ user, level, isAdmin, currentUser, allUsers, allCases, onAddCustomer, isMobile, payoutMap, visibleKeys, onReorder, isFirst, isLast, highlightedCaseId }: {
  user: User;
  level: number;
  isAdmin: boolean;
  currentUser: User;
  allUsers: User[];
  allCases: Case[];
  onAddCustomer: (userId: string) => void;
  isMobile?: boolean;
  payoutMap: PayoutMap;
  visibleKeys: Set<string> | null;
  onReorder: (caseId: string, direction: 'up' | 'down') => void;
  isFirst?: boolean;
  isLast?: boolean;
  highlightedCaseId?: string | null;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();

  const children = useMemo(() => getTreeChildren(user, allCases, allUsers), [user.id, allCases, allUsers]);

  const isSelf = currentUser.id === user.id;

  const associatedCase = useMemo(() => getAssociatedCase(user, allCases), [user.loginId, allCases]);
  const isHighlighted = !!associatedCase && associatedCase.id === highlightedCaseId;
  const payoutSummary = canViewPayoutOf(user, visibleKeys) ? getPayoutForUser(user, payoutMap) : undefined;

  const getStatusIcon = () => {
    if (isAdminRole(user.role)) return 'fa-crown';
    if (user.status === UserStatus.AGENCY) return 'fa-user-tie';
    if (user.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) return 'fa-user-check';
    if (user.agencyApplicationStatus === AgencyApplicationStatus.PENDING) return 'fa-clock';
    return 'fa-user';
  };

  return (
    <div
      data-case-id={associatedCase?.id}
      style={{
        marginLeft: level === 0 ? 0 : (isMobile ? '18px' : '40px'),
        marginBottom: '12px',
        borderLeft: level === 0 ? 'none' : '2.5px solid var(--border)',
        paddingLeft: level === 0 ? 0 : (isMobile ? '12px' : '30px'),
        position: 'relative'
      }}
    >
      {level > 0 && (
        <div style={{ position: 'absolute', left: '-2.5px', top: '24px', width: '32px', height: '2.5px', background: 'var(--border)' }}></div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '14px 18px',
        background: isHighlighted ? 'rgba(16, 185, 129, 0.12)' : isSelf ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-card)',
        borderRadius: '16px',
        border: isHighlighted ? '2.5px solid #10b981' : isSelf ? '2.5px solid var(--primary)' : `1.5px solid var(--border)`,
        boxShadow: isHighlighted ? '0 0 0 4px rgba(16, 185, 129, 0.15)' : isSelf ? '0 10px 15px -3px rgba(79, 70, 229, 0.2)' : 'var(--shadow-sm)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 1,
        maxWidth: '650px',
        minWidth: isMobile ? '260px' : '420px',
        cursor: associatedCase ? 'pointer' : 'default'
      }}
      className="tree-node-hover"
      onClick={() => associatedCase && navigate(`/cases/${associatedCase.id}`)}
      >
        <div 
          onClick={(e) => {
            e.stopPropagation();
            if (children.length > 0) setIsExpanded(!isExpanded);
          }}
          style={{ 
            width: '26px', 
            height: '26px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: children.length > 0 ? 'pointer' : 'default',
            color: children.length > 0 ? 'var(--primary)' : 'var(--text-sub)',
            background: 'var(--bg-main)',
            borderRadius: '8px',
            border: '1.5px solid var(--border)',
            transition: 'all 0.2s'
          }}
        >
          {children.length > 0 ? (
            <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ fontSize: '0.7rem' }}></i>
          ) : (
            <div style={{ width: '4px', height: '4px', background: 'var(--text-sub)', borderRadius: '50%', opacity: 0.3 }}></div>
          )}
        </div>

        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '12px', 
          background: isSelf ? 'var(--grad-primary)' : 'var(--bg-main)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: isSelf ? 'white' : 'var(--text-sub)',
          fontSize: '1.1rem',
          boxShadow: isSelf ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
          border: isSelf ? 'none' : '1px solid var(--border)'
        }}>
          <i className={`fa-solid ${associatedCase ? 'fa-briefcase' : getStatusIcon()}`}></i>
        </div>

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {[associatedCase?.repLastName, associatedCase?.repFirstName].filter(Boolean).join(' ') || user.name || associatedCase?.companyName}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-sub)', background: 'var(--bg-main)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
              {(user.loginId || '').toLowerCase()}
            </span>
            {isSelf && <Badge color="var(--primary)" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>あなた</Badge>}
            {/* プランバッジ */}
            {!isSelf && user.membershipPlan && (() => {
              const planColors: Record<string, string> = { 'free': '#94a3b8', '30k': '#f59e0b', '198k': 'var(--primary)' };
              const planLabels: Record<string, string> = { 'free': '無料', '30k': '30k', '198k': '198k' };
              return (
                <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'white', background: planColors[user.membershipPlan], padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                  {planLabels[user.membershipPlan]}
                </span>
              );
            })()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
             <AgencyStatusBadge user={allUsers.find(u => (u.loginId || '').toLowerCase() === (user.loginId || '').toLowerCase())} />
             {associatedCase && (
               <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'white', background: associatedCase.customerType === 'sole_proprietor' ? '#f59e0b' : '#6366f1', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                 {associatedCase.customerType === 'sole_proprietor' ? '個人' : '法人'}
               </span>
             )}
             {associatedCase && (
               <>
                 <span style={{ color: 'var(--border)', fontSize: '0.7rem' }}>|</span>
                 <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-sub)' }}>
                   楽天: {associatedCase.mallProgress.rakuten}
                 </span>
               </>
             )}
             {/* 報酬率バッジ（自分視点・非管理者のみ） */}
             {!isAdmin && !isSelf && (() => {
               const badge = getCommissionBadge(level, currentUser.membershipPlan);
               return badge ? (
                 <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'white', background: badge.color, padding: '1px 8px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                   {badge.label}
                 </span>
               ) : null;
             })()}
             {payoutSummary && <PayoutBadge summary={payoutSummary} isMobile={isMobile} />}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {associatedCase && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <button
                onClick={(e) => { e.stopPropagation(); onReorder(associatedCase.id, 'up'); }}
                disabled={isFirst}
                title="上に移動"
                style={{ border: '1.5px solid var(--border)', borderRadius: '6px', background: 'var(--bg-main)', width: '22px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isFirst ? 'default' : 'pointer', opacity: isFirst ? 0.3 : 1, padding: 0 }}
              >
                <i className="fa-solid fa-chevron-up" style={{ fontSize: '0.55rem' }}></i>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onReorder(associatedCase.id, 'down'); }}
                disabled={isLast}
                title="下に移動"
                style={{ border: '1.5px solid var(--border)', borderRadius: '6px', background: 'var(--bg-main)', width: '22px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isLast ? 'default' : 'pointer', opacity: isLast ? 0.3 : 1, padding: 0 }}
              >
                <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.55rem' }}></i>
              </button>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onAddCustomer(user.id);
            }}
            style={{ padding: '6px 12px', fontSize: '0.7rem', fontWeight: 800, border: '1.5px solid var(--border)', borderRadius: '10px', background: 'var(--bg-main)', color: 'var(--primary)' }}
          >
            <i className="fa-solid fa-plus"></i> 顧客追加
          </Button>
          {(isAdmin || isSelf) && (
            <Button 
              variant="ghost" 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (associatedCase) navigate(`/cases/${associatedCase.id}`);
                else navigate(isAdmin ? `/agencies` : `/cases`);
              }} 
              style={{ padding: '6px 12px', fontSize: '0.7rem', fontWeight: 800, border: '1.5px solid var(--border)', borderRadius: '10px', background: 'var(--bg-main)' }}
            >
              詳細
            </Button>
          )}
        </div>
      </div>

      {isExpanded && children.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          {children.map((child, idx) => (
            <TreeNode
              key={child.id}
              user={child}
              level={level + 1}
              isAdmin={isAdmin}
              currentUser={currentUser}
              allUsers={allUsers}
              allCases={allCases}
              onAddCustomer={onAddCustomer}
              isMobile={isMobile}
              payoutMap={payoutMap}
              visibleKeys={visibleKeys}
              onReorder={onReorder}
              isFirst={idx === 0}
              isLast={idx === children.length - 1}
              highlightedCaseId={highlightedCaseId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 横方向ツリー（家系図/組織図スタイル）: 親から水平線で分岐し、各子ノードへ縦線で接続する
const HorizontalTreeNode = ({ user, isAdmin, currentUser, allUsers, allCases, onAddCustomer, payoutMap, visibleKeys, isMobile }: {
  user: User;
  isAdmin: boolean;
  currentUser: User;
  allUsers: User[];
  allCases: Case[];
  onAddCustomer: (userId: string) => void;
  payoutMap: PayoutMap;
  visibleKeys: Set<string> | null;
  isMobile?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();

  const children = useMemo(() => getTreeChildren(user, allCases, allUsers), [user.id, allCases, allUsers]);
  const isSelf = currentUser.id === user.id;
  const associatedCase = useMemo(() => getAssociatedCase(user, allCases), [user.loginId, allCases]);

  const displayName = [associatedCase?.repLastName, associatedCase?.repFirstName].filter(Boolean).join(' ') || user.name || associatedCase?.companyName;
  const payoutSummary = canViewPayoutOf(user, visibleKeys) ? getPayoutForUser(user, payoutMap) : undefined;

  return (
    <li>
      <div
        className={`htree-node ${isSelf ? 'htree-node-self' : ''}`}
        onClick={() => associatedCase && navigate(`/cases/${associatedCase.id}`)}
      >
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
          <span className="htree-node-name">{displayName}</span>
          {payoutSummary && (
            <PayoutHoverPopup
              summary={payoutSummary}
              isMobile={isMobile}
              badgeStyle={{ fontSize: '0.6rem', fontWeight: 800, color: isSelf ? 'rgba(255,255,255,0.9)' : '#16a34a', cursor: 'default' }}
            >
              ¥{payoutSummary.total.toLocaleString()}
            </PayoutHoverPopup>
          )}
        </span>
        <button
          className="htree-add"
          title="顧客追加"
          onClick={(e) => { e.stopPropagation(); onAddCustomer(user.id); }}
        >
          <i className="fa-solid fa-plus"></i>
        </button>
        {children.length > 0 && (
          <button
            className="htree-toggle"
            onClick={(e) => { e.stopPropagation(); setIsExpanded(v => !v); }}
          >
            <i className={`fa-solid ${isExpanded ? 'fa-minus' : 'fa-chevron-down'}`}></i>
          </button>
        )}
      </div>
      {isExpanded && children.length > 0 && (
        <ul>
          {children.map(child => (
            <HorizontalTreeNode
              key={child.id}
              user={child}
              isAdmin={isAdmin}
              currentUser={currentUser}
              allUsers={allUsers}
              allCases={allCases}
              onAddCustomer={onAddCustomer}
              payoutMap={payoutMap}
              visibleKeys={visibleKeys}
              isMobile={isMobile}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const HorizontalTree = ({ roots, isAdmin, currentUser, allUsers, allCases, onAddCustomer, payoutMap, visibleKeys, isMobile }: {
  roots: User[];
  isAdmin: boolean;
  currentUser: User;
  allUsers: User[];
  allCases: Case[];
  onAddCustomer: (userId: string) => void;
  payoutMap: PayoutMap;
  visibleKeys: Set<string> | null;
  isMobile?: boolean;
}) => (
  <div className="htree-wrap">
    <div className="htree">
      <ul>
        {roots.map(root => (
          <HorizontalTreeNode
            key={root.id}
            user={root}
            isAdmin={isAdmin}
            currentUser={currentUser}
            allUsers={allUsers}
            allCases={allCases}
            onAddCustomer={onAddCustomer}
            payoutMap={payoutMap}
            visibleKeys={visibleKeys}
            isMobile={isMobile}
          />
        ))}
      </ul>
    </div>
  </div>
);

const TierTreePage = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [viewMode, setViewMode] = useState<'list' | 'horizontal'>('list');
  const [batches, setBatches] = useState<RewardBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [payouts, setPayouts] = useState<RewardPayout[]>([]);
  const [rewardRows, setRewardRows] = useState<RewardRow[]>([]);

  // 新規登録モーダル用ステート
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState({
    companyName: '',
    repLastName: '',
    repFirstName: '',
    customerType: 'corporation' as 'corporation' | 'sole_proprietor',
  });
  const [scrollToCaseId, setScrollToCaseId] = useState<string | null>(null);
  const [highlightedCaseId, setHighlightedCaseId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        db.getUsers(),
        db.getAllCases(),
        db.getRewardBatches()
      ]);

      if (results[0].status === 'fulfilled') setAllUsers(results[0].value);
      if (results[1].status === 'fulfilled') setAllCases(results[1].value);
      if (results[2].status === 'fulfilled') {
        const batchList = results[2].value as RewardBatch[];
        setBatches(batchList);
        setSelectedBatchId(prev => prev || batchList[0]?.id || '');
      }

    } catch (e) {
      console.error("Failed to load tree data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 顧客追加直後、その顧客のノードまで自動でスクロールする（毎回手動で下まで
  // スクロールする手間を無くすため）。データ再読み込み後のDOM更新を待つ必要が
  // あるため requestAnimationFrame を2回はさむ。
  useEffect(() => {
    if (!scrollToCaseId) return;
    const id = scrollToCaseId;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-case-id="${id}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedCaseId(id);
        setTimeout(() => setHighlightedCaseId(prev => (prev === id ? null : prev)), 2500);
      });
    });
    setScrollToCaseId(null);
  }, [scrollToCaseId]);

  useEffect(() => {
    if (!selectedBatchId) {
      setPayouts([]);
      setRewardRows([]);
      return;
    }
    Promise.all([db.getRewardPayouts(selectedBatchId), db.getRewardRows(selectedBatchId)]).then(([p, r]) => {
      setPayouts(p);
      setRewardRows(r);
    });
  }, [selectedBatchId]);

  const payoutData = useMemo(() => buildPayoutSummaries(payouts, rewardRows), [payouts, rewardRows]);

  // 報酬の閲覧範囲:
  //   管理者・共同経営者 … 全員分（visibleKeys = null）
  //   幹部・代理店       … 自分と傘下のみ（ツリーの表示範囲とは別軸で制御する。
  //                        幹部はツリー自体は全社分を見られるが、報酬は自分の系列だけ）
  const canViewAllPayouts = user?.role === UserRole.ADMIN || user?.role === UserRole.CO_OWNER;
  const visibleKeys = useMemo(
    () => (!user || canViewAllPayouts ? null : buildVisibleRecipientKeys(user, allCases, allUsers)),
    [user, canViewAllPayouts, allCases, allUsers]
  );

  // ツリー上部のサマリー。閲覧権限のある範囲だけを積み上げる。
  const rewardSummary = useMemo(() => {
    if (!user) return null;
    const ownKeys = new Set(identifierKeys(user));
    const inScope = (key?: string | null) =>
      !!key && (visibleKeys === null || visibleKeys.has(key.toLowerCase()));

    let selfTotal = 0, selfL1 = 0, selfL2 = 0;
    let downlineTotal = 0;
    payouts.forEach(p => {
      if (p.recipientType === 'ecp' || !p.recipientUserId) return;
      const key = p.recipientUserId.toLowerCase();
      if (ownKeys.has(key)) {
        selfTotal += p.amount;
        if (p.recipientType === 'l1') selfL1 += p.amount;
        if (p.recipientType === 'l2') selfL2 += p.amount;
      } else if (inScope(key)) {
        downlineTotal += p.amount;
      }
    });

    // 傘下ショップで発生した報酬額R（分配前の元金額）。自分自身のショップ分は除く。
    let downlineRowAmount = 0, downlineShopCount = 0;
    rewardRows.forEach(r => {
      const key = (r.matchedCaseId || '').toLowerCase();
      if (!key || ownKeys.has(key) || !inScope(key)) return;
      downlineRowAmount += r.rewardAmount;
      downlineShopCount += 1;
    });

    return { selfTotal, selfL1, selfL2, downlineTotal, downlineRowAmount, downlineShopCount };
  }, [user, payouts, rewardRows, visibleKeys]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const roots = useMemo(() => {
    if (!user) return [];
    if (isAdminRole(user.role)) {
      // 幹部・共同経営者は cases に自分のレコードを持たないため、そのまま案件だけを
      // ルートにすると「幹部が紹介した案件」が親のいない最上位として横並びになってしまう。
      // スタッフ本人を人のノードとしてルートに立て、その配下に案件をぶら下げる。
      const staffRoots = allUsers.filter(u =>
        (u.role === UserRole.CO_OWNER || u.role === UserRole.EXECUTIVE) &&
        allCases.some(c => (c.referrerId || '').toLowerCase() === (u.id || '').toLowerCase())
      );
      const staffIds = staffRoots.map(u => (u.id || '').toLowerCase());

      // ECP本体(admin)を紹介者とする案件、および紹介者不在の案件が従来どおりの最上位。
      // スタッフ配下の案件はスタッフノードの子として描画するのでここでは除外する。
      const ecpIds = allUsers
        .filter(u => u.role === UserRole.ADMIN)
        .map(u => (u.id || '').toLowerCase());
      const rootCases = allCases.filter(c => {
        const refId = (c.referrerId || '').toLowerCase();
        if (staffIds.includes(refId)) return false;
        return !refId || ecpIds.includes(refId);
      });

      // 重複を避けるため、紹介者がrootCasesの中に含まれているものは除外する（本当の最上位のみを抽出）
      const caseIds = allCases.map(c => (c.id || '').toLowerCase());
      const trueRoots = rootCases.filter(c => {
        const refId = (c.referrerId || '').toLowerCase();
        // 紹介者が案件リストに存在しない（＝外部または最上位）か、紹介者が自分自身である場合
        return !refId || !caseIds.includes(refId) || refId === (c.id || '').toLowerCase();
      });

      const caseRoots = trueRoots
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(c => {
        const u = allUsers.find(usr => (usr.loginId || '').toLowerCase() === (c.id || '').toLowerCase());
        return u || ({
          id: c.id,
          loginId: c.id,
          name: [c.repLastName, c.repFirstName].filter(Boolean).join(' ') || c.companyName || '不明',
          role: UserRole.AGENCY,
          status: UserStatus.CUSTOMER,
          agencyApplicationStatus: AgencyApplicationStatus.NONE,
          email: c.email,
          createdAt: c.createdAt
        } as User);
      });

      return [...staffRoots, ...caseRoots];
    }
    // 自分自身をルートとするが、allUsersから最新の自分を探す
    const me = allUsers.find(u => (u.loginId || '').toLowerCase() === (user.loginId || '').toLowerCase());
    return me ? [me] : [user];
  }, [allUsers, allCases, user]);

  const handleAddCustomerClick = (userId: string) => {
    setSelectedReferrerId(userId);
    setShowCreateModal(true);
  };

  const handleReorderCustomer = async (caseId: string, direction: 'up' | 'down') => {
    const target = allCases.find(c => c.id === caseId);
    if (!target) return;
    const refKey = (target.referrerId || '').toLowerCase();
    const siblings = allCases
      .filter(c => (c.referrerId || '').toLowerCase() === refKey)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const idx = siblings.findIndex(c => c.id === target.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    await db.swapCaseSortOrder(target.id, target.sortOrder ?? 0, other.id, other.sortOrder ?? 0);
    await loadData();
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedReferrerId) return;
    setCreateLoading(true);
    try {
      const created = await db.createCase(newCaseForm, user, selectedReferrerId);
      if (created) {
        setShowCreateModal(false);
        setNewCaseForm({
          companyName: '',
          repLastName: '',
          repFirstName: '',
          customerType: 'corporation',
        });
        await loadData();
        setScrollToCaseId(created.id);
      }
    } catch (e: any) {
      alert("登録に失敗しました: " + e.message);
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
      </div>
    );
  }

  // 紹介者名は、ツリー表示・報酬分配と同じ優先順位（案件の代表者名 → ユーザー名 → 会社名）で解決する。
  // ここだけ user.name をそのまま使っていると、代表者名を保存する前に作成された古いユーザー
  // アカウント（name=会社名のまま）で法人名が表示されてしまう。
  const selectedReferrerUser = allUsers.find(u => u.id === selectedReferrerId);
  const selectedReferrerCase = allCases.find(c => (c.id || '').toLowerCase() === (selectedReferrerUser?.loginId || '').toLowerCase());
  const selectedReferrerName =
    [selectedReferrerCase?.repLastName, selectedReferrerCase?.repFirstName].filter(Boolean).join(' ') ||
    selectedReferrerUser?.name ||
    selectedReferrerCase?.companyName ||
    '不明';
  const isMobile = windowWidth < 768;
  const canViewEcpTotal = user.role === UserRole.ADMIN || user.role === UserRole.CO_OWNER;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '40px', textAlign: 'left', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'flex-end', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em', margin: 0 }}>
            ティアツリー <span style={{ color: 'var(--primary)' }}>.</span>
          </h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px', fontSize: isMobile ? '0.9rem' : '1.1rem' }}>
            パートナーの組織構造と顧客の状況を可視化します。
          </p>
          <Button onClick={() => handleAddCustomerClick(user.id)} style={{ marginTop: '16px' }}>
            <i className="fa-solid fa-plus" style={{ marginRight: '8px' }}></i>自分の顧客を追加
          </Button>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '10px 16px',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          fontSize: '0.7rem',
          fontWeight: 800,
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
          width: isMobile ? '100%' : 'auto',
          maxWidth: '550px',
          justifyContent: isMobile ? 'flex-start' : 'flex-end'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}><i className="fa-solid fa-user-tie"></i> 代理店</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0ea5e9' }}><i className="fa-solid fa-user-check"></i> 承認済</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}><i className="fa-solid fa-clock"></i> 申請中</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}><i className="fa-solid fa-user"></i> 顧客</div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', marginBottom: '0' }}>
        <button
          onClick={() => setViewMode('list')}
          style={{ padding: isMobile ? '10px 14px' : '14px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, fontSize: isMobile ? '0.82rem' : '0.95rem', color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: viewMode === 'list' ? '3px solid var(--primary)' : '3px solid transparent' }}
        >
          <i className="fa-solid fa-list" style={{ marginRight: '6px' }}></i>リスト表示
        </button>
        <button
          onClick={() => setViewMode('horizontal')}
          style={{ padding: isMobile ? '10px 14px' : '14px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, fontSize: isMobile ? '0.82rem' : '0.95rem', color: viewMode === 'horizontal' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: viewMode === 'horizontal' ? '3px solid var(--primary)' : '3px solid transparent' }}
        >
          <i className="fa-solid fa-sitemap" style={{ marginRight: '6px' }}></i>組織図表示
        </button>
      </div>

      {batches.length > 0 && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          borderBottom: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', padding: '14px 20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
              分配対象月
              <select
                value={selectedBatchId}
                onChange={e => setSelectedBatchId(e.target.value)}
                className="input-field"
                style={{ padding: '6px 10px', borderRadius: '8px', fontWeight: 700 }}
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.month}</option>
                ))}
              </select>
            </label>
            {canViewEcpTotal && payoutData.ecpTotal > 0 && (
              <Badge color="#4f46e5">ECP合計 ¥{payoutData.ecpTotal.toLocaleString()}</Badge>
            )}
          </div>

          {rewardSummary && (
            <div style={{
              display: 'grid',
              // 管理者・共同経営者は「代理店受取／分配対象額」、幹部・代理店は
              // 「自分の受取／傘下の受取」で、どちらも2枚
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
              gap: '12px',
              padding: '0 20px 18px'
            }}>
              {!canViewAllPayouts && (
                <SummaryTile
                  label="自分の受取合計"
                  amount={rewardSummary.selfTotal}
                  color="#16a34a"
                  note={`直紹介 ¥${rewardSummary.selfL1.toLocaleString()} / 2段目 ¥${rewardSummary.selfL2.toLocaleString()}`}
                />
              )}
              <SummaryTile
                label={canViewAllPayouts ? '代理店受取合計' : '傘下メンバーの受取合計'}
                amount={rewardSummary.downlineTotal}
                color="#0ea5e9"
              />
              {/* 分配前の元金額Rは受取額と混同されやすいため、全体を把握する管理者・
                  共同経営者にだけ出す。幹部・代理店には自分と傘下の受取額のみ表示する。 */}
              {canViewAllPayouts && (
                <SummaryTile
                  label="分配対象の報酬額"
                  amount={rewardSummary.downlineRowAmount}
                  color="var(--text-main)"
                  note={`対象ショップ ${rewardSummary.downlineShopCount}件`}
                />
              )}
            </div>
          )}
        </div>
      )}

      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '0 0 32px 32px',
        border: '1px solid var(--border)',
        borderTop: 'none',
        minHeight: '400px',
        boxShadow: 'var(--shadow-md)',
        backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch' as any
      }}>
        {roots.length > 0 ? (
          viewMode === 'list' ? (
            <div style={{ padding: isMobile ? '20px' : '48px', minWidth: '700px' }}>
              {roots.map((root, idx) => (
                <TreeNode
                  key={root.id}
                  user={root}
                  level={0}
                  isAdmin={isAdminRole(user.role)}
                  currentUser={user}
                  allUsers={allUsers}
                  allCases={allCases}
                  onAddCustomer={handleAddCustomerClick}
                  isMobile={isMobile}
                  payoutMap={payoutData.byRecipient}
                  visibleKeys={visibleKeys}
                  onReorder={handleReorderCustomer}
                  isFirst={idx === 0}
                  isLast={idx === roots.length - 1}
                  highlightedCaseId={highlightedCaseId}
                />
              ))}
            </div>
          ) : (
            <HorizontalTree
              roots={roots}
              isAdmin={isAdminRole(user.role)}
              currentUser={user}
              allUsers={allUsers}
              allCases={allCases}
              onAddCustomer={handleAddCustomerClick}
              payoutMap={payoutData.byRecipient}
              visibleKeys={visibleKeys}
              isMobile={isMobile}
            />
          )
        ) : (
          <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-sub)' }}>
            <p style={{ fontWeight: 700 }}>表示可能なデータがありません。</p>
          </div>
        )}
      </div>

      {/* 新規登録モーダル */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <Card style={{ width: '100%', maxWidth: '500px', margin: isMobile ? '0' : '16px', borderRadius: isMobile ? '24px 24px 0 0' : '24px', maxHeight: '90vh', overflowY: 'auto', padding: '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }} title="新規顧客登録">
            <div style={{ marginBottom: '24px', padding: '12px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: '4px' }}>紹介者</div>
              <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{selectedReferrerName}</div>
            </div>
            <form onSubmit={handleCreateCase}>
              <Select 
                label="顧客区分" 
                value={newCaseForm.customerType} 
                onChange={e => setNewCaseForm({...newCaseForm, customerType: e.target.value as any})}
              >
                <option value="corporation">法人</option>
                <option value="sole_proprietor">個人事業主</option>
              </Select>
              
              <Input
                label={newCaseForm.customerType === 'corporation' ? "会社名" : "屋号（任意）"}
                required={newCaseForm.customerType === 'corporation'}
                value={newCaseForm.companyName}
                onChange={e => setNewCaseForm({...newCaseForm, companyName: e.target.value})}
              />
              
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                <Input
                  label="代表者 姓"
                  required
                  value={newCaseForm.repLastName}
                  onChange={e => setNewCaseForm({...newCaseForm, repLastName: e.target.value})}
                  style={{ flex: 1 }}
                />
                <Input
                  label="代表者 名"
                  required
                  value={newCaseForm.repFirstName}
                  onChange={e => setNewCaseForm({...newCaseForm, repFirstName: e.target.value})}
                  style={{ flex: 1 }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)} style={{ flex: 1 }}>キャンセル</Button>
                <Button type="submit" disabled={createLoading} style={{ flex: 2 }}>
                  {createLoading ? <i className="fa-solid fa-spinner fa-spin"></i> : '顧客を登録する'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <style>{`
        .tree-node-hover:hover {
          transform: translateX(8px);
          box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.2) !important;
          border-color: var(--primary) !important;
        }

        .htree-wrap {
          padding: 40px 24px;
          min-width: 700px;
        }
        .htree, .htree ul {
          padding-top: 24px;
          position: relative;
          white-space: nowrap;
          text-align: center;
        }
        .htree > ul {
          padding-top: 0;
          display: inline-block;
        }
        .htree li {
          display: inline-block;
          list-style-type: none;
          position: relative;
          padding: 24px 16px 0 16px;
          vertical-align: top;
        }
        .htree li::before, .htree li::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 2px solid var(--border);
          width: 50%;
          height: 24px;
        }
        .htree li::after {
          right: auto;
          left: 50%;
          border-left: 2px solid var(--border);
        }
        .htree li:only-child::before, .htree li:only-child::after {
          display: none;
        }
        .htree li:only-child {
          padding-top: 0;
        }
        .htree li:first-child::before, .htree li:last-child::after {
          border: 0 none;
        }
        .htree li:last-child::before {
          border-right: 2px solid var(--border);
          border-radius: 0 6px 0 0;
        }
        .htree li:first-child::after {
          border-radius: 6px 0 0 0;
        }
        .htree ul ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid var(--border);
          width: 0;
          height: 24px;
        }
        .htree-node {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--border);
          background: var(--bg-main);
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-main);
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
        }
        .htree-node:hover {
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }
        .htree-node-self {
          background: var(--grad-primary, var(--primary));
          border-color: var(--primary);
          color: #fff;
          box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
        }
        .htree-add, .htree-toggle {
          border: none;
          background: rgba(127, 127, 127, 0.15);
          color: inherit;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.55rem;
          cursor: pointer;
          flex-shrink: 0;
          padding: 0;
        }
        .htree-add:hover, .htree-toggle:hover {
          background: rgba(127, 127, 127, 0.3);
        }
      `}</style>
    </div>
  );
};

export default TierTreePage;
