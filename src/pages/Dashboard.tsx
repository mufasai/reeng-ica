import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
    Building2, Users, Wallet, CheckCircle2,
    Plus, CreditCard, ChevronRight, Activity, Clock, FileText, UploadCloud, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import clsx from 'clsx';
import { 
    projects, sites, teams, workOrders, activityFeed, people,
    filterTerms, combatTerms, type ProjectType
} from '../data/mockData';

// Helper to format currency
const formatRupiah = (amount: number) => {
    if (amount >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(0)}Jt`;
    return `Rp ${amount.toLocaleString('id-ID')}`;
};

const Dashboard = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<'overview' | 'all-sites' | 'work-orders'>('overview');

    // ----------------------------------------------------------------------
    // 1. DATA AGGREGATION & FILTERING
    // ----------------------------------------------------------------------
    
    // Determine which sites are visible to the current user
    const visibleSites = useMemo(() => {
        const isRestricted = ['engineer', 'team_leader'].includes(currentUser.role);
        if (!isRestricted) return sites; // backoffice, management, finance see all
        
        const userTeamIds = teams
            .filter(t => t.members.some(m => m.personId === currentUser.id))
            .map(t => t.id);
            
        return sites.filter(s => s.teamId && userTeamIds.includes(s.teamId));
    }, [currentUser]);

    // Filter to Active Projects only (that have visible sites)
    const activeProjects = useMemo(() => {
        const visibleProjectIds = new Set(visibleSites.map(s => s.projectId));
        return projects.filter(p => p.status === 'active' && visibleProjectIds.has(p.id));
    }, [visibleSites]);
    
    // Calculate Total Budget (sum of active project budgets)
    const totalBudget = useMemo(() => activeProjects.reduce((sum, p) => sum + (p.budget || 0), 0), [activeProjects]);

    // Calculate Budget Terpakai
    // For simplicity in mock data, we'll sum up paid amounts across all terms for all active sites
    const budgetTerpakai = useMemo(() => {
        let paid = 0;
        // Filter terms
        filterTerms.forEach(t => { if (t.status === 'paid') paid += (t.amountPaid || 0); });
        // Combat terms
        combatTerms.forEach(t => {
            t.subSteps.forEach(s => { if (s.status === 'paid') paid += (s.amountPaid || 0); });
        });
        return paid;
    }, []);

    const sisaBudget = totalBudget - budgetTerpakai;
    const terpakaiPercent = totalBudget > 0 ? (budgetTerpakai / totalBudget) * 100 : 0;
    const sisaPercent = totalBudget > 0 ? (sisaBudget / totalBudget) * 100 : 0;

    // Calculate Pending Approval (Pengajuan)
    const pendingApprovals = useMemo(() => {
        let count = 0;
        let amount = 0;
        filterTerms.forEach(t => {
            if (t.status === 'pengajuan') { count++; amount += (t.amountRequest || 0); }
        });
        combatTerms.forEach(t => {
            t.subSteps.forEach(s => {
                if (s.status === 'pengajuan') { count++; amount += (s.amountRequest || 0); }
            });
        });
        return { count, amount };
    }, []);

    // Average Progress
    const avgProgress = useMemo(() => {
        if (sites.length === 0) return 0;
        let totalPct = 0;
        sites.forEach(s => {
            const p = projects.find(proj => proj.id === s.projectId);
            if (p?.type === 'FILTER') {
                let pct = 0;
                filterTerms.filter(t => t.siteId === s.id && t.status === 'paid').forEach(t => pct += t.percentage);
                totalPct += pct;
            } else if (p?.type === 'COMBAT') {
                const sTerms = combatTerms.filter(t => t.siteId === s.id);
                const max = sTerms.reduce((sum, t) => sum + t.totalMaxAmount, 0);
                if (max > 0) {
                    let paid = 0;
                    sTerms.forEach(t => t.subSteps.forEach(sub => { if (sub.status === 'paid') paid += (sub.amountPaid || 0); }));
                    totalPct += (paid / max) * 100;
                }
            }
        });
        return Math.round(totalPct / sites.length);
    }, []);

    // Secondary Stats
    // activeSitesCount and completedSitesCount need to find status from terms. 
    // For mock simplicity, we assume sites with 100% progress are completed, others are active.
    const completedSitesCount = useMemo(() => {
        return visibleSites.filter(s => {
             const p = activeProjects.find(proj => proj.id === s.projectId);
             if (p?.type === 'FILTER') {
                 return filterTerms.filter(t => t.siteId === s.id && t.status === 'paid').reduce((acc, t) => acc + t.percentage, 0) >= 100;
             }
             return false;
        }).length;
    }, [visibleSites, activeProjects]);
    const activeSitesCount = visibleSites.length - completedSitesCount;
    const totalTeamsCount = teams.length;
    const totalPeopleCount = people.length;
    const unassignedWOCount = workOrders.filter(w => w.status === 'Unassigned').length;

    // ----------------------------------------------------------------------
    // 2. PROJECT TYPE SUMMARY
    // ----------------------------------------------------------------------
    const projectTypes: { id: ProjectType; label: string; color: string; border: string; bg: string }[] = [
        { id: 'BLACKSITE', label: 'Blacksite', color: 'text-red-600', border: 'border-red-200', bg: 'bg-red-50' },
        { id: 'COMBAT', label: 'Combat', color: 'text-orange-600', border: 'border-orange-200', bg: 'bg-orange-50' },
        { id: 'FILTER', label: 'Filter', color: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50' },
        { id: 'L2H', label: 'L2H', color: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50' },
        { id: 'REFINEN', label: 'Refinen', color: 'text-purple-600', border: 'border-purple-200', bg: 'bg-purple-50' }
    ];

    const getTypeSummary = (type: ProjectType) => {
        const typeSites = visibleSites.filter(s => {
            const p = activeProjects.find(proj => proj.id === s.projectId);
            return p?.type === type;
        });
        const count = typeSites.length;
        const budget = typeSites.reduce((sum, s) => sum + s.budget, 0);
        return { count, budget };
    };

    // ----------------------------------------------------------------------
    // 3. BUTUH TINDAKAN (ACTION NEEDED)
    // ----------------------------------------------------------------------
    // Mocking a role-filtered action list based on terms
    const actionNeededList = useMemo(() => {
        let items: any[] = [];
        
        // Find filter terms needing action
        filterTerms.forEach(t => {
            if (!visibleSites.find(s => s.id === t.siteId)) return; // Only process visible sites

            if (t.status === 'pengajuan') {
                const site = visibleSites.find(s => s.id === t.siteId);
                const proj = activeProjects.find(p => p.id === site?.projectId);
                items.push({
                    id: t.id,
                    siteName: site?.name || 'Unknown',
                    type: proj?.type || 'FILTER',
                    title: t.name,
                    statusText: 'Menunggu Review',
                    reqRole: 'management',
                    link: `/sites/${t.siteId}/termins/${t.id}/review`,
                    btnText: 'Review →',
                    btnClass: 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                });
            } else if (t.status === 'approved') {
                const site = visibleSites.find(s => s.id === t.siteId);
                const proj = activeProjects.find(p => p.id === site?.projectId);
                items.push({
                    id: t.id,
                    siteName: site?.name || 'Unknown',
                    type: proj?.type || 'FILTER',
                    title: t.name,
                    statusText: 'Menunggu Pembayaran',
                    reqRole: 'finance',
                    link: `/sites/${t.siteId}/termins/${t.id}/payment`,
                    btnText: 'Bayar →',
                    btnClass: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                });
            } else if (t.status === 'pending') {
                // If it's pending, team leader can submit
                 const site = visibleSites.find(s => s.id === t.siteId);
                 const proj = activeProjects.find(p => p.id === site?.projectId);
                 // just a mock check
                 if (t.step === 1 || filterTerms.find(prev => prev.siteId === t.siteId && prev.step === t.step - 1 && prev.status === 'paid')) {
                     items.push({
                        id: t.id,
                        siteName: site?.name || 'Unknown',
                        type: proj?.type || 'FILTER',
                        title: t.name,
                        statusText: 'Siap Diajukan',
                        reqRole: 'team_leader',
                        link: `/sites/${t.siteId}/termins/create`, // usually termin create picks the term
                        btnText: 'Submit →',
                        btnClass: 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                     });
                 }
            }
        });

        // Filter by user role (mock simple logic)
        let visibleItems = items;
        if (currentUser.role === 'management' || currentUser.role === 'backoffice_admin') {
            visibleItems = items.filter(i => i.reqRole === 'management');
        } else if (currentUser.role === 'finance') {
            visibleItems = items.filter(i => i.reqRole === 'finance');
        } else if (currentUser.role === 'team_leader') {
            visibleItems = items.filter(i => i.reqRole === 'team_leader');
        } else if (currentUser.role === 'engineer') {
            visibleItems = []; // Read-only or upload only
        }

        return visibleItems.slice(0, 5);
    }, [currentUser.role]);


    // ----------------------------------------------------------------------
    // RENDER HELPERS
    // ----------------------------------------------------------------------
    const getBadgeClass = (type: ProjectType) => {
        const conf = projectTypes.find(p => p.id === type);
        return conf ? `${conf.bg} ${conf.color} border-${conf.border}` : 'bg-slate-100 text-slate-600';
    };

    return (
        <div className="space-y-6 pb-16">
            {/* SECTION 1: PAGE HEADER & QUICK ACTION BAR */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
                        <p className="text-slate-500 mt-1">Selamat datang kembali, <span className="font-semibold text-slate-700">{currentUser.name}</span> 👋</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <div className="text-slate-500 text-right">
                            <p className="font-medium text-slate-700">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p className="capitalize">{currentUser.role.replace('_', ' ')}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                            {currentUser.name.charAt(0)}
                        </div>
                    </div>
                </div>

                {/* Quick Action Bar (Role Sensitive) */}
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex gap-3 overflow-x-auto">
                    {['management', 'backoffice_admin'].includes(currentUser.role) && (
                        <>
                            <button onClick={() => navigate('/work-orders')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap">
                                <Plus className="w-4 h-4 text-blue-600" /> Input WO
                            </button>
                            <button onClick={() => navigate('/projects')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap">
                                <Plus className="w-4 h-4 text-emerald-600" /> Tambah Project
                            </button>
                        </>
                    )}
                    {currentUser.role === 'team_leader' && (
                        <>
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap">
                                <FileText className="w-4 h-4 text-amber-600" /> Ajukan Termin
                            </button>
                             <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap">
                                <CheckCircle2 className="w-4 h-4 text-blue-600" /> Buat SKP
                            </button>
                        </>
                    )}
                    {currentUser.role === 'finance' && (
                        <>
                             <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap">
                                <CreditCard className="w-4 h-4 text-emerald-600" /> Proses Pembayaran
                            </button>
                        </>
                    )}
                     {currentUser.role === 'engineer' && (
                        <>
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded shadow-sm text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap">
                                <UploadCloud className="w-4 h-4 text-blue-600" /> Upload Evidence
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* SECTION 2: FINANCIAL KPI ROW */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Total Budget */}
                <div className="kpi-gradient-blue rounded-lg border border-l-[3px] border-l-blue-400 p-4 flex flex-col justify-center h-[90px] relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="flex items-center gap-2 mb-1 relative z-10">
                        <Wallet className="w-4 h-4 text-blue-200" />
                        <span className="text-xs font-bold text-white/90 uppercase tracking-wider">Total Budget</span>
                    </div>
                    <div className="font-mono text-lg font-bold text-white relative z-10">{formatRupiah(totalBudget)}</div>
                    <div className="text-[11px] text-white/70 mt-0.5 relative z-10">{activeProjects.length} Proyek Aktif</div>
                </div>

                {/* 2. Budget Terpakai */}
                 <div className="kpi-gradient-amber rounded-lg border border-l-[3px] border-l-amber-400 p-4 flex flex-col justify-center h-[90px] relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="flex items-center gap-2 mb-1 relative z-10">
                         <CreditCard className="w-4 h-4 text-amber-200" />
                        <span className="text-xs font-bold text-white/90 uppercase tracking-wider">Terpakai</span>
                    </div>
                    <div className="font-mono text-lg font-bold text-white relative z-10">{formatRupiah(budgetTerpakai)}</div>
                    <div className="text-[11px] text-white/70 mt-0.5 relative z-10">{terpakaiPercent.toFixed(1)}% dari total budget</div>
                    {/* Micro Progress */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20 backdrop-blur-sm z-10">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]" style={{ width: `${terpakaiPercent}%` }}></div>
                    </div>
                </div>

                {/* 3. Sisa Budget */}
                 <div className="kpi-gradient-emerald rounded-lg border border-l-[3px] border-l-emerald-400 p-4 flex flex-col justify-center h-[90px] relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="flex items-center justify-between mb-1 relative z-10">
                        <div className="flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span className="text-xs font-bold text-white/90 uppercase tracking-wider">Sisa Budget</span>
                        </div>
                        <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm", {
                            'bg-emerald-400/20 text-emerald-100 border border-emerald-400/30': sisaPercent > 40,
                            'bg-amber-400/20 text-amber-100 border border-amber-400/30': sisaPercent <= 40 && sisaPercent > 20,
                            'bg-red-400/20 text-red-100 border border-red-400/30': sisaPercent <= 20
                        })}>{sisaPercent.toFixed(1)}%</span>
                    </div>
                    <div className="font-mono text-lg font-bold text-white relative z-10">{formatRupiah(sisaBudget)}</div>
                    <div className="text-[11px] text-emerald-200 mt-0.5 font-medium relative z-10">Tersedia untuk termin</div>
                </div>

                {/* 4. Menunggu Approval */}
                 <div 
                    className="kpi-gradient-yellow rounded-lg border border-l-[3px] border-l-yellow-400 p-4 flex flex-col justify-center h-[90px] cursor-pointer hover:border-yellow-300 transition-all duration-300 relative overflow-hidden group"
                    onClick={() => { /* scroll to Need Action */ }}
                >
                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="flex items-center gap-2 mb-1 relative z-10">
                        <Clock className="w-4 h-4 text-yellow-200" />
                        <span className="text-xs font-bold text-white/90 uppercase tracking-wider">Menunggu Approval</span>
                        {pendingApprovals.count > 0 && (
                            <div className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse ml-auto shadow-[0_0_8px_rgba(250,204,21,0.8)]"></div>
                        )}
                    </div>
                    <div className="text-lg font-bold text-white flex items-baseline gap-1 relative z-10">
                        {pendingApprovals.count} <span className="text-sm font-normal text-white/80">Pengajuan</span>
                    </div>
                    <div className="text-[11px] text-yellow-200 mt-0.5 font-mono font-medium relative z-10">{formatRupiah(pendingApprovals.amount)} pending</div>
                </div>

                {/* 5. Rata-rata Progress */}
                 <div className="kpi-gradient-purple rounded-lg border border-l-[3px] border-l-purple-400 p-4 flex items-center justify-between h-[90px] relative overflow-hidden group">
                     <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-purple-200" />
                            <span className="text-xs font-bold text-white/90 uppercase tracking-wider">Avg Progress</span>
                        </div>
                        <div className="text-lg font-bold text-white">{avgProgress}%</div>
                        <div className="text-[11px] text-white/70 mt-0.5">{activeSitesCount} sites active</div>
                    </div>
                    {/* Circle visual */}
                    <div className="relative w-12 h-12 flex items-center justify-center rounded-full border-[3px] border-white/20 bg-black/10 backdrop-blur-sm shadow-sm z-10">
                         <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="21" cy="21" r="21" className="stroke-current text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]" strokeWidth="3" fill="none" strokeDasharray="132" strokeDashoffset={132 - (132 * avgProgress) / 100} />
                         </svg>
                         <span className="text-[10px] font-bold text-white">{avgProgress}%</span>
                    </div>
                </div>
            </div>

            {/* SECTION 3: STATS STRIP */}
            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-md px-4 py-2 flex items-center gap-4 text-sm font-medium text-slate-600 overflow-x-auto shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <Building2 className="w-4 h-4 text-slate-400" /> 
                    <span className="text-slate-800 font-bold">{activeSitesCount}</span> Sites Active
                    <span className="text-slate-400 mx-1">·</span>
                    <span className="text-emerald-600">{completedSitesCount} completed</span>
                </div>
                <div className="w-px h-4 bg-slate-300"></div>
                
                <div className="flex items-center gap-2 whitespace-nowrap">
                    <Users className="w-4 h-4 text-slate-400" /> 
                    <span className="text-slate-800 font-bold">{totalTeamsCount}</span> Teams
                </div>
                <div className="w-px h-4 bg-slate-300"></div>

                <div className="flex items-center gap-2 whitespace-nowrap">
                    <Users className="w-4 h-4 text-slate-400" /> 
                    <span className="text-slate-800 font-bold">{totalPeopleCount}</span> People
                </div>
                <div className="w-px h-4 bg-slate-300"></div>

                <Link to="/work-orders" className="flex items-center gap-2 whitespace-nowrap hover:text-blue-600 group">
                    <FileSpreadsheet className="w-4 h-4 text-amber-500" /> 
                    <span className="text-amber-600 font-bold group-hover:underline">{unassignedWOCount}</span> Unassigned WOs
                </Link>
            </div>

            {/* SECTION 4: PROJECT TYPE SUMMARY GRID */}
             <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">Overview per Tipe Project</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {projectTypes.map(type => {
                        const summary = getTypeSummary(type.id);
                        if (summary.count === 0) {
                            return (
                                <div key={type.id} className="bg-slate-50 border border-slate-200 border-dashed rounded-lg p-3 h-[90px] flex flex-col items-center justify-center opacity-70">
                                    <span className="font-bold text-slate-400 text-sm">{type.label}</span>
                                    <span className="text-xs text-slate-400 mt-1 italic">Belum ada project</span>
                                </div>
                            );
                        }
                        return (
                            <Link 
                                key={type.id} 
                                to={`/projects/type/${type.id}/sites`}
                                className="bg-white border border-slate-200 rounded-lg p-3 h-[90px] flex flex-col justify-between hover:shadow-md hover:border-blue-300 transition-all group"
                            >
                                <div className="flex justify-between items-start">
                                    <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase", getBadgeClass(type.id))}>{type.label}</span>
                                    <span className="text-lg font-bold text-slate-800 leading-none">{summary.count} <span className="text-[10px] text-slate-500 font-normal">Sites</span></span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-[10px] text-slate-400">Total Budget</div>
                                        <div className="font-mono text-xs font-bold text-slate-700">{formatRupiah(summary.budget)}</div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* SECTION 5: DASHBOARD TABS */}
            <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={clsx(
                        "px-4 py-2.5 text-sm font-bold border-b-2 transition-colors",
                        activeTab === 'overview' ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                >
                    Overview
                </button>
                <button 
                    onClick={() => setActiveTab('all-sites')}
                    className={clsx(
                        "px-4 py-2.5 text-sm font-bold border-b-2 transition-colors",
                        activeTab === 'all-sites' ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                >
                    All Sites
                </button>
                <button 
                    onClick={() => setActiveTab('work-orders')}
                    className={clsx(
                        "px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2",
                        activeTab === 'work-orders' ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                >
                    All Work Orders
                    {unassignedWOCount > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{unassignedWOCount}</span>}
                </button>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
                    
                    {/* LEFT COLUMN (60%) */}
                    <div className="lg:col-span-7 space-y-6">
                    {/* Action Needed */}
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                Butuh Tindakan Segera
                            </h3>
                            {actionNeededList.length > 0 && (
                                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{actionNeededList.length} Tasks</span>
                            )}
                        </div>
                        <div className="divide-y divide-slate-100">
                            {actionNeededList.length === 0 ? (
                                <div className="p-6 text-center text-sm text-slate-500 italic">
                                    Tidak ada tugas yang membutuhkan tindakan Anda saat ini.
                                </div>
                            ) : (
                                actionNeededList.map(item => (
                                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase", getBadgeClass(item.type))}>{item.type}</span>
                                                <span className="font-semibold text-slate-800 text-sm">{item.siteName}</span>
                                                <span className="text-slate-400 text-xs px-2">·</span>
                                                <span className="text-slate-600 text-sm font-medium">{item.title}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-amber-500" /> {item.statusText}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => navigate(item.link)}
                                            className={clsx("px-3 py-1.5 rounded text-xs font-bold transition-colors whitespace-nowrap", item.btnClass)}
                                        >
                                            {item.btnText}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Recent Activity Feed */}
                     <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                        <div className="px-4 py-3 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800">Aktivitas Terbaru</h3>
                        </div>
                        <div className="p-4">
                            <ul className="space-y-4">
                                {activityFeed.map((log) => {
                                    const user = people.find(p => p.id === log.userId);
                                    const initial = user ? user.name.charAt(0) : '?';
                                    return (
                                        <li key={log.id} className="flex gap-3 text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                                                {initial}
                                            </div>
                                            <div className="flex-1">
                                                <div>
                                                    <span className="font-semibold text-slate-800">{user?.name || 'Unknown'}</span>{' '}
                                                    <span className="text-slate-600">{log.action}</span>
                                                    {' · '}
                                                    <span className="font-medium text-slate-700">{log.target}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 mt-0.5">{log.timestamp}</div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                     </div>
                </div>

                {/* RIGHT COLUMN (40%) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Active Projects List */}
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                         <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Proyek Aktif</h3>
                            <Link to="/projects" className="text-xs font-medium text-blue-600 hover:text-blue-700">Lihat Semua →</Link>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {activeProjects.slice(0, 4).map(p => {
                                 const pSites = sites.filter(s => s.projectId === p.id);
                                 const pBudget = p.budget || 0;
                                 // mock cost
                                 const pCost = pBudget * 0.4; 
                                 const usedPct = pBudget > 0 ? (pCost / pBudget) * 100 : 0;
                                 
                                return (
                                    <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => navigate(`/projects/${p.id}/dashboard`)}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{p.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase", getBadgeClass(p.type))}>{p.type}</span>
                                                    <span className="text-xs text-slate-500">{pSites.length} sites</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                        {/* Progress */}
                                        <div>
                                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                                <span>Budget Used</span>
                                                <span className="font-mono">{usedPct.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{width: `${usedPct}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Work Orders */}
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                         <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Work Orders</h3>
                            {['management', 'backoffice_admin'].includes(currentUser.role) && <Link to="/work-orders" className="text-xs font-medium text-blue-600 hover:text-blue-700">+ Input WO</Link>}
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                                        <th className="px-4 py-2 font-semibold">WO Number</th>
                                        <th className="px-4 py-2 font-semibold">Status</th>
                                        <th className="px-4 py-2 font-semibold">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {workOrders.slice(0, 4).map(wo => (
                                         <tr key={wo.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/work-orders/${wo.id}`)}>
                                             <td className="px-4 py-2 flex flex-col">
                                                 <span className="font-mono font-bold text-slate-700 hover:text-blue-600 transition-colors">{wo.woNumber}</span>
                                                 <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{wo.pemberiKerja}</span>
                                             </td>
                                             <td className="px-4 py-2">
                                                 <span className={clsx(
                                                    "inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                    wo.status === 'Unassigned' ? 'bg-slate-50 text-slate-600 border-slate-200' :
                                                    wo.status === 'Pending SPK Approval' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    wo.status === 'SPK Created' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'
                                                )}>
                                                    {wo.status}
                                                </span>
                                             </td>
                                             <td className="px-4 py-2 text-xs text-slate-500">{new Date(wo.tanggalWo).toLocaleDateString('id-ID', { month: 'short', day: 'numeric'})}</td>
                                         </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-4 py-2 border-t border-slate-100 text-center">
                            <Link to="/work-orders" className="text-xs text-slate-500 hover:text-slate-800">Lihat Semua WOs</Link>
                        </div>
                    </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ALL SITES */}
            {activeTab === 'all-sites' && (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm animate-in fade-in duration-300">
                     <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Semua Site</h3>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                                    <th className="px-4 py-3 font-semibold">Site ID & Name</th>
                                    <th className="px-4 py-3 font-semibold">Project & Type</th>
                                    <th className="px-4 py-3 font-semibold">Termin (Mock)</th>
                                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleSites.map(s => {
                                    const proj = activeProjects.find(p => p.id === s.projectId);
                                    return (
                                        <tr key={s.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-700">{s.name}</div>
                                                <div className="text-xs text-slate-400">{s.id.toUpperCase()}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm text-slate-600">{proj?.name || '-'}</div>
                                                {proj && <span className={clsx("mt-1 inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", getBadgeClass(proj.type))}>{proj.type}</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs text-slate-500">
                                                    Progress placeholder
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => navigate(`/sites/${s.id}`)} className="text-blue-600 hover:text-blue-700 font-medium text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded transition-colors">Lihat Detail</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {visibleSites.length === 0 && (
                            <div className="p-8 text-center text-slate-500 text-sm">Belum ada site yang aktif.</div>
                        )}
                    </div>
                </div>
            )}
            {/* TAB CONTENT: WORK ORDERS (MINI VIEW) */}
            {activeTab === 'work-orders' && (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm animate-in fade-in duration-300 p-8 text-center">
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Work Orders (Mini View)</h3>
                    <p className="text-slate-500 text-sm mb-4">You can view all your work orders here without leaving the dashboard.</p>
                    <button onClick={() => navigate('/work-orders')} className="bg-blue-600 text-white font-medium text-sm px-4 py-2 rounded shadow-sm hover:bg-blue-700 transition-colors">
                        Go to Work Orders Page →
                    </button>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
