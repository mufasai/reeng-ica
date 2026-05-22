import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TabProvider } from './context/TabContext';
import { initAppDB } from './initDB';

import LoginPage from './pages/LoginPage';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import SiteDetail from './pages/SiteDetail';
import Workforce from './pages/Workforce';
import DemoGuide from './pages/DemoGuide';
import WorkOrders from './pages/WorkOrders';
import WorkOrderDetail from './pages/WorkOrderDetail';
import TypeSiteList from './pages/TypeSiteList';
import TerminCreate from './pages/TerminCreate';
import TerminDetail from './pages/TerminDetail';
import TerminReview from './pages/TerminReview';
import TerminPayment from './pages/TerminPayment';
import EngineerUpload from './pages/EngineerUpload';
import Sites from './pages/Sites';
import UserManagement from './pages/UserManagement';
import MaterialMaster from './pages/MaterialMaster';
import AtpWorkPage from './pages/AtpWorkPage';
import ProjectTypeConfigPage from './pages/options/ProjectTypeConfig';
import QaChecklist from './pages/options/QaChecklist';
import EngineerHome from './pages/EngineerHome';
import EngineerSiteView from './pages/EngineerSiteView';

// Loading screen while DB initializes
const DBLoader = ({ onReady }: { onReady: () => void }) => {
  useEffect(() => {
    initAppDB().then(onReady);
  }, [onReady]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      <p className="text-blue-300/70 text-sm font-medium">Memuat data dari database...</p>
    </div>
  );
};

// Inner app — only rendered when authenticated
const AppRoutes = () => {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const isFieldEngineer = currentUser?.role === 'field_engineer';

  return (
    <TabProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={isFieldEngineer ? <Navigate to="/engineer" replace /> : <Dashboard />} />
          <Route path="sites" element={<Sites />} />
          <Route path="work-orders" element={<WorkOrders />} />
          <Route path="work-orders/:id" element={<WorkOrderDetail />} />
          <Route path="atp/:id" element={<AtpWorkPage />} />
          <Route path="projects" element={<Navigate to="/" replace />} />
          <Route path="projects/type/:type/sites" element={<TypeSiteList />} />
          <Route path="projects/:id" element={<Navigate to="dashboard" replace />} />
          <Route path="projects/:id/dashboard" element={<ProjectDetail />} />
          <Route path="sites/:id" element={<SiteDetail />} />
          <Route path="sites/:id/termins/create" element={<TerminCreate />} />
          <Route path="sites/:id/termins/:terminId" element={<TerminDetail />} />
          <Route path="sites/:id/termins/:terminId/review" element={<TerminReview />} />
          <Route path="sites/:id/termins/:terminId/payment" element={<TerminPayment />} />
          <Route path="workforce" element={<Workforce />} />
          <Route path="people" element={<Navigate to="/workforce" replace />} />
          <Route path="teams" element={<Navigate to="/workforce" replace />} />
          <Route path="materials" element={<MaterialMaster />} />
          <Route path="spk" element={<Navigate to="/work-orders" replace />} />
          <Route path="rescoping" element={<Navigate to="/projects/type/rescoping/sites" replace />} />
          <Route path="demo-guide" element={<DemoGuide />} />
          <Route path="budget" element={<Navigate to="/projects" replace />} />
          <Route path="reports" element={<Navigate to="/" replace />} />
          <Route path="all-sites" element={<Navigate to="/sites" replace />} />
          <Route path="site-master" element={<Navigate to="/sites" replace />} />
          <Route path="options/users" element={<UserManagement />} />
          <Route path="options/project-types" element={<ProjectTypeConfigPage />} />
          <Route path="options/qa-checklist" element={<QaChecklist />} />
          <Route path="engineer" element={<EngineerHome />} />
          <Route path="engineer/upload/:id" element={<EngineerUpload />} />
          <Route path="engineer/site/:id" element={<EngineerSiteView />} />
          <Route path="system" element={<Navigate to="/options/users" replace />} />
          <Route path="termin-payment" element={<TerminPayment />} />
        </Route>
      </Routes>
    </TabProvider>
  );
};

function App() {
  const [dbReady, setDbReady] = useState(false);

  if (!dbReady) {
    return <DBLoader onReady={() => setDbReady(true)} />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
