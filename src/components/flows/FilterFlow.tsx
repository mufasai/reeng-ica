
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { type Termin } from '../../data/mockData';

import { useAuth } from '../../context/AuthContext';

interface FilterFlowProps {
  termins: Termin[];
  isTermin1Enabled?: boolean;
}

const FilterFlow = ({ termins, isTermin1Enabled = true }: FilterFlowProps) => {
  const { can } = useAuth();
  // Define the expected strict sequence if not provided by mock data, 
  // but here we rely on the parent passing the correct "termins" subset.
  
  return (
    <div className="bg-white p-6 rounded shadow-sm border border-slate-100">
      <h3 className="font-semibold text-slate-700 mb-6">Project Progress (FILTER Flow)</h3>
      
      <div className="relative">
        {/* Progress Bar Background */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded"></div>

        <div className="relative flex justify-between">
          {termins.map((term) => {
            let statusColor = 'bg-slate-100 text-slate-400';
            let icon = <Circle className="w-5 h-5" />;
            
            if (term.status === 'completed') {
              statusColor = 'bg-blue-500 text-white';
              icon = <CheckCircle2 className="w-5 h-5" />;
            } else if (term.status === 'in_progress') {
              statusColor = 'bg-blue-100 text-blue-600 border-2 border-blue-500';
              icon = <Clock className="w-5 h-5" />;
            }

            return (
              <div key={term.id} className="flex flex-col items-center gap-2 bg-white px-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors z-10 ${statusColor}`}>
                  {icon}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-800">{term.name}</p>
                  <p className="text-xs text-slate-500">{term.percentage}%</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block uppercase tracking-wide
                    ${term.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      term.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}
                  `}>
                    {term.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Example Detail Card for Active Step */}
             {termins.find(t => t.status === 'in_progress') && (() => {
                const activeTerm = termins.find(t => t.status === 'in_progress');
                if (!activeTerm) return null;
                const isLocked = activeTerm.name.includes("Termin 1") && !isTermin1Enabled;

                return (
                  <div className="p-4 border border-blue-100 bg-blue-50/50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">Current Action Required</h4>
                      <p className="text-sm text-blue-700 mb-3">
                          {activeTerm.name} requires validation of internal documents.
                      </p>
                      {can('submit_request') && (
                          <button 
                            disabled={isLocked}
                            className={`px-4 py-2 text-sm font-medium rounded shadow-sm transition-colors ${
                                isLocked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                              {isLocked ? 'Menunggu SKP' : 'Process Termin'}
                          </button>
                      )}
                  </div>
                );
             })()}
        </div>
    </div>
  );
};

export default FilterFlow;
