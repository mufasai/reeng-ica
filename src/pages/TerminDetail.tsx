import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sites, filterTerms } from '../data/mockData';
import type { TerminDocument } from '../data/mockData';
import { InfoTerminCard } from '../components/sections/InfoTerminCard';
import { ProgressWorkflowCard } from '../components/sections/ProgressWorkflowCard';
import { TerminFilesSection } from '../components/sections/TerminFilesSection';
import { useAuth } from '../context/AuthContext';
import { UploadCloud, Eye, CheckCircle2, XCircle, CreditCard, ArrowLeft, AlertTriangle, FileText, X } from 'lucide-react';
import clsx from 'clsx';


const mockDocs: TerminDocument[] = [
    { id: 'd1', typeId: 'surat_pengajuan', name: 'Surat_Pengajuan_Termin2.pdf', url: '#', uploadedBy: 'Bob Johnson', uploadedAt: '19/02/2026 10:00' },
    { id: 'd2', typeId: 'laporan_progres', name: 'Laporan_Progres_100.pdf', url: '#', uploadedBy: 'Bob Johnson', uploadedAt: '19/02/2026 10:05' }
];

const TerminDetail = () => {
    const { id, terminId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    
    const site = sites.find(s => s.id === id);
    const termin = filterTerms.find(t => t.id === terminId) || filterTerms[1]; // Fallback to Termin 2

    const [documents, setDocuments] = useState<TerminDocument[]>(termin.documents || mockDocs);
    const [localStatus, setLocalStatus] = useState<string>(termin.status);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    if (!site) return <div className="p-6">Site not found</div>;

    const expectedAmount = site.budget * (termin.percentage / 100);

    const handleWorkflowAction = (actionId: string) => {
        switch (actionId) {
            case 'submit': setLocalStatus('pending_review'); break;
            case 'review': setLocalStatus('pengajuan'); break; // Moving to Director
            case 'approve': setLocalStatus('approved'); break;
            case 'reject': setLocalStatus('pending'); break; // Roll back
            case 'pay': setIsPaymentModalOpen(true); break;
        }
    };

    const handleUploadPayment = () => {
        // Mock successful upload and payment
        setIsPaymentModalOpen(false);
        setLocalStatus('paid');
        const newDoc: TerminDocument = {
            id: `d-${Date.now()}`, typeId: 'bukti_bayar', name: 'Bukti_Transfer_Termin.pdf', url: '#',
            uploadedBy: currentUser?.name || 'Finance User', uploadedAt: new Date().toLocaleString('id-ID')
        };
        setDocuments([...documents, newDoc]);
    };

    const handleUploadFile = (file: File) => {
        const newDoc: TerminDocument = {
            id: `d-${Date.now()}`, typeId: 'dokumen_tambahan', name: file.name, url: '#',
            uploadedBy: currentUser?.name || 'System', uploadedAt: new Date().toLocaleString('id-ID')
        };
        setDocuments([...documents, newDoc]);
    };

    const handleUploadExcel = (file: File) => {
        alert(`Baxckend parsing mock for ${file.name}`);
    };

    // Derived Status Flags based on localStatus
    const isPendingReview = localStatus === 'pending_review';
    const isPengajuan = localStatus === 'pengajuan' || localStatus === 'submitted';
    const isDiterima = localStatus === 'diterima' || localStatus === 'approved';
    const isDibayarkan = localStatus === 'dibayarkan' || localStatus === 'paid';

    // Role-based visibility
    const canReview = currentUser?.role === 'backoffice_admin';
    const canApprove = currentUser?.role === 'management';
    const canPay = currentUser?.role === 'finance';

    return (
        <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Header & Breadcrumbs */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/sites/${site.id}`)} className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 text-slate-500 shadow-sm transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Detail Pengajuan {termin.name}</h1>
                        <p className="text-slate-500 mt-1">
                            Site: {site.name} — Rp {expectedAmount.toLocaleString('id-ID')}
                        </p>
                    </div>
                </div>

                {/* --- DYNAMIC ALERT BANNERS --- */}
                {isPendingReview && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-center justify-between shadow-sm">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-amber-800">Menunggu Review Field Head</h4>
                                <p className="text-sm text-amber-700 mt-1 max-w-2xl">
                                    Termin ini menunggu review dari field head (Admin Backoffice) sebelum diteruskan ke direktur.
                                </p>
                            </div>
                        </div>
                        {canReview && (
                            <button 
                                onClick={() => navigate(`/sites/${site.id}/termins/${termin.id}/review`)}
                                className="flex-shrink-0 px-4 py-2 bg-amber-600 text-white font-medium rounded shadow-sm hover:bg-amber-700 transition-colors flex items-center gap-2"
                            >
                                <Eye className="w-4 h-4" /> Review Termin
                            </button>
                        )}
                    </div>
                )}

                {isPengajuan && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-center justify-between shadow-sm">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-amber-800">Menunggu Persetujuan Direktur</h4>
                                <p className="text-sm text-amber-700 mt-1 max-w-2xl">
                                    Termin ini sudah direview field head dan menunggu persetujuan akhir dari direktur.
                                </p>
                                <p className="text-xs text-amber-600 font-medium mt-2">
                                    Reviewed Oleh: System Backoffice - 20/02/2026 14:37
                                </p>
                            </div>
                        </div>
                        {canApprove && (
                            <div className="flex-shrink-0 flex gap-2">
                                <button onClick={() => handleWorkflowAction('reject')} className="px-4 py-2 bg-white text-red-600 font-medium rounded border border-red-200 shadow-sm hover:bg-red-50 transition-colors flex items-center gap-2">
                                    <XCircle className="w-4 h-4" /> Tolak Termin
                                </button>
                                <button onClick={() => handleWorkflowAction('approve')} className="px-4 py-2 bg-emerald-600 text-white font-medium rounded shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> Setujui Termin
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {isDiterima && (
                    <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-lg flex items-center justify-between shadow-sm">
                        <div className="flex items-start gap-3">
                            <CreditCard className="w-5 h-5 text-teal-600 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-teal-800">Menunggu Pembayaran</h4>
                                <p className="text-sm text-teal-700 mt-1 max-w-2xl">
                                    Disetujui oleh: Management System pada 20/02/2026 14:40. Menunggu pembayaran oleh keuangan.
                                </p>
                            </div>
                        </div>
                        {canPay && (
                            <button 
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="flex-shrink-0 px-4 py-2 bg-teal-600 text-white font-medium rounded shadow-sm hover:bg-teal-700 transition-colors flex items-center gap-2"
                            >
                                <UploadCloud className="w-4 h-4" /> Upload Bukti & Bayar
                            </button>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT: Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Info Termin Form Summary */}
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                            <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Informasi Pengajuan</h3>
                                <span className={clsx(
                                    "px-2.5 py-1 text-xs font-bold rounded uppercase tracking-wider",
                                    isPendingReview || isPengajuan ? "bg-amber-100 text-amber-700" :
                                    isDiterima ? "bg-teal-100 text-teal-700" :
                                    isDibayarkan ? "bg-emerald-100 text-emerald-700" :
                                    "bg-slate-100 text-slate-600"
                                )}>
                                    {localStatus.toUpperCase().replace('_', ' ')}
                                </span>
                            </div>
                            
                            <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-8">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Type Termin</label>
                                    <p className="font-medium text-slate-800 bg-slate-50 px-3 py-2 rounded border border-slate-100">{termin.name} ({termin.percentage}%)</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tanggal Terima</label>
                                    <p className="font-medium text-slate-800 bg-slate-50 px-3 py-2 rounded border border-slate-100">19/02/2026</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Jumlah</label>
                                    <p className="font-bold text-lg text-emerald-600 bg-emerald-50 px-4 py-3 rounded border border-emerald-100 flex items-center justify-between">
                                        Rp {expectedAmount.toLocaleString('id-ID')}
                                        <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-center">Terkunci</span>
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Keterangan / Catatan</label>
                                    <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded border border-slate-100 min-h-[80px]">
                                        Mohon di-review, semua dokumen BAST dan foto progress sudah lengkap sesuai requirements.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Files Section extracted as component */}
                        <TerminFilesSection 
                            documents={documents}
                            onUploadFile={handleUploadFile}
                            onUploadExcel={handleUploadExcel}
                            isLocked={!['pending', 'pending_review'].includes(localStatus)}
                        />

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
                            currentStatus={localStatus as any}
                            onAction={handleWorkflowAction}
                        />
                    </div>
                </div>

                {/* Mock Upload Payment Modal */}
                {isPaymentModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800">Upload Bukti Pembayaran</h3>
                                <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nominal Pembayaran</label>
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded font-mono font-bold text-slate-800">
                                        Rp {expectedAmount.toLocaleString('id-ID')}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">File Bukti Transfer <span className="text-red-500">*</span></label>
                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors">
                                        <FileText className="w-8 h-8 text-slate-400 mb-2" />
                                        <p className="text-sm font-medium text-slate-700">Klik untuk upload dokumen referensi bank</p>
                                        <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG up to 10MB</p>
                                    </div>
                                </div>
                                <div>
                                     <label className="block text-sm font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                                     <textarea className="w-full text-sm p-3 border border-slate-200 rounded focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none" rows={2} placeholder="Misal: Nomor Transaksi Bank..."></textarea>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded transition-colors">Batal</button>
                                <button onClick={handleUploadPayment} className="px-4 py-2 bg-teal-600 text-white font-medium rounded shadow-sm hover:bg-teal-700 transition-colors">
                                    Konfirmasi Pembayaran
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default TerminDetail;
