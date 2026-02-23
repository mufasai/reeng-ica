import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMemo } from 'react';
import { 
  ArrowLeft, MapPin, Users, Briefcase, Download,
  Activity, Eye, AlertCircle
} from 'lucide-react';
import { 
    projects, sites as initialSites, teams, files as initialFiles,
    filterTerms, combatTerms, type ProjectType
} from '../data/mockData';
import clsx from 'clsx';

// Helper to format currency
const formatRupiah = (amount: number) => {
    if (amount >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(0)}Jt`;
    return `Rp ${amount.toLocaleString('id-ID')}`;
};

const ProjectDetail = () => {
    const { id } = useParams<{ id: string }>();
    const { currentUser, can } = useAuth();

    const project = projects.find((p) => p.id === id);
    const projectSites = useMemo(() => initialSites.filter(s => s.projectId === id), [id]);
    const projectFiles = useMemo(() => initialFiles.filter(f => f.projectId === id), [id]);
    const filteredTeams = useMemo(() => teams.filter(t => t.projectId === id), [id]);

    if (!project) {
        return <div className="p-8 text-center text-slate-500">Project not found</div>;
    }

    // ----------------------------------------------------------------------
    // 1. STATS CALCULATION
    // ----------------------------------------------------------------------
    const totalPeople = filteredTeams.reduce((sum, t) => sum + t.members.length, 0); 
    const totalBudget = project.budget || projectSites.reduce((sum, s) => sum + s.budget, 0);

    // Used Budget & Pending Approval
    const { usedAmount, pendingAmount, pendingCount } = useMemo(() => {
        let usedAmount = 0;
        let pendingAmount = 0;
        let pendingCount = 0;
        const projectSiteIds = projectSites.map(s => s.id);

        filterTerms.forEach(t => {
            if (projectSiteIds.includes(t.siteId)) {
                if (t.status === 'paid') usedAmount += (t.amountPaid || 0);
                else if (t.status === 'approved') usedAmount += (t.amountRequest || 0);
                else if (t.status === 'pengajuan') {
                    pendingAmount += (t.amountRequest || 0);
                    pendingCount++;
                }
            }
        });

        combatTerms.forEach(term => {
            if (projectSiteIds.includes(term.siteId)) {
                term.subSteps.forEach(sub => {
                    if (sub.status === 'paid') usedAmount += (sub.amountPaid || 0);
                    else if (sub.status === 'approved') usedAmount += (sub.amountApproved || 0);
                    else if (sub.status === 'submitted' || sub.status === 'pengajuan') {
                        pendingAmount += (sub.amountRequest || sub.maxAmount);
                        pendingCount++;
                    }
                });
            }
        });

        return { usedAmount, pendingAmount, pendingCount };
    }, [projectSites]);

    const remainingBudget = totalBudget - usedAmount;
    const usedPercentage = totalBudget > 0 ? (usedAmount / totalBudget) * 100 : 0;
    const sisaPercent = totalBudget > 0 ? (remainingBudget / totalBudget) * 100 : 0;
    const isLowBudget = sisaPercent < 20;

    // ----------------------------------------------------------------------
    // 2. TERMIN DISTRIBUTION (WORKFLOW STATUS)
    // ----------------------------------------------------------------------
    const terminDistribution = useMemo(() => {
        const siteIds = projectSites.map(s => s.id);
        if (project.type === 'FILTER') {
            const matrix: Record<number, { title: string, paid: number, approved: number, pending: number, inProgress: number, locked: number }> = {
                1: { title: 'Termin 1 (30%)', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 },
                2: { title: 'Termin 2 (50%)', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 },
                3: { title: 'Termin 3 (10%)', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 },
                4: { title: 'Termin 4 (10%)', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 }
            };

            siteIds.forEach(siteId => {
                const terms = filterTerms.filter(t => t.siteId === siteId);
                terms.forEach(t => {
                    const m = matrix[t.step];
                    if (!m) return;
                    if (t.status === 'paid' || t.status === 'dibayarkan') m.paid++;
                    else if (t.status === 'approved' || t.status === 'diterima') m.approved++;
                    else if (t.status === 'pengajuan' || t.status === 'pending_review' || t.status === 'submitted') m.pending++;
                    else if (t.status === 'open' || t.status === 'rejected') m.inProgress++;
                    else m.locked++;
                });
            });
            return Object.entries(matrix).map(([step, data]) => ({ step: Number(step), ...data }));
        }

        if (project.type === 'COMBAT') {
            const matrix: Record<number, { title: string, paid: number, approved: number, pending: number, inProgress: number, locked: number }> = {
                1: { title: 'Phase 1: SITAC', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 },
                2: { title: 'Phase 2: Dimentle', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 },
                3: { title: 'Phase 3: Towing', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 },
                4: { title: 'Phase 4+: Install/Optim', paid: 0, approved: 0, pending: 0, inProgress: 0, locked: 0 }
            };

            siteIds.forEach(siteId => {
                const terms = combatTerms.filter(t => t.siteId === siteId);
                terms.forEach(t => {
                    let phaseId = t.step;
                    if (t.step >= 4) phaseId = 4;
                    const m = matrix[phaseId];
                    if (!m) return;

                    if (t.status === 'completed') m.paid++;
                    else if (t.status === 'in_progress') {
                        const hasPending = t.subSteps.some(s => s.status === 'pengajuan' || s.status === 'pending_review');
                        if (hasPending) m.pending++;
                        else m.inProgress++;
                    } else {
                        m.locked++;
                    }
                });
            });
            return Object.entries(matrix).map(([step, data]) => ({ step: Number(step), ...data }));
        }
        return [];
    }, [projectSites, project.type]);

    // Format Badge Helper
    const getTypeBadgeClass = (type: ProjectType) => {
        const types: Record<string, string> = {
            'BLACKSITE': 'bg-red-100 text-red-700 border-red-200',
            'COMBAT': 'bg-orange-100 text-orange-700 border-orange-200',
            'FILTER': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'L2H': 'bg-blue-100 text-blue-700 border-blue-200',
            'REFINEN': 'bg-purple-100 text-purple-700 border-purple-200'
        };
        return types[type] || 'bg-slate-100 text-slate-600';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-16">
            {/* 1. HEADER & QUICK ACTIONS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/dashboard" className="p-2 bg-white border border-slate-200 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
                            <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border", getTypeBadgeClass(project.type))}>
                                {project.type}
                            </span>
                            <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border", 
                                project.status === 'active' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                            )}>
                                {project.status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">Dashboard Project • ID: {project.id}</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                    {can('edit_project') && (
                        <button className="px-3 py-1.5 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap">
                            Edit Project
                        </button>
                    )}
                    {['management', 'backoffice_admin'].includes(currentUser.role) && (
                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded shadow-sm text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap">
                            + Add Site
                        </button>
                    )}
                    {currentUser.role === 'team_leader' && (
                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded shadow-sm text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap">
                            Submit Pengajuan →
                        </button>
                    )}
                    {currentUser.role === 'finance' && pendingCount > 0 && (
                        <button className="px-3 py-1.5 bg-emerald-600 text-white rounded shadow-sm text-sm font-medium hover:bg-emerald-700 transition-colors whitespace-nowrap">
                            Proses Pembayaran ({pendingCount}) →
                        </button>
                    )}
                </div>
            </div>

            {/* 2. FINANCIAL BAR (Single Horizontal Card) */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-auto md:h-[80px]">
                {/* Total Budget */}
                <div className="flex-1 p-4 md:border-r border-b md:border-b-0 border-slate-100 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Budget</span>
                    <div className="font-mono text-xl font-bold text-slate-800">{formatRupiah(totalBudget)}</div>
                </div>
                {/* Terpakai */}
                 <div className="flex-1 p-4 md:border-r border-b md:border-b-0 border-slate-100 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Terpakai</span>
                    <div className="font-mono text-xl font-bold text-slate-800">{formatRupiah(usedAmount)}</div>
                </div>
                {/* Sisa */}
                 <div className="flex-1 p-4 md:border-r border-b md:border-b-0 border-slate-100 flex flex-col justify-center">
                    <span className={clsx("text-[10px] font-bold uppercase tracking-wider mb-1", isLowBudget ? 'text-red-500' : 'text-emerald-500')}>Sisa Budget</span>
                     <div className="font-mono text-xl font-bold text-slate-800">{formatRupiah(remainingBudget)}</div>
                </div>
                {/* Progress Bar */}
                <div className="flex-[1.5] p-4 flex flex-col justify-center bg-slate-50/50">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-medium text-slate-600">Budget Utilization</span>
                        <span className="font-mono text-sm font-bold text-slate-800">{usedPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-500" style={{ width: `${usedPercentage}%` }}></div>
                        <div className="h-full bg-slate-300" style={{ width: `${pendingAmount > 0 ? (pendingAmount/totalBudget)*100 : 0}%` }} title="Pending Approval"></div>
                    </div>
                </div>
            </div>

            {/* 3. SECONDARY STATS STRIP */}
            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-md px-4 py-2 flex items-center gap-4 text-sm font-medium text-slate-600 overflow-x-auto shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <MapPin className="w-4 h-4 text-slate-400" /> 
                    <span className="text-slate-800 font-bold">{projectSites.length}</span> Sites
                </div>
                <div className="w-px h-4 bg-slate-200"></div>
                
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <Users className="w-4 h-4 text-slate-400" /> 
                    <span className="text-slate-800 font-bold">{filteredTeams.length}</span> Teams
                </div>
                <div className="w-px h-4 bg-slate-200"></div>

                <div className="flex items-center gap-2 whitespace-nowrap">
                    <Briefcase className="w-4 h-4 text-slate-400" /> 
                    <span className="text-slate-800 font-bold">{totalPeople}</span> People
                </div>
                <div className="w-px h-4 bg-slate-200"></div>

                <div className="flex items-center gap-2 whitespace-nowrap text-slate-500">
                    <Activity className="w-4 h-4 text-slate-400" /> 
                    Last: Termin 2 Review
                </div>
                <div className="w-px h-4 bg-slate-200"></div>

                <div className="flex items-center gap-2 whitespace-nowrap text-amber-600">
                    <AlertCircle className="w-4 h-4 text-amber-500" /> 
                    <span className="font-bold">{pendingCount}</span> Pending Action
                </div>
            </div>

            {/* 4. WORKFLOW STATUS (TERMIN DISTRIBUTION) */}
            {terminDistribution.length > 0 && (
                <div>
                     <h3 className="text-sm font-bold text-slate-800 mb-3 ml-1">Workflow Status</h3>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {terminDistribution.map((step) => (
                            <div key={step.step} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:border-blue-300 transition-colors cursor-pointer group">
                                <h4 className="text-xs font-bold text-slate-700 mb-2 group-hover:text-blue-600 transition-colors">{step.title}</h4>
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-emerald-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Dibayarkan</span>
                                        <span className="font-bold text-slate-700">{step.paid}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-blue-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Approved</span>
                                        <span className="font-bold text-slate-700">{step.approved}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-amber-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending Review</span>
                                        <span className="font-bold text-slate-700">{step.pending}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-slate-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> In Progress</span>
                                        <span className="font-bold text-slate-700">{step.inProgress}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 5. TWO COLUMNS (SITES & FILES) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT: SITES TABLE (65%) */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-800">Sites</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                                    <th className="px-4 py-3 font-semibold w-16">ID</th>
                                    <th className="px-4 py-3 font-semibold">Site Name</th>
                                    <th className="px-4 py-3 font-semibold">Job Name</th>
                                    <th className="px-4 py-3 font-semibold">Lokasi</th>
                                    <th className="px-4 py-3 font-semibold text-right">Budget</th>
                                    <th className="px-4 py-3 font-semibold w-24">Terpakai %</th>
                                    <th className="px-4 py-3 font-semibold">Current Termin</th>
                                    <th className="px-4 py-3 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {projectSites.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500 italic">No sites assigned to this project yet.</td>
                                    </tr>
                                ) : (
                                    projectSites.map(site => {
                                        // Mock usage
                                        const siteCost = site.budget * 0.45;
                                        const usedPct = site.budget > 0 ? (siteCost / site.budget) * 100 : 0;
                                        const pType = project?.type || 'FILTER';
                                        let currentTerminStr = '';
                                        let terminStatusStr = 'Belum Aktif';
                                        let isCompleted = false;

                                        if (pType === 'FILTER') {
                                            const sTerms = filterTerms.filter(t => t.siteId === site.id);
                                            // Find the first non-paid termin
                                            const activeTerm = sTerms.find(t => t.status !== 'paid' && t.status !== 'dibayarkan') || sTerms[sTerms.length - 1];
                                            if (activeTerm) {
                                                currentTerminStr = `T${activeTerm.step}`;
                                                terminStatusStr = activeTerm.status.replace('_', ' ');
                                                if (sTerms.every(t => t.status === 'paid' || t.status === 'dibayarkan')) {
                                                    isCompleted = true;
                                                    terminStatusStr = 'Selesai';
                                                }
                                            }
                                        } else if (pType === 'COMBAT') {
                                             const sTerms = combatTerms.filter(t => t.siteId === site.id);
                                             const activeTerm = sTerms.find(t => t.status !== 'completed') || sTerms[sTerms.length - 1];
                                             if (activeTerm) {
                                                 currentTerminStr = `Ph${activeTerm.step}`;
                                                 if (activeTerm.status === 'in_progress') terminStatusStr = 'In Progress';
                                                 else if (activeTerm.status === 'locked') terminStatusStr = 'Locked';
                                                 else terminStatusStr = activeTerm.status;
                                                 
                                                 if (sTerms.every(t => t.status === 'completed')) {
                                                     isCompleted = true;
                                                     terminStatusStr = 'Selesai';
                                                 }
                                             }
                                        }

                                        const badgeClass = isCompleted ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                           usedPct > 0 ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                           'bg-slate-100 text-slate-600 border-slate-200';
                                        
                                        return (
                                            <tr key={site.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs text-slate-500">{site.id}</td>
                                                <td className="px-4 py-3">
                                                    <Link to={`/sites/${site.id}`} className="font-bold text-blue-600 hover:text-blue-800 transition-colors">
                                                        {site.name}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate" title={site.jobName}>{site.jobName}</td>
                                                <td className="px-4 py-3 text-slate-600 text-xs">{site.location}</td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-700">{formatRupiah(site.budget)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500" style={{ width: `${usedPct}%` }}></div>
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-500">{usedPct.toFixed(0)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={clsx("inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", badgeClass)}>
                                                        {currentTerminStr} · {terminStatusStr}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Link to={`/sites/${site.id}`} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors inline-block bg-white border border-slate-200 rounded hover:bg-slate-50 shadow-sm" title="View Site">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RIGHT: PROJECT FILES (35%) */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-800">Project Files</h3>
                        {['management', 'backoffice_admin'].includes(currentUser.role) && (
                            <button className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors border border-blue-200">
                                + Add File
                            </button>
                        )}
                    </div>
                    <div className="p-0">
                        {projectFiles.length === 0 ? (
                            <div className="p-6 text-center text-sm text-slate-500 italic">No project files uploaded.</div>
                        ) : (
                            <ul className="divide-y divide-slate-100 border-b border-slate-100">
                                {projectFiles.slice(0, 5).map(file => (
                                    <li key={file.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-slate-100 rounded text-slate-500 shrink-0 border border-slate-200">
                                                <span className="font-mono text-[10px] uppercase font-bold text-slate-400">DOC</span>
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-blue-600 transition-colors cursor-pointer" title={file.title}>{file.title}</p>
                                                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{file.size}</p>
                                            </div>
                                        </div>
                                        <button className="p-1.5 text-slate-400 hover:text-blue-600 bg-white border border-slate-200 rounded hover:bg-slate-50 shadow-sm transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0 ml-2">
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {projectFiles.length > 5 && (
                            <div className="p-3 text-center">
                                <button className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">Lihat Semua Files</button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProjectDetail;
