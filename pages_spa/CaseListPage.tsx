
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus, PlatformType } from '../types';
import { Card, Input, Select, StatusBadge, Button, Badge } from '../components/UI';
import { STATUS_LABELS } from '../constants';

type SortKey = 'customerName' | 'updatedAt' | 'agencyName' | 'status';

const CaseListPage = () => {
  const { user } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'updatedAt', direction: 'desc' });

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
      const matchesSearch = c.customerName.toLowerCase().includes(searchLower) || 
                           (c.companyName?.toLowerCase().includes(searchLower)) ||
                           c.agencyName.toLowerCase().includes(searchLower);
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

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-0.02em' }}>案件管理</h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600 }}>インフラ取得と3大モールの開店進捗を一元管理。</p>
        </div>
      </header>

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
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>{c.customerName}</div>
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
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CaseListPage;
