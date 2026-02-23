import { useAuth } from '../../context/AuthContext';
import { type FilterTerm } from '../../data/mockData';
import { ActionBanner } from './ActionBanner';
import {
    CheckCircle2, DollarSign, XCircle, FileCheck
} from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

interface FilterPaymentSectionProps {
    terms: FilterTerm[];
    isTermin1Enabled?: boolean;
    onUpdateTermData?: (termId: string, formData: Record<string, unknown>, documents: any[]) => void;
    onSubmitTerm?: (termId: string) => void;
}

const FilterPaymentSection = ({ terms, isTermin1Enabled = true }: FilterPaymentSectionProps) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Sort by step to ensure order
    const sortedTerms = [...terms].sort((a, b) => a.step - b.step);

    // Helper to check if previous term is paid
    const isPreviousPaid = (currentStep: number) => {
        if (currentStep === 1) return isTermin1Enabled;
        const prevTerm = sortedTerms.find(t => t.step === currentStep - 1);
        return prevTerm?.status === 'paid';
    };

    const activeTerm = sortedTerms.find((term) => {
        const isCompleted = term.status === 'paid';
        const isLocked = !isPreviousPaid(term.step);
        return !isLocked && !isCompleted;
    });

    const navToTermin = (id: string, siteId: string) => navigate(`/sites/${siteId}/termins/${id}`);
    const navToCreate = (siteId: string) => navigate(`/sites/${siteId}/termins/create`);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--glass-bg-hover)] rounded-lg border border-[var(--glass-border)]">
                    <DollarSign className="w-6 h-6 text-[var(--emerald-400)]" />
                </div>
                <div>
                    <h3 className="section-header !mb-0 text-[var(--text-primary)]">FILTER Payment Terms</h3>
                    <p className="text-sm text-[var(--text-secondary)]">Sequential 4-Step Payment Flow</p>
                </div>
            </div>

            {activeTerm && (
                <ActionBanner 
                    type="FILTER"
                    activeTermName={activeTerm.name}
                    activeTermStep={activeTerm.step}
                    activeTermStatus={activeTerm.status}
                    onClickAction={() => {}}
                />
            )}

            {/* Terms List */}
            <div className="grid gap-4">
                {sortedTerms.map((term) => {
                    const isLocked = !isPreviousPaid(term.step);
                    const isCompleted = term.status === 'paid';
                    const isActive = !isLocked && !isCompleted;

                    let statusText = 'Belum Tersedia';
                    if (isCompleted) statusText = `Pembayaran termin ${term.step} selesai`;
                    else if (isActive && (term.status === 'pending' || term.status === 'open')) statusText = `Persiapan termin ${term.step}`;
                    else if (isActive && (term.status === 'pengajuan' || term.status === 'submitted')) statusText = `Review termin ${term.step}`;
                    else if (isActive && term.status === 'approved') statusText = `Proses pembayaran termin ${term.step}`;
                    else if (isActive && term.status === 'rejected') statusText = `Revisi termin ${term.step}`;

                    return (
                        <div key={term.id} className={clsx(
                            "group border rounded-xl overflow-hidden transition-all flex",
                            isLocked ? "bg-[var(--glass-bg)] border-[var(--glass-border)] opacity-60" : "bg-[var(--glass-bg-hover)] border-[var(--glass-border)] shadow-sm hover:shadow-md cursor-pointer hover:border-white/20"
                        )}>
                            {/* Circle Indicator Column */}
                            <div className="w-16 shrink-0 flex flex-col items-center pt-5 border-r border-[var(--glass-border)] bg-[var(--glass-bg)]">
                                <div className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-sm z-10 transition-all",
                                    isCompleted ? "bg-[var(--emerald-500)] border-[var(--emerald-400)] text-white" :
                                    isActive ? "bg-[var(--glass-bg-active)] border-[var(--blue-500)] text-[var(--blue-400)] shadow-[0_0_0_4px_var(--blue-glow)]" :
                                    "bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-muted)]"
                                )}>
                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : term.step}
                                </div>
                                <div className="flex-1 w-px bg-[var(--glass-border)] mt-2"></div>
                            </div>

                            {/* Main Card Content */}
                            <div className="flex-1 flex flex-col">
                                <div className={clsx(
                                        "py-5 px-6 flex flex-col md:flex-row gap-6 md:items-center justify-between",
                                        !isLocked && "hover:bg-[var(--glass-bg)]"
                                    )}
                                    onClick={() => !isLocked && navToTermin(term.id, term.siteId)}
                                >
                                    {/* Left: Info */}
                                    <div className="space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-bold text-[var(--text-primary)] text-lg">{term.name}</h4>
                                                <span className="px-2.5 py-0.5 bg-[var(--glass-bg-active)] text-[var(--blue-400)] border border-[var(--blue-500)]/30 rounded text-xs font-bold">
                                                    {term.percentage}%
                                                </span>
                                            </div>
                                            <p className="text-[var(--text-secondary)] text-sm">{statusText}</p>
                                        </div>
                                        
                                        {/* Amounts */}
                                        {!isLocked && (
                                            <div className="flex text-sm bg-[var(--glass-bg)] p-2.5 rounded border border-[var(--glass-border)] mt-2 w-[250px] divide-x divide-[var(--glass-border)]">
                                                <div className="flex-1 pr-3">
                                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold mb-0.5">Request</p>
                                                    <p className="font-mono font-medium text-[var(--text-primary)] text-xs truncate">
                                                        {term.amountRequest ? `Rp ${term.amountRequest.toLocaleString('id-ID')}` : '-'}
                                                    </p>
                                                </div>
                                                <div className="flex-1 pl-3">
                                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold mb-0.5">Paid</p>
                                                    <p className="font-mono font-medium text-[var(--emerald-500)] text-xs truncate">
                                                        {term.amountPaid ? `Rp ${term.amountPaid.toLocaleString('id-ID')}` : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Rejection Note */}
                                        {term.status === 'rejected' && term.rejectionNote && (
                                            <div className="mt-3 bg-[var(--coral-500)]/10 border border-[var(--coral-500)]/20 rounded-md p-3 flex gap-2 items-start max-w-md">
                                                <XCircle className="w-4 h-4 text-[var(--coral-400)] mt-0.5 shrink-0" />
                                                <div>
                                                    <p className="text-xs font-bold text-[var(--coral-400)]">Rejection Note:</p>
                                                    <p className="text-xs text-[var(--coral-500)]">{term.rejectionNote}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="shrink-0 pt-2 border-t border-[var(--glass-border)] md:border-t-0 md:pt-0" onClick={e => e.stopPropagation()}>
                                         {isLocked ? (
                                             <div className="text-sm text-[var(--text-muted)] flex items-center justify-end gap-1 font-medium">
                                                 <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]"></span>
                                                 Locked
                                             </div>
                                        ) : isCompleted ? (
                                            <div className="flex items-center justify-end gap-3">
                                                 <span className="px-2.5 py-1 bg-[var(--emerald-500)]/10 text-[var(--emerald-400)] border border-[var(--emerald-500)]/20 rounded-md text-sm font-semibold flex items-center gap-1">
                                                     <FileCheck className="w-4 h-4" /> Dibayarkan
                                                 </span>
                                                 <button onClick={() => navToTermin(term.id, term.siteId)} className="px-3 py-1.5 text-[var(--blue-400)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] rounded-md text-sm font-medium transition-colors">
                                                     👁 View
                                                 </button>
                                            </div>
                                        ) : isActive && (term.status === 'pending' || term.status === 'open') ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => navToTermin(term.id, term.siteId)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-md text-sm font-medium transition-colors">
                                                     👁 View
                                                </button>
                                                {currentUser?.role === 'team_leader' && (
                                                    <button onClick={() => navToCreate(term.siteId)} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm">
                                                        + Ajukan Termin {term.step}
                                                    </button>
                                                )}
                                            </div>
                                        ) : isActive && (term.status === 'pengajuan' || term.status === 'pending_review' || term.status === 'submitted') ? (
                                            <div className="flex flex-col gap-2 items-end">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-semibold">
                                                        {term.status === 'pending_review' ? 'Menunggu Review' : 'Menunggu Approval'}
                                                    </span>
                                                    <button onClick={() => navToTermin(term.id, term.siteId)} className="px-3 py-1 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-md text-sm font-medium transition-colors">
                                                         👁 View
                                                    </button>
                                                </div>
                                            </div>
                                        ) : isActive && (term.status === 'diterima' || term.status === 'approved') ? (
                                            <div className="flex flex-col gap-2 items-end">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold">
                                                        Menunggu Pembayaran
                                                    </span>
                                                    <button onClick={() => navToTermin(term.id, term.siteId)} className="px-3 py-1 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-md text-sm font-medium transition-colors">
                                                         👁 View
                                                    </button>
                                                </div>
                                            </div>
                                        ) : isActive && term.status === 'rejected' ? (
                                             <div className="flex items-center justify-end gap-2">
                                                {currentUser?.role === 'team_leader' ? (
                                                    <button onClick={() => navToTermin(term.id, term.siteId)} className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-sm font-medium transition-colors shadow-sm">
                                                        Revisi Termin {term.step}
                                                    </button>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-xs font-semibold">
                                                        Ditolak
                                                    </span>
                                                )}
                                                <button onClick={() => navToTermin(term.id, term.siteId)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-md text-sm font-medium transition-colors">
                                                     👁 View
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FilterPaymentSection;
