import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { User, UserRole } from './types';
import { db } from './services/dbService';
import { Button } from './components/UI';
import Dashboard from './pages_spa/Dashboard';
import CaseListPage from './pages_spa/CaseListPage';
import CaseDetailPage from './pages_spa/CaseDetailPage';
import LoginPage from './pages_spa/LoginPage';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isDarkMode: boolean;
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

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar">
        <div style={{ padding: '32px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              background: 'var(--grad-primary)', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white',
              boxShadow: '0 8px 16px rgba(79, 70, 229, 0.4)'
            }}>
              <i className="fa-solid fa-bolt" style={{ fontSize: '1.2rem' }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', color: 'white' }}>Partner<span style={{color: 'var(--accent)'}}>.</span></div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>Management System</div>
            </div>
          </div>
        </div>
        
        <nav style={{ flex: 1, padding: '0 16px' }}>
          <SidebarLink to="/" icon="fa-house" label="ダッシュボード" active={location.pathname === '/'} />
          <SidebarLink to="/cases" icon="fa-briefcase" label="案件管理" active={location.pathname.startsWith('/cases')} />
          {user.role === UserRole.ADMIN && (
            <>
              <div style={{ margin: '32px 20px 12px', fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Administrator</div>
              <SidebarLink to="/invites" icon="fa-ticket" label="招待管理" active={location.pathname === '/invites'} />
              <SidebarLink to="/agencies" icon="fa-building" label="代理店管理" active={location.pathname === '/agencies'} />
              <SidebarLink to="/audit-logs" icon="fa-shield-halved" label="監査ログ" active={location.pathname === '/audit-logs'} />
            </>
          )}
        </nav>

        <div style={{ padding: '24px', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '12px', 
              background: 'linear-gradient(45deg, #1e293b, #334155)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              border: '1px solid rgba(255,255,255,0.1)' 
            }}>
              <i className="fa-solid fa-user" style={{ color: 'var(--accent)' }}></i>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{user.role === UserRole.ADMIN ? 'システム管理者' : '公認代理店'}</div>
            </div>
          </div>
          <button 
            onClick={() => { setUser(null); navigate('/login'); }}
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: '10px', 
              border: '1px solid rgba(255,255,255,0.1)', 
              background: 'transparent', 
              color: 'rgba(255,255,255,0.6)', 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i> ログアウト
          </button>
        </div>
      </aside>
      
      <main style={{ flex: 1, padding: '48px', overflowY: 'auto' }}>
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <AppContext.Provider value={{ user, setUser, isDarkMode }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
          <Route path="/cases" element={user ? <Layout><CaseListPage /></Layout> : <Navigate to="/login" />} />
          <Route path="/cases/:id" element={user ? <Layout><CaseDetailPage /></Layout> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
}