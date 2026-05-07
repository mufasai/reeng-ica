import { useState, useMemo } from 'react';
import { type FilterPaymentSectionProps } from './FilterPaymentSection';
import { STAGE_TERMIN_MAP } from './PaymentPromptCard';
import clsx from 'clsx';
import { AlertCircle, ChevronDown, ChevronRight, FileText, Download, CheckCircle2, XCircle, RefreshCw, Lock, Clock } from 'lucide-react';
import { type TerminPengajuan } from '../../data/mockData';

const STAGE_ORDER_LIST = [
    'imported', 'assigned', 'permit_process', 'permit_ready',
    'akses_process', 'akses_ready', 'implementasi',
    'rfi_done', 'rfs_done', 'dokumen_done', 'bast', 'invoice', 'completed'
] as const;

function isStageReached(currentStage: string, targetStage: string): boolean {
    const ci = STAGE_ORDER_LIST.indexOf(currentStage as typeof STAGE_ORDER_LIST[number]);
    const ti = STAGE_ORDER_LIST.indexOf(targetStage as typeof STAGE_ORDER_LIST[number]);
    if (ci === -1 || ti === -1) return false;
    return ci >= ti;
}

type CardState = 'paid' | 'approved' | 'submitted' | 'rejected' | 'locked' | 'ready';

// Extended prompt item combining base config + current active pengajuan + resubmit tracking
interface AccordionItem {
    terminKey: string;
    label: string;
    pct: number;
    amount: number;
    triggerLabel: string;
    status: CardState;
    isResubmitted: boolean;
    pengajuan?: TerminPengajuan;
    allRelevantPengajuans: TerminPengajuan[]; // In case there are multiple (historical rejections)
}

const DirectorPaymentSection = ({
    site,
    localStage,
    localPengajuan,
    handleApproveTermin,
    handleRejectTermin,
    initialExpandedTermin
}: Omit<FilterPaymentSectionProps, 'handleAjukanTermin'>) => {

    // Process records into Accordion items
    const items = useMemo<AccordionItem[]>(() => {
        return STAGE_TERMIN_MAP.map(def => {
            let effectiveTriggerStage = def.stage;
            let effectiveTriggerLabel = def.triggerLabel;
            if (site.projectId?.toLowerCase().includes('rescoping') && def.terminKey === 'T2b') {
                effectiveTriggerStage = 'rfi_done';
                effectiveTriggerLabel = 'CI/CO selesai (T2a & T2b)';
            }

            // Find all pengajuans for this termin
            const relevant = localPengajuan.filter(p => p.termin_key === def.terminKey).sort(
                (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
            );

            let status: CardState = 'locked';
            let activePengajuan: TerminPengajuan | undefined;
            let isResubmitted = false;

            if (relevant.length > 0) {
                // The most recent covers the current active status
                activePengajuan = relevant[relevant.length - 1];
                status = activePengajuan.status as CardState;

                // Track resubmitted: if there's an older rejected iteration and current is submitted/paid
                if (relevant.length > 1 && relevant.some(r => r.status === 'rejected')) {
                    isResubmitted = true;
                }
            } else if (isStageReached(localStage, effectiveTriggerStage)) {
                status = 'ready'; // Not really actionable by Director, but shows as ready
            }

            const amount = site.budget > 0 ? Math.round(site.budget * def.pct / 100) : 0;

            return {
                terminKey: def.terminKey,
                label: def.terminKey,
                pct: def.pct,
                amount,
                triggerLabel: effectiveTriggerLabel,
                status,
                isResubmitted,
                pengajuan: activePengajuan,
                allRelevantPengajuans: relevant
            };
        });
    }, [site, localStage, localPengajuan]);

    // Calculate Initial Expansions
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
        const init = new Set<string>();
        if (initialExpandedTermin) {
            init.add(initialExpandedTermin.toUpperCase());
        }
        // Expand any submitted items by default
        items.forEach(it => {
            if (it.status === 'submitted') init.add(it.terminKey);
        });
        return init;
    });

    const toggleExpand = (key: string) => {
        setExpandedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const pendingItems = items.filter(it => it.status === 'submitted');

    // Display from T4 down to T1 (Reverse layout)
    const reversedItems = [...items].reverse();

    // Modals snippet logic
    const [confirmModal, setConfirmModal] = useState<{ type: 'approve' | 'reject', item: AccordionItem } | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const onConfirmApprove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!confirmModal?.item?.pengajuan) return;
        handleApproveTermin(confirmModal.item.pengajuan.id, confirmModal.item.amount, confirmModal.item.terminKey, e);
        setConfirmModal(null);
    };

    const onConfirmReject = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!confirmModal?.item?.pengajuan) return;
        // Mock inject reject reason via the handleRejectTermin if possible, but the signature doesn't take reason.
        // We'll just call the standard mock action. The prompt said we should use `handleRejectTermin(id, e)`
        handleRejectTermin(confirmModal.item.pengajuan.id, e);
        setConfirmModal(null);
        setRejectReason('');
    };

    return (
        <div className="space-y-6">
            {/* Section 1: Alert Banner */}
            {pendingItems.length > 0 && (
                <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                    <div className="relative mt-1">
                        <AlertCircle className="w-5 h-5 text-amber-500 relative z-10" />
                        <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-20" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-900 text-sm">
                            {pendingItems.length} pengajuan menunggu persetujuan Anda:
                        </h4>
                        <ul className="mt-1 space-y-1 list-disc list-inside text-sm text-amber-800">
                            {pendingItems.map(it => {
                                const dateStr = it.pengajuan?.submitted_at ? new Date(it.pengajuan.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';
                                return (
                                    <li key={it.terminKey}>
                                        <span className="font-semibold">{it.label}</span>
                                        {it.isResubmitted ? ' re-submit ' : ' '}
                                        (Rp {it.amount.toLocaleString('id-ID')}, diajukan {dateStr})
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            )}

            {/* Section 2: Summary Dot Bar */}
            <div className="bg-white border text-center p-6 border-slate-200 rounded-xl overflow-hidden shadow-sm flex items-center justify-between relative relative">
                {/* Connecting Line */}
                <div className="absolute left-[8%] right-[8%] top-[34px] h-[2px] bg-slate-200" />
                {items.map((it) => {
                    const isPending = it.status === 'submitted';
                    const isPaid = it.status === 'paid' || it.status === 'approved';
                    const isLocked = it.status === 'locked' || it.status === 'ready';

                    let bg = "bg-slate-100 border-slate-300";
                    if (isPaid) bg = "bg-emerald-500 border-emerald-500";
                    else if (isPending) bg = it.isResubmitted ? "bg-purple-500 border-purple-500" : "bg-amber-500 border-amber-500";

                    return (
                        <div key={it.terminKey} className="relative flex flex-col items-center z-10 group" style={{ width: `${100 / 6}%` }}>
                            <div className={clsx(
                                "w-6 h-6 rounded-full border-2 mb-2 flex items-center justify-center transition-all",
                                bg,
                                isPending && "animate-pulse ring-4 ring-opacity-20 " + (it.isResubmitted ? "ring-purple-500" : "ring-amber-500")
                            )}>
                                {isPaid && <CheckCircle2 className="w-4 h-4 text-white" />}
                                {isLocked && <div className="w-2 h-2 rounded-full bg-slate-300" />}
                            </div>
                            <span className="text-xs font-bold text-slate-700">{it.label}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                                {isPaid && it.pengajuan?.paid_at ? `${new Date(it.pengajuan.paid_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` :
                                    isPending ? 'Menunggu' :
                                        isLocked ? 'Terkunci' : ''}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Section 3: Termin Accordion List */}
            <div className="space-y-4">
                {reversedItems.map(it => {
                    const isExpanded = expandedKeys.has(it.terminKey);
                    const isLocked = it.status === 'locked' || it.status === 'ready';
                    const isPending = it.status === 'submitted';
                    const isPaid = it.status === 'paid' || it.status === 'approved';

                    let badgeCol = "bg-slate-100 text-slate-500 border-slate-200";
                    let badgeIcon = <Lock className="w-3.5 h-3.5" />;
                    let badgeTxt = "Terkunci";

                    if (isPaid) {
                        badgeCol = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        badgeIcon = <CheckCircle2 className="w-3.5 h-3.5" />;
                        badgeTxt = `Dibayar ${it.pengajuan?.paid_at ? new Date(it.pengajuan.paid_at).toLocaleDateString() : ''}`;
                    } else if (isPending) {
                        if (it.isResubmitted) {
                            badgeCol = "bg-purple-100 text-purple-700 border-purple-200";
                            badgeIcon = <RefreshCw className="w-3.5 h-3.5" />;
                            badgeTxt = "Re-submit (Menunggu)";
                        } else {
                            badgeCol = "bg-amber-50 text-amber-700 border-amber-200";
                            badgeIcon = <Clock className="w-3.5 h-3.5" />;
                            badgeTxt = "Menunggu Persetujuan";
                        }
                    } else if (it.status === 'rejected') {
                        badgeCol = "bg-red-50 text-red-700 border-red-200";
                        badgeIcon = <XCircle className="w-3.5 h-3.5" />;
                        badgeTxt = "Ditolak";
                    }

                    return (
                        <div key={it.terminKey} className={clsx(
                            "border rounded-xl bg-white overflow-hidden transition-all shadow-sm",
                            isPending ? "border-amber-400 ring-1 ring-amber-400" : "border-slate-200",
                            isLocked && "opacity-50",
                            isPaid && !isExpanded && "opacity-80"
                        )}>
                            {/* Card Header */}
                            <button
                                onClick={() => !isLocked && toggleExpand(it.terminKey)}
                                className={clsx(
                                    "w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left",
                                    isLocked && "cursor-not-allowed hover:bg-white"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="font-bold text-lg text-slate-800">{it.label} <span className="text-slate-400 text-sm font-medium ml-1">({it.pct}%)</span></div>
                                    <div className="font-mono font-medium text-slate-700">Rp {it.amount.toLocaleString('id-ID')}</div>
                                    <div className="text-sm text-slate-500 hidden sm:block max-w-[200px] truncate">{it.triggerLabel}</div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className={clsx("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border", badgeCol)}>
                                        {badgeIcon} {badgeTxt}
                                    </div>
                                    <ChevronDown className={clsx("w-5 h-5 text-slate-400 transition-transform", isExpanded && "rotate-180", isLocked && "opacity-0")} />
                                </div>
                            </button>

                            {/* Card Body */}
                            {isExpanded && !isLocked && (
                                <div className="border-t border-slate-100 bg-slate-50/30">
                                    {/* Notice Banners */}
                                    <div className="p-4 space-y-2 border-b border-slate-100">
                                        {it.allRelevantPengajuans.map((p, pIdx) => {
                                            if (p.status === 'rejected') {
                                                return (
                                                    <div key={p.id} className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg">
                                                        <h5 className="text-red-800 font-bold text-sm flex items-center gap-1.5">
                                                            <XCircle className="w-4 h-4" /> Ditolak {new Date(p.submitted_at).toLocaleDateString('id-ID')}
                                                        </h5>
                                                        <p className="text-red-700 text-sm mt-1">"{p.catatan || 'Dokumen belum lengkap / salah nominal'}"</p>
                                                    </div>
                                                );
                                            }
                                            if (pIdx > 0 && p.status === 'submitted') {
                                                // It's a re-submit
                                                return (
                                                    <div key={p.id} className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded-r-lg">
                                                        <h5 className="text-purple-800 font-bold text-sm flex items-center gap-1.5">
                                                            <RefreshCw className="w-4 h-4" /> Re-submit {new Date(p.submitted_at).toLocaleDateString('id-ID')}
                                                        </h5>
                                                        {p.catatan && <p className="text-purple-700 text-sm mt-1">"{p.catatan}"</p>}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>

                                    {/* 4 Section Content */}
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Left Col: Metadata & Documents */}
                                        <div className="space-y-6">
                                            {/* 1. Metadata Grid */}
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Informasi Pengajuan</h5>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-slate-500 mb-0.5">Diajukan oleh</p>
                                                        <p className="font-semibold text-slate-800">{it.pengajuan?.submitted_by}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 mb-0.5">Tanggal pengajuan</p>
                                                        <p className="font-semibold text-slate-800">
                                                            {it.pengajuan?.submitted_at ? new Date(it.pengajuan.submitted_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 mb-0.5">Nominal Pengajuan</p>
                                                        <p className="font-semibold text-slate-800 font-mono">Rp {it.pengajuan?.nominal.toLocaleString('id-ID')}</p>
                                                        {it.amount !== it.pengajuan?.nominal && (
                                                            <p className="text-amber-600 text-xs mt-0.5">⚠ Beda dari estimasi (Rp {it.amount.toLocaleString()})</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 mb-0.5">Trigger Stage</p>
                                                        <p className="font-semibold text-slate-800">{it.triggerLabel}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 2. Documents Section */}
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dokumen Pendukung {it.label}</h5>
                                                    {it.pengajuan?.documents && it.pengajuan.documents.length > 0 && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{it.pengajuan.documents.length} Dokumen terlampir</span>
                                                    )}
                                                </div>

                                                {!it.pengajuan?.documents || it.pengajuan.documents.length === 0 ? (
                                                    <div className="border border-dashed border-red-200 bg-red-50 text-red-600 p-4 rounded-lg text-sm text-center">
                                                        Tidak ada dokumen terlampir
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {it.pengajuan.documents.map(docId => (
                                                            <div key={docId} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-indigo-50 rounded flex items-center justify-center shrink-0">
                                                                        <FileText className="w-4 h-4 text-indigo-500" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{docId}.pdf</p>
                                                                        <p className="text-[10px] text-slate-400">{(Math.random() * 5 + 1).toFixed(1)} MB</p>
                                                                    </div>
                                                                </div>
                                                                <a
                                                                    href="#"
                                                                    onClick={(e) => { e.preventDefault(); alert(`Downloading ${docId}.pdf`); }}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded text-xs font-medium transition-colors border border-slate-200"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" /> Unduh
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Historical Docs (if rejected) */}
                                                {it.isResubmitted && it.allRelevantPengajuans.findIndex(p => p.status === 'rejected') !== -1 && (
                                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                                        <p className="text-xs text-red-600 font-semibold mb-2">Dokumen pengajuan yang ditolak sebelumnya:</p>
                                                        <div className="space-y-2 opacity-60">
                                                            {it.allRelevantPengajuans.find(p => p.status === 'rejected')?.documents.map(docId => (
                                                                <div key={docId} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                                                    <div className="flex items-center gap-2">
                                                                        <FileText className="w-3 h-3 text-slate-400" />
                                                                        <p className="text-xs font-medium text-slate-600">{docId}_old.pdf</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right Col: Catatan & History */}
                                        <div className="space-y-6">
                                            {/* 3. Catatan */}
                                            {it.pengajuan?.catatan && (
                                                <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
                                                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Catatan Admin</h5>
                                                    <p className="text-sm text-slate-700 italic">"{it.pengajuan.catatan}"</p>
                                                </div>
                                            )}

                                            {/* 4. History Logs */}
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Riwayat {it.label}</h5>
                                                {it.pengajuan?.history && it.pengajuan.history.length > 0 ? (
                                                    <div className="relative pl-3 border-l-2 border-slate-100 space-y-4">
                                                        {([...it.pengajuan.history]).sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).map((h, i) => (
                                                            <div key={i} className="relative">
                                                                <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 bg-slate-200 rounded-full ring-4 ring-white" />
                                                                <p className="text-sm">
                                                                    <span className="font-semibold text-slate-800">{h.by}</span>
                                                                    <span className="text-slate-600 mx-1">
                                                                        {h.action === 'submitted' ? `mengajukan ${it.label} · Rp ${it.pengajuan?.nominal.toLocaleString('id-ID')}` :
                                                                            h.action === 'approved' ? `menyetujui ${it.label}` :
                                                                                h.action === 'paid' ? `menandai ${it.label} sebagai dibayar` :
                                                                                    `${h.action} ${it.label}`}
                                                                    </span>
                                                                </p>
                                                                <p className="text-xs text-slate-400 mt-0.5">{new Date(h.at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-400 italic">Belum ada riwayat aktivitas.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    {isPending && (
                                        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-3 rounded-b-xl">
                                            <button
                                                onClick={() => setConfirmModal({ type: 'reject', item: it })}
                                                className="w-1/2 sm:w-auto px-6 py-2.5 bg-white border border-red-300 text-red-600 hover:bg-red-50 font-bold rounded-lg transition-colors flex justify-center"
                                            >
                                                ✗ Tolak
                                            </button>
                                            <button
                                                onClick={() => setConfirmModal({ type: 'approve', item: it })}
                                                className="w-1/2 sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors shadow-sm flex justify-center"
                                            >
                                                ✓ Setujui {it.label}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modals */}
            {confirmModal && confirmModal.type === 'approve' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Setujui {confirmModal?.item?.label} — {site.name}</h2>
                        <p className="text-slate-600 text-sm mb-6">
                            <span className="font-bold">{confirmModal?.item?.pengajuan?.submitted_by}</span> mengajukan
                            <span className="font-mono text-slate-800 ml-1 bg-slate-100 px-1 py-0.5 rounded">Rp {confirmModal?.item?.amount.toLocaleString()}</span> pada {new Date(confirmModal?.item?.pengajuan?.submitted_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmModal(null)} className="flex-1 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-lg transition-colors">
                                Batal
                            </button>
                            <button onClick={onConfirmApprove} className="flex-1 py-2 bg-emerald-500 text-white hover:bg-emerald-600 font-semibold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2">
                                Ya, Setujui <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmModal && confirmModal.type === 'reject' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Tolak {confirmModal?.item?.label} — {site.name}</h2>
                        <p className="text-slate-600 text-sm mb-4">Pengajuan akan dikembalikan ke Admin untuk diperbaiki.</p>

                        <div className="mb-6 space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Alasan penolakan <span className="text-red-500">*</span></label>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="Contoh: Dokumen BAST belum ditandatangani pihak terkait."
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 min-h-[100px]"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setConfirmModal(null)} className="flex-1 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-lg transition-colors">
                                Batal
                            </button>
                            <button
                                onClick={onConfirmReject}
                                disabled={!rejectReason.trim()}
                                className={clsx(
                                    "flex-1 py-2 font-semibold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2",
                                    rejectReason.trim() ? "bg-red-500 hover:bg-red-600 text-white" : "bg-red-200 text-red-50 cursor-not-allowed"
                                )}
                            >
                                Tolak Pengajuan <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DirectorPaymentSection;
