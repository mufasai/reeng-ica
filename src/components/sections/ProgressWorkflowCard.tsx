import { CheckCircle2, Circle } from 'lucide-react';
import clsx from 'clsx';
import type { TerminStatus } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

interface ProgressWorkflowCardProps {
    currentStatus: TerminStatus;
    onAction?: (actionId: string) => void;
}

export const ProgressWorkflowCard = ({ currentStatus, onAction }: ProgressWorkflowCardProps) => {
    const { currentUser } = useAuth();
    const role = currentUser?.role;

    // Define the 4 steps
    const steps = [
        {
            id: 'submit',
            label: 'Submit Pengajuan',
            roles: ['team_leader'],
            activeStatuses: ['pending'],
            completedStatuses: ['pending_review', 'pengajuan', 'diterima', 'dibayarkan', 'approved', 'paid', 'submitted'],
        },
        {
            id: 'review_field_head',
            label: 'Field Head Review',
            roles: ['backoffice_admin'],
            activeStatuses: ['pending_review'],
            completedStatuses: ['pengajuan', 'diterima', 'dibayarkan', 'approved', 'paid'],
        },
        {
            id: 'director_approval',
            label: 'Director Approval',
            roles: ['management'],
            activeStatuses: ['pengajuan', 'submitted'], // 'submitted' mapped to direktur waiting
            completedStatuses: ['diterima', 'dibayarkan', 'approved', 'paid'],
        },
        {
            id: 'finance_payment',
            label: 'Finance Payment',
            roles: ['finance'],
            activeStatuses: ['diterima', 'approved'],
            completedStatuses: ['dibayarkan', 'paid'],
        }
    ];

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <h4 className="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Progress Workflow</h4>
            <div className="space-y-6 relative">
                {/* Vertical Line */}
                <div className="absolute left-[11px] top-2 bottom-4 w-0.5 bg-slate-100 z-0"></div>
                
                {steps.map((step) => {
                    const isCompleted = step.completedStatuses.includes(currentStatus);
                    const isActive = step.activeStatuses.includes(currentStatus);
                    const isMatchingRole = step.roles.includes(role || '');

                    return (
                        <div key={step.id} className="relative z-10 flex gap-3">
                            <div className="flex-shrink-0 mt-0.5 bg-white">
                                {isCompleted ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500 bg-white" />
                                ) : isActive ? (
                                    <div className="relative">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                                        </div>
                                        {/* Pulse effect */}
                                        <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-20"></div>
                                    </div>
                                ) : (
                                    <Circle className="w-6 h-6 text-slate-300 bg-white" />
                                )}
                            </div>
                            <div className="flex-1 pb-2">
                                <p className={clsx(
                                    "text-sm font-semibold",
                                    isCompleted ? "text-slate-700" : isActive ? "text-blue-700" : "text-slate-400"
                                )}>
                                    {isActive ? `Current: ${step.label}` : step.label}
                                </p>
                                
                                {isActive && isMatchingRole && (
                                    <div className="mt-3">
                                        {step.id === 'submit' && (
                                            <button onClick={() => onAction?.('submit')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-1.5 px-3 rounded shadow-sm transition-colors">
                                                Submit Pengajuan
                                            </button>
                                        )}
                                        {step.id === 'review_field_head' && (
                                            <button onClick={() => onAction?.('review')} className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs py-1.5 px-3 rounded shadow-sm transition-colors">
                                                Review Termin
                                            </button>
                                        )}
                                        {step.id === 'director_approval' && (
                                            <div className="flex gap-2">
                                                <button onClick={() => onAction?.('approve')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-1.5 px-3 rounded shadow-sm transition-colors">
                                                    Approve
                                                </button>
                                                <button onClick={() => onAction?.('reject')} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 font-medium text-xs py-1.5 px-3 rounded shadow-sm transition-colors">
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                        {step.id === 'finance_payment' && (
                                            <button onClick={() => onAction?.('pay')} className="bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs py-1.5 px-3 rounded shadow-sm transition-colors">
                                                Upload Evidence & Bayar
                                            </button>
                                        )}
                                    </div>
                                )}
                                {isActive && !isMatchingRole && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Menunggu action dari <span className="font-semibold">{step.roles.join(', ').replace('_', ' ')}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
