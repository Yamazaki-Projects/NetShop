
import React, { useState } from 'react';
import { useAppContext } from '../App';
import { db } from '../services/dbService';
import { Card, Badge, Button } from '../components/UI';

const AgencyManagementPage = () => {
  const { user: adminUser } = useAppContext();
  const [agencies, setAgencies] = useState(() => db.getAgencies());
  const [referrals, setReferrals] = useState(() => db.getReferralTree());
  
  const handleStatusToggle = (agencyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    db.updateAgencyStatus(agencyId, newStatus as any, adminUser!);
    setAgencies([...db.getAgencies()]);
  };

  const handleChangeParent = (childId: string, newParentId: string) => {
    if (childId === newParentId) return;
    db.updateReferral(childId, newParentId, adminUser!);
    setReferrals([...db.getReferralTree()]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-2xl font-bold text-text-main dark:text-text-darkMain">代理店ネットワーク管理</h1>
        <p className="text-text-sub dark:text-text-darkSub">全代理店の稼働状況および紹介ピラミッド（木構造）を管理します</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <i className="fa-solid fa-list-ul text-primary"></i>
            代理店マスター
          </h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">代理店名 / ID</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">ステータス</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">親代理店 (紹介元)</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">アクション</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {agencies.map(agency => {
                    const parentReferral = referrals.find(r => r.childAgencyId === agency.id);
                    
                    return (
                      <tr key={agency.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-text-main dark:text-text-darkMain">{agency.name}</p>
                          <p className="text-[10px] text-text-sub font-mono uppercase">{agency.id}</p>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => handleStatusToggle(agency.id, agency.status)}
                            className="focus:outline-none"
                          >
                            <Badge className={agency.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}>
                              {agency.status === 'active' ? '有効' : '停止中'}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            className="text-xs bg-transparent border border-slate-200 dark:border-slate-800 rounded p-1"
                            value={parentReferral?.parentAgencyId || 'none'}
                            onChange={(e) => handleChangeParent(agency.id, e.target.value)}
                          >
                            <option value="none">-- 運営直属 --</option>
                            {agencies.filter(a => a.id !== agency.id).map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" className="text-primary text-xs">詳細</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <i className="fa-solid fa-sitemap text-primary"></i>
            紹介ツリー可視化
          </h2>
          <Card className="p-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold bg-primary/5 p-2 rounded-lg">
                <i className="fa-solid fa-crown"></i>
                <span>運営本部 (Root)</span>
              </div>
              <div className="pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-4 pt-2 mt-2">
                {agencies.filter(a => !referrals.some(r => r.childAgencyId === a.id)).map(root => (
                  <TreeItem key={root.id} agency={root} allAgencies={agencies} allReferrals={referrals} />
                ))}
                {agencies.filter(a => !referrals.some(r => r.childAgencyId === a.id)).length === 0 && (
                   <p className="text-xs text-text-sub italic">直属の代理店はありません</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

function TreeItem({ agency, allAgencies, allReferrals }: { agency: any, allAgencies: any[], allReferrals: any[] }) {
  const children = allReferrals.filter(r => r.parentAgencyId === agency.id).map(r => allAgencies.find(a => a.id === r.childAgencyId));
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm group">
        <i className="fa-solid fa-circle-user text-slate-300 group-hover:text-primary transition-colors"></i>
        <span className="font-medium text-text-main dark:text-text-darkMain">{agency.name}</span>
        {agency.status === 'suspended' && <span className="text-[8px] text-red-500 font-bold border border-red-500 px-1 rounded">停止</span>}
      </div>
      {children.length > 0 && (
        <div className="pl-4 border-l border-slate-200 dark:border-slate-800 space-y-3 py-1">
          {children.map(child => child && <TreeItem key={child.id} agency={child} allAgencies={allAgencies} allReferrals={allReferrals} />)}
        </div>
      )}
    </div>
  );
}

export default AgencyManagementPage;
