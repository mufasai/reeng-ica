
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AppTabBar from './AppTabBar';
import { useSidebar } from '../../context/SidebarContext';
import clsx from 'clsx';

const Layout = () => {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen flex font-sans">
      <Sidebar />
      <div 
        className={clsx(
          "flex-1 flex flex-col transition-[margin] duration-300 ease-in-out",
          collapsed ? "ml-[56px]" : "ml-64"
        )}
      >
        <Header />
        <AppTabBar />
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
