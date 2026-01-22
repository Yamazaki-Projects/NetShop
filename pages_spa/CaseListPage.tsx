import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus, PlatformType } from '../types';
import { Card, Input, Select, StatusBadge, Button } from '../components/UI';
import { STATUS_LABELS } from '../constants';

const CaseListPage = () => {
  const { user } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const cases = db.getCases(user!);

  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const searchLower = search.toLowerCase();
      const matchesSearch = c.customerName.toLowerCase().includes(searchLower) || 
                           (c.companyName?.toLowerCase().includes(searchLower)) ||
                           c.agencyName.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesPlatform = platformFilter === 'all' || c.platform === platformFilter;
      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [cases, search, statusFilter, platformFilter]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-slide-in">
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '8px' }}>案件管理</h1>
          <p style={{ color: 'var(--text-sub)', fontWeight: 600 }}>
            {user?.role === 'admin' ? '全代理店から提出された案件の審査と進捗確認' : 'あなたの登録した案件および傘下代理店の案件'}
          </p>
        </div>
        {user?.role === 'agency' && (
          <Link to="/cases/new">
            <Button><i className="fa-solid fa-plus-circle"></i>新規登録</Button>
          </Link>
        )}
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
          <option value="all">すべてのPF</option>
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
                <th className="align-left" style={{ width: '30%' }}>顧客・会社情報</th>
                <th className="align-left">PF</th>
                <th className="align-left">担当代理店</th>
                <th className="align-center">ステータス</th>
                <th className="align-right">登録日</th>
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
                    <span style={{ fontWeight: 700, color: 'var(--text-sub)', fontSize: '0.85rem' }}>{c.platform}</span>
                  </td>
                  <td className="align-left">
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{c.agencyName}</span>
                  </td>
                  <td className="align-center">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="align-right">
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-sub)' }}>
                      {new Date(c.createdAt).toLocaleDateString('ja-JP')}
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
                  <td colSpan={6} style={{ padding: '80px', textAlign: 'center', color: 'var(--text-sub)' }}>
                    <p style={{ fontWeight: 700 }}>該当する案件が見つかりませんでした。</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default CaseListPage;