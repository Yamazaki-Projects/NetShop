
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
  const [platformFilter, setPlatformFilter] = useState<string>('all');
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
      const [m, t, u] = await Promise.all([
        db.getCases(user),
        db.getTeamCases(user),
        db.getUsers()
      ]);
      setMyCases(m);
      setTeamCases(t);
      setAllUsers(u);
      setLoading(false);
    };
    loadData();
  }, [user]);

  const currentCases = useMemo(() => activeTab === 'mine' ? myCases : teamCases, [activeTab, myCases, teamCases]);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const filteredCases = useMemo(() => {
    let result = currentCases.filter(c => {
      const s = search.toLowerCase();
      return (c.customerName || '').toLowerCase().includes(s) || (c.companyName?.toLowerCase().includes(s));
    });
    return result.sort((a, b) => {
      let aV = a[sortConfig.key as keyof Case];
      let bV = b[sortConfig.key as keyof Case];
      if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1;
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
    if (!u) return <Badge color="#64748b">顧客</Badge>;
    if (u.status === UserStatus.AGENCY) return <Badge color="#1e293b">代理店</Badge>;
    if (u.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) return <Badge color="#0ea5e9">承認済</Badge>;
    if (u.agencyApplicationStatus === AgencyApplicationStatus.PENDING) return <Badge color="#f59e0b">申請中</Badge>;
    return <Badge color="#64748b">顧客</Badge>;
  };

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>顧客管理</h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600 }}>直紹介およびチームの顧客進捗を管理します。</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>+ 新規顧客登録</Button>
      </header>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '32px' }}>
        <button onClick={() => setActiveTab('mine')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'mine' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'mine' ? '3px solid var(--primary)' : '3px solid transparent' }}>自分の顧客</button>
        <button onClick={() => setActiveTab('team')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'team' ? 'var(--accent)' : 'var(--text-sub)', borderBottom: activeTab === 'team' ? '3px solid var(--accent)' : '3px solid transparent' }}>チームの顧客</button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Input placeholder="顧客名・会社名で検索..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        {loading ? <div style={{ padding: '48px', textAlign: 'center' }}>読み込み中...</div> : (
          <table>
            <thead>
              <tr>
                <th className="align-left">顧客名</th>
                <th className="align-center">楽天市場</th>
                <th className="align-center">Yahoo!</th>
                <th className="align-right">最終更新</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map(c => (
                <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} style={{ cursor: 'pointer' }}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{c.customerName} {renderStatusBadge(c.email)}</div></td>
                  <td className="align-center"><Badge color="#94a3b8">{c.mallProgress.rakuten}</Badge></td>
                  <td className="align-center"><Badge color="#94a3b8">{c.mallProgress.yahoo}</Badge></td>
                  <td className="align-right">{new Date(c.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCreateModal(false)}>
          <Card style={{ width: '100%', maxWidth: '600px', padding: '40px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '24px' }}>新規顧客登録</h2>
            <form onSubmit={handleCreate}>
              <Select label="顧客種別" value={formData.customerType} onChange={e => setFormData({...formData, customerType: e.target.value as any})}>
                <option value="corporation">法人</option>
                <option value="sole_proprietor">個人事業主</option>
              </Select>
              <Input label="氏名/法人名" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value, repName: e.target.value})} required />
              <Input label="メールアドレス" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
              <Input label="電話番号" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>キャンセル</Button>
                <Button type="submit">登録する</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CaseListPage;
