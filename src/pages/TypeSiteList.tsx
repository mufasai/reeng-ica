import React, { useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { 
  FolderKanban, 
  MapPin, 
  Layers,
  List,
  FileSpreadsheet
} from 'lucide-react';
import MapWidget from '../components/MapWidget';
import BulkStageUpdateModal from '../components/modals/BulkStageUpdateModal';
import { 
  filterTerms,
  combatTerms,
  terminPengajuanRecords,
  type ProjectType,
  teams,
  type SiteMaster,
  siteMasterRecords,
  workOrders
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import ProjectSitesTable from '../components/tables/ProjectSitesTable';

const TypeSiteList = () => {
  const { type } = useParams<{ type: string }>();
  const { currentUser } = useAuth();
  const [filterState, setFilterState] = useState<{ step: number | null, statusGroup: string | null }>({ step: null, statusGroup: null });
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'termin'>('pipeline');
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  
  // View Toggle (List vs Map)
  const [viewMode, setViewMode] = useState<'list' | 'map'>(() => {
    return (localStorage.getItem('siteview_filter') as 'list' | 'map') || 'list';
  });

  const handleToggleView = (mode: 'list' | 'map') => {
      setViewMode(mode);
      localStorage.setItem('siteview_filter', mode);
  };
  
  // 1. Data Validation & Formatting
  const upperType = type?.toUpperCase() as ProjectType;
  const validTypes: ProjectType[] = ['FILTER', 'COMBAT', 'BLACKSITE', 'L2H', 'REFINEN'];
  
  // 2. Fetch Relevant Sites
  const matchedSites = useMemo(() => {
    let baseSites = siteMasterRecords.filter(s => s.project_type === upperType);

    // Role-based filtering
    if (['engineer', 'team_leader'].includes(currentUser.role)) {
      const userTeamIds = teams
        .filter(t => t.members.some(m => m.personId === currentUser.id))
        .map(t => t.id);
      
      // Filter based on assigned team via work order
      baseSites = baseSites.filter(s => {
          if (!s.work_order_id) return false;
          const wo = workOrders.find(w => w.id === s.work_order_id);
          return wo && wo.assignedTeamId && userTeamIds.includes(wo.assignedTeamId);
      });
    }
    return baseSites;
  }, [upperType, currentUser]);


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
      const uniqueTeamIds = new Set<string>();
      matchedSites.forEach(s => {
          if (s.work_order_id) {
              const wo = workOrders.find(w => w.id === s.work_order_id);
              if (wo && wo.assignedTeamId) uniqueTeamIds.add(wo.assignedTeamId);
          }
      });
      const totalTeams = uniqueTeamIds.size;

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

      // Need to adjust action calculation as matchedSites is now SiteMaster[]
      // For now, looking for notes with issue or permit_process older than 14 days
      matchedSites.forEach(site => {
          let hasUrgentAction = false;
          let urgentText = '';

          if (site.stage_notes?.toLowerCase().includes('issue')) {
              hasUrgentAction = true;
              urgentText = `${site.site_name} · Terdapat issue: ${site.stage_notes}`;
          } else if (site.stage === 'permit_process' && site.stage_updated_at) {
              const updatedDate = new Date(site.stage_updated_at);
              const now = new Date();
              const diffDays = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 3600 * 24));
              if (diffDays > 14) {
                 hasUrgentAction = true;
                 urgentText = `${site.site_name} · Permit process pending > 14 days`;
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

  // --- FINANCIAL HELPERS ---
  const formatRupiah = (amount: number | null): string => {
    if (amount === null || amount === 0) return '—';
    if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1).replace('.', ',')}B`;
    if (amount >= 1_000_000)     return `Rp ${(amount / 1_000_000).toFixed(1).replace('.', ',')}Jt`;
    if (amount >= 1_000)         return `Rp ${(amount / 1_000).toFixed(0)}K`;
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const formatFull = (amount: number | null): string =>
    amount ? `Rp ${amount.toLocaleString('id-ID')}` : '—';

  // Calculate financial totals for FILTER sites
  const calculateFinancials = () => {
    if (upperType !== 'FILTER') return null;
    const siteIds = matchedSites.map(s => s.site_id || s.id);

    // Total Harga: sum of site.budget (the contract value field) for matched sites
    // Budget ≈ 70% of nilai kontrak TI — using site.budget as-is for now as per spec
    const totalHarga = matchedSites.reduce((sum, s) => {
      const boqVal = (s as any).nilai_kontrak || (s as any).budget || 0;
      return sum + boqVal;
    }, 0);

    // Paid termins for all matching sites
    const paidRecords = terminPengajuanRecords.filter(p =>
      siteIds.includes(p.site_id) && p.status === 'paid'
    );
    const budgetTerpakai = paidRecords.reduce((sum, p) => sum + p.nominal, 0);

    // Submitted records (menunggu)
    const submittedRecords = terminPengajuanRecords.filter(p =>
      siteIds.includes(p.site_id) && p.status === 'submitted'
    );
    const budgetMenunggu = submittedRecords.reduce((sum, p) => sum + p.nominal, 0);

    const sisaBudget = totalHarga > 0 ? totalHarga - budgetTerpakai : null;

    // Per-termin breakdown
    const perTermin: Record<string, number> = {};
    ['T1','T2a','T2b','T2c','T3','T4'].forEach(k => {
      perTermin[k] = terminPengajuanRecords
        .filter(p => siteIds.includes(p.site_id) && p.status === 'paid' && p.termin_key === k)
        .reduce((sum, p) => sum + p.nominal, 0);
    });

    const totalTerbayar = budgetTerpakai;
    const pct = totalHarga > 0 && budgetTerpakai > 0
      ? ((budgetTerpakai / totalHarga) * 100).toFixed(1)
      : null;

    return { totalHarga: totalHarga || null, budgetTerpakai: budgetTerpakai || null,
             budgetMenunggu: budgetMenunggu || null, sisaBudget,
             totalTerbayar: totalTerbayar || null, perTermin, pct };
  };

  const fin = calculateFinancials();

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

  // 6. Calculate Pipeline Progress (Stage Counts)
  const pipelineGroups = useMemo(() => {
    const STAGE_GROUPS = [
      { label: 'Assigned', keys: ['assigned'] },
      { label: 'Permit', keys: ['permit_process', 'permit_ready'] },
      { label: 'Akses', keys: ['akses_process', 'akses_ready'] },
      { label: 'Implementasi', keys: ['implementasi', 'rfi_done', 'rfs_done', 'dokumen_done'] },
      { label: 'BAST', keys: ['bast'] },
      { label: 'Invoice', keys: ['invoice'] },
      { label: 'Selesai', keys: ['completed'] }
    ];

    const counts = STAGE_GROUPS.map(g => ({ ...g, count: 0 }));
    let issueCount = 0;

    matchedSites.forEach(site => {
        const stage = site.stage || 'imported';
        
        counts.forEach(g => {
            if (g.keys.includes(stage)) g.count++;
        });

        if (site.stage_notes?.toLowerCase().includes('issue') || (stage as string) === 'issue_hold') {
            issueCount++;
        }
    });

    return { counts, issueCount };
  }, [matchedSites]);

  // 7. Apply Stage Filter to Table Sites
  const finalFilteredSites = useMemo(() => {
    if (!stageFilter) return filteredTableSites;

    const targetKeys = pipelineGroups.counts.find(c => c.label === stageFilter)?.keys || [];

    return filteredTableSites.filter(site => {
        const stage = site.stage || 'imported';
        return targetKeys.includes(stage);
    });
  }, [filteredTableSites, stageFilter, pipelineGroups]);

  const handleEditSite = (site: SiteMaster) => { console.log('Edit site', site); };
  const handleDeleteSite = (siteId: string) => { console.log('Delete site', siteId); };

  if (!upperType || !validTypes.includes(upperType)) {
    return <Navigate to="/projects" replace />;
  }

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
              <div className="p-3 rounded-xl bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] shadow-sm">
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
              
              {/* VIEW TOGGLE */}
              <div className="ml-auto flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                  <button 
                      onClick={() => handleToggleView('list')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  >
                      <List className="w-4 h-4" />
                      List
                  </button>
                  <button 
                      onClick={() => handleToggleView('map')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${viewMode === 'map' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  >
                      <MapPin className="w-4 h-4" />
                      Map
                  </button>
              </div>
          </div>

          {/* KPI CARDS — single scrollable row of 8 */}
          {matchedSites.length > 0 && (
            <div className="relative">
              <div
                className="flex gap-3 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* ── Operational Cards (4) ── */}
                <div className="kpi blue group shrink-0" style={{ minWidth: 150, maxWidth: 185 }}>
                  <MapPin className="kpi-icon-overlay" />
                  <div className="kpi-lbl">Total Sites</div>
                  <div className="kpi-val">{statCards.totalSites}</div>
                  <div className="kpi-desc">{statCards.totalSites} active, {statCards.completedSites} completed</div>
                </div>
                <div className="kpi violet group shrink-0" style={{ minWidth: 150, maxWidth: 185 }}>
                  <Layers className="kpi-icon-overlay" />
                  <div className="kpi-lbl">Total Teams</div>
                  <div className="kpi-val">{statCards.totalTeams}</div>
                  <div className="kpi-desc">Unique teams assigned</div>
                </div>
                <div className="kpi green group shrink-0" style={{ minWidth: 150, maxWidth: 185 }}>
                  <FolderKanban className="kpi-icon-overlay" />
                  <div className="kpi-lbl">Total People</div>
                  <div className="kpi-val">{statCards.totalPeople}</div>
                  <div className="kpi-desc">Across all {upperType} teams</div>
                </div>
                <div className="kpi amber group shrink-0" style={{ minWidth: 150, maxWidth: 185 }}>
                  <List className="kpi-icon-overlay" />
                  <div className="kpi-lbl">Menunggu Aksi</div>
                  <div className="kpi-val amber flex items-center gap-2">
                    {statCards.actionNeededCount}
                    {statCards.actionNeededCount > 0 && <span className="pulse"></span>}
                  </div>
                  <div className="kpi-hint flex-1" title={statCards.mostUrgentAction}>
                    {statCards.actionNeededCount > 0 ? (
                      <span className="truncate w-full block">{statCards.mostUrgentAction.length > 30 ? statCards.mostUrgentAction.substring(0, 30) + '...' : statCards.mostUrgentAction}</span>
                    ) : <span className="text-slate-400 font-normal truncate">No immediate action</span>}
                  </div>
                </div>

                {/* ── Divider ── */}
                {upperType === 'FILTER' && fin && (
                  <div className="shrink-0 flex items-stretch py-1">
                    <div className="w-px bg-[var(--glass-border)] mx-1 rounded-full" />
                  </div>
                )}

                {/* ── Financial Cards (4) — FILTER only ── */}
                {upperType === 'FILTER' && fin && (
                  <>
                    {/* Total Harga */}
                    <div
                      className="kpi blue group shrink-0 cursor-default"
                      style={{ minWidth: 155, maxWidth: 190, background: 'rgba(59,130,246,0.04)' }}
                      title={fin.totalHarga ? `Total nilai kontrak: ${formatFull(fin.totalHarga)}\nIncl. 70% dari nilai kontrak TI` : 'Belum ada data harga'}
                    >
                      <div className="kpi-lbl">Total Harga</div>
                      <div className="kpi-val" style={{ fontSize: fin.totalHarga && fin.totalHarga >= 1e9 ? 18 : undefined }}>
                        {fin.totalHarga ? formatRupiah(fin.totalHarga) : '—'}
                      </div>
                      <div className="kpi-desc">
                        {fin.totalHarga ? 'Incl. 70% dari nilai kontrak TI' : 'Belum ada data harga'}
                      </div>
                    </div>

                    {/* Budget Terpakai */}
                    <div
                      className="kpi amber group shrink-0 cursor-default"
                      style={{ minWidth: 155, maxWidth: 190, background: 'rgba(249,115,22,0.04)' }}
                      title={fin.budgetTerpakai ? `Terbayar: ${formatFull(fin.budgetTerpakai)}\nMenunggu: ${formatFull(fin.budgetMenunggu)}` : 'Belum ada pembayaran'}
                    >
                      <div className="kpi-lbl">Budget Terpakai</div>
                      <div className="kpi-val">{fin.budgetTerpakai ? formatRupiah(fin.budgetTerpakai) : '—'}</div>
                      <div className="kpi-desc">
                        {fin.pct ? `${fin.pct}% dari total harga` : 'Belum ada pembayaran'}
                      </div>
                    </div>

                    {/* Sisa Budget */}
                    <div
                      className="kpi green group shrink-0 cursor-default"
                      style={{ minWidth: 155, maxWidth: 190, background: 'rgba(16,185,129,0.04)' }}
                      title={fin.sisaBudget !== null ? `Sisa: ${formatFull(fin.sisaBudget)}` : 'Belum ada data harga'}
                    >
                      <div className="kpi-lbl">Sisa Budget</div>
                      <div
                        className="kpi-val"
                        style={{ color: fin.sisaBudget !== null && fin.sisaBudget < 0 ? 'var(--red-400, #ef4444)' : undefined }}
                      >
                        {fin.sisaBudget !== null ? formatRupiah(fin.sisaBudget) : '—'}
                      </div>
                      <div className="kpi-desc">
                        {fin.sisaBudget !== null
                          ? (fin.sisaBudget < 0 ? '⚠️ Over budget' : 'Tersedia untuk termin berikutnya')
                          : 'Belum ada data harga'}
                      </div>
                    </div>

                    {/* Total Terbayar */}
                    <div
                      className="kpi green group shrink-0 cursor-default"
                      style={{ minWidth: 155, maxWidth: 190, background: 'rgba(20,184,166,0.05)', borderTopColor: 'teal' }}
                      title={Object.entries(fin.perTermin)
                        .filter(([,v]) => v > 0)
                        .map(([k,v]) => `${k}: Rp ${v.toLocaleString('id-ID')}`)
                        .join('\n') || 'Belum ada termin terbayar'}
                    >
                      <div className="kpi-lbl">Total Terbayar</div>
                      <div className="kpi-val">{fin.totalTerbayar ? formatRupiah(fin.totalTerbayar) : '—'}</div>
                      <div className="kpi-desc" style={{ fontSize: 10 }}>
                        {Object.entries(fin.perTermin).filter(([,v]) => v > 0).length > 0
                          ? Object.entries(fin.perTermin)
                              .filter(([,v]) => v > 0)
                              .map(([k,v]) => `${k}: ${formatRupiah(v)}`)
                              .join('  •  ')
                          : 'Belum ada termin terbayar'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right-edge scroll hint gradient */}
              <div
                className="pointer-events-none absolute right-0 top-0 h-full w-16 rounded-r-xl"
                style={{ background: 'linear-gradient(to right, transparent, var(--page-bg, #f8fafc))' }}
              />
            </div>
          )}
      </div>

      {/* TABS COMPONENT */}
      <div className="relative z-10 mb-2">
        <div className="flex border-b border-slate-200">
          <button
            className={`px-1 py-3 mr-6 text-sm flex-none transition-colors border-b-2 ${
              activeTab === 'pipeline'
                ? 'border-blue-600 text-blue-800 font-bold pointer-events-none'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('pipeline')}
          >
            Pipeline Progress
          </button>
          <button
            className={`px-1 py-3 text-sm flex-none transition-colors border-b-2 ${
              activeTab === 'termin'
                ? 'border-blue-600 text-blue-800 font-bold pointer-events-none'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('termin')}
          >
            Termin & Pembayaran
          </button>
        </div>
      </div>

      {/* PIPELINE PROGRESS (STAGE TRACKING) */}
      {activeTab === 'pipeline' && (
      <div className="relative z-10 mb-5 bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="p-4 px-6 overflow-x-auto custom-scrollbar">
            <div className="flex items-start w-full min-w-max py-4 pt-6 px-4">
                {pipelineGroups.counts.map((group, idx) => {
                    const hasIssue = group.count > 0 && pipelineGroups.issueCount > 0;
                    const stageFilterActive = stageFilter === group.label;
                    
                    let circleConfig = {
                        fill: 'bg-[#F9FAFB]', border: 'border-[#E5E7EB]', text: 'text-[#9CA3AF]', label: 'text-[#9CA3AF]'
                    };
                    
                    if (group.count > 0) {
                        if (group.label === 'Permit') circleConfig = { fill: 'bg-[#FEF3C7]', border: 'border-[#F59E0B]', text: 'text-[#F59E0B]', label: 'text-[#F59E0B]' };
                        else if (group.label === 'Akses') circleConfig = { fill: 'bg-[#DBEAFE]', border: 'border-[#3B82F6]', text: 'text-[#3B82F6]', label: 'text-[#3B82F6]' };
                        else if (group.label === 'Implementasi') circleConfig = { fill: 'bg-[#EDE9FE]', border: 'border-[#7C3AED]', text: 'text-[#7C3AED]', label: 'text-[#7C3AED]' };
                        else if (group.label === 'BAST' || group.label === 'Invoice') circleConfig = { fill: 'bg-[#FFF7ED]', border: 'border-[#F97316]', text: 'text-[#F97316]', label: 'text-[#F97316]' };
                        else if (group.label === 'Selesai') circleConfig = { fill: 'bg-[#ECFDF5]', border: 'border-[#10B981]', text: 'text-[#10B981]', label: 'text-[#10B981]' };
                        else if (group.label === 'Assigned') circleConfig = { fill: 'bg-[#F0F4FF]', border: 'border-[#6B7280]', text: 'text-[#6B7280]', label: 'text-[#6B7280]' };
                    }

                    const ringClass = stageFilterActive ? `ring-2 ring-offset-2 ring-blue-500` : '';
                    
                    let connectorColor = 'bg-[#E5E7EB]';
                    if (idx < pipelineGroups.counts.length - 1) {
                        if (group.count > 0) {
                            if (group.label === 'Permit') connectorColor = 'bg-[#F59E0B]';
                            else if (group.label === 'Akses') connectorColor = 'bg-[#3B82F6]';
                            else if (group.label === 'Implementasi') connectorColor = 'bg-[#7C3AED]';
                            else if (group.label === 'BAST' || group.label === 'Invoice') connectorColor = 'bg-[#F97316]';
                            else if (group.label === 'Selesai') connectorColor = 'bg-[#10B981]';
                            else if (group.label === 'Assigned') connectorColor = 'bg-[#6B7280]';
                        }
                    }

                    return (
                        <React.Fragment key={idx}>
                            <div 
                                className="flex flex-col items-center flex-none cursor-pointer group w-[85px]"
                                onClick={() => setStageFilter(stageFilter === group.label ? null : group.label)}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] mb-2 border-[2px] transition-all z-10 ${circleConfig.fill} ${circleConfig.border} ${circleConfig.text} ${ringClass}`}>
                                    {group.count > 0 ? group.count : '—'}
                                </div>
                                <span className={`text-[11px] font-semibold whitespace-nowrap text-center transition-colors ${stageFilterActive ? 'text-blue-700 font-bold' : circleConfig.label}`}>
                                    {group.label} {hasIssue && <span className="text-amber-500 ml-1">⚡</span>}
                                </span>
                            </div>
                            {idx < pipelineGroups.counts.length - 1 && (
                                <div className={`flex-1 h-[2px] ${connectorColor} self-start mt-5 mx-1 transition-colors`}></div>
                            )}
                        </React.Fragment>
                    )
                })}
            </div>

            <div className="mt-4 flex justify-center text-sm font-medium text-[var(--text-secondary)]">
                {pipelineGroups.counts.find(c => c.label === 'Permit')?.count === 0 && pipelineGroups.issueCount === 0 
                  ? <>{matchedSites.length} sites total <span className="mx-2 opacity-50">•</span> semua site masih dalam proses awal</>
                  : <>{matchedSites.length} sites total <span className="mx-2 opacity-50">•</span> {pipelineGroups.counts.find(c => c.label === 'Permit')?.count || 0} permit siap {pipelineGroups.issueCount > 0 && <><span className="mx-2 opacity-50">•</span> <span className="text-amber-600">⚡ {pipelineGroups.issueCount} butuh tindakan</span></>}</>
                }
            </div>
        </div>
      </div>
      )}

      {/* TERMIN & PEMBAYARAN */}
      {activeTab === 'termin' && (
        <div className="relative z-10 mb-5 bg-white border border-slate-200 rounded-lg shadow-sm">
           <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mx-6 mt-6 rounded-r-lg flex gap-3 shadow-sm">
               <span className="text-xl leading-none pt-0.5">ℹ️</span>
               <p className="text-sm text-blue-800 font-medium leading-relaxed">Termin tracking akan aktif setelah SPK digenerate untuk setiap site. SPK digenerate setelah permit selesai dan disetujui.</p>
           </div>
          {statCards.actionNeededCount > 0 && (
            <div className="action-banner rounded-t-lg">
              <span>⚡</span>
              <span><strong>{statCards.actionNeededCount} site{statCards.actionNeededCount > 1 ? 's' : ''}</strong> menunggu tindakan — <strong>{statCards.mostUrgentAction.split('·')[0]}</strong> · {statCards.mostUrgentAction.split('·')[1]}</span>
              <span className="action-link" onClick={() => {
                 setFilterState({ step: null, statusGroup: 'pending' }); 
              }}>Lihat →</span>
            </div>
          )}

          <div className="stepper-wrap !pt-2 pb-0">
             <div className="flex justify-end px-5 pt-3">
             </div>
            <div className="stepper">
              {distributionMatrix.map((col, idx) => {
                 const hasAnyData = distributionMatrix.some(c => c.paid > 0 || c.approved > 0 || c.pending > 0 || c.inProgress > 0 || c.locked > 0);
                 const isEmpty = col.paid === 0 && col.approved === 0 && col.pending === 0 && col.inProgress === 0 && col.locked === 0;
                 const isAction = col.pending > 0;
                 const isCompleted = col.locked === 0 && col.inProgress === 0 && col.pending === 0 && col.approved === 0 && col.paid > 0;
                 const isApproved = col.approved > 0 && col.pending === 0 && col.inProgress === 0 && col.locked === 0;
                 
                 let circleClass = 'inactive';
                 let circleContent = (idx + 1).toString();
                 if (!hasAnyData || isEmpty) {
                     circleClass = 'inactive opacity-60';
                     circleContent = '🔒';
                 } else if (isAction) {
                   circleClass = 'action';
                   circleContent = '!';
                 } else if (isCompleted) {
                   circleClass = 'done';
                   circleContent = '✓';
                 } else if (isApproved || col.paid > 0 || col.approved > 0 || col.inProgress > 0) {
                   circleClass = 'approved';
                   circleContent = '✓';
                 }

                 return (
                   <React.Fragment key={col.step}>
                     {/* Step Node */}
                     <div className="step" onClick={(e) => {
                        if (!hasAnyData || isEmpty) return; // Prevent filtering on empty steps
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
                          {(!hasAnyData || isEmpty) ? (
                              <>
                                <div className="step-stat-row s-inactive opacity-60"><span className="step-stat-dot dot-gr bg-transparent border"></span>— Dibayarkan</div>
                                <div className="step-stat-row s-inactive opacity-60"><span className="step-stat-dot dot-gr bg-transparent border"></span>— Approved</div>
                                <div className="step-stat-row s-inactive opacity-60"><span className="step-stat-dot dot-gr bg-transparent border"></span>— Menunggu Aksi</div>
                                <div className="step-stat-row s-inactive opacity-60"><span className="step-stat-dot dot-gr bg-transparent border"></span>— In Progress</div>
                              </>
                          ) : (
                              <>
                                  {col.paid > 0 && <div className="step-stat-row s-paid"><span className="step-stat-dot dot-em"></span>{col.paid} Dibayarkan</div>}
                                  {col.approved > 0 && <div className="step-stat-row s-approved"><span className="step-stat-dot dot-em"></span>{col.approved} Approved</div>}
                                  {col.pending > 0 && <div className="step-stat-row s-action"><span className="step-stat-dot dot-am"></span>{col.pending} Menunggu Aksi</div>}
                                  
                                  {col.locked > 0 && (
                                    <div className={`step-stat-row s-inactive ${col.paid === 0 && col.approved === 0 && col.pending === 0 && col.inProgress === 0 ? 'muted-pill' : ''}`}>
                                      <span className="step-stat-dot dot-gr bg-transparent border"></span>{col.locked} Belum Aktif
                                    </div>
                                  )}
                                  {col.inProgress > 0 && <div className="step-stat-row s-inactive"><span className="step-stat-dot dot-gr !bg-[var(--blue-500)] border-none"></span>{col.inProgress} In Progress</div>}
                              </>
                          )}
                       </div>
                     </div>
                     
                     {/* Connector */}
                     {idx < distributionMatrix.length - 1 && (
                       <div className="step-connector">
                         <div className="step-connector-track">
                           {(!hasAnyData || isEmpty) 
                             ? <div className="step-connector-fill none border-t-2 border-dashed border-slate-300 bg-transparent w-full h-[2px]"></div>
                             : <div className={`step-connector-fill ${circleClass === 'done' || circleClass === 'approved' ? 'full' : (circleClass === 'action' ? 'partial' : 'none')}`}></div>
                           }
                         </div>
                       </div>
                     )}
                   </React.Fragment>
                 )
              })}
            </div>
          </div>

        </div>
      )}

      {/* CONTENT AREA (TABLE OR MAP) */}
      {viewMode === 'list' ? (
          <div className="table-wrapper relative z-10">
              <div className="p-5 border-b border-[var(--glass-border)] flex items-center justify-between bg-[var(--glass-bg)]">
                  <h2 className="section-header section-header-accent !mb-0 !text-[14px]">
                      <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                      Site Registry
                      {filterState.step && (
                          <span className="ml-2 px-2.5 py-1 bg-[var(--glass-bg-active)] text-[var(--blue-400)] text-xs font-semibold rounded-full border border-[var(--glass-border)]">
                              Filtered
                              <button onClick={() => setFilterState({step: null, statusGroup: null})} className="ml-2 hover:text-white">&times;</button>
                          </span>
                      )}
                  </h2>
                  <div className="flex items-center gap-3">
                      <div className="bg-[var(--glass-bg)] text-[var(--text-secondary)] px-3 py-1 rounded-full text-sm font-medium border border-[var(--glass-border)]">
                          Showing: {finalFilteredSites.length} of {matchedSites.length}
                      </div>
                      <button onClick={() => setIsBulkUpdateOpen(true)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-lg text-xs transition-colors shadow-sm flex items-center gap-2">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                          Bulk Update Stage
                      </button>
                  </div>
              </div>

              <div className="p-5">
                  {finalFilteredSites.length === 0 ? (
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
                          sites={finalFilteredSites}
                          onEdit={handleEditSite}
                          onDelete={handleDeleteSite}
                      />
                  )}
              </div>
          </div>
      ) : (
          /* MAP VIEW */
          <div className="relative z-10 h-[calc(100vh-300px)] min-h-[500px] bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
               <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        Peta Sebaran {upperType} Sites
                    </h3>
               </div>
               <div className="flex-1 w-full bg-slate-100 relative">
                   <MapWidget height="100%" presetType={upperType} />
               </div>
          </div>
      )}

      <BulkStageUpdateModal 
          isOpen={isBulkUpdateOpen} 
          onClose={() => setIsBulkUpdateOpen(false)}
          projectType={upperType}
      />
    </div>
  );
};

export default TypeSiteList;
