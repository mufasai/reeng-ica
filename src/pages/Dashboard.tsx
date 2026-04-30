import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Building2, Wallet, CheckCircle2,
    CreditCard, Activity, Clock, MapPin, Copy, Check
} from 'lucide-react';
import clsx from 'clsx';
import MapWidget from '../components/MapWidget';
import ModernKPICard from '../components/stats/ModernKPICard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
    sites, activityFeed, people,
    filterTerms, combatTerms, siteMasterRecords, type ProjectType,
    teamMembersRecords, workOrders, getTerminSummary
} from '../data/mockData';
import EngineerHome from './EngineerHome';

// Helper to format currency
const formatRupiah = (amount: number) => {
    if (amount >= 1e9) return `Rp ${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `Rp ${(amount / 1e6).toFixed(0)}Jt`;
    return `Rp ${amount.toLocaleString('id-ID')}`;
};

const Dashboard = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

    // Route field engineers to their simplified view
    if (currentUser?.role === 'field') {
        return <EngineerHome />;
    }

    const initialTab = searchParams.get('tab') === 'map' ? 'map' : 'overview';
    const [activeTab, setActiveTab] = useState<'overview' | 'map'>(initialTab as any);

    useEffect(() => {
        if (searchParams.get('tab') === 'map') setActiveTab('map');
        else setActiveTab('overview');
    }, [searchParams]);

    // ----------------------------------------------------------------------
    // 1. VISIBLE SITES
    // ----------------------------------------------------------------------
    const visibleSites = useMemo(() => {
        const isRestricted = ['engineer', 'team_leader'].includes(currentUser.role);
        if (!isRestricted) return sites;
        
        const userTeamIds = teamMembersRecords
            .filter(tm => tm.person_id === currentUser.id)
            .map(tm => tm.team_id);
            
        return sites.filter(s => {
             const master = siteMasterRecords.find(sm => sm.site_id === s.id);
             if (!master?.work_order_id) return false;
             
             // Check if user is in the team assigned to this site
             const wo = workOrders.find(w => w.id === master.work_order_id);
             if (!wo || !wo.assignedTeamId) return false;
             
             return userTeamIds.includes(wo.assignedTeamId);
        });
    }, [currentUser]);

    // ----------------------------------------------------------------------
    // 2. STATUS LAPANGAN (STAGES SUMMARY FROM siteMasterRecords)
    // ----------------------------------------------------------------------
    const stageSummary = useMemo(() => {
        let survey = 0, menungguPermit = 0, permitReady = 0, aksesReady = 0;
        let implementasi = 0, prosBast = 0, invoice = 0, issues = 0, selesai = 0;

        siteMasterRecords.forEach(master => {
            const stage = master.stage || 'imported';
            if (stage === 'survey') survey++;
            else if (['assigned', 'permit_process', 'erfin_process', 'erfin_ready'].includes(stage)) menungguPermit++;
            else if (stage === 'permit_ready') permitReady++;
            else if (['akses_process', 'akses_ready'].includes(stage)) aksesReady++;
            else if (['implementasi', 'rfi_done', 'rfs_done'].includes(stage)) implementasi++;
            else if (['dokumen_done', 'bast'].includes(stage)) prosBast++;
            else if (stage === 'invoice') invoice++;
            else if (stage === 'completed') selesai++;
            if ((stage as string) === 'issue_hold' || (stage as string) === 'survey_nok' || master.stage_notes?.toLowerCase().includes('issue')) issues++;
        });
        return { survey, menungguPermit, permitReady, aksesReady, implementasi, prosBast, invoice, issues, selesai, total: siteMasterRecords.length };
    }, []);

    // ----------------------------------------------------------------------
    // 3. FINANCIAL SUMMARY
    // ----------------------------------------------------------------------
    const financials = useMemo(() => {
        let totalHarga = 0;
        let terminTerbayar = 0;
        let menungguApprovalCount = 0;
        
        // Sum total harga across active sites (from site master)
        visibleSites.forEach(s => {
            const master = siteMasterRecords.find(m => m.site_id === s.id);
            if (master) {
                totalHarga += (master as any).nilai_kontrak || (master as any).budget || 0;
            }
        });

        // Paid & Submitted 
        filterTerms.forEach(t => { 
            if (t.status === 'paid' || t.status === 'dibayarkan') terminTerbayar += (t.amountPaid || t.amountRequest || 0);
            if (['pengajuan', 'submitted', 'pending_review'].includes(t.status)) menungguApprovalCount++;
        });
        combatTerms.forEach(t => {
            t.subSteps.forEach(s => { 
                if (s.status === 'paid' || s.status === 'dibayarkan') terminTerbayar += (s.amountPaid || s.amountRequest || 0); 
                if (['pengajuan', 'submitted', 'pending_review'].includes(s.status)) menungguApprovalCount++;
            });
        });

        const sisaTagih = totalHarga > 0 ? totalHarga - terminTerbayar : 0;
        const pctTerbayar = totalHarga > 0 ? ((terminTerbayar / totalHarga) * 100).toFixed(1) : '0.0';

        return { totalHarga, terminTerbayar, menungguApprovalCount, sisaTagih, pctTerbayar };
    }, [visibleSites]);

    // ----------------------------------------------------------------------
    // 4. PROJECT TYPE SUMMARY
    // ----------------------------------------------------------------------
    const projectTypes: { id: ProjectType; label: string; color: string; bg: string }[] = [
        { id: 'BLACKSITE', label: 'Blacksite', color: 'text-[#DC2626]', bg: 'bg-red-50' },
        { id: 'COMBAT', label: 'Combat', color: 'text-[#EA580C]', bg: 'bg-orange-50' },
        { id: 'FILTER', label: 'Filter', color: 'text-[#16A34A]', bg: 'bg-green-50' },
        { id: 'L2H', label: 'L2H', color: 'text-[#2563EB]', bg: 'bg-blue-50' },
        { id: 'RESCOPING', label: 'Rescoping', color: 'text-[#0891B2]', bg: 'bg-cyan-50' }
    ];

    const getTypeSummary = (type: ProjectType) => {
        const typeMasterSites = siteMasterRecords.filter(sm => sm.project_type === type);
        const importedCount = typeMasterSites.length;

        let awal = 0;
        let permit = 0;
        let akses = 0;
        let impl = 0;
        let selesai = 0;
        typeMasterSites.forEach(s => {
           const st = s.stage as string;
           if (['imported', 'assigned'].includes(st)) awal++;
           else if (['permit_process', 'permit_ready'].includes(st)) permit++;
           else if (['akses_process', 'akses_ready'].includes(st)) akses++;
           else if (['implementasi', 'rfi_done', 'rfs_done', 'dokumen_done', 'bast', 'invoice'].includes(st)) impl++;
           else if (st === 'completed') selesai++;
        });

        return { importedCount, awal, permit, akses, impl, selesai };
    };

    // ----------------------------------------------------------------------
    // 5. LEFT COLUMN: BUTUH TINDAKAN SEGERA
    // ----------------------------------------------------------------------
    const actionNeededList = useMemo(() => {
        let items: any[] = [];
        siteMasterRecords.forEach(s => {
            const daysDiff = s.stage_updated_at ? Math.floor((Date.now() - new Date(s.stage_updated_at).getTime()) / 86400000) : 0;
            if (daysDiff > 14 || (s.stage as string) === 'issue_hold' || (s.stage as string) === 'survey_nok' || s.stage_notes?.toLowerCase().includes('issue')) {
                let displayTitle = s.stage_notes || `${s.stage?.replace('_', ' ')} > 14 hari`;
                if ((s.stage as string) === 'survey_nok') {
                    displayTitle = s.stage_notes || 'Survey NOK - Butuh Update/Cancel';
                }
                
                items.push({
                    id: s.site_id,
                    siteName: s.site_name,
                    type: s.project_type,
                    title: displayTitle,
                    link: `/all-sites`
                });
            }
        });
        return items.slice(0, 5);
    }, []);

    // ----------------------------------------------------------------------
    // 6. RIGHT COLUMN: PENGAJUAN MENUNGGU APPROVAL (Director View)
    // ----------------------------------------------------------------------
    const pendingPengajuanList = useMemo(() => {
        let list: any[] = [];
        // Use the new getTerminSummary for the new structure
        visibleSites.forEach(s => {
            const sum = getTerminSummary(s.id);
            if (sum.has_pending_approval && sum.pending_termin_key) {
               const pKey = sum.pending_termin_key as string;
               list.push({
                   id: `${s.id}-${pKey}`,
                   siteId: s.id,
                   siteName: s.name || siteMasterRecords.find(sm => sm.site_id === s.id)?.site_name || s.id,
                   title: pKey.toUpperCase(),
                   amount: sum.pending_termin_amount || 0,
                   date: sum.pending_termin_date || new Date().toISOString(),
                   terminKey: pKey.toLowerCase()
               });
            }
        });
        list.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // oldest first
        return list;
    }, [visibleSites]);

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-300">
            {/* ROW 1: HEADER (compact, no greeting) */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <h1 className="text-[32px] font-bold text-[#111827] tracking-tight">Dashboard</h1>
                
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[13px] text-[#6B7280]">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="px-3 py-1 bg-[#EFF6FF] text-[#1D4ED8] text-[11px] rounded-full uppercase font-semibold tracking-wider">
                        {currentUser.role.replace('_', ' ')}
                    </div>
                </div>
            </div>

            {/* TABS (Directly under header) */}
            <div className="flex border-b border-slate-200 mt-2">
                <button
                    onClick={() => setSearchParams({ tab: 'overview' })}
                    className={clsx(
                        "px-6 py-3 font-semibold text-sm transition-all flex items-center gap-2",
                        activeTab === 'overview'
                        ? 'bg-white shadow-sm text-[#1D4ED8] border-b-2 border-[#2563EB]'
                        : 'text-[#6B7280] hover:text-gray-900 border-b-2 border-transparent'
                    )}
                >
                    <Activity className="w-4 h-4" />
                    Overview
                </button>
                <button
                    onClick={() => setSearchParams({ tab: 'map' })}
                    className={clsx(
                        "px-6 py-3 font-semibold text-sm transition-all flex items-center gap-2",
                        activeTab === 'map'
                        ? 'bg-white shadow-sm text-[#1D4ED8] border-b-2 border-[#2563EB]'
                        : 'text-[#6B7280] hover:text-gray-900 border-b-2 border-transparent'
                    )}
                >
                    <MapPin className="w-4 h-4" />
                    Peta Sites
                </button>
            </div>

            {/* TAB CONTENT: PETA SITES */}
            {activeTab === 'map' && (
                <div className="h-[calc(100vh-200px)] w-full relative -mx-0 rounded-lg overflow-hidden border border-slate-200 mt-6">
                    <MapWidget 
                        height="100%" 
                        presetStage={searchParams.get('stage') || undefined} 
                    />
                </div>
            )}

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-300 mt-6">
                    
                    {/* ROW 1: STATUS LAPANGAN */}
                    <div>
                        <h3 className="text-[11px] font-semibold text-[#9CA3AF] tracking-[0.08em] uppercase mb-4">
                            Status Lapangan
                        </h3>
                        <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-2">
                            {([
                                { label: ['Proses','Survey'],    count: stageSummary.survey,        nav: '/sites?tab=data&stage=survey',                                               grad: 'linear-gradient(135deg,#06B6D4,#0891B2)', shadow: 'rgba(6,182,212,0.35)',    pulse: false },
                                { label: ['Menunggu','Permit'],  count: stageSummary.menungguPermit, nav: '/sites?tab=data&stage=assigned,permit_process,erfin_process,erfin_ready', grad: 'linear-gradient(135deg,#64748B,#475569)', shadow: 'rgba(71,85,105,0.35)',   pulse: false },
                                { label: ['Permit','Ready'],     count: stageSummary.permitReady,    nav: '/sites?tab=data&stage=permit_ready',                                        grad: 'linear-gradient(135deg,#F59E0B,#D97706)', shadow: 'rgba(245,158,11,0.4)', pulse: false },
                                { label: ['Akses','Ready'],      count: stageSummary.aksesReady,     nav: '/sites?tab=data&stage=akses_process,akses_ready',                           grad: 'linear-gradient(135deg,#3B82F6,#1D4ED8)', shadow: 'rgba(59,130,246,0.4)',  pulse: false },
                                { label: ['Imple-','mentasi'],   count: stageSummary.implementasi,   nav: '/sites?tab=data&stage=implementasi,rfi_done,rfs_done',                      grad: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', shadow: 'rgba(139,92,246,0.4)', pulse: false },
                                { label: ['Proses','BAST'],      count: stageSummary.prosBast,       nav: '/sites?tab=data&stage=dokumen_done,bast',                                   grad: 'linear-gradient(135deg,#F97316,#EA580C)', shadow: 'rgba(249,115,22,0.4)', pulse: false },
                                { label: ['Invoice',''],         count: stageSummary.invoice,        nav: '/sites?tab=data&stage=invoice',                                             grad: 'linear-gradient(135deg,#0EA5E9,#0284C7)', shadow: 'rgba(14,165,233,0.4)', pulse: false },
                                { label: ['Issue','⚡ Hold'],    count: stageSummary.issues,         nav: '/sites?tab=data&has_issue=true',                                            grad: 'linear-gradient(135deg,#F87171,#DC2626)', shadow: 'rgba(239,68,68,0.4)',   pulse: true  },
                                { label: ['Selesai','✓ Done'],   count: stageSummary.selesai,        nav: '/sites?tab=data&stage=completed',                                           grad: 'linear-gradient(135deg,#34D399,#059669)', shadow: 'rgba(16,185,129,0.4)', pulse: false },
                            ] as const).map((card, i) => (
                                <div key={i}
                                    onClick={() => navigate(card.nav)}
                                    className={clsx('relative rounded-xl p-3 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 overflow-hidden', card.count === 0 && 'opacity-60')}
                                    style={{ background: card.grad, boxShadow: `0 4px 14px ${card.shadow}` }}
                                >
                                    {card.pulse && card.count > 0 && (
                                        <span className="absolute top-2 right-2 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                                        </span>
                                    )}
                                    <div className="absolute -right-2 -bottom-2 text-white/10 text-[56px] font-black leading-none select-none pointer-events-none">{card.count}</div>
                                    <p className="text-white/80 text-[9px] font-semibold uppercase tracking-[0.07em] mb-1.5 leading-tight">{card.label[0]}<br/>{card.label[1]}</p>
                                    <p className="text-white text-[28px] font-black leading-none">{card.count}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ROW 2: FINANCIAL SUMMARY */}
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <ModernKPICard
                                title="Total Nilai Kontrak"
                                value={financials.totalHarga > 0 ? formatRupiah(financials.totalHarga) : '—'}
                                icon={Wallet}
                                iconClass="bg-blue-50 text-blue-600"
                                subtitle={financials.totalHarga > 0 ? 'Seluruh tipe pekerjaan' : 'Data harga belum diset'}
                                onClick={() => navigate('/sites?tab=data')}
                            />

                            <ModernKPICard
                                title="Termin Terbayar"
                                value={financials.terminTerbayar > 0 ? formatRupiah(financials.terminTerbayar) : '—'}
                                icon={CheckCircle2}
                                iconClass="bg-emerald-50 text-emerald-600"
                                subtitle={financials.totalHarga > 0 ? `${financials.pctTerbayar}% dari total kontrak` : 'Data harga belum diset'}
                                onClick={() => navigate('/sites?tab=data&has_paid_termin=true')}
                            />

                            <div className="relative">
                                {financials.menungguApprovalCount > 0 && (
                                    <span className="absolute top-2 right-2 z-10 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                                    </span>
                                )}
                                <ModernKPICard
                                    title="Menunggu Approval"
                                    value={financials.menungguApprovalCount}
                                    icon={Clock}
                                    iconClass={financials.menungguApprovalCount > 0 ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-400'}
                                    subtitle={financials.totalHarga > 0 ? 'Pengajuan termin menunggu review' : 'Data harga belum diset'}
                                    trend={financials.menungguApprovalCount > 0 ? { direction: 'down', label: 'Action Needed', colorClass: 'bg-amber-100 text-amber-700' } : undefined}
                                    onClick={() => navigate('/sites?tab=data&has_pending_termin=true')}
                                />
                            </div>

                            <ModernKPICard
                                title="Sisa Tagih"
                                value={<span className="text-blue-600">{financials.totalHarga > 0 ? formatRupiah(financials.sisaTagih) : '—'}</span>}
                                icon={CreditCard}
                                iconClass="bg-indigo-50 text-indigo-600"
                                subtitle={financials.totalHarga > 0 ? 'Belum ditagihkan' : 'Data harga belum diset'}
                            />
                        </div>
                    </div>

                    {/* ROW 3: OVERVIEW PER TIPE */}
                    <div>
                        <h3 className="text-[11px] font-semibold text-[#9CA3AF] tracking-[0.08em] uppercase mb-4 mt-8">
                            Tipe Pekerjaan
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {projectTypes.map((t) => {
                                const summary = getTypeSummary(t.id);
                                return (
                                    <Link to={`/projects/type/${t.id.toLowerCase()}/sites`} key={t.id} className={clsx(
                                        "rounded-[12px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between h-[130px]",
                                        summary.importedCount === 0 ? "bg-[#FAFAFA]" : "bg-white"
                                    )}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="text-[16px] font-bold text-[#111827]">{t.label}</h4>
                                                <span className="text-[13px] text-[#6B7280]">{summary.importedCount} Sites</span>
                                            </div>
                                            <span className={clsx("w-9 h-9 rounded-full flex items-center justify-center shadow-sm", t.bg, t.color)}>
                                                <Building2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
                                            </span>
                                        </div>
                                        
                                        <div className="mt-auto">
                                            {summary.importedCount > 0 ? (
                                                <>
                                                    <div className="text-[11px] text-[#9CA3AF] mb-1.5 truncate">
                                                        {summary.permit} Permit • {summary.impl} Impl
                                                    </div>
                                                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                                        {summary.awal > 0 && <div style={{width: `${(summary.awal/summary.importedCount)*100}%`}} className="bg-[#94A3B8] h-full" />}
                                                        {summary.permit > 0 && <div style={{width: `${(summary.permit/summary.importedCount)*100}%`}} className="bg-[#F59E0B] h-full" />}
                                                        {summary.akses > 0 && <div style={{width: `${(summary.akses/summary.importedCount)*100}%`}} className="bg-[#3B82F6] h-full" />}
                                                        {summary.impl > 0 && <div style={{width: `${(summary.impl/summary.importedCount)*100}%`}} className="bg-[#8B5CF6] h-full" />}
                                                        {summary.selesai > 0 && <div style={{width: `${(summary.selesai/summary.importedCount)*100}%`}} className="bg-[#10B981] h-full" />}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-[11px] text-[#9CA3AF]">Belum ada site</div>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* ROW 3.5: CHARTS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        {/* CHART 1: Pipeline Distribution */}
                        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden p-5">
                            <h3 className="font-bold text-[14px] text-[#111827] mb-4">Distribusi Status Site</h3>
                            <div className="h-[250px] w-full min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Menunggu Permit', value: stageSummary.menungguPermit, color: '#64748B' },
                                                { name: 'Permit Ready', value: stageSummary.permitReady, color: '#F59E0B' },
                                                { name: 'Akses Ready', value: stageSummary.aksesReady, color: '#3B82F6' },
                                                { name: 'Implementasi', value: stageSummary.implementasi, color: '#8B5CF6' },
                                                { name: 'Proses BAST', value: stageSummary.prosBast, color: '#F97316' },
                                                { name: 'Selesai', value: stageSummary.selesai, color: '#10B981' }
                                            ].filter(d => d.value > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {
                                                [
                                                    { name: 'Menunggu Permit', value: stageSummary.menungguPermit, color: '#64748B' },
                                                    { name: 'Permit Ready', value: stageSummary.permitReady, color: '#F59E0B' },
                                                    { name: 'Akses Ready', value: stageSummary.aksesReady, color: '#3B82F6' },
                                                    { name: 'Implementasi', value: stageSummary.implementasi, color: '#8B5CF6' },
                                                    { name: 'Proses BAST', value: stageSummary.prosBast, color: '#F97316' },
                                                    { name: 'Selesai', value: stageSummary.selesai, color: '#10B981' }
                                                ].filter(d => d.value > 0).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))
                                            }
                                        </Pie>
                                        <RechartsTooltip formatter={(value) => [`${value} Sites`, 'Jumlah']} />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 2: Project Type Breakdown */}
                        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden p-5">
                            <h3 className="font-bold text-[14px] text-[#111827] mb-4">Progress per Tipe Pekerjaan</h3>
                            <div className="h-[250px] w-full min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={projectTypes.map(t => {
                                            const sum = getTypeSummary(t.id);
                                            return {
                                                name: t.label,
                                                Permit: sum.permit,
                                                Akses: sum.akses,
                                                Impl: sum.impl,
                                                Selesai: sum.selesai
                                            };
                                        })}
                                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                        <RechartsTooltip cursor={{fill: '#F3F4F6'}} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                        <Bar dataKey="Permit" stackId="a" fill="#F59E0B" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="Akses" stackId="a" fill="#3B82F6" />
                                        <Bar dataKey="Impl" stackId="a" fill="#8B5CF6" />
                                        <Bar dataKey="Selesai" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* ROW 4: TWO-COLUMN LAYOUT */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* LEFT COLUMN (60%): Butuh Tindakan & Aktivitas */}
                        <div className="lg:col-span-7 space-y-6">
                            
                            {/* Butuh Tindakan Segera */}
                            <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                                <div className="px-5 py-4 flex items-center justify-between">
                                    <h3 className="font-bold text-[14px] text-[#111827] flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping opacity-75 shrink-0" />
                                        Butuh Tindakan Segera
                                    </h3>
                                    {actionNeededList.length > 0 && (
                                        <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[11px] font-bold">
                                            {actionNeededList.length} items
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    {actionNeededList.length === 0 ? (
                                        <div className="p-8 text-center flex flex-col items-center justify-center">
                                            <CheckCircle2 className="w-8 h-8 text-[#10B981] mb-2" />
                                            <span className="text-[14px] font-medium text-[#111827]">Semua site dalam kondisi normal</span>
                                            <span className="text-[13px] text-[#6B7280]">Tidak ada tindakan mendesak saat ini</span>
                                        </div>
                                    ) : (
                                        actionNeededList.map((item) => {
                                            const isCritical = item.title.includes('> 21 hari') || item.title.includes('issue_hold') || item.title.includes('Survey NOK') || item.title.toLowerCase().includes('issue');
                                            const borderColor = isCritical ? 'border-l-[#EF4444]' : 'border-l-[#F59E0B]';
                                            return (
                                                <div key={item.id} className={clsx("p-4 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors border-l-[3px] border-b border-b-slate-50 cursor-pointer group", borderColor)}>
                                                    <div>
                                                        <div className="font-semibold text-[#111827] text-[14px] mb-0.5">{item.siteName}</div>
                                                        <div className="text-[12px] text-[#6B7280]">
                                                            {item.title} · {item.type}
                                                        </div>
                                                    </div>
                                                    <div className="text-[13px] font-medium text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                        Lihat <span className="text-[16px] leading-none mb-0.5">→</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Aktivitas Terbaru */}
                            <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                                <div className="px-5 py-4">
                                    <h3 className="font-bold text-[14px] text-[#111827]">Aktivitas Terbaru</h3>
                                </div>
                                <div className="px-5 pb-5">
                                    <ul className="flex flex-col">
                                        {activityFeed.slice(0, 5).map((log, idx) => {
                                            const user = people.find(p => p.id === log.userId);
                                            const userName = user ? user.name : 'Sistem';
                                            const initial = userName.charAt(0);
                                            return (
                                                <li key={log.id} className="flex gap-3 py-3 relative">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0 z-10">
                                                        {initial}
                                                    </div>
                                                    <div className={clsx("flex-1 pb-3 flex items-start justify-between gap-4", idx < 4 ? "border-b border-slate-100" : "")}>
                                                        <div>
                                                            <div className="text-[13px] leading-snug">
                                                                <span className="font-semibold text-[#111827]">{userName}</span>{' '}
                                                                <span className="text-[#374151]">{log.action}</span>{' '}
                                                                <span className="font-medium text-[#374151]">{log.target}</span>
                                                            </div>
                                                            <div className="text-[11px] text-[#6B7280] mt-1">{log.timestamp}</div>
                                                        </div>
                                                        {log.wa_formatted_text && (
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(log.wa_formatted_text!);
                                                                    setCopiedLogId(log.id);
                                                                    setTimeout(() => setCopiedLogId(null), 2000);
                                                                }}
                                                                className={clsx(
                                                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 mt-0.5 border",
                                                                    copiedLogId === log.id 
                                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                                                                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 shadow-sm"
                                                                )}
                                                            >
                                                                {copiedLogId === log.id ? (
                                                                    <><Check className="w-3.5 h-3.5" /> Disalin</>
                                                                ) : (
                                                                    <><Copy className="w-3.5 h-3.5" /> Salin Notif</>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN (40%): Pengajuan Menunggu */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                                <div className="px-5 py-4 flex justify-between items-center bg-slate-50 border-b border-slate-100 rounded-t-[12px]">
                                    <h3 className="font-bold text-[14px] text-[#111827] flex items-center gap-2">
                                        Pengajuan Termin — Menunggu Review
                                        {pendingPengajuanList.length > 0 && <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />}
                                    </h3>
                                </div>
                                <div className="flex flex-col">
                                    {pendingPengajuanList.length === 0 ? (
                                        <div className="p-8 text-center text-[13px] text-[#6B7280] bg-[#FAFAFA]">
                                            Tidak ada pengajuan menunggu approval.
                                        </div>
                                    ) : (
                                        pendingPengajuanList.slice(0, 5).map((item, idx) => {
                                            return (
                                                <div key={`${item.id}-${idx}`} className="p-4 hover:bg-[#F9FAFB] transition-colors border-t border-slate-50 group flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 overflow-hidden">
                                                        <div className="shrink-0 mt-0.5 bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                            {item.title}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <div className="font-semibold text-[#111827] text-[13px] truncate">
                                                                {item.siteId} · {item.siteName}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-1 text-[12px] text-[#6B7280] whitespace-nowrap">
                                                                <span className="font-medium text-[#374151]">{formatRupiah(item.amount)}</span>
                                                                <span>·</span>
                                                                <span>Diajukan {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => navigate(`/sites/${item.siteId}?tab=costs&expand=${item.terminKey}`)}
                                                        className="shrink-0 text-[13px] font-medium text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                                                    >
                                                        Review <span className="text-[14px] leading-none">→</span>
                                                    </button>
                                                </div>
                                            );
                                        })
                                    )}
                                    {pendingPengajuanList.length > 5 && (
                                        <div className="p-3 border-t border-slate-100 text-center">
                                            <Link to="/sites?tab=data" className="text-[12px] font-semibold text-blue-600 hover:underline">
                                                Lihat {pendingPengajuanList.length - 5} lainnya →
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
