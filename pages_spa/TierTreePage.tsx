import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { User, UserStatus, UserRole, AgencyApplicationStatus, Case } from '../types';
import { Badge, Button, Card, Input, Select, AgencyStatusBadge } from '../components/UI';

// ─── ツリーノード ────────────────────────────────────────────────────────────

const TreeNode = ({
  user, level, isAdmin, currentUser, allUsers, allCases, onAddCustomer
}: {
  user: User;
  level: number;
  isAdmin: boolean;
  currentUser: User;
  allUsers: User[];
  allCases: Case[];
  onAddCustomer: (userId: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const navigate = useNavigate();

  // 直接の子（referrerId === this user's id）
  const children = useMemo(() =>
    allUsers.filter(u =>
      u.referrerId === user.id && u.id !== user.id
    ),
    [user.id, allUsers]
  );

  const isSelf = currentUser.id === user.id;
  const isEC = user.role === UserRole.ADMIN;

  // 紐付く案件（代理店申請・進捗確認用）
  const associatedCase = useMemo(() =>
    allCases.find(c => c.referrerId === user.id || c.agencyId === user.id),
    [user.id, allCases]
  );

  // 自分が紹介した案件（自分のすぐ下の顧客案件）
  const myReferredCase = useMemo(() =>
    allCases.find(c =>
      (c.agencyId === user.id || c.agencyId === user.loginId)
    ),
    [user.id, user.loginId, allCases]
  );

  const getIcon = () => {
    if (isEC) return 'fa-building';
    if (user.status === UserStatus.AGENCY) return 'fa-user-tie';
    if (user.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) return 'fa-user-check';
    if (user.agencyApplicationStatus === AgencyApplicationStatus.PENDING) return 'fa-clock';
    return 'fa-user';
  };

  const nodeColor = isEC
    ? 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)'
    : isSelf
    ? 'var(--grad-primary)'
    : user.status === UserStatus.AGENCY
    ? 'linear-gradient(135deg, #065f46 0%, #059669 100%)'
    : user.agencyApplicationStatus === AgencyApplicationStatus.PENDING
    ? 'linear-gradient(135deg, #92400e 0%, #d97706 100%)'
    : 'linear-gradient(135deg, #374151 0%, #6b7280 100%)';

  return (
    <div style={{
      marginLeft: level === 0 ? 0 : 40,
      marginBottom: 12,
      borderLeft: level === 0 ? 'none' : '2.5px solid var(--border)',
      paddingLeft: level === 0 ? 0 : 30,
      position: 'relative'
    }}>
      {level > 0 && (
        <div style={{ position: 'absolute', left: -2.5, top: 24, width: 32, height: 2.5, background: 'var(--border)' }} />
      )}

      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '14px 18px',
          background: isSelf ? 'rgba(79,70,229,0.1)' : isEC ? 'rgba(30,58,138,0.08)' : 'var(--bg-card)',
          borderRadius: 16,
          border: isSelf
            ? '2.5px solid var(--primary)'
            : isEC
            ? '2px solid #1d4ed8'
            : '1.5px solid var(--border)',
          boxShadow: isSelf ? '0 10px 15px -3px rgba(79,70,229,0.2)' : 'var(--shadow-sm)',
          transition: 'all 0.2s',
          maxWidth: 680,
          cursor: myReferredCase ? 'pointer' : 'default'
        }}
        className="tree-node-hover"
        onClick={() => myReferredCase && navigate(`/cases/${myReferredCase.id}`)}
      >
        {/* 展開ボタン */}
        <div
          onClick={e => { e.stopPropagation(); if (children.length > 0) setIsExpanded(!isExpanded); }}
          style={{
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: children.length > 0 ? 'pointer' : 'default',
            color: children.length > 0 ? 'var(--primary)' : 'var(--text-sub)',
            background: 'var(--bg-main)', borderRadius: 8, border: '1.5px solid var(--border)'
          }}
        >
          {children.length > 0
            ? <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ fontSize: '0.7rem' }} />
            : <div style={{ width: 4, height: 4, background: 'var(--text-sub)', borderRadius: '50%', opacity: 0.3 }} />
          }
        </div>

        {/* アイコン */}
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: nodeColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '1.1rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <i className={`fa-solid ${getIcon()}`} />
        </div>

        {/* 情報 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </span>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, color: isEC ? '#1d4ed8' : 'var(--text-sub)',
              background: 'var(--bg-main)', padding: '1px 6px', borderRadius: 4,
              border: `1px solid ${isEC ? '#93c5fd' : 'var(--border)'}`, whiteSpace: 'nowrap'
            }}>
              {user.loginId}
            </span>
            {isSelf && <Badge color="var(--primary)" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>あなた</Badge>}
            {isEC && <Badge color="#1d4ed8" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>ECパートナーズ</Badge>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            {!isEC && <AgencyStatusBadge user={user} />}
            {myReferredCase && (
              <>
                <span style={{ color: 'var(--border)', fontSize: '0.7rem' }}>|</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-sub)' }}>
                  楽天: {myReferredCase.mallProgress?.rakuten ?? '－'}
                </span>
              </>
            )}
            <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>
              直紹介: {children.length}名
            </span>
          </div>
        </div>

        {/* ボタン */}
        {!isEC && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="ghost"
              onClick={e => { e.stopPropagation(); onAddCustomer(user.id); }}
              style={{ padding: '6px 12px', fontSize: '0.7rem', fontWeight: 800, border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg-main)', color: 'var(--primary)' }}
            >
              <i className="fa-solid fa-plus" /> 顧客追加
            </Button>
            {(isAdmin || isSelf) && myReferredCase && (
              <Button
                variant="ghost"
                onClick={e => { e.stopPropagation(); navigate(`/cases/${myReferredCase.id}`); }}
                style={{ padding: '6px 12px', fontSize: '0.7rem', fontWeight: 800, border: '1.5px solid var(--border)', borderRadius: 10, background: 'var(--bg-main)' }}
              >
                詳細
              </Button>
            )}
          </div>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {children.map(child => (
            <TreeNode
              key={child.id}
              user={child}
              level={level + 1}
              isAdmin={isAdmin}
              currentUser={currentUser}
              allUsers={allUsers}
              allCases={allCases}
              onAddCustomer={onAddCustomer}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── メインページ ────────────────────────────────────────────────────────────

const TierTreePage = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState({
    companyName: '', repLastName: '', repFirstName: '',
    email: '', customerType: 'corporation' as 'corporation' | 'sole_proprietor', phone: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [users, cases] = await Promise.all([db.getUsers(), db.getAllCases()]);
      setAllUsers(users);
      setAllCases(cases);
    } catch (e) {
      console.error('Failed to load tree data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ルートノードを決定
  const roots = useMemo(() => {
    if (!user) return [];

    if (user.role === UserRole.ADMIN) {
      // 管理者：ECパートナーズスタッフ全員をルートとして表示
      return allUsers.filter(u => u.role === UserRole.ADMIN);
    }

    // 代理店：自分自身をルートとし、配下のみ表示
    // allUsersを自分の配下に絞り込む（フィルタリングはTreeNode側のchildren計算で自動的に機能）
    const me = allUsers.find(u => u.id === user.id) ?? user;
    return [me];
  }, [allUsers, user]);

  // 代理店ログイン時は自分の配下ユーザーのみ渡す
  const visibleUsers = useMemo(() => {
    if (!user || user.role === UserRole.ADMIN) return allUsers;

    // BFS/DFSで配下ユーザーを収集
    const collect = (userId: string): User[] => {
      const directChildren = allUsers.filter(u => u.referrerId === userId);
      return [
        ...directChildren,
        ...directChildren.flatMap(c => collect(c.id))
      ];
    };
    const me = allUsers.find(u => u.id === user.id) ?? user;
    return [me, ...collect(user.id)];
  }, [allUsers, user]);

  const handleAddCustomerClick = (userId: string) => {
    setSelectedReferrerId(userId);
    setShowCreateModal(true);
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedReferrerId) return;
    setCreateLoading(true);
    try {
      const created = await db.createCase(newCaseForm, user, selectedReferrerId);
      if (created) {
        setShowCreateModal(false);
        setNewCaseForm({ companyName: '', repLastName: '', repFirstName: '', email: '', customerType: 'corporation', phone: '' });
        await loadData();
        alert('顧客を登録しました。');
      }
    } catch (e: any) {
      alert('登録に失敗しました: ' + e.message);
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  const selectedReferrerName = allUsers.find(u => u.id === selectedReferrerId)?.name ?? '不明';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em', margin: 0 }}>
            ティアツリー <span style={{ color: 'var(--primary)' }}>.</span>
          </h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: 8, fontSize: '1.1rem' }}>
            {user.role === UserRole.ADMIN
              ? '全代理店・顧客の組織構造を可視化します。'
              : '自分の配下の組織構造を確認できます。'}
          </p>
        </div>

        {/* 凡例 */}
        <div style={{
          display: 'flex', gap: 12, padding: '12px 20px',
          background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)',
          fontSize: '0.7rem', fontWeight: 800, boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap', maxWidth: 580, justifyContent: 'flex-end'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1d4ed8' }}><i className="fa-solid fa-building" /> ECパートナーズ</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669' }}><i className="fa-solid fa-user-tie" /> 代理店</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0ea5e9' }}><i className="fa-solid fa-user-check" /> 承認済</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706' }}><i className="fa-solid fa-clock" /> 申請中</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280' }}><i className="fa-solid fa-user" /> 顧客</div>
        </div>
      </header>

      <div style={{
        padding: 48, background: 'var(--bg-card)', borderRadius: 32,
        border: '1px solid var(--border)', minHeight: 600, boxShadow: 'var(--shadow-md)',
        backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '30px 30px'
      }}>
        {roots.length > 0 ? roots.map(root => (
          <TreeNode
            key={root.id}
            user={root}
            level={0}
            isAdmin={user.role === UserRole.ADMIN}
            currentUser={user}
            allUsers={visibleUsers}
            allCases={allCases}
            onAddCustomer={handleAddCustomerClick}
          />
        )) : (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-sub)' }}>
            <p style={{ fontWeight: 700 }}>表示可能なデータがありません。</p>
          </div>
        )}
      </div>

      {/* 顧客追加モーダル */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <Card style={{ width: '100%', maxWidth: 500, padding: 40, boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }} title="新規顧客登録">
            <div style={{ marginBottom: 24, padding: 12, background: 'var(--bg-main)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: 4 }}>紹介者</div>
              <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{selectedReferrerName}</div>
            </div>
            <form onSubmit={handleCreateCase}>
              <Select label="顧客区分" value={newCaseForm.customerType} onChange={e => setNewCaseForm({ ...newCaseForm, customerType: e.target.value as any })}>
                <option value="corporation">法人</option>
                <option value="sole_proprietor">個人事業主</option>
              </Select>
              <Input label={newCaseForm.customerType === 'corporation' ? '会社名' : '屋号'} required value={newCaseForm.companyName} onChange={e => setNewCaseForm({ ...newCaseForm, companyName: e.target.value })} />
              <div style={{ display: 'flex', gap: 12 }}>
                <Input label="代表者 姓" required value={newCaseForm.repLastName} onChange={e => setNewCaseForm({ ...newCaseForm, repLastName: e.target.value })} style={{ flex: 1 }} />
                <Input label="代表者 名" required value={newCaseForm.repFirstName} onChange={e => setNewCaseForm({ ...newCaseForm, repFirstName: e.target.value })} style={{ flex: 1 }} />
              </div>
              <Input label="メールアドレス" type="email" required value={newCaseForm.email} onChange={e => setNewCaseForm({ ...newCaseForm, email: e.target.value })} />
              <Input label="電話番号" value={newCaseForm.phone} onChange={e => setNewCaseForm({ ...newCaseForm, phone: e.target.value })} />
              <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)} style={{ flex: 1 }}>キャンセル</Button>
                <Button type="submit" disabled={createLoading} style={{ flex: 2 }}>
                  {createLoading ? <i className="fa-solid fa-spinner fa-spin" /> : '顧客を登録する'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <style>{`
        .tree-node-hover:hover {
          transform: translateX(8px);
          box-shadow: 0 15px 30px -5px rgba(0,0,0,0.2) !important;
          border-color: var(--primary) !important;
        }
      `}</style>
    </div>
  );
};

export default TierTreePage;
