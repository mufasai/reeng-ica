import React, { useMemo, useState } from 'react';
import { useParams, Navigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { 
  FolderKanban, 
  MapPin, 
  Layers,
  List,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import ModernKPICard from '../components/stats/ModernKPICard';
import MapWidget from '../components/MapWidget';
import BulkStageUpdateModal from '../components/modals/BulkStageUpdateModal';
import { 
  filterTerms,
  combatTerms,
  terminPengajuanRecords,
  type ProjectType,
  type SiteMaster,
  siteMasterRecords,
  workOrders,
  teamMembersRecords
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import ProjectSitesTable from '../components/tables/ProjectSitesTable';

// ── Compact pipeline strip group definitions ─────────────────────────────────
const COMPACT_GROUPS_GENERIC = [
  { key: 'assigned', label: 'Assigned', stages: ['imported','assigned'],                                   color: 'text-slate-600',  bg: 'bg-slate-100',  ring: 'bg-slate-400'  },
  { key: 'permit',   label: 'Permit',   stages: ['permit_process','permit_ready','erfin_process','erfin_ready'], color: 'text-amber-700',  bg: 'bg-amber-50',   ring: 'bg-amber-500'  },
  { key: 'akses',    label: 'Akses',    stages: ['akses_process','akses_ready'],                             color: 'text-blue-700',   bg: 'bg-blue-50',    ring: 'bg-blue-500'   },
  { key: 'impl',     label: 'Impl',     stages: ['implementasi','rfi_done','rfs_done','survey'],             color: 'text-violet-700', bg: 'bg-violet-50',  ring: 'bg-violet-500' },
  { key: 'bast',     label: 'BAST',     stages: ['dokumen_done','bast'],                                     color: 'text-orange-700', bg: 'bg-orange-50',  ring: 'bg-orange-500' },
  { key: 'invoice',  label: 'Invoice',  stages: ['invoice'],                                                 color: 'text-sky-700',    bg: 'bg-sky-50',     ring: 'bg-sky-500'    },
  { key: 'selesai',  label: 'Selesai',  stages: ['completed'],                                               color: 'text-emerald-700',bg: 'bg-emerald-50', ring: 'bg-emerald-500'},
];
const COMPACT_GROUPS_RESCOPING = [
  { key: 'survey',   label: 'Survey',   stages: ['survey'],                                                  color: 'text-cyan-700',   bg: 'bg-cyan-50',    ring: 'bg-cyan-500'   },
  { key: 'assigned', label: 'Assigned', stages: ['imported','assigned'],                                     color: 'text-slate-600',  bg: 'bg-slate-100',  ring: 'bg-slate-400'  },
  { key: 'permit',   label: 'Permit',   stages: ['erfin_process','erfin_ready','permit_process','permit_ready'], color: 'text-amber-700',  bg: 'bg-amber-50',   ring: 'bg-amber-500'  },
  { key: 'akses',    label: 'Akses',    stages: ['akses_process','akses_ready'],                             color: 'text-blue-700',   bg: 'bg-blue-50',    ring: 'bg-blue-500'   },
  { key: 'impl',     label: 'Impl',     stages: ['implementasi','rfi_done','rfs_done'],                       color: 'text-violet-700', bg: 'bg-violet-50',  ring: 'bg-violet-500' },
  { key: 'bast',     label: 'BAST',     stages: ['dokumen_done','bast'],                                     color: 'text-orange-700', bg: 'bg-orange-50',  ring: 'bg-orange-500' },
  { key: 'invoice',  label: 'Invoice',  stages: ['invoice'],                                                 color: 'text-sky-700',    bg: 'bg-sky-50',     ring: 'bg-sky-500'    },
  { key: 'selesai',  label: 'Selesai',  stages: ['completed'],                                               color: 'text-emerald-700',bg: 'bg-emerald-50', ring: 'bg-emerald-500'},
];


const TypeSiteList = () => {
  const { type } = useParams<{ type: string }>();
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stageFilter, setStageFilter] = useState<string | null>(() => new URLSearchParams(window.location.search).get('stage'));
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const canBulkUpdate = ['operational', 'admin'].includes(currentUser.role);

  const handleStripToggle = (key: string) => {
    const next = stageFilter === key ? null : key;
    setStageFilter(next);
    setSearchParams(prev => { const n = new URLSearchParams(prev); next ? n.set('stage', next) : n.delete('stage'); return n; });
  };
  
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
  const validTypes: ProjectType[] = ['FILTER', 'COMBAT', 'BLACKSITE', 'L2H', 'RESCOPING'];
  
  // 2. Fetch Relevant Sites
  const matchedSites = useMemo(() => {
    let baseSites = siteMasterRecords.filter(s => s.project_type === upperType);

    // Role-based filtering — field role only sees their team's sites
    if (currentUser.role === 'field') {
      const userTeamIds = teamMembersRecords
        .filter(tm => tm.person_id === currentUser.id)
        .map(tm => tm.team_id);
      
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
          if (upperType === 'FILTER' || upperType === 'RESCOPING') {
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
          teamMembersRecords
              .filter(tm => tm.team_id === tId)
              .forEach(tm => uniquePeopleIds.add(tm.person_id));
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

  // Calculate financial totals for FILTER, COMBAT & RESCOPING sites
  const calculateFinancials = () => {
    if (upperType !== 'FILTER' && upperType !== 'COMBAT' && upperType !== 'RESCOPING') return null;
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

  // Interactive filters (PIPELINE_LABEL_TO_KEY, filterState, etc.) have been removed. 
  // All table logic now flows from matchedSites -> stageFilter.

  // 7. Apply Stage Filter to Table Sites
  // Compact strip per-stage counts
  const compactGroups = upperType === 'RESCOPING' ? COMPACT_GROUPS_RESCOPING : COMPACT_GROUPS_GENERIC;
  const compactStrip = useMemo(() =>
    compactGroups.map(g => ({ ...g, count: matchedSites.filter(s => g.stages.includes(s.stage as string)).length })),
    [matchedSites, upperType] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const finalFilteredSites = useMemo(() => {
    if (!stageFilter) return matchedSites;
    const group = compactGroups.find(g => g.key === stageFilter);
    if (!group) return matchedSites;
    return matchedSites.filter(site => group.stages.includes(site.stage as string));
  }, [matchedSites, stageFilter, upperType]); // eslint-disable-line react-hooks/exhaustive-deps

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
      'RESCOPING': { color: 'text-cyan-500', bg: 'bg-cyan-50', border: 'border-cyan-200' },
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
              
              {/* RIGHT SIDE ACTIONS */}
              <div className="ml-auto flex items-center gap-3">
                  {canBulkUpdate && (
                      <button
                          onClick={() => setIsBulkUpdateOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-sm transition-colors shadow-sm"
                      >
                          <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                          ⬆ Bulk Update Stage
                      </button>
                  )}
                  {/* VIEW TOGGLE */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
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
          </div>

          {/* KPI CARDS — single scrollable row of 8 */}
          {matchedSites.length > 0 && (
            <div className="relative">
              <div
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* ── Operational Cards (4) ── */}
                <ModernKPICard
                    title="Total Sites"
                    value={statCards.totalSites}
                    icon={MapPin}
                    iconClass="bg-blue-600 text-white"
                    subtitle={`${statCards.completedSites} completed`}
                    minWidth={185}
                    compact
                />
                
                <ModernKPICard
                    title="Total Teams"
                    value={statCards.totalTeams}
                    icon={Layers}
                    iconClass="bg-violet-600 text-white"
                    subtitle="Unique teams assigned"
                    minWidth={185}
                    compact
                />
                
                <ModernKPICard
                    title="Total People"
                    value={statCards.totalPeople}
                    icon={FolderKanban}
                    iconClass="bg-emerald-600 text-white"
                    subtitle={`Across all ${upperType} teams`}
                    minWidth={185}
                    compact
                />
                
                <ModernKPICard
                    title="Menunggu Aksi"
                    value={statCards.actionNeededCount}
                    icon={AlertCircle}
                    iconClass={statCards.actionNeededCount > 0 ? "bg-amber-500 text-white" : "bg-slate-400 text-white"}
                    trend={statCards.actionNeededCount > 0 ? { direction: 'down', label: 'Butuh Tindakan' } : undefined}
                    titleTooltip={statCards.mostUrgentAction}
                    minWidth={185}
                    compact
                />

                {/* ── Divider ── */}
                {fin && (
                  <div className="shrink-0 flex items-stretch py-2 mx-1 opacity-50">
                    <div className="w-px bg-slate-300 rounded-full" />
                  </div>
                )}

                {/* ── Financial Cards (4) — FILTER & COMBAT ── */}
                {fin && (
                  <>
                    <ModernKPICard
                        title="Total Harga"
                        value={fin.totalHarga ? formatRupiah(fin.totalHarga) : '—'}
                        icon={CheckCircle2}
                        iconClass="bg-blue-600 text-white"
                        subtitle={fin.totalHarga ? 'Incl. 70% kontrak TI' : 'Belum ada data harga'}
                        titleTooltip={fin.totalHarga ? `Total: ${formatFull(fin.totalHarga)}\nIncl. 70% dari nilai kontrak TI` : 'Belum ada data harga'}
                        minWidth={185}
                        compact
                    />

                    <ModernKPICard
                        title="Budget Terpakai"
                        value={fin.budgetTerpakai ? formatRupiah(fin.budgetTerpakai) : '—'}
                        icon={FileSpreadsheet}
                        iconClass="bg-orange-500 text-white"
                        subtitle={fin.pct ? `${fin.pct}% dari total` : 'Belum ada pembayaran'}
                        titleTooltip={fin.budgetTerpakai ? `Terbayar: ${formatFull(fin.budgetTerpakai)}\nMenunggu: ${formatFull(fin.budgetMenunggu)}` : 'Belum ada pembayaran'}
                        minWidth={185}
                        compact
                    />

                    <ModernKPICard
                        title="Sisa Budget"
                        value={fin.sisaBudget !== null ? formatRupiah(fin.sisaBudget) : '—'}
                        icon={CheckCircle2}
                        iconClass={fin.sisaBudget !== null && fin.sisaBudget < 0 ? "bg-red-500 text-white" : "bg-emerald-500 text-white"}
                        trend={fin.sisaBudget !== null && fin.sisaBudget < 0 ? { direction: 'down', label: 'Over budget' } : undefined}
                        subtitle={fin.sisaBudget !== null ? (fin.sisaBudget < 0 ? 'Over budget' : 'Tersedia') : 'Belum ada data'}
                        titleTooltip={fin.sisaBudget !== null ? `Sisa: ${formatFull(fin.sisaBudget)}` : 'Belum ada data harga'}
                        minWidth={185}
                        compact
                    />

                    <ModernKPICard
                        title="Total Terbayar"
                        value={fin.totalTerbayar ? formatRupiah(fin.totalTerbayar) : '—'}
                        icon={List}
                        iconClass="bg-teal-600 text-white"
                        trend={fin.totalTerbayar ? { direction: 'up', label: 'Terbayar' } : undefined}
                        subtitle={
                            Object.entries(fin.perTermin).filter(([,v]) => v > 0).length > 0
                              ? Object.entries(fin.perTermin)
                                  .filter(([,v]) => v > 0)
                                  .map(([k,v]) => `${k}: ${formatRupiah(v)}`)
                                  .join(' • ')
                              : 'Belum ada termin terbayar'
                        }
                        titleTooltip={Object.entries(fin.perTermin).filter(([,v]) => v > 0).map(([k,v]) => `${k}: Rp ${v.toLocaleString('id-ID')}`).join('\n') || 'Belum ada termin terbayar'}
                        minWidth={185}
                        compact
                    />
                  </>
                )}
              </div>

              {/* Right-edge scroll hint gradient */}
              <div
                className="pointer-events-none absolute right-0 top-0 h-full w-12 rounded-r-2xl"
                style={{ background: 'linear-gradient(to right, transparent, var(--page-bg, #f8fafc))' }}
              />
            </div>
          )}
      </div>

      {/* ── COMPACT PIPELINE STRIP ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div
          className="flex items-center overflow-x-auto px-4 gap-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', height: 52 }}
        >
          {compactStrip.map((seg, i) => {
            const isActive = stageFilter === seg.key;
            const has = seg.count > 0;
            return (
              <React.Fragment key={seg.key}>
                {i > 0 && <div className={`flex-shrink-0 w-5 h-px mx-0.5 ${has ? seg.ring : 'bg-slate-200'}`} />}
                <button
                  onClick={() => handleStripToggle(seg.key)}
                  className={clsx(
                    'flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all',
                    'border text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap',
                    isActive ? 'ring-2 ring-blue-400/40 border-blue-400 bg-blue-50 text-blue-700'
                      : has ? `border-transparent ${seg.bg} ${seg.color} hover:opacity-80`
                      : 'border-slate-100 bg-slate-50 text-slate-300'
                  )}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${has ? seg.ring : 'bg-slate-200'}`} />
                  {seg.label}
                  <span className={`text-[13px] font-black tabular-nums ml-0.5 ${isActive ? 'text-blue-700' : has ? '' : 'text-slate-300'}`}>
                    {has ? seg.count : '—'}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
          <div className="ml-auto pl-4 flex-shrink-0 border-l border-slate-100 text-[11px] text-slate-400 font-medium whitespace-nowrap">
            {matchedSites.length} sites total
            {(() => {
              const top = [...compactStrip].filter(g => g.count > 0).sort((a,b) => b.count - a.count)[0];
              const pending = terminPengajuanRecords.filter(p =>
                matchedSites.some(s => (s.site_id || s.id) === p.site_id) && p.status === 'submitted'
              ).length;
              const parts = [];
              if (top) parts.push(`${top.count} ${top.label.toLowerCase()}`);
              if (pending > 0) parts.push(`${pending} menunggu persetujuan termin`);
              return parts.length ? ` · ${parts.join(' · ')}` : '';
            })()}
          </div>
        </div>
      </div>

      {/* CONTENT AREA (TABLE OR MAP) */}
      {viewMode === 'list' ? (
          <div className="table-wrapper relative z-10">
              <div className="p-5 border-b border-[var(--glass-border)] flex items-center justify-between bg-[var(--glass-bg)]">
                  <h2 className="section-header section-header-accent !mb-0 !text-[14px]">
                      <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
                      Site Registry
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
