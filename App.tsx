
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole } from './types';
import { db } from './services/dbService';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import CaseListPage from './pages/CaseListPage';
import CaseDetailPage from './pages/CaseDetailPage';
import CreateCasePage from './pages/CreateCasePage';
import AgencyManagementPage from './pages/AgencyManagementPage';
import AuditLogPage from './pages/AuditLogPage';
import InviteManagementPage from './pages/InviteManagementPage';

// Context for Auth and Theme
interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

const ProtectedRoute = ({ children, roles }: { children?: React.ReactNode; roles?: UserRole[] }) => {
  const { user } = useAppContext();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const Layout = () => {
  const { user, setUser, isDarkMode, toggleTheme } = useAppContext();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className={`
        ${isSidebarOpen ? 'w-64' : 'w-20'} 
        bg-bg-sub dark:bg-bg-darkSub border-r border-slate-200 dark:border-slate-800 
        transition-all duration-300 flex flex-col z-40
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
          <SidebarLink to="/" icon="fa-chart-pie" label="ダッシュボード" isOpen={isSidebarOpen} />
          <SidebarLink to="/cases" icon="fa-folder-open" label="案件管理" isOpen={isSidebarOpen} />
          {user?.role === UserRole.AGENCY && (
            <SidebarLink to="/cases/new" icon="fa-plus-circle" label="新規案件作成" isOpen={isSidebarOpen} />
          )}
          {user?.role === UserRole.ADMIN && (
            <>
              <SidebarLink to="/invites" icon="fa-user-plus" label="招待管理" isOpen={isSidebarOpen} />
              <SidebarLink to="/agencies" icon="fa-users" label="代理店管理" isOpen={isSidebarOpen} />
              <SidebarLink to="/audit-logs" icon="fa-list-check" label="監査ログ" isOpen={isSidebarOpen} />
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
          <button onClick={handleLogout} className="flex items-center w-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors">
            <i className="fa-solid fa-right-from-bracket w-6 text-center"></i>
            {isSidebarOpen && <span className="ml-3">ログアウト</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-white dark:bg-bg-darkMain overflow-y-auto h-screen p-4 md:p-8">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/cases" element={<ProtectedRoute><CaseListPage /></ProtectedRoute>} />
          <Route path="/cases/:id" element={<ProtectedRoute><CaseDetailPage /></ProtectedRoute>} />
          <Route path="/cases/new" element={<ProtectedRoute roles={[UserRole.AGENCY]}><CreateCasePage /></ProtectedRoute>} />
          <Route path="/agencies" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AgencyManagementPage /></ProtectedRoute>} />
          <Route path="/invites" element={<ProtectedRoute roles={[UserRole.ADMIN]}><InviteManagementPage /></ProtectedRoute>} />
          <Route path="/audit-logs" element={<ProtectedRoute roles={[UserRole.ADMIN]}><AuditLogPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const SidebarLink = ({ to, icon, label, isOpen }: { to: string; icon: string; label: string; isOpen: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link to={to} className={`
      flex items-center p-3 rounded-lg transition-colors
      ${isActive 
        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-dark' 
        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'}
    `}>
      <i className={`fa-solid ${icon} w-6 text-center text-lg`}></i>
      {isOpen && <span className="ml-3 font-medium">{label}</span>}
    </Link>
  );
};

const AppProvider = ({ children }: { children?: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <AppContext.Provider value={{ user, setUser, isDarkMode, toggleTheme }}>
      {children}
    </AppContext.Provider>
  );
};

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
