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
  Outlet
} from "react-router-dom";

import LoginPage from "./pages_spa/LoginPage";
import RegistrationPage from "./pages_spa/RegistrationPage";

import { User } from "./types";
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

const Layout = () => {
  return (
    <div style={{ padding: 40 }}>
      <Suspense fallback={<Loader />}>
        <Outlet />
      </Suspense>
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