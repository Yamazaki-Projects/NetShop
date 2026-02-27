
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { User, UserStatus, UserRole, AgencyApplicationStatus, Case } from '../types';
import { Badge, Button, Card, Input, Select } from '../components/UI';

const TreeNode = ({ user, level, isAdmin, currentUser, allUsers, allCases, onAddCustomer }: { 
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

  // 子要素は cases テーブルの紹介関係を追う
  const children = useMemo(() => {
    const childCases = allCases.filter(c => 
      c.referrerId && 
      user.id && 
      c.referrerId.toLowerCase() === user.id.toLowerCase() && 
      c.id.toLowerCase() !== user.id.toLowerCase()
    );

    return childCases.map(c => {
      const u = allUsers.find(usr => usr.id.toLowerCase() === c.id.toLowerCase());
      if (u) return u;
      // ユーザーが見つからない場合は、案件情報から最小限のユーザーオブジェクトを作成
      return {
        id: c.id,
        loginId: c.id,
        name: c.companyName || c.repName || '不明',
        role: UserRole.AGENCY,
        status: UserStatus.CUSTOMER,
        email: c.email,
        agencyApplicationStatus: AgencyApplicationStatus.NONE,
        createdAt: c.createdAt
      } as User;
    });
  }, [user.id, allCases, allUsers]);

  const isSelf = currentUser.id === user.id;

  // 紐付く案件情報を取得（表示用）
  const associatedCase = useMemo(() => {
    return allCases.find(c => c.id.toLowerCase() === user.loginId.toLowerCase());
  }, [user.loginId, allCases]);

  const getStatusInfo = () => {
    if (user.role === UserRole.ADMIN) {
      return { label: '管理者', color: 'var(--primary)', icon: 'fa-crown', bg: 'rgba(79, 70, 229, 0.1)' };
    }
    if (user.status === UserStatus.AGENCY) {
      return { label: '代理店', color: 'var(--text-main)', icon: 'fa-user-tie', bg: 'rgba(30, 41, 59, 0.1)' };
    }
    if (user.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) {
      return { label: '承認済', color: '#0ea5e9', icon: 'fa-user-check', bg: 'rgba(14, 165, 233, 0.1)' };
    }
    if (user.agencyApplicationStatus === AgencyApplicationStatus.PENDING) {
      return { label: '申請中', color: '#f59e0b', icon: 'fa-clock', bg: 'rgba(245, 158, 11, 0.1)' };
    }
    return { label: '顧客', color: '#94a3b8', icon: 'fa-user', bg: 'var(--bg-card)' };
  };

  const info = getStatusInfo();

  return (
    <div style={{ 
      marginLeft: level === 0 ? 0 : '40px', 
      marginBottom: '12px', 
      borderLeft: level === 0 ? 'none' : '2.5px solid var(--border)', 
      paddingLeft: level === 0 ? 0 : '30px', 
      position: 'relative' 
    }}>
      {level > 0 && (
        <div style={{ position: 'absolute', left: '-2.5px', top: '24px', width: '32px', height: '2.5px', background: 'var(--border)' }}></div>
      )}

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        padding: '14px 18px', 
        background: isSelf ? 'rgba(79, 70, 229, 0.1)' : info.bg, 
        borderRadius: '16px',
        border: isSelf ? '2.5px solid var(--primary)' : `1.5px solid var(--border)`,
        boxShadow: isSelf ? '0 10px 15px -3px rgba(79, 70, 229, 0.2)' : 'var(--shadow-sm)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        zIndex: 1,
        maxWidth: '650px',
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
          color: isSelf ? 'white' : info.color,
          fontSize: '1.1rem',
          boxShadow: isSelf ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none',
          border: isSelf ? 'none' : '1px solid var(--border)'
        }}>
          <i className={`fa-solid ${associatedCase ? 'fa-briefcase' : info.icon}`}></i>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {associatedCase?.companyName || user.name}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-sub)', background: 'var(--bg-main)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
              {user.loginId.toLowerCase()}
            </span>
            {isSelf && <Badge color="var(--primary)" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>あなた</Badge>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
             <i className={`fa-solid ${info.icon}`} style={{ fontSize: '0.65rem', color: info.color }}></i>
             <span style={{ fontSize: '0.7rem', fontWeight: 800, color: info.color }}>{info.label}</span>
             {associatedCase && (
               <>
                 <span style={{ color: 'var(--border)', fontSize: '0.7rem' }}>|</span>
                 <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-sub)' }}>
                   楽天: {associatedCase.mallProgress.rakuten}
                 </span>
               </>
             )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
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
          {children.map((child) => (
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

const TierTreePage = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // 新規登録モーダル用ステート
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReferrerId, setSelectedReferrerId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState({
    companyName: '',
    repName: '',
    email: '',
    customerType: 'corporation' as 'corporation' | 'sole_proprietor',
    phone: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([
        db.getUsers(),
        db.getAllCases()
      ]);
      setAllUsers(u);
      setAllCases(c);
    } catch (e) {
      console.error("Failed to load tree data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const roots = useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.ADMIN) {
      // 管理者の場合は、casesテーブルで紹介者がいない（または自分自身が紹介者の）案件をルートとする
      const rootCases = allCases.filter(c => !c.referrerId || c.referrerId === '');
      return rootCases.map(c => {
        const u = allUsers.find(usr => usr.id.toLowerCase() === c.id.toLowerCase());
        return u || ({ 
          id: c.id, 
          loginId: c.id, 
          name: c.companyName || c.repName || '不明', 
          role: UserRole.AGENCY, 
          status: UserStatus.CUSTOMER,
          agencyApplicationStatus: AgencyApplicationStatus.NONE,
          email: c.email,
          createdAt: c.createdAt
        } as User);
      });
    }
    // 自分自身をルートとするが、allUsersから最新の自分を探す
    const me = allUsers.find(u => u.id.toLowerCase() === user.id.toLowerCase());
    return me ? [me] : [user];
  }, [allUsers, allCases, user]);

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
        setNewCaseForm({
          companyName: '',
          repName: '',
          email: '',
          customerType: 'corporation',
          phone: ''
        });
        await loadData();
        alert("顧客を登録しました。");
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

  const selectedReferrerName = allUsers.find(u => u.id === selectedReferrerId)?.name || '不明';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ marginBottom: '40px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em', margin: 0 }}>
            ティアツリー <span style={{ color: 'var(--primary)' }}>.</span>
          </h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '8px', fontSize: '1.1rem' }}>
            パートナーの組織構造と顧客の状況を可視化します。
          </p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          padding: '12px 20px', 
          background: 'var(--bg-card)', 
          borderRadius: '16px', 
          border: '1px solid var(--border)',
          fontSize: '0.7rem',
          fontWeight: 800,
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap',
          maxWidth: '550px',
          justifyContent: 'flex-end'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}><i className="fa-solid fa-user-tie"></i> 代理店</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0ea5e9' }}><i className="fa-solid fa-user-check"></i> 承認済</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}><i className="fa-solid fa-clock"></i> 申請中</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}><i className="fa-solid fa-user"></i> 顧客</div>
        </div>
      </header>

      <div style={{ 
        padding: '48px', 
        background: 'var(--bg-card)', 
        borderRadius: '32px', 
        border: '1px solid var(--border)',
        minHeight: '600px',
        boxShadow: 'var(--shadow-md)',
        backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }}>
        {roots.length > 0 ? roots.map((root) => (
          <TreeNode 
            key={root.id} 
            user={root} 
            level={0} 
            isAdmin={user.role === UserRole.ADMIN} 
            currentUser={user}
            allUsers={allUsers}
            allCases={allCases}
            onAddCustomer={handleAddCustomerClick}
          />
        )) : (
          <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-sub)' }}>
            <p style={{ fontWeight: 700 }}>表示可能なデータがありません。</p>
          </div>
        )}
      </div>

      {/* 新規登録モーダル */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <Card style={{ width: '100%', maxWidth: '500px', padding: '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }} title="新規顧客登録">
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
                label={newCaseForm.customerType === 'corporation' ? "会社名" : "屋号"} 
                required 
                value={newCaseForm.companyName} 
                onChange={e => setNewCaseForm({...newCaseForm, companyName: e.target.value})} 
              />
              
              <Input 
                label="代表者氏名" 
                required 
                value={newCaseForm.repName} 
                onChange={e => setNewCaseForm({...newCaseForm, repName: e.target.value})} 
              />
              
              <Input 
                label="メールアドレス" 
                type="email" 
                required 
                value={newCaseForm.email} 
                onChange={e => setNewCaseForm({...newCaseForm, email: e.target.value})} 
              />

              <Input 
                label="電話番号" 
                value={newCaseForm.phone} 
                onChange={e => setNewCaseForm({...newCaseForm, phone: e.target.value})} 
              />

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
      `}</style>
    </div>
  );
};

export default TierTreePage;
