
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus, PlatformType, MallOpeningStatus, Case, UserStatus, AgencyApplicationStatus, User, UserRole } from '../types';
import { Card, Input, Select, Button, Badge } from '../components/UI';

type SortKey = 'customerName' | 'updatedAt' | 'agencyName' | 'rakuten' | 'yahoo' | 'aupay';
type ListTab = 'mine' | 'team';

const CaseListPage = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ListTab>('mine');
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'updatedAt', direction: 'desc' });
  
  const [myCases, setMyCases] = useState<Case[]>([]);
  const [teamCases, setTeamCases] = useState<Case[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    customerType: 'corporation' as 'corporation' | 'sole_proprietor',
    companyName: '',
    companyNameKana: '',
    repName: '',
    repNameKana: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [m, t, u] = await Promise.all([
          db.getCases(user),
          db.getTeamCases(user),
          db.getUsers()
        ]);
        setMyCases(m);
        setTeamCases(t);
        setAllUsers(u);
      } catch (err) {
        console.error("Failed to load cases", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const currentCases = useMemo(() => activeTab === 'mine' ? myCases : teamCases, [activeTab, myCases, teamCases]);

  const filteredCases = useMemo(() => {
    let result = currentCases.filter(c => {
      const s = search.toLowerCase();
      const name = (c.customerName || '').toLowerCase();
      const company = (c.companyName || '').toLowerCase();
      return name.includes(s) || company.includes(s);
    });

    return result.sort((a, b) => {
      // TypeScript error fix: Use nullish coalescing to ensure strings/numbers for comparison
      const aVal = (a[sortConfig.key as keyof Case] ?? '') as string | number;
      const bVal = (b[sortConfig.key as keyof Case] ?? '') as string | number;
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [currentCases, search, sortConfig]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const newCase = await db.createCase(formData, user);
    if (newCase) {
      setShowCreateModal(false);
      navigate(`/cases/${newCase.id}`);
    }
  };

  const renderStatusBadge = (email: string) => {
    const u = allUsers.find(x => x.email === email);
    if (!u) return <Badge color="#64748b">未登録</Badge>;
    if (u.status === UserStatus.AGENCY) return <Badge color="#1e293b">代理店</Badge>;
    if (u.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) return <Badge color="#0ea5e9">承認済</Badge>;
    if (u.agencyApplicationStatus === AgencyApplicationStatus.PENDING) return <Badge color="#f59e0b">申請中</Badge>;
    return <Badge color="#64748b">未登録</Badge>;
  };

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>顧客管理</h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600 }}>直紹介およびチームの進捗状況をリアルタイムで管理します。</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>+ 新規顧客登録</Button>
      </header>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '32px' }}>
        <button onClick={() => setActiveTab('mine')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'mine' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'mine' ? '3px solid var(--primary)' : '3px solid transparent' }}>直紹介</button>
        <button onClick={() => setActiveTab('team')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'team' ? 'var(--accent)' : 'var(--text-sub)', borderBottom: activeTab === 'team' ? '3px solid var(--accent)' : '3px solid transparent' }}>チーム紹介</button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Input placeholder="名前や会社名で検索..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-sub)' }}>
            <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
            <p style={{ marginTop: '16px', fontWeight: 700 }}>読み込み中...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-sub)' }}>
             <i className="fa-solid fa-folder-open fa-3x" style={{ opacity: 0.1, marginBottom: '20px' }}></i>
             <p style={{ fontWeight: 700 }}>該当する顧客が見つかりません。</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th className="align-left">顧客名 / 区分</th>
                  <th className="align-center">楽天市場</th>
                  <th className="align-center">Yahoo!</th>
                  <th className="align-right">更新日</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map(c => (
                  <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} style={{ cursor: 'pointer' }}>
                    <td className="align-left">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{c.customerName}</div>
                        {renderStatusBadge(c.email)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: '4px', fontWeight: 600 }}>ID: {c.id}</div>
                    </td>
                    <td className="align-center">
                      <Badge color={c.mallProgress.rakuten === MallOpeningStatus.OPENED ? '#10b981' : '#94a3b8'}>
                        {c.mallProgress.rakuten}
                      </Badge>
                    </td>
                    <td className="align-center">
                      <Badge color={c.mallProgress.yahoo === MallOpeningStatus.OPENED ? '#10b981' : '#94a3b8'}>
                        {c.mallProgress.yahoo}
                      </Badge>
                    </td>
                    <td className="align-right" style={{ color: 'var(--text-sub)', fontWeight: 700, fontSize: '0.85rem' }}>
                      {new Date(c.updatedAt).toLocaleDateString('ja-JP')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCreateModal(false)}>
          <Card style={{ width: '100%', maxWidth: '520px', padding: '40px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px', letterSpacing: '-0.02em' }}>新規顧客の追加</h2>
            <form onSubmit={handleCreate}>
              <Select label="顧客区分" value={formData.customerType} onChange={e => setFormData({...formData, customerType: e.target.value as any})}>
                <option value="corporation">法人</option>
                <option value="sole_proprietor">個人事業主</option>
              </Select>
              <Input label="氏名 または 法人名" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value, repName: e.target.value})} required placeholder="株式会社〇〇 または 姓名" />
              <Input label="メールアドレス" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required placeholder="example@domain.com" />
              <Input label="電話番号" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required placeholder="09012345678" />
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>キャンセル</Button>
                <Button type="submit">登録を完了する</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CaseListPage;
