import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sites, filterTerms } from '../data/mockData';
import { InfoTerminCard } from '../components/sections/InfoTerminCard';
import { ProgressWorkflowCard } from '../components/sections/ProgressWorkflowCard';
import { Check, X, ArrowLeft, Info } from 'lucide-react';


const TerminReview = () => {
    const { id, terminId } = useParams();
    const navigate = useNavigate();
    
    const site = sites.find(s => s.id === id);
    const termin = filterTerms.find(t => t.id === terminId) || filterTerms[1];

    const [catatan, setCatatan] = useState('');

    if (!site) return <div className="p-6">Site not found</div>;

    const expectedAmount = site.budget * (termin.percentage / 100);

    const handleApprove = () => {
        alert('Disetujui dan diteruskan ke Direktur!');
        navigate(`/sites/${site.id}/termins/${termin.id}`);
    };

    const handleReject = () => {
        alert('Ditolak dan dikembalikan ke Draft!');
        navigate(`/sites/${site.id}/termins/${termin.id}`);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/sites/${site.id}/termins/${termin.id}`)} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500 shadow-sm transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Review {termin.name}</h1>
                        <p className="text-slate-500 mt-1">Field Head Review untuk {site.name}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT: Form Card */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                            <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-lg">
                                <h3 className="font-bold text-slate-800">Form Review Field Head</h3>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                {/* Highlight Card */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 flex items-start gap-4 shadow-sm">
                                    <div className="bg-blue-100 p-2.5 rounded-full text-blue-600 mt-0.5 border border-blue-200">
                                        <Info className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-blue-900 font-bold mb-1">Informasi Pengajuan</h4>
                                        <p className="text-blue-800 flex justify-between gap-12 mt-2 font-medium">
                                            <span>Type Termin:</span> <span>{termin.name} ({termin.percentage}%)</span>
                                        </p>
                                        <p className="text-blue-800 flex justify-between gap-12 mt-1 font-medium">
                                            <span>Jumlah Termin:</span> <span className="text-lg font-bold">Rp {expectedAmount.toLocaleString('id-ID')}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 border border-slate-100 rounded-lg text-sm">
                                    <div>
                                        <span className="block text-slate-500 mb-1">Di-submit Oleh:</span>
                                        <span className="font-semibold text-slate-800">Bob Johnson (Team Leader)</span>
                                    </div>
                                    <div>
                                        <span className="block text-slate-500 mb-1">Tanggal Submit:</span>
                                        <span className="font-semibold text-slate-800">19/02/2026 14:00 WIB</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Catatan Review <span className="text-red-500">*</span></label>
                                    <textarea 
                                        value={catatan}
                                        onChange={(e) => setCatatan(e.target.value)}
                                        rows={5}
                                        placeholder="Berikan alasan jika ditolak, atau catatan untuk manajemen jika disetujui..."
                                        className="w-full text-sm px-4 py-3 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm"
                                    />
                                </div>
                            </div>
                            
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-lg flex flex-wrap gap-3 justify-end items-center">
                                <button 
                                    onClick={handleReject}
                                    className="px-5 py-2.5 bg-white border border-red-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 focus:ring-2 focus:ring-red-200 transition-colors flex items-center gap-2"
                                >
                                    <X className="w-5 h-5" /> Tolak (Kembali ke Draft)
                                </button>
                                <button 
                                    onClick={handleApprove}
                                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-200 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <Check className="w-5 h-5" /> Setujui & Teruskan ke Direktur
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Info Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <InfoTerminCard 
                            site={site}
                            terminName={termin.name}
                            terminPercentage={termin.percentage}
                            amount={expectedAmount}
                            tanggal="19/02/2026"
                        />

                        <ProgressWorkflowCard 
                            currentStatus="pending_review"
                        />
                    </div>
                </div>
        </div>
    );
};

export default TerminReview;
