
import { CheckCircle2, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { type Termin } from '../../data/mockData';

import { useAuth } from '../../context/AuthContext';

interface CombatFlowProps {
  termins: Termin[];
}

const CombatFlow = ({ termins }: CombatFlowProps) => {
  const { can } = useAuth();
  return (
    <div className="bg-white p-6 rounded shadow-sm border border-slate-100">
      <h3 className="font-semibold text-slate-700 mb-6 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-amber-500" />
        COMBAT Workflow Integration
      </h3>

      <div className="space-y-4">
        {termins.map((term) => {
            let statusClass = "border-slate-200 bg-slate-50";
            let textClass = "text-slate-500";
            let Icon = ChevronRight;

            if (term.status === 'completed') {
                statusClass = "border-green-200 bg-green-50";
                textClass = "text-green-700";
                Icon = CheckCircle2;
            } else if (term.status === 'in_progress') {
                statusClass = "border-blue-200 bg-blue-50 ring-2 ring-blue-100";
                textClass = "text-blue-700";
                Icon = Clock;
            }

            return (
                <div key={term.id} className={`flex items-center p-4 rounded-lg border ${statusClass} transition-all`}>
                    <div className={`mr-4 p-2 rounded-full ${term.status === 'completed' ? 'bg-green-100' : term.status === 'in_progress' ? 'bg-blue-100' : 'bg-slate-200'}`}>
                        <Icon className={`w-5 h-5 ${term.status === 'completed' ? 'text-green-600' : term.status === 'in_progress' ? 'text-blue-600' : 'text-slate-500'}`} />
                    </div>
                    
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className={`font-semibold ${textClass}`}>{term.name}</h4>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/50 border border-slate-100 text-slate-500 shadow-sm">
                                {term.percentage}% Weight
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                             <div 
                                className={`h-1.5 rounded-full ${term.status === 'completed' ? 'bg-green-500' : term.status === 'in_progress' ? 'bg-blue-500 w-1/2' : 'w-0'}`} 
                                style={{ width: term.status === 'completed' ? '100%' : term.status === 'in_progress' ? '50%' : '0%' }}
                             ></div>
                        </div>
                    </div>

                    {term.status === 'in_progress' && can('submit_request') && (
                        <div className="ml-4">
                             <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm">
                                Action
                             </button>
                        </div>
                    )}
                </div>
            )
        })}
      </div>
    </div>
  );
};

export default CombatFlow;
