
import { useAuth } from '../../context/AuthContext';
import { type CombatTerm, type CombatSubStep } from '../../data/mockData';
import { 
    CheckCircle2, Lock, 
    FileText, Camera, DollarSign, Clock 
} from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import { ActionBanner } from './ActionBanner';
import clsx from 'clsx';
import { useNavigate, useParams } from 'react-router-dom';

interface CombatPaymentSectionProps {
    terms: CombatTerm[];
    isTermin1Enabled?: boolean;
    onUpdateSubStepData?: (termId: string, subStepId: string, formData: Record<string, unknown>, documents: any[]) => void;
    onSubmitSubStep?: (termId: string, subStepId: string) => void;
}

const CombatPaymentSection = ({ terms, isTermin1Enabled = true }: CombatPaymentSectionProps) => {
    const { currentUser, can } = useAuth();
    const navigate = useNavigate();
    const { id: siteId } = useParams();

    // Helper: Check if previous term is completed
    const isTermLocked = (currentStep: number) => {
        if (currentStep === 1) return !isTermin1Enabled; // If isTermin1Enabled is false, term 1 is locked.
        const prevTerm = terms.find(t => t.step === currentStep - 1);
        if (!prevTerm) return true; // If no previous term found, it's locked (shouldn't happen for step > 1)
        // A term is effectively complete if all its substeps are paid
        return prevTerm.subSteps.some(s => s.status !== 'paid'); // Returns true if ANY substep is NOT paid (meaning it's locked)
    };

    const sortedTerms = [...terms].sort((a,b) => a.step - b.step);
    const activeTerm = sortedTerms.find(term => !isTermLocked(term.step) && term.subSteps.some(s => s.status !== 'paid'));
    let activeSubStep = null;
    if (activeTerm) {
        activeSubStep = activeTerm.subSteps.find(s => s.status !== 'paid');
    }



    const handleAction = (subId: string, action: string) => {
        if (!siteId) return;
        if (action === 'submit' || action === 'upload_doc') {
             navigate(`/sites/${siteId}/termins/create?type=${subId}`);
        } else {
             navigate(`/sites/${siteId}/termins/${subId}`);
        }
    };

    const navToTermin = (subId: string) => {
         if (siteId) navigate(`/sites/${siteId}/termins/${subId}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">COMBAT Payment Terms</h3>
                    <p className="text-sm text-slate-500">6-Stage Sequential Flow • Total Budget: Rp 115.55 Juta</p>
                </div>
            </div>

            {activeTerm && activeSubStep && (
                <ActionBanner 
                    type="COMBAT"
                    activeTermName={`${activeTerm.title} - ${activeSubStep.name}`}
                    activeTermStep={activeTerm.step}
                    activeTermStatus={activeSubStep.status}
                    onClickAction={() => {}}
                />
            )}

            {sortedTerms.map((term) => {
                const locked = isTermLocked(term.step);
                
                // Calculate completion for progress bar
                const completedSteps = term.subSteps.filter(s => s.status === 'paid').length;
                const totalSteps = term.subSteps.length;
                const progress = (completedSteps / totalSteps) * 100;

                return (
                    <div key={term.id} className={clsx(
                        "border rounded-xl overflow-hidden transition-all flex",
                        locked ? "bg-slate-50 border-slate-200 opacity-70" : "bg-white border-slate-200 shadow-sm"
                    )}>
                        {/* Circle Indicator Column */}
                        <div className="w-16 shrink-0 flex flex-col items-center pt-5 border-r border-slate-100 bg-slate-50/50">
                            <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-sm z-10 transition-all",
                                locked ? "bg-slate-200 border-slate-300 text-slate-500" : 
                                progress === 100 ? "bg-emerald-500 border-emerald-500 text-white" : 
                                "bg-blue-50 border-blue-500 text-blue-600 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"
                            )}>
                                {locked ? <Lock className="w-4 h-4" /> : progress === 100 ? <CheckCircle2 className="w-5 h-5"/> : term.step}
                            </div>
                            <div className="flex-1 w-px bg-slate-200 mt-2"></div>
                        </div>

                        <div className="flex-1 flex flex-col">
                            {/* Term Header */}
                            <div 
                                className={clsx(
                                    "p-4 flex items-center justify-between cursor-pointer text-slate-800",
                                    locked && "cursor-not-allowed opacity-70"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div>
                                        <h4 className={clsx("font-bold text-lg", locked ? "text-slate-500" : "text-slate-800")}>
                                            {term.title}
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                            <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium border border-slate-200">{completedSteps}/{totalSteps} Steps</span>
                                            {can('view_costs') && (
                                                <>
                                                    <span>•</span>
                                                    <span>Max: Rp {term.totalMaxAmount.toLocaleString('id-ID')}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Mini Progress Bar */}
                                    {!locked && (
                                        <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-500 transition-all duration-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    )}
                                    {/* Arrow not needed if not expandable anymore, but let's keep it as static down for shape or remove it */}
                                </div>
                            </div>

                            {/* Term Body (Sub-steps) ALWAYS SHOWN when not locked */}
                            {!locked && (
                                <div className="border-t border-slate-100 bg-slate-50/30 p-4 space-y-4">
                                    {term.subSteps.map((sub, idx) => {
                                        // Logic for sub-step locking (must finish prev sub-step)
                                        const isSubLocked = idx > 0 && term.subSteps[idx-1].status !== 'paid';
                                        
                                        return (
                                            <SubStepCard 
                                                key={sub.id} 
                                                termId={term.id}
                                                sub={sub} 
                                                isLocked={isSubLocked}
                                                isExpanded={false}
                                                role={currentUser?.role || ''}
                                                canViewCosts={can('view_costs')}
                                                onViewDetail={() => navToTermin(sub.id)}
                                                onAction={handleAction}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                            {/* Locked State */}
                            {locked && term.status === 'locked' && (
                                <div className="text-center text-xs text-slate-400 italic p-4 border-t border-slate-100 bg-slate-50/30">
                                    {term.step === 1 && !isTermin1Enabled ? (
                                        <span className="text-amber-600 flex items-center justify-center gap-1 font-medium bg-amber-50 px-2 py-1 rounded w-full border border-amber-200">Menunggu SKP Diterima</span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Locked</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- Sub Component: SubStepCard ---

interface SubStepCardProps {
    termId: string;
    sub: CombatSubStep;
    isLocked: boolean;
    isExpanded: boolean;
    role: string;
    canViewCosts: boolean;
    onViewDetail: () => void;
    onAction: (id: string, action: string) => void;
}

const SubStepCard = ({ 
    sub, isLocked, role, canViewCosts, 
    onViewDetail, onAction 
}: SubStepCardProps) => {
    // Determine Status Color
    const statusColor = ({
        locked: 'bg-slate-100 text-slate-400',
        open: 'bg-blue-50 text-blue-600 border-blue-200',
        pending: 'bg-slate-100 text-slate-500 border-slate-200',
        pengajuan: 'bg-blue-50 text-blue-600 border-blue-200',
        submitted: 'bg-yellow-50 text-yellow-600 border-yellow-200',
        approved: 'bg-indigo-50 text-indigo-600 border-indigo-200',
        paid: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        rejected: 'bg-red-50 text-red-600 border-red-200'
    } as Record<string, string>)[sub.status] || 'bg-slate-50 text-slate-500';

    const isPaid = sub.status === 'paid';

    return (
        <div className={clsx(
            "bg-white border rounded-lg transition-all overflow-hidden",
            isLocked ? "opacity-50 border-slate-200" : "border-slate-300 shadow-sm"
        )}>
            {/* Card Header (Clickable) */}
            <div 
                className={clsx("p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 cursor-pointer", "hover:bg-slate-50")}
                onClick={() => !isLocked && onViewDetail()}
            >
                {/* Left: Info */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className={clsx("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border", statusColor)}>
                            {sub.status}
                        </span>
                        <h5 className="font-semibold text-slate-800 flex items-center gap-2">
                            {sub.name}
                        </h5>
                    </div>
                    
                    {/* Cost Info (Hidden for Engineer) */}
                    {canViewCosts && (
                        <div className="text-sm flex gap-4 mt-1">
                            <span className="text-slate-500">Max: <span className="font-mono text-slate-700">Rp {sub.maxAmount.toLocaleString('id-ID')}</span></span>
                            {sub.amountApproved && (
                                <span className="text-emerald-600">Approved: <span className="font-mono font-bold">Rp {sub.amountApproved.toLocaleString('id-ID')}</span></span>
                            )}
                        </div>
                    )}

                    {/* Engineer View: Only see requirements text if no cost shown */}
                    {!canViewCosts && (
                        <p className="text-xs text-slate-500 italic">
                            Required: {sub.requiredPhotos?.join(', ') || 'No specific photos'}
                        </p>
                    )}
                </div>

                {/* Right: Actions / Checklists */}
                <div className="flex flex-col gap-2 min-w-[200px]">
                    
                    {/* DOCS CHECKLIST */}
                    {(sub.requiredDocs && sub.requiredDocs.length > 0) && (
                        <div className="flex flex-wrap gap-2 mb-1">
                           {sub.requiredDocs.map(doc => {
                               const uploaded = sub.uploadedDocs?.some(d => d.includes(doc.toLowerCase().split(' ')[0])); // Mock check
                               return (
                                   <span key={doc} className={clsx(
                                       "text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border",
                                       uploaded ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"
                                   )}>
                                       <FileText className="w-3 h-3" /> {doc}
                                   </span>
                               )
                           })}
                        </div>
                    )}

                    {/* PHOTOS CHECKLIST */}
                     {(sub.requiredPhotos && sub.requiredPhotos.length > 0) && (
                        <div className="flex flex-wrap gap-2 mb-1">
                           {sub.requiredPhotos.map(photo => (
                               <span key={photo} className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border bg-slate-50 border-slate-200 text-slate-500">
                                   <Camera className="w-3 h-3" /> {photo}
                               </span>
                           ))}
                        </div>
                    )}

                    {/* ACTION BUTTONS */}
                    {!isLocked && !isPaid && (
                        <ActionButtons 
                            sub={sub} 
                            role={role} 
                            onAction={onAction} 
                        />
                    )}
                    
                    {isPaid && (
                        <div className="text-right">
                             <span className="text-xs font-medium text-emerald-600 flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Paid on {sub.paidAt}
                             </span>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

const ActionButtons = ({ sub, role, onAction }: { sub: CombatSubStep, role: string, onAction: (id: string, action: string) => void }) => {
    // ENGINEER ACTIONS
    if (role === 'engineer') {
        const hasPhotos = sub.requiredPhotos && sub.requiredPhotos.length > 0;
        if (hasPhotos && sub.status === 'open') {
             return (
                <Tooltip content="Upload required evidence photos">
                <button onClick={() => onAction(sub.id, 'upload_photo')} className="w-full py-1.5 px-3 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2">
                    <Camera className="w-3 h-3" /> Upload Evidence
                </button>
                </Tooltip>
            );
        }
        return null;
    }

    // TEAM LEADER & BACKOFFICE ACTIONS (Submit Request)
    if (role === 'team_leader' || role === 'backoffice_admin') {
        if (sub.status === 'open' || sub.status === 'rejected') {
            return (
                <div className="flex gap-2">
                    <Tooltip content="Manage required documents">
                    <button onClick={() => onAction(sub.id, 'upload_doc')} className="flex-1 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs rounded hover:bg-slate-50">
                        Docs
                    </button>
                    </Tooltip>
                    <Tooltip content="Submit for approval">
                    <button onClick={() => onAction(sub.id, 'submit')} className="flex-1 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 shadow-sm">
                        Submit
                    </button>
                    </Tooltip>
                </div>
            );
        }
    }

    // MANAGEMENT ACTIONS (Approve/Reject)
    if (role === 'management') {
         if (sub.status === 'submitted') {
             return (
                 <div className="flex gap-2">
                    <Tooltip content="Reject this submission">
                    <button onClick={() => onAction(sub.id, 'reject')} className="flex-1 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs rounded hover:bg-red-100">
                        Reject
                    </button>
                    </Tooltip>
                    <Tooltip content="Approve this submission">
                    <button onClick={() => onAction(sub.id, 'approve')} className="flex-1 py-1.5 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 shadow-sm">
                        Approve
                    </button>
                    </Tooltip>
                 </div>
             );
         }
         // Management can also Submit if they are acting as "Team Leader" for some reason, 
         // but strictly for "Approval", they act on 'submitted' items. 
         // If Management needs to upload docs (as per matrix), they can see those buttons too:
         if (sub.status === 'open' || sub.status === 'rejected') {
            return (
                <div className="flex gap-2">
                    <button onClick={() => onAction(sub.id, 'upload_doc')} className="flex-1 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs rounded hover:bg-slate-50">
                        Docs
                    </button>
                    <button onClick={() => onAction(sub.id, 'submit')} className="flex-1 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 shadow-sm">
                        Submit
                    </button>
                </div>
            );
        }
    }

    // FINANCE ACTIONS (Pay)
    if (role === 'finance') {
        if (sub.status === 'approved') {
            return (
                <Tooltip content="Process payment and upload proof">
                <button onClick={() => onAction(sub.id, 'pay')} className="w-full py-1.5 px-3 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-2">
                    <DollarSign className="w-3 h-3" /> Pay & Upload Bukti
                </button>
                </Tooltip>
            )
        }
    }

    return null;
};

export default CombatPaymentSection;
