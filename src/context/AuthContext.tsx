
import { createContext, useContext, useState, type ReactNode } from 'react';
import { type User, USERS, type UserRole, teams, projects, type Project } from '../data/mockData';

// ─── Final Confirmed RBAC Permission Matrix (March 2026) ───────────────────────
const PERMISSIONS: Record<string, UserRole[]> = {
  // ─── DASHBOARD ──────────────────────────────────────────────────────────────
  'dashboard.view':               ['director', 'operational', 'admin', 'finance', 'field'],
  'dashboard.status_lapangan':    ['director', 'operational', 'admin', 'finance', 'field'],
  'dashboard.financial_kpi':      ['director', 'operational', 'admin', 'finance'],
  'dashboard.butuh_tindakan':     ['director', 'operational', 'admin', 'finance', 'field'],
  'dashboard.pengajuan_review':   ['director', 'operational', 'admin', 'finance'],
  'dashboard.peta_sites':         ['director', 'operational', 'admin', 'finance', 'field'],
  'dashboard.aktivitas_terbaru':  ['director', 'operational', 'admin', 'finance'],

  // ─── SITES ──────────────────────────────────────────────────────────────────
  // Note: field role sees only their team's sites (enforced separately by team_id filter)
  'site.view_list':               ['director', 'operational', 'admin', 'finance'],
  'site.view_import_history':     ['director', 'operational', 'admin', 'finance'],
  'site.view_detail':             ['director', 'operational', 'admin', 'finance'],
  'site.update_stage':            ['director', 'operational', 'admin', 'finance'],
  'site.bulk_update':             ['director', 'operational', 'admin'],
  'site.import_boq':              ['director', 'operational', 'admin'],
  'site.import_review':           ['operational', 'admin'],
  'site.edit_data':               ['director', 'operational', 'admin'],
  'site.delete':                  ['operational'],
  'site.assign_team':             ['operational', 'admin'],

  // ─── STAGE-SPECIFIC ─────────────────────────────────────────────────────────
  'stage.imported_to_assigned':   ['operational', 'admin'],
  'stage.assigned_to_permit':     ['operational', 'admin'],
  'stage.permit_to_akses':        ['operational', 'admin'],
  'stage.akses_to_implementasi':  ['operational', 'admin'],
  'stage.update_cico_rfi_rfs':    ['operational', 'admin'],
  'stage.dokumen_to_bast':        ['operational', 'admin'],
  'stage.bast_to_invoice':        ['operational', 'admin'],
  'stage.report_issue':           ['operational', 'admin'],

  // ─── MATERIAL ───────────────────────────────────────────────────────────────
  // Note: field role sees own site only (enforced separately)
  'material.view':                ['director', 'operational', 'admin', 'finance'],
  'material.add':                 ['operational', 'admin'],
  'material.edit_status':         ['operational', 'admin'],

  // ─── FINANCIAL ──────────────────────────────────────────────────────────────
  'financial.view_termin_status': ['director', 'operational', 'admin', 'finance'],
  'financial.view_rp_amounts':    ['director', 'operational', 'admin', 'finance'],
  'financial.submit_pengajuan':   ['operational', 'admin'],
  'financial.approve_pengajuan':  ['director', 'finance'],
  'financial.reject_pengajuan':   ['director', 'finance'],
  'financial.mark_paid':          ['finance'],

  // ─── PEOPLE & TEAMS ─────────────────────────────────────────────────────────
  'people.view':                  ['director', 'operational', 'admin'],
  'teams.view':                   ['director', 'operational', 'admin'],
  'people.manage':                ['director', 'operational', 'admin'],
  'teams.manage':                 ['director', 'operational', 'admin'],
  'people.delete':                ['director', 'operational'],

  // ─── SYSTEM ─────────────────────────────────────────────────────────────────
  'system.options':               ['director', 'operational', 'admin'],
  'system.manage_users':          ['director', 'operational', 'admin'],
  'system.assign_roles':          ['director', 'operational', 'admin'],

  // ─── LEGACY KEYS (backward compat with existing can() call-sites) ───────────
  'view_dashboard_all':           ['director', 'operational', 'admin', 'finance'],
  'view_financials':              ['director', 'operational', 'admin', 'finance'],
  'upload_evidence':              ['field', 'operational', 'admin'],
  'upload_docs':                  ['operational', 'admin'],
  'submit_request':               ['operational', 'admin'],
  'approve_request':              ['director'],
  'process_payment':              ['finance'],
  'manage_data':                  ['operational', 'admin'],
  'edit_project':                 ['operational', 'admin'],
  'export_data':                  ['director', 'operational', 'admin', 'finance'],
};

interface AuthContextType {
  currentUser: User;
  switchRole: (role: UserRole) => void;
  can: (action: string) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  getVisibleProjects: () => Project[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User>(
    USERS.find(u => u.role === 'director') || USERS[0]
  );

  const switchRole = (role: UserRole) => {
    const user = USERS.find(u => u.role === role);
    if (user) setCurrentUser(user);
  };

  /** Check if the current user has a specific permission key */
  const can = (action: string): boolean => {
    const allowed = PERMISSIONS[action];
    if (!allowed) return false;
    return allowed.includes(currentUser.role);
  };

  /** Check if the current user's role is any of the provided roles */
  const hasRole = (...roles: UserRole[]): boolean =>
    roles.includes(currentUser.role);

  const getVisibleProjects = () => {
    // Director, Admin, Finance, Operational see ALL active projects
    if (['director', 'admin', 'finance', 'operational'].includes(currentUser.role)) {
      return projects.filter(p => p.status === 'active');
    }
    // Field: only projects their team is assigned to
    const userTeams = teams.filter(t => t.members.some(m => m.personId === currentUser.id));
    const projectIds = userTeams.map(t => t.projectId);
    return projects.filter(p => p.status === 'active' && projectIds.includes(p.id));
  };

  return (
    <AuthContext.Provider value={{ currentUser, switchRole, can, hasRole, getVisibleProjects }}>
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
