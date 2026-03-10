import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, Filter, 
    ArrowRight, AlertCircle, RefreshCw, FileSpreadsheet
} from 'lucide-react';
import clsx from 'clsx';
import { siteMasterRecords, type ProjectType } from '../data/mockData';
import BulkStageUpdateModal from '../components/modals/BulkStageUpdateModal';

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
    { id: 'REFINEN', label: 'Refinen', color: 'bg-purple-50 text-purple-600 border-purple-200' }
];

const AllSites = () => {
    const navigate = useNavigate();
    const [isBulkOpen, setIsBulkOpen] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<ProjectType | 'All'>('All');
    const [filterStage, setFilterStage] = useState<string>('All');
    const [filterCluster, setFilterCluster] = useState<string>('All');
    const [filterTeam, setFilterTeam] = useState<string>('All');

    // Derived distinct values for dropdowns
    const availableStages = useMemo(() => Array.from(new Set(siteMasterRecords.map(s => s.stage))), []);
    const availableClusters = useMemo(() => Array.from(new Set(siteMasterRecords.map(s => s.cluster).filter(Boolean))), []);
    const availableTeams = useMemo(() => Array.from(new Set(siteMasterRecords.map(s => (s as any).team_assigned).filter(Boolean))), []);

    // Filter Logic
    const filteredSites = useMemo(() => {
        return siteMasterRecords.filter(site => {
            if (filterType !== 'All' && site.project_type !== filterType) return false;
            if (filterStage !== 'All' && site.stage !== filterStage) return false;
            if (filterCluster !== 'All' && site.cluster !== filterCluster) return false;
            if (filterTeam !== 'All' && (site as any).team_assigned !== filterTeam) return false;
            
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (!site.site_id.toLowerCase().includes(term) && 
                    !site.site_name.toLowerCase().includes(term) &&
                    !((site as any).custom_po || '').toLowerCase().includes(term)) {
                    return false;
                }
            }
            return true;
        });
    }, [searchTerm, filterType, filterStage, filterCluster, filterTeam]);

    // Sorting Logic: Days in Stage DESC by default
    const sortedSites = useMemo(() => {
        return [...filteredSites].sort((a, b) => {
            // Give "Imported" the lowest priority (smallest age conceptually, represented by a negative or zero diff)
            if (a.stage === 'imported' && b.stage !== 'imported') return 1;
            if (b.stage === 'imported' && a.stage !== 'imported') return -1;

            // Sort by age DESC (oldest updated first)
            const dateA = a.stage_updated_at ? new Date(a.stage_updated_at).getTime() : Date.now();
            const dateB = b.stage_updated_at ? new Date(b.stage_updated_at).getTime() : Date.now();
            return dateA - dateB; // earliest dates first -> biggest age
        });
    }, [filteredSites]);

    // Calculate Summary Stats
    const stats = useMemo(() => {
        let filter = 0;
        let combat = 0;
        let actions = 0;
        let others = 0;

        siteMasterRecords.forEach(s => {
            if (s.project_type === 'FILTER') filter++;
            else if (s.project_type === 'COMBAT') combat++;
            else others++;

            // Mock "days in stage" logic to identify stuck sites
            if (s.stage !== 'imported' && s.stage_updated_at) {
                 const daysDiff = Math.floor((new Date().getTime() - new Date(s.stage_updated_at).getTime()) / (1000 * 3600 * 24));
                 if (daysDiff > 14 || s.stage_notes?.toLowerCase().includes('issue') || (s.stage as string) === 'issue_hold') {
                     actions++;
                 }
            }
        });

        return { total: siteMasterRecords.length, filter, combat, others, actions };
    }, []);

    const resetFilters = () => {
        setSearchTerm('');
        setFilterType('All');
        setFilterStage('All');
        setFilterCluster('All');
        setFilterTeam('All');
    };

    const getDaysInStage = (site: any) => {
        if (site.stage === 'imported' || !site.stage_updated_at) return { text: '—', isStuck: false };
        
        const updateDate = new Date(site.stage_updated_at);
        const daysDiff = Math.floor((new Date().getTime() - updateDate.getTime()) / (1000 * 3600 * 24));
        
        const isStuck = daysDiff > 14 || site.stage_notes?.toLowerCase().includes('issue') || site.stage === 'issue_hold';
        return { text: `${daysDiff} Hari`, isStuck };
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-16">
            
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Semua Sites</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Progress seluruh site lintas tipe pekerjaan</p>
                </div>
                <button onClick={() => setIsBulkOpen(true)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    Bulk Update Stage
                </button>
            </div>

            {/* Summary Strip */}
             <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-md px-4 py-2 flex items-center gap-4 text-sm font-medium text-slate-600 overflow-x-auto shadow-sm backdrop-blur-sm">
                <span className="font-bold text-slate-800">Total: {stats.total} sites</span>
                <span className="text-slate-300">•</span>
                <span>{stats.filter} Filter</span>
                <span className="text-slate-300">•</span>
                <span>{stats.combat} Combat</span>
                <span className="text-slate-300">•</span>
                <span>{stats.others} lainnya</span>
                <span className="text-slate-300">•</span>
                <span className={clsx("flex items-center gap-1", stats.actions > 0 ? "text-amber-600 font-bold" : "")}>
                    {stats.actions} butuh perhatian {stats.actions > 0 && '⚡'}
                </span>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                 <div className="relative flex-1 w-full">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Cari site ID, name, PO..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none w-[130px] shrink-0">
                        <option value="All">All Types</option>
                        {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none w-[130px] shrink-0 capitalize">
                        <option value="All">All Stages</option>
                        {availableStages.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                     <select value={filterCluster} onChange={e => setFilterCluster(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none w-[130px] shrink-0 capitalize">
                        <option value="All">All Clusters</option>
                        {availableClusters.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                     <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none w-[130px] shrink-0 capitalize">
                        <option value="All">All Teams</option>
                        {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    
                    <button 
                        onClick={resetFilters}
                        className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 shrink-0 transition-colors tooltip-trigger"
                        title="Reset Filters"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Table */}
             <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-slate-600">SITE_ID</th>
                                <th className="px-4 py-3 font-semibold text-slate-600">Site Name</th>
                                <th className="px-4 py-3 font-semibold text-slate-600">Type</th>
                                <th className="px-4 py-3 font-semibold text-slate-600">Cluster</th>
                                <th className="px-4 py-3 font-semibold text-slate-600">Region</th>
                                <th className="px-4 py-3 font-semibold text-slate-600">Team</th>
                                <th className="px-4 py-3 font-semibold text-slate-600">Stage</th>
                                <th className="px-4 py-3 font-semibold text-slate-600 cursor-pointer hover:text-slate-800" title="Sorted DESC by default">
                                    Days in Stage {sortedSites.length > 0 && <span className="ml-1 text-[10px]">▼</span>}
                                </th>
                                <th className="px-4 py-3 font-semibold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedSites.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500 bg-slate-50/50">
                                        <div className="flex flex-col items-center">
                                            <Filter className="w-8 h-8 text-slate-300 mb-2" />
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
                                            <td className="px-4 py-3 font-mono font-bold text-slate-700">{site.site_id}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-800 max-w-[200px] truncate">{site.site_name}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                 {typeObj && <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", typeObj.color)}>{typeObj.label}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 text-xs truncate max-w-[150px]">{site.cluster || '—'}</td>
                                            <td className="px-4 py-3 text-slate-600 text-xs truncate max-w-[150px]">{site.region || '—'}</td>
                                            <td className="px-4 py-3 text-xs">
                                                {(site as any).team_assigned ? (
                                                     <span className="font-medium text-slate-700">{(site as any).team_assigned}</span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={clsx(
                                                    "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                    STAGE_COLORS[site.stage as string] || STAGE_COLORS['imported']
                                                )}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 mr-1.5"></span>
                                                    {site.stage.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                 <span className={clsx(
                                                     "inline-flex items-center gap-1.5 font-mono text-xs font-semibold px-2 py-1 rounded-md",
                                                     isStuck ? "bg-amber-100 text-amber-700 shadow-sm border border-amber-200" : "text-slate-500"
                                                 )}>
                                                    {isStuck && <AlertCircle className="w-3.5 h-3.5" />}
                                                    {daysText}
                                                 </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button 
                                                    onClick={() => navigate(`/sites/${site.site_id}`)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-600 rounded text-xs font-bold transition-all shadow-sm group-hover:shadow"
                                                >
                                                    Detail <ArrowRight className="w-3 h-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Placeholder */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="text-xs text-slate-500 font-medium tracking-wide">
                        Showing <span className="font-bold text-slate-700">{sortedSites.length}</span> results
                    </div>
                </div>
            </div>

            <BulkStageUpdateModal 
                isOpen={isBulkOpen} 
                onClose={() => setIsBulkOpen(false)} 
            />
        </div>
    );
};

export default AllSites;
