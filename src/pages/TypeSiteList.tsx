import { useParams, Navigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { 
  FolderKanban, 
  MapPin, 
  Activity,
  Layers
} from 'lucide-react';
import { 
  projects, 
  sites, 
  filterTerms,
  combatTerms,
  type ProjectType,
  teams,
  type Site
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import ProjectSitesTable from '../components/tables/ProjectSitesTable';

const TypeSiteList = () => {
  const { type } = useParams<{ type: string }>();
  const { currentUser } = useAuth();
  const [filterState, setFilterState] = useState<{ step: number | null, statusGroup: string | null }>({ step: null, statusGroup: null });
  
  // 1. Data Validation & Formatting
  const upperType = type?.toUpperCase() as ProjectType;
  const validTypes: ProjectType[] = ['FILTER', 'COMBAT', 'BLACKSITE', 'L2H', 'REFINEN'];
  
  if (!upperType || !validTypes.includes(upperType)) {
    return <Navigate to="/projects" replace />;
  }

  // 2. Fetch Relevant Projects & Sites
  const matchedProjects = useMemo(() => projects.filter(p => p.type === upperType), [upperType]);
  const matchedProjectIds = matchedProjects.map(p => p.id);

  const matchedSites = useMemo(() => {
    let baseSites = sites.filter(s => matchedProjectIds.includes(s.projectId));

    // Role-based filtering
    if (['engineer', 'team_leader'].includes(currentUser.role)) {
      const userTeamIds = teams
        .filter(t => t.members.some(m => m.personId === currentUser.id))
        .map(t => t.id);
      
      baseSites = baseSites.filter(s => s.teamId && userTeamIds.includes(s.teamId));
    }
    return baseSites;
  }, [matchedProjectIds, currentUser]);


  // 3. Dynamic Stats Calculation based on Type
  const calculateStats = () => {
      // 1. Total Sites
      const activeSitesCount = matchedSites.length;
      const completedSitesCount = matchedSites.filter(s => {
          if (upperType === 'FILTER') {
              const terms = filterTerms.filter(t => t.siteId === s.id);
              return terms.length > 0 && terms.every(t => t.status === 'paid');
          }
          if (upperType === 'COMBAT') {
              const terms = combatTerms.filter(t => t.siteId === s.id);
              return terms.length > 0 && terms.every(t => t.status === 'completed');
          }
          return false;
      }).length;

      // 2. Total Teams
      const uniqueTeamIds = Array.from(new Set(matchedSites.filter(s => !!s.teamId).map(s => s.teamId!)));
      const totalTeams = uniqueTeamIds.length;

      // 3. Total People
      const uniquePeopleIds = new Set<string>();
      uniqueTeamIds.forEach(tId => {
          const team = teams.find(t => t.id === tId);
          if (team) {
              team.members.forEach(m => uniquePeopleIds.add(m.personId));
          }
      });
      const totalPeople = uniquePeopleIds.size;

      // 4. Menunggu Aksi
      let actionNeededCount = 0;
      let mostUrgentAction = '';

      matchedSites.forEach(site => {
          let hasUrgentAction = false;
          let urgentText = '';

          if (upperType === 'FILTER') {
              const terms = filterTerms.filter(t => t.siteId === site.id);
              const urgentTerm = terms.find(t => t.status === 'pengajuan' || t.status === 'pending_review');
              if (urgentTerm) {
                  hasUrgentAction = true;
                  urgentText = `${site.name} · ${urgentTerm.name} menunggu approval`;
              }
          } else if (upperType === 'COMBAT') {
               const terms = combatTerms.filter(t => t.siteId === site.id);
               // Find first term in progress
               const activeTerm = terms.find(t => t.status === 'in_progress');
               if (activeTerm) {
                   const urgentSubStep = activeTerm.subSteps.find(s => s.status === 'pengajuan' || s.status === 'pending_review');
                   if (urgentSubStep) {
                       hasUrgentAction = true;
                       urgentText = `${site.name} · ${urgentSubStep.name} menunggu approval`;
                   }
               }
          }

          if (hasUrgentAction) {
              actionNeededCount++;
              if (!mostUrgentAction) mostUrgentAction = urgentText;
          }
      });

      return {
          totalSites: activeSitesCount,
          completedSites: completedSitesCount,
          totalTeams,
          totalPeople,
          actionNeededCount,
          mostUrgentAction
      };
  };

  const statCards = calculateStats();

  // 4. Calculate Per-Termin Distribution Matrix
  const distributionMatrix = useMemo(() => {
      const siteIds = matchedSites.map(s => s.id);
      
      if (upperType === 'FILTER') {
          const matrix: Record<number, { title: string, paid: number, approved: number, pending: number, inProgress: number, locked: number }> = {
              1: { title: 'Termin 1 (30%)', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 },
              2: { title: 'Termin 2 (50%)', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 },
              3: { title: 'Termin 3 (10%)', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 },
              4: { title: 'Termin 4 (10%)', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 }
          };

          siteIds.forEach(id => {
              const terms = filterTerms.filter(t => t.siteId === id);
              terms.forEach(t => {
                  const m = matrix[t.step];
                  if (!m) return;

                  if (t.status === 'paid' || t.status === 'dibayarkan') m.paid++;
                  else if (t.status === 'approved' || t.status === 'diterima') m.approved++;
                  else if (t.status === 'pengajuan' || t.status === 'pending_review' || t.status === 'submitted') m.pending++;
                  else if (t.status === 'open' || t.status === 'rejected') m.inProgress++;
                  else m.locked++; // pending, locked
              });
          });

          return Object.entries(matrix).map(([step, data]) => ({ step: Number(step), ...data }));
      }

      if (upperType === 'COMBAT') {
          const matrix: Record<number, { title: string, paid: number, approved: number, pending: number, inProgress: number, locked: number }> = {
              1: { title: 'Phase 1: SITAC', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 },
              2: { title: 'Phase 2: Dimentle', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 },
              3: { title: 'Phase 3: Towing', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 },
              4: { title: 'Phase 4+: Install/Optim', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 }
          };

          siteIds.forEach(id => {
              const terms = combatTerms.filter(t => t.siteId === id);
              
              // Map 6 steps into 4 phases
              terms.forEach(t => {
                  let phaseId = t.step;
                  if (t.step >= 4) phaseId = 4;
                  
                  const m = matrix[phaseId];
                  if (!m) return;

                  // Evaluate the overall status of the Combat Term based on its subSteps
                  if (t.status === 'completed') m.paid++;
                  else if (t.status === 'in_progress') {
                      const hasPending = t.subSteps.some(s => s.status === 'pengajuan' || s.status === 'pending_review');
                      if (hasPending) {
                          m.pending++;
                      } else {
                          m.inProgress++;
                      }
                  } else {
                      m.locked++;
                  }
              });
          });

           return Object.entries(matrix).map(([step, data]) => ({ step: Number(step), ...data }));
      }

      return [];
  }, [matchedSites, upperType]);

  // 5. Apply Interactive Filters to Table
  const filteredTableSites = useMemo(() => {
      if (!filterState.step || !filterState.statusGroup) return matchedSites;

      return matchedSites.filter(site => {
          if (upperType === 'FILTER') {
              const term = filterTerms.find(t => t.siteId === site.id && t.step === filterState.step);
              if (!term) return false;
              
              switch (filterState.statusGroup) {
                  case 'paid': return term.status === 'paid' || term.status === 'dibayarkan';
                  case 'approved': return term.status === 'approved' || term.status === 'diterima';
                  case 'pending': return term.status === 'pengajuan' || term.status === 'pending_review' || term.status === 'submitted';
                  case 'inProgress': return term.status === 'open' || term.status === 'rejected';
                  case 'locked': return term.status === 'pending' || term.status === 'locked';
                  default: return false;
              }
          }
          if (upperType === 'COMBAT') {
               const terms = combatTerms.filter(t => t.siteId === site.id);
               // Combine 4-6 into phase 4
               const matchingTerms = filterState.step === 4 ? terms.filter(t => t.step >= 4) : terms.filter(t => t.step === filterState.step);
               if (matchingTerms.length === 0) return false;
               
               return matchingTerms.some(t => {
                   switch(filterState.statusGroup) {
                       case 'paid': return t.status === 'completed';
                       case 'pending': return t.status === 'in_progress' && t.subSteps.some(s => s.status === 'pengajuan' || s.status === 'pending_review');
                       case 'inProgress': return t.status === 'in_progress' && !t.subSteps.some(s => s.status === 'pengajuan' || s.status === 'pending_review');
                       case 'locked': return t.status === 'locked';
                       default: return false; // Note: 'approved' not cleanly mapped for top-level combat terms in this summary
                   }
               });
          }
          return true;
      });
  }, [matchedSites, filterState, upperType]);

  const handleEditSite = (site: Site) => { console.log('Edit site', site); };
  const handleDeleteSite = (siteId: string) => { console.log('Delete site', siteId); };

  const typeDetails = {
      'FILTER': { color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
      'COMBAT': { color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200' },
      'BLACKSITE': { color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
      'L2H': { color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
      'REFINEN': { color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  }[upperType];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      
      {/* 1. HEADER */}
      <div className="space-y-6">
          <div className="page-header kpi-glow-bg z-10 relative flex items-center gap-4 !pt-0 !px-0">
              <div className={`p-3 rounded-xl bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] shadow-sm`}>
                  <FolderKanban className={`w-8 h-8 ${typeDetails?.color.replace('text-', 'text-[var(--')}-400)]`} />
              </div>
              <div>
                  <h1 className="page-title flex items-center gap-2">
                      {upperType} Sites
                  </h1>
                  <p className="subtitle">
                      Overview and tracking for all active {upperType} specific deployments.
                  </p>
              </div>
          </div>

          {/* KPI CARDS */}
          {matchedSites.length > 0 && (
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative z-10">
                 <div className="card-kpi flex items-start gap-4">
                     <div className="p-3 bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--blue-400)] rounded-xl">
                         <MapPin className="w-6 h-6" />
                     </div>
                     <div>
                         <p className="kpi-label">Total Sites</p>
                         <h3 className="kpi-value">{statCards.totalSites}</h3>
                         <p className="kpi-sub">{statCards.totalSites} active, {statCards.completedSites} completed</p>
                     </div>
                 </div>

                 <div className="card-kpi flex items-start gap-4">
                     <div className="p-3 bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--purple-400)] rounded-xl">
                         <Layers className="w-6 h-6" />
                     </div>
                     <div>
                         <p className="kpi-label">Total Teams</p>
                         <h3 className="kpi-value">{statCards.totalTeams}</h3>
                         <p className="kpi-sub">Unique teams assigned</p>
                     </div>
                 </div>

                 <div className="card-kpi flex items-start gap-4">
                     <div className="p-3 bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--cyan-400)] rounded-xl">
                         <Activity className="w-6 h-6" />
                     </div>
                     <div>
                         <p className="kpi-label">Total People</p>
                         <h3 className="kpi-value">{statCards.totalPeople}</h3>
                         <p className="kpi-sub">Across all {upperType} teams</p>
                     </div>
                 </div>

                 <div className="card-kpi flex items-start gap-4 !border-l-0 !border-[var(--amber-500)]" style={{borderLeftWidth: '3px'}}>
                     <div className="relative p-3 bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] text-[var(--amber-400)] rounded-xl">
                         {statCards.actionNeededCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--amber-400)] opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--amber-500)]"></span>
                            </span>
                         )}
                         <FolderKanban className="w-6 h-6" />
                     </div>
                     <div>
                         <p className="kpi-label">Menunggu Aksi</p>
                         <h3 className="kpi-value">{statCards.actionNeededCount} <span className="text-sm font-normal text-[var(--text-muted)]">sites</span></h3>
                         <p className="text-xs text-[var(--amber-400)] font-medium mt-1 truncate max-w-[150px]" title={statCards.mostUrgentAction}>
                             {statCards.actionNeededCount > 0 ? statCards.mostUrgentAction : 'No immediate action'}
                         </p>
                     </div>
                 </div>
             </div>
          )}
      </div>

      {/* 2. PROGRESS TERMIN PER SITE MATRIX */}
      {distributionMatrix.length > 0 && (
          <div className="card card-flush overflow-hidden relative z-10">
              <div className="p-5 border-b border-[var(--glass-border)] bg-[var(--glass-bg-hover)]">
                  <h2 className="section-header section-header-accent !mb-0 !text-[14px]">
                      <FolderKanban className="w-4 h-4 text-[var(--text-muted)]" />
                      Progress Termin per Site
                  </h2>
                  <p className="text-sm text-[var(--text-muted)] mt-1 ml-3">
                      Distribusi penyelesaian site berdasarkan tahapan termin. Klik baris untuk memfilter tabel di bawah.
                  </p>
              </div>
              <div className="overflow-x-auto">
                  <div className="flex divide-x divide-[var(--glass-border)] min-w-max">
                      {distributionMatrix.map((col) => (
                          <div key={col.step} className="flex-1 min-w-[200px] p-4">
                              <h4 className="font-bold text-[var(--text-primary)] text-sm mb-4 pb-2 border-b border-[var(--glass-border)]">
                                  {col.title}
                              </h4>
                              <div className="space-y-2">
                                  {/* Paid row */}
                                  <div 
                                      onClick={() => setFilterState({ step: col.step, statusGroup: 'paid' })}
                                      className={clsx(
                                          "flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer transition-colors border",
                                          filterState.step === col.step && filterState.statusGroup === 'paid' ? "bg-[rgba(16,185,129,0.15)] border-[rgba(16,185,129,0.3)]" : "border-transparent hover:bg-[var(--glass-bg-hover)]"
                                      )}
                                  >
                                      <div className="flex items-center gap-2">
                                          <div className={clsx("w-2 h-2 rounded-full", col.paid > 0 ? "bg-[var(--emerald-500)]" : "bg-[var(--glass-border)]")} />
                                          <span className={clsx(col.paid > 0 ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]")}>
                                              Dibayarkan
                                          </span>
                                      </div>
                                      <span className={clsx("font-semibold", col.paid > 0 ? "text-[var(--emerald-400)]" : "text-[rgba(255,255,255,0.1)]")}>{col.paid}</span>
                                  </div>

                                  {/* Approved row (only explicitly shown for Filter for space, Combat merges it) */}
                                  {upperType === 'FILTER' && (
                                      <div 
                                          onClick={() => setFilterState({ step: col.step, statusGroup: 'approved' })}
                                           className={clsx(
                                              "flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer transition-colors border",
                                              filterState.step === col.step && filterState.statusGroup === 'approved' ? "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.2)]" : "border-transparent hover:bg-[var(--glass-bg-hover)]"
                                          )}
                                      >
                                          <div className="flex items-center gap-2">
                                              <div className={clsx("w-2 h-2 rounded-full", col.approved > 0 ? "bg-[#34D399]" : "bg-[var(--glass-border)]")} />
                                              <span className={clsx(col.approved > 0 ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]")}>
                                                  Approved
                                              </span>
                                          </div>
                                          <span className={clsx("font-semibold", col.approved > 0 ? "text-[#34D399]" : "text-[rgba(255,255,255,0.1)]")}>{col.approved}</span>
                                      </div>
                                  )}

                                  {/* Pending Action row */}
                                  <div 
                                      onClick={() => setFilterState({ step: col.step, statusGroup: 'pending' })}
                                      className={clsx(
                                          "flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer transition-colors border",
                                          filterState.step === col.step && filterState.statusGroup === 'pending' ? "bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.3)]" : "border-transparent hover:bg-[var(--glass-bg-hover)]"
                                      )}
                                  >
                                      <div className="flex items-center gap-2">
                                          <div className={clsx("w-2 h-2 rounded-full", col.pending > 0 ? "bg-[var(--amber-500)]" : "bg-[var(--glass-border)]")} />
                                          <span className={clsx(col.pending > 0 ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]")}>
                                              Menunggu Aksi
                                          </span>
                                      </div>
                                      <span className={clsx("font-semibold", col.pending > 0 ? "text-[var(--amber-400)]" : "text-[rgba(255,255,255,0.1)]")}>{col.pending}</span>
                                  </div>

                                  {/* In Progress row */}
                                  <div 
                                      onClick={() => setFilterState({ step: col.step, statusGroup: 'inProgress' })}
                                      className={clsx(
                                          "flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer transition-colors border",
                                          filterState.step === col.step && filterState.statusGroup === 'inProgress' ? "bg-[var(--glass-bg-active)] border-[var(--glass-border-active)]" : "border-transparent hover:bg-[var(--glass-bg-hover)]"
                                      )}
                                  >
                                      <div className="flex items-center gap-2">
                                          <div className={clsx("w-2 h-2 rounded-full", col.inProgress > 0 ? "bg-[var(--blue-500)]" : "bg-[var(--glass-border)]")} />
                                          <span className={clsx(col.inProgress > 0 ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-muted)]")}>
                                              In Progress
                                          </span>
                                      </div>
                                      <span className={clsx("font-semibold", col.inProgress > 0 ? "text-[var(--blue-400)]" : "text-[rgba(255,255,255,0.1)]")}>{col.inProgress}</span>
                                  </div>

                                  {/* Belum Aktif / Locked row */}
                                  <div 
                                      onClick={() => setFilterState({ step: col.step, statusGroup: 'locked' })}
                                      className={clsx(
                                          "flex items-center justify-between px-2 py-1.5 rounded text-sm cursor-pointer transition-colors border",
                                          filterState.step === col.step && filterState.statusGroup === 'locked' ? "bg-[var(--glass-bg)] border-[var(--glass-border)]" : "border-transparent hover:bg-[var(--glass-bg-hover)]"
                                      )}
                                  >
                                      <div className="flex items-center gap-2">
                                          <div className={clsx("w-2 h-2 rounded-full border border-[var(--glass-border)]", col.locked > 0 ? "bg-[var(--glass-border)]" : "bg-transparent")} />
                                          <span className={clsx(col.locked > 0 ? "text-[var(--text-muted)]" : "text-[rgba(255,255,255,0.2)]")}>
                                              Belum Aktif
                                          </span>
                                      </div>
                                      <span className={clsx("font-medium", col.locked > 0 ? "text-[var(--text-muted)]" : "text-[rgba(255,255,255,0.1)]")}>{col.locked}</span>
                                  </div>

                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* 3. SITES TABLE */}
      <div className="table-wrapper relative z-10">
          <div className="p-5 border-b border-[var(--glass-border)] flex items-center justify-between bg-[var(--glass-bg)]">
              <h2 className="section-header section-header-accent !mb-0 !text-[14px]">
                  <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                  Site Registry
                  {filterState.step && (
                      <span className="ml-2 px-2.5 py-1 bg-[var(--glass-bg-active)] text-[var(--blue-400)] text-xs font-semibold rounded-full border border-[var(--glass-border-active)]">
                          Filtered
                          <button onClick={() => setFilterState({step: null, statusGroup: null})} className="ml-2 hover:text-white">&times;</button>
                      </span>
                  )}
              </h2>
              <div className="bg-[var(--glass-bg)] text-[var(--text-secondary)] px-3 py-1 rounded-full text-sm font-medium border border-[var(--glass-border)]">
                  Showing: {filteredTableSites.length} of {matchedSites.length}
              </div>
          </div>

          <div className="p-5">
              {filteredTableSites.length === 0 ? (
                  <div className="text-center py-16 px-4">
                      <div className="w-16 h-16 bg-[var(--glass-bg)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--glass-border)] shadow-sm">
                          <Layers className="w-8 h-8 text-[var(--text-muted)]" />
                      </div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Belum ada site aktif yang sesuai.</h3>
                      <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto mb-6">
                          There are currently no sites matching the selected filters based on your access level.
                      </p>
                  </div>
              ) : (
                  <ProjectSitesTable 
                      sites={filteredTableSites}
                      onEdit={handleEditSite}
                      onDelete={handleDeleteSite}
                  />
              )}
          </div>
      </div>
    </div>
  );
};

export default TypeSiteList;
