import { ArrowRight, Activity } from 'lucide-react';

const RefinenFlow = () => {
    return (
        <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-lg border border-slate-200 border-dashed justify-center">
            <Activity className="w-6 h-6 text-slate-400" />
            <span className="text-slate-500 font-medium">Refinen Upgrade Workflow (Coming Soon)</span>
            <ArrowRight className="w-4 h-4 text-slate-300" />
        </div>
    );
};

export default RefinenFlow;
