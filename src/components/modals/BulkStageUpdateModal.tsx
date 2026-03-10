import { useState } from 'react';
import { X, Upload, Download, CheckCircle2, AlertTriangle, XCircle, ArrowRight, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import clsx from 'clsx';
import * as xlsx from 'xlsx';
import { STAGE_ORDER } from '../../data/mockData';
import { generateBulkUpdateTemplate } from '../../utils/excelTemplates';

interface BulkStageUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectType?: string; // Optional: restrict template to a certain project type, e.g., 'FILTER'
    onSuccess?: (count: number) => void;
}

type Step = 1 | 2 | 3;

interface ParsedRow {
    unique_key: string;
    site_id: string;
    site_name: string;
    current_stage: string;
    new_stage: string;
    tower_provider?: string;
    jenis_kunci?: string;
    ci_date?: string;
    ci_time?: string;
    co_date?: string;
    co_time?: string;
    rfi_done?: string;
    rfs_done?: string;
    catatan?: string;
    [key: string]: any;
}

interface ValidatedRow {
    row: ParsedRow;
    status: 'valid' | 'skip' | 'error';
    reason?: string;
}

export default function BulkStageUpdateModal({ isOpen, onClose, projectType, onSuccess }: BulkStageUpdateModalProps) {
    const [step, setStep] = useState<Step>(1);
    const [isDragActive, setIsDragActive] = useState(false);
    const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Results
    const [updatedCount, setUpdatedCount] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);
    const [errorCount, setErrorCount] = useState(0);

    const resetModal = () => {
        setStep(1);
        setValidatedRows([]);
        setUpdatedCount(0);
        setSkippedCount(0);
        setErrorCount(0);
        setIsProcessing(false);
    };

    const handleClose = () => {
        resetModal();
        onClose();
    };

    if (!isOpen) return null;

    const downloadTemplate = () => {
        generateBulkUpdateTemplate(projectType || 'ALL');
    };

    const processExcel = async (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = xlsx.read(data, { type: 'array' });
                
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawJson = xlsx.utils.sheet_to_json<ParsedRow>(worksheet);

                // Validate logic
                const processingRows: ValidatedRow[] = rawJson.map(row => {
                    const current = row.current_stage || 'imported';
                    const next = row.new_stage?.toString().trim();

                    if (!next) {
                        return { row, status: 'skip', reason: 'Blank new_stage' };
                    }

                    const currentIndex = STAGE_ORDER.indexOf(current);
                    const nextIndex = STAGE_ORDER.indexOf(next);

                    if (nextIndex === -1) {
                        return { row, status: 'error', reason: `Unknown stage: ${next}` };
                    }
                    if (nextIndex <= currentIndex) {
                        return { row, status: 'skip', reason: 'Stage mundur/sama tidak diizinkan' };
                    }
                    if (nextIndex > currentIndex + 1) {
                        return { row, status: 'error', reason: `Lompat stage tidak valid (skip ${nextIndex - currentIndex - 1} stages)` };
                    }

                    // Otherwise, exactly 1 stage forward -> valid
                    return { row, status: 'valid' };
                });

                setValidatedRows(processingRows);
                setStep(2);
            } catch (err) {
                console.error("Excel processing failed", err);
                alert("Gagal membaca file Excel. Pastikan format sesuai template.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processExcel(e.dataTransfer.files[0]);
        }
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processExcel(e.target.files[0]);
        }
    };

    const executeUpdates = () => {
        setIsProcessing(true);
        // Simulate processing time
        setTimeout(() => {
            const valid = validatedRows.filter(r => r.status === 'valid').length;
            const skip = validatedRows.filter(r => r.status === 'skip').length;
            const errs = validatedRows.filter(r => r.status === 'error').length;
            
            // In a real app we would map `siteMasterRecords` and insert `siteStageLogs`.
            // For mock UI, we just increment counts correctly and move to Result step.
            
            setUpdatedCount(valid);
            setSkippedCount(skip);
            setErrorCount(errs);
            setStep(3);
            setIsProcessing(false);
            if(onSuccess) onSuccess(valid);
        }, 800);
    };

    const exportReport = () => {
        const reportData = validatedRows.map(r => ({
            ...r.row,
            import_status: r.status,
            import_reason: r.reason || 'Sukses'
        }));
        const ws = xlsx.utils.json_to_sheet(reportData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Import_Result');
        xlsx.writeFile(wb, `Bulk_Update_Result_${new Date().getTime()}.xlsx`);
    };

    const validCount = validatedRows.filter(r => r.status === 'valid').length;
    const skipCount = validatedRows.filter(r => r.status === 'skip').length;
    const errCount = validatedRows.filter(r => r.status === 'error').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-blue-600"/> Bulk Update Stage
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Update stage untuk banyak site sekaligus dari Excel</p>
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="flex justify-center mb-6">
                                <button onClick={downloadTemplate} className="flex flex-col items-center gap-2 px-8 py-5 border border-blue-200 bg-blue-50 text-blue-700 font-medium rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-sm">
                                    <Download className="w-6 h-6" />
                                    Download Template Excel
                                </button>
                            </div>

                            <div 
                                onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
                                onDragLeave={e => { e.preventDefault(); setIsDragActive(false); }}
                                onDrop={handleFileDrop}
                                className={clsx(
                                    "border-2 border-dashed rounded-xl p-10 text-center transition-colors bg-white",
                                    isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                                )}
                            >
                                <Upload className={clsx("w-10 h-10 mx-auto mb-4 transition-colors", isDragActive ? "text-blue-500" : "text-slate-400")} />
                                <h3 className="text-base font-semibold text-slate-700 mb-1">Drag & drop template yang sudah diisi ke sini</h3>
                                <p className="text-sm text-slate-500 mb-6">Menerima format .xlsx dan .xls</p>
                                
                                <label className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer font-medium transition-colors shadow-sm inline-block">
                                    Browse Files
                                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileChange} />
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-slate-800">Preview & Validation</h3>
                                <div className="flex gap-4 text-sm font-medium">
                                    <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> {validCount} akan diupdate</span>
                                    <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> {skipCount} dilewati</span>
                                    <span className="text-red-500 flex items-center gap-1"><XCircle className="w-4 h-4"/> {errCount} error</span>
                                </div>
                            </div>
                            
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm ring-1 ring-slate-200/50">
                                <div className="max-h-[40vh] overflow-auto custom-scrollbar">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 sticky top-0 z-10 ring-1 ring-slate-200">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold text-slate-600 w-28 text-center">Status</th>
                                                <th className="px-4 py-3 font-semibold text-slate-600">SITE ID</th>
                                                <th className="px-4 py-3 font-semibold text-slate-600">Current Stage</th>
                                                <th className="px-4 py-3 font-semibold text-slate-600">New Stage</th>
                                                <th className="px-4 py-3 font-semibold text-slate-600">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {validatedRows.map((r, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-2 text-center">
                                                        {r.status === 'valid' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3"/> Valid</span>
                                                        ) : r.status === 'skip' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700"><AlertTriangle className="w-3 h-3"/> Skip</span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3"/> Error</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 font-mono text-slate-700">{r.row.site_id}</td>
                                                    <td className="px-4 py-2 text-slate-500">{r.row.current_stage || 'imported'}</td>
                                                    <td className="px-4 py-2 font-medium text-slate-800">{r.row.new_stage || '-'}</td>
                                                    <td className="px-4 py-2 text-slate-500 max-w-xs truncate" title={r.reason}>{r.reason || ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="bg-amber-50 p-4 rounded-lg flex gap-3 text-sm text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600"/>
                                <p><strong>Penting:</strong> Dokumen evidence tidak didukung pada proses Bulk Import. Flag <em>"Dokumen belum dilampirkan"</em> akan muncul di detail site pasca-update.</p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center py-10">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6 ring-4 ring-emerald-50">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600"/>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Import Selesai!</h3>
                            <p className="text-slate-500 mb-8 text-center max-w-md">Data stage site berhasil diperbarui ke dalam sistem. Laporan processing tersedia untuk diunduh.</p>
                            
                            <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm mb-8">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Berhasil diupdate</span>
                                    <span className="font-bold text-slate-800">{updatedCount}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500"/> Dilewati</span>
                                    <span className="font-bold text-slate-800">{skippedCount}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-100">
                                    <span className="text-slate-600 flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500"/> Error</span>
                                    <span className="font-bold text-slate-800">{errorCount}</span>
                                </div>
                            </div>
                            
                            <button onClick={exportReport} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium hover:underline text-sm">
                                <Download className="w-4 h-4" /> Download Laporan Hasil
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3 shrink-0">
                    {step === 1 && (
                        <button onClick={handleClose} className="px-5 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 font-medium rounded-lg transition-colors">
                            Batal
                        </button>
                    )}
                    {step === 2 && (
                        <>
                            <button onClick={() => setStep(1)} className="px-5 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 font-medium rounded-lg transition-colors flex items-center gap-2 mr-auto" disabled={isProcessing}>
                                <ArrowLeft className="w-4 h-4"/> Kembali
                            </button>
                            <button onClick={executeUpdates} disabled={isProcessing || validCount === 0} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                {isProcessing ? 'Memproses...' : `Proses ${validCount} Sites`} <ArrowRight className="w-4 h-4"/>
                            </button>
                        </>
                    )}
                    {step === 3 && (
                        <button onClick={handleClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors shadow-sm">
                            Tutup
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
