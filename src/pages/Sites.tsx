import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Filter as FilterIcon, RefreshCw, FileSpreadsheet,
    Download, History, Layers, Camera, MapPin, CheckCircle2, Clock, List
} from 'lucide-react';
import clsx from 'clsx';
import { siteMasterRecords, type ProjectType, getTerminSummary, people, atpWorkOrders, atpTasks, siteTechnicalDetails, type AtpWorkOrder } from '../data/mockData';
import { exportSitesToExcel, exportSitesToCsv } from '../utils/exportUtils';
import ImportSiteModal from '../components/modals/ImportSiteModal';
import MultiSheetExcelModal from '../components/modals/MultiSheetExcelModal';
import ImportSummaryModal, { type ImportSummaryData } from '../components/modals/ImportSummaryModal';
import AssignProjectModal from '../components/modals/AssignProjectModal';
import { useAuth } from '../context/AuthContext';
import { useTabContext } from '../context/TabContext';
import { useSidebar } from '../context/SidebarContext';
import { PlusCircle, ExternalLink, Plus } from 'lucide-react';
import { db, cleanRecordId } from '../db';

// ─── Constants & Helpers ────────────────────────────────────────────────────────
const ACTIVE_WORK_COLS = [
    'NO', 'LATEST UPDATE', 'PROJECT TYPE', 'SITE_ID', 'TIKET NUMBER', 'SITE MOVING STATUS', 'FINAL SITE ID', 'SITE-SECTOR (FINAL)', 'SECTOR',
    'FILTER PER SECTOR', 'REGION', 'NE_ID', 'SITE_NAME', 'TP NAME', 'IOMS REGISTERED', 'PERMIT STATUS',
    'ISSUE PROBLEM', 'NOTE PROBLEM', 'SEND PERMIT FORMAT', 'IMPLEMENTASI STATUS', 'Tanggal RFS', 'TEAM',
    'TEAM ONSITE STATUS', 'ISSUE IMPLEMENTASI', 'NOTE IMPLEMENTASI', 'STATUS ATP', 'NOTE FOTO EVIDENCE',
    'PPID', 'SOW ID', 'PO ID', 'PRIO CAPEX FINAL', 'NEW STATUS IMPLEMENTATION', 'PRIO',
    'LATITUDE', 'LONGITUDE', 'FILE DATE'
];

const ALL_SITES_COLS = [
    'SITE ID', 'NE ID', 'LAYER', 'SEC', 'Antenna type', 'Height', 'FREQ BAND', 'LONG', 'LAT', 'ANT TYPE',
    'TP ID', 'TP', 'Site Type', 'LTE NE Name', 'Cell Name', 'eNodeB ID', 'Cell ID', 'Local Cell ID',
    'TAL', 'TAC', 'AREA', 'BSC', 'SITENAME', 'SITE', 'PROVINSI', 'ADDRESS', 'KECAMATAN', 'KABUPATEN',
    'DESA', 'Cluster_New', 'Branch_New', 'REGIONS NEW'
];

const PROJECT_TYPES: { id: ProjectType; label: string; color: string }[] = [
    { id: 'BLACKSITE', label: 'Blacksite', color: 'bg-red-50 text-red-600 border-red-200' },
    { id: 'COMBAT', label: 'Combat', color: 'bg-orange-50 text-orange-600 border-orange-200' },
    { id: 'FILTER', label: 'Filter', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { id: 'L2H', label: 'L2H', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'RESCOPING', label: 'Rescoping', color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
];

const formatImportDate = (isoString?: string): string => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('.', ':');
};

const truncate = (str: string, maxLen = 25): string =>
    str && str.length > maxLen ? str.slice(0, maxLen) + '…' : str;



import { useTableColumns } from '../hooks/useTableColumns';
import TableColumnToggle from '../components/common/TableColumnToggle';

// ─── Sub-Components ──────────────────────────────────────────────────────────



// ─── Action Signal Card ───────────────────────────────────────────────────────
type DotColor = 'red' | 'amber' | 'purple' | 'blue';
interface ActionCardProps {
    label: string;
    count: number;
    subText: string;
    dotColor: DotColor;
    filterKey: string;
    activeFilter: string | null;
    onClick: () => void;
    visible?: boolean;
}
const ActionCard = ({ label, count, subText, dotColor, filterKey, activeFilter, onClick, visible = true }: ActionCardProps) => {
    if (!visible) return null;
    const isActive = activeFilter === filterKey;
    const dotMap: Record<DotColor, string> = {
        red: 'bg-red-500',
        amber: 'bg-amber-500',
        purple: 'bg-purple-500',
        blue: 'bg-blue-600',
    };
    const subTextMap: Record<DotColor, string> = {
        red: 'text-red-600',
        amber: 'text-amber-600',
        purple: 'text-purple-600',
        blue: 'text-slate-400',
    };
    const alertBorderMap: Record<DotColor, string> = {
        red: count > 0 ? 'border-red-300 bg-red-50/40' : 'border-slate-200',
        amber: count > 0 ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200',
        purple: 'border-slate-200',
        blue: 'border-slate-200',
    };
    return (
        <div
            onClick={onClick}
            className={clsx(
                'flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 cursor-pointer shrink-0',
                'border shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]',
                isActive ? 'ring-2 ring-blue-500/40 bg-blue-50/30 border-blue-300' : alertBorderMap[dotColor]
            )}
            style={{ minWidth: 168 }}
        >
            <span className={clsx(
                'w-2.5 h-2.5 rounded-full shrink-0',
                isActive ? 'bg-blue-500' : dotMap[dotColor]
            )} />
            <div className="flex flex-col gap-0 min-w-0">
                <span className="text-[22px] font-extrabold leading-none tracking-tight text-[#111827]">{count}</span>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide truncate">{label}</span>
                <span className={clsx('text-[11px] font-bold leading-snug', isActive ? 'text-blue-600' : subTextMap[dotColor])}>
                    {subText}
                </span>
            </div>
        </div>
    );
};

// ─── Engineer Mobile View ────────────────────────────────────────────────────
const IMPL_STAGES = ['implementasi', 'rfi_done', 'rfs_done', 'akses_ready'];

const STAGE_BADGE: Record<string, { label: string; cls: string }> = {
    implementasi:  { label: 'Implementasi', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    rfi_done:      { label: 'RFI Done',      cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    rfs_done:      { label: 'RFS Done',      cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    akses_ready:   { label: 'Akses Ready',   cls: 'bg-purple-100 text-purple-700 border-purple-200' },
};

const EngineerSitesView = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [search, setSearch] = useState('');

    const workOrders = useMemo(() => {
        return atpWorkOrders
            .filter(wo => IMPL_STAGES.includes(wo.stage))
            .filter(wo => {
                if (!search) return true;
                const s = search.toLowerCase();
                const site = siteMasterRecords.find(sm => sm.site_id === wo.site_id);
                return wo.site_id.toLowerCase().includes(s) ||
                    (wo.atp_number || '').toLowerCase().includes(s) ||
                    (site?.site_name || '').toLowerCase().includes(s);
            });
    }, [search]);

    const doneCount = workOrders.filter(wo => wo.stage === 'rfs_done').length;
    const pendingCount = workOrders.filter(wo => wo.stage !== 'rfs_done').length;

    return (
        <div className="bg-slate-50 min-h-screen pb-24 -mx-4 md:-mx-6 -mt-6">
            {/* Mobile header */}
            <div className="bg-gradient-to-br from-blue-700 to-blue-600 text-white px-4 pt-8 pb-10 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                <div className="relative">
                    <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">
                        Halo, {currentUser?.name.split(' ')[0]}
                    </p>
                    <h1 className="text-2xl font-black leading-tight">Site Implementasi</h1>
                    <p className="text-blue-100/80 text-sm mt-1">Upload foto progress pekerjaan Anda</p>
                    <div className="flex gap-3 mt-4">
                        <div className="bg-white/15 rounded-xl px-3 py-2 backdrop-blur-sm border border-white/20">
                            <p className="text-[11px] text-blue-100 font-medium uppercase tracking-wide">Pending</p>
                            <p className="text-xl font-black">{pendingCount}</p>
                        </div>
                        <div className="bg-white/15 rounded-xl px-3 py-2 backdrop-blur-sm border border-white/20">
                            <p className="text-[11px] text-blue-100 font-medium uppercase tracking-wide">RFS Done</p>
                            <p className="text-xl font-black">{doneCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="-mt-4 px-4 relative z-10 space-y-3">
                {/* Search bar */}
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari site ID, ATP, nama site..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 shadow-sm"
                    />
                </div>

                {workOrders.length === 0 && (
                    <div className="text-center py-16 px-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h3 className="font-bold text-slate-700 text-lg mb-1">Semua Selesai!</h3>
                        <p className="text-slate-400 text-sm">Tidak ada site implementasi yang perlu dikerjakan saat ini.</p>
                    </div>
                )}

                {workOrders.map(wo => {
                    const site = siteMasterRecords.find(s => s.site_id === wo.site_id);
                    const badge = STAGE_BADGE[wo.stage] ?? { label: wo.stage, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
                    const isRfsDone = wo.stage === 'rfs_done';

                    return (
                        <div key={wo.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-black text-slate-800 text-lg leading-tight">{wo.site_id}</h3>
                                        <p className="text-xs font-mono text-slate-400 mt-0.5">{wo.atp_number || 'ATP belum ada'}</p>
                                    </div>
                                    <span className={clsx('shrink-0 ml-2 px-2 py-1 rounded-lg text-[11px] font-bold border', badge.cls)}>
                                        {badge.label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                    <span className="truncate text-xs">{site?.site_name || '—'}</span>
                                </div>

                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[11px] font-semibold">{wo.project_type}</span>
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[11px] font-semibold">Sektor {wo.sector}</span>
                                    {site?.region && (
                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[11px]">{site.region}</span>
                                    )}
                                </div>
                            </div>

                            <div className="px-4 pb-4">
                                {isRfsDone ? (
                                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="text-sm font-semibold text-emerald-700">Pekerjaan selesai (RFS Done)</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => navigate(`/engineer/upload/${wo.id}`)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <Camera className="w-5 h-5" />
                                        Upload Foto Implementasi
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {workOrders.length > 0 && (
                    <div className="flex items-center gap-2 px-1 py-3">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <p className="text-xs text-slate-400">{workOrders.length} work order dalam tahap implementasi</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
// ─── Dashboard navigation filter helpers ─────────────────────────────────────
const DASH_STAGE_LABELS: Record<string, string> = {
    'survey': 'Survey',
    'assigned,permit_process,erfin_process,erfin_ready': 'Menunggu Permit',
    'permit_ready': 'Permit Ready',
    'akses_process,akses_ready': 'Akses Ready',
    'implementasi,rfi_done,rfs_done': 'Implementasi',
    'dokumen_done,bast': 'Proses BAST',
    'invoice': 'Invoice',
    'completed': 'Selesai',
};
type DashFilterState = {
    type: 'stage' | 'has_issue' | 'has_paid_termin' | 'has_pending_termin';
    stages: string[];
    label: string;
};

const Sites = () => {
    const navigate = useNavigate();
    const { openTab } = useTabContext();
    const { currentUser, can } = useAuth();
    const { triggerCountRefresh } = useSidebar();
    const hasImportAccess = currentUser ? ['director', 'operational', 'system_admin'].includes(currentUser.role) : false;
    const [searchParams, setSearchParams] = useSearchParams();

    // Tab Toggle ('data' | 'history')
    const initialTab = searchParams.get('tab') === 'history' ? 'history' : 'data';
    const [activeTab, setActiveTab] = useState<'active' | 'all' | 'history'>(
        initialTab === 'history' ? 'history' : 'active'
    );

    useEffect(() => {
        // Preserve any dash filter params already in the URL; only update the tab key
        setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('tab', activeTab); return n; });
    }, [activeTab, setSearchParams]);

    // Modals
    const [isBoqOpen, setIsBoqOpen] = useState(false);
    const [isMultiSheetOpen, setIsMultiSheetOpen] = useState(false);
    const [summaryData, setSummaryData] = useState<ImportSummaryData | null>(null);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Initial load from local storage
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<ProjectType | 'All'>('All');
    const [filterStage, setFilterStage] = useState<string>('All');
    const [filterCluster, setFilterCluster] = useState<string>('All');
    const [filterTeam, setFilterTeam] = useState<string>('All');
    const [filterPo, setFilterPo] = useState<string>('All');
    const [filterBatch, setFilterBatch] = useState<string>('All');

    // Quick-filter (action cards on this page)
    const [quickFilter, setQuickFilter] = useState<string | null>(null);

    // Active-tab sort — default latest update desc
    const [activeSortKey, setActiveSortKey] = useState<string>('latest_update');
    const [activeSortDir, setActiveSortDir] = useState<'asc' | 'desc'>('desc');
    const toggleActiveSort = (key: string) => {
        if (activeSortKey === key) setActiveSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setActiveSortKey(key); setActiveSortDir('desc'); }
    };

    // Dashboard incoming filter — read once from URL on mount
    const [dashFilter, setDashFilter] = useState<DashFilterState | null>(() => {
        const p = new URLSearchParams(window.location.search);
        const stage = p.get('stage');
        const hasIssue = p.get('has_issue');
        const hasPaid = p.get('has_paid_termin');
        const hasPending = p.get('has_pending_termin');
        if (stage) {
            const stages = stage.split(',');
            return { type: 'stage', stages, label: DASH_STAGE_LABELS[stage] || stages.map(s => s.replace(/_/g, ' ')).join(', ') };
        }
        if (hasIssue === 'true') return { type: 'has_issue', stages: [], label: 'Issue/Hold' };
        if (hasPaid === 'true') return { type: 'has_paid_termin', stages: [], label: 'Termin Terbayar' };
        if (hasPending === 'true') return { type: 'has_pending_termin', stages: [], label: 'Menunggu Approval' };
        return null;
    });

    // Column visibility
    const { visibilityMap, handleVisibilityChange, resetToDefault, currentCols } = useTableColumns(currentUser?.id || '');

    // Section collapse state
    // const [isAssignedExpanded, setIsAssignedExpanded] = useState(true);
    // const [isUnassignedExpanded, setIsUnassignedExpanded] = useState(true);

    // Assign Modal state
    const [assignModalSite, setAssignModalSite] = useState<string | null>(null);

    // derived dropdown data
    const availableStages = useMemo(() => Array.from(new Set(siteMasterRecords.map(s => s.stage))), []);
    const availableClusters = useMemo(() => Array.from(new Set(siteMasterRecords.map(s => s.cluster).filter(Boolean))), []);
    const availableTeams = useMemo(() => Array.from(new Set(siteMasterRecords.map(s => (s as any).team_assigned).filter(Boolean))), []);
    const availablePOs = useMemo(() => Array.from(new Set(siteMasterRecords.map(s => s.po_tsel).filter(Boolean))), []);
    const availableBatches = useMemo(() => Array.from(new Set(siteMasterRecords.map(s => s.batch_ref).filter(Boolean))), []);

    // Summary Stats — Action-signal cards
    const stats = useMemo(() => {
        const IN_14_DAYS = new Date(Date.now() + 14 * 24 * 3600 * 1000);
        const PERMIT_STAGES = ['permit_process', 'permit_ready', 'akses_process', 'akses_ready'];
        let belumDitugaskan = 0, stuckCount = 0, permitExpiring = 0, terminMenunggu = 0;

        siteMasterRecords.forEach(s => {
            // Belum Ditugaskan: no team AND not completed/imported
            if (!(s as any).team_assigned && !['completed', 'imported'].includes(s.stage as string)) {
                belumDitugaskan++;
            }
            // Stuck >14: days_in_stage > 14 AND not completed
            if (s.stage !== 'completed' && s.stage_updated_at) {
                const d = Math.floor((Date.now() - new Date(s.stage_updated_at).getTime()) / 86400000);
                if (d > 14) stuckCount++;
            }
            // Permit Expiring: in permit stages + expiry within 14 days
            if (PERMIT_STAGES.includes(s.stage as string)) {
                const expiry = (s as any).extra_data?.permit_expiry_date;
                if (expiry && new Date(expiry) <= IN_14_DAYS) permitExpiring++;
            }
            // Termin Menunggu: has a submitted pengajuan waiting approval
            if (getTerminSummary(s.site_id).has_pending_approval) terminMenunggu++;
        });
        return { total: siteMasterRecords.length, belumDitugaskan, stuckCount, permitExpiring, terminMenunggu };
    }, []);

    const resetFilters = () => {
        setSearchTerm(''); setFilterType('All'); setFilterStage('All');
        setFilterCluster('All'); setFilterTeam('All'); setFilterPo('All'); setFilterBatch('All');
        setQuickFilter(null);
    };

    const handlePillClick = (key: string) => {
        if (key === 'total') { setQuickFilter(null); return; }
        setQuickFilter(prev => prev === key ? null : key);
    };



    // Quick-filter label map (for table header)
    const QUICK_FILTER_LABELS: Record<string, string> = {
        belum_ditugaskan: 'Belum Ditugaskan',
        stuck: 'Stuck >14 Hari',
        permit_expiring: 'Permit Expiring',
        termin_menunggu: 'Termin Menunggu',
    };

    // Main Filtering
    const filteredSites = useMemo(() => {
        const IN_14_DAYS = new Date(Date.now() + 14 * 24 * 3600 * 1000);
        const PERMIT_STAGES = ['permit_process', 'permit_ready', 'akses_process', 'akses_ready'];

        return siteMasterRecords.filter(site => {
            // ── Dashboard incoming filter (from URL params) ──
            if (dashFilter) {
                if (dashFilter.type === 'stage') {
                    if (!dashFilter.stages.includes(site.stage as string)) return false;
                } else if (dashFilter.type === 'has_issue') {
                    const isIssue = (site.stage as string) === 'issue_hold' ||
                        (site.stage as string) === 'survey_nok' ||
                        site.stage_notes?.toLowerCase().includes('issue');
                    if (!isIssue) return false;
                } else if (dashFilter.type === 'has_paid_termin') {
                    const termSum = getTerminSummary(site.site_id);
                    const hasPaid = termSum?.summary &&
                        Object.values(termSum.summary as Record<string, any>).some((t: any) => t?.status === 'paid' || t?.status === 'approved');
                    if (!hasPaid) return false;
                } else if (dashFilter.type === 'has_pending_termin') {
                    if (!getTerminSummary(site.site_id).has_pending_approval) return false;
                }
            }
            if (quickFilter === 'belum_ditugaskan') {
                if ((site as any).team_assigned) return false;
                if (['completed', 'imported'].includes(site.stage as string)) return false;
            }
            if (quickFilter === 'stuck') {
                if (site.stage === 'completed' || !site.stage_updated_at) return false;
                const d = Math.floor((Date.now() - new Date(site.stage_updated_at).getTime()) / 86400000);
                if (d <= 14) return false;
            }
            if (quickFilter === 'permit_expiring') {
                if (!PERMIT_STAGES.includes(site.stage as string)) return false;
                const expiry = (site as any).extra_data?.permit_expiry_date;
                if (!expiry || new Date(expiry) > IN_14_DAYS) return false;
            }
            if (quickFilter === 'termin_menunggu') {
                if (!getTerminSummary(site.site_id).has_pending_approval) return false;
            }

            // ── Regular filters ──
            if (filterType !== 'All' && site.project_type !== filterType) return false;
            if (filterStage !== 'All' && site.stage !== filterStage) return false;
            if (filterCluster !== 'All' && site.cluster !== filterCluster) return false;
            if (filterTeam !== 'All' && (site as any).team_assigned !== filterTeam) return false;
            if (filterPo !== 'All' && site.po_tsel !== filterPo) return false;
            if (filterBatch !== 'All' && site.batch_ref !== filterBatch) return false;

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (
                    !site.site_id.toLowerCase().includes(term) &&
                    !site.site_name.toLowerCase().includes(term) &&
                    !site.po_tsel?.toLowerCase().includes(term)
                ) return false;
            }
            return true;
        });
    }, [searchTerm, filterType, filterStage, filterCluster, filterTeam, filterPo, filterBatch, quickFilter, dashFilter]);

    const filteredTechnicalDetails = useMemo(() => {
        if (!searchTerm) return siteTechnicalDetails;
        const term = searchTerm.toLowerCase();
        return siteTechnicalDetails.filter(t => 
            t.site_id.toLowerCase().includes(term) ||
            (t.ne_id || '').toLowerCase().includes(term) ||
            (t.cell_name || '').toLowerCase().includes(term) ||
            (t.tp_name || '').toLowerCase().includes(term)
        );
    }, [searchTerm]);

    const getWoLatestTs = (siteId: string) => {
        const wos = atpWorkOrders.filter(w => w.site_id === siteId);
        return wos.reduce((max, w) => {
            const t = new Date((w as any).updated_at || w.initiated_at || 0).getTime();
            return isNaN(t) ? max : Math.max(max, t);
        }, 0);
    };

    const fmtRelativeSites = (ts: number | string | undefined): string => {
        const t = ts ? new Date(ts).getTime() : 0;
        if (!t) return '—';
        const ms = Date.now() - t;
        const mins = Math.floor(ms / 60000);
        const hours = Math.floor(ms / 3600000);
        const days = Math.floor(ms / 86400000);
        if (mins < 1) return 'Baru saja';
        if (mins < 60) return `${mins}m lalu`;
        if (hours < 24) return `${hours}j lalu`;
        if (days <= 3) return `${days}h lalu`;
        return new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
    };

    // Main Sorting Logic
    const sortedSites = useMemo(() => {
        return [...filteredSites].sort((a, b) => {
            if (activeSortKey === 'latest_update') {
                const diff = getWoLatestTs(b.site_id) - getWoLatestTs(a.site_id);
                return activeSortDir === 'desc' ? diff : -diff;
            }
            // Default: longest days in stage first
            if (a.stage === 'imported' && b.stage !== 'imported') return 1;
            if (b.stage === 'imported' && a.stage !== 'imported') return -1;
            const dateA = a.stage_updated_at ? new Date(a.stage_updated_at).getTime() : Date.now();
            const dateB = b.stage_updated_at ? new Date(b.stage_updated_at).getTime() : Date.now();
            return dateA - dateB;
        });
    }, [filteredSites, activeSortKey, activeSortDir]);

    // Split into Assigned and Unassigned
    const { assignedSites } = useMemo(() => {
        const assigned = sortedSites.filter(s => atpWorkOrders.some(wo => wo.site_id === s.site_id));
        return { assignedSites: assigned };
    }, [sortedSites, atpWorkOrders.length]);

    const handleAssignProject = async (siteId: string, projectType: ProjectType) => {
        // 1. Create minimal work order
        const newWo: AtpWorkOrder = {
            id: `atp-new-${siteId.toLowerCase()}-${Date.now()}`,
            site_id: siteId,
            atp_number: '',
            sow_id: '',
            po_number: '',
            sector: 1,
            site_sector_key: `${siteId}-S1`,
            project_type: projectType,
            stage: 'imported',
            initiated_by: currentUser?.id || 'system',
            initiated_at: new Date().toISOString(),
            status: 'active' as const
        };

        const dbRecord = {
            site_id: siteId,
            atp_number: newWo.atp_number,
            sow_id: '',
            po_id: '',
            sector: 1,
            site_sector: `${siteId}-S1`,
            project_type: projectType,
            stage: 'imported',
            status: 'active',
            initiated_by: currentUser?.id || 'system',
            initiated_at: new Date().toISOString()
        };

        try {
            const res = await db.query<[any]>('INSERT INTO sites $record', { record: dbRecord });
            const inserted = res?.[0]?.[0];
            if (inserted?.id) {
                newWo.id = cleanRecordId(inserted.id, newWo.id);
            }
        } catch (err) {
            console.error('Failed to create sites record in SurrealDB:', err);
        }

        atpWorkOrders.push(newWo);
        triggerCountRefresh();

        // 2. Navigate to site detail with pekerjaan hash
        navigate(`/sites/${siteId}#pekerjaan/${newWo.id}`);
        setAssignModalSite(null);
    };

    // Import History grouping
    const importHistory = useMemo(() => {
        const batchMap = new Map<string, { batchRef: string; importedAt: string; importedBy: string; count: number }>();
        siteMasterRecords.forEach(r => {
            if (!r.batch_ref) return;
            if (batchMap.has(r.batch_ref)) {
                batchMap.get(r.batch_ref)!.count++;
            } else {
                batchMap.set(r.batch_ref, { batchRef: r.batch_ref, importedAt: r.imported_at, importedBy: r.imported_by, count: 1 });
            }
        });
        return Array.from(batchMap.values()).sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
    }, []);

    // Engineer/field users see the mobile implementasi view
    if (currentUser && currentUser.role === 'field_engineer') {
        return <EngineerSitesView />;
    }

    // Handlers
    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-16">

            {/* ── 1. Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Sites</h1>
                    <p className="text-slate-500 mt-1 text-sm font-medium">Semua site pekerjaan — registry dan progress operasional</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {can('export_data') && (
                        <div className="relative z-50">
                            <button
                                onClick={() => setShowExportMenu(m => !m)}
                                className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
                                title="Export data"
                            >
                                <Download className="w-4 h-4 text-slate-600" /> Export
                            </button>
                            {showExportMenu && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
                                    <button
                                        onClick={() => {
                                            exportSitesToExcel(filteredSites, `sites-export-${new Date().toISOString().slice(0,10)}.xlsx`);
                                            setShowExportMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
                                    >
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel (Filtered)
                                    </button>
                                    <button
                                        onClick={() => {
                                            exportSitesToCsv(filteredSites, `sites-export-${new Date().toISOString().slice(0,10)}.csv`);
                                            setShowExportMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
                                    >
                                        <List className="w-4 h-4 text-blue-600" /> CSV
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {hasImportAccess && (
                        <>
                            <button
                                onClick={() => setIsMultiSheetOpen(true)}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                                Import / Update Excel
                            </button>
                            <button
                                onClick={() => setIsBoqOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md transition-colors shadow-blue-500/20"
                            >
                                <Plus className="w-4 h-4" /> Import BoQ
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── 2. Action-Signal KPI Cards ─────────────────────────────── */}
            {activeTab === 'active' && (
                <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {/* Total Sites — blue, resets all filters */}
                    <div
                        onClick={() => handlePillClick('total')}
                        className={clsx(
                            'flex items-center gap-3 bg-white rounded-2xl px-4 py-3.5 cursor-pointer shrink-0',
                            'border shadow-[0_2px_8px_rgba(0,0,0,0.07)] transition-all duration-200',
                            'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]',
                            quickFilter === null ? 'ring-2 ring-blue-500/40 bg-blue-50/30 border-blue-300' : 'border-slate-200'
                        )}
                        style={{ minWidth: 168 }}
                    >
                        <div className={clsx(
                            'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                            'bg-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.35)]'
                        )}>
                            <Layers className="w-4 h-4 text-white" strokeWidth={2.2} />
                        </div>
                        <div className="flex flex-col gap-0 min-w-0">
                            <span className="text-[22px] font-extrabold leading-none tracking-tight text-[#111827]">{assignedSites.length}</span>
                            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Total Pekerjaan</span>
                            <span className="text-[11px] font-bold text-slate-400">Sedang berjalan</span>
                        </div>
                    </div>

                    {/* Belum Ditugaskan — red */}
                    <ActionCard
                        label="Belum Ditugaskan"
                        count={stats.belumDitugaskan}
                        subText="Perlu tim segera"
                        dotColor="red"
                        filterKey="belum_ditugaskan"
                        activeFilter={quickFilter}
                        onClick={() => handlePillClick('belum_ditugaskan')}
                    />

                    {/* Stuck >14 Hari — amber */}
                    <ActionCard
                        label="Stuck >14 Hari"
                        count={stats.stuckCount}
                        subText="Butuh tindakan"
                        dotColor="amber"
                        filterKey="stuck"
                        activeFilter={quickFilter}
                        onClick={() => handlePillClick('stuck')}
                    />

                    {/* Permit Expiring — amber */}
                    <ActionCard
                        label="Permit Expiring"
                        count={stats.permitExpiring}
                        subText="Dalam 14 hari"
                        dotColor="amber"
                        filterKey="permit_expiring"
                        activeFilter={quickFilter}
                        onClick={() => handlePillClick('permit_expiring')}
                    />

                    {/* Termin Menunggu — purple, hidden for field role */}
                    <ActionCard
                        label="Termin Menunggu"
                        count={stats.terminMenunggu}
                        subText="Menunggu approval"
                        dotColor="purple"
                        filterKey="termin_menunggu"
                        activeFilter={quickFilter}
                        onClick={() => handlePillClick('termin_menunggu')}
                        visible={currentUser ? currentUser.role !== 'field_engineer' : true}
                    />
                </div>
            )}

            {/* ── 3. Tabs ─────────────────────────────────────────── */}
            <div className="border-b border-slate-200">
                <div className="flex gap-8">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={clsx(
                            "pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
                            activeTab === 'active' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        )}
                    >
                        ⚡ Pekerjaan Aktif
                        <span className={clsx(
                            "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border",
                            activeTab === 'active' ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-500 border-slate-200"
                        )}>
                            {assignedSites.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={clsx(
                            "pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
                            activeTab === 'all' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        )}
                    >
                        🌐 Semua Site
                        <span className={clsx(
                            "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border",
                            activeTab === 'all' ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-500 border-slate-200"
                        )}>
                            {filteredTechnicalDetails.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={clsx(
                            "pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ml-auto",
                            activeTab === 'history' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        )}
                    >
                        📥 Riwayat Import
                    </button>
                </div>
            </div>

            {/* ── 4. Main Content Area ───────────────────────────────────── */}
            {activeTab !== 'history' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Breadcrumb: shown when coming from Dashboard */}
                    {dashFilter && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setDashFilter(null); setSearchParams(prev => { const n = new URLSearchParams(prev);['stage', 'has_issue', 'has_paid_termin', 'has_pending_termin'].forEach(k => n.delete(k)); return n; }); }}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                ← Dashboard
                            </button>
                            <span className="text-slate-300">/</span>
                            <span className="text-sm font-semibold text-slate-700">{dashFilter.label}</span>
                        </div>
                    )}
                    <div className="bg-white p-3 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] border border-slate-200 flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row gap-2 items-center">
                            <div className="relative flex-1 w-full min-w-[200px]">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari SITE_ID, nama, PO..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                />
                            </div>
                            <div className="flex gap-2 w-full md:w-auto overflow-x-auto flex-wrap">
                                <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none shrink-0"><option value="All">All Types</option>{PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
                                <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none shrink-0 capitalize"><option value="All">All Stages</option>{availableStages.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}</select>
                                <select value={filterCluster} onChange={e => setFilterCluster(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none shrink-0"><option value="All">All Clusters</option>{availableClusters.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none shrink-0"><option value="All">All Teams</option>{availableTeams.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={filterPo} onChange={e => setFilterPo(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none shrink-0"><option value="All">All POs</option>{availablePOs.map(po => <option key={po} value={po}>{po}</option>)}</select>
                                <select value={filterBatch} onChange={e => setFilterBatch(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none shrink-0 min-w-[150px]"><option value="All">All Batches</option>{availableBatches.map(b => <option key={b} value={b}>{truncate(b, 20)}</option>)}</select>
                                {activeTab === 'active' && <TableColumnToggle visibilityMap={visibilityMap} onChange={handleVisibilityChange} onReset={resetToDefault} currentCols={currentCols} />}
                                <button onClick={resetFilters} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 shrink-0 transition-colors" title="Reset all filters"><RefreshCw className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>

                    {/* ── 5. Table ───────────────────────────────────────────── */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <span className="text-sm text-slate-600 font-medium">
                                Menampilkan{' '}
                                <span className="font-bold text-slate-800">
                                    {activeTab === 'active' ? assignedSites.length : sortedSites.length}
                                </span>{' '}sites
                                {activeTab === 'active' && <span className="text-blue-600 font-bold ml-1">(Aktif)</span>}
                                {dashFilter
                                    ? <span className="text-slate-700 font-semibold"> — dari Dashboard: {dashFilter.label}</span>
                                    : quickFilter
                                        ? <span className="text-slate-700 font-semibold"> — {QUICK_FILTER_LABELS[quickFilter] ?? quickFilter}</span>
                                        : <span className="text-slate-400 italic"> — Diurutkan berdasarkan lama di stage</span>
                                }
                            </span>
                            <div className="flex items-center gap-2">
                                {dashFilter && (
                                    <button
                                        onClick={() => { setDashFilter(null); setSearchParams(prev => { const n = new URLSearchParams(prev);['stage', 'has_issue', 'has_paid_termin', 'has_pending_termin'].forEach(k => n.delete(k)); return n; }); }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold rounded-full border border-blue-200 transition-colors"
                                    >
                                        Stage: {dashFilter.label} ×
                                    </button>
                                )}
                                {quickFilter && (
                                    <button
                                        onClick={() => setQuickFilter(null)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full border border-slate-200 transition-colors"
                                    >
                                        × Hapus Filter
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto w-full max-w-full">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-white border-b border-slate-200">
                                    <tr className="bg-slate-50/50">
                                        {activeTab === 'active' ? (
                                            ACTIVE_WORK_COLS.map(c => c === 'LATEST UPDATE' ? (
                                                <th key={c}
                                                    onClick={() => toggleActiveSort('latest_update')}
                                                    className="px-4 py-3 font-semibold text-slate-600 text-[11px] uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-slate-100 transition-colors"
                                                >
                                                    <span className="flex items-center gap-1">
                                                        {c}
                                                        <span className="text-slate-400">{activeSortKey === 'latest_update' ? (activeSortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
                                                    </span>
                                                </th>
                                            ) : (
                                                <th key={c} className="px-4 py-3 font-semibold text-slate-600 text-[11px] uppercase tracking-wider">{c}</th>
                                            ))
                                        ) : (
                                            ALL_SITES_COLS.map(c => (
                                                <th key={c} className="px-4 py-3 font-semibold text-slate-600 text-[11px] uppercase tracking-wider">{c}</th>
                                            ))
                                        )}
                                        <th className="px-4 py-3 font-semibold text-slate-600 text-[11px] uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* --- MODE 1: ACTIVE TAB --- */}
                                    {activeTab === 'active' && assignedSites.map((site, idx) => {
                                        const activeWo = atpWorkOrders.find(wo => wo.site_id === site.site_id && wo.status === 'active') || atpWorkOrders.find(wo => wo.site_id === site.site_id);
                                        const task = atpTasks.find(t => t.site_id === site.site_id);

                                        return (
                                            <tr key={site.id || `${site.site_id}-${site.sector || idx}`} className="hover:bg-slate-50 transition-colors group border-b border-slate-100 last:border-0 text-xs">
                                                <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                                                <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                                                    {(() => {
                                                        const ts = getWoLatestTs(site.site_id);
                                                        const rel = fmtRelativeSites(ts || undefined);
                                                        const color = rel.includes('m lalu') || rel === 'Baru saja' ? 'text-emerald-600 font-semibold' :
                                                                      rel.includes('j lalu') ? 'text-blue-600 font-semibold' :
                                                                      rel.includes('h lalu') ? 'text-slate-700 font-medium' : 'text-slate-400';
                                                        return <span className={color} title={ts ? new Date(ts).toLocaleString('id-ID') : ''}>{rel}</span>;
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-slate-700">{site.project_type}</td>
                                                <td className="px-4 py-3 font-mono font-bold text-blue-600">{site.site_id}</td>
                                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                                    {activeWo?.atp_number ? (
                                                        <button
                                                            onClick={() => {
                                                                openTab({
                                                                    id: `atp-${activeWo.id}`,
                                                                    label: `ATP${activeWo.atp_number ? activeWo.atp_number.slice(-6) : ''}`,
                                                                    path: `/atp/${activeWo.id}`,
                                                                    icon: '📋',
                                                                    closeable: true
                                                                });
                                                            }}
                                                            className="text-blue-600 hover:underline font-mono text-xs font-bold"
                                                        >
                                                            {activeWo.atp_number}
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-xs">Belum ada ATP</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">{site.raw_data?.['SITE MOVING STATUS'] || 'Fix'}</td>
                                                <td className="px-4 py-3 text-slate-700 font-medium">{site.site_id}</td>
                                                <td className="px-4 py-3 text-slate-700 font-medium">{site.site_id}-{site.sector || '1'}</td>
                                                <td className="px-4 py-3 text-slate-600 font-medium">{site.sector || '1'}</td>
                                                <td className="px-4 py-3 text-slate-400">1</td>
                                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{site.region}</td>
                                                <td className="px-4 py-3 text-slate-500 font-mono">{site.ne_id}</td>
                                                <td className="px-4 py-3 text-slate-700 font-semibold">{site.site_name}</td>
                                                <td className="px-4 py-3 text-slate-600">{site.tower_provider}</td>
                                                <td className="px-4 py-3">
                                                    <span className={clsx(
                                                        "px-2 py-0.5 rounded text-[10px] font-bold border",
                                                        site.ineom_registered ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                                    )}>
                                                        {site.ineom_registered ? 'Registered' : 'Not Registered'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={clsx(
                                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                                            (activeWo?.permit_status?.includes('5.') || activeWo?.permit_status?.includes('7.')) ? "bg-emerald-500" :
                                                                (activeWo?.permit_status?.includes('1.') || activeWo?.permit_status?.includes('2.') || activeWo?.permit_status?.includes('3.') || activeWo?.permit_status?.includes('4.')) ? "bg-amber-500" :
                                                                    (activeWo?.permit_status?.includes('6.') || activeWo?.permit_status?.includes('9.') || activeWo?.permit_status?.includes('10.')) ? "bg-red-500" : "bg-slate-300"
                                                        )} />
                                                        <span className="font-bold text-slate-700 whitespace-nowrap">{activeWo?.permit_status || '1. Planning'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">{(activeWo as any)?.issue_status || '1. NO ISSUE'}</td>
                                                <td className="px-4 py-3 text-slate-400 italic">—</td>
                                                <td className="px-4 py-3 text-slate-400">#NAME?</td>
                                                <td className="px-4 py-3">
                                                    {(() => {
                                                        const status = activeWo?.impl_status || (site.stage === 'rfs_done' ? 'RFS' : site.stage === 'implementasi' ? 'Planning' : '—');
                                                        return (
                                                            <span className={clsx(
                                                                "px-2 py-0.5 rounded text-[10px] font-bold border",
                                                                status === 'RFS' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                                                status === 'Cancelled' ? 'text-red-600 bg-red-50 border-red-100' :
                                                                status === 'On Hold' ? 'text-purple-600 bg-purple-50 border-purple-100' :
                                                                status === '—' ? 'text-slate-400 bg-slate-50 border-slate-100' :
                                                                'text-amber-600 bg-amber-50 border-amber-100'
                                                            )}>{status}</span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500">—</td>
                                                <td className="px-4 py-3 font-bold text-slate-700">
                                                    {(() => {
                                                        const fl = people.find(p => p.id === activeWo?.field_leader_id);
                                                        return fl ? fl.name : (site as any).team_assigned || '—';
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3 text-slate-400">—</td>
                                                <td className="px-4 py-3 text-slate-400">—</td>
                                                <td className="px-4 py-3 text-slate-400">—</td>
                                                <td className="px-4 py-3">
                                                    {(() => {
                                                        const status = task ? task.tagging_status.toUpperCase() : '—';
                                                        return <span className="px-2 py-0.5 rounded text-[9px] font-black border tracking-tight bg-slate-50 border-slate-100 text-slate-500">{status}</span>;
                                                    })()}
                                                </td>
                                                <td className="px-4 py-3 text-slate-400">—</td>
                                                <td className="px-4 py-3 text-slate-400">NEED PDID</td>
                                                <td className="px-4 py-3 font-mono text-slate-500">{activeWo?.sow_id || '—'}</td>
                                                <td className="px-4 py-3 font-mono text-slate-500">{activeWo?.po_number || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{site.batch_ref || 'Batch#1'}</td>
                                                <td className="px-4 py-3 text-slate-400 italic text-[10px]">02. FFT Scan Done, Continue</td>
                                                <td className="px-4 py-3 font-bold text-slate-600">P2</td>
                                                <td className="px-4 py-3 font-mono text-slate-400">{site.latitude || '—'}</td>
                                                <td className="px-4 py-3 font-mono text-slate-400">{site.longitude || '—'}</td>
                                                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{new Date().toISOString().split('T')[0]}</td>

                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => navigate(`/sites/${site.site_id}`)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {/* --- MODE 2: ALL SITES TAB --- */}
                                    {/* --- MODE 2: ALL SITES TAB (Technical Details) --- */}
                                    {activeTab === 'all' && filteredTechnicalDetails.slice(0, 800).map((tech, idx) => {
                                        return (
                                            <tr key={tech.id || `tech-${idx}`} className="hover:bg-slate-50 transition-colors group border-b border-slate-100 last:border-0 text-[11px]">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-bold text-slate-700">{tech.site_id}</span>
                                                        <button
                                                            onClick={() => setAssignModalSite(tech.site_id)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center"
                                                            title="Register project type for new work"
                                                        >
                                                            <PlusCircle className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-500">{tech.ne_id}</td>
                                                <td className="px-4 py-3 text-slate-600">{tech.layer || '—'}</td>
                                                <td className="px-4 py-3 text-slate-600">{tech.sector || '1'}</td>
                                                <td className="px-4 py-3 text-slate-500 max-w-[150px] truncate">{tech.ant_type || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500">{tech.height || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500">{tech.freq_band || '—'}</td>
                                                <td className="px-4 py-3 font-mono text-slate-400">{tech.longitude}</td>
                                                <td className="px-4 py-3 font-mono text-slate-400">{tech.latitude}</td>
                                                <td className="px-4 py-3 text-slate-400 italic truncate max-w-[150px]">{tech.ant_type || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500 font-bold">{tech.tp_id || '—'}</td>
                                                <td className="px-4 py-3 text-slate-600 font-medium">{tech.tp_name || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500">MACRO</td>
                                                <td className="px-4 py-3 text-slate-500 font-mono">E_{tech.site_id}_LTE</td>
                                                <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]">{tech.cell_name || '—'}</td>
                                                <td className="px-4 py-3 text-slate-400 font-mono">{tech.enodeb_id || '—'}</td>
                                                <td className="px-4 py-3 text-slate-400">{tech.cell_id || '—'}</td>
                                                <td className="px-4 py-3 text-slate-400">{tech.local_cell_id || '—'}</td>
                                                <td className="px-4 py-3 text-slate-400 font-mono">1231</td>
                                                <td className="px-4 py-3 text-slate-400 font-mono">1231</td>
                                                <td className="px-4 py-3 font-bold text-slate-500 uppercase tracking-tight">INNER</td>
                                                <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">MBSC_DEFAULT</td>
                                                <td className="px-4 py-3 text-slate-500 italic truncate max-w-[150px]">{tech.cell_name}_S{tech.sector}</td>
                                                <td className="px-4 py-3 text-slate-700 font-bold">{tech.site_id}</td>
                                                <td className="px-4 py-3 font-bold text-slate-600">{tech.provinsi || '—'}</td>
                                                <td className="px-4 py-3 text-slate-400 truncate max-w-[200px]" title={tech.address}>{tech.address || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500">{tech.kecamatan || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500">{tech.kabupaten || '—'}</td>
                                                <td className="px-4 py-3 text-slate-500">{tech.desa || '—'}</td>
                                                <td className="px-4 py-3 font-bold text-slate-700">{tech.cluster || '—'}</td>
                                                <td className="px-4 py-3 text-slate-600 font-semibold">{tech.branch || '—'}</td>
                                                <td className="px-4 py-3 font-black text-slate-800">{tech.region || '—'}</td>

                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => navigate(`/sites/${tech.site_id}`)} className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold shadow-sm transition-all">
                                                            View
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Empty state logic */}
                                    {((activeTab === 'active' && assignedSites.length === 0) ||
                                        (activeTab === 'all' && filteredTechnicalDetails.length === 0)) && (
                                            <tr>
                                                <td colSpan={15} className="px-4 py-12 text-center text-slate-500 bg-slate-50/50">
                                                    <div className="flex flex-col items-center">
                                                        <FilterIcon className="w-8 h-8 text-slate-300 mb-2" />
                                                        <p className="font-medium text-slate-600">Tidak ada site yang cocok dengan filter</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Assign Modal */}
                    {assignModalSite && (
                        <AssignProjectModal
                            siteId={assignModalSite}
                            onClose={() => setAssignModalSite(null)}
                            onAssign={(type) => handleAssignProject(assignModalSite, type)}
                        />
                    )}
                </div>
            ) : (
                /* ── Import History (Riwayat Import Tab) ──────────────── */
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <History className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Riwayat Import</h2>
                            <p className="text-xs text-slate-500">Semua batch yang pernah diimport ke sistem</p>
                        </div>
                    </div>
                    {importHistory.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8">Belum ada riwayat import.</p>
                    ) : (
                        <div className="overflow-x-auto w-full max-w-full">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wide">Batch Name</th>
                                        <th className="text-left py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wide">Import Date</th>
                                        <th className="text-left py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wide">Imported By</th>
                                        <th className="text-center py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wide">Sites Count</th>
                                        <th className="text-right py-3 px-5 text-xs font-bold text-slate-500 uppercase tracking-wide">Original File</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {importHistory.map((batch) => (
                                        <tr key={batch.batchRef} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-3 px-5">
                                                <span className="font-mono text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shadow-sm" title={batch.batchRef}>
                                                    {truncate(batch.batchRef, 35)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 text-slate-600 whitespace-nowrap">{formatImportDate(batch.importedAt)}</td>
                                            <td className="py-3 px-5 text-slate-600 font-medium">{batch.importedBy}</td>
                                            <td className="py-3 px-5 text-center">
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100 shadow-inner">
                                                    {batch.count}
                                                </span>
                                            </td>
                                            <td className="py-3 px-5 text-right">
                                                <button onClick={() => alert(`Download batch file: ${batch.batchRef}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-colors shadow-sm">
                                                    <Download className="w-3.5 h-3.5" /> Download
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Modals ─────────────────────────────────────────────────── */}
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
                    console.log('Processed Multi-Sheet:', summary);
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

export default Sites;