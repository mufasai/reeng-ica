import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { type Site, type TerminPengajuan } from '../../data/mockData';
import { CheckCircle2, Lock, Zap, Clock, FileText, ChevronRight, DollarSign } from 'lucide-react';
import clsx from 'clsx';
import { STAGE_TERMIN_MAP } from './PaymentPromptCard';

export interface FilterPaymentSectionProps {
    site: Site;
    localStage: string;
    localPengajuan: TerminPengajuan[];
    handleAjukanTermin: (terminKey: 'T1' | 'T2a' | 'T2b' | 'T2c' | 'T3' | 'T4', nominal: number, contextKeys: string[]) => void;
    handleApproveTermin: (pengajuanId: string, nominal: number, terminKey: string, e: React.MouseEvent<HTMLButtonElement>) => void;
    handleRejectTermin: (pengajuanId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
    initialExpandedTermin?: string;
}

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

type RowStatus = 'locked' | 'ready' | 'submitted' | 'approved' | 'paid' | 'rejected';

interface TerminRow {
    key: 'T1' | 'T2a' | 'T2b' | 'T2c' | 'T3' | 'T4';
    pct: number;
    triggerLabel: string;
    triggerStage: string;
    contextKeys: string[];
    status: RowStatus;
    pengajuan?: TerminPengajuan;
}

const FilterPaymentSection = ({
    site,
    localStage,
    localPengajuan,
    handleAjukanTermin,
    handleApproveTermin,
    handleRejectTermin,
    initialExpandedTermin,
}: FilterPaymentSectionProps) => {
    const { currentUser } = useAuth();
    const isManagement = ['director', 'operational', 'admin'].includes(currentUser?.role ?? '');
    
    // Normalize initialExpandedTermin to the internal keys (T1, T2a, etc.)
    let initStepId: string | null = null;
    if (initialExpandedTermin) {
        // e.g. "t2a" -> "T2a", "t3" -> "T3"
        const upper = initialExpandedTermin.toUpperCase();
        if (upper === 'T1' || upper === 'T3' || upper === 'T4') initStepId = upper;
        else if (upper === 'T2A') initStepId = 'T2a';
        else if (upper === 'T2B') initStepId = 'T2b';
        else if (upper === 'T2C') initStepId = 'T2c';
    }
    
    const [selectedStep, setSelectedStep] = useState<string | null>(initStepId);
    const [expandedRiwayat, setExpandedRiwayat] = useState(true);

    // Build rows
    const rows: TerminRow[] = STAGE_TERMIN_MAP.map(def => {
        // RESCOPING custom logic: T2b triggers at rfi_done instead of rfs_done
        let effectiveTriggerStage = def.stage;
        let effectiveTriggerLabel = def.triggerLabel;
        if (site.projectId?.toLowerCase().includes('rescoping') && def.terminKey === 'T2b') {
             effectiveTriggerStage = 'rfi_done';
             effectiveTriggerLabel = 'CI/CO selesai (T2a & T2b)';
        }

        const pengajuan = localPengajuan.find(p =>
            p.termin_key === def.terminKey &&
            ['submitted', 'approved', 'paid', 'rejected'].includes(p.status)
        );
        let status: RowStatus = 'locked';
        if (pengajuan) {
            status = pengajuan.status as RowStatus;
        } else if (isStageReached(localStage, effectiveTriggerStage)) {
            status = 'ready';
        }
        return {
            key: def.terminKey,
            pct: def.pct,
            triggerLabel: effectiveTriggerLabel,
            triggerStage: effectiveTriggerStage,
            contextKeys: def.contextKeys,
            status,
            pengajuan,
        };
    });

    const totalValue = site.budget > 0 ? site.budget : 0;
    const totalPaid = localPengajuan
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.nominal, 0);

    const sortedPengajuan = [...localPengajuan].sort(
        (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );

    // Stepper node color / style helpers
    const getNodeStyle = (status: RowStatus, isSelected: boolean) => {
        if (status === 'paid')     return 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.15)]';
        if (status === 'approved') return 'bg-purple-500 border-purple-400 text-white shadow-[0_0_0_4px_rgba(168,85,247,0.15)]';
        if (status === 'submitted')return 'bg-blue-500 border-blue-400 text-white shadow-[0_0_0_4px_rgba(59,130,246,0.15)]';
        if (status === 'ready')    return isSelected
            ? 'bg-amber-500 border-amber-400 text-white shadow-[0_0_0_4px_rgba(245,158,11,0.2)]'
            : 'bg-amber-50 border-amber-400 text-amber-700 shadow-[0_0_0_4px_rgba(245,158,11,0.1)] animate-pulse';
        if (status === 'rejected') return 'bg-red-500 border-red-400 text-white';
        return 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-muted)]';
    };

    const getLineStyle = (status: RowStatus) => {
        if (status === 'paid' || status === 'approved') return 'bg-emerald-500';
        if (status === 'submitted') return 'bg-blue-400';
        return 'bg-[var(--glass-border)]';
    };

    const getNodeIcon = (status: RowStatus) => {
        if (status === 'paid' || status === 'approved') return <CheckCircle2 className="w-4 h-4" />;
        if (status === 'submitted') return <Clock className="w-4 h-4" />;
        if (status === 'ready') return <Zap className="w-3.5 h-3.5" />;
        if (status === 'rejected') return <span className="text-xs font-bold">✗</span>;
        return <Lock className="w-3.5 h-3.5" />;
    };

    const selectedRow = rows.find(r => r.key === selectedStep) ?? rows.find(r => r.status === 'ready' || r.status === 'submitted') ?? null;

    return (
        <div className="space-y-6">
            {/* ─── Section A: Horizontal Stepper ─── */}
            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl overflow-hidden shadow-sm">
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-hover)] flex items-center gap-3">
                    <div className="p-2 bg-[var(--glass-bg)] rounded-lg border border-[var(--glass-border)] shrink-0">
                        <DollarSign className="w-5 h-5 text-[var(--emerald-400)]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)] text-sm tracking-wide uppercase">FILTER Payment Terms</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            Sequential Payment Flow
                            {totalValue > 0 && (
                                <span className="ml-2 text-[var(--text-muted)]">
                                    • Total Rp {totalValue.toLocaleString('id-ID')}
                                    {totalPaid > 0 && <span className="text-emerald-400"> • Terbayar Rp {totalPaid.toLocaleString('id-ID')}</span>}
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Horizontal Stepper */}
                <div className="px-8 pt-8 pb-4">
                    <div className="relative flex items-start justify-between">
                        {/* Connecting lines — behind nodes */}
                        <div className="absolute top-5 left-0 right-0 flex z-0 pointer-events-none px-[3.5%]">
                            {rows.map((row, idx) => {
                                if (idx === rows.length - 1) return null;
                                return (
                                    <div key={idx} className="flex-1 flex items-center">
                                        <div className="w-full h-0.5 mx-1" style={{background: 'transparent'}}>
                                            <div className={clsx('w-full h-full rounded-full transition-all duration-500', getLineStyle(row.status))} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Step nodes */}
                        {rows.map((row) => {
                            const amount = totalValue > 0 ? Math.round(totalValue * row.pct / 100) : 0;
                            const isSelected = selectedStep === row.key || (!selectedStep && selectedRow?.key === row.key);

                            return (
                                <button
                                    key={row.key}
                                    onClick={() => setSelectedStep(prev => prev === row.key ? null : row.key)}
                                    className="relative z-10 flex flex-col items-center gap-2 group focus:outline-none"
                                    style={{ width: `${100 / rows.length}%` }}
                                >
                                    {/* Circle */}
                                    <div className={clsx(
                                        'w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                                        getNodeStyle(row.status, isSelected),
                                        'group-hover:scale-110'
                                    )}>
                                        {getNodeIcon(row.status)}
                                    </div>

                                    {/* Label */}
                                    <span className={clsx(
                                        'text-xs font-bold whitespace-nowrap',
                                        row.status === 'paid' || row.status === 'approved' ? 'text-emerald-400' :
                                        row.status === 'submitted' ? 'text-[var(--blue-400)]' :
                                        row.status === 'ready' ? 'text-amber-400' :
                                        row.status === 'rejected' ? 'text-red-400' :
                                        'text-[var(--text-muted)]'
                                    )}>
                                        {row.key}
                                    </span>

                                    {/* Pct */}
                                    <span className="text-[10px] text-[var(--text-muted)] -mt-1 font-mono">{row.pct}%</span>

                                    {/* Amount */}
                                    {amount > 0 && (
                                        <span className="text-[10px] text-[var(--text-secondary)] font-mono -mt-1">
                                            {amount >= 1000000
                                                ? `Rp ${(amount / 1000000).toFixed(0)}Jt`
                                                : `Rp ${amount.toLocaleString('id-ID')}`}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Expand: selected step detail panel */}
                    {(() => {
                        const active = selectedStep ? rows.find(r => r.key === selectedStep) : selectedRow;
                        if (!active) return null;
                        const amount = totalValue > 0 ? Math.round(totalValue * active.pct / 100) : 0;

                        return (
                            <div className={clsx(
                                'mt-6 rounded-xl border p-4 transition-all',
                                active.status === 'ready'     ? 'bg-amber-50/40 border-amber-200/60' :
                                active.status === 'submitted' ? 'bg-blue-50/30 border-blue-200/60' :
                                active.status === 'paid' || active.status === 'approved' ? 'bg-emerald-50/20 border-emerald-200/40' :
                                active.status === 'rejected'  ? 'bg-red-50/30 border-red-200/60' :
                                'bg-[var(--glass-bg-hover)] border-[var(--glass-border)]'
                            )}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-[var(--text-primary)] text-sm">{active.key}</span>
                                            <span className="text-xs text-[var(--text-muted)]">({active.pct}%)</span>
                                            {amount > 0 && (
                                                <span className="text-xs font-mono text-[var(--text-secondary)]">
                                                    Rp {amount.toLocaleString('id-ID')}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)]">{active.triggerLabel}</p>
                                        {active.pengajuan && (
                                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                                                Diajukan {new Date(active.pengajuan.submitted_at).toLocaleDateString('id-ID', {day:'numeric',month:'short',year:'numeric'})}
                                                {' • '}Rp {active.pengajuan.nominal.toLocaleString('id-ID')}
                                                {active.pengajuan.catatan && <span className="italic"> — {active.pengajuan.catatan}</span>}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {active.status === 'ready' && (
                                            <button
                                                onClick={() => handleAjukanTermin(active.key, amount, active.contextKeys)}
                                                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                                            >
                                                Ajukan <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {active.status === 'submitted' && isManagement && active.pengajuan && (
                                            <>
                                                <button
                                                    onClick={(e) => handleApproveTermin(active.pengajuan!.id, active.pengajuan!.nominal, active.key, e)}
                                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                                >
                                                    ✓ Setujui
                                                </button>
                                                <button
                                                    onClick={(e) => handleRejectTermin(active.pengajuan!.id, e)}
                                                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                                >
                                                    ✗ Tolak
                                                </button>
                                            </>
                                        )}
                                        {active.status === 'rejected' && (
                                            <button
                                                onClick={() => handleAjukanTermin(active.key, amount, active.contextKeys)}
                                                className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                Ajukan Ulang <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {active.status === 'submitted' && !isManagement && (
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-full">
                                                ⏳ Menunggu Approval
                                            </span>
                                        )}
                                        {(active.status === 'paid' || active.status === 'approved') && (
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                {active.status === 'paid' ? 'Dibayar' : 'Disetujui'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Legend */}
                <div className="px-6 pb-4 flex items-center gap-4 text-[10px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--glass-border)] inline-block" />Terkunci</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Siap Diajukan</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Menunggu</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Selesai</span>
                </div>
            </div>

            {/* ─── Section B: Riwayat Pengajuan ─── */}
            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl overflow-hidden shadow-sm">
                <button
                    onClick={() => setExpandedRiwayat(v => !v)}
                    className="w-full px-5 py-4 border-b border-[var(--glass-border)] flex items-center justify-between bg-[var(--glass-bg-hover)] text-left"
                >
                    <div>
                        <h3 className="font-bold text-[var(--text-primary)] text-sm">Riwayat Pengajuan</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {localPengajuan.length} record{localPengajuan.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <ChevronRight className={clsx('w-4 h-4 text-[var(--text-muted)] transition-transform', expandedRiwayat && 'rotate-90')} />
                </button>

                {expandedRiwayat && (
                    <div className="p-5">
                        {sortedPengajuan.length === 0 ? (
                            <p className="text-sm text-[var(--text-muted)] italic text-center py-4">
                                Belum ada pengajuan termin untuk site ini.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {sortedPengajuan.map(p => {
                                    const submittedDate = new Date(p.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                                    const approvedDate = p.approved_at
                                        ? new Date(p.approved_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                                        : null;

                                    const statusIcon = p.status === 'paid' ? '✓' :
                                        p.status === 'approved' ? '✓' :
                                        p.status === 'submitted' ? '⏳' :
                                        p.status === 'rejected' ? '✗' : '?';

                                    const statusColor = p.status === 'paid' ? 'text-emerald-400' :
                                        p.status === 'approved' ? 'text-purple-400' :
                                        p.status === 'submitted' ? 'text-blue-400' :
                                        p.status === 'rejected' ? 'text-red-400' :
                                        'text-slate-400';

                                    return (
                                        <div
                                            key={p.id}
                                            className="flex items-center gap-3 p-3 bg-[var(--glass-bg-hover)] rounded-lg border border-[var(--glass-border)] text-sm"
                                        >
                                            <span className={clsx('font-bold text-base shrink-0', statusColor)}>{statusIcon}</span>
                                            <span className="font-bold text-[var(--text-primary)] w-10 shrink-0">{p.termin_key}</span>
                                            <span className="font-mono text-[var(--text-secondary)] shrink-0">
                                                Rp {p.nominal.toLocaleString('id-ID')}
                                            </span>
                                            <span className="text-[var(--text-muted)] text-xs shrink-0">
                                                Diajukan {submittedDate}
                                                {approvedDate && ` • ${p.status === 'paid' ? 'Dibayar' : 'Disetujui'} ${approvedDate}`}
                                            </span>
                                            {p.catatan && (
                                                <span className="text-[var(--text-muted)] text-xs italic truncate flex-1 min-w-0">
                                                    — {p.catatan}
                                                </span>
                                            )}
                                            <div className="ml-auto flex items-center gap-1.5 shrink-0">
                                                {p.status === 'submitted' && isManagement && (
                                                    <>
                                                        <button
                                                            onClick={(e) => handleApproveTermin(p.id, p.nominal, p.termin_key, e)}
                                                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                                        >
                                                            ✓ Approve
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleRejectTermin(p.id, e)}
                                                            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                                        >
                                                            ✗ Tolak
                                                        </button>
                                                    </>
                                                )}
                                                <button className="p-1.5 hover:bg-[var(--glass-bg)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors border border-[var(--glass-border)]">
                                                    <FileText className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FilterPaymentSection;
