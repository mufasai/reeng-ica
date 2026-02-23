
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Menu,
  ClipboardList
} from 'lucide-react';
import clsx from 'clsx';
import { USERS, type UserRole, getActiveSiteCountsByType, projects, sites, type ProjectType } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const { currentUser, switchRole } = useAuth();

  // 1. PROJECT MANAGEMENT
  const ROLE_SIDEBAR_CONFIG: Record<UserRole, string[]> = {
    engineer:        ['dashboard'],
    team_leader:     ['dashboard', 'work-orders'],
    backoffice_admin:['dashboard', 'work-orders', 'people', 'teams'],
    finance:         ['dashboard', 'payments'], // 'payments' might be mapped to somewhere else if needed, but for now we follow the spec
    management:      ['dashboard', 'work-orders', 'people', 'teams', 'options'],
  };

  const allowedSidebarItems = ROLE_SIDEBAR_CONFIG[currentUser.role] || [];

  const projectManagementItems = [];
  
  if (allowedSidebarItems.includes('dashboard')) {
      projectManagementItems.push({ icon: LayoutDashboard, label: 'Dashboard', path: '/' });
  }
  
  if (allowedSidebarItems.includes('work-orders')) {
    // We add an amber badge indicator here for unassigned WOs count (mock value 2 for now, will connect to mockData later)
    projectManagementItems.push({ icon: ClipboardList, label: 'Work Orders', path: '/work-orders', badge: 2 });
  }

  // 3. DATA MASTER
  const dataMasterItems = [];
  if (allowedSidebarItems.includes('people')) {
      dataMasterItems.push({ icon: Users, label: 'People', path: '/people' });
  }
  if (allowedSidebarItems.includes('teams')) {
      dataMasterItems.push({ icon: Users, label: 'Teams', path: '/teams' });
  }
  
  const showDataMaster = dataMasterItems.length > 0;

  // 4. SYSTEM (Management Only)
  const showSystem = allowedSidebarItems.includes('options');

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--navy-900)] text-white flex flex-col z-50 transition-all duration-300 border-r border-[var(--navy-800)]">
      {/* Brand */}
      <div className="h-[60px] flex items-center px-6 border-b border-[var(--navy-800)] bg-[var(--navy-900)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--blue-600)] rounded flex items-center justify-center shadow-lg shadow-[var(--blue-glow)]">
            <span className="font-bold text-lg text-white">R</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Reengineering</span>
        </div>
        <button className="ml-auto text-slate-400 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        
        {/* User Profile Summary */}
        <div className="px-6 mb-6">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--navy-800)] border border-[var(--navy-700)]">
                <div className="w-10 h-10 rounded-full bg-[var(--navy-700)] text-white flex items-center justify-center text-xs font-bold ring-2 ring-[var(--navy-700)]">
                    {currentUser.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate text-white">{currentUser.name}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wide truncate">{currentUser.role.replace('_', ' ')}</p>
                </div>
            </div>
            {/* Dev Helper: Role Switcher */}
            <div className="mt-4 pt-4 border-t border-[var(--navy-700)] opacity-70 hover:opacity-100 transition-opacity">
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


        {/* 1. PROJECT MANAGEMENT */}
        <p className="text-slate-500 text-[10px] font-bold tracking-[0.1em] uppercase px-6 pt-4 pb-[6px]">Project Management</p>
        <div className="px-2 space-y-1">
            {projectManagementItems.map((item) => (
            <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                clsx(
                    'flex items-center gap-3 px-4 py-2 text-[13px] rounded-lg mx-1 transition-all duration-150 group',
                    isActive
                    ? 'bg-[var(--navy-800)] text-[var(--blue-400)] font-semibold border-l-2 border-[var(--blue-500)]'
                    : 'text-slate-400 hover:text-white hover:bg-[var(--navy-800)] font-medium border-l-2 border-transparent'
                )
                }
            >
                {({ isActive }) => (
                    <>
                        <item.icon className={clsx("w-4 h-4 transition-colors", isActive ? "text-[var(--blue-400)]" : "text-slate-400 group-hover:text-white")} />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                                {item.badge}
                            </span>
                        )}
                    </>
                )}
            </NavLink>
            ))}
        </div>

        {/* 2. PROJECT TYPES */}
        <p className="text-slate-500 text-[10px] font-bold tracking-[0.1em] uppercase px-6 pt-6 pb-[6px]">Project Types</p>
        
        {(() => {
            const types: { id: ProjectType; label: string; colorClass: string }[] = [
                { id: 'BLACKSITE', label: 'Blacksite', colorClass: 'bg-red-500' },
                { id: 'COMBAT', label: 'Combat', colorClass: 'bg-amber-500' },
                { id: 'FILTER', label: 'Filter', colorClass: 'bg-emerald-500' },
                { id: 'L2H', label: 'L2H', colorClass: 'bg-blue-600' },
                { id: 'REFINEN', label: 'Refinen', colorClass: 'bg-purple-600' }
            ];

            // Get counts based on user role and team assignments
            // Using the global mock arrays projects and sites 
            // In a real app these would come from AuthContext or a hook
            // For now, we need to import them at the top of Sidebar.tsx
            const typeCounts = getActiveSiteCountsByType(currentUser, projects, sites);
            const isRestricted = ['engineer', 'team_leader'].includes(currentUser.role);

            return types.map((type) => {
                const count = typeCounts[type.id] || 0;
                
                // If restricted, only show types that have >0 sites assigned to them
                if (isRestricted && count === 0) return null;

                const path = `/projects/type/${type.id.toLowerCase()}/sites`;
                
                return (
                    <NavLink
                        key={type.id}
                        to={path}
                        className={({ isActive }) => clsx(
                            'flex items-center justify-between px-4 py-2 text-[13px] rounded-lg mx-3 transition-all duration-150 group',
                            isActive
                            ? 'bg-[var(--navy-800)] text-white font-bold border-l-2 border-blue-600'
                            : 'text-slate-400 hover:text-white hover:bg-[var(--navy-800)] border-l-2 border-transparent font-medium'
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <div className="flex items-center gap-3">
                                    <div className={clsx("w-2 h-2 rounded-full", type.colorClass, isActive && "ring-2 ring-white/20 shadow-[0_0_8px_currentColor]")}></div>
                                    <span className="truncate">{type.label}</span>
                                </div>
                                <span className={clsx(
                                    "text-[11px] px-1.5 py-0.5 rounded border",
                                    isActive 
                                        ? "bg-blue-600/20 text-blue-400 border-blue-500/30 font-bold" 
                                        : count > 0 
                                            ? "bg-[var(--navy-700)] text-white border-[var(--navy-600)]" 
                                            : "border-transparent text-slate-500"
                                )}>
                                    [{count}]
                                </span>
                            </>
                        )}
                    </NavLink>
                );
            });
        })()}

        {/* 3. DATA MASTER */}
        {showDataMaster && (
            <>
                <p className="text-slate-500 text-[10px] font-bold tracking-[0.1em] uppercase px-6 pt-6 pb-[6px]">Data Master</p>
                <div className="px-2 space-y-1">
                    {dataMasterItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                        clsx(
                            'flex items-center gap-3 px-4 py-2 text-[13px] rounded-lg mx-1 transition-all duration-150 group',
                            isActive
                            ? 'bg-[var(--navy-800)] text-[var(--blue-400)] font-semibold border-l-2 border-[var(--blue-500)]'
                            : 'text-slate-400 hover:text-white hover:bg-[var(--navy-800)] font-medium border-l-2 border-transparent'
                        )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={clsx("w-4 h-4 transition-colors", isActive ? "text-[var(--blue-400)]" : "text-slate-400 group-hover:text-white")} />
                                <span>{item.label}</span>
                            </>
                        )}
                    </NavLink>
                    ))}
                </div>
            </>
        )}

        {/* 4. SYSTEM */}
        {showSystem && (
            <>
                <p className="text-slate-500 text-[10px] font-bold tracking-[0.1em] uppercase px-6 pt-6 pb-[6px]">System</p>
                <div className="px-2 space-y-1">
                    <NavLink
                        to="/system"
                        className={({ isActive }) =>
                        clsx(
                            'flex items-center gap-3 px-4 py-2 text-[13px] rounded-lg mx-1 transition-all duration-150 group',
                            isActive
                            ? 'bg-[var(--navy-800)] text-[var(--blue-400)] font-semibold border-l-2 border-[var(--blue-500)]'
                            : 'text-slate-400 hover:text-white hover:bg-[var(--navy-800)] font-medium border-l-2 border-transparent'
                        )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Settings className={clsx("w-4 h-4 transition-colors", isActive ? "text-[var(--blue-400)]" : "text-slate-400 group-hover:text-white")} />
                                <span>Options</span>
                            </>
                        )}
                    </NavLink>
                </div>
            </>
        )}
      </nav>
    </aside>
  );
};


export default Sidebar;

