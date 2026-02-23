import { useState } from 'react';
import { X, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { type SKP } from '../../data/mockData';

interface BuatSKPModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (skp: Partial<SKP>) => void;
    siteId: string;
}

const BuatSKPModal = ({ isOpen, onClose, onSubmit, siteId }: BuatSKPModalProps) => {
    // Generate mock SKP number based on year and random increment
    const defaultSkpNumber = `SKP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    
    const [skpNumber, setSkpNumber] = useState(defaultSkpNumber);
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [keterangan, setKeterangan] = useState('');
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');

    if (!isOpen) return null;

    const handleUploadMock = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setUploadStatus('uploading');
            setTimeout(() => setUploadStatus('success'), 800);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            siteId,
            skpNumber,
            tanggal,
            keterangan,
            status: 'Submitted',
            documentUrl: uploadStatus === 'success' ? 'mock-url' : undefined
        });
        // Reset state
        setSkpNumber(`SKP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`);
        setTanggal(new Date().toISOString().split('T')[0]);
        setKeterangan('');
        setUploadStatus('idle');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        Buat SKP Baru
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="skp-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SKP Number</label>
                            <input 
                                type="text" 
                                required
                                value={skpNumber}
                                onChange={e => setSkpNumber(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                            <input 
                                type="date" 
                                required
                                value={tanggal}
                                onChange={e => setTanggal(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Keterangan / Keperluan Material</label>
                            <textarea 
                                required
                                rows={3}
                                value={keterangan}
                                onChange={e => setKeterangan(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Jelaskan kebutuhan material..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Dokumen SKP & Material List (Wajib)
                            </label>
                            <div className="border border-dashed border-slate-300 rounded p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                                <input 
                                    type="file" 
                                    accept=".pdf,.xlsx,.csv"
                                    onChange={handleUploadMock}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {uploadStatus === 'idle' && (
                                    <>
                                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-blue-600">Klik untuk Upload PDF/Excel</p>
                                        <p className="text-xs text-slate-500 mt-1">Sertakan list material</p>
                                    </>
                                )}
                                {uploadStatus === 'uploading' && (
                                    <p className="text-sm text-blue-600 animate-pulse">Uploading...</p>
                                )}
                                {uploadStatus === 'success' && (
                                    <div className="flex flex-col items-center gap-1">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                        <p className="text-sm font-medium text-emerald-600">Dokumen Terupload</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                    <button onClick={onClose} type="button" className="px-4 py-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded font-medium transition-colors">
                        Batal
                    </button>
                    <button 
                        type="submit" 
                        form="skp-form"
                        disabled={uploadStatus !== 'success'}
                        className={`px-4 py-2 font-medium rounded transition-colors shadow-sm ${uploadStatus === 'success' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                    >
                        Simpan SKP
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BuatSKPModal;
