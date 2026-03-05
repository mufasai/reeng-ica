import { useState, useMemo } from 'react';
import { Plus, FileSpreadsheet, Check } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import {
  TableContainer,
  DataTable,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  ActionButton,
  Pagination,
  EmptyState
} from '../components/common/Table';
import { siteMasterRecords } from '../data/mockData';
import ImportSiteModal from '../components/modals/ImportSiteModal';

// Custom lightweight Filter component matching the requested design
const DataMasterFilter = ({ 
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    typeFilter, setTypeFilter,
    regionFilter, setRegionFilter,
    poFilter, setPoFilter,
    ineomFilter, setIneomFilter,
    onReset
}: any) => {
    return (
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3 mb-6">
            <div className="flex flex-wrap items-center gap-3">
                <input 
                    type="text" 
                    placeholder="Search SITE_ID or Name..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 min-w-[200px]"
                />
                
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white min-w-[140px]">
                    <option value="">All Statuses</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="assigned">Assigned</option>
                    <option value="spk_active">SPK Active</option>
                    <option value="completed">Completed</option>
                    <option value="reallocated">Reallocated</option>
                    <option value="on_hold">On Hold</option>
                </select>

                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white">
                    <option value="">All Types</option>
                    <option value="FILTER">FILTER</option>
                    <option value="COMBAT">COMBAT</option>
                    <option value="BLACKSITE">BLACKSITE</option>
                </select>

                <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white">
                    <option value="">All Regions</option>
                    <option value="R03 Jakarta & Banten">R03 Jakarta & Banten</option>
                    <option value="R12 Jawa Barat">R12 Jawa Barat</option>
                </select>

                <select value={poFilter} onChange={(e) => setPoFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white">
                    <option value="">All POs</option>
                    <option value="4200052176">4200052176</option>
                    <option value="4200052273">4200052273</option>
                </select>

                <select value={ineomFilter} onChange={(e) => setIneomFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white">
                    <option value="">All INEOM</option>
                    <option value="registered">Registered</option>
                    <option value="not_registered">Not Registered</option>
                </select>

                <button onClick={onReset} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors ml-auto">
                    Reset
                </button>
            </div>
        </div>
    );
};

const SiteMasterPage = () => {
    const { currentUser } = useAuth();
    
    // Check main permissions
    const canManageSites = ['backoffice_admin', 'management'].includes(currentUser.role);
    const isRestricted = ['team_leader', 'engineer'].includes(currentUser.role);

    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [regionFilter, setRegionFilter] = useState('');
    const [poFilter, setPoFilter] = useState('');
    const [ineomFilter, setIneomFilter] = useState('');
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;
    
    // Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Filter Logic
    const filteredRecords = useMemo(() => {
        let result = [...siteMasterRecords];

        // Role-based filtering
        if (isRestricted) {
            // Need a real backend for accurate linkage, approximating by looking if the site's WO is assigned to the user's team
            // But for this mockup, team_leader sees all 'assigned'/'spk_active' linked to them
            // In lieu of actual team linking, we just restrict to assigned/active sites overall if restricted
            result = result.filter(r => ['assigned', 'spk_active', 'completed'].includes(r.status));
        }

        // Apply UI Filters
        if (searchTerm) {
            const lowerQuery = searchTerm.toLowerCase();
            result = result.filter(r => 
                r.site_id.toLowerCase().includes(lowerQuery) || 
                r.site_name.toLowerCase().includes(lowerQuery)
            );
        }
        if (statusFilter) result = result.filter(r => r.status === statusFilter);
        if (typeFilter) result = result.filter(r => r.project_type === typeFilter);
        if (regionFilter) result = result.filter(r => r.region === regionFilter);
        if (poFilter) result = result.filter(r => r.po_tsel === poFilter);
        if (ineomFilter) {
            if (ineomFilter === 'registered') result = result.filter(r => r.ineom_registered);
            if (ineomFilter === 'not_registered') result = result.filter(r => !r.ineom_registered);
        }

        return result;
    }, [isRestricted, searchTerm, statusFilter, typeFilter, regionFilter, poFilter, ineomFilter]);

    // Summary Strip Logic
    const summary = useMemo(() => {
        return {
            total: siteMasterRecords.length,
            unassigned: siteMasterRecords.filter(r => r.status === 'unassigned').length,
            active: siteMasterRecords.filter(r => r.status === 'spk_active' || r.status === 'assigned').length,
            completed: siteMasterRecords.filter(r => r.status === 'completed').length,
            reallocated: siteMasterRecords.filter(r => r.status === 'reallocated').length,
        };
    }, []);

    // Pagination Calculation
    const paginated = filteredRecords.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

    // Helpers
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'unassigned': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'assigned': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'spk_active': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'reallocated': return 'bg-slate-100 text-slate-700 border-slate-200';
            case 'on_hold': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'FILTER': return 'bg-violet-100 text-violet-700 border-violet-200';
            case 'COMBAT': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'BLACKSITE': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    const handleReset = () => {
        setSearchTerm('');
        setStatusFilter('');
        setTypeFilter('');
        setRegionFilter('');
        setPoFilter('');
        setIneomFilter('');
        setPage(1);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Site Master</h1>
                    <p className="text-slate-500">Daftar site dari TI yang menjadi dasar penugasan pekerjaan</p>
                </div>
                {canManageSites && (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsImportModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded shadow-sm transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add Site
                        </button>
                    </div>
                )}
            </div>

            {/* Summary Strip */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center gap-x-8 gap-y-4 shadow-sm text-sm">
                <div className="flex flex-col">
                    <span className="text-slate-500 font-medium">Total</span>
                    <span className="text-xl font-bold text-slate-800">{summary.total}</span>
                </div>
                <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
                <div className="flex flex-col">
                    <span className="text-amber-600 font-medium">Unassigned</span>
                    <span className="text-xl font-bold text-amber-700">{summary.unassigned}</span>
                </div>
                <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
                <div className="flex flex-col">
                    <span className="text-indigo-600 font-medium">Active (Assigned / SPK)</span>
                    <span className="text-xl font-bold text-indigo-700">{summary.active}</span>
                </div>
                <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
                <div className="flex flex-col">
                    <span className="text-emerald-600 font-medium">Completed</span>
                    <span className="text-xl font-bold text-emerald-700">{summary.completed}</span>
                </div>
                <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
                <div className="flex flex-col">
                    <span className="text-slate-500 font-medium">Reallocated</span>
                    <span className="text-xl font-bold text-slate-700">{summary.reallocated}</span>
                </div>
            </div>

            {/* Filters */}
            <DataMasterFilter 
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                regionFilter={regionFilter} setRegionFilter={setRegionFilter}
                poFilter={poFilter} setPoFilter={setPoFilter}
                ineomFilter={ineomFilter} setIneomFilter={setIneomFilter}
                onReset={handleReset}
            />

            {/* Data Table */}
            <TableContainer>
                <DataTable>
                    <TableHeader>
                        <TableHead>SITE_ID</TableHead>
                        <TableHead>Site Name</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>PO Tsel</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">INEOM</TableHead>
                        <TableHead>Work Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableHeader>
                    <TableBody>
                        {paginated.length === 0 ? (
                            <tr><td colSpan={10}><EmptyState message="No site master records found matching your filters." /></td></tr>
                        ) : (
                            paginated.map((site) => {
                                const regionAbbr = site.region.split(' ')[0] || site.region; // Extact 'R03'
                                return (
                                    <TableRow key={site.id}>
                                        <TableCell className="font-mono font-bold text-slate-800">{site.site_id}</TableCell>
                                        <TableCell>
                                            <div className="max-w-[150px] truncate" title={site.site_name}>
                                                {site.site_name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200" title={site.region}>
                                                {regionAbbr}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-slate-600 tabular-nums">{site.po_tsel}</TableCell>
                                        <TableCell className="text-center font-medium text-slate-700">{site.quantity}</TableCell>
                                        <TableCell>
                                            <span className={clsx("inline-flex items-center px-2 py-0.5 border rounded text-xs font-bold", getTypeColor(site.project_type))}>
                                                {site.project_type}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {site.ineom_registered ? 
                                                <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : 
                                                <span className="text-slate-300">—</span>
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {site.work_order_id ? (
                                                <span className="font-mono text-sm text-blue-600 hover:underline cursor-pointer">
                                                    {site.work_order_id.replace('wo-', 'WO-2024-00')}
                                                </span>
                                            ) : (
                                                <span className="text-amber-600 text-sm font-medium flex items-center gap-1">
                                                    — Belum Ditugaskan
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border", getStatusColor(site.status))}>
                                                {site.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <ActionButton type="view" onClick={() => alert(`View site ${site.site_id}`)} />
                                                {canManageSites && (
                                                    <>
                                                        <ActionButton type="edit" onClick={() => alert(`Edit site ${site.site_id}`)} />
                                                        {!site.work_order_id && site.status === 'unassigned' && (
                                                            <button 
                                                                onClick={() => alert('Link Work Order')}
                                                                className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100 rounded text-xs font-medium transition-colors"
                                                            >
                                                                Link WO
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </DataTable>
                <Pagination 
                    currentPage={page} 
                    totalPages={totalPages} 
                    totalItems={filteredRecords.length} 
                    itemsPerPage={itemsPerPage} 
                    onPageChange={setPage} 
                />
            </TableContainer>

            {/* Modals */}
            <ImportSiteModal 
                isOpen={isImportModalOpen} 
                onClose={() => setIsImportModalOpen(false)}
                onAddManual={() => {
                    alert('Add Manual Form Submitted');
                    setIsImportModalOpen(false);
                }}
                onImportExcel={() => {
                    alert('Excel Uploaded & Imported');
                    setIsImportModalOpen(false);
                }}
            />
        </div>
    );
};

export default SiteMasterPage;
