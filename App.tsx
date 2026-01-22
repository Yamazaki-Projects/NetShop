import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { User, UserRole, CaseStatus, PlatformType, TaskStatus, Case } from './types';
import { db } from './services/dbService';
import { Card, Button, Input, Select, StatusBadge, Badge } from './components/UI';
import { STATUS_LABELS, REASON_TEMPLATES, TASK_STATUS_COLORS, STATUS_COLORS } from './constants';

// Context for Auth and Theme
interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

// Layout Components
const SidebarLink = ({ to, icon, label, isOpen, active }: { to: string; icon: string; label: string; isOpen: boolean; active: boolean }) => (
  <Link to={to} className={`flex items-center p-3 rounded-lg transition-colors ${active ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-dark' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'}`}>
    <i className={`fa-solid ${icon} w-6 text-center text-lg`}></i>
    {isOpen && <span className="ml-3 font-medium">{label}</span>}
  </Link>
);

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, setUser, isDarkMode, toggleTheme } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!user) return null;

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isDarkMode ? 'dark bg-bg-darkMain' : 'bg-slate-50'}`}>
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-bg-darkSub border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col z-40 h-screen sticky top-0`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className={`font-bold text-primary dark:text-primary-dark truncate ${!isSidebarOpen && 'hidden'}`}>
            <i className="fa-solid fa-shop mr-2"></i>NetShop System
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:text-primary transition-colors">
            <i className={`fa-solid ${isSidebarOpen ? 'fa-chevron-left' : 'fa-bars'}`}></i>
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <SidebarLink to="/" icon="fa-chart-pie" label="ダッシュボード" isOpen={isSidebarOpen} active={location.pathname === '/'} />
          <SidebarLink to="/cases" icon="fa-folder-open" label="案件管理" isOpen={isSidebarOpen} active={location.pathname.startsWith('/cases') && location.pathname !== '/cases/new'} />
          {user?.role === UserRole.AGENCY && <SidebarLink to="/cases/new" icon="fa-plus-circle" label="新規案件作成" isOpen={isSidebarOpen} active={location.pathname === '/cases/new'} />}
          {user?.role === UserRole.ADMIN && (
            <>
              <SidebarLink to="/invites" icon="fa-user-plus" label="招待管理" isOpen={isSidebarOpen} active={location.pathname === '/invites'} />
              <SidebarLink to="/agencies" icon="fa-users" label="代理店管理" isOpen={isSidebarOpen} active={location.pathname === '/agencies'} />
              <SidebarLink to="/audit-logs" icon="fa-list-check" label="監査ログ" isOpen={isSidebarOpen} active={location.pathname === '/audit-logs'} />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <button onClick={toggleTheme} className="flex items-center w-full p-2 text-slate-500 hover:text-primary transition-colors">
            <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'} w-6 text-center`}></i>
            {isSidebarOpen && <span className="ml-3">{isDarkMode ? 'ライト' : 'ダーク'}</span>}
          </button>
          <div className="flex items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shrink-0 font-bold">{user.name.charAt(0)}</div>
            {isSidebarOpen && <div className="ml-3 truncate"><p className="text-xs font-bold text-text-main dark:text-text-darkMain truncate">{user.name}</p></div>}
          </div>
          <button onClick={() => { setUser(null); navigate('/login'); }} className="flex items-center w-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors">
            <i className="fa-solid fa-right-from-bracket w-6 text-center"></i>
            {isSidebarOpen && <span className="ml-3">ログアウト</span>}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  );
};

// Pages
const Dashboard = () => {
  const { user } = useAppContext();
  const cases = db.getCases(user!);
  const stats = {
    total: cases.length,
    pending: cases.filter(c => [CaseStatus.SUBMITTED, CaseStatus.REVIEWING].includes(c.status)).length,
    needsFix: cases.filter(c => c.status === CaseStatus.NEEDS_FIX).length,
    approved: cases.filter(c => c.status === CaseStatus.APPROVED).length,
  };
  const recentCases = [...cases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header><h1 className="text-2xl font-bold dark:text-white">ダッシュボード</h1></header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="総案件数" value={stats.total} icon="fa-folder" color="blue" />
        <StatCard title="審査中 / 提出" value={stats.pending} icon="fa-clock" color="amber" />
        <StatCard title="要修正" value={stats.needsFix} icon="fa-triangle-exclamation" color="red" />
        <StatCard title="承認済み" value={stats.approved} icon="fa-circle-check" color="green" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center"><h2 className="text-lg font-bold dark:text-white">最近の更新</h2><Link to="/cases" className="text-primary text-sm hover:underline">すべて見る</Link></div>
          <Card className="overflow-hidden">
            <table className="w-full text-left">
              <thead><tr className="border-b dark:border-slate-800"><th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">顧客 / 代理店</th><th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-center">状態</th><th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-right">更新日</th></tr></thead>
              <tbody className="divide-y dark:divide-slate-800">
                {recentCases.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4"><Link to={`/cases/${c.id}`}><p className="font-bold dark:text-white">{c.customerName}</p><p className="text-xs text-slate-400">{c.agencyName}</p></Link></td>
                    <td className="px-6 py-4 text-center"><StatusBadge status={c.status} /></td>
                    <td className="px-6 py-4 text-right text-sm text-slate-400">{new Date(c.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-bold dark:text-white">アクション</h2>
          <Card className="p-4 space-y-2">
            <Link to="/cases/new" className="flex items-center p-3 rounded-xl border dark:border-slate-800 hover:border-primary transition-all group">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-white transition-all"><i className="fa-solid fa-plus"></i></div>
              <div className="ml-3 font-bold dark:text-white">新規案件登録</div>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => {
  const c: any = { blue: 'text-blue-600 bg-blue-50', amber: 'text-amber-600 bg-amber-50', red: 'text-red-600 bg-red-50', green: 'text-green-600 bg-green-50' };
  return (
    <Card className="p-6">
      <div className="flex justify-between mb-2"><span className="text-sm text-slate-400">{title}</span><div className={`w-8 h-8 rounded flex items-center justify-center ${c[color]}`}><i className={`fa-solid ${icon}`}></i></div></div>
      <p className="text-2xl font-bold dark:text-white">{value}</p>
    </Card>
  );
};

// Case List Page
const CaseListPage = () => {
  const { user } = useAppContext();
  const [search, setSearch] = useState('');
  const cases = db.getCases(user!).filter(c => c.customerName.includes(search));
  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center"><h1 className="text-2xl font-bold dark:text-white">案件一覧</h1>{user?.role === UserRole.AGENCY && <Link to="/cases/new"><Button>新規案件作成</Button></Link>}</header>
      <Input placeholder="顧客名で検索..." value={search} onChange={e => setSearch(e.target.value)} />
      <Card>
        <table className="w-full text-left">
          <thead><tr className="border-b dark:border-slate-800"><th className="px-6 py-4 text-xs font-semibold text-slate-400">顧客</th><th className="px-6 py-4 text-xs font-semibold text-slate-400">PF</th><th className="px-6 py-4 text-xs font-semibold text-slate-400 text-center">ステータス</th><th className="px-6 py-4"></th></tr></thead>
          <tbody className="divide-y dark:divide-slate-800">
            {cases.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-6 py-4 font-bold dark:text-white">{c.customerName}</td>
                <td className="px-6 py-4 text-sm dark:text-slate-400">{c.platform}</td>
                <td className="px-6 py-4 text-center"><StatusBadge status={c.status} /></td>
                <td className="px-6 py-4 text-right"><Link to={`/cases/${c.id}`}><Button variant="ghost">詳細</Button></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// Main Routing and Auth Guard
const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) => {
  const { user } = useAppContext();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <MainLayout>{children}</MainLayout>;
};

// Auth Pages (Minimal)
const LoginPage = () => {
  const { setUser } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('api18958@gmail.com');
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="p-8 w-full max-w-md space-y-6">
        <div className="text-center"><h1 className="text-2xl font-bold">Partner Portal</h1><p className="text-slate-400">ログインしてください</p></div>
        <Input label="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} />
        <Button className="w-full" onClick={() => { const u = db.login(email, ''); if(u) { setUser(u); navigate('/'); } }}>ログイン</Button>
      </Card>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle('dark', isDarkMode); }, [isDarkMode]);

  return (
    <AppContext.Provider value={{ user, setUser, isDarkMode, toggleTheme: () => setIsDarkMode(!isDarkMode) }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/cases" element={<ProtectedRoute><CaseListPage /></ProtectedRoute>} />
          <Route path="/cases/new" element={<ProtectedRoute roles={[UserRole.AGENCY]}><div className="p-4">新規登録画面（実装予定）</div></ProtectedRoute>} />
          <Route path="/cases/:id" element={<ProtectedRoute><div className="p-4">案件詳細画面（実装予定）</div></ProtectedRoute>} />
          <Route path="/invites" element={<ProtectedRoute roles={[UserRole.ADMIN]}><div className="p-4">招待管理（実装予定）</div></ProtectedRoute>} />
          <Route path="/agencies" element={<ProtectedRoute roles={[UserRole.ADMIN]}><div className="p-4">代理店管理（実装予定）</div></ProtectedRoute>} />
          <Route path="/audit-logs" element={<ProtectedRoute roles={[UserRole.ADMIN]}><div className="p-4">監査ログ（実装予定）</div></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
}