
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus, PlatformType, MallOpeningStatus, Case, UserStatus, AgencyApplicationStatus, User } from '../types';
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
    // 法人情報
    companyName: '',
    companyNameKana: '',
    representativeName: '',
    representativeNameKana: '',
    corporateNumber: '',
    establishedDate: '',
    zipCode: '',
    address: '',
    // 代表者情報
    repName: '',
    repNameKana: '',
    repBirthDate: '',
    repZipCode: '',
    repAddress: '',
    phone: '',
    email: '',
    notes: ''
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

  const currentCases = activeTab === 'mine' ? myCases : teamCases;

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredCases = useMemo(() => {
    let result = currentCases.filter(c => {
      const searchLower = search.toLowerCase();
      const matchesSearch = (c.customerName || '').toLowerCase().includes(searchLower) || 
                           (c.companyName?.toLowerCase().includes(searchLower)) ||
                           (c.agencyName || '').toLowerCase().includes(searchLower);
      const matchesPlatform = platformFilter === 'all' || c.platform === platformFilter;
      return matchesSearch && matchesPlatform;
    });

    return result.sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof Case];
      let bVal: any = b[sortConfig.key as keyof Case];
      
      if (sortConfig.key === 'rakuten') aVal = a.mallProgress.rakuten;
      if (sortConfig.key === 'yahoo') aVal = a.mallProgress.yahoo;
      if (sortConfig.key === 'aupay') aVal = a.mallProgress.aupay;

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [currentCases, search, platformFilter, sortConfig, activeTab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const payload = {
      ...formData,
      customerName: formData.repName || formData.companyName,
      agencyId: user.agencyId || 'unknown',
      agencyName: user.name,
      status: CaseStatus.DRAFT,
      platform: PlatformType.RAKUTEN
    };

    const newCase = await db.createCase(payload as any, user);
    if (newCase) {
      setShowCreateModal(false);
      navigate(`/cases/${newCase.id}`);
    }
  };

  const getProgressStyle = (status: MallOpeningStatus) => {
    let color = '#94a3b8';
    let bg = '#f1f5f9';
    if (status === MallOpeningStatus.OPENED) { color = '#10b981'; bg = '#ecfdf5'; }
    else if (status === MallOpeningStatus.APPLYING) { color = '#3b82f6'; bg = '#eff6ff'; }
    else if (status === MallOpeningStatus.OVERSEAS_PREP) { color = '#f59e0b'; bg = '#fffbeb'; }
    else if (status === MallOpeningStatus.SUSPENDED) { color = '#ef4444'; bg = '#fef2f2'; }
    return { padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, color, backgroundColor: bg, display: 'inline-block', whiteSpace: 'nowrap' };
  };

  const renderCustomerStatus = (email: string) => {
    const targetUser = allUsers.find(u => u.email === email);
    if (!targetUser) return null;
    if (targetUser.status === UserStatus.AGENCY) return <Badge color="var(--primary)">代理店</Badge>;
    if (targetUser.agencyApplicationStatus === AgencyApplicationStatus.PENDING) return <Badge color="#f59e0b">申請中</Badge>;
    if (targetUser.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) return <Badge color="#0ea5e9">承認済</Badge>;
    return <Badge color="#94a3b8">顧客</Badge>;
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
            案件管理 <span style={{ color: 'var(--primary)' }}>.</span>
          </h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600, marginTop: '4px' }}>案件の新規登録とステータス管理を行います。</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <i className="fa-solid fa-plus"></i> 新規案件登録
        </Button>
      </header>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '32px' }}>
        <button onClick={() => setActiveTab('mine')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, color: activeTab === 'mine' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'mine' ? '3px solid var(--primary)' : '3px solid transparent', transition: 'all 0.2s', marginBottom: '-2px' }}>
          自分の案件 ({myCases.length})
        </button>
        <button onClick={() => setActiveTab('team')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, color: activeTab === 'team' ? 'var(--accent)' : 'var(--text-sub)', borderBottom: activeTab === 'team' ? '3px solid var(--accent)' : '3px solid transparent', transition: 'all 0.2s', marginBottom: '-2px' }}>
          チームの案件 ({teamCases.length})
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <Input placeholder="顧客名・会社名で検索..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 0 }} />
        <Select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} style={{ marginBottom: 0 }}>
          <option value="all">すべてのプラットフォーム</option>
          {Object.values(PlatformType).map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>読み込み中...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th className="align-left" onClick={() => handleSort('customerName')} style={{ cursor: 'pointer' }}>顧客名 {sortConfig.key === 'customerName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  {activeTab === 'team' && <th className="align-left">担当代理店</th>}
                  <th className="align-center">楽天市場</th>
                  <th className="align-center">Yahoo!</th>
                  <th className="align-center">au PAY</th>
                  <th className="align-right" onClick={() => handleSort('updatedAt')} style={{ cursor: 'pointer' }}>更新日 {sortConfig.key === 'updatedAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map(c => (
                  <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} style={{ cursor: 'pointer' }}>
                    <td className="align-left">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontWeight: 800 }}>{c.customerName}</div>
                        {renderCustomerStatus(c.email)}
                      </div>
                    </td>
                    {activeTab === 'team' && <td className="align-left"><span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{c.agencyName}</span></td>}
                    <td className="align-center"><span style={getProgressStyle(c.mallProgress.rakuten)}>{c.mallProgress.rakuten}</span></td>
                    <td className="align-center"><span style={getProgressStyle(c.mallProgress.yahoo)}>{c.mallProgress.yahoo}</span></td>
                    <td className="align-center"><span style={getProgressStyle(c.mallProgress.aupay)}>{c.mallProgress.aupay}</span></td>
                    <td className="align-right">{new Date(c.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setShowCreateModal(false)}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '24px', padding: '40px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '32px' }}>新規案件登録</h2>
            
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '2px solid var(--primary)', paddingBottom: '8px', marginBottom: '20px', color: 'var(--primary)' }}>基本設定</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <Select label="顧客種別" value={formData.customerType} onChange={e => setFormData({...formData, customerType: e.target.value as any})}>
                    <option value="corporation">法人</option>
                    <option value="sole_proprietor">個人事業主</option>
                  </Select>
                  <Input label="メールアドレス" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required placeholder="yamada@example.com" />
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '2px solid var(--border)', paddingBottom: '8px', marginBottom: '20px' }}>法人情報</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <Input label="法人名/屋号" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} required />
                  <Input label="法人名/屋号ふりがな" value={formData.companyNameKana} onChange={e => setFormData({...formData, companyNameKana: e.target.value})} required />
                  <Input label="代表者名" value={formData.representativeName} onChange={e => setFormData({...formData, representativeName: e.target.value})} required />
                  <Input label="代表者名ふりがな" value={formData.representativeNameKana} onChange={e => setFormData({...formData, representativeNameKana: e.target.value})} required />
                  <Input label="法人番号 (13桁)" value={formData.corporateNumber} onChange={e => setFormData({...formData, corporateNumber: e.target.value})} maxLength={13} />
                  <Input label="設立年月日" type="date" value={formData.establishedDate} onChange={e => setFormData({...formData, establishedDate: e.target.value})} />
                  <Input label="法人郵便番号 (ハイフンなし)" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} maxLength={7} />
                  <Input label="法人住所" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '2px solid var(--border)', paddingBottom: '8px', marginBottom: '20px' }}>代表者情報 (個人)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <Input label="名前" value={formData.repName} onChange={e => setFormData({...formData, repName: e.target.value})} required />
                  <Input label="名前ふりがな" value={formData.repNameKana} onChange={e => setFormData({...formData, repNameKana: e.target.value})} required />
                  <Input label="生年月日" type="date" value={formData.repBirthDate} onChange={e => setFormData({...formData, repBirthDate: e.target.value})} />
                  <Input label="代表者郵便番号 (ハイフンなし)" value={formData.repZipCode} onChange={e => setFormData({...formData, repZipCode: e.target.value})} maxLength={7} />
                  <Input label="代表者住所" value={formData.repAddress} onChange={e => setFormData({...formData, repAddress: e.target.value})} />
                  <Input label="携帯電話番号 (ハイフンなし)" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required maxLength={11} />
                </div>
              </div>
              
              <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>キャンセル</Button>
                <Button type="submit">案件を登録する</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseListPage;
