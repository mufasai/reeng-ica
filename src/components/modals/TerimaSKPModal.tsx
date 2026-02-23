import { useState } from 'react';
import { X, Upload, CheckCircle2, PackageCheck } from 'lucide-react';

interface TerimaSKPModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (receivedData: any) => void;
    skpId: string;
    skpNumber: string;
}

const TerimaSKPModal = ({ isOpen, onClose, onSubmit, skpId, skpNumber }: TerimaSKPModalProps) => {
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success'>('idle');
    const [catatan, setCatatan] = useState('');

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
            skpId,
            status: 'Received',
            catatan,
            receivedEvidenceUrl: uploadStatus === 'success' ? 'mock-evidence-url' : undefined
        });
        
        // Reset 
        setUploadStatus('idle');
        setCatatan('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-emerald-500" />
                        Terima Material
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-6">
                        Menandai material untuk SKP <span className="font-bold text-slate-800">{skpNumber}</span> sebagai telah diterima di lokasi.
                    </p>

                    <form id="terima-skp-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Bukti Serah Terima Material (Wajib)
                            </label>
                            <div className="border border-dashed border-slate-300 rounded p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                                <input 
                                    type="file" 
                                    accept="image/*,.pdf"
                                    required
                                    onChange={handleUploadMock}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {uploadStatus === 'idle' && (
                                    <>
                                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-emerald-600">Klik untuk Upload Foto / PDF</p>
                                        <p className="text-xs text-slate-500 mt-1">Sertakan foto barang dan dokumen BAST</p>
                                    </>
                                )}
                                {uploadStatus === 'uploading' && (
                                    <p className="text-sm text-emerald-600 animate-pulse">Uploading...</p>
                                )}
                                {uploadStatus === 'success' && (
                                    <div className="flex flex-col items-center gap-1">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                        <p className="text-sm font-medium text-emerald-600">Bukti Terupload</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                            <textarea 
                                rows={2}
                                value={catatan}
                                onChange={e => setCatatan(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                placeholder="Kondisi barang, kekurangan, dll..."
                            />
                        </div>
                    </form>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                    <button onClick={onClose} type="button" className="px-4 py-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded font-medium transition-colors">
                        Batal
                    </button>
                    <button 
                        type="submit" 
                        form="terima-skp-form"
                        disabled={uploadStatus !== 'success'}
                        className={`px-4 py-2 font-medium rounded transition-colors shadow-sm ${uploadStatus === 'success' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                    >
                        Tandai Diterima
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TerimaSKPModal;
