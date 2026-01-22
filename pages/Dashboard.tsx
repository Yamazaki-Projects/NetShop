
import React from 'react';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { CaseStatus } from '../types';
import { Card, StatusBadge } from '../components/UI';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAppContext();
  if (!user) return null;

  const cases = db.getCases(user);

  const stats = {
    total: cases.length,
    pending: cases.filter(c => [CaseStatus.SUBMITTED, CaseStatus.REVIEWING].includes(c.status)).length,
    needsFix: cases.filter(c => c.status === CaseStatus.NEEDS_FIX).length,
    approved: cases.filter(c => c.status === CaseStatus.APPROVED).length,
  };

  const recentCases = [...cases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-main dark:text-text-darkMain">ダッシュボード</h1>
          <p className="text-text-sub dark:text-text-darkSub">システム全体の状況を把握します</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-400">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="総案件数" value={stats.total} icon="fa-folder" color="blue" />
        <StatCard title="審査中 / 提出済み" value={stats.pending} icon="fa-clock" color="amber" />
        <StatCard title="要修正" value={stats.needsFix} icon="fa-triangle-exclamation" color="red" />
        <StatCard title="承認済み" value={stats.approved} icon="fa-circle-check" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-main dark:text-text-darkMain">最近の更新案件</h2>
            <Link to="/cases" className="text-primary text-sm font-medium hover:underline">すべて見る</Link>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">顧客名 / 代理店</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-center">ステータス</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-right">最終更新</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentCases.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <Link to={`/cases/${c.id}`}>
                          <p className="font-bold text-text-main dark:text-text-darkMain">{c.customerName}</p>
                          <p className="text-xs text-text-sub dark:text-text-darkSub">{c.agencyName}</p>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-text-sub dark:text-text-darkSub">
                        {new Date(c.updatedAt).toLocaleDateString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                  {recentCases.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-text-sub">案件が見つかりません</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-text-main dark:text-text-darkMain">クイックアクション</h2>
          <Card className="p-6 space-y-4">
            <QuickActionButton to="/cases/new" icon="fa-plus-circle" label="新規案件作成" sub="代理店様による案件登録" />
            {user?.role === 'admin' && (
              <>
                <QuickActionButton to="/agencies" icon="fa-users" label="代理店管理" sub="承認・紹介関係の設定" />
                <QuickActionButton to="/audit-logs" icon="fa-shield-halved" label="監査ログ閲覧" sub="操作履歴の確認" />
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => {
  const colors: any = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  };
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-text-sub dark:text-text-darkSub">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <i className={`fa-solid ${icon}`}></i>
        </div>
      </div>
      <p className="text-2xl font-bold text-text-main dark:text-text-darkMain">{value}</p>
    </Card>
  );
};

const QuickActionButton = ({ to, icon, label, sub }: { to: string; icon: string; label: string; sub: string }) => (
  <Link to={to} className="flex items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-primary dark:hover:border-primary-dark hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white transition-all">
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <div className="ml-3">
      <p className="text-sm font-bold text-text-main dark:text-text-darkMain">{label}</p>
      <p className="text-xs text-text-sub dark:text-text-darkSub">{sub}</p>
    </div>
  </Link>
);

export default Dashboard;
