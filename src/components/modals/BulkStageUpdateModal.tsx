import { useState, useMemo, useRef } from 'react';
import {
    X, Upload, Download, CheckCircle2, AlertTriangle, XCircle,
    ArrowRight, ArrowLeft, FileSpreadsheet, Filter as FilterIcon,
    Paperclip, SkipForward, Eye
} from 'lucide-react';
import clsx from 'clsx';
import * as xlsx from 'xlsx';
import { STAGE_ORDER, siteMasterRecords, type ProjectType } from '../../data/mockData';
import {
    generateBulkUpdateTemplate,
    parseBulkTemplate,
    groupByTransition,
    type TemplateScope,
    type ValidatedBulkRow,
    type StageTransitionGroup,
} from '../../utils/excelTemplates';
import { useAuth } from '../../context/AuthContext';

interface BulkStageUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectType?: string;
    onSuccess?: (count: number) => void;
}

type Step = 1 | 2 | 3 | 4 | 5;
type PreviewTab = 'valid' | 'skip' | 'error';

// ─── Stage checkboxes ────────────────────────────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
    imported: 'Imported', assigned: 'Assigned',
    permit_process: 'Permit Process', permit_ready: 'Permit Ready',
    akses_process: 'Akses Process', akses_ready: 'Akses Ready',
    implementasi: 'Implementasi', rfi_done: 'RFI Done',
    rfs_done: 'RFS Done', dokumen_done: 'Dokumen Done',
    bast: 'BAST', invoice: 'Invoice', completed: 'Completed',
};

const PROJECT_TYPES: { id: ProjectType | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'Semua Tipe' },
    { id: 'FILTER', label: 'Filter' },
    { id: 'COMBAT', label: 'Combat' },
    { id: 'BLACKSITE', label: 'Blacksite' },
    { id: 'L2H', label: 'L2H' },
    { id: 'REFINEN', label: 'Refinen' },
];

// ─── Uploaded document per stage group ───────────────────────────────────────
interface DocUpload {
    transitionKey: string;
    files: File[];
}

export default function BulkStageUpdateModal({ isOpen, onClose, projectType, onSuccess }: BulkStageUpdateModalProps) {
    const { can } = useAuth();

    // ── Step state ──
    const [step, setStep] = useState<Step>(1);

    // ── Step 1: Scope ──
    const [selectedType, setSelectedType] = useState<ProjectType | 'ALL'>(
        (projectType?.toUpperCase() as ProjectType) || 'ALL'
    );
    const [selectedStages, setSelectedStages] = useState<string[]>([]);

    // ── Step 2: Upload ──
    const [isDragActive, setIsDragActive] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isParsingFile, setIsParsingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Step 3: Preview ──
    const [validatedRows, setValidatedRows] = useState<ValidatedBulkRow[]>([]);
    const [previewTab, setPreviewTab] = useState<PreviewTab>('valid');

    // ── Step 4: Doc Upload ──
    const [transitionGroups, setTransitionGroups] = useState<StageTransitionGroup[]>([]);
    const [docUploads, setDocUploads] = useState<DocUpload[]>([]);

    // ── Step 5: Result ──
    const [updatedCount, setUpdatedCount] = useState(0);
    const [skippedCount, setSkippedCount] = useState(0);
    const [errorCount, setErrorCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [docAttachedCount, setDocAttachedCount] = useState(0);

    // ── Derived counts ──
    const validCount = validatedRows.filter(r => r.status === 'valid').length;
    const skipCount = validatedRows.filter(r => r.status === 'skip').length;
    const errCount = validatedRows.filter(r => r.status === 'error').length;

    // ── Scope preview count ──
    const scopeCount = useMemo(() => {
        let sites = [...siteMasterRecords];
        if (selectedType !== 'ALL') {
            sites = sites.filter(s => s.project_type === selectedType);
        }
        if (selectedStages.length > 0) {
            sites = sites.filter(s => selectedStages.includes(s.stage || 'imported'));
        }
        return sites.length;
    }, [selectedType, selectedStages]);

    // ── Reset ──
    const resetModal = () => {
        setStep(1);
        setSelectedType((projectType?.toUpperCase() as ProjectType) || 'ALL');
        setSelectedStages([]);
        setIsDragActive(false);
        setUploadError(null);
        setIsParsingFile(false);
        setValidatedRows([]);
        setPreviewTab('valid');
        setTransitionGroups([]);
        setDocUploads([]);
        setUpdatedCount(0);
        setSkippedCount(0);
        setErrorCount(0);
        setIsProcessing(false);
        setDocAttachedCount(0);
    };

    const handleClose = () => { resetModal(); onClose(); };

    if (!isOpen) return null;

    // ── RBAC guard ──
    if (!can('site.bulk_update')) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl max-w-md p-8 text-center">
                    <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
                    <p className="text-slate-500 text-sm mb-6">Anda tidak memiliki izin untuk Bulk Update Stage.</p>
                    <button onClick={handleClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-medium">Tutup</button>
                </div>
            </div>
        );
    }

    // ── Step 1: Download Template ──
    const handleDownloadTemplate = () => {
        const scope: TemplateScope = { projectType: selectedType, stageFilters: selectedStages };
        generateBulkUpdateTemplate(scope);
    };

    const toggleStage = (stage: string) => {
        setSelectedStages(prev =>
            prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
        );
    };

    // ── Step 2: File handling ──
    const processFile = async (file: File) => {
        setUploadError(null);
        setIsParsingFile(true);
        try {
            const result = await parseBulkTemplate(file);
            if (!result.isValid) {
                setUploadError('format_unknown');
                setIsParsingFile(false);
                return;
            }
            setValidatedRows(result.rows);
            // Build transition groups for step 4
            setTransitionGroups(groupByTransition(result.rows));
            setPreviewTab('valid');
            setStep(3);
        } catch {
            setUploadError('parse_error');
        }
        setIsParsingFile(false);
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
    };
    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) processFile(e.target.files[0]);
    };

    // ── Step 4: Doc file management ──
    const addDocFiles = (transitionKey: string, files: FileList | null) => {
        if (!files) return;
        setDocUploads(prev => {
            const existing = prev.find(d => d.transitionKey === transitionKey);
            const newFiles = Array.from(files);
            if (existing) {
                return prev.map(d => d.transitionKey === transitionKey
                    ? { ...d, files: [...d.files, ...newFiles] }
                    : d
                );
            }
            return [...prev, { transitionKey, files: newFiles }];
        });
    };
    const removeDocFile = (transitionKey: string, fileIdx: number) => {
        setDocUploads(prev => prev.map(d =>
            d.transitionKey === transitionKey
                ? { ...d, files: d.files.filter((_, i) => i !== fileIdx) }
                : d
        ));
    };

    // ── Step 5: Execute ──
    const executeUpdates = (withDocs: boolean) => {
        setIsProcessing(true);
        setTimeout(() => {
            const valid = validatedRows.filter(r => r.status === 'valid').length;
            const skip = validatedRows.filter(r => r.status === 'skip').length;
            const errs = validatedRows.filter(r => r.status === 'error').length;
            setUpdatedCount(valid);
            setSkippedCount(skip);
            setErrorCount(errs);

            // Count docs
            if (withDocs) {
                const sitesWithDocs = transitionGroups
                    .filter(g => docUploads.some(d => d.transitionKey === `${g.fromStage}→${g.toStage}` && d.files.length > 0))
                    .reduce((sum, g) => sum + g.count, 0);
                setDocAttachedCount(sitesWithDocs);
            }

            setStep(5);
            setIsProcessing(false);
            if (onSuccess) onSuccess(valid);
        }, 800);
    };

    // ── Export report ──
    const exportReport = () => {
        const reportData = validatedRows.map(r => ({
            ...r.row,
            import_status: r.status,
            import_reason: r.reason || 'Sukses',
            changed_fields: r.changedFields?.join(', ') || '',
        }));
        const ws = xlsx.utils.json_to_sheet(reportData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Import_Result');
        delete (wb as any).Workbook;
        const fileName = `Bulk_Update_Result_${new Date().getTime()}.xlsx`;
        const wbOut = xlsx.write(wb, { bookType: 'xlsx', type: 'array', bookSST: false, compression: true });
        const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    };

    // ── Step indicator ──
    const STEPS = [
        { n: 1, label: 'Scope' },
        { n: 2, label: 'Upload' },
        { n: 3, label: 'Preview' },
        { n: 4, label: 'Dokumen' },
        { n: 5, label: 'Hasil' },
    ];

    // ── Filtered preview rows ──
    const filteredPreview = validatedRows.filter(r => r.status === previewTab);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden">
                {/* ── Header ── */}
                <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50/50 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Bulk Update Stage
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">Update stage untuk banyak site sekaligus dari Excel</p>
                    </div>
                    <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── Step Indicator ── */}
                <div className="px-6 pt-4 pb-3 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-1">
                        {STEPS.map((s, i) => (
                            <div key={s.n} className="flex items-center">
                                <div className={clsx(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                                    step === s.n
                                        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-200'
                                        : step > s.n
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-slate-100 text-slate-400'
                                )}>
                                    {step > s.n ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span>{s.n}</span>}
                                    <span className="hidden sm:inline">{s.label}</span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={clsx('w-6 h-px mx-1', step > s.n ? 'bg-emerald-300' : 'bg-slate-200')} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">

                    {/* ════ STEP 1: SCOPE & DOWNLOAD ════ */}
                    {step === 1 && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="text-center mb-2">
                                <FilterIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                <h3 className="text-lg font-bold text-slate-800">Pilih Scope Template</h3>
                                <p className="text-sm text-slate-500 mt-1">Filter site yang akan dimasukkan ke template Excel</p>
                            </div>

                            {/* Type Selector */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipe Pekerjaan</label>
                                <select
                                    value={selectedType}
                                    onChange={e => setSelectedType(e.target.value as ProjectType | 'ALL')}
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                >
                                    {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>

                            {/* Stage Multi-select */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stage Saat Ini</label>
                                    <button
                                        onClick={() => setSelectedStages([])}
                                        className="text-xs text-blue-600 hover:underline font-medium"
                                    >
                                        {selectedStages.length > 0 ? 'Reset' : 'Semua (default)'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {STAGE_ORDER.map(stage => (
                                        <button
                                            key={stage}
                                            onClick={() => toggleStage(stage)}
                                            className={clsx(
                                                'text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                                                selectedStages.includes(stage)
                                                    ? 'bg-blue-50 border-blue-300 text-blue-700 ring-1 ring-blue-200'
                                                    : selectedStages.length === 0
                                                        ? 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                                            )}
                                        >
                                            {selectedStages.includes(stage) && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                                            {STAGE_LABELS[stage] || stage}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preview Count */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                <p className="text-sm text-blue-800 font-medium">
                                    Template akan berisi <strong className="text-lg">{scopeCount}</strong> sites
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleDownloadTemplate}
                                    disabled={scopeCount === 0}
                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50"
                                >
                                    <Download className="w-5 h-5" /> Download Template
                                </button>
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white border-2 border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <Upload className="w-5 h-5" /> Upload Template yang Sudah Diisi
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ════ STEP 2: UPLOAD ════ */}
                    {step === 2 && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="text-center mb-2">
                                <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                <h3 className="text-lg font-bold text-slate-800">Upload Template yang Sudah Diisi</h3>
                                <p className="text-sm text-slate-500 mt-1">Drag & drop file .xlsx atau .xls</p>
                            </div>

                            {/* Drop Zone */}
                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
                                onDragLeave={e => { e.preventDefault(); setIsDragActive(false); }}
                                onDrop={handleFileDrop}
                                className={clsx(
                                    'border-2 border-dashed rounded-xl p-12 text-center transition-all bg-white cursor-pointer',
                                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                                )}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileInput} />
                                {isParsingFile ? (
                                    <div className="flex flex-col items-center">
                                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                                        <p className="text-sm font-medium text-slate-600">Membaca dan memvalidasi file...</p>
                                    </div>
                                ) : (
                                    <>
                                        <FileSpreadsheet className={clsx('w-12 h-12 mx-auto mb-4', isDragActive ? 'text-blue-500' : 'text-slate-300')} />
                                        <p className="text-base font-semibold text-slate-700 mb-1">Drag & drop file ke sini</p>
                                        <p className="text-sm text-slate-400 mb-5">Menerima format .xlsx dan .xls</p>
                                        <span className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors shadow-sm inline-block">
                                            Browse Files
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Unrecognized Format Warning */}
                            {uploadError === 'format_unknown' && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
                                    <div className="flex gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold text-amber-800 text-sm">Format file tidak dikenali</h4>
                                            <p className="text-sm text-amber-700 mt-1">
                                                File ini bukan template Bulk Update dari sistem. Pastikan Anda menggunakan template yang di-download dari langkah sebelumnya.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={() => { setUploadError(null); setStep(1); }}
                                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5 inline mr-1.5" /> Download Template Baru
                                        </button>
                                        <button
                                            disabled
                                            className="px-4 py-2 bg-slate-100 text-slate-400 text-sm font-semibold rounded-lg cursor-not-allowed border border-slate-200"
                                            title="Coming soon in Phase 1.5"
                                        >
                                            Column Mapper — Coming Soon
                                        </button>
                                    </div>
                                </div>
                            )}
                            {uploadError === 'parse_error' && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 text-sm text-red-700">
                                    <XCircle className="w-5 h-5 shrink-0 text-red-500" />
                                    <p>Gagal membaca file Excel. Pastikan format sesuai template dan file tidak rusak.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════ STEP 3: PREVIEW ════ */}
                    {step === 3 && (
                        <div className="space-y-4">
                            {/* Summary Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <Eye className="w-4 h-4" /> Analysis & Preview
                                </h3>
                                <div className="flex gap-4 text-xs font-bold">
                                    <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {validCount} siap diproses</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {skipCount} dilewati</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {errCount} error</span>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-slate-200">
                                {([
                                    { key: 'valid' as const, label: `✓ Akan Diupdate (${validCount})`, color: 'emerald' },
                                    { key: 'skip' as const, label: `⚠ Dilewati (${skipCount})`, color: 'amber' },
                                    { key: 'error' as const, label: `✗ Error (${errCount})`, color: 'red' },
                                ]).map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setPreviewTab(tab.key)}
                                        className={clsx(
                                            'px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
                                            previewTab === tab.key
                                                ? `border-${tab.color}-500 text-${tab.color}-700 bg-${tab.color}-50/50`
                                                : 'border-transparent text-slate-500 hover:text-slate-700'
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Table */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                                <div className="max-h-[38vh] overflow-auto custom-scrollbar">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide w-10">#</th>
                                                <th className="px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">Unique Key</th>
                                                <th className="px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">Site Name</th>
                                                {previewTab === 'valid' ? (
                                                    <>
                                                        <th className="px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">Stage Transition</th>
                                                        <th className="px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">Fields Changed</th>
                                                    </>
                                                ) : (
                                                    <th className="px-4 py-2.5 font-bold text-slate-600 text-xs uppercase tracking-wide">Alasan</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {filteredPreview.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="text-center py-10 text-slate-400 text-sm">
                                                        Tidak ada baris dalam kategori ini.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredPreview.map((r, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-4 py-2 text-slate-400 text-xs">{i + 1}</td>
                                                        <td className="px-4 py-2 font-mono text-slate-700 text-xs">{r.row.unique_key}</td>
                                                        <td className="px-4 py-2 text-slate-700 max-w-[180px] truncate" title={r.row.site_name}>{r.row.site_name}</td>
                                                        {previewTab === 'valid' ? (
                                                            <>
                                                                <td className="px-4 py-2">
                                                                    <span className="text-slate-500 text-xs">{r.row.curr_stage}</span>
                                                                    <span className="text-blue-500 mx-1.5 font-bold">→</span>
                                                                    <span className="text-blue-700 font-bold text-xs bg-blue-50 px-2 py-0.5 rounded">{r.row.new_stage}</span>
                                                                </td>
                                                                <td className="px-4 py-2 text-xs text-slate-500 max-w-[200px] truncate" title={r.changedFields?.join(', ')}>
                                                                    {r.changedFields?.length ? r.changedFields.join(', ') : <span className="text-slate-300">—</span>}
                                                                </td>
                                                            </>
                                                        ) : (
                                                            <td className="px-4 py-2 text-xs text-slate-600 max-w-xs">
                                                                <span className={clsx(
                                                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium',
                                                                    r.status === 'skip' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                                                                )}>
                                                                    {r.status === 'skip' ? <AlertTriangle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                                    {r.reason}
                                                                </span>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Warning: errors don't block */}
                            {errCount > 0 && validCount > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-sm text-amber-800">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                                    <p>Baris error tidak akan diproses. Hanya <strong>{validCount} baris valid</strong> yang akan diupdate.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════ STEP 4: DOCUMENT UPLOAD ════ */}
                    {step === 4 && (
                        <div className="space-y-5 max-w-3xl mx-auto">
                            <div className="text-center mb-2">
                                <Paperclip className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                <h3 className="text-lg font-bold text-slate-800">Upload Dokumen Pendukung</h3>
                                <p className="text-sm text-slate-500 mt-1">Lampirkan dokumen untuk update ini — akan ditautkan ke semua site yang diupdate</p>
                            </div>

                            {/* Transition Summary */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 font-medium">
                                Batch ini berisi: {transitionGroups.map((g, i) => (
                                    <span key={i}>
                                        {i > 0 && ', '}
                                        <strong>{g.count}</strong> → {g.label}
                                    </span>
                                ))}
                            </div>

                            {/* Per-group upload zones */}
                            {transitionGroups.map(group => {
                                const key = `${group.fromStage}→${group.toStage}`;
                                const uploads = docUploads.find(d => d.transitionKey === key);
                                return (
                                    <div key={key} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                        <div className="flex items-start gap-3 mb-3">
                                            <span className="text-2xl leading-none">{group.icon}</span>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm capitalize">
                                                    Dokumen untuk {group.label} ({group.count} sites)
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Contoh: {group.docExamples}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Uploaded files */}
                                        {uploads && uploads.files.length > 0 && (
                                            <div className="space-y-1.5 mb-3">
                                                {uploads.files.map((f, fi) => (
                                                    <div key={fi} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                                                        <span className="flex items-center gap-2 text-emerald-700 font-medium truncate">
                                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                                            {f.name}
                                                            <span className="text-emerald-500 text-xs">({(f.size / 1024).toFixed(0)} KB)</span>
                                                        </span>
                                                        <button onClick={() => removeDocFile(key, fi)} className="text-red-400 hover:text-red-600 text-xs font-bold ml-2">✕</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Upload button */}
                                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium cursor-pointer transition-colors border border-slate-200">
                                            <Upload className="w-4 h-4" /> Upload Dokumen
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx"
                                                onChange={e => addDocFiles(key, e.target.files)}
                                            />
                                        </label>
                                    </div>
                                );
                            })}

                            {/* Note */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500">
                                <strong>Catatan:</strong> Dokumen ini akan ditautkan ke <strong>SEMUA site</strong> dalam kelompok stage tersebut.
                                Untuk upload dokumen per-site, gunakan halaman detail site.
                            </div>
                        </div>
                    )}

                    {/* ════ STEP 5: RESULT ════ */}
                    {step === 5 && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5 ring-4 ring-emerald-50">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">Import Selesai!</h3>
                            <p className="text-slate-500 text-sm mb-6">Data stage site berhasil diperbarui.</p>

                            {/* Per-transition breakdown */}
                            <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm mb-6">
                                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                                    <span className="text-slate-600 flex items-center gap-2 font-medium"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Berhasil diupdate</span>
                                    <span className="font-bold text-emerald-700 text-lg">{updatedCount}</span>
                                </div>
                                {transitionGroups.map(g => (
                                    <div key={`${g.fromStage}→${g.toStage}`} className="flex justify-between items-center text-xs text-slate-500 pl-6">
                                        <span>→ {g.count} sites: {g.fromStage} → <strong className="text-slate-700">{g.toStage}</strong></span>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center text-sm pt-2">
                                    <span className="text-slate-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Dilewati</span>
                                    <span className="font-bold text-slate-700">{skippedCount}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /> Error</span>
                                    <span className="font-bold text-slate-700">{errorCount}</span>
                                </div>
                                {docAttachedCount > 0 && (
                                    <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100">
                                        <span className="text-slate-600 flex items-center gap-2"><Paperclip className="w-4 h-4 text-blue-500" /> Dokumen ditautkan</span>
                                        <span className="font-bold text-blue-700">{docAttachedCount} sites</span>
                                    </div>
                                )}
                            </div>

                            {/* Flag warning */}
                            <div className="w-full max-w-md bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 mb-6 flex gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                                <p><strong>{updatedCount} sites</strong> diupdate via bulk — flag <em>"dokumen individual belum dilampirkan"</em> akan muncul di detail site.</p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap justify-center gap-3">
                                <button onClick={exportReport} className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 font-medium rounded-lg border border-blue-200 text-sm transition-colors">
                                    <Download className="w-4 h-4" /> Download Laporan
                                </button>
                                <button onClick={handleClose} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg border border-slate-200 text-sm transition-colors">
                                    <Eye className="w-4 h-4" /> Lihat Sites yang Diupdate
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer Navigation ── */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
                    {/* Left: Back or Cancel */}
                    <div>
                        {step === 1 && (
                            <button onClick={handleClose} className="px-5 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 font-medium rounded-lg transition-colors text-sm">
                                Batal
                            </button>
                        )}
                        {(step === 2 || step === 3) && (
                            <button onClick={() => setStep((step - 1) as Step)} className="px-5 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 font-medium rounded-lg transition-colors text-sm flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4" /> Kembali
                            </button>
                        )}
                        {step === 4 && (
                            <button onClick={() => setStep(3)} className="px-5 py-2 text-slate-600 hover:bg-slate-200 bg-slate-100 font-medium rounded-lg transition-colors text-sm flex items-center gap-2">
                                <ArrowLeft className="w-4 h-4" /> Kembali
                            </button>
                        )}
                    </div>

                    {/* Right: Forward */}
                    <div className="flex gap-3">
                        {step === 3 && (
                            <button
                                onClick={() => setStep(4)}
                                disabled={validCount === 0 || isProcessing}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Memproses...' : `Proses ${validCount} Sites`} <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                        {step === 4 && (
                            <>
                                <button
                                    onClick={() => executeUpdates(false)}
                                    disabled={isProcessing}
                                    className="px-5 py-2 text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 font-medium rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    <SkipForward className="w-4 h-4" /> Skip, Proses Tanpa Dokumen
                                </button>
                                <button
                                    onClick={() => executeUpdates(true)}
                                    disabled={isProcessing || docUploads.every(d => d.files.length === 0)}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? 'Memproses...' : 'Proses + Upload Dokumen'} <ArrowRight className="w-4 h-4" />
                                </button>
                            </>
                        )}
                        {step === 5 && (
                            <button onClick={handleClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors text-sm shadow-sm">
                                Tutup
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
