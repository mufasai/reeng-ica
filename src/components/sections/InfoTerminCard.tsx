import type { Site } from '../../data/mockData';


interface InfoTerminCardProps {
    site: Site;
    terminName: string;
    terminPercentage: number;
    amount: number;
    tanggal?: string;
    approvedBy?: string;
    approvedAt?: string;
}

export const InfoTerminCard = ({ 
    site, terminName, terminPercentage, amount, tanggal, approvedBy, approvedAt 
}: InfoTerminCardProps) => {
    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-0 overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
                <h4 className="font-bold text-slate-800">Informasi Termin</h4>
            </div>
            <div className="p-5 space-y-4 text-sm">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <span className="text-slate-500">Site</span>
                    <span className="font-semibold text-slate-800 text-right">{site.name}<br/><span className="text-xs font-normal text-slate-500">{site.location}</span></span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <span className="text-slate-500">Project</span>
                    <span className="font-semibold text-slate-800 text-right">{site.projectId === 'p1' ? 'Filter Q1' : 'Combat 500'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <span className="text-slate-500">Type Termin</span>
                    <div className="text-right">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{terminName}</span>
                        <span className="ml-2 text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{terminPercentage}%</span>
                    </div>
                </div>
                {tanggal && (
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                        <span className="text-slate-500">Tanggal Terima</span>
                        <span className="font-semibold text-slate-800">{tanggal}</span>
                    </div>
                )}
                {approvedBy && (
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                        <span className="text-slate-500">Disetujui Oleh</span>
                        <span className="font-semibold text-slate-800 text-right">{approvedBy}<br/><span className="text-xs font-normal text-slate-500">{approvedAt}</span></span>
                    </div>
                )}
                <div className="flex justify-between items-center pt-2">
                    <span className="text-slate-500">Jumlah Termin</span>
                    <span className="font-bold text-lg text-emerald-600">Rp {amount.toLocaleString('id-ID')}</span>
                </div>
            </div>
        </div>
    );
};
