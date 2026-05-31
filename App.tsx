import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  Suspense,
  lazy
} from "react";

import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";

import { 
  LayoutDashboard, 
  Briefcase, 
  Network, 
  BarChart3, 
  Users, 
  CheckSquare, 
  LogOut,
  Menu,
  X,
  AlertTriangle
} from "lucide-react";

import LoginPage from "./pages_spa/LoginPage";
import RegistrationPage from "./pages_spa/RegistrationPage";

import { User, UserRole } from "./types";
import { db } from "./services/dbService";

const Dashboard = lazy(() => import("./pages_spa/Dashboard"));
const CaseListPage = lazy(() => import("./pages_spa/CaseListPage"));
const CaseDetailPage = lazy(() => import("./pages_spa/CaseDetailPage"));
const TierTreePage = lazy(() => import("./pages_spa/TierTreePage"));
const ReferralStatsPage = lazy(() => import("./pages_spa/ReferralStatsPage"));
const AgencyListPage = lazy(() => import("./pages_spa/AgencyListPage"));
const AgencyApprovalPage = lazy(() => import("./pages_spa/AgencyApprovalPage"));

// --- Types & Context ---

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isDemoMode: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppContext missing");
  return context;
};

// --- Components ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-red-100">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">エラーが発生しました</h1>
            <p className="text-gray-600 mb-6">
              アプリケーションの読み込み中に問題が発生しました。ページを再読み込みしてください。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Loader = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    <div className="text-gray-500 font-medium">読み込み中...</div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAppContext();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAppContext();
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const SidebarItem = ({ 
  to, 
  icon: Icon, 
  label, 
  active 
}: { 
  to: string; 
  icon: any; 
  label: string; 
  active: boolean;
}) => (
  <Link
    to={to}
    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
        : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

const Layout = () => {
  const { user, setUser, isDemoMode } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await db.logout();
    setUser(null);
    navigate("/login");
  };

  const isAdmin = user?.role === UserRole.ADMIN;

  const menuItems = [
    { to: "/", icon: LayoutDashboard, label: "ダッシュボード" },
    { to: "/cases", icon: Briefcase, label: "案件一覧" },
    { to: "/tree", icon: Network, label: "紹介ツリー" },
    { to: "/stats", icon: BarChart3, label: "報酬統計" },
  ];

  if (isAdmin) {
    menuItems.push(
      { to: "/agencies", icon: Users, label: "代理店管理" },
      { to: "/approvals", icon: CheckSquare, label: "承認待ち" }
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Briefcase size={24} />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">NetShop Agency</span>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.to}
                {...item}
                active={location.pathname === item.to}
              />
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-100">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold border border-gray-200">
              {user?.name?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role === UserRole.ADMIN ? '管理者' : '代理店'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium">ログアウト</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Briefcase size={24} />
              </div>
              <span className="text-xl font-bold text-gray-900">NetShop Agency</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.to}
                {...item}
                active={location.pathname === item.to}
              />
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">ログアウト</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 shrink-0">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1 md:flex-none">
            <h2 className="text-lg font-bold text-gray-900 md:hidden">
              {menuItems.find(i => i.to === location.pathname)?.label || "NetShop"}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            {isDemoMode && (
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold animate-pulse">
                <AlertTriangle size={14} />
                <span>デモモード</span>
              </div>
            )}
            <div className="text-sm font-medium text-gray-600 hidden md:block">
              {user?.name} 様
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<Loader />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Check if we are in demo mode
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const demo = !supabaseUrl || !supabaseKey || supabaseUrl === 'YOUR_SUPABASE_URL';
        setIsDemoMode(demo);
        
        // Restore session
        const u = await db.getCurrentUser();
        if (u) setUser(u);
      } catch (e) {
        console.error("Auth restoration failed:", e);
      } finally {
        setAuthChecked(true);
      }
    };

    init();
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppContext.Provider value={{ user, setUser, isDemoMode }}>
        <HashRouter>
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
              <Route path="/tree" element={<TierTreePage />} />
              <Route path="/stats" element={<ReferralStatsPage />} />
              <Route path="/agencies" element={<AgencyListPage />} />
              <Route path="/approvals" element={<AgencyApprovalPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AppContext.Provider>
    </ErrorBoundary>
  );
}
