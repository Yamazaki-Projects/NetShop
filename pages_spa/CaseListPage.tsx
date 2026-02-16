
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus, MallOpeningStatus, Case, UserStatus, AgencyApplicationStatus, User } from '../types';
import { Card, Input, Button, Badge } from '../components/UI';

const CaseListPage = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'mine' | 'team'>('mine');
  const [search, setSearch] = useState('');
  
  const [myCases, setMyCases] = useState<Case[]>([]);
  const [teamCases, setTeamCases] = useState<Case[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      const [m, t, u] = await Promise.all([db.getCases(user), db.getTeamCases(user), db.getUsers()]);
      setMyCases(m);
      setTeamCases(t);
      setAllUsers(u);
      setLoading(false);
    };
    loadData();
  }, [user]);

  const renderStatusBadge = (email: string) => {
    const u = allUsers.find(x => x.email === email);
    if (!u) return <Badge color="#94a3b8">顧客</Badge>;
    if (u.status === UserStatus.AGENCY) return <Badge color="#10b981">代理店</Badge>;
    if (u.agencyApplicationStatus === AgencyApplicationStatus.APPROVED) return <Badge color="#0ea5e9">承認済</Badge>;
    if (u.agencyApplicationStatus === AgencyApplicationStatus.PENDING) return <Badge color="#f59e0b">申請中</Badge>;
    return <Badge color="#94a3b8">未申請</Badge>;
  };

  const filteredCases = useMemo(() => {
    const cases = activeTab === 'mine' ? myCases : teamCases;
    return cases.filter(c => (c.customerName || '').toLowerCase().includes(search.toLowerCase()) || (c.companyName || '').toLowerCase().includes(search.toLowerCase()));
  }, [activeTab, myCases, teamCases, search]);

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>顧客管理</h1>
        <Button onClick={() => {}}>+ 新規顧客登録</Button>
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
          <div style={{ padding: '64px', textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th className="align-left">顧客名 / ID</th>
                  <th className="align-center">楽天市場</th>
                  <th className="align-center">代理店状況</th>
                  <th className="align-right">最終更新</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map(c => (
                  <tr key={c.id} onClick={() => navigate(`/cases/${c.id}`)} style={{ cursor: 'pointer' }}>
                    <td className="align-left">
                      <div style={{ fontWeight: 800 }}>{c.customerName}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>{c.id}</div>
                    </td>
                    <td className="align-center">
                      <Badge color={c.mallProgress.rakuten === MallOpeningStatus.OPENED ? '#10b981' : '#94a3b8'}>{c.mallProgress.rakuten}</Badge>
                    </td>
                    <td className="align-center">{renderStatusBadge(c.email)}</td>
                    <td className="align-right" style={{ color: 'var(--text-sub)', fontWeight: 700 }}>{new Date(c.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CaseListPage;
