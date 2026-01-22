import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { User, UserRole, CaseStatus } from './types';
import { db } from './services/dbService';
import { Card, Button, Input, StatusBadge } from './components/UI';

// Context
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

// --- Components ---

const SidebarLink = ({ to, icon, label, isOpen, active }: { to: string; icon: string; label: string; isOpen: boolean; active: boolean }) => (
  <Link to={to} className={`flex items-center p-3 rounded-lg transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100'}`}>
    <i className={`fa-solid ${icon} w-6 text-center text-lg`}></i>
    {isOpen && <span className="ml-3 font-medium">{label}</span>}
  </Link>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, setUser, isDarkMode, toggleTheme } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!user) return null;

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isDarkMode ? 'dark' : ''}`}>
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-40 h-screen sticky top-0`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-200">
          <div className={`font-bold text-blue-600 truncate ${!isSidebarOpen && 'hidden'}`}>
            <i className="fa-solid fa-shop mr-2"></i>Partner Portal
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:text-blue-600 transition-colors">
            <i className={`fa-solid ${isSidebarOpen ? 'fa-chevron-left' : 'fa-bars'}`}></i>
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <SidebarLink to="/" icon="fa-chart-pie" label="ダッシュボード" isOpen={isSidebarOpen} active={location.pathname === '/'} />
          <SidebarLink to="/cases" icon="fa-folder-open" label="案件管理" isOpen={isSidebarOpen} active={location.pathname.startsWith('/cases')} />
          {user?.role === UserRole.ADMIN && (
            <>
              <SidebarLink to="/invites" icon="fa-user-plus" label="招待管理" isOpen={isSidebarOpen} active={location.pathname === '/invites'} />
              <SidebarLink to="/agencies" icon="fa-users" label="代理店管理" isOpen={isSidebarOpen} active={location.pathname === '/agencies'} />
              <SidebarLink to="/audit-logs" icon="fa-list-check" label="監査ログ" isOpen={isSidebarOpen} active={location.pathname === '/audit-logs'} />
            </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-200 space-y-4">
          <button onClick={toggleTheme} className="flex items-center w-full p-2 text-slate-500 hover:text-blue-600 transition-colors">
            <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'} w-6 text-center`}></i>
            {isSidebarOpen && <span className="ml-3">{isDarkMode ? 'ライト' : 'ダーク'}</span>}
          </button>
          <button onClick={() => { setUser(null); navigate('/login'); }} className="flex items-center w-full p-2 text-red-500 hover:bg-red-50 rounded transition-colors">
            <i className="fa-solid fa-right-from-bracket w-6 text-center"></i>
            {isSidebarOpen && <span className="ml-3">ログアウト</span>}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">{children}</main>
    </div>
  );
};

// --- Pages (Inline implementation for stability) ---

const LoginPage = () => {
  const { setUser } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('api18958@gmail.com');
  const [password, setPassword] = useState('aaaa1111');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const u = db.login(email, password);
    if (u) {
      setUser(u);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="p-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4"><i className="fa-solid fa-shop"></i></div>
          <h1 className="text-2xl font-bold">Partner Portal Login</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input label="メールアドレス" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="パスワード" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <Button type="submit" className="w-full">ログイン</Button>
        </form>
      </Card>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAppContext();
  const cases = db.getCases(user!);
  const recentCases = [...cases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-400 font-bold uppercase">総案件数</p>
          <p className="text-2xl font-bold">{cases.length}</p>
        </div>
      </div>
      <Card>
        <div className="p-4 border-b border-slate-200 flex justify-between items-center"><h2 className="font-bold">最近の案件</h2><Link to="/cases" className="text-sm text-blue-600">すべて見る</Link></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="border-b border-slate-200"><th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase">顧客名</th><th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase text-center">状態</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {recentCases.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold">{c.customerName}</td>
                  <td className="px-6 py-4 text-center"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const CaseListPage = () => {
  const { user } = useAppContext();
  const cases = db.getCases(user!);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">案件一覧</h1>{user?.role === UserRole.AGENCY && <Link to="/cases/new"><Button>新規登録</Button></Link>}</div>
      <Card>
        <table className="w-full text-left">
          <thead><tr className="border-b border-slate-200"><th className="px-6 py-4 text-slate-400 text-xs font-bold uppercase">案件情報</th><th className="px-6 py-4 text-center text-slate-400 text-xs font-bold uppercase">ステータス</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {cases.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold">{c.customerName}</td>
                <td className="px-6 py-4 text-center"><StatusBadge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// --- App Root ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return (
    <AppContext.Provider value={{ user, setUser, isDarkMode, toggleTheme: () => setIsDarkMode(!isDarkMode) }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
          <Route path="/cases" element={user ? <Layout><CaseListPage /></Layout> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
}