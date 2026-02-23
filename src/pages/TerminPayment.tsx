import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sites, filterTerms } from '../data/mockData';
import { InfoTerminCard } from '../components/sections/InfoTerminCard';
import { ProgressWorkflowCard } from '../components/sections/ProgressWorkflowCard';
import { CreditCard, Upload, X, ArrowLeft } from 'lucide-react';


const TerminPayment = () => {
    const { id, terminId } = useParams();
    const navigate = useNavigate();
    
    const site = sites.find(s => s.id === id);
    const termin = filterTerms.find(t => t.id === terminId) || filterTerms[1];

    const [referensi, setReferensi] = useState('');
    const [catatan, setCatatan] = useState('');
    const [file, setFile] = useState<File | null>(null);

    if (!site) return <div className="p-6">Site not found</div>;

    const expectedAmount = site.budget * (termin.percentage / 100);

    const handleConfirm = () => {
        if (!referensi || !file) {
            alert('Mohon isi referensi dan upload bukti pembayaran!');
            return;
        }
        alert('Pembayaran Dikonfirmasi!');
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
                        <h1 className="text-2xl font-bold text-slate-800">Pembayaran {termin.name}</h1>
                        <p className="text-slate-500 mt-1">Konfirmasi Pembayaran Oleh Finance</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT: Form Card */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-lg">
                                <h3 className="font-bold text-slate-800">Form Pembayaran</h3>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                {/* Highlight Card */}
                                <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 text-center shadow-sm">
                                    <h4 className="text-teal-800 font-medium mb-2 uppercase tracking-wide text-sm">Jumlah yang harus dibayarkan</h4>
                                    <p className="text-4xl font-black text-teal-700">Rp {expectedAmount.toLocaleString('id-ID')}</p>
                                    <p className="text-teal-600 mt-2 text-sm">{termin.name} ({termin.percentage}%) - {site.name}</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Referensi Pembayaran <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            value={referensi}
                                            onChange={(e) => setReferensi(e.target.value)}
                                            placeholder="No. Transfer / Cek / Giro"
                                            className="w-full text-sm px-4 py-2 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Upload Bukti Transfer <span className="text-red-500">*</span></label>
                                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:bg-slate-50 transition-colors">
                                            <div className="space-y-1 text-center">
                                                <Upload className="mx-auto h-12 w-12 text-slate-400" />
                                                <div className="flex text-sm text-slate-600 justify-center">
                                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                        <span>Upload a file</span>
                                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                                    </label>
                                                    <p className="pl-1">or drag and drop</p>
                                                </div>
                                                <p className="text-xs text-slate-500">PDF, PNG, JPG up to 10MB</p>
                                                {file && <p className="text-emerald-600 text-sm font-medium mt-2">Selected: {file.name}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Keuangan</label>
                                        <textarea 
                                            value={catatan}
                                            onChange={(e) => setCatatan(e.target.value)}
                                            rows={3}
                                            placeholder="Catatan tambahan (opsional)..."
                                            className="w-full text-sm px-4 py-3 border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-lg flex flex-wrap gap-3 justify-end items-center">
                                <button 
                                    onClick={() => navigate(`/sites/${site.id}/termins/${termin.id}`)}
                                    className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                                >
                                    <X className="w-5 h-5" /> Batal
                                </button>
                                <button 
                                    onClick={handleConfirm}
                                    className="px-5 py-2.5 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <CreditCard className="w-5 h-5" /> Konfirmasi Pembayaran
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
                            approvedBy="Direktur Name"
                            approvedAt="20/02/2026 09:12 WIB"
                        />

                        <ProgressWorkflowCard 
                            currentStatus="diterima"
                        />
                    </div>
                </div>
        </div>
    );
};

export default TerminPayment;
