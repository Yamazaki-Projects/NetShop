
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAppContext } from '../app/providers';
import { UserRole } from '../types';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, setUser, isDarkMode, toggleTheme } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!user && pathname !== '/login' && pathname !== '/register') return null;

  const handleLogout = () => {
    setUser(null);
    router.push('/login');
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row dark:bg-bg-darkMain`}>
      <aside className={`
        ${isSidebarOpen ? 'w-64' : 'w-20'} 
        bg-bg-sub dark:bg-bg-darkSub border-r border-slate-200 dark:border-slate-800 
        transition-all duration-300 flex flex-col z-40 h-screen sticky top-0
      `}>
        <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className={`font-bold text-primary dark:text-primary-dark truncate ${!isSidebarOpen && 'hidden'}`}>
            <i className="fa-solid fa-shop mr-2"></i>NetShop System
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:text-primary transition-colors">
            <i className={`fa-solid ${isSidebarOpen ? 'fa-chevron-left' : 'fa-bars'}`}></i>
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <SidebarLink href="/" icon="fa-chart-pie" label="ダッシュボード" isOpen={isSidebarOpen} active={pathname === '/'} />
          <SidebarLink href="/cases" icon="fa-folder-open" label="案件管理" isOpen={isSidebarOpen} active={pathname.startsWith('/cases') && pathname !== '/cases/new'} />
          {user?.role === UserRole.AGENCY && (
            <SidebarLink href="/cases/new" icon="fa-plus-circle" label="新規案件作成" isOpen={isSidebarOpen} active={pathname === '/cases/new'} />
          )}
          {user?.role === UserRole.ADMIN && (
            <>
              <SidebarLink href="/invites" icon="fa-user-plus" label="招待管理" isOpen={isSidebarOpen} active={pathname === '/invites'} />
              <SidebarLink href="/agencies" icon="fa-users" label="代理店管理" isOpen={isSidebarOpen} active={pathname === '/agencies'} />
              <SidebarLink href="/audit-logs" icon="fa-list-check" label="監査ログ" isOpen={isSidebarOpen} active={pathname === '/audit-logs'} />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <button onClick={toggleTheme} className="flex items-center w-full p-2 text-slate-500 hover:text-primary dark:hover:text-primary-dark transition-colors">
            <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'} w-6 text-center`}></i>
            {isSidebarOpen && <span className="ml-3">{isDarkMode ? 'ライトモード' : 'ダークモード'}</span>}
          </button>
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0">
              {user?.name.charAt(0)}
            </div>
            {isSidebarOpen && (
              <div className="ml-3 truncate">
                <p className="text-sm font-semibold text-text-main dark:text-text-darkMain truncate">{user?.name}</p>
                <p className="text-xs text-text-sub dark:text-text-darkSub truncate uppercase">{user?.role}</p>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="flex items-center w-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors text-left">
            <i className="fa-solid fa-right-from-bracket w-6 text-center"></i>
            {isSidebarOpen && <span className="ml-3">ログアウト</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-white dark:bg-bg-darkMain overflow-y-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label, isOpen, active }: { href: string; icon: string; label: string; isOpen: boolean; active: boolean }) {
  return (
    <Link href={href} className={`
      flex items-center p-3 rounded-lg transition-colors
      ${active 
        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-dark' 
        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'}
    `}>
      <i className={`fa-solid ${icon} w-6 text-center text-lg`}></i>
      {isOpen && <span className="ml-3 font-medium">{label}</span>}
    </Link>
  );
}
