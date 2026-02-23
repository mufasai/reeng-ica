import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { projects as initialProjects, sites, teams, type Project } from '../data/mockData';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { 
    Plus
} from 'lucide-react';
import clsx from 'clsx';
import NewProjectModal from '../components/modals/NewProjectModal';
import { 
    TableContainer, 
    FilterBar, 
    DataTable, 
    TableHeader, 
    TableHead, 
    TableBody, 
    TableRow, 
    TableCell, 
    ActionButton, 
    Pagination, 
    EmptyState 
} from '../components/common/Table';

const ProjectList = () => {
  const { currentUser, can } = useAuth();
  const navigate = useNavigate();

  // State for Projects (to allow adding new ones in mock)
  const [projectList, setProjectList] = useState<Project[]>(initialProjects);
  
  // State for Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Standardize to 10
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Get Data based on Role
  const rawProjects = useMemo(() => {
    if (currentUser.role === 'engineer') return []; // Should be redirected, but for safety

    if (currentUser.role === 'management' || currentUser.role === 'finance') {
        return projectList;
    } 
    
    // For Team Leader
    const userTeams = teams.filter(t => t.members.some(m => m.personId === currentUser.id));
    const projectIds = userTeams.map(t => t.projectId);
    return projectList.filter(p => projectIds.includes(p.id));
  }, [currentUser, projectList]);

  // 2. Filter & Search
  const filteredProjects = useMemo(() => {
      return rawProjects.filter(project => {
          const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                project.type.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesStatus = statusFilter ? project.status === statusFilter : true;
          return matchesSearch && matchesStatus;
      });
  }, [rawProjects, searchTerm, statusFilter]);

  // 3. Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = filteredProjects.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );
  
  // RBAC: Redirect Engineer
  if (currentUser.role === 'engineer') {
      return <Navigate to="/" replace />;
  }

  // Helper to Aggregate Data
  const getProjectStats = (projectId: string) => {
      const projectSites = sites.filter(s => s.projectId === projectId);
      const projectTeams = teams.filter(t => t.projectId === projectId);
      const totalBudget = projectSites.reduce((sum, site) => sum + site.budget, 0);
      
      return {
          sitesCount: projectSites.length,
          teamsCount: projectTeams.length,
          totalBudget,
          location: projectSites[0]?.location || 'Jakarta HQ'
      };
  };

  const handleCreateProject = (newProject: Project) => {
      setProjectList([...projectList, newProject]);
      navigate(`/projects/${newProject.id}`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="page-header kpi-glow-bg z-10 relative flex justify-between items-center !pt-0 !px-0">
        <div>
            <h1 className="page-title">All Projects</h1>
            <p className="subtitle mt-1">Manage and monitor all reengineering projects.</p>
        </div>
        {can('edit_project') && (
            <button 
                onClick={() => setIsModalOpen(true)}
                className="btn-primary flex items-center gap-2"
            >
                <Plus className="w-4 h-4" />
                New Project
            </button>
        )}
      </div>

      <TableContainer>
          <FilterBar 
            searchValue={searchTerm}
            onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            searchPlaceholder="Cari project..."
            statusOptions={[
                { label: 'Active', value: 'active' },
                { label: 'Completed', value: 'completed' },
                { label: 'Hold', value: 'hold' },
            ]}
            statusValue={statusFilter}
            onStatusChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
            showDateRange={true}
            onExport={(type) => console.log('Exporting', type)}
          />

          <DataTable>
              <TableHeader>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead sortable>Project Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Sites</TableHead>
                  <TableHead className="text-center">Teams</TableHead>
                  <TableHead sortable>Total Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableHeader>
              <TableBody>
                  {paginatedProjects.length === 0 ? (
                      <tr>
                        <td colSpan={9}>
                            <EmptyState 
                                message={searchTerm || statusFilter ? "Tidak ada hasil ditemukan" : "Belum ada project"}
                                subMessage={searchTerm || statusFilter ? "Coba reset filter atau gunakan kata kunci lain." : "Silakan buat project baru untuk memulai."}
                                onReset={() => { setSearchTerm(''); setStatusFilter(''); }}
                            />
                        </td>
                      </tr>
                  ) : (
                      paginatedProjects.map((project) => {
                          const stats = getProjectStats(project.id);
                          return (
                              <TableRow key={project.id}>
                                  <TableCell className="font-mono text-xs text-[var(--text-muted)]">#{project.id}</TableCell>
                                  <TableCell>
                                      <Link to={`/projects/${project.id}`} className="font-semibold text-[var(--blue-400)] hover:text-[var(--blue-300)] hover:underline">
                                          {project.name}
                                      </Link>
                                  </TableCell>
                                  <TableCell>
                                      <span className={clsx(
                                          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border",
                                          project.type === 'FILTER' ? 'bg-purple-900/20 text-purple-400 border-purple-500/30' :
                                          project.type === 'COMBAT' ? 'bg-orange-900/20 text-orange-400 border-orange-500/30' :
                                          project.type === 'BLACKSITE' ? 'bg-red-900/20 text-red-400 border-red-500/30' :
                                          project.type === 'L2H' ? 'bg-blue-900/20 text-blue-400 border-blue-500/30' :
                                          'bg-green-900/20 text-green-400 border-green-500/30'
                                      )}>
                                          {project.type}
                                      </span>
                                  </TableCell>
                                  <TableCell className="text-[var(--text-secondary)]">{stats.location}</TableCell>
                                  <TableCell className="text-center">
                                      <span className="bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-primary)] px-2 py-0.5 rounded-full text-xs font-medium">{stats.sitesCount}</span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                      <span className="bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-primary)] px-2 py-0.5 rounded-full text-xs font-medium">{stats.teamsCount}</span>
                                  </TableCell>
                                  <TableCell className="font-medium text-[var(--text-primary)]">
                                      Rp {stats.totalBudget.toLocaleString('id-ID')}
                                  </TableCell>
                                  <TableCell>
                                      <span className={clsx(
                                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                          project.status === 'active' ? 'bg-[var(--emerald-500)]/10 text-[var(--emerald-400)] border-[var(--emerald-500)]/20' :
                                          project.status === 'completed' ? 'bg-[var(--blue-500)]/10 text-[var(--blue-400)] border-[var(--blue-500)]/20' :
                                          'bg-[var(--glass-bg-hover)] text-[var(--text-muted)] border-[var(--glass-border)]'
                                      )}>
                                          <span className={clsx("w-1.5 h-1.5 rounded-full",
                                              project.status === 'active' ? 'bg-[var(--emerald-500)]' :
                                              project.status === 'completed' ? 'bg-[var(--blue-500)]' :
                                              'bg-[var(--text-muted)]'
                                          )}></span>
                                          {project.status.replace('_', ' ')}
                                      </span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-2">
                                          <ActionButton type="view" onClick={() => navigate(`/projects/${project.id}`)} />
                                          {can('edit_project') && <ActionButton type="edit" />}
                                          {can('delete_data') && <ActionButton type="delete" />}
                                      </div>
                                  </TableCell>
                              </TableRow>
                          );
                      })
                  )}
              </TableBody>
          </DataTable>

          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProjects.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
      </TableContainer>

      <NewProjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
};

export default ProjectList;
