import { useParams, Link } from 'react-router-dom';
import { Tooltip } from '../components/common/Tooltip';
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  Briefcase, 
  Activity, 
  Layers,
  Wallet, 
  TrendingUp, 
  ShieldCheck, 
  Clock 
} from 'lucide-react';
import { 
    projects, 
    sites as initialSites, 
    teams, 
    files as initialFiles, 
    type Site, 
    type ProjectFile,
    termins,
    siteCosts, 
    filterTerms, 
    combatTerms
} from '../data/mockData';
import FilterFlow from '../components/flows/FilterFlow';
import CombatFlow from '../components/flows/CombatFlow';
// import BlacksiteFlow from '../components/flows/BlacksiteFlow';
// import L2HFlow from '../components/flows/L2HFlow';
// import RefinenFlow from '../components/flows/RefinenFlow';
// Project detail flows
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import ProjectSitesTable from '../components/tables/ProjectSitesTable';
import ProjectFilesTable from '../components/tables/ProjectFilesTable';
import AddSiteModal from '../components/modals/AddSiteModal';
import KPICard from '../components/stats/KPICard';

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser, can } = useAuth();
  
  // Local State for Mock Data mutations
  const [projectSites, setProjectSites] = useState<Site[]>(initialSites.filter(s => s.projectId === id));
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>(initialFiles.filter(f => f.projectId === id));
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);

  const project = projects.find((p) => p.id === id);
  const projectTermins = termins.filter(t => t.projectId === id);

  if (!project) {
    return <div className="p-8 text-center text-slate-500">Project not found</div>;
  }
  
  // RBAC Access Check (Engineer should see dashboard but LIMITED)
  // Logic is handled in components mostly.
  
  // --- STATS CALCULATION ---
  // --- STATS CALCULATION (ENHANCED) ---
  const filteredTeams = teams.filter(t => t.projectId === id);
  const totalPeople = filteredTeams.reduce((sum, t) => sum + t.members.length, 0); 
  
  // 1. Total Budget
  const totalBudget = project.budget || projectSites.reduce((sum, s) => sum + s.budget, 0);

  // 2. Used Budget & 3. Pending Approval
  // Aggregate from all cost sources related to this project's sites
  let usedAmount = 0;
  let pendingAmount = 0;
  let pendingCount = 0;

  const projectSiteIds = projectSites.map(s => s.id);

  // A. From SiteCosts (Generic/Misc)
  
  siteCosts.forEach(c => {
      if (projectSiteIds.includes(c.siteId)) {
        if (c.status === 'paid') usedAmount += c.jumlahPembayaran;
        else if (c.status === 'approved') usedAmount += c.jumlahPengajuan; // Committed
        else if (c.status === 'pengajuan') {
            pendingAmount += c.jumlahPengajuan;
            pendingCount++;
        }
      }
  });

  // B. From FilterTerms
  filterTerms.forEach(t => {
      if (projectSiteIds.includes(t.siteId)) {
        if (t.status === 'paid') usedAmount += (t.amountPaid || 0);
        else if (t.status === 'approved') usedAmount += (t.amountRequest || 0);
        else if (t.status === 'pengajuan') {
            pendingAmount += (t.amountRequest || 0);
            pendingCount++;
        }
      }
  });

  // C. From CombatTerms
  combatTerms.forEach(term => {
      if (projectSiteIds.includes(term.siteId)) {
          term.subSteps.forEach(sub => {
              if (sub.status === 'paid') usedAmount += (sub.amountPaid || 0);
              else if (sub.status === 'approved') usedAmount += (sub.amountApproved || 0);
              else if (sub.status === 'submitted') {
                  pendingAmount += sub.maxAmount; // Estimate using maxAmount
                  pendingCount++;
              }
          });
      }
  });

  const remainingBudget = totalBudget - usedAmount;
  const usedPercentage = totalBudget > 0 ? (usedAmount / totalBudget) * 100 : 0;
  const remainingPercentage = totalBudget > 0 ? (remainingBudget / totalBudget) * 100 : 0;

  // Colors
  const colors = {
      blue: 'var(--blue-500)',
      amber: 'var(--amber-500)',
      emerald: 'var(--emerald-500)',
      coral: 'var(--coral-500)',
      navy: 'var(--bg-base)',
      slate: 'var(--text-muted)'
  };

  const isLowBudget = remainingPercentage < 20;

  // Mock "Last Process" text
  const lastProcess = project.status === 'completed' ? 'Project Closed' : 'Termin 2 Review';

  // --- ACTIONS ---
  const handleAddSite = (site: Site) => {
      setProjectSites([...projectSites, site]);
  };

  const handleDeleteSite = (siteId: string) => {
      setProjectSites(projectSites.filter(s => s.id !== siteId));
  };
  
  // Need to handle Edit (Mock just logs)
  const handleEditSite = (site: Site) => {
      console.log('Edit site', site);
      // In real app, open modal with data
  };

  const handleDeleteFile = (fileId: string) => {
      setProjectFiles(projectFiles.filter(f => f.id !== fileId));
  };


  // --- RENDER HELPERS ---
  const renderFlow = () => {
    switch (project.type) {
      case 'FILTER': return <FilterFlow termins={projectTermins} />;
      case 'COMBAT': return <CombatFlow termins={projectTermins} />;
      // case 'BLACKSITE': return <BlacksiteFlow />;
      // case 'L2H': return <L2HFlow />;
      // case 'REFINEN': return <RefinenFlow />;
      default: return <div className="text-slate-500 italic">No flow visualization available</div>;
    }
  };

  

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      
      {/* 1. HEADER & KPI STATS */}
      <div className="space-y-6">
          <div className="page-header kpi-glow-bg z-10 relative flex items-center gap-4 !pt-0 !px-0">
              <Link to="/projects" className="p-3 bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border-active)] transition-colors shadow-sm">
                  <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                  <h1 className="page-title">Dashboard Project</h1>
                  <p className="subtitle">
                      <span className="font-semibold text-[var(--text-primary)]">{project.name}</span> • {project.type}
                  </p>
              </div>
          </div>

          {/* PRIMARY KPI CARDS */}
          {currentUser.role !== 'engineer' && (
             <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 relative z-10">
                {/* 1. Total Budget */}
                <KPICard 
                    label="Total Budget"
                    value={`Rp ${totalBudget.toLocaleString('id-ID')}`}
                    subLabel="Nilai kontrak keseluruhan"
                    icon={Wallet}
                    accentColor={colors.blue}
                    iconColor={colors.blue}
                />

                {/* 2. Used Budget */}
                <KPICard 
                    label="Budget Terpakai"
                    value={`Rp ${usedAmount.toLocaleString('id-ID')}`}
                    subLabel={`${usedPercentage.toFixed(1)}% dari total budget`}
                    icon={TrendingUp}
                    accentColor={colors.amber}
                    iconColor={colors.amber}
                    progress={{
                        value: usedPercentage,
                        color: usedPercentage > 80 ? colors.coral : colors.amber
                    }}
                />

                {/* 3. Remaining Budget */}
                <KPICard 
                    label="Sisa Budget"
                    value={`Rp ${remainingBudget.toLocaleString('id-ID')}`}
                    subLabel="Tersedia untuk pengajuan cost"
                    icon={ShieldCheck}
                    accentColor={isLowBudget ? colors.coral : colors.emerald}
                    iconColor={isLowBudget ? colors.coral : colors.emerald}
                />

                {/* 4. Pending Approval */}
                <KPICard 
                    label="Menunggu Approval"
                    value={pendingCount.toString()}
                    subLabel={`Rp ${pendingAmount.toLocaleString('id-ID')} pending`}
                    icon={Clock}
                    accentColor={colors.amber}
                    iconColor={colors.amber}
                    isPulsing={pendingCount > 0}
                    onClick={() => {
                        // Scroll or filter logic would go here
                        console.log("Filter pending terms");
                    }}
                    className="cursor-pointer"
                />
             </div>
          )}

          {/* SECONDARY STATS ROW */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
              <div className="card-kpi !p-4 flex flex-row items-center justify-between">
                 <div>
                    <p className="kpi-label mb-1">Total Sites</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{projectSites.length}</p>
                 </div>
                 <div className="p-2 bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-muted)] rounded-lg">
                     <MapPin className="w-5 h-5" />
                 </div>
              </div>
              <div className="card-kpi !p-4 flex flex-row items-center justify-between">
                 <div>
                    <p className="kpi-label mb-1">Total Teams</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{filteredTeams.length}</p>
                 </div>
                 <div className="p-2 bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-muted)] rounded-lg">
                     <Users className="w-5 h-5" />
                 </div>
              </div>
               <div className="card-kpi !p-4 flex flex-row items-center justify-between">
                 <div>
                    <p className="kpi-label mb-1">Total People</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{totalPeople}</p>
                 </div>
                 <div className="p-2 bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-muted)] rounded-lg">
                     <Briefcase className="w-5 h-5" />
                 </div>
              </div>
               <div className="card-kpi !p-4 flex flex-row items-center justify-between">
                 <div>
                    <p className="kpi-label mb-1">Last Process</p>
                    <p className="text-sm font-bold text-[var(--text-primary)] truncate max-w-[120px]" title={lastProcess}>{lastProcess}</p>
                 </div>
                 <div className="p-2 bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-muted)] rounded-lg">
                     <Activity className="w-5 h-5" />
                 </div>
              </div>
          </div>
      </div>

      {/* 2. SITES & WORKFLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          {/* Main Content: Sites Table (Takes 2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
              
              <div className="flex items-center justify-between">
                  <h2 className="section-header !mb-0 !text-[18px]">
                      <Layers className="w-5 h-5 text-[var(--text-muted)]" />
                      Sites & Progress
                  </h2>

                  {can('edit_project') && (
                      <Tooltip content="Create a new site for this project">
                      <button 
                        onClick={() => setIsSiteModalOpen(true)}
                        className="btn-primary"
                      >
                          + Add Site
                      </button>
                      </Tooltip>
                  )}
              </div>

              <ProjectSitesTable 
                  sites={projectSites} 
                  onEdit={handleEditSite}
                  onDelete={handleDeleteSite} 
              />
              
              <div className="pt-4">
                 <h3 className="kpi-label mb-4">Workflow Visualization</h3>
                 <div className="overflow-x-auto pb-4 custom-scrollbar">
                    {renderFlow()}
                 </div>
              </div>
          </div>

          {/* Sidebar Content: Files & Team (Takes 1/3 width) */}
          <div className="space-y-8">
              {/* Files */}
              <ProjectFilesTable 
                  files={projectFiles} 
                  onDelete={handleDeleteFile} 
              />
              
              {/* Team Summary (Mini) */}
              <div className="card !p-5">
                  <h3 className="section-header !text-[15px]">
                      <Users className="w-4 h-4 text-[var(--text-muted)]" />
                      Active Teams
                  </h3>
                  <div className="space-y-3">
                      {filteredTeams.length === 0 ? (
                          <div className="text-sm text-[var(--text-muted)] italic">No teams assigned.</div>
                      ) : filteredTeams.map(team => (
                          <div key={team.id} className="flex items-center justify-between text-sm pb-2 border-b border-[var(--glass-border)] last:border-0 last:pb-0">
                              <span className="font-medium text-[var(--text-primary)]">{team.name}</span>
                              <span className="bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full text-xs">
                                  {team.members.length} members
                              </span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      <AddSiteModal 
        isOpen={isSiteModalOpen} 
        onClose={() => setIsSiteModalOpen(false)}
        onAdd={handleAddSite}
        projectId={id || ''}
      />
    </div>
  );
};

export default ProjectDetail;
