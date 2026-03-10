import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Plus, FileSpreadsheet, AlertTriangle, CheckCircle2, ListChecks, ArrowRight, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface ImportSiteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportExcel: (parsedData: any[], fileName: string) => void;
    onAddManual: () => void;
}

// MOCK: Generate some conflict data when parsing
const generateMockConflicts = () => {
    return [
        { unique_key: 'BKS598', site_id: 'BKS598', field: 'site_name', oldVal: 'CIPINANGJAYALAMA', newVal: 'CIPINANGJAYA_NEW', accepted: true },
        { unique_key: 'JKT001', site_id: 'JKT001', field: 'longitude', oldVal: '106.820', newVal: '106.822', accepted: true },
        { unique_key: 'BDO123', site_id: 'BDO123', field: 'tower_provider', oldVal: 'Mitratel', newVal: 'Tower Bersama', accepted: false },
        { unique_key: 'SBY999', site_id: 'SBY999', field: 'po_tsel', oldVal: '4200052176', newVal: '4200088888', accepted: true },
    ];
};

const ImportSiteModal: React.FC<ImportSiteModalProps> = ({ isOpen, onClose, onImportExcel, onAddManual }) => {
    // Top-level Wizard State
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    
    // Step 1 State
    const [activeTab, setActiveTab] = useState<'excel' | 'manual'>('excel');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Step 3 State (Conflicts)
    const [conflicts, setConflicts] = useState<any[]>([]);
    
    // Step 4 State (Result)
    const [resultCounts, setResultCounts] = useState({ new: 0, updated: 0, skipped: 0, unchanged: 0 });

    useEffect(() => {
        if (!isOpen) {
            // Reset state fully when modal closes
            setTimeout(() => {
                setStep(1);
                setActiveTab('excel');
                setSelectedFile(null);
                setConflicts([]);
            }, 300);
        }
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setSelectedFile(file || null);
    };

    const handleNextToAnalyze = () => {
        setStep(2);
        // Simulate Processing
        setTimeout(() => {
            if (!selectedFile) return;
            // Generate mock conflicts
            const mockC = generateMockConflicts();
            setConflicts(mockC);
            // Move to review
            setStep(3);
        }, 1500);
    };

    const handleAcceptToggle = (key: string, field: string, val: boolean) => {
        setConflicts(prev => prev.map(c => 
            (c.unique_key === key && c.field === field) ? { ...c, accepted: val } : c
        ));
    };

    const handleBulkAccept = (val: boolean) => {
        setConflicts(prev => prev.map(c => ({ ...c, accepted: val })));
    };

    const handleFinishImport = () => {
        // Calculate result
        const acceptedCount = conflicts.filter(c => c.accepted).length;
        const skippedCount = conflicts.length - acceptedCount;
        setResultCounts({
            new: 12, // Mock 12 new sites
            updated: acceptedCount,
            skipped: skippedCount,
            unchanged: 45 // Mock 45 unchanged
        });
        
        // Let the parent know
        onImportExcel([], selectedFile?.name || 'Import_Batch');
        
        setStep(4);
    };

    // ─── Renders ─────────────────────────────────────────────────────────────
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Header with Steps */}
                <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-slate-800">Add Site & Import</h2>
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-slate-300">|</span>
                            <div className="flex flex-row gap-2 text-xs font-bold">
                                {[1, 2, 3, 4].map((s, idx) => (
                                    <div key={s} className="flex items-center gap-2">
                                        <span className={clsx(
                                            "flex items-center justify-center w-5 h-5 rounded-full",
                                            step === s ? "bg-blue-600 text-white" : step > s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {step > s ? <CheckCircle2 className="w-3 h-3" /> : s}
                                        </span>
                                        <span className={clsx(step === s ? "text-slate-800" : step > s ? "text-emerald-600" : "text-slate-400")}>
                                            {s === 1 ? 'Upload' : s === 2 ? 'Analysis' : s === 3 ? 'Review' : 'Result'}
                                        </span>
                                        {idx < 3 && <div className="w-4 h-px bg-slate-200"></div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {step !== 2 && (
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Body Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 relative">
                    {/* STEP 1: UPLOAD */}
                    {step === 1 && (
                        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex border-b border-slate-200 bg-slate-50">
                                <button onClick={() => setActiveTab('excel')} className={clsx("flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2", activeTab === 'excel' ? "border-blue-600 text-blue-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100")}>
                                    <Upload className="w-4 h-4" /> Upload Excel BoQ
                                </button>
                                <button onClick={() => setActiveTab('manual')} className={clsx("flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2", activeTab === 'manual' ? "border-blue-600 text-blue-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100")}>
                                    <Plus className="w-4 h-4" /> Entry Manual
                                </button>
                            </div>
                            
                            <div className="p-6">
                                {activeTab === 'excel' && (
                                    <div className="space-y-6">
                                        <p className="text-sm text-slate-600 text-center">
                                            Import file Excel Master List dari Telkomsel. Sistem akan memisahkan record baru dan mendeteksi perubahan data pada record lama.
                                        </p>
                                        <input type="file" className="hidden" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileChange} />
                                        
                                        <div 
                                            className={clsx(
                                                "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group",
                                                selectedFile ? "border-blue-500 bg-blue-50/50" : "border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-400"
                                            )}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {selectedFile ? (
                                                <div className="animate-in zoom-in duration-200">
                                                    <div className="w-14 h-14 bg-white border border-blue-200 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <FileSpreadsheet className="w-7 h-7 text-blue-600" />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-slate-800 mb-1">{selectedFile.name}</h3>
                                                    <p className="text-xs text-slate-500 font-mono mb-4">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                                    <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
                                                        Ganti File
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="w-14 h-14 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                                        <Upload className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                    </div>
                                                    <h3 className="text-sm font-bold text-slate-800 mb-1">Klik atau Drop file disini</h3>
                                                    <p className="text-xs text-slate-500 font-medium tracking-wide">XLSX atau XLS (Max 20MB)</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex gap-3 text-sm">
                                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                            <div className="text-slate-700">
                                                <p className="font-bold mb-1">Penting:</p>
                                                <ul className="list-disc pl-4 space-y-1 text-xs">
                                                    <li>Header wajib ada: <code className="bg-white px-1 py-0.5 rounded border border-slate-200">SITE_ID</code>, <code className="bg-white px-1 py-0.5 rounded border border-slate-200">Site Name</code>, <code className="bg-white px-1 py-0.5 rounded border border-slate-200">Region</code></li>
                                                    <li>Record yang sudah ada di sistem dan tidak memiliki perubahan <strong>tidak akan diubah</strong>.</li>
                                                    <li>Data <strong>Operasional</strong> (Status/Stage/Tim) di sistem tidak akan tertimpa oleh Import.</li>
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4 border-t border-slate-100">
                                            <button 
                                                onClick={handleNextToAnalyze}
                                                disabled={!selectedFile}
                                                className={clsx(
                                                    "px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm",
                                                    selectedFile ? "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                )}
                                            >
                                                Lanjut ke Analisis <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {activeTab === 'manual' && (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* (Input fields code omitted for brevity as manual isn't the focus, keep simple) */}
                                            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">SITE ID *</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" placeholder="e.g. BKS598" /></div>
                                            <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Project Type *</label>
                                                <select className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white"><option>COMBAT</option><option>FILTER</option></select>
                                            </div>
                                            <div className="space-y-1.5 col-span-2"><label className="text-xs font-bold text-slate-700">Site Name *</label><input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" placeholder="e.g. CIPINANGJAYA" /></div>
                                        </div>
                                        <div className="flex justify-end pt-4 border-t border-slate-100">
                                            <button onClick={onAddManual} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm">
                                                Simpan Site Baru
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: ANALYZING (Spinner) */}
                    {step === 2 && (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin relative" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-slate-800">Menganalisis Data Excel...</h3>
                                <p className="text-sm text-slate-500 mt-1">Membandingkan baris excel dengan database operasional saat ini</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: REVIEW CONFLICTS */}
                    {step === 3 && (
                        <div className="h-full flex flex-col space-y-4 animate-in slide-in-from-right-8 duration-300">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-full mt-0.5"><ListChecks className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-sm font-bold text-amber-800 mb-1">Ditemukan Perbedaan Data TI pada {conflicts.length} Site</h3>
                                    <p className="text-sm text-amber-700 mb-3">Tinjau dan pilih data baru yang ingin diupdate ke database. <strong>Data Operasional dan Stage tidak akan berubah.</strong></p>
                                    
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => handleBulkAccept(true)} className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 rounded text-xs font-bold transition-colors">✓ Terima Semua</button>
                                        <button onClick={() => handleBulkAccept(false)} className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 rounded text-xs font-bold transition-colors">✗ Tolak Semua</button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[300px]">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 font-bold text-slate-600 w-16 text-center">Update?</th>
                                            <th className="px-4 py-3 font-bold text-slate-600">SITE_ID</th>
                                            <th className="px-4 py-3 font-bold text-slate-600">Kolom</th>
                                            <th className="px-4 py-3 font-bold text-slate-600 w-1/3">Data Di Sistem</th>
                                            <th className="px-4 py-3 font-bold text-slate-600 w-1/3">Data Dari Excel</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {conflicts.map((c, i) => (
                                            <tr key={`${c.unique_key}-${c.field}-${i}`} className={clsx("transition-colors", c.accepted ? "bg-white" : "bg-slate-50")}>
                                                <td className="px-4 py-3 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={c.accepted} 
                                                        onChange={(e) => handleAcceptToggle(c.unique_key, c.field, e.target.checked)}
                                                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-mono font-bold text-slate-800">{c.site_id}</td>
                                                <td className="px-4 py-3 text-slate-600 font-medium">
                                                    <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-xs">{c.field}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={clsx("transition-all duration-300", c.accepted ? "line-through text-slate-400" : "font-semibold text-slate-700")}>
                                                        {c.oldVal}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={clsx("transition-all flex items-center gap-2 font-semibold duration-300", c.accepted ? "text-blue-600" : "text-slate-400")}>
                                                        {c.accepted && <ArrowRight className="w-3 h-3 text-blue-400" />} {c.newVal}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <span className="text-sm font-medium text-slate-500">
                                    <strong className="text-blue-600">{conflicts.filter(x => x.accepted).length}</strong> / {conflicts.length} perubahan dipilih
                                </span>
                                <button 
                                    onClick={handleFinishImport}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm"
                                >
                                    Lanjut Simpan ke Database
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: RESULT */}
                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center space-y-6 animate-in slide-in-from-bottom-8 duration-300 py-8">
                            <div className="w-16 h-16 bg-emerald-100 border-4 border-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Import Berhasil</h3>
                                <p className="text-slate-500 font-medium">{selectedFile?.name} telah masuk ke sistem.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-4">
                                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                                    <p className="text-3xl font-black text-blue-600 mb-1">{resultCounts.new}</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Site Baru</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                                    <p className="text-3xl font-black text-emerald-600 mb-1">{resultCounts.updated}</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Data Diperbarui</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                                    <p className="text-3xl font-black text-amber-500 mb-1">{resultCounts.skipped}</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Data Dilewati/Tolak</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm opacity-60">
                                    <p className="text-3xl font-black text-slate-400 mb-1">{resultCounts.unchanged}</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tidak Berubah</p>
                                </div>
                            </div>

                            <button 
                                onClick={onClose}
                                className="mt-8 px-6 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-900 transition-colors w-full max-w-xs"
                            >
                                Kembali ke Registri
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportSiteModal;
