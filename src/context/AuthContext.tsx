
import { createContext, useContext, useState, type ReactNode } from 'react';
import { type User, USERS, type UserRole, teams, projects, type Project } from '../data/mockData';

interface AuthContextType {
  currentUser: User;
  switchRole: (role: UserRole) => void;
  can: (action: string) => boolean;
  getVisibleProjects: () => Project[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Default to Management for initial view, as requested/implied
  const [currentUser, setCurrentUser] = useState<User>(USERS.find(u => u.role === 'management') || USERS[0]);

  const switchRole = (role: UserRole) => {
    const user = USERS.find(u => u.role === role);
    if (user) {
      setCurrentUser(user);
    }
  };

  const can = (action: string): boolean => {
    const role = currentUser.role;

    switch (action) {
      case 'view_dashboard_all': 
        return role === 'backoffice_admin' || role === 'finance' || role === 'management';
      
      case 'view_financials':
        // Team Leader sees own, others see all
        return role === 'team_leader' || role === 'backoffice_admin' || role === 'finance' || role === 'management';

      case 'upload_evidence': 
        return role === 'engineer' || role === 'team_leader' || role === 'backoffice_admin' || role === 'management';

      case 'upload_docs': 
        return role === 'team_leader' || role === 'backoffice_admin' || role === 'management';

      case 'submit_request': 
        return role === 'team_leader' || role === 'backoffice_admin' || role === 'management';

      case 'approve_request': 
        return role === 'management';

      case 'process_payment': // Mark paid & Upload bukti
        return role === 'finance';

      case 'manage_data': // Add/Edit/Delete Sites, People, Teams, Projects
      case 'edit_project':
        return role === 'backoffice_admin' || role === 'management';

      case 'export_data': 
        return role === 'backoffice_admin' || role === 'finance' || role === 'management';

      default: return false;
    }
  };

  const getVisibleProjects = () => {
    // Backoffice, Finance, Management see ALL active projects
    if (currentUser.role === 'management' || currentUser.role === 'finance' || currentUser.role === 'backoffice_admin') {
        return projects.filter(p => p.status === 'active');
    }

    // Engineer & Team Leader see only projects their team is assigned to
    const userTeams = teams.filter(t => t.members.some(m => m.personId === currentUser.id));
    const projectIds = userTeams.map(t => t.projectId);

    return projects.filter(p => p.status === 'active' && projectIds.includes(p.id));
  };

  return (
    <AuthContext.Provider value={{ currentUser, switchRole, can, getVisibleProjects }}>
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
