
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus, MallOpeningStatus, Case, UserStatus, AgencyApplicationStatus, User } from '../types';
import { Card, Input, Button, Badge, Select, AgencyStatusBadge } from '../components/UI';

const CaseListPage = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'mine' | 'team'>('mine');
  const [search, setSearch] = useState('');
  
  const [myCases, setMyCases] = useState<Case[]>([]);
  const [teamCases, setTeamCases] = useState<Case[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // 新規登録モーダル用ステート
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState({
    companyName: '',
    repLastName: '',
    repFirstName: '',
    email: '',
    customerType: 'corporation' as 'corporation' | 'sole_proprietor',
    phone: ''
  });

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 個別のフェッチが失敗しても他のデータが表示されるように Promise.allSettled を使用
      const results = await Promise.allSettled([
        db.getCases(user), 
        db.getTeamCases(user), 
        db.getUsers()
      ]);

      if (results[0].status === 'fulfilled') setMyCases(results[0].value);
      if (results[1].status === 'fulfilled') setTeamCases(results[1].value);
      if (results[2].status === 'fulfilled') setAllUsers(results[2].value);
      
    } catch (e) {
      console.error("Failed to load cases", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const filteredCases = useMemo(() => {
    const cases = activeTab === 'mine' ? myCases : teamCases;
    return cases.filter(c => 
      (c.customerName || '').toLowerCase().includes(search.toLowerCase()) || 
      (c.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.id || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [activeTab, myCases, teamCases, search]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setCreateLoading(true);
    try {
      const created = await db.createCase(newCaseForm, user);
      if (created) {
        setShowCreateModal(false);
        navigate(`/cases/${created.id}`);
      }
    } catch (e: any) {
      // alert ではなく、より詳細なエラーメッセージを表示するように修正
      console.error("Case creation failed:", e);
      alert(e.message || "登録に失敗しました。");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>顧客管理</h1>
        <Button onClick={() => setShowCreateModal(true)}>+ 新規顧客登録</Button>
      </header>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border)', marginBottom: '32px' }}>
        <button onClick={() => setActiveTab('mine')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'mine' ? 'var(--primary)' : 'var(--text-sub)', borderBottom: activeTab === 'mine' ? '3px solid var(--primary)' : '3px solid transparent' }}>直紹介</button>
        <button onClick={() => setActiveTab('team')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, color: activeTab === 'team' ? 'var(--accent)' : 'var(--text-sub)', borderBottom: activeTab === 'team' ? '3px solid var(--accent)' : '3px solid transparent' }}>チーム紹介</button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Input placeholder="名前、会社名、顧客IDで検索..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin fa-2x"></i></div>
        ) : filteredCases.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-sub)', fontWeight: 700 }}>表示可能な案件がありません。</div>
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
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>{(c.id || '').toLowerCase()}</div>
                    </td>
                    <td className="align-center">
                      <Badge color={c.mallProgress.rakuten === MallOpeningStatus.OPENED ? '#10b981' : '#94a3b8'}>{c.mallProgress.rakuten}</Badge>
                    </td>
                    <td className="align-center">
                      <AgencyStatusBadge caseId={c.id} email={c.email} allUsers={allUsers} />
                    </td>
                    <td className="align-right" style={{ color: 'var(--text-sub)', fontWeight: 700 }}>
                      {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 新規登録モーダル */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <Card style={{ width: '100%', maxWidth: '500px', padding: '40px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }} title="新規顧客登録">
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
              
              <div style={{ display: 'flex', gap: '12px' }}>
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
    </div>
  );
};

export default CaseListPage;
