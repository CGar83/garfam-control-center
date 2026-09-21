import { Component, lazy, useEffect, useState } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth.jsx";
import Shell from "./components/Shell.jsx";
import Login from "./pages/Login.jsx";
import Queue from "./pages/Queue.jsx";
import NewWorksheet from "./pages/NewWorksheet.jsx";
const Worksheet = lazy(() => import("./pages/Worksheet.jsx"));
const LoanRecord = lazy(() => import("./pages/LoanRecord.jsx"));
import Loans from "./pages/Loans.jsx";
const AdminUsers = lazy(() => import("./pages/AdminUsers.jsx"));
import Activity from "./pages/Activity.jsx";
import Workspace from "./pages/Workspace.jsx";
import Operations from "./pages/Operations.jsx";
import Home from "./pages/Home.jsx";
const WorkItem = lazy(() => import("./pages/WorkItem.jsx"));
const WorkflowLibrary = lazy(() => import("./pages/WorkflowLibrary.jsx"));
const Integrations = lazy(() => import("./pages/Integrations.jsx"));
const Insights = lazy(() => import("./pages/Insights.jsx"));
const EvidenceDesk = lazy(() => import("./pages/EvidenceDesk.jsx"));
const LoanJourney = lazy(() => import("./pages/LoanJourney.jsx"));
const OperatingReferences = lazy(
  () => import("./pages/OperatingReferences.jsx"),
);
import { LoadState } from "./components/ui.jsx";

function Gate() {
  const { profile, loading, error, refresh } = useAuth();
  if (loading || error)
    return (
      <div className="login">
        <LoadState loading={loading} error={error} onRetry={refresh} />
      </div>
    );
  if (!profile || profile.role === "PENDING" || profile.active === false)
    return <Login />;
  return <Outlet />;
}
function RoleGate({ roles, children }) {
  const { profile } = useAuth();
  return roles.includes(profile?.role) ? children : <Navigate to="/" replace />;
}
class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="login">
          <div className="surface">
            <h1>Something interrupted your workspace.</h1>
            <p className="lede">Reload to recover your last saved data.</p>
            <button
              className="btn brand"
              onClick={() => window.location.reload()}
            >
              Reload workspace
            </button>
          </div>
        </div>
      );
    return this.props.children;
  }
}
function RouteError() {
  return (
    <div className="login">
      <div className="surface">
        <h1>This view could not load.</h1>
        <p className="lede">Your saved records are unchanged.</p>
        <a className="btn" href="/">
          Return to workspace
        </a>
      </div>
    </div>
  );
}
export default function App() {
  const [router, setRouter] = useState(null);
  useEffect(() => {
    setRouter(
      createBrowserRouter(
        [
          {
            element: <Gate />,
            errorElement: <RouteError />,
            children: [
              {
                element: <Shell />,
                children: [
                  { index: true, element: <Home /> },
                  { path: "operations", element: <Operations /> },
                  { path: "work/:id", element: <WorkItem /> },
                  {
                    path: "closing",
                    element: <Navigate to="/operations?desk=closing" replace />,
                  },
                  {
                    path: "mlp",
                    element: <Navigate to="/operations?desk=mlp" replace />,
                  },
                  { path: "journey", element: <LoanJourney /> },
                  { path: "references", element: <OperatingReferences /> },
                  { path: "evidence", element: <EvidenceDesk /> },
                  { path: "workflows", element: <WorkflowLibrary /> },
                  { path: "integrations", element: <Integrations /> },
                  { path: "insights", element: <Insights /> },
                  { path: "submissions", element: <Queue /> },
                  {
                    path: "new",
                    element: (
                      <RoleGate roles={["LO", "LOA", "MANAGER", "ADMIN"]}>
                        <NewWorksheet />
                      </RoleGate>
                    ),
                  },
                  { path: "loans", element: <Loans /> },
                  { path: "loans/:loanNumber", element: <LoanRecord /> },
                  { path: "worksheets/:id", element: <Worksheet /> },
                  {
                    path: "reports",
                    element: (
                      <Navigate to="/insights?view=submissions" replace />
                    ),
                  },
                  { path: "activity", element: <Activity /> },
                  { path: "workspace", element: <Workspace /> },
                  {
                    path: "admin/users",
                    element: (
                      <RoleGate roles={["ADMIN"]}>
                        <AdminUsers />
                      </RoleGate>
                    ),
                  },
                  { path: "*", element: <Navigate to="/" replace /> },
                ],
              },
            ],
          },
        ],
        { future: { v7_relativeSplatPath: true } },
      ),
    );
  }, []);
  if (!router)
    return (
      <div className="login">
        <div className="surface">
          <div className="eyebrow">Griffin Funding</div>
          <h1>Operations Hub</h1>
          <p className="lede">Loading your workspace…</p>
        </div>
      </div>
    );
  return (
    <Boundary>
      <AuthProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthProvider>
    </Boundary>
  );
}
