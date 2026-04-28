
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { TabProvider } from './context/TabContext';

function App() {
  return (
    <BrowserRouter>
      <TabProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="sites" element={<Sites />} />
          <Route path="work-orders" element={<WorkOrders />} />
          <Route path="work-orders/:id" element={<WorkOrderDetail />} />
          <Route path="engineer/upload/:id" element={<EngineerUpload />} />
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
          {/* Redirects for unimplemented routes */}
          <Route path="budget" element={<Navigate to="/projects" replace />} />
          <Route path="reports" element={<Navigate to="/" replace />} />
          <Route path="all-sites" element={<Navigate to="/sites" replace />} />
          <Route path="site-master" element={<Navigate to="/sites" replace />} />
          <Route path="options/users" element={<UserManagement />} />
          <Route path="system" element={<Navigate to="/options/users" replace />} />
          <Route path="termin-payment" element={<TerminPayment />} />
        </Route>
      </Routes>
      </TabProvider>
    </BrowserRouter>
  );
}

export default App;
