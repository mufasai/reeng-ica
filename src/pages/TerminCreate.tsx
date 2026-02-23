import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sites, filterTerms } from '../data/mockData';
import { InfoTerminCard } from '../components/sections/InfoTerminCard';
import { ProgressWorkflowCard } from '../components/sections/ProgressWorkflowCard';
import { Send, Save, X } from 'lucide-react';

const TerminCreate = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // In a real app we would fetch the specific termin based on query params or state.
    // For the mockup, we'll grab the first active termin for this site, or default to Termin 2.
    const site = sites.find(s => s.id === id);
    const siteTermins = filterTerms.filter(t => t.siteId === id);
    const termin = siteTermins.find(t => t.status === 'pending') || siteTermins[1] || filterTerms[1];

    const [tanggalTerima, setTanggalTerima] = useState('');
    const [jumlahTermin, setJumlahTermin] = useState(termin.amountRequest || (site?.budget ? site.budget * (termin.percentage / 100) : 0));
    const [keterangan, setKeterangan] = useState('');

    if (!site) return <div className="p-6">Site not found</div>;

    const handleSubmit = () => {
        alert('Termin diajukan untuk review!');
        // In a real app this would call an API and then navigate.
        // We'll simulate by navigating to the detail page with the termin ID
        navigate(`/sites/${site.id}/termins/${termin.id}`);
    };

    const expectedAmount = site.budget * (termin.percentage / 100);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Ajukan Termin Baru</h1>
                        <p className="text-slate-500 mt-1">Lengkapi form pengajuan termin dan unggah dokumen pendukung.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT: Form Card */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                            <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-lg">
                                <h3 className="font-bold text-slate-800">Form Pengajuan {termin.name}</h3>
                            </div>
                            
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Type Termin</label>
                                    <input 
                                        type="text" 
                                        value={`${termin.name} (${termin.percentage}%)`} 
                                        disabled 
                                        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md bg-slate-50 text-slate-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Terima <span className="text-red-500">*</span></label>
                                    <input 
                                        type="date" 
                                        value={tanggalTerima}
                                        onChange={(e) => setTanggalTerima(e.target.value)}
                                        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah Termin (Rp) <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-slate-500 sm:text-sm">Rp</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            value={jumlahTermin}
                                            onChange={(e) => setJumlahTermin(Number(e.target.value))}
                                            className="w-full text-sm pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <p className="text-xs text-blue-600 mt-1.5 flex items-center gap-1">
                                        Expected: {termin.percentage}% dari Rp {site.budget.toLocaleString('id-ID')} = Rp {expectedAmount.toLocaleString('id-ID')}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan</label>
                                    <textarea 
                                        value={keterangan}
                                        onChange={(e) => setKeterangan(e.target.value)}
                                        rows={4}
                                        placeholder="Tambahkan catatan atau keterangan tambahan..."
                                        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-lg flex flex-wrap gap-3 justify-end items-center">
                                <button 
                                    onClick={() => navigate(`/sites/${site.id}`)}
                                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <X className="w-4 h-4" /> Batal
                                </button>
                                <button className="px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-200 flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Simpan sebagai Draft
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Send className="w-4 h-4" /> Submit untuk Review
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
                        />

                        <ProgressWorkflowCard 
                            currentStatus="pending"
                        />
                    </div>
                </div>
        </div>
    );
};

export default TerminCreate;
