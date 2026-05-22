import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Building2, Wallet, CheckCircle2,
    CreditCard, Activity, Clock, MapPin, Copy, Check,
    XCircle, Upload, Landmark, AlertCircle, X, FileText
} from 'lucide-react';
import clsx from 'clsx';
import MapWidget from '../components/MapWidget';
import ModernKPICard from '../components/stats/ModernKPICard';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
    sites, activityFeed, people,
    filterTerms, combatTerms, siteMasterRecords, type ProjectType,
    teamMembersRecords, workOrders, atpWorkOrders,
    terminPengajuanRecords
} from '../data/mockData';
import EngineerHome from './EngineerHome';

// Helper to format currency
const formatRupiah = (amount: number) => {
    if (amount >= 1e9) return `Rp ${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `Rp ${(amount / 1e6).toFixed(0)}Jt`;
    return `Rp ${amount.toLocaleString('id-ID')}`;
};

const Dashboard = () => {
    const { currentUser, can } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

    const [liveRequests, setLiveRequests] = useState<any[]>(() => [...terminPengajuanRecords]);
    const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
        show: false,
        message: '',
        type: 'success'
    });

    // activeTab MUST be declared before any conditional return (Rules of Hooks)
    const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'payments'>(() => {
        const tab = searchParams.get('tab');
        if (tab === 'map') return 'map';
        if (tab === 'payments') return 'payments';
        return 'overview';
    });

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'map') setActiveTab('map');
        else if (tab === 'payments') setActiveTab('payments');
        else setActiveTab('overview');
    }, [searchParams]);

    const showToastMsg = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message: msg, type });
        setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
    };

    const syncRecords = () => {
        const updated = [...terminPengajuanRecords];
        setLiveRequests(updated);
        // Keep selectedPayment in sync if it was updated
        setSelectedPayment((prev: any) => prev ? (updated.find(r => r.id === prev.id) ?? prev) : null);
    };

    const handleApproveRequest = (id: string) => {
        setIsSaving(true);
        const rec = terminPengajuanRecords.find(r => r.id === id);
        if (rec) {
            rec.status = 'approved';
            rec.approved_by = currentUser?.name || 'Director';
            rec.approved_at = new Date().toISOString();
            rec.history = [...(rec.history || []), { action: 'approved', by: currentUser?.name || 'Director', at: new Date().toISOString() }];
        }
        syncRecords();
        showToastMsg('Pengajuan disetujui.');
        setIsSaving(false);
    };

    const handleRejectRequest = (id: string) => {
        setIsSaving(true);
        const rec = terminPengajuanRecords.find(r => r.id === id);
        if (rec) {
            rec.status = 'rejected';
            rec.history = [...(rec.history || []), { action: 'rejected', by: currentUser?.name || 'Director', at: new Date().toISOString() }];
        }
        syncRecords();
        showToastMsg('Pengajuan ditolak.');
        setIsSaving(false);
    };

    const handleMarkPaidWithFile = (id: string, files: FileList | null) => {
        if (!files || files.length === 0) {
            showToastMsg('Pilih file bukti pembayaran terlebih dahulu!', 'error');
            return;
        }
        const file = files[0];
        setIsSaving(true);
        const objectUrl = URL.createObjectURL(file);
        const rec = terminPengajuanRecords.find(r => r.id === id);
        if (rec) {
            rec.status = 'paid';
            rec.paid_at = new Date().toISOString();
            rec.bukti_pembayaran_name = file.name;
            rec.bukti_pembayaran_url = objectUrl;
            rec.history = [...(rec.history || []), { action: 'paid', by: currentUser?.name || 'Finance', at: new Date().toISOString() }];
        }
        syncRecords();
        showToastMsg(`Bukti bayar "${file.name}" berhasil diupload. Pembayaran selesai.`);
        setIsSaving(false);
    };

    // Route field engineers to their simplified view — AFTER all hooks
    if (currentUser?.role === 'field_engineer') {
        return <EngineerHome />;
    }

    // ----------------------------------------------------------------------
    // 1. VISIBLE SITES
    // ----------------------------------------------------------------------
    const visibleSites = useMemo(() => {
        const isRestricted = currentUser?.role === 'field_engineer';
        if (!isRestricted) return sites;

        const userTeamIds = teamMembersRecords
            .filter(tm => tm.person_id === (currentUser?.id ?? ''))
            .map(tm => tm.team_id);

        return sites.filter(s => {
             const master = siteMasterRecords.find(sm => sm.site_id === s.id);
             if (!master?.work_order_id) return false;
             const wo = workOrders.find(w => w.id === master.work_order_id);
             if (!wo || !wo.assignedTeamId) return false;
             return userTeamIds.includes(wo.assignedTeamId);
        });
    }, [currentUser]);

    // ----------------------------------------------------------------------
    // 2. STATUS LAPANGAN (STAGES SUMMARY FROM siteMasterRecords)
    // ----------------------------------------------------------------------
    const stageSummary = useMemo(() => {
        // Derive stage from DB fields: implementasi_status + permit_status
        let menungguPermit = 0, permitReady = 0;
        let selesai = 0, cancelled = 0, ongoing = 0;

        atpWorkOrders.forEach(wo => {
            const impl = (wo.implementasi_status || '').toUpperCase();
            const permit = (wo.permit_status || '');
            if (impl === 'RFS') { selesai++; return; }
            if (impl === 'CANCELLED') { cancelled++; return; }
            if (impl === 'ON GOING') { ongoing++; return; }
            // Awaiting or empty — classify by permit
            if (permit.startsWith('5.') || permit.startsWith('4.')) permitReady++;
            else if (permit.startsWith('9.')) cancelled++;
            else menungguPermit++;
        });

        return {
            survey: 0,
            menungguPermit,
            permitReady,
            aksesReady: 0,
            implementasi: ongoing,
            prosBast: 0,
            invoice: 0,
            issues: 0,
            selesai,
            cancelled,
            total: atpWorkOrders.length
        };
    }, [atpWorkOrders.length]);

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
        // Match against atpWorkOrders which come directly from DB
        const dbType = type === 'FILTER' ? ['FILTERING', 'FILTER'] : [type];
        const wos = atpWorkOrders.filter(w => dbType.includes((w.project_type || '').toUpperCase()));
        const importedCount = wos.length;

        let permit = 0, impl = 0, selesai = 0, awaiting = 0;
        wos.forEach(w => {
            const s = (w.implementasi_status || '').toUpperCase();
            if (s === 'RFS') selesai++;
            else if (s === 'ON GOING') impl++;
            else if (s === 'AWAITING') awaiting++;
            if ((w.permit_status || '').startsWith('5.')) permit++;
        });

        return { importedCount, awal: awaiting, permit, akses: 0, impl, selesai };
    };

    // ----------------------------------------------------------------------
    // 5. LEFT COLUMN: BUTUH TINDAKAN SEGERA
    // ----------------------------------------------------------------------
    const actionNeededList = useMemo(() => {
        // Flag sites with problematic permit status or awaiting impl with expired/cancelled permits
        const items: any[] = [];
        const seen = new Set<string>();
        atpWorkOrders.forEach(wo => {
            if (seen.has(wo.site_id)) return;
            const permit = (wo.permit_status || '');
            const impl   = (wo.implementasi_status || '').toUpperCase();
            const isIssue = permit.startsWith('6.') || // Expired permit
                            (impl === 'AWAITING' && permit.startsWith('9.')); // Awaiting but cancelled permit
            if (isIssue) {
                seen.add(wo.site_id);
                items.push({
                    id: wo.site_id,
                    siteName: wo.site_name || wo.site_id,
                    type: wo.project_type,
                    title: permit.startsWith('6.') ? 'Expired Permit — butuh perpanjangan' : 'Permit Cancelled tapi masih Awaiting',
                    link: `/sites/${wo.site_id}`
                });
            }
        });
        return items.slice(0, 8);
    }, [atpWorkOrders.length]);


    // ----------------------------------------------------------------------
    // 6. SUMMARY MONITORING DATA (live from atpWorkOrders)
    // ----------------------------------------------------------------------
    const summaryData = useMemo(() => {
        const byType: Record<string, { rfs: number; awaiting: number; ongoing: number; cancelled: number; total: number }> = {};

        atpWorkOrders.forEach(w => {
            const type = (w.project_type || 'FILTERING').toUpperCase();
            const impl = (w.implementasi_status || '').toUpperCase();
            if (!byType[type]) byType[type] = { rfs: 0, awaiting: 0, ongoing: 0, cancelled: 0, total: 0 };
            byType[type].total++;
            if (impl === 'RFS') byType[type].rfs++;
            else if (impl === 'AWAITING') byType[type].awaiting++;
            else if (impl === 'ON GOING') byType[type].ongoing++;
            else if (impl === 'CANCELLED') byType[type].cancelled++;
        });

        const totalAll    = Object.values(byType).reduce((s, v) => s + v.total,     0);
        const rfsAll      = Object.values(byType).reduce((s, v) => s + v.rfs,       0);
        const awaitAll    = Object.values(byType).reduce((s, v) => s + v.awaiting,  0);
        const cancAll     = Object.values(byType).reduce((s, v) => s + v.cancelled, 0);
        const ongoAll     = Object.values(byType).reduce((s, v) => s + v.ongoing,   0);
        const filterTotal = (byType['FILTERING'] || byType['FILTER'])?.total || 0;

        return { byType, totalAll, rfsAll, awaitAll, cancAll, ongoAll, filterTotal };
    }, [atpWorkOrders.length]);

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-300 relative">
            {/* Visual Success/Failed Pop-up Alert Toast */}
            {toast.show && (
                <div className={clsx(
                    "fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border animate-in slide-in-from-top-4 duration-300",
                    toast.type === 'success' 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                        : "bg-red-50 text-red-800 border-red-200"
                )}>
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                    <span className="text-sm font-bold tracking-tight">{toast.message}</span>
                </div>
            )}

            {/* ROW 1: HEADER (compact, no greeting) */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <h1 className="text-[32px] font-bold text-[#111827] tracking-tight">Dashboard</h1>
                
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[13px] text-[#6B7280]">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="px-3 py-1 bg-[#EFF6FF] text-[#1D4ED8] text-[11px] rounded-full uppercase font-semibold tracking-wider">
                        {currentUser?.role.replace('_', ' ')}
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
                <button
                    onClick={() => setSearchParams({ tab: 'payments' })}
                    className={clsx(
                        "px-6 py-3 font-semibold text-sm transition-all flex items-center gap-2",
                        activeTab === 'payments'
                        ? 'bg-white shadow-sm text-[#1D4ED8] border-b-2 border-[#2563EB]'
                        : 'text-[#6B7280] hover:text-gray-900 border-b-2 border-transparent'
                    )}
                >
                    <CreditCard className="w-4 h-4" />
                    Pengajuan &amp; Pembayaran
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
                        <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-6 gap-2">
                            {([
                                { label: ['Menunggu','Permit'],  count: stageSummary.menungguPermit, nav: '/sites?tab=pekerjaan', grad: 'linear-gradient(135deg,#64748B,#475569)', shadow: 'rgba(71,85,105,0.35)',   pulse: false },
                                { label: ['Permit','Ready'],     count: stageSummary.permitReady,    nav: '/sites?tab=pekerjaan', grad: 'linear-gradient(135deg,#F59E0B,#D97706)', shadow: 'rgba(245,158,11,0.4)', pulse: false },
                                { label: ['On','Going'],         count: stageSummary.implementasi,   nav: '/sites?tab=pekerjaan', grad: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', shadow: 'rgba(139,92,246,0.4)', pulse: false },
                                { label: ['RFS','✓ Done'],       count: stageSummary.selesai,        nav: '/sites?tab=pekerjaan', grad: 'linear-gradient(135deg,#34D399,#059669)', shadow: 'rgba(16,185,129,0.4)', pulse: false },
                                { label: ['Cancelled',''],       count: stageSummary.cancelled,      nav: '/sites?tab=pekerjaan', grad: 'linear-gradient(135deg,#F87171,#DC2626)', shadow: 'rgba(239,68,68,0.4)',   pulse: false },
                                { label: ['Total','Sites'],      count: stageSummary.total,          nav: '/sites?tab=pekerjaan', grad: 'linear-gradient(135deg,#2563EB,#1D4ED8)', shadow: 'rgba(37,99,235,0.4)',  pulse: false },
                            ] as const).map((card, i) => (
                                <div key={i}
                                    onClick={() => navigate(card.nav)}
                                    className={clsx('relative rounded-xl p-3 cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all duration-200 overflow-hidden', card.count === 0 && 'opacity-60')}
                                    style={{ background: card.grad, boxShadow: `0 4px 14px ${card.shadow}` }}
                                >
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
                            <h3 className="font-bold text-[14px] text-[#111827] mb-4">Distribusi Implementasi Status</h3>
                            <div className="h-[250px] w-full min-h-[250px] min-w-0">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Menunggu Permit', value: stageSummary.menungguPermit, color: '#64748B' },
                                                { name: 'Permit Ready',    value: stageSummary.permitReady,    color: '#F59E0B' },
                                                { name: 'On Going',        value: stageSummary.implementasi,   color: '#8B5CF6' },
                                                { name: 'RFS',             value: stageSummary.selesai,         color: '#10B981' },
                                                { name: 'Cancelled',       value: stageSummary.cancelled,      color: '#EF4444' }
                                            ].filter(d => d.value > 0)}
                                            cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={90} paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {[
                                                { name: 'Menunggu Permit', value: stageSummary.menungguPermit, color: '#64748B' },
                                                { name: 'Permit Ready',    value: stageSummary.permitReady,    color: '#F59E0B' },
                                                { name: 'On Going',        value: stageSummary.implementasi,   color: '#8B5CF6' },
                                                { name: 'RFS',             value: stageSummary.selesai,         color: '#10B981' },
                                                { name: 'Cancelled',       value: stageSummary.cancelled,      color: '#EF4444' }
                                            ].filter(d => d.value > 0).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
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
                            <div className="h-[250px] w-full min-h-[250px] min-w-0">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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

                    {/* SUMMARY MONITORING SECTION (embedded in overview) */}
                    <div>
                        <h3 className="text-[11px] font-semibold text-[#9CA3AF] tracking-[0.08em] uppercase mb-4 mt-2">Summary Monitoring</h3>
                        <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] overflow-hidden">
                            {/* Dark header */}
                            <div className="bg-[#161b22] px-6 py-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[#58a6ff] text-[10px] font-mono font-semibold uppercase tracking-widest">SST Team · R03 Jakarta &amp; Banten</p>
                                    <p className="text-[#e6edf3] font-bold text-[15px] mt-0.5">Monitoring Project Re-Engineering</p>
                                </div>
                                <div className="text-right font-mono text-[10px] text-[#8b949e]">
                                    <p>Total: {summaryData.totalAll} Sites</p>
                                    <p>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>
                            </div>
                            {/* TABLE 01 */}
                            <div className="p-5 border-b border-slate-100">
                                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6B7280] mb-3">TABLE 01 — Implementasi Status per Project Type</p>
                                <div className="overflow-x-auto rounded-lg border border-slate-100">
                                    <table className="w-full text-sm bg-white">
                                        <thead><tr className="bg-slate-50">
                                            <th className="text-left px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                            <th className="text-right px-3 py-2 text-[11px] font-bold text-slate-500">Total</th>
                                            <th className="text-right px-3 py-2 text-[11px] font-bold text-[#10B981]">RFS</th>
                                            <th className="text-right px-3 py-2 text-[11px] font-bold text-[#F59E0B]">Awaiting</th>
                                            <th className="text-right px-3 py-2 text-[11px] font-bold text-[#8B5CF6]">On Going</th>
                                            <th className="text-right px-3 py-2 text-[11px] font-bold text-[#EF4444]">Cancelled</th>
                                            <th className="text-right px-3 py-2 text-[11px] font-bold text-slate-500">% RFS</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {Object.entries(summaryData.byType).sort((a,b) => b[1].total - a[1].total).map(([type, v]) => {
                                                const tc = type==='COMBAT'?'#E67E22':type.includes('FILTER')?'#2563EB':type==='RESCOPING'?'#7C3AED':'#374151';
                                                const pct = v.total > 0 ? ((v.rfs/v.total)*100).toFixed(0) : '0';
                                                return (<tr key={type} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2.5 font-bold text-[13px]" style={{color:tc}}>{type}</td>
                                                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#111827]">{v.total}</td>
                                                    <td className="px-3 py-2.5 text-right font-mono text-[#10B981] font-semibold">{v.rfs||'—'}</td>
                                                    <td className="px-3 py-2.5 text-right font-mono text-[#F59E0B]">{v.awaiting||'—'}</td>
                                                    <td className="px-3 py-2.5 text-right font-mono text-[#8B5CF6]">{v.ongoing||'—'}</td>
                                                    <td className="px-3 py-2.5 text-right font-mono text-[#EF4444]">{v.cancelled||'—'}</td>
                                                    <td className="px-3 py-2.5 text-right"><span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded" style={{background:Number(pct)>=50?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)',color:Number(pct)>=50?'#059669':'#D97706'}}>{pct}%</span></td>
                                                </tr>);
                                            })}
                                            <tr className="bg-slate-50 border-t-2 border-slate-200">
                                                <td className="px-3 py-2.5 font-bold text-[#111827]">Grand Total</td>
                                                <td className="px-3 py-2.5 text-right font-mono font-bold text-[#111827]">{summaryData.totalAll}</td>
                                                <td className="px-3 py-2.5 text-right font-mono font-bold text-[#10B981]">{summaryData.rfsAll}</td>
                                                <td className="px-3 py-2.5 text-right font-mono font-bold text-[#F59E0B]">{summaryData.awaitAll}</td>
                                                <td className="px-3 py-2.5 text-right font-mono font-bold text-[#8B5CF6]">{summaryData.ongoAll}</td>
                                                <td className="px-3 py-2.5 text-right font-mono font-bold text-[#EF4444]">{summaryData.cancAll}</td>
                                                <td className="px-3 py-2.5 text-right font-mono font-bold text-[#2563EB]">{summaryData.totalAll>0?((summaryData.rfsAll/summaryData.totalAll)*100).toFixed(0):0}%</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            {/* TABLE 02 + 03 side by side */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x divide-slate-100">
                                <div className="p-5">
                                    <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6B7280] mb-3">TABLE 02 — Permit Status</p>
                                    <table className="w-full text-sm bg-white">
                                        <thead><tr className="bg-slate-50">
                                            <th className="text-left px-3 py-2 text-[11px] font-bold text-slate-500">Permit Status</th>
                                            <th className="text-right px-3 py-2 text-[11px] font-bold text-slate-500">Sites</th>
                                            <th className="text-right px-3 py-2 text-[11px] font-bold text-slate-500">%</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(() => { const g: Record<string,number>={}; atpWorkOrders.forEach(w=>{const k=w.permit_status||'(blank)';g[k]=(g[k]||0)+1;}); return Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([ps,cnt])=>{
                                                const pct=summaryData.totalAll>0?((cnt/summaryData.totalAll)*100).toFixed(1):'0';
                                                return(<tr key={ps} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 text-[12px] text-[#374151] font-medium">{ps}</td>
                                                    <td className="px-3 py-2 text-right font-mono font-semibold text-[#111827]">{cnt}</td>
                                                    <td className="px-3 py-2 text-right"><div className="flex items-center justify-end gap-1.5"><div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width:`${(cnt/summaryData.totalAll)*100}%`}}/></div><span className="text-[11px] font-mono text-[#6B7280] w-9 text-right">{pct}%</span></div></td>
                                                </tr>);
                                            })})()}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-5">
                                    <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#6B7280] mb-3">TABLE 03 — Status ATP / Tagging</p>
                                    <table className="w-full text-sm bg-white">
                                        <thead><tr className="bg-slate-50">
                                            <th className="text-left px-3 py-2 text-[11px] font-bold text-slate-500">Status ATP</th>
                                            <th className="text-right px-3 py-2 text-[11px] font-bold text-slate-500">Sites</th>
                                            <th className="text-right px-3 py-2 text-[11px] font-bold text-slate-500">%</th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(() => { const g: Record<string,number>={}; atpWorkOrders.forEach(w=>{const k=(w.status_atp||'(blank)').toUpperCase();g[k]=(g[k]||0)+1;}); return Object.entries(g).sort((a,b)=>b[1]-a[1]).map(([s,cnt])=>{
                                                const c=s.includes('DONE')?'#10B981':s.includes('PDID')?'#F59E0B':s.includes('HOLD')?'#EF4444':'#6B7280';
                                                const pct=summaryData.totalAll>0?((cnt/summaryData.totalAll)*100).toFixed(1):'0';
                                                return(<tr key={s} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 font-mono text-[11px] font-semibold" style={{color:c}}>{s}</td>
                                                    <td className="px-3 py-2 text-right font-mono font-semibold text-[#111827]">{cnt}</td>
                                                    <td className="px-3 py-2 text-right font-mono text-[11px] text-[#6B7280]">{pct}%</td>
                                                </tr>);
                                            })})()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ROW 4: TWO-COLUMN LAYOUT -> FULL WIDTH FOR OVERVIEW */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* LEFT COLUMN (NOW FULL WIDTH): Butuh Tindakan & Aktivitas */}
                        <div className="lg:col-span-12 space-y-6">
                            
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

                    </div>

                </div>
            )}

            {/* TAB CONTENT: PAYMENTS (NEW PREMIUM TAB) */}
            {activeTab === 'payments' && (
                <div className="space-y-6 animate-in fade-in duration-300 mt-6">
                    <div className="flex justify-between items-center bg-slate-50 border border-slate-200/80 rounded-xl px-5 py-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-800">Antrean Pengajuan &amp; Pembayaran</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Daftar pengajuan termin real-time dari database. Direktur menyetujui, Finance membayar.</p>
                        </div>
                        <button
                            onClick={syncRecords}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            Refresh Data
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* PENDING APPROVAL QUEUE (60% width) */}
                        <div className="lg:col-span-7 space-y-4">
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        Menunggu Tindakan (Submitted / Approved)
                                        {liveRequests.filter(r => r.status === 'submitted' || r.status === 'approved').length > 0 && (
                                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                        )}
                                    </h3>
                                    <span className="text-[11px] font-bold bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-full">
                                        {liveRequests.filter(r => r.status === 'submitted' || r.status === 'approved').length} Antrean
                                    </span>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {liveRequests.filter(r => r.status === 'submitted' || r.status === 'approved').length === 0 ? (
                                        <div className="p-12 text-center flex flex-col items-center justify-center">
                                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                                            <p className="text-sm font-bold text-slate-800">Semua Pengajuan Selesai!</p>
                                            <p className="text-xs text-slate-400 mt-1">Tidak ada pengajuan pembayaran atau persetujuan yang tertunda.</p>
                                        </div>
                                    ) : (
                                        liveRequests.filter(r => r.status === 'submitted' || r.status === 'approved').map((item) => {
                                            const sm = siteMasterRecords.find(sm => sm.site_id === item.site_id);
                                            return (
                                                <div key={item.id} className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="space-y-2 max-w-md">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                                                {item.termin_key}
                                                            </span>
                                                            <span className={clsx("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                                                                item.status === 'submitted' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                                            )}>
                                                                {item.status === 'submitted' ? 'Waiting Approve' : 'Approved (To Pay)'}
                                                            </span>
                                                            <button 
                                                                onClick={() => setSelectedPayment(item)}
                                                                className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100 transition-colors shrink-0"
                                                            >
                                                                Log Detail &amp; File &rarr;
                                                            </button>
                                                        </div>
                                                        <p 
                                                            onClick={() => {
                                                                const wo = atpWorkOrders.find(w => w.site_id === item.site_id);
                                                                if (wo) {
                                                                    navigate(`/atp/${wo.id}?tab=penagihan`);
                                                                } else {
                                                                    navigate(`/sites/${item.site_id}#pekerjaan`);
                                                                }
                                                            }}
                                                            className="font-bold text-slate-800 text-[14px] cursor-pointer hover:text-blue-600 hover:underline transition-all flex items-center gap-1.5"
                                                        >
                                                            {item.site_id} · {sm?.site_name || item.site_id} <span className="text-[10px] text-blue-500 font-normal no-underline">(detail &rarr;)</span>
                                                        </p>
                                                        {item.deskripsi && (
                                                            <p className="text-xs text-slate-400 font-medium italic">"{item.deskripsi}"</p>
                                                        )}
                                                        <p className="font-mono font-black text-blue-600 text-[15px]">
                                                            {formatRupiah(item.nominal)}
                                                        </p>
                                                    </div>

                                                    {/* RIGHT: ACCOUNT DETAILS & BUTTONS */}
                                                    <div className="flex flex-col items-end gap-3 min-w-[200px]">
                                                        {item.bank_name && (
                                                            <div className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-[11px] text-slate-600 text-left">
                                                                <p className="font-bold text-slate-700 flex items-center gap-1">
                                                                    <Landmark className="w-3.5 h-3.5 text-slate-400" /> {item.bank_name}
                                                                </p>
                                                                <p className="mt-0.5">No Rek: <strong className="text-slate-800 font-mono font-bold">{item.account_number}</strong></p>
                                                                <p>An: <strong className="text-slate-800">{item.account_holder}</strong></p>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-2">
                                                            {can('financial.approve_pengajuan') && item.status === 'submitted' && (
                                                                <>
                                                                    <button 
                                                                        disabled={isSaving}
                                                                        onClick={() => handleRejectRequest(item.id)}
                                                                        className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                                                    >
                                                                        <XCircle className="w-3.5 h-3.5" /> {isSaving ? 'Menyimpan...' : 'Tolak'}
                                                                    </button>
                                                                    <button 
                                                                        disabled={isSaving}
                                                                        onClick={() => handleApproveRequest(item.id)}
                                                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50"
                                                                    >
                                                                        <CheckCircle2 className="w-3.5 h-3.5" /> {isSaving ? 'Menyimpan...' : 'Setuju'}
                                                                    </button>
                                                                </>
                                                            )}
                                                            {can('financial.mark_paid') && item.status === 'approved' && (
                                                                <label className={clsx("px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-colors flex items-center gap-1.5", isSaving && "opacity-50 pointer-events-none")}>
                                                                    <input disabled={isSaving} type="file" className="hidden" onChange={e => handleMarkPaidWithFile(item.id, e.target.files)} />
                                                                    <Upload className="w-3.5 h-3.5" /> {isSaving ? 'Menyimpan...' : 'Upload Bukti & Bayar Lunas'}
                                                                </label>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* PAID / HISTORICAL LIST (40% width) */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="text-sm font-bold text-slate-800">Riwayat Terbayar (Paid)</h3>
                                </div>
                                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                    {liveRequests.filter(r => r.status === 'paid').length === 0 ? (
                                        <div className="p-8 text-center text-xs text-slate-400">
                                            Belum ada pembayaran yang berhasil diselesaikan.
                                        </div>
                                    ) : (
                                        liveRequests.filter(r => r.status === 'paid').map((item) => {
                                            const sm = siteMasterRecords.find(sm => sm.site_id === item.site_id);
                                            return (
                                                <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-purple-50 text-purple-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                {item.termin_key}
                                                            </span>
                                                            <button 
                                                                onClick={() => setSelectedPayment(item)}
                                                                className="text-[9px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100 transition-colors shrink-0"
                                                            >
                                                                Log Detail &amp; File &rarr;
                                                            </button>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-purple-600 bg-purple-100/60 px-2 py-0.5 rounded flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Lunas (Paid)
                                                        </span>
                                                    </div>
                                                    <p 
                                                        onClick={() => {
                                                            const wo = atpWorkOrders.find(w => w.site_id === item.site_id);
                                                            if (wo) {
                                                                navigate(`/atp/${wo.id}?tab=penagihan`);
                                                            } else {
                                                                navigate(`/sites/${item.site_id}#pekerjaan`);
                                                            }
                                                        }}
                                                        className="font-bold text-slate-800 text-xs cursor-pointer hover:text-blue-600 hover:underline transition-all flex items-center gap-1"
                                                    >
                                                        {item.site_id} · {sm?.site_name || item.site_id} <span className="text-[9px] text-blue-500 font-normal no-underline">(detail &rarr;)</span>
                                                    </p>
                                                    <p className="font-mono font-black text-slate-700 text-xs">
                                                        {formatRupiah(item.nominal)}
                                                    </p>
                                                    {item.bukti_pembayaran_name && (
                                                        <div className="flex items-center gap-2 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-2 py-1 font-medium">
                                                            <Upload className="w-3 h-3 shrink-0" />
                                                            <span className="truncate max-w-[120px]">"{item.bukti_pembayaran_name}"</span>
                                                            {item.bukti_pembayaran_url && (
                                                                <a href={item.bukti_pembayaran_url} target="_blank" rel="noopener noreferrer"
                                                                    className="ml-auto text-[10px] font-bold text-purple-600 hover:underline shrink-0">
                                                                    Lihat
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* selectedPayment Detail Modal */}
            {selectedPayment && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-blue-600" />
                                    Detail Pengajuan &amp; Riwayat
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">Termin {selectedPayment.termin_key} &middot; Site {selectedPayment.site_id}</p>
                            </div>
                            <button onClick={() => setSelectedPayment(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Nominal and Bank Info */}
                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Nominal Pembayaran</p>
                                    <p className="font-mono font-black text-blue-700 text-lg mt-1">{formatRupiah(selectedPayment.nominal)}</p>
                                </div>
                                {selectedPayment.bank_name && (
                                    <div className="text-right text-[11px] text-slate-600">
                                        <p className="font-bold text-slate-800 flex items-center gap-1 justify-end"><Landmark className="w-3.5 h-3.5 text-slate-400" /> {selectedPayment.bank_name}</p>
                                        <p className="mt-0.5 font-mono">No: {selectedPayment.account_number}</p>
                                        <p>An: {selectedPayment.account_holder}</p>
                                    </div>
                                )}
                            </div>

                            {/* Audit Timeline */}
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">LOG &amp; RIWAYAT ALUR PROSES</p>
                                <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
                                    {/* 1. Proposed */}
                                    <div className="relative">
                                        <span className="absolute -left-[31px] top-0.5 bg-blue-500 text-white p-1 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black">1</span>
                                        <div>
                                            <p className="font-bold text-slate-800 text-xs">Diajukan (Proposed)</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Oleh: <strong className="text-slate-700">{selectedPayment.submitted_by || 'Operational Admin'}</strong></p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{selectedPayment.submitted_at ? new Date(selectedPayment.submitted_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
                                        </div>
                                    </div>

                                    {/* 2. Approved */}
                                    <div className="relative">
                                        <span className={clsx(
                                            "absolute -left-[31px] top-0.5 p-1 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black",
                                            (selectedPayment.approved_at || selectedPayment.status === 'approved' || selectedPayment.status === 'paid') ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                                        )}>2</span>
                                        <div>
                                            <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                                Disetujui Direktur (Approved)
                                                {selectedPayment.status === 'rejected' && <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded uppercase">Ditolak</span>}
                                            </p>
                                            {(selectedPayment.approved_at || selectedPayment.status === 'approved' || selectedPayment.status === 'paid') ? (
                                                <>
                                                    <p className="text-xs text-slate-500 mt-0.5">Oleh: <strong className="text-slate-700">{selectedPayment.approved_by || 'Budi Director'}</strong></p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{selectedPayment.approved_at ? new Date(selectedPayment.approved_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
                                                </>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic mt-0.5">Menunggu persetujuan Direktur...</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Paid */}
                                    <div className="relative">
                                        <span className={clsx(
                                            "absolute -left-[31px] top-0.5 p-1 rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-black",
                                            selectedPayment.status === 'paid' ? "bg-purple-500 text-white" : "bg-slate-200 text-slate-400"
                                        )}>3</span>
                                        <div>
                                            <p className="font-bold text-slate-800 text-xs">Dibayar (Paid &amp; Lunas)</p>
                                            {selectedPayment.status === 'paid' ? (
                                                <div className="space-y-2 mt-1">
                                                    <p className="text-[10px] text-slate-400">{selectedPayment.paid_at ? new Date(selectedPayment.paid_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
                                                    {selectedPayment.bukti_pembayaran_name && (
                                                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 flex items-center justify-between gap-3 max-w-sm">
                                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                                <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                <span className="text-xs font-bold text-emerald-800 truncate">{selectedPayment.bukti_pembayaran_name}</span>
                                                            </div>
                                                            {selectedPayment.bukti_pembayaran_url ? (
                                                                <a
                                                                    href={selectedPayment.bukti_pembayaran_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-2 py-1 bg-white border border-emerald-200 text-emerald-700 text-[9px] font-bold rounded hover:bg-emerald-50 transition-colors shrink-0"
                                                                >
                                                                    Buka File
                                                                </a>
                                                            ) : (
                                                                <span className="text-[9px] text-slate-400 italic px-1">Tersimpan</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic mt-0.5">Menunggu pembayaran oleh Finance...</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button onClick={() => setSelectedPayment(null)} className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors shadow-sm">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
