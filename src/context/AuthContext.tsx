import { createContext, useContext, useState, type ReactNode } from 'react';
import { type User, USERS, type UserRole, teams, projects, type Project } from '../data/mockData';

// ─── RBAC Permission Matrix ─────────────────────────────────────────────────
const PERMISSIONS: Record<string, UserRole[]> = {
  // DASHBOARD
  'dashboard.view':               ['director', 'operational', 'admin', 'finance', 'field', 'management', 'backoffice'],
  'dashboard.financial_kpi':      ['director', 'operational', 'admin', 'finance', 'management'],
  'dashboard.pengajuan_review':   ['director', 'operational', 'admin', 'finance', 'management'],

  // SITES
  'site.view_list':               ['director', 'operational', 'admin', 'finance', 'management', 'backoffice'],
  'site.view_detail':             ['director', 'operational', 'admin', 'finance', 'management', 'backoffice'],
  'site.update_stage':            ['director', 'operational', 'admin'],
  'site.bulk_update':             ['director', 'operational', 'admin'],
  'site.edit_data':               ['director', 'operational', 'admin'],
  'site.delete':                  ['operational'],
  'site.assign_team':             ['operational', 'admin'],

  // STAGE-SPECIFIC
  'stage.update_cico_rfi_rfs':    ['operational', 'admin'],
  'stage.report_issue':           ['operational', 'admin', 'field'],

  // MATERIAL
  'material.view':                ['director', 'operational', 'admin', 'finance', 'management'],
  'material.add':                 ['operational', 'admin'],

  // FINANCIAL / PEMBAYARAN
  'financial.view_termin_status': ['director', 'operational', 'admin', 'finance', 'management'],
  'financial.view_rp_amounts':    ['director', 'operational', 'admin', 'finance', 'management'],
  'financial.submit_pengajuan':   ['operational', 'admin'],         // create payment request
  'financial.approve_pengajuan':  ['director'],                     // director approves
  'financial.reject_pengajuan':   ['director'],
  'financial.mark_paid':          ['finance'],                      // finance sends receipt

  // PEOPLE & TEAMS
  'people.view':                  ['director', 'operational', 'admin', 'management'],
  'teams.view':                   ['director', 'operational', 'admin', 'management'],
  'people.manage':                ['director', 'operational', 'admin'],

  // SYSTEM
  'system.manage_users':          ['director', 'admin'],

  // Legacy keys (backward compat)
  'view_dashboard_all':           ['director', 'operational', 'admin', 'finance', 'management'],
  'view_financials':              ['director', 'operational', 'admin', 'finance', 'management'],
  'upload_evidence':              ['field', 'operational', 'admin'],
  'upload_docs':                  ['operational', 'admin'],
  'submit_request':               ['operational', 'admin'],
  'approve_request':              ['director'],
  'process_payment':              ['finance'],
  'manage_data':                  ['operational', 'admin'],
  'edit_project':                 ['operational', 'admin'],
  'export_data':                  ['director', 'operational', 'admin', 'finance', 'management'],
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
  // Restore session from localStorage
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
    if (['director', 'admin', 'finance', 'operational', 'management', 'backoffice'].includes(currentUser.role)) {
      return projects.filter(p => p.status === 'active');
    }
    const userTeams = teams.filter(t => t.members?.some(m => m.person_id === currentUser.id));
    return projects.filter(p => p.status === 'active');
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
