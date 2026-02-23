import { CheckCircle2, Circle } from 'lucide-react';
import clsx from 'clsx';
import type { TerminStatus } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

interface ProgressWorkflowCardProps {
    currentStatus: TerminStatus;
}

export const ProgressWorkflowCard = ({ currentStatus }: ProgressWorkflowCardProps) => {
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
                                    <p className="text-xs text-blue-600 mt-1 font-medium bg-blue-50 py-1 px-2 rounded inline-block">
                                        Anda sedang me-review
                                    </p>
                                )}
                                {isActive && !isMatchingRole && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Menunggu action dari {step.roles.join(', ').replace('_', ' ')}
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
