
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus, PlatformType, MallOpeningStatus } from '../types';
import { Card, Input, Select, StatusBadge, Button, Badge } from '../components/UI';
import { STATUS_LABELS } from '../constants';

type SortKey = 'customerName' | 'updatedAt' | 'agencyName' | 'status';

const CaseListPage = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'updatedAt', direction: 'desc' });
  
  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    customerType: 'corporation' as 'corporation' | 'sole_proprietor',
    corporateNumber: '',
    customerName: '',
    companyName: '',
    repBirthday: '',
    repZipCode: '',
    repAddress: '',
    zipCode: '', // 法人郵便番号
    address: '', // 法人住所
    email: '',
    phone: '',
    notes: ''
  });

  const cases = db.getCases(user!);

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredCases = useMemo(() => {
    let result = cases.filter(c => {
      const searchLower = search.toLowerCase();
      const matchesSearch = (c.customerName || '').toLowerCase().includes(searchLower) || 
                           (c.companyName?.toLowerCase().includes(searchLower)) ||
                           (c.agencyName || '').toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesPlatform = platformFilter === 'all' || c.platform === platformFilter;
      return matchesSearch && matchesStatus && matchesPlatform;
    });

    result.sort((a, b) => {
      let valA: any = a[sortConfig.key];
      let valB: any = b[sortConfig.key];
      if (sortConfig.key === 'updatedAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [cases, search, statusFilter, platformFilter, sortConfig]);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortConfig.key !== k) return <i className="fa-solid fa-sort" style={{ marginLeft: '8px', opacity: 0.3 }}></i>;
    return sortConfig.direction === 'asc' 
      ? <i className="fa-solid fa-sort-up" style={{ marginLeft: '8px', color: 'var(--primary)' }}></i>
      : <i className="fa-solid fa-sort-down" style={{ marginLeft: '8px', color: 'var(--primary)' }}></i>;
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // ハイフンを除去するクレンジング処理
    const cleanedData = {
      ...formData,
      repZipCode: formData.repZipCode.replace(/-/g, ''),
      zipCode: formData.zipCode.replace(/-/g, ''),
      phone: formData.phone.replace(/-/g, ''),
      corporateNumber: formData.corporateNumber.replace(/-/g, ''),
    };

    const newCaseData: any = {
      ...cleanedData,
      platform: PlatformType.RAKUTEN,
      agencyId: user.agencyId || 'ag1',
      agencyName: user.role === 'admin' ? '本部直轄' : (db.getAgencies().find(a => a.id === user.agencyId)?.name || '不明な代理店'),
      status: CaseStatus.SUBMITTED,
      subline: { status: 'pending' },
      emailJp: { status: 'pending' },
    };

    db.createCase(newCaseData, user);
    setShowCreateModal(false);
    resetForm();
    navigate(0);
  };

  const resetForm = () => {
    setFormData({
      customerType: 'corporation',
      corporateNumber: '',
      customerName: '',
      companyName: '',
      repBirthday: '',
      repZipCode: '',
      repAddress: '',
      zipCode: '',
      address: '',
      email: '',
      phone: '',
      notes: ''
    });
  };

  const SectionHeader = ({ icon, title }: { icon: string, title: string }) => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      fontSize: '0.8rem', 
      fontWeight: 800, 
      color: 'var(--accent)', 
      marginTop: '32px', 
      marginBottom: '16px',
      paddingBottom: '8px',
      borderBottom: '1px solid var(--border)' 
    }}>
      <i className={`fa-solid ${icon}`}></i> {title}
    </div>
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-0.02em' }}>案件管理</h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600 }}>インフラ取得と3大モールの開店進捗を一元管理。</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} style={{ padding: '14px 28px', fontSize: '1rem' }}>
          <i className="fa-solid fa-plus"></i> 新規案件作成
        </Button>
      </header>

      {/* Search & Filter Bar */}
      <div style={{ 
        background: 'var(--bg-card)', 
        padding: '28px', 
        borderRadius: '20px', 
        border: '1px solid var(--border)', 
        marginBottom: '32px',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gap: '20px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <Input 
          placeholder="顧客名、会社名、代理店名で検索..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 0 }}
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ marginBottom: 0 }}>
          <option value="all">すべてのステータス</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
        <Select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} style={{ marginBottom: 0 }}>
          <option value="all">主要プラットフォーム</option>
          {Object.values(PlatformType).map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
      </div>

      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th className="align-left" style={{ width: '20%', cursor: 'pointer' }} onClick={() => handleSort('customerName')}>
                  顧客情報 <SortIcon k="customerName" />
                </th>
                <th className="align-left">モール開店進捗</th>
                <th className="align-left" style={{ cursor: 'pointer' }} onClick={() => handleSort('agencyName')}>
                  担当代理店 <SortIcon k="agencyName" />
                </th>
                <th className="align-center" style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                  全体状況 <SortIcon k="status" />
                </th>
                <th className="align-right" style={{ cursor: 'pointer' }} onClick={() => handleSort('updatedAt')}>
                  最終更新 <SortIcon k="updatedAt" />
                </th>
                <th style={{ width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map(c => (
                <tr key={c.id}>
                  <td className="align-left">
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>{c.customerName || '---'}</div>
                    {c.companyName && <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 600, marginTop: '2px' }}>{c.companyName}</div>}
                  </td>
                  <td className="align-left">
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span title="楽天" style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, background: '#bf0000', color: 'white' }}>R: {c.mallProgress.rakuten}</span>
                      <span title="Yahoo" style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, background: '#ff0033', color: 'white' }}>Y: {c.mallProgress.yahoo}</span>
                      <span title="auPAY" style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, background: '#f58220', color: 'white' }}>A: {c.mallProgress.aupay}</span>
                    </div>
                  </td>
                  <td className="align-left">
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{c.agencyName}</span>
                  </td>
                  <td className="align-center">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="align-right">
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-sub)' }}>
                      {new Date(c.updatedAt).toLocaleDateString('ja-JP')}
                    </span>
                  </td>
                  <td className="align-right">
                    <Link to={`/cases/${c.id}`}>
                      <Button variant="ghost" style={{ padding: '8px 12px' }}>
                        <i className="fa-solid fa-chevron-right"></i>
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-sub)' }}>
                    案件が見つかりませんでした。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Creation Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }} onClick={() => setShowCreateModal(false)}>
          <div style={{
            width: '100%',
            maxWidth: '720px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'var(--bg-card)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>新規案件作成</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer', fontSize: '1.25rem' }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleCreateCase} style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <Select label="顧客種別" value={formData.customerType} onChange={e => setFormData({...formData, customerType: e.target.value as any})}>
                  <option value="corporation">法人</option>
                  <option value="sole_proprietor">個人事業主</option>
                </Select>
                {formData.customerType === 'corporation' && (
                  <Input label="法人番号" value={formData.corporateNumber} onChange={e => setFormData({...formData, corporateNumber: e.target.value})} placeholder="13桁の番号 (ハイフンなし)" />
                )}
              </div>

              {/* 代表者情報セクション */}
              <SectionHeader icon="fa-user-tie" title="代表者情報" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <Input label="代表者名" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} placeholder="例: 田中 太郎" />
                <Input label="生年月日" type="date" value={formData.repBirthday} onChange={e => setFormData({...formData, repBirthday: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '24px' }}>
                <Input label="郵便番号 (代表者)" value={formData.repZipCode} onChange={e => setFormData({...formData, repZipCode: e.target.value})} placeholder="1234567 (ハイフンなし)" />
                <Input label="代表者住所" value={formData.repAddress} onChange={e => setFormData({...formData, repAddress: e.target.value})} placeholder="東京都渋谷区... (アパート名まで)" />
              </div>

              {/* 法人/屋号情報セクション */}
              <SectionHeader icon="fa-building" title="法人 / 屋号情報" />
              <Input label="法人名 / 屋号" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="例: 株式会社サンプル / サンプル商店" />
              
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '24px' }}>
                <Input label="郵便番号 (法人)" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} placeholder="1234567 (ハイフンなし)" />
                <Input label="法人住所" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="東京都新宿区... (ビル・階数まで)" />
              </div>

              {/* 連絡先セクション */}
              <SectionHeader icon="fa-address-book" title="連絡先・その他" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <Input label="メールアドレス" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="example@test.com" />
                <Input label="携帯電話番号" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="09012345678 (ハイフンなし)" />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.875rem', fontWeight: 800 }}>備考</label>
                <textarea 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="input-field"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="特記事項があれば入力してください"
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)} style={{ flex: 1 }}>キャンセル</Button>
                <Button type="submit" style={{ flex: 2 }}>情報を保存して案件を作成</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseListPage;
