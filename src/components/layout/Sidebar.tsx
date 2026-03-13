
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Menu,
  Database,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import clsx from 'clsx';
import { USERS, type UserRole, getActiveSiteCountsByType, projects, type ProjectType, siteMasterRecords } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';

const Sidebar = () => {
  const { currentUser, switchRole } = useAuth();
  const { collapsed, toggle } = useSidebar();

  // Navigation config per confirmed RBAC matrix
  const ROLE_SIDEBAR_CONFIG: Record<UserRole, string[]> = {
    director:    ['dashboard', 'sites', 'people', 'teams', 'options'],
    operational: ['dashboard', 'sites', 'people', 'teams', 'options'],
    admin:       ['dashboard', 'sites', 'people', 'teams', 'options'],
    finance:     ['dashboard', 'sites', 'pembayaran'],
    field:       [],  // field role has no full sidebar — own sites view only
  };

  const allowedSidebarItems = ROLE_SIDEBAR_CONFIG[currentUser.role] || [];

  const overviewItems: { icon: any, label: string, path: string, badge?: number }[] = [];
  
  if (allowedSidebarItems.includes('dashboard')) {
    overviewItems.push({ icon: LayoutDashboard, label: 'Dashboard', path: '/' });
  }

  // DATA & DOKUMEN
  const dataMasterItems: { icon: any, label: string, path: string, badge?: number }[] = [];
  if (allowedSidebarItems.includes('people')) {
    dataMasterItems.push({ icon: Users, label: 'People', path: '/people' });
  }
  if (allowedSidebarItems.includes('teams')) {
    dataMasterItems.push({ icon: Users, label: 'Teams', path: '/teams' });
  }

  const showDataMaster = dataMasterItems.length > 0;
  const showSystem = allowedSidebarItems.includes('options');
  const showPembayaran = allowedSidebarItems.includes('pembayaran');
  const isFieldRole = currentUser.role === 'field';
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
  const typeCounts = getActiveSiteCountsByType(currentUser, projects, siteMasterRecords);
  const isRestricted = isFieldRole;

  if (isFieldRole) {
    // Field role: show minimal "Site Saya" view instead of full sidebar
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
                  <p className="text-xs text-emerald-400 uppercase tracking-wide">Field</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 px-1">Akses terbatas ke site tim Anda.</p>
            </div>
          )}
          {renderNavLink('/', LayoutDashboard, 'Dashboard', undefined, true)}
          {/* Dev Role Switcher */}
          {!collapsed && (
            <div className="mt-4 pt-3 border-t border-[var(--navy-700)] opacity-70 hover:opacity-100 transition-opacity">
              <label className="text-[10px] uppercase text-amber-500/70 font-bold tracking-wider mb-1 flex items-center gap-1">
                <Settings className="w-3 h-3" /> Switch Role (Dev)
              </label>
              <select className="w-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500/90 rounded px-2 py-1 outline-none" value={currentUser.role} onChange={(e) => switchRole(e.target.value as UserRole)}>
                {USERS.map(u => (<option key={u.id} value={u.role} className="bg-[var(--navy-800)] text-slate-300">{u.name} ({u.role})</option>))}
              </select>
            </div>
          )}
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
            {/* Dev Helper: Role Switcher */}
            <div className="mt-3 pt-3 border-t border-[var(--navy-700)] opacity-70 hover:opacity-100 transition-opacity">
              <label className="text-[10px] uppercase text-amber-500/70 font-bold tracking-wider mb-1 flex items-center gap-1">
                <Settings className="w-3 h-3" /> Switch Role (Dev)
              </label>
              <select
                className="w-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500/90 rounded px-2 py-1 outline-none focus:border-amber-500/50"
                value={currentUser.role}
                onChange={(e) => switchRole(e.target.value as UserRole)}
              >
                {USERS.map(u => (
                  <option key={u.id} value={u.role} className="bg-[var(--navy-800)] text-slate-300">{u.name} ({u.role})</option>
                ))}
              </select>
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
                        [{siteMasterRecords.length}]
                      </span>
                    </>
                  )}
                  {collapsed && (
                    <span className="absolute left-full ml-3 px-2 py-1 bg-[var(--navy-700)] text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                      Sites [{siteMasterRecords.length}]
                    </span>
                  )}
                </>
              )}
            </NavLink>
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
            </div>
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
