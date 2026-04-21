import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Filter as FilterIcon, ArrowRight, AlertCircle, RefreshCw, FileSpreadsheet,
    Columns, Check, ChevronDown, ChevronUp, Edit3,
    Plus, Download, History, Layers
} from 'lucide-react';
import clsx from 'clsx';
import { siteMasterRecords, type ProjectType, getTerminSummary, people } from '../data/mockData';
import BulkStageUpdateModal from '../components/modals/BulkStageUpdateModal';
import MultiSheetExcelModal from '../components/modals/MultiSheetExcelModal';
import ImportSummaryModal, { type ImportSummaryData } from '../components/modals/ImportSummaryModal';
import { useAuth } from '../context/AuthContext';

// ─── Constants & Helpers ────────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
    'imported': 'bg-gray-100 text-gray-700 border-gray-200',
    'assigned': 'bg-gray-100 text-gray-700 border-gray-200',
    'permit_process': 'bg-amber-100 text-amber-700 border-amber-200',
    'permit_ready': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'akses_process': 'bg-blue-100 text-blue-700 border-blue-200',
    'akses_ready': 'bg-blue-100 text-blue-700 border-blue-200',
    'implementasi': 'bg-violet-100 text-violet-700 border-violet-200',
    'rfi_done': 'bg-violet-100 text-violet-700 border-violet-200',
    'rfs_done': 'bg-violet-100 text-violet-700 border-violet-200',
    'dokumen_done': 'bg-orange-100 text-orange-700 border-orange-200',
    'bast': 'bg-orange-100 text-orange-700 border-orange-200',
    'invoice': 'bg-orange-100 text-orange-700 border-orange-200',
    'completed': 'bg-emerald-500 text-white border-emerald-600',
    'issue_hold': 'bg-red-100 text-red-700 border-red-200',
};

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

// ─── Termin 4-dot indicator ──────────────────────────────────────────────────
const TerminDots = ({ summaryData }: { summaryData: any }) => {
    if (!summaryData) return <span className="text-slate-300 font-mono text-xs">— — — —</span>;
    const summary = summaryData.summary;
    const dotKeys = ['t1', 't2a', 't2b', 't2c', 't3', 't4'];
    
    return (
        <div className="flex items-center gap-1">
            {dotKeys.map((k) => {
                const status = summary[k]?.status || 'locked';
                let colorClass = 'bg-slate-200'; // open
                if (status === 'locked') colorClass = 'bg-slate-100 border border-slate-200';
                if (status === 'paid' || status === 'approved') colorClass = 'bg-[#10B981]';
                if (status === 'submitted') {
                    if (summaryData.pending_termin_key?.toLowerCase() === k) {
                        colorClass = 'bg-[#EF4444] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]';
                    } else {
                        colorClass = 'bg-[#F59E0B]';
                    }
                }
                
                return (
                    <div key={k} className="flex items-center">
                        <span
                            title={`${k.toUpperCase()}: ${status}`}
                            className={clsx('w-2.5 h-2.5 rounded-full inline-block', colorClass)}
                        />
                        {/* Spacing adjustments: T2a,b,c are grouped */}
                        {(k === 't1' || k === 't2c' || k === 't3') && (
                            <div className="w-1.5 h-[1px] bg-slate-200 mx-1" />
                        )}
                        {(k === 't2a' || k === 't2b') && (
                            <div className="w-0.5 h-[1px] bg-slate-200 mx-0.5" />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ─── Columns Definitions & Visibility ─────────────────────────────────────────
interface ColDef { key: string; label: string; defaultVisible: boolean; }
const ALL_COLS: ColDef[] = [
    { key: 'site_id', label: 'SITE_ID', defaultVisible: true },
    { key: 'site_name', label: 'Site Name', defaultVisible: true },
    { key: 'type', label: 'Type', defaultVisible: true },
    { key: 'sector', label: 'Sector', defaultVisible: true },
    { key: 'cluster', label: 'Cluster', defaultVisible: true },
    { key: 'region', label: 'Region', defaultVisible: false },
    { key: 'po_tsel', label: 'PO Tsel', defaultVisible: true },
    { key: 'qty', label: 'Qty', defaultVisible: false },
    { key: 'imported_from', label: 'Imported From', defaultVisible: false },
    { key: 'import_date', label: 'Import Date', defaultVisible: false },
    { key: 'team', label: 'Team', defaultVisible: true },
    { key: 'stage', label: 'Stage', defaultVisible: true },
    { key: 'days', label: 'Last Updated', defaultVisible: true },
    { key: 'termin', label: 'Termin', defaultVisible: true },
    { key: 'ineom', label: 'INEOM', defaultVisible: false },
    { key: 'actions', label: 'Actions', defaultVisible: true },
];

const LS_KEY = 'sites_columns_all';

const getInitialVisibility = (key: string, defs: ColDef[]): Record<string, boolean> => {
    try {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return Object.fromEntries(defs.map(c => [c.key, c.defaultVisible]));
};

const ColumnsToggle = ({ visibility, onChange, currentCols }: {
    visibility: Record<string, boolean>;
    onChange: (key: string, val: boolean) => void;
    currentCols: ColDef[];
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const toggleable = currentCols.filter(c => c.key !== 'site_id' && c.key !== 'actions');
    return (
        <div className="relative shrink-0" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                title="Toggle columns"
            >
                <Columns className="w-4 h-4" />
                Columns
                {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {open && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-2">
                    <p className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">Show / Hide</p>
                    {toggleable.map(col => (
                        <label
                            key={col.key}
                            className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={!!visibility[col.key]}
                                onChange={e => onChange(col.key, e.target.checked)}
                                className="accent-blue-500 w-3.5 h-3.5"
                            />
                            <span className="text-sm text-slate-700">{col.label}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

const ImportedFromBadge = ({ value }: { value?: string }) => {
    if (!value) return <span className="text-slate-300">—</span>;
    const display = truncate(value, 25);
    return (
        <span
            title={value}
            className="inline-flex items-center px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-slate-500 font-mono text-[11px] leading-tight cursor-default"
        >
            {display}
        </span>
    );
};

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
        red:    'bg-red-500',
        amber:  'bg-amber-500',
        purple: 'bg-purple-500',
        blue:   'bg-blue-600',
    };
    const subTextMap: Record<DotColor, string> = {
        red:    'text-red-600',
        amber:  'text-amber-600',
        purple: 'text-purple-600',
        blue:   'text-slate-400',
    };
    const alertBorderMap: Record<DotColor, string> = {
        red:    count > 0 ? 'border-red-300 bg-red-50/40' : 'border-slate-200',
        amber:  count > 0 ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200',
        purple: 'border-slate-200',
        blue:   'border-slate-200',
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
    const { currentUser } = useAuth();
    const hasImportAccess = ['director', 'operational', 'admin'].includes(currentUser.role);
    const [searchParams, setSearchParams] = useSearchParams();

    // Tab Toggle ('data' | 'history')
    const initialTab = searchParams.get('tab') === 'history' ? 'history' : 'data';
    const [activeTab, setActiveTab] = useState<'data' | 'history'>(initialTab as 'data' | 'history');

    useEffect(() => {
        // Preserve any dash filter params already in the URL; only update the tab key
        setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('tab', activeTab); return n; });
    }, [activeTab, setSearchParams]);

    // Modals
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [summaryData, setSummaryData] = useState<ImportSummaryData | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<ProjectType | 'All'>('All');
    const [filterStage, setFilterStage] = useState<string>('All');
    const [filterCluster, setFilterCluster] = useState<string>('All');
    const [filterTeam, setFilterTeam] = useState<string>('All');
    const [filterPo, setFilterPo] = useState<string>('All');
    const [filterBatch, setFilterBatch] = useState<string>('All');

    // Quick-filter (action cards on this page)
    const [quickFilter, setQuickFilter] = useState<string | null>(null);

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
    const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>(() => getInitialVisibility(LS_KEY, ALL_COLS));

    const handleVisChange = (key: string, val: boolean) => {
        setVisibilityMap(pr => { const nx = { ...pr, [key]: val }; try { localStorage.setItem(LS_KEY, JSON.stringify(nx)); } catch { } return nx; });
    };

    const col = (key: string) => visibilityMap[key] !== false;
    const currentCols = ALL_COLS;

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

    const getDaysInStage = (site: any) => {
        if (site.stage === 'imported' || !site.stage_updated_at) return { text: '—', isStuck: false, daysDiff: 0 };
        const d = new Date(site.stage_updated_at);
        const text = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('.', ':');
        const daysDiff = Math.floor((Date.now() - d.getTime()) / 86400000);
        const isStuck = daysDiff > 14 || site.stage_notes?.toLowerCase().includes('issue') || site.stage === 'issue_hold';
        return { text, isStuck, daysDiff };
    };

    // Quick-filter label map (for table header)
    const QUICK_FILTER_LABELS: Record<string, string> = {
        belum_ditugaskan: 'Belum Ditugaskan',
        stuck:            'Stuck >14 Hari',
        permit_expiring:  'Permit Expiring',
        termin_menunggu:  'Termin Menunggu',
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

    // Main Sorting Logic (sort by longest days in stage descending by default)
    const sortedSites = useMemo(() => {
        return [...filteredSites].sort((a, b) => {
            if (a.stage === 'imported' && b.stage !== 'imported') return 1;
            if (b.stage === 'imported' && a.stage !== 'imported') return -1;
            const dateA = a.stage_updated_at ? new Date(a.stage_updated_at).getTime() : Date.now();
            const dateB = b.stage_updated_at ? new Date(b.stage_updated_at).getTime() : Date.now();
            return dateA - dateB;
        });
    }, [filteredSites]);

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

    // Handlers
    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-16">

            {/* ── 1. Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Sites</h1>
                    <p className="text-slate-500 mt-1 text-sm font-medium">Semua site pekerjaan — registry dan progress operasional</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsBulkOpen(true)}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                        Bulk Update Stage
                    </button>
                    {hasImportAccess && (
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md transition-colors shadow-blue-500/20"
                        >
                            <Plus className="w-4 h-4" /> Import BoQ
                        </button>
                    )}
                </div>
            </div>

            {/* ── 2. Action-Signal KPI Cards ─────────────────────────────── */}
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
                        <span className="text-[22px] font-extrabold leading-none tracking-tight text-[#111827]">{stats.total}</span>
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Total Sites</span>
                        <span className="text-[11px] font-bold text-slate-400">Semua site</span>
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
                    visible={!['field'].includes(currentUser.role)}
                />
            </div>

            {/* ── 3. Tabs ─────────────────────────────────────────── */}
            <div className="border-b border-slate-200">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('data')}
                        className={clsx(
                            "pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
                            activeTab === 'data' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        )}
                    >
                        📋 Sites Data
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={clsx(
                            "pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2",
                            activeTab === 'history' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                        )}
                    >
                        📥 Riwayat Import
                    </button>
                </div>
            </div>

            {/* ── 4. Main Content Area ───────────────────────────────────── */}
            {activeTab === 'data' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Breadcrumb: shown when coming from Dashboard */}
                    {dashFilter && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setDashFilter(null); setSearchParams(prev => { const n = new URLSearchParams(prev); ['stage','has_issue','has_paid_termin','has_pending_termin'].forEach(k => n.delete(k)); return n; }); }}
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
                                <ColumnsToggle visibility={visibilityMap} onChange={handleVisChange} currentCols={currentCols} />
                                <button onClick={resetFilters} className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 shrink-0 transition-colors" title="Reset all filters"><RefreshCw className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>

                    {/* ── 5. Table ───────────────────────────────────────────── */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <span className="text-sm text-slate-600 font-medium">
                                Menampilkan{' '}
                                <span className="font-bold text-slate-800">{sortedSites.length}</span>{' '}sites
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
                                        onClick={() => { setDashFilter(null); setSearchParams(prev => { const n = new URLSearchParams(prev); ['stage','has_issue','has_paid_termin','has_pending_termin'].forEach(k => n.delete(k)); return n; }); }}
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

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-white border-b border-slate-200">
                                    <tr>
                                        {col('site_id') && <th className="px-4 py-3 font-semibold text-slate-600">SITE_ID</th>}
                                        {col('site_name') && <th className="px-4 py-3 font-semibold text-slate-600">Site Name</th>}
                                        {col('type') && <th className="px-4 py-3 font-semibold text-slate-600">Type</th>}
                                        {col('sector') && <th className="px-4 py-3 font-semibold text-slate-600">Sector</th>}
                                        {col('cluster') && <th className="px-4 py-3 font-semibold text-slate-600">Cluster</th>}
                                        {col('region') && <th className="px-4 py-3 font-semibold text-slate-600">Region</th>}
                                        {col('po_tsel') && <th className="px-4 py-3 font-semibold text-slate-600">PO Tsel</th>}
                                        {col('qty') && <th className="px-4 py-3 font-semibold text-slate-600 text-center">Qty</th>}
                                        {col('imported_from') && <th className="px-4 py-3 font-semibold text-slate-600">Imported From</th>}
                                        {col('import_date') && <th className="px-4 py-3 font-semibold text-slate-600">Import Date</th>}
                                        {col('team') && <th className="px-4 py-3 font-semibold text-slate-600">Team</th>}
                                        {col('stage') && <th className="px-4 py-3 font-semibold text-slate-600">Stage</th>}
                                        {col('days') && <th className="px-4 py-3 font-semibold text-slate-600">Last Updated</th>}
                                        {col('termin') && <th className="px-4 py-3 font-semibold text-slate-600">Termin</th>}
                                        {col('ineom') && <th className="px-4 py-3 font-semibold text-slate-600 text-center">INEOM</th>}
                                        {col('actions') && <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sortedSites.length === 0 ? (
                                        <tr>
                                            <td colSpan={15} className="px-4 py-12 text-center text-slate-500 bg-slate-50/50">
                                                <div className="flex flex-col items-center">
                                                    <FilterIcon className="w-8 h-8 text-slate-300 mb-2" />
                                                    <p className="font-medium text-slate-600">Tidak ada site yang cocok dengan filter</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedSites.map(site => {
                                            const typeObj = PROJECT_TYPES.find(t => t.id === site.project_type);
                                            const { text: daysText, isStuck } = getDaysInStage(site);
                                            const termSummary = getTerminSummary(site.site_id);
                                            const hasDirectorPending = termSummary.has_pending_approval;
                                            const rowBg = (hasDirectorPending && currentUser.role === 'director') 
                                                ? 'bg-[#FEF3C7] hover:bg-[#FDE68A] border-l-4 border-l-[#F59E0B]' 
                                                : 'hover:bg-slate-50/50';

                                            return (
                                                <tr key={site.site_id} className={clsx("transition-colors group", rowBg)}>
                                                    {col('site_id') && <td className="px-4 py-3 font-mono font-bold text-slate-700">{site.site_id}</td>}
                                                    {col('site_name') && <td className="px-4 py-3"><div className="font-semibold text-slate-800 max-w-[180px] truncate" title={site.site_name}>{site.site_name}</div></td>}
                                                    {col('type') && <td className="px-4 py-3">{typeObj && <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border', typeObj.color)}>{typeObj.label}</span>}</td>}
                                                    {col('sector') && <td className="px-4 py-3">{site.sector ? <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-sm">S{site.sector}</span> : <span className="text-slate-300">—</span>}</td>}
                                                    {col('cluster') && <td className="px-4 py-3 text-slate-600 text-xs truncate max-w-[120px]">{site.cluster || '—'}</td>}
                                                    {col('region') && <td className="px-4 py-3 text-slate-500 text-xs max-w-[110px] truncate">{site.region || '—'}</td>}
                                                    {col('po_tsel') && <td className="px-4 py-3 text-slate-600 text-xs font-mono">{site.po_tsel || '—'}</td>}
                                                    {col('qty') && <td className="px-4 py-3 text-center font-medium text-slate-700">{site.quantity}</td>}
                                                    {col('imported_from') && <td className="px-4 py-3"><ImportedFromBadge value={site.batch_ref || site.import_source} /></td>}
                                                    {col('import_date') && <td className="px-4 py-3 text-slate-600 text-sm tabular-nums whitespace-nowrap">{formatImportDate(site.imported_at)}</td>}
                                                    {col('team') && (
                                                        <td className="px-4 py-3 text-xs">
                                                            {(site as any).team_assigned ? (() => {
                                                                const fl = people.find(p => p.id === site.field_leader_id);
                                                                return (
                                                                    <span className="font-medium text-slate-700">
                                                                        {(site as any).team_assigned}
                                                                        {fl ? <span className="text-slate-500 font-normal"> · {fl.name}</span> : ''}
                                                                    </span>
                                                                );
                                                            })() : (
                                                                <span className="text-amber-500 font-medium italic select-none">Belum ditugaskan</span>
                                                            )}
                                                        </td>
                                                    )}
                                                    {col('stage') && (
                                                        <td className="px-4 py-3">
                                                            <span className={clsx('inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border', STAGE_COLORS[site.stage as string] || STAGE_COLORS['imported'])}>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 mr-1.5" />
                                                                {site.stage.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                    )}
                                                    {col('days') && (
                                                        <td className="px-4 py-3">
                                                            <span className={clsx('inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2 py-1 rounded-md', isStuck ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200' : 'text-slate-500')}>
                                                                {isStuck && <AlertCircle className="w-3 h-3" />}
                                                                {daysText}
                                                            </span>
                                                        </td>
                                                    )}
                                                    {col('termin') && (
                                                        <td className="px-4 py-3">
                                                            <TerminDots summaryData={termSummary} />
                                                            {hasDirectorPending && currentUser.role === 'director' && (
                                                                <div className="text-[10px] text-[#EF4444] mt-1 font-bold animate-pulse">
                                                                    ⚠ {termSummary.pending_termin_key?.toUpperCase()} Menunggu
                                                                </div>
                                                            )}
                                                        </td>
                                                    )}
                                                    {col('ineom') && <td className="px-4 py-3 text-center">{site.ineom_registered ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>}
                                                    {col('actions') && (
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {hasDirectorPending && currentUser.role === 'director' ? (
                                                                    <button onClick={() => navigate(`/sites/${site.site_id}?tab=costs&expand=${termSummary.pending_termin_key?.toLowerCase()}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EF4444] hover:bg-red-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20">
                                                                        Review {termSummary.pending_termin_key?.toUpperCase()} <ArrowRight className="w-3 h-3" />
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => navigate(`/sites/${site.site_id}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                                                        Detail <ArrowRight className="w-3 h-3 text-slate-400" />
                                                                    </button>
                                                                )}
                                                                {!hasDirectorPending && <button onClick={() => alert(`Update Stage for ${site.site_id}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                                                                    <Edit3 className="w-3 h-3" /> Update
                                                                </button>}
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
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
                        <div className="overflow-x-auto">
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
            <BulkStageUpdateModal isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} />
            <MultiSheetExcelModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportComplete={(summary) => {
                    console.log('Processed Multi-Sheet:', summary);
                    setSummaryData(summary);
                    setIsImportModalOpen(false);
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