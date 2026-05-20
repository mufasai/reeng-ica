import { NavLink, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Settings,
  Menu,
  Database,
  ChevronRight,
  CreditCard,
  Package,
} from 'lucide-react';
import clsx from 'clsx';
import { type UserRole, type ProjectType, siteTechnicalDetails } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';

const Sidebar = () => {
  const { currentUser } = useAuth();
  const { collapsed, toggle, counts: typeCounts, workOrderCount, triggerCountRefresh } = useSidebar();
  const location = useLocation();

  // Re-fetch counts on every navigation so badges stay current
  useEffect(() => {
    triggerCountRefresh();
  }, [location.pathname]);

  // Navigation config per confirmed RBAC matrix
  const ROLE_SIDEBAR_CONFIG: Record<UserRole, string[]> = {
    system_admin:   ['dashboard', 'sites', 'workforce', 'materials', 'options'],
    director:       ['dashboard', 'sites', 'workforce', 'materials', 'options'],
    operational:    ['dashboard', 'sites', 'workforce', 'materials', 'options'],
    finance:        ['dashboard', 'sites', 'pembayaran'],
    field_engineer: ['sites'],
  };

  if (!currentUser) return null;

  const allowedSidebarItems = ROLE_SIDEBAR_CONFIG[currentUser.role] || [];

  const overviewItems: { icon: any, label: string, path: string, badge?: number }[] = [];
  
  if (allowedSidebarItems.includes('dashboard')) {
    overviewItems.push({ icon: LayoutDashboard, label: 'Dashboard', path: '/' });
  }

  // DATA & DOKUMEN
  const dataMasterItems: { icon: any, label: string, path: string, badge?: number }[] = [];
  if (allowedSidebarItems.includes('workforce')) {
    dataMasterItems.push({ icon: Users, label: 'Workforce', path: '/workforce' });
  }
  if (allowedSidebarItems.includes('materials')) {
    dataMasterItems.push({ icon: Package, label: 'Material Master', path: '/materials' });
  }

  const showDataMaster = dataMasterItems.length > 0;
  const showSystem = allowedSidebarItems.includes('options');
  const showPembayaran = allowedSidebarItems.includes('pembayaran');
  const isFieldRole = currentUser.role === 'field_engineer';
  const isFinanceRole = currentUser.role === 'finance';

  const sidebarW = collapsed ? 'w-[56px]' : 'w-64';

  // Reusable NavLink renderer
  const renderNavLink = (path: string, icon: any, label: string, badge?: number, end?: boolean) => {
    const Icon = icon;
    return (
      <NavLink
        key={path}
        to={path}
        end={end}
        className={({ isActive }) =>
          clsx(
            'flex items-center gap-3 rounded-lg mx-1 transition-all duration-150 group relative',
            collapsed ? 'justify-center px-2 py-2.5' : 'px-4 py-2 text-[13px]',
            isActive
              ? 'bg-[var(--navy-800)] text-[var(--blue-400)] font-semibold border-l-2 border-[var(--blue-500)]'
              : 'text-slate-400 hover:text-white hover:bg-[var(--navy-800)] font-medium border-l-2 border-transparent'
          )
        }
        title={collapsed ? label : undefined}
      >
        {({ isActive }) => (
          <>
            <Icon className={clsx('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-[var(--blue-400)]' : 'text-slate-400 group-hover:text-white')} />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
            {!collapsed && badge && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                {badge}
              </span>
            )}
            {collapsed && badge && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-[var(--navy-900)]" />
            )}
            {/* Tooltip for collapsed mode */}
            {collapsed && (
              <span className="absolute left-full ml-3 px-2 py-1 bg-[var(--navy-700)] text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                {label}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  const types: { id: ProjectType; label: string; colorClass: string }[] = [
    { id: 'BLACKSITE', label: 'Blacksite', colorClass: 'bg-red-500' },
    { id: 'COMBAT', label: 'Combat', colorClass: 'bg-amber-500' },
    { id: 'FILTER', label: 'Filter', colorClass: 'bg-emerald-500' },
    { id: 'L2H', label: 'L2H', colorClass: 'bg-purple-500' },
    { id: 'RESCOPING', label: 'Rescoping', colorClass: 'bg-cyan-600' },
  ];
  const isRestricted = isFieldRole;

  if (isFieldRole) {
    const fieldRoleLabel = 'Field Engineer';
    return (
      <aside className={clsx(
        'fixed left-0 top-0 h-screen bg-[var(--navy-900)] text-white flex flex-col z-50',
        'transition-[width] duration-300 ease-in-out border-r border-[var(--navy-800)]',
        sidebarW
      )}>
        {/* Brand */}
        <div className={clsx('h-[60px] flex items-center border-b border-[var(--navy-800)] shrink-0', collapsed ? 'justify-center px-2' : 'px-6')}>
          {!collapsed && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 bg-[var(--blue-600)] rounded flex items-center justify-center shadow-lg shrink-0">
                <span className="font-bold text-lg text-white">R</span>
              </div>
              <span className="font-bold text-base tracking-tight text-white truncate">Reengineering</span>
            </div>
          )}
          {collapsed && <div className="w-8 h-8 bg-[var(--blue-600)] rounded flex items-center justify-center"><span className="font-bold text-lg text-white">R</span></div>}
          <button onClick={toggle} className={clsx('text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-[var(--navy-700)]', collapsed ? 'absolute right-1 top-3' : 'ml-auto')}>
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {!collapsed && (
            <div className="mb-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--navy-800)] border border-[var(--navy-700)]">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="text-sm font-medium truncate text-white">{currentUser.name}</p>
                  <p className="text-xs text-emerald-400 uppercase tracking-wide">{fieldRoleLabel}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 px-1">Akses terbatas ke site tim Anda.</p>
            </div>
          )}
          {renderNavLink('/engineer', Database, 'Site Saya', undefined, false)}

        </nav>
      </aside>
    );
  }

  return (
    <aside className={clsx(
      'fixed left-0 top-0 h-screen bg-[var(--navy-900)] text-white flex flex-col z-50',
      'transition-[width] duration-300 ease-in-out border-r border-[var(--navy-800)]',
      sidebarW
    )}>
      {/* Brand */}
      <div className={clsx(
        'h-[60px] flex items-center border-b border-[var(--navy-800)] bg-[var(--navy-900)] shrink-0',
        collapsed ? 'justify-center px-2' : 'px-6'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-[var(--blue-600)] rounded flex items-center justify-center shadow-lg shadow-[var(--blue-glow)] shrink-0">
              <span className="font-bold text-lg text-white">R</span>
            </div>
            <span className="font-bold text-base tracking-tight text-white truncate">Reengineering</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-[var(--blue-600)] rounded flex items-center justify-center shadow-lg shadow-[var(--blue-glow)]">
            <span className="font-bold text-lg text-white">R</span>
          </div>
        )}
        <button
          onClick={toggle}
          className={clsx(
            'text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-[var(--navy-700)]',
            collapsed ? 'absolute right-1 top-3' : 'ml-auto'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
        
        {/* User Profile Summary */}
        {!collapsed && (
          <div className="px-4 mb-5">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--navy-800)] border border-[var(--navy-700)]">
              <div className="w-8 h-8 rounded-full bg-[var(--navy-700)] text-white flex items-center justify-center text-xs font-bold ring-2 ring-[var(--navy-700)] shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-sm font-medium truncate text-white">{currentUser.name}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wide truncate">{currentUser.role}</p>
              </div>
            </div>

          </div>
        )}

        {/* Collapsed: avatar only */}
        {collapsed && (
          <div className="flex justify-center mb-4 relative group">
            <div
              className="w-8 h-8 rounded-full bg-[var(--navy-700)] text-white flex items-center justify-center text-xs font-bold ring-2 ring-[var(--navy-700)] cursor-default"
              title={`${currentUser.name} (${currentUser.role})`}
            >
              {currentUser.name.charAt(0)}
            </div>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {!collapsed && <p className="text-slate-500 text-[10px] font-bold tracking-[0.1em] uppercase px-4 pt-2 pb-[6px]">Overview</p>}
        {collapsed && <div className="mx-2 my-2 h-px bg-[var(--navy-700)]" />}
        <div className="px-1 space-y-0.5">
          {overviewItems.map((item) => renderNavLink(item.path, item.icon, item.label, item.badge, item.path === '/'))}
        </div>

        {/* ── PEKERJAAN ── */}
        {!collapsed && (
          <p className="text-slate-500 text-[10px] font-bold tracking-[0.1em] uppercase px-4 pt-5 pb-[6px]">
            Pekerjaan{isFinanceRole ? <span className="ml-1 text-slate-600 normal-case font-normal">(read only)</span> : ''}
          </p>
        )}
        {collapsed && <div className="mx-2 my-2 h-px bg-[var(--navy-700)]" />}

        {/* Sites */}
        {allowedSidebarItems.includes('sites') && (
          <div className="px-1 mb-1">
            <NavLink
              to="/sites"
              className={({ isActive }) => clsx(
                'flex items-center rounded-lg mx-0 transition-all duration-150 group relative',
                collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-4 py-2 text-[13px]',
                isActive
                  ? 'bg-[var(--navy-800)] text-white font-bold border-l-2 border-blue-600'
                  : 'text-slate-400 hover:text-white hover:bg-[var(--navy-800)] border-l-2 border-transparent font-medium'
              )}
              title={collapsed ? 'Sites' : undefined}
            >
              {({ isActive: _ia }) => (
                <>
                  <Database className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 mx-3 truncate">Sites</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded border bg-[var(--navy-700)] text-white border-[var(--navy-600)]">
                        [{siteTechnicalDetails.length}]
                      </span>
                    </>
                  )}
                  {collapsed && (
                    <span className="absolute left-full ml-3 px-2 py-1 bg-[var(--navy-700)] text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                      Sites [{siteTechnicalDetails.length}]
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </div>
        )}

        {/* Pekerjaan Aktif — work order count (one per site-sector) */}
        {allowedSidebarItems.includes('sites') && !collapsed && (
          <div className="px-1 mb-1">
            <div className="flex items-center justify-between px-4 py-2 text-[13px] mx-0 text-slate-500 font-medium">
              <span className="flex items-center gap-3">
                <span className="w-4 h-4 shrink-0" />
                <span className="flex-1 mx-3 truncate">Pekerjaan Aktif</span>
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded border bg-[var(--navy-700)] text-slate-400 border-[var(--navy-600)]">
                [{workOrderCount}]
              </span>
            </div>
          </div>
        )}

        {/* Project Type Links */}
        <div className="px-1 space-y-0.5">
          {types.map((type) => {
            const count = typeCounts[type.id] || 0;
            if (isRestricted && count === 0) return null;
            const path = `/projects/type/${type.id.toLowerCase()}/sites`;
            return (
              <NavLink
                key={type.id}
                to={path}
                className={({ isActive }) => clsx(
                  'flex items-center rounded-lg transition-all duration-150 group relative',
                  collapsed ? 'justify-center px-2 py-2.5 mx-0' : 'justify-between px-4 py-2 text-[13px] mx-2',
                  isActive
                    ? 'bg-[var(--navy-800)] text-white font-bold border-l-2 border-blue-600'
                    : 'text-slate-400 hover:text-white hover:bg-[var(--navy-800)] border-l-2 border-transparent font-medium'
                )}
                title={collapsed ? `${type.label} [${count}]` : undefined}
              >
                {({ isActive }) => (
                  <>
                    <div className={clsx('w-2 h-2 rounded-full shrink-0', type.colorClass, isActive && 'ring-2 ring-white/20')} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 mx-3 truncate">{type.label}</span>
                        <span className={clsx(
                          'text-[11px] px-1.5 py-0.5 rounded border',
                          isActive
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 font-bold'
                            : count > 0
                              ? 'bg-[var(--navy-700)] text-white border-[var(--navy-600)]'
                              : 'border-transparent text-slate-500'
                        )}>
                          [{count}]
                        </span>
                      </>
                    )}
                    {collapsed && (
                      <span className="absolute left-full ml-3 px-2 py-1 bg-[var(--navy-700)] text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                        {type.label} [{count}]
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* ── PEMBAYARAN (Finance only) ── */}
        {showPembayaran && (
          <>
            {!collapsed && <p className="text-slate-500 text-[10px] font-bold tracking-[0.1em] uppercase px-4 pt-5 pb-[6px]">Pembayaran</p>}
            {collapsed && <div className="mx-2 my-2 h-px bg-[var(--navy-700)]" />}
            <div className="px-1 space-y-0.5">
              {renderNavLink('/termin-payment', CreditCard, 'Pengajuan Termin')}
            </div>
          </>
        )}

        {/* ── DATA & DOKUMEN ── */}
        {showDataMaster && (
          <>
            {!collapsed && <p className="text-slate-500 text-[10px] font-bold tracking-[0.1em] uppercase px-4 pt-5 pb-[6px]">Data & Dokumen</p>}
            {collapsed && <div className="mx-2 my-2 h-px bg-[var(--navy-700)]" />}
            <div className="px-1 space-y-0.5">
              {dataMasterItems.map((item) => renderNavLink(item.path, item.icon, item.label, item.badge))}
            </div>
          </>
        )}

        {/* ── SYSTEM ── */}
        {showSystem && (
          <>
            {!collapsed && <p className="text-slate-500 text-[10px] font-bold tracking-[0.1em] uppercase px-4 pt-5 pb-[6px]">System</p>}
            {collapsed && <div className="mx-2 my-2 h-px bg-[var(--navy-700)]" />}
            <div className="px-1 space-y-0.5">
              {renderNavLink('/options/users', Settings, 'Options')}
              {currentUser.role === 'system_admin' && renderNavLink('/options/project-types', Settings, 'Project Types')}
              {currentUser.role === 'system_admin' && renderNavLink('/options/qa-checklist', Settings, 'QA Checklist')}
            </div>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
