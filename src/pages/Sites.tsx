import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search, Filter as FilterIcon, ArrowRight, AlertCircle, RefreshCw, FileSpreadsheet,
    Columns, Check, ChevronDown, ChevronUp, Edit3, FolderKanban, MapPin, Layers,
    CheckCircle2, Plus, Download, History
} from 'lucide-react';
import clsx from 'clsx';
import { siteMasterRecords, filterTerms, type ProjectType } from '../data/mockData';
import BulkStageUpdateModal from '../components/modals/BulkStageUpdateModal';
import ImportSiteModal from '../components/modals/ImportSiteModal';
import ImportSummaryModal, { type ImportSummaryData } from '../components/modals/ImportSummaryModal';
import ModernKPICard from '../components/stats/ModernKPICard';
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
    { id: 'REFINEN', label: 'Refinen', color: 'bg-purple-50 text-purple-600 border-purple-200' },
];

const formatImportDate = (isoString?: string): string => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const truncate = (str: string, maxLen = 25): string =>
    str && str.length > maxLen ? str.slice(0, maxLen) + '…' : str;

// ─── Termin 4-dot indicator ──────────────────────────────────────────────────
const TERMIN_STEP_STATUS_COLOR: Record<string, string> = {
    'submitted': 'bg-amber-400',
    'pending_review': 'bg-amber-300',
    'approved': 'bg-blue-500',
    'diterima': 'bg-blue-400',
    'dibayarkan': 'bg-emerald-500',
    'paid': 'bg-emerald-500',
    'rejected': 'bg-red-400',
    'open': 'bg-slate-200',
    'locked': 'bg-slate-100 border border-slate-200',
    'pending': 'bg-slate-100 border border-slate-200',
};

const TerminDots = ({ siteId }: { siteId: string }) => {
    const siteTermins = filterTerms.filter(t => t.siteId === siteId);
    if (siteTermins.length === 0) {
        return <span className="text-slate-300 font-mono text-xs">— — — —</span>;
    }
    const steps = [1, 2, 3, 4];
    return (
        <div className="flex items-center gap-1.5">
            {steps.map(step => {
                const t = siteTermins.find(x => x.step === step);
                const status = t?.status || 'locked';
                const colorClass = TERMIN_STEP_STATUS_COLOR[status] || 'bg-slate-100';
                return (
                    <span
                        key={step}
                        title={`T${step}: ${status}`}
                        className={clsx('w-2.5 h-2.5 rounded-full inline-block', colorClass)}
                    />
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
    { key: 'days', label: 'Days in Stage', defaultVisible: true },
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

// ─── Main Component ──────────────────────────────────────────────────────────
const Sites = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const hasImportAccess = ['director', 'operational', 'admin'].includes(currentUser.role);
    const [searchParams, setSearchParams] = useSearchParams();

    // Tab Toggle ('data' | 'history')
    const initialTab = searchParams.get('tab') === 'history' ? 'history' : 'data';
    const [activeTab, setActiveTab] = useState<'data' | 'history'>(initialTab as 'data' | 'history');

    useEffect(() => {
        setSearchParams({ tab: activeTab });
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

    // Quick-filter (Summary Pills)
    const [quickFilter, setQuickFilter] = useState<string | null>(null);

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

    // Summary Stats
    const stats = useMemo(() => {
        let filter = 0, combat = 0, unassigned = 0, selesai = 0, attention = 0;
        siteMasterRecords.forEach(s => {
            if (s.project_type === 'FILTER') filter++;
            else if (s.project_type === 'COMBAT') combat++;
            if (s.status === 'unassigned') unassigned++;
            if (s.stage === 'completed') selesai++;
            if (s.stage !== 'imported' && s.stage_updated_at) {
                const d = Math.floor((Date.now() - new Date(s.stage_updated_at).getTime()) / 86400000);
                if (d > 14 || (s.stage as string) === 'issue_hold') attention++;
            }
        });
        return { total: siteMasterRecords.length, filter, combat, unassigned, selesai, attention };
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
        const daysDiff = Math.floor((Date.now() - new Date(site.stage_updated_at).getTime()) / 86400000);
        const isStuck = daysDiff > 14 || site.stage_notes?.toLowerCase().includes('issue') || site.stage === 'issue_hold';
        return { text: `${daysDiff} hari`, isStuck, daysDiff };
    };

    // Main Filtering
    const filteredSites = useMemo(() => {
        return siteMasterRecords.filter(site => {
            if (quickFilter === 'unassigned' && site.status !== 'unassigned') return false;
            if (quickFilter === 'selesai' && site.stage !== 'completed') return false;
            if (quickFilter === 'attention') {
                if (site.stage === 'imported' || !site.stage_updated_at) return false;
                const d = Math.floor((Date.now() - new Date(site.stage_updated_at).getTime()) / 86400000);
                if (!(d > 14 || (site.stage as string) === 'issue_hold')) return false;
            }
            if (quickFilter === 'filter' && site.project_type !== 'FILTER') return false;
            if (quickFilter === 'combat' && site.project_type !== 'COMBAT') return false;

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
    }, [searchTerm, filterType, filterStage, filterCluster, filterTeam, filterPo, filterBatch, quickFilter]);

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
    const handleImportData = (parsedData: any[]) => {
        let newCount = 0;
        parsedData.forEach(newRow => {
            const existingIndex = siteMasterRecords.findIndex(r => r.unique_key === newRow.unique_key);
            if (existingIndex < 0) newCount++;
        });
        setSummaryData({ totalProcessed: parsedData.length, newCreated: newCount, updated: 0, coordsUpdated: 0, nameUpdated: 0, errors: 0 });
    };

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

            {/* ── 2. Summary Strip ───────────────────────────────────────── */}
            <div className="relative">
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <ModernKPICard
                        title="Total Sites"
                        value={stats.total.toString()}
                        icon={Layers}
                        iconClass="bg-blue-600 text-white"
                        onClick={() => handlePillClick('total')}
                        isActive={quickFilter === null}
                        compact
                        minWidth={170}
                        className="shrink-0"
                    />
                    <ModernKPICard
                        title="Filter Sites"
                        value={stats.filter.toString()}
                        icon={MapPin}
                        iconClass="bg-emerald-500 text-white"
                        onClick={() => handlePillClick('filter')}
                        isActive={quickFilter === 'filter'}
                        compact
                        minWidth={170}
                        className="shrink-0"
                    />
                    <ModernKPICard
                        title="Combat Sites"
                        value={stats.combat.toString()}
                        icon={FolderKanban}
                        iconClass="bg-amber-500 text-white"
                        onClick={() => handlePillClick('combat')}
                        isActive={quickFilter === 'combat'}
                        compact
                        minWidth={170}
                        className="shrink-0"
                    />
                    <ModernKPICard
                        title="Unassigned"
                        value={stats.unassigned.toString()}
                        icon={AlertCircle}
                        iconClass={stats.unassigned > 0 ? "bg-red-500 text-white" : "bg-slate-300 text-white"}
                        onClick={() => handlePillClick('unassigned')}
                        isActive={quickFilter === 'unassigned'}
                        trend={stats.unassigned > 0 ? { direction: 'down', label: 'Needs Assignment' } : undefined}
                        compact
                        minWidth={170}
                        className="shrink-0"
                    />
                    <ModernKPICard
                        title="Butuh Perhatian"
                        value={stats.attention.toString()}
                        icon={AlertCircle}
                        iconClass={stats.attention > 0 ? "bg-amber-500 text-white" : "bg-slate-300 text-white"}
                        onClick={() => handlePillClick('attention')}
                        isActive={quickFilter === 'attention'}
                        trend={stats.attention > 0 ? { direction: 'down', label: 'Stuck >14 days' } : undefined}
                        compact
                        minWidth={170}
                        className="shrink-0"
                    />
                    <ModernKPICard
                        title="Selesai"
                        value={stats.selesai.toString()}
                        icon={CheckCircle2}
                        iconClass="bg-emerald-500 text-white"
                        onClick={() => handlePillClick('selesai')}
                        isActive={quickFilter === 'selesai'}
                        trend={{ direction: 'up', label: 'Completed' }}
                        compact
                        minWidth={170}
                        className="shrink-0"
                    />
                </div>
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
                                Menampilkan <span className="font-bold text-slate-800">{sortedSites.length}</span> sites
                                <span className="text-slate-500 italic"> — Diurutkan berdasarkan lama di stage</span>
                            </span>
                            {quickFilter && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                                    Filtered: {quickFilter} <button onClick={() => setQuickFilter(null)} className="ml-1 hover:text-blue-900">×</button>
                                </span>
                            )}
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
                                        {col('days') && <th className="px-4 py-3 font-semibold text-slate-600">Days in Stage</th>}
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
                                            return (
                                                <tr key={site.site_id} className="hover:bg-slate-50/50 transition-colors group">
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
                                                            {(site as any).team_assigned
                                                                ? <span className="font-medium text-slate-700">{(site as any).team_assigned}</span>
                                                                : <span className="text-amber-500 font-medium italic select-none">Belum ditugaskan</span>
                                                            }
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
                                                    {col('termin') && <td className="px-4 py-3"><TerminDots siteId={site.site_id} /></td>}
                                                    {col('ineom') && <td className="px-4 py-3 text-center">{site.ineom_registered ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>}
                                                    {col('actions') && (
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button onClick={() => navigate(`/sites/${site.site_id}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                                                    Detail <ArrowRight className="w-3 h-3 text-slate-400" />
                                                                </button>
                                                                <button onClick={() => alert(`Update Stage for ${site.site_id}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                                                                    <Edit3 className="w-3 h-3" /> Update Stage
                                                                </button>
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
            <ImportSiteModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onAddManual={() => { setIsImportModalOpen(false); }}
                onImportExcel={(parsedData) => { handleImportData(parsedData); setIsImportModalOpen(false); }}
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