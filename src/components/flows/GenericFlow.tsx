
import { Construction } from 'lucide-react';
import { type Project } from '../../data/mockData';

interface GenericFlowProps {
  project: Project;
}

const GenericFlow = ({ project }: GenericFlowProps) => {
  return (
    <div className="bg-white p-6 rounded shadow-sm border border-slate-100 flex flex-col items-center justify-center min-h-[200px] text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700">Workflow Under Development</h3>
      <p className="text-slate-500 max-w-md mt-2">
        The workflow for <span className="font-medium text-slate-800">{project.type}</span> is currently being defined.
        Please check back later for updates on this process flow.
      </p>
      <button className="mt-6 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors text-sm font-medium">
        Contact Administrator
      </button>
    </div>
  );
};

export default GenericFlow;
