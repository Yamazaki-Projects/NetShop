
import React, { useState, useEffect, createContext, useContext } from 'react';
// Migrated to react-router-dom v6 (Routes instead of Switch, Navigate instead of Redirect, useNavigate instead of useHistory)
import { HashRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole } from './types';
import { db } from './services/dbService';
import { Button } from './components/UI';
import Dashboard from './pages_spa/Dashboard';
import CaseListPage from './pages_spa/CaseListPage';
import CaseDetailPage from './pages_spa/CaseDetailPage';
import LoginPage from './pages_spa/LoginPage';
import TierTreePage from './pages_spa/TierTreePage';
import RegistrationPage from './pages_spa/RegistrationPage';
import AgencyListPage from './pages_spa/AgencyListPage';
import AgencyApprovalPage from './pages_spa/AgencyApprovalPage';
import ReferralStatsPage from './pages_spa/ReferralStatsPage';

type ThemeMode = 'light' | 'dark' | 'system';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};

const SidebarLink = ({ to, icon, label, active }: { to: string; icon: string; label: string; active: boolean }) => (
  <Link to={to} style={{
    display: 'flex',
    alignItems: 'center',
    padding: '14px 18px',
    borderRadius: '12px',
    textDecoration: 'none',
    marginBottom: '8px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
    fontWeight: active ? '700' : '500',
    boxShadow: active ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
  }}>
    <i className={`fa-solid ${icon}`} style={{ width: '24px', textAlign: 'center', marginRight: '14px', fontSize: '1.2rem', color: active ? 'var(--accent)' : 'inherit' }}></i>
    <span>{label}</span>
  </Link>
);

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { user, setUser } = useAppContext();
  // Migrated to useNavigate for v6 compatibility
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar">
        <div style={{ padding: '32px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', background: 'var(--grad-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <i className="fa-solid fa-bolt"></i>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'white' }}>Partner<span style={{color: 'var(--accent)'}}>.</span></div>
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: '0 16px' }}>
          <SidebarLink to="/" icon="fa-house" label="ダッシュボード" active={location.pathname === '/'} />
          <SidebarLink to="/cases" icon="fa-briefcase" label="顧客管理" active={location.pathname.startsWith('/cases')} />
          <SidebarLink to="/tree" icon="fa-sitemap" label="ティアツリー" active={location.pathname === '/tree'} />
          <SidebarLink to="/stats" icon="fa-chart-line" label="紹介統計" active={location.pathname === '/stats'} />
          {user.role === UserRole.ADMIN && (
            <>
              <div style={{ margin: '24px 20px 8px', fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Administrator</div>
              <SidebarLink to="/approvals" icon="fa-clipboard-check" label="代理店申請承認" active={location.pathname === '/approvals'} />
              <SidebarLink to="/agencies" icon="fa-building-columns" label="代理店一覧" active={location.pathname === '/agencies'} />
            </>
          )}
        </nav>

        <div style={{ padding: '24px' }}>
          <button onClick={async () => { 
            await db.logout();
            setUser(null); 
            navigate('/login'); 
          }} style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', fontWeight: 700, cursor: 'pointer' }}>ログアウト</button>
        </div>
      </aside>
      
      <main style={{ flex: 1, padding: '48px', overflowY: 'auto' }}>
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem('theme-mode') as ThemeMode) || 'system');

  useEffect(() => {
    const initApp = async () => {
      try {
        const u = await db.getCurrentUser();
        if (u) setUser(u);
      } catch (e) {
        console.error("Failed to restore session", e);
      } finally {
        setInitializing(false);
      }
    };
    initApp();
  }, []);

  if (initializing) return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
      <i className="fa-solid fa-circle-notch fa-spin fa-3x" style={{ color: 'var(--primary)' }}></i>
      <div style={{ fontWeight: 700, color: 'var(--text-sub)' }}>システムを初期化中...</div>
    </div>
  );

  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  const isDemoMode = !supabaseUrl || !supabaseKey;

  return (
    <AppContext.Provider value={{ user, setUser, themeMode, setThemeMode }}>
      <HashRouter>
        {isDemoMode && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#f59e0b', color: 'white', textAlign: 'center', fontSize: '0.7rem', fontWeight: 900, zIndex: 9999, padding: '2px' }}>
            ⚠️ デモモードで動作中（データベース未接続）
          </div>
        )}
        {/* Migrated Routes/Route for v6 compatibility */}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          <Route path="/cases/:id" element={user ? <Layout><CaseDetailPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/cases" element={user ? <Layout><CaseListPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/approvals" element={user ? <Layout><AgencyApprovalPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/tree" element={user ? <Layout><TierTreePage /></Layout> : <Navigate to="/login" />} />
          <Route path="/stats" element={user ? <Layout><ReferralStatsPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/agencies" element={user ? <Layout><AgencyListPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/" element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
}
