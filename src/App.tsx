
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import SiteDetail from './pages/SiteDetail';
import People from './pages/People';
import Teams from './pages/Teams';
import DemoGuide from './pages/DemoGuide';
import WorkOrders from './pages/WorkOrders';
import WorkOrderDetail from './pages/WorkOrderDetail';
import TypeSiteList from './pages/TypeSiteList';
import TerminCreate from './pages/TerminCreate';
import TerminDetail from './pages/TerminDetail';
import TerminReview from './pages/TerminReview';
import TerminPayment from './pages/TerminPayment';
import SiteMaster from './pages/SiteMaster';
import AllSites from './pages/AllSites';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="all-sites" element={<AllSites />} />
          <Route path="work-orders" element={<WorkOrders />} />
          <Route path="work-orders/:id" element={<WorkOrderDetail />} />
          <Route path="projects" element={<Navigate to="/" replace />} />
          <Route path="projects/type/:type/sites" element={<TypeSiteList />} />
          <Route path="projects/:id" element={<Navigate to="dashboard" replace />} />
          <Route path="projects/:id/dashboard" element={<ProjectDetail />} />
          <Route path="sites/:id" element={<SiteDetail />} />
          <Route path="sites/:id/termins/create" element={<TerminCreate />} />
          <Route path="sites/:id/termins/:terminId" element={<TerminDetail />} />
          <Route path="sites/:id/termins/:terminId/review" element={<TerminReview />} />
          <Route path="sites/:id/termins/:terminId/payment" element={<TerminPayment />} />
          <Route path="people" element={<People />} />
          <Route path="teams" element={<Teams />} />
          <Route path="site-master" element={<SiteMaster />} />
          <Route path="spk" element={<Navigate to="/work-orders" replace />} />
          <Route path="demo-guide" element={<DemoGuide />} />
          {/* Redirects for unimplemented routes */}
          <Route path="budget" element={<Navigate to="/projects" replace />} />
          <Route path="reports" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
