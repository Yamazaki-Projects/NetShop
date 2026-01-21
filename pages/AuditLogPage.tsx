
import React from 'react';
import { db } from '../services/dbService';
import { Card, Badge } from '../components/UI';

const AuditLogPage = () => {
  const logs = db.getAuditLogs();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text-main dark:text-text-darkMain">監査ログ</h1>
        <p className="text-text-sub dark:text-text-darkSub">全ユーザーの重要操作履歴を追跡します</p>
      </header>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">日時</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">実行者</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">操作</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">対象</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">詳細</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map(log => (
                <tr key={log.id} className="text-sm">
                  <td className="px-6 py-4 text-slate-500 font-mono">
                    {new Date(log.createdAt).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-text-main dark:text-text-darkMain">{log.actorName}</p>
                    <p className="text-[10px] text-text-sub dark:text-text-darkSub uppercase">{log.actorUserId}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                      {log.action}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-text-sub dark:text-text-darkSub uppercase text-xs">{log.targetType}: {log.targetId}</span>
                  </td>
                  <td className="px-6 py-4 max-w-xs truncate text-xs text-text-sub dark:text-text-darkSub">
                    {JSON.stringify(log.metadata)}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-sub">ログが見つかりません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AuditLogPage;
