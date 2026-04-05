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
  NavLink,
  useNavigate
} from "react-router-dom";

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

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("AppContext missing");
  return context;
};

const Loader = () => (
  <div
    style={{
      display: "flex",
      height: "50vh",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column"
    }}
  >
    <i className="fa-solid fa-circle-notch fa-spin fa-2x"></i>
    <div style={{ marginTop: 10 }}>読み込み中...</div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAppContext();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAppContext();
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const Sidebar = () => {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();
  const isAdmin = user?.role === UserRole.ADMIN;

  const handleLogout = async () => {
    await db.logout();
    setUser(null);
    navigate("/login");
  };

  const navItems = [
    { to: "/", icon: "fa-house", label: "ダッシュボード" },
    { to: "/cases", icon: "fa-folder-open", label: "案件一覧" },
    { to: "/tree", icon: "fa-sitemap", label: "ティアツリー" },
    { to: "/stats", icon: "fa-chart-bar", label: "紹介統計" },
    ...(isAdmin ? [
      { to: "/agencies", icon: "fa-building", label: "代理店一覧" },
      { to: "/approvals", icon: "fa-user-check", label: "代理店承認" },
    ] : []),
  ];

  return (
    <div className="sidebar" style={{ padding: "24px 16px", justifyContent: "space-between" }}>
      <div>
        <div style={{ padding: "8px 16px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.05em" }}>NetShop</div>
          <div style={{ fontSize: "0.75rem", opacity: 0.5, marginTop: 4 }}>{user?.name}</div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: "0.9rem",
                fontWeight: 600,
                color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
                background: isActive ? "rgba(79,70,229,0.6)" : "transparent",
                textDecoration: "none",
                transition: "all 0.2s",
              })}
            >
              <i className={`fa-solid ${item.icon}`} style={{ width: 18, textAlign: "center" }} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <button
        onClick={handleLogout}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px", borderRadius: 12,
          background: "transparent", border: "none",
          color: "rgba(255,255,255,0.5)", cursor: "pointer",
          fontSize: "0.9rem", fontWeight: 600, width: "100%",
        }}
      >
        <i className="fa-solid fa-right-from-bracket" style={{ width: 18, textAlign: "center" }} />
        ログアウト
      </button>
    </div>
  );
};

const Layout = () => {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, padding: 40, overflowY: "auto" }}>
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const restore = async () => {
      try {
        const u = await db.getCurrentUser();
        if (u) setUser(u);
      } catch (e) {
        console.error(e);
      }
    };

    restore();
  }, []);

  return (
    <AppContext.Provider value={{ user, setUser }}>
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

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
}