
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
      const matchesSearch = c.customerName.toLowerCase().includes(search.toLowerCase()) || 
                           (c.companyName?.toLowerCase().includes(search.toLowerCase())) ||
                           c.agencyName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesPlatform = platformFilter === 'all' || c.platform === platformFilter;
      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [cases, search, statusFilter, platformFilter]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main dark:text-text-darkMain">案件一覧</h1>
          <p className="text-text-sub dark:text-text-darkSub">
            {user?.role === 'admin' ? '全代理店の案件を管理します' : '担当および傘下代理店の案件を閲覧できます'}
          </p>
        </div>
        {user?.role === 'agency' && (
          <Link to="/cases/new">
            <Button><i className="fa-solid fa-plus mr-2"></i>新規案件作成</Button>
          </Link>
        )}
      </header>

      <Card className="p-4 bg-bg-sub dark:bg-bg-darkSub border-none">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Input 
            placeholder="顧客名、会社名、代理店名で検索..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">すべてのステータス</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </Select>
          <Select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
            <option value="all">すべてのプラットフォーム</option>
            {Object.values(PlatformType).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">顧客情報</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">プラットフォーム</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">担当代理店</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-center">ステータス</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-right">登録日</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCases.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-text-main dark:text-text-darkMain">{c.customerName}</p>
                    {c.companyName && <p className="text-xs text-text-sub dark:text-text-darkSub">{c.companyName}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-text-main dark:text-text-darkMain">{c.platform}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-text-sub dark:text-text-darkSub">{c.agencyName}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-text-sub dark:text-text-darkSub">
                    {new Date(c.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/cases/${c.id}`}>
                      <Button variant="ghost" className="text-primary"><i className="fa-solid fa-eye"></i></Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-sub">案件が見つかりません</td>
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
