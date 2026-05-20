import React, { useMemo, useState } from 'react';
import { useParams, Navigate, useSearchParams, Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  FolderKanban,
  MapPin,
  Layers,
  List,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Search,
  ArrowRight,
  Download,
} from 'lucide-react';
import ModernKPICard from '../components/stats/ModernKPICard';
import MapWidget from '../components/MapWidget';
import MultiSheetExcelModal from '../components/modals/MultiSheetExcelModal';
import ImportSiteModal from '../components/modals/ImportSiteModal';
import ImportSummaryModal, { type ImportSummaryData } from '../components/modals/ImportSummaryModal';
import {
  terminPengajuanRecords,
  type ProjectType,
  siteMasterRecords,
  teamMembersRecords,
  atpWorkOrders,
  STAGE_ORDER,
} from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { exportTypeExcel } from '../lib/exportExcel';

// ── Compact pipeline strip group definitions ─────────────────────────────────
const COMPACT_GROUPS_GENERIC = [
  { key: 'assigned', label: 'Assigned', stages: ['imported', 'assigned'], color: 'text-slate-600', bg: 'bg-slate-100', ring: 'bg-slate-400' },
  { key: 'permit', label: 'Permit', stages: ['permit_process', 'permit_ready', 'erfin_process', 'erfin_ready'], color: 'text-amber-700', bg: 'bg-amber-50', ring: 'bg-amber-500' },
  { key: 'akses', label: 'Akses', stages: ['akses_process', 'akses_ready'], color: 'text-blue-700', bg: 'bg-blue-50', ring: 'bg-blue-500' },
  { key: 'impl', label: 'Impl', stages: ['implementasi', 'rfi_done', 'rfs_done', 'survey'], color: 'text-violet-700', bg: 'bg-violet-50', ring: 'bg-violet-500' },
  { key: 'bast', label: 'BAST', stages: ['dokumen_done', 'bast'], color: 'text-orange-700', bg: 'bg-orange-50', ring: 'bg-orange-500' },
  { key: 'invoice', label: 'Invoice', stages: ['invoice'], color: 'text-sky-700', bg: 'bg-sky-50', ring: 'bg-sky-500' },
  { key: 'selesai', label: 'Selesai', stages: ['completed'], color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'bg-emerald-500' },
];
const COMPACT_GROUPS_RESCOPING = [
  { key: 'survey', label: 'Survey', stages: ['survey'], color: 'text-cyan-700', bg: 'bg-cyan-50', ring: 'bg-cyan-500' },
  { key: 'assigned', label: 'Assigned', stages: ['imported', 'assigned'], color: 'text-slate-600', bg: 'bg-slate-100', ring: 'bg-slate-400' },
  { key: 'permit', label: 'Permit', stages: ['erfin_process', 'erfin_ready', 'permit_process', 'permit_ready'], color: 'text-amber-700', bg: 'bg-amber-50', ring: 'bg-amber-500' },
  { key: 'akses', label: 'Akses', stages: ['akses_process', 'akses_ready'], color: 'text-blue-700', bg: 'bg-blue-50', ring: 'bg-blue-500' },
  { key: 'impl', label: 'Impl', stages: ['implementasi', 'rfi_done', 'rfs_done'], color: 'text-violet-700', bg: 'bg-violet-50', ring: 'bg-violet-500' },
  { key: 'bast', label: 'BAST', stages: ['dokumen_done', 'bast'], color: 'text-orange-700', bg: 'bg-orange-50', ring: 'bg-orange-500' },
  { key: 'invoice', label: 'Invoice', stages: ['invoice'], color: 'text-sky-700', bg: 'bg-sky-50', ring: 'bg-sky-500' },
  { key: 'selesai', label: 'Selesai', stages: ['completed'], color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'bg-emerald-500' },
];


const TypeSiteList = () => {
  const { type } = useParams<{ type: string }>();
  const { currentUser, can } = useAuth();
  const [, setSearchParams] = useSearchParams();
  const [stageFilter, setStageFilter] = useState<string | null>(() => new URLSearchParams(window.location.search).get('stage'));
  const [isMultiSheetOpen, setIsMultiSheetOpen] = useState(false);
  const [isBoqOpen, setIsBoqOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<ImportSummaryData | null>(null);
  const hasImportAccess = currentUser ? ['operational', 'admin', 'director'].includes(currentUser.role) : false;

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

  // 2. Fetch Relevant Tickets (one row per ATP work order / ticket)
  const matchedTickets = useMemo(() => {
    let base = atpWorkOrders.filter(wo => wo.project_type === upperType);

    // Role-based filtering — field role only sees their team's work orders
    if (currentUser && currentUser.role === 'field') {
      const userTeamIds = teamMembersRecords
        .filter(tm => tm.person_id === currentUser.id)
        .map(tm => tm.team_id);
      base = base.filter(wo => wo.team_id && userTeamIds.includes(wo.team_id));
    }
    return base;
  }, [upperType, currentUser]);

  // Keep matchedSites alias for KPI/financial helpers that still need SiteMaster shape
  const matchedSites = useMemo(() =>
    siteMasterRecords.filter(s => s.project_type === upperType),
    [upperType]
  );


  // 3. Dynamic Stats Calculation based on Type
  const calculateStats = () => {
    const totalTickets = matchedTickets.length;
    const uniqueSitesCount = new Set(matchedTickets.map(wo => wo.site_id)).size;

    const completedTicketsCount = matchedTickets.filter(wo => wo.stage === 'completed').length;

    // Teams from work orders
    const uniqueTeamIds = new Set<string>(
      matchedTickets.map(wo => wo.team_id).filter(Boolean) as string[]
    );
    const totalTeams = uniqueTeamIds.size;

    const uniquePeopleIds = new Set<string>();
    uniqueTeamIds.forEach(tId => {
      teamMembersRecords.filter(tm => tm.team_id === tId).forEach(tm => uniquePeopleIds.add(tm.person_id));
    });
    const totalPeople = uniquePeopleIds.size;

    let actionNeededCount = 0;
    let mostUrgentAction = '';
    matchedTickets.forEach(wo => {
      if (wo.stage === 'permit_process' && (wo as any).stage_updated_at) {
        const diffDays = Math.floor((Date.now() - new Date((wo as any).stage_updated_at).getTime()) / 86400000);
        if (diffDays > 14) {
          actionNeededCount++;
          if (!mostUrgentAction) mostUrgentAction = `${wo.site_id} · Permit > 14 hari`;
        }
      }
    });

    return { totalTickets, uniqueSitesCount, completedTicketsCount, totalTeams, totalPeople, actionNeededCount, mostUrgentAction };
  };

  const statCards = calculateStats();

  // --- FINANCIAL HELPERS ---
  const formatRupiah = (amount: number | null): string => {
    if (amount === null || amount === 0) return '—';
    if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1).replace('.', ',')}B`;
    if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1).replace('.', ',')}Jt`;
    if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}K`;
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
    ['T1', 'T2a', 'T2b', 'T2c', 'T3', 'T4'].forEach(k => {
      perTermin[k] = terminPengajuanRecords
        .filter(p => siteIds.includes(p.site_id) && p.status === 'paid' && p.termin_key === k)
        .reduce((sum, p) => sum + p.nominal, 0);
    });

    const totalTerbayar = budgetTerpakai;
    const pct = totalHarga > 0 && budgetTerpakai > 0
      ? ((budgetTerpakai / totalHarga) * 100).toFixed(1)
      : null;

    return {
      totalHarga: totalHarga || null, budgetTerpakai: budgetTerpakai || null,
      budgetMenunggu: budgetMenunggu || null, sisaBudget,
      totalTerbayar: totalTerbayar || null, perTermin, pct
    };
  };

  const fin = calculateFinancials();

  // Summary helper (ticket-based)
  const summaryInfo = useMemo(() => {
    const rfsDone        = matchedTickets.filter(wo => wo.stage === 'rfs_done').length;
    const permitReleased = matchedTickets.filter(wo => {
      const idx = STAGE_ORDER.indexOf(wo.stage || 'imported');
      return idx >= STAGE_ORDER.indexOf('permit_ready');
    }).length;
    const requestPdid  = matchedTickets.filter(wo => (wo as any).issue_status === 'REQUEST PDID').length;
    const taggingDone  = matchedTickets.filter(wo => (wo as any).issue_status === 'UPLOAD TAGGING DONE').length;
    return { total: matchedTickets.length, rfsDone, permitReleased, requestPdid, taggingDone };
  }, [matchedTickets]);

  // Pipeline strip — counts from tickets
  const compactGroups = upperType === 'RESCOPING' ? COMPACT_GROUPS_RESCOPING : COMPACT_GROUPS_GENERIC;
  const compactStrip = useMemo(() =>
    compactGroups.map(g => ({ ...g, count: matchedTickets.filter(wo => g.stages.includes(wo.stage)).length })),
    [matchedTickets, upperType] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Final filtered tickets (by pipeline stage click)
  const finalFilteredTickets = useMemo(() => {
    if (!stageFilter) return matchedTickets;
    const group = compactGroups.find(g => g.key === stageFilter);
    if (!group) return matchedTickets;
    return matchedTickets.filter(wo => group.stages.includes(wo.stage));
  }, [matchedTickets, stageFilter, upperType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search within filtered tickets
  const [ticketSearch, setTicketSearch] = useState('');
  const displayTickets = useMemo(() => {
    if (!ticketSearch) return finalFilteredTickets;
    const q = ticketSearch.toLowerCase();
    return finalFilteredTickets.filter(wo => {
      const site = siteMasterRecords.find(s => s.site_id === wo.site_id);
      return wo.site_id.toLowerCase().includes(q) ||
        (wo.atp_number || '').toLowerCase().includes(q) ||
        (site?.site_name || '').toLowerCase().includes(q);
    });
  }, [finalFilteredTickets, ticketSearch]);

  // Ticket row helpers
  const fmtRelative = (ts: string | undefined): string => {
    if (!ts) return '—';
    const ms = Date.now() - new Date(ts).getTime();
    if (isNaN(ms)) return '—';
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(ms / 3600000);
    const days = Math.floor(ms / 86400000);
    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins}m lalu`;
    if (hours < 24) return `${hours}j lalu`;
    if (days <= 3) return `${days}h lalu`;
    return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const getStageProps = (stage: string) => {
    const map: Record<string, { color: string; label: string }> = {
      imported:       { color: 'bg-slate-100 text-slate-600 border-slate-200',       label: 'Imported' },
      assigned:       { color: 'bg-blue-100 text-blue-700 border-blue-200',          label: 'Assigned' },
      survey:         { color: 'bg-cyan-100 text-cyan-700 border-cyan-200',          label: 'Survey' },
      survey_nok:     { color: 'bg-red-100 text-red-700 border-red-200',             label: 'Survey NOK' },
      erfin_process:  { color: 'bg-teal-100 text-teal-700 border-teal-200',          label: 'ERFIN Process' },
      erfin_ready:    { color: 'bg-teal-100 text-teal-700 border-teal-200',          label: 'ERFIN Ready' },
      permit_process: { color: 'bg-amber-100 text-amber-700 border-amber-200',       label: 'Permit' },
      permit_ready:   { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Permit Ready' },
      akses_process:  { color: 'bg-amber-100 text-amber-700 border-amber-200',       label: 'Akses' },
      akses_ready:    { color: 'bg-blue-100 text-blue-700 border-blue-200',          label: 'Akses Ready' },
      implementasi:   { color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200', label: 'Implementasi' },
      rfi_done:       { color: 'bg-teal-100 text-teal-700 border-teal-200',          label: 'RFI Done' },
      rfs_done:       { color: 'bg-teal-100 text-teal-700 border-teal-200',          label: 'RFS Done' },
      dokumen_done:   { color: 'bg-teal-100 text-teal-700 border-teal-200',          label: 'Docs Done' },
      bast:           { color: 'bg-orange-100 text-orange-700 border-orange-200',    label: 'BAST' },
      invoice:        { color: 'bg-orange-100 text-orange-700 border-orange-200',    label: 'Invoice' },
      completed:      { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: '✓ Selesai' },
    };
    return map[stage] ?? { color: 'bg-slate-100 text-slate-600 border-slate-200', label: stage };
  };

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
            {hasImportAccess && (
              <>
                <button
                  onClick={() => setIsMultiSheetOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-sm transition-colors shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  Import / Update Excel
                </button>
                <button
                  onClick={() => setIsBoqOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md transition-colors shadow-blue-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" /> Import BoQ
                </button>
              </>
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
                title="Total Pekerjaan"
                value={statCards.totalTickets}
                icon={FolderKanban}
                iconClass="bg-blue-600 text-white"
                subtitle={`${statCards.uniqueSitesCount} unique sites`}
                titleTooltip={`Total: ${statCards.totalTickets} work items across ${statCards.uniqueSitesCount} different physical site locations`}
                minWidth={185}
                compact
              />

              <ModernKPICard
                title="Penyelesaian"
                value={statCards.completedTicketsCount}
                icon={CheckCircle2}
                iconClass="bg-emerald-600 text-white"
                subtitle={`${((statCards.completedTicketsCount / (statCards.totalTickets || 1)) * 100).toFixed(0)}% dari target`}
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
                      Object.entries(fin.perTermin).filter(([, v]) => v > 0).length > 0
                        ? Object.entries(fin.perTermin)
                          .filter(([, v]) => v > 0)
                          .map(([k, v]) => `${k}: ${formatRupiah(v)}`)
                          .join(' • ')
                        : 'Belum ada termin terbayar'
                    }
                    titleTooltip={Object.entries(fin.perTermin).filter(([, v]) => v > 0).map(([k, v]) => `${k}: Rp ${v.toLocaleString('id-ID')}`).join('\n') || 'Belum ada termin terbayar'}
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
            {matchedTickets.length} tiket
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 text-xs font-medium text-slate-600 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="font-black text-slate-900">{statCards.uniqueSitesCount}</span> sites
            </span>
            <span className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
              <span className="font-black text-blue-700">{statCards.totalTickets}</span> tickets / work orders
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300 ml-2" />
            <span className="flex items-center gap-1.5"><span className="font-black text-emerald-600">{summaryInfo.rfsDone}</span> RFS Done</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="flex items-center gap-1.5"><span className="font-black text-blue-600">{summaryInfo.permitReleased}</span> Permit Released</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="flex items-center gap-1.5"><span className="font-black text-amber-600">{summaryInfo.requestPdid}</span> Request PDID</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="flex items-center gap-1.5"><span className="font-black text-emerald-700">{summaryInfo.taggingDone}</span> Tagging Done</span>
          </div>
        </div>
      </div>

      {/* CONTENT AREA (TABLE OR MAP) */}
      {viewMode === 'list' ? (
        <div className="table-wrapper relative z-10">
          {/* Table header row */}
          <div className="p-4 border-b border-[var(--glass-border)] flex flex-wrap items-center gap-3 bg-[var(--glass-bg)]">
            <h2 className="section-header section-header-accent !mb-0 !text-[14px] flex-shrink-0">
              <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
              Daftar Tiket — {upperType}
            </h2>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari site / tiket / nama…"
                  value={ticketSearch}
                  onChange={e => setTicketSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs w-52 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-slate-400"
                />
              </div>
              <div className="bg-[var(--glass-bg)] text-[var(--text-secondary)] px-3 py-1 rounded-full text-xs font-medium border border-[var(--glass-border)] whitespace-nowrap">
                {displayTickets.length} / {matchedTickets.length} tiket
              </div>
              {can('export_data') && (
                <button
                  onClick={() => exportTypeExcel(upperType)}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium rounded-lg text-xs transition-colors shadow-sm flex items-center gap-2"
                  title="Export ke Excel"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" /> Export Excel
                </button>
              )}
              {hasImportAccess && (
                <button onClick={() => setIsMultiSheetOpen(true)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-lg text-xs transition-colors shadow-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  Import / Update Excel
                </button>
              )}
            </div>
          </div>

          {/* Ticket table */}
          <div className="overflow-x-auto">
            {displayTickets.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 bg-[var(--glass-bg)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--glass-border)] shadow-sm">
                  <Layers className="w-8 h-8 text-[var(--text-muted)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Belum ada tiket yang sesuai.</h3>
                <p className="text-[var(--text-muted)] text-sm max-w-md mx-auto">
                  Tidak ada tiket yang cocok dengan filter atau pencarian yang dipilih.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="py-3 px-4 text-left w-10">#</th>
                    <th className="py-3 px-4 text-left">Tiket / ATP</th>
                    <th className="py-3 px-4 text-left">Site</th>
                    <th className="py-3 px-4 text-left">Sektor</th>
                    <th className="py-3 px-4 text-left">Stage</th>
                    <th className="py-3 px-4 text-left">Tim</th>
                    <th className="py-3 px-4 text-left">Update Terakhir</th>
                    <th className="py-3 px-4 text-center w-16">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTickets.map((wo, idx) => {
                    const sp = getStageProps(wo.stage);
                    return (
                      <tr
                        key={wo.id}
                        className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group"
                      >
                        <td className="py-3 px-4 text-slate-400 font-mono text-xs tabular-nums">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                            {wo.atp_number || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-xs font-bold text-slate-800">{wo.site_id}</div>
                          {wo.site_name && (
                            <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{wo.site_name}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-xs tabular-nums">S{wo.sector ?? '—'}</td>
                        <td className="py-3 px-4">
                          <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-semibold border', sp.color)}>
                            {sp.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {wo.team_id || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs tabular-nums whitespace-nowrap">
                          {fmtRelative((wo as any).updated_at)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            to={`/sites/${wo.site_id}`}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors group-hover:shadow-sm"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

      <ImportSiteModal
        isOpen={isBoqOpen}
        onClose={() => setIsBoqOpen(false)}
        onImportExcel={(data, fileName) => { console.log('BoQ Excel imported:', fileName, data.length, 'rows'); setIsBoqOpen(false); }}
        onAddManual={() => { setIsBoqOpen(false); }}
      />
      <MultiSheetExcelModal
        isOpen={isMultiSheetOpen}
        onClose={() => setIsMultiSheetOpen(false)}
        pageContext="sites"
        onImportComplete={(summary) => {
          setSummaryData(summary);
          setIsMultiSheetOpen(false);
        }}
      />
      <ImportSummaryModal
        isOpen={!!summaryData}
        onClose={() => setSummaryData(null)}
        summary={summaryData}
      />
    </div>
  );
};

export default TypeSiteList;
