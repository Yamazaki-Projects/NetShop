import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  Suspense,
  lazy
} from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
  Outlet
} from 'react-router-dom';
import { User, UserRole } from './types';
import { db } from './services/dbService';
import LoginPage from './pages_spa/LoginPage';
import RegistrationPage from './pages_spa/RegistrationPage';

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
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};

// ログイン後のページだけ遅延読み込み
const Dashboard = lazy(() => import('./pages_spa/Dashboard'));
const CaseListPage = lazy(() => import('./pages_spa/CaseListPage'));
const CaseDetailPage = lazy(() => import('./pages_spa/CaseDetailPage'));
const TierTreePage = lazy(() => import('./pages_spa/TierTreePage'));
const AgencyListPage = lazy(() => import('./pages_spa/AgencyListPage'));
const AgencyApprovalPage = lazy(() => import('./pages_spa/AgencyApprovalPage'));
const ReferralStatsPage = lazy(() => import('./pages_spa/ReferralStatsPage'));

const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      minHeight: '40vh',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px'
    }}
  >
    <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--primary)' }}></i>
    <div style={{ fontWeight: 700, color: 'var(--text-sub)' }}>読み込み中...</div>
  </div>
);

const SidebarLink = ({
  to,
  icon,
  label,
  active
}: {
  to: string;
  icon: string;
  label: string;
  active: boolean;
}) => (
  <Link
    to={to}
    style={{
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
    }}
  >
    <i
      className={`fa-solid ${icon}`}
      style={{
        width: '24px',
        textAlign: 'center',
        marginRight: '14px',
        fontSize: '1.2rem',
        color: active ? 'var(--accent)' : 'inherit'
      }}
    ></i>
    <span>{label}</span>
  </Link>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAppContext();

  // ✅ 認証確認を待たず、未ログインなら即ログイン画面へ
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAppContext();

  // ✅ user がいなければ即ログイン画面を出す
  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const Layout = () => {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className="sidebar">
        <div
          style={{
            padding: '32px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                background: 'var(--grad-primary)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
            >
              <i className="fa-solid fa-bolt"></i>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'white' }}>
              Partner<span style={{ color: 'var(--accent)' }}>.</span>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0 16px' }}>
          <SidebarLink to="/" icon="fa-house" label="ダッシュボード" active={location.pathname === '/'} />
          <SidebarLink
            to="/cases"
            icon="fa-briefcase"
            label="顧客管理"
            active={location.pathname.startsWith('/cases')}
          />
          <SidebarLink to="/tree" icon="fa-sitemap" label="ティアツリー" active={location.pathname === '/tree'} />
          <SidebarLink to="/stats" icon="fa-chart-line" label="紹介統計" active={location.pathname === '/stats'} />

          {user.role === UserRole.ADMIN && (
            <>
              <div
                style={{
                  margin: '24px 20px 8px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  color: 'rgba(255,255,255,0.3)',
                  textTransform: 'uppercase'
                }}
              >
                Administrator
              </div>
              <SidebarLink
                to="/approvals"
                icon="fa-clipboard-check"
                label="代理店申請承認"
                active={location.pathname === '/approvals'}
              />
              <SidebarLink
                to="/agencies"
                icon="fa-building-columns"
                label="代理店一覧"
                active={location.pathname === '/agencies'}
              />
            </>
          )}
        </nav>

        <div style={{ padding: '24px' }}>
          <button
            onClick={async () => {
              await db.logout();
              setUser(null);
              navigate('/login');
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            ログアウト
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '48px', overflowY: 'auto' }}>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

export default function App() {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  const isDemoMode = !supabaseUrl || !supabaseKey;

  const [user, setUser] = useState<User | null>(() => {
    if (isDemoMode) {
      const saved = localStorage.getItem('netshop_demo_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [themeMode, setThemeMode] = useState<ThemeMode>(
    () => (localStorage.getItem('theme-mode') as ThemeMode) || 'system'
  );

  useEffect(() => {
    if (isDemoMode) return;

    let mounted = true;

    // ✅ 裏でセッション復元するが、画面表示はブロックしない
    const restoreSession = async () => {
      try {
        const restored = await db.getCurrentUser();
        if (!mounted) return;
        if (restored) setUser(restored);
      } catch (e) {
        console.error('Failed to restore session', e);
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [isDemoMode]);

  useEffect(() => {
    localStorage.setItem('theme-mode', themeMode);
  }, [themeMode]);

  return (
    <AppContext.Provider value={{ user, setUser, themeMode, setThemeMode }}>
      <HashRouter>
        {isDemoMode && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              background: '#f59e0b',
              color: 'white',
              textAlign: 'center',
              fontSize: '0.7rem',
              fontWeight: 900,
              zIndex: 9999,
              padding: '2px'
            }}
          >
            ⚠️ デモモードで動作中（データベース未接続）
          </div>
        )}

        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegistrationPage />
              </PublicOnlyRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases" element={<CaseListPage />} />
            <Route path="/cases/:id" element={<CaseDetailPage />} />
            <Route path="/approvals" element={<AgencyApprovalPage />} />
            <Route path="/tree" element={<TierTreePage />} />
            <Route path="/stats" element={<ReferralStatsPage />} />
            <Route path="/agencies" element={<AgencyListPage />} />
          </Route>

          <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
}