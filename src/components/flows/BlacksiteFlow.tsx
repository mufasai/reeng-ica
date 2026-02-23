import { ArrowRight, Box } from 'lucide-react';

const BlacksiteFlow = () => {
    return (
        <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-lg border border-slate-200 border-dashed justify-center">
            <Box className="w-6 h-6 text-slate-400" />
            <span className="text-slate-500 font-medium">Blacksite Workflow Visualization (Coming Soon)</span>
            <ArrowRight className="w-4 h-4 text-slate-300" />
        </div>
    );
};

export default BlacksiteFlow;
