import { createContext, useContext, useState, type ReactNode } from 'react';
import { type User, USERS, type UserRole, teams, projects, type Project } from '../data/mockData';

// ─── RBAC Permission Matrix ─────────────────────────────────────────────────
const PERMISSIONS: Record<string, UserRole[]> = {
  // DASHBOARD
  'dashboard.view':               ['system_admin', 'director', 'operational', 'finance', 'field_engineer'],
  'dashboard.financial_kpi':      ['system_admin', 'director', 'operational', 'finance'],
  'dashboard.pengajuan_review':   ['system_admin', 'director', 'operational', 'finance'],

  // SITES
  'site.view_list':               ['system_admin', 'director', 'operational', 'finance', 'field_engineer'],
  'site.view_detail':             ['system_admin', 'director', 'operational', 'finance', 'field_engineer'],
  'site.update_stage':            ['system_admin', 'director', 'operational'],
  'site.bulk_update':             ['system_admin', 'director', 'operational'],
  'site.edit_data':               ['system_admin', 'director', 'operational'],
  'site.delete':                  ['system_admin', 'operational'],
  'site.assign_team':             ['system_admin', 'operational'],

  // STAGE-SPECIFIC
  'stage.update_cico_rfi_rfs':    ['system_admin', 'operational'],
  'stage.report_issue':           ['system_admin', 'operational', 'field_engineer'],

  // MATERIAL
  'material.view':                ['system_admin', 'director', 'operational', 'finance'],
  'material.add':                 ['system_admin', 'operational'],

  // FINANCIAL / PEMBAYARAN
  'financial.view_termin_status': ['system_admin', 'director', 'operational', 'finance'],
  'financial.view_rp_amounts':    ['system_admin', 'director', 'operational', 'finance'],
  'financial.submit_pengajuan':   ['system_admin', 'operational'],
  'financial.approve_pengajuan':  ['system_admin', 'director'],
  'financial.reject_pengajuan':   ['system_admin', 'director'],
  'financial.mark_paid':          ['system_admin', 'finance'],

  // PEOPLE & TEAMS
  'people.view':                  ['system_admin', 'director', 'operational'],
  'teams.view':                   ['system_admin', 'director', 'operational'],
  'people.manage':                ['system_admin', 'director', 'operational'],

  // SYSTEM
  'system.manage_users':          ['system_admin', 'director'],
  'system.manage_roles':          ['system_admin'],

  // Legacy keys (backward compat)
  'view_dashboard_all':           ['system_admin', 'director', 'operational', 'finance'],
  'view_financials':              ['system_admin', 'director', 'operational', 'finance'],
  'upload_evidence':              ['system_admin', 'field_engineer', 'operational'],
  'upload_docs':                  ['system_admin', 'operational'],
  'submit_request':               ['system_admin', 'operational'],
  'approve_request':              ['system_admin', 'director'],
  'process_payment':              ['system_admin', 'finance'],
  'manage_data':                  ['system_admin', 'operational'],
  'edit_project':                 ['system_admin', 'operational'],
  'export_data':                  ['system_admin', 'director', 'operational', 'finance'],
};

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  switchRole: (role: UserRole) => void;
  can: (action: string) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  getVisibleProjects: () => Project[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'smartelco_session_user_id';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedId = localStorage.getItem(SESSION_KEY);
    if (savedId) {
      return USERS.find(u => u.id === savedId) || null;
    }
    return null;
  });

  const isAuthenticated = currentUser !== null;

  const login = (email: string, password: string) => {
    const user = USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) {
      return { success: false, error: 'Email atau password salah.' };
    }
    setCurrentUser(user);
    localStorage.setItem(SESSION_KEY, user.id);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const switchRole = (role: UserRole) => {
    const user = USERS.find(u => u.role === role);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(SESSION_KEY, user.id);
    }
  };

  const can = (action: string): boolean => {
    if (!currentUser) return false;
    const allowed = PERMISSIONS[action];
    if (!allowed) return false;
    return allowed.includes(currentUser.role);
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return roles.includes(currentUser.role);
  };

  const getVisibleProjects = () => {
    if (!currentUser) return [];
    if (['system_admin', 'director', 'finance', 'operational'].includes(currentUser.role)) {
      return projects.filter(p => p.status === 'active');
    }
    const visibleTeams = teams.filter(t => t.members?.some(m => m.person_id === currentUser.id));
    const projectIds = visibleTeams.map(t => (t as any).projectId).filter(Boolean);
    return projects.filter(p => projectIds.includes(p.id) && p.status === 'active');
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated, login, logout, switchRole, can, hasRole, getVisibleProjects }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
