import React, { useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { 
  FolderKanban, 
  MapPin, 
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
            <div className="kpi-row relative z-10">
              <div className="kpi blue">
                <div className="kpi-lbl">Total Sites</div>
                <div className="kpi-val">{statCards.totalSites}</div>
                <div className="kpi-desc">{statCards.totalSites} active, {statCards.completedSites} completed</div>
              </div>
              <div className="kpi violet">
                <div className="kpi-lbl">Total Teams</div>
                <div className="kpi-val">{statCards.totalTeams}</div>
                <div className="kpi-desc">Unique teams assigned</div>
              </div>
              <div className="kpi green">
                <div className="kpi-lbl">Total People</div>
                <div className="kpi-val">{statCards.totalPeople}</div>
                <div className="kpi-desc">Across all {upperType} teams</div>
              </div>
              <div className="kpi amber">
                <div className="kpi-lbl">Menunggu Aksi</div>
                <div className="kpi-val amber">{statCards.actionNeededCount} <span style={{fontSize:'14px',fontWeight:500,color:'var(--text-4)'}}>sites</span></div>
                <div className="kpi-hint" title={statCards.mostUrgentAction}>
                  {statCards.actionNeededCount > 0 ? (
                    <><span className="pulse"></span>{statCards.mostUrgentAction}</>
                  ) : 'No immediate action'}
                </div>
              </div>
            </div>
          )}
      </div>

      {/* 2. PROGRESS TERMIN PER SITE MATRIX */}
      {distributionMatrix.length > 0 && (
        <div className="card relative z-10 mb-5">
          <div className="card-header border-b border-[var(--border, #E4E8F0)] flex items-center justify-between p-5 bg-white rounded-t-xl">
            <h2 className="section-header section-header-accent !mb-0 !text-[14px]">
              <FolderKanban className="w-4 h-4 text-[var(--blue-500)]" />
              <span className="uppercase tracking-wide text-[var(--text-secondary)] font-bold">Progress Termin per Site</span>
            </h2>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-[#F0F5FF] text-[#2563EB] text-xs font-semibold rounded-md border border-[#DBEAFE] hover:bg-[#E0E7FF] transition-colors" onClick={(e) => {
              const el = e.currentTarget.parentElement?.parentElement?.querySelector('.expanded-wrap');
              if (el) {
                el.classList.toggle('open');
              }
            }}>
              Detail <span className="text-[10px]">↕</span>
            </button>
          </div>

          {statCards.actionNeededCount > 0 && (
            <div className="action-banner">
              <span>⚡</span>
              <span><strong>{statCards.actionNeededCount} site{statCards.actionNeededCount > 1 ? 's' : ''}</strong> menunggu tindakan — <strong>{statCards.mostUrgentAction.split('·')[0]}</strong> · {statCards.mostUrgentAction.split('·')[1]}</span>
              <span className="action-link" onClick={() => {
                 setFilterState({ step: null, statusGroup: 'pending' }); // approximate quickly scrolling down or showing it
              }}>Lihat →</span>
            </div>
          )}

          <div className="stepper-wrap">
            <div className="stepper">
              {distributionMatrix.map((col, idx) => {
                 const isAction = col.pending > 0;
                 const isCompleted = col.locked === 0 && col.inProgress === 0 && col.pending === 0 && col.approved === 0 && col.paid > 0;
                 const isApproved = col.approved > 0 && col.pending === 0 && col.inProgress === 0 && col.locked === 0;
                 
                 let circleClass = 'pending';
                 let circleContent = (idx + 1).toString();
                 if (isAction) {
                   circleClass = 'action';
                   circleContent = '!';
                 } else if (isCompleted) {
                   circleClass = 'done';
                   circleContent = '✓';
                 } else if (isApproved) {
                   circleClass = 'approved';
                   circleContent = '✓';
                 } else if (col.paid > 0 || col.approved > 0 || col.inProgress > 0) {
                   // Partially active but no immediate action needed, maybe just done with some parts
                   circleClass = 'approved';
                   circleContent = '✓';
                 }

                 return (
                   <React.Fragment key={col.step}>
                     {/* Step Node */}
                     <div className="step" onClick={(e) => {
                        setFilterState({ step: col.step, statusGroup: null });
                        document.querySelectorAll('.step-circle').forEach(s => (s as HTMLElement).style.outline = 'none');
                        (e.currentTarget.querySelector('.step-circle') as HTMLElement).style.outline = '3px solid var(--blue, #2563EB)';
                        (e.currentTarget.querySelector('.step-circle') as HTMLElement).style.outlineOffset = '3px';
                     }}>
                       <div className={`step-circle ${circleClass}`}>{circleContent}</div>
                       <div className="step-label">
                         <div className="step-name">{col.title.split(' ')[0]} {col.title.split(' ')[1]}</div>
                         <div className="step-pct">{col.title.split('(')[1]?.replace(')','')}</div>
                       </div>
                       <div className="step-stats">
                          {col.paid > 0 && <div className="step-stat-row s-paid"><span className="step-stat-dot dot-em"></span>{col.paid} Dibayarkan</div>}
                          {col.approved > 0 && <div className="step-stat-row s-approved"><span className="step-stat-dot dot-em"></span>{col.approved} Approved</div>}
                          {col.pending > 0 && <div className="step-stat-row s-action"><span className="step-stat-dot dot-am"></span>{col.pending} Menunggu Aksi</div>}
                          
                          {/* Show Belum Aktif as a muted pill if all others are zero, just to show there's something, or normally if locked > 0 */}
                          {col.locked > 0 && (
                            <div className={`step-stat-row s-inactive ${col.paid === 0 && col.approved === 0 && col.pending === 0 && col.inProgress === 0 ? 'muted-pill' : ''}`}>
                              <span className="step-stat-dot dot-gr bg-transparent border"></span>{col.locked} Belum Aktif
                            </div>
                          )}
                          {col.inProgress > 0 && <div className="step-stat-row s-inactive"><span className="step-stat-dot dot-gr !bg-[var(--blue-500)] border-none"></span>{col.inProgress} In Progress</div>}
                       </div>
                     </div>
                     
                     {/* Connector */}
                     {idx < distributionMatrix.length - 1 && (
                       <div className="step-connector">
                         <div className="step-connector-track">
                           <div className={`step-connector-fill ${circleClass === 'done' || circleClass === 'approved' ? 'full' : (circleClass === 'action' ? 'partial' : 'none')}`}></div>
                         </div>
                       </div>
                     )}
                   </React.Fragment>
                 )
              })}
            </div>
          </div>

          {/* Progress bar */}
          <div className="overall-bar-wrap px-6 pb-5 pt-4 mt-2 border-t border-[var(--border, #E4E8F0)]">
            <div className="overall-bar-top">
              <span>Overall pipeline progress — {statCards.totalSites} sites</span>
              <span className="overall-pct">
                 ~{Math.round(
                    upperType === 'FILTER' 
                      ? distributionMatrix.reduce((acc, m, idx) => acc + ((m.paid + m.approved) / Math.max(1, statCards.totalSites)) * [30,50,10,10][idx], 0)
                      : distributionMatrix.reduce((acc, m) => acc + ((m.paid + m.approved) / Math.max(1, statCards.totalSites)) * (100/distributionMatrix.length), 0)
                 )}% complete
              </span>
            </div>
            <div className="overall-track">
              <div className="bar-seg bar-paid" style={{width: `${
                 upperType === 'FILTER' 
                  ? distributionMatrix.reduce((acc, m, idx) => acc + (m.paid / Math.max(1, statCards.totalSites)) * [30,50,10,10][idx], 0)
                  : distributionMatrix.reduce((acc, m) => acc + (m.paid / Math.max(1, statCards.totalSites)) * (100/distributionMatrix.length), 0)
              }%`}}></div>
              <div className="bar-seg bar-approved" style={{width: `${
                 upperType === 'FILTER' 
                  ? distributionMatrix.reduce((acc, m, idx) => acc + (m.approved / Math.max(1, statCards.totalSites)) * [30,50,10,10][idx], 0)
                  : distributionMatrix.reduce((acc, m) => acc + (m.approved / Math.max(1, statCards.totalSites)) * (100/distributionMatrix.length), 0)
              }%`}}></div>
              <div className="bar-seg bar-action" style={{width: `${
                 upperType === 'FILTER' 
                  ? distributionMatrix.reduce((acc, m, idx) => acc + (m.pending / Math.max(1, statCards.totalSites)) * [30,50,10,10][idx], 0)
                  : distributionMatrix.reduce((acc, m) => acc + (m.pending / Math.max(1, statCards.totalSites)) * (100/distributionMatrix.length), 0)
              }%`}}></div>
            </div>
          </div>

          {/* Expanded detail */}
          <div className="expanded-wrap" id="expandedDetail">
            <div className="expanded-grid">
              {distributionMatrix.map((col) => (
                <div key={col.step} className="exp-col">
                  <div className="exp-col-title">
                    {col.title.split(' ')[0]} {col.title.split(' ')[1]}
                    <span className="exp-pct">{col.title.split('(')[1]?.replace(')','')}</span>
                  </div>
                  <div className={`exp-row ${col.paid === 0 ? 'zero' : ''}`}>
                    <div className="lbl"><div className="exp-dot paid"></div>Dibayarkan</div>
                    <div className={`ct ${col.paid > 0 ? 'em !text-[#047857]' : '!text-[#94A3B8]'}`}>{col.paid}</div>
                  </div>
                  <div className={`exp-row ${col.approved === 0 ? 'zero' : ''}`}>
                    <div className="lbl"><div className="exp-dot approved"></div>Approved</div>
                    <div className={`ct ${col.approved > 0 ? 'em !text-[#16A34A]' : '!text-[#94A3B8]'}`}>{col.approved}</div>
                  </div>
                  <div className={`exp-row ${col.pending === 0 ? 'zero' : ''}`}>
                    <div className="lbl"><div className="exp-dot action"></div>Menunggu Aksi</div>
                    <div className={`ct ${col.pending > 0 ? 'am !text-[#B45309]' : '!text-[#94A3B8]'}`}>{col.pending}</div>
                  </div>
                  <div className={`exp-row ${col.inProgress === 0 ? 'zero' : ''}`}>
                    <div className="lbl"><div className="exp-dot inactive !bg-[var(--blue-500)]"></div>In Progress</div>
                    <div className={`ct ${col.inProgress > 0 ? '!text-[var(--blue-600)]' : '!text-[#94A3B8]'}`}>{col.inProgress}</div>
                  </div>
                  <div className={`exp-row ${col.locked === 0 ? 'zero' : ''} border-b-0`}>
                    <div className="lbl"><div className="exp-dot inactive"></div>Belum Aktif</div>
                    <div className={`ct ${col.locked > 0 ? 'gr !text-[#64748B]' : '!text-[#94A3B8]'}`}>{col.locked}</div>
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
