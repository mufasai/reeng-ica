import { useState, useMemo } from 'react';
import { X, Upload, CheckCircle2, AlertTriangle, ChevronRight, File, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { STAGE_ORDER } from '../../data/mockData';

interface UpdateStageModalProps {
    isOpen: boolean;
    onClose: () => void;
    siteId: string;
    siteName?: string;
    currentStage: string;
    onUpdateStage: (newStage: string, notes?: string, payload?: Record<string, unknown>) => void;
}

// Map stage names to their display labels (optional fallback)
const STAGE_LABELS: Record<string, string> = {
    'imported': 'Imported',
    'assigned': 'Assigned',
    'permit_process': 'Permit Diproses',
    'permit_ready': 'Permit Ready',
    'akses_process': 'Akses Diproses',
    'akses_ready': 'Akses Ready',
    'implementasi': 'Implementasi',
    'rfi_done': 'RFI Selesai',
    'rfs_done': 'RFS Selesai',
    'dokumen_done': 'Dokumen Submitted',
    'bast': 'BAST',
    'invoice': 'Invoice',
    'completed': 'Selesai'
};

interface TransitionConfig {
    nextLabel: string;
    helper: string;
    fields: string[];
    requiredFields: string[];
    fileLabel?: string;
    paymentNote: string | null;
}

const STAGE_TRANSITION_CONFIG: Record<string, TransitionConfig> = {
    'imported→assigned': {
        nextLabel: 'Assigned',
        helper: 'Tugaskan tim yang akan mengerjakan site ini.',
        fields: ['team_select'],
        requiredFields: ['team_id'],
        paymentNote: null
    },
    'assigned→permit_process': {
        nextLabel: 'Permit Diproses',
        helper: 'Catat tanggal pengajuan permit ke TPAS.',
        fields: ['permit_create_date'],
        requiredFields: ['permit_create_date'],
        paymentNote: null
    },
    'permit_process→permit_ready': {
        nextLabel: 'Permit Ready',
        helper: 'Konfirmasi semua approval sudah didapat dan upload dokumen permit.',
        fields: ['approval_chain', 'permit_start_date', 'permit_expiry_date', 'file_upload'],
        requiredFields: ['tpas_approved', 'tp_approved', 'files'],
        fileLabel: 'Upload Dokumen TPAS',
        paymentNote: null
    },
    'permit_ready→akses_process': {
        nextLabel: 'Akses Diproses',
        helper: 'Isi informasi akses tower untuk tim lapangan.',
        fields: ['tower_provider', 'jenis_kunci', 'pic_nama', 'pic_telp'],
        requiredFields: ['tower_provider', 'jenis_kunci'],
        paymentNote: null
    },
    'akses_process→akses_ready': {
        nextLabel: 'Akses Ready',
        helper: 'Konfirmasi akses ke tower sudah bisa dilakukan.',
        fields: ['konfirmasi_akses', 'file_upload'],
        requiredFields: ['konfirmasi_akses'], // file optional
        fileLabel: 'Foto kondisi site / bukti akses',
        paymentNote: null
    },
    'akses_ready→implementasi': {
        nextLabel: 'Implementasi',
        helper: 'Catat jadwal dan mulai tracking pekerjaan di lapangan.',
        fields: ['tgl_rencana_impl', 'tgl_aktual_mulai', 'ci_tim'],
        requiredFields: ['tgl_rencana_impl'],
        paymentNote: null
    },
    'implementasi→rfi_done': {
        nextLabel: 'RFI Selesai',
        helper: 'Radio Frequency Inspection selesai dilakukan.',
        fields: ['co_tim', 'konfirmasi_rfi', 'file_upload'],
        requiredFields: ['co_tim', 'konfirmasi_rfi'],
        fileLabel: 'Foto CI/CO, laporan RFI',
        paymentNote: '💰 Setelah stage ini: T2a (30% dari Termin 2) akan dapat diajukan.'
    },
    'rfi_done→rfs_done': {
        nextLabel: 'RFS Selesai',
        helper: 'Site sudah Ready For Service.',
        fields: ['konfirmasi_rfs', 'file_upload'],
        requiredFields: ['konfirmasi_rfs', 'files'],
        fileLabel: 'Laporan RFS / foto instalasi selesai',
        paymentNote: '💰 Setelah stage ini: T2b (50% dari Termin 2) akan dapat diajukan.'
    },
    'rfs_done→dokumen_done': {
        nextLabel: 'Dokumen Submitted',
        helper: 'Semua dokumen pekerjaan sudah diserahkan.',
        fields: ['konfirmasi_dok', 'file_upload'],
        requiredFields: ['konfirmasi_dok', 'files'],
        fileLabel: 'As-built, laporan instalasi, atau dokumen lainnya',
        paymentNote: '💰 Setelah stage ini: T2c (20% dari Termin 2) akan dapat diajukan.'
    },
    'dokumen_done→bast': {
        nextLabel: 'BAST',
        helper: 'Berita Acara Serah Terima pekerjaan.',
        fields: ['file_upload', 'tgl_bast'],
        requiredFields: ['files', 'tgl_bast'],
        fileLabel: 'Upload BAST yang sudah ditandatangani',
        paymentNote: '💰 Setelah stage ini: T3 (10% dari total) akan dapat diajukan.'
    },
    'bast→invoice': {
        nextLabel: 'Invoice',
        helper: 'Invoice sudah dikirim ke TI untuk pembayaran final.',
        fields: ['no_invoice', 'tgl_invoice', 'file_upload'],
        requiredFields: ['no_invoice', 'tgl_invoice', 'files'],
        fileLabel: 'Upload Invoice',
        paymentNote: '💰 Setelah stage ini: T4 (10% dari total) akan dapat diajukan.'
    },
    'invoice→completed': {
        nextLabel: 'Selesai',
        helper: 'Konfirmasi semua pekerjaan dan pembayaran sudah selesai.',
        fields: ['konfirmasi_final'],
        requiredFields: ['konfirmasi_final'],
        paymentNote: null
    }
};

export default function UpdateStageModal({ isOpen, onClose, siteId, siteName = 'Site Name Placeholder', currentStage, onUpdateStage }: UpdateStageModalProps) {
    const nextLogicalStageId = useMemo(() => {
        const currentIndex = STAGE_ORDER.indexOf(currentStage);
        if (currentIndex === -1 || currentIndex === STAGE_ORDER.length - 1) return null;
        return STAGE_ORDER[currentIndex + 1];
    }, [currentStage]);

    const transitionKey = `${currentStage}→${nextLogicalStageId}`;
    const config = STAGE_TRANSITION_CONFIG[transitionKey];

    // Form State
    const [notes, setNotes] = useState('');
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [issueNotes, setIssueNotes] = useState('');
    const [issueAction, setIssueAction] = useState('hold'); // hold, escalate
    
    // Dynamic Fields State
    const [formData, setFormData] = useState<Record<string, string | boolean>>({
        permit_create_date: new Date().toISOString().split('T')[0] // default today
    });
    
    // Files State
    const [files, setFiles] = useState<File[]>([]);
    const [isDragActive, setIsDragActive] = useState(false);

    if (!isOpen) return null;

    const handleFormChange = (key: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const newFiles = Array.from(e.dataTransfer.files);
            setFiles(prev => [...prev, ...newFiles].slice(0, 10)); // max 10
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles].slice(0, 10)); // max 10
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Validation
    const hasOversizedFiles = files.some(f => f.size > 20 * 1024 * 1024);
    
    const isMainFormValid = () => {
        if (!config) return false;
        if (hasOversizedFiles) return false;
        
        for (const req of config.requiredFields) {
            if (req === 'files') {
                if (files.length === 0) return false;
            } else if (req === 'tpas_approved' || req === 'tp_approved' || req.startsWith('konfirmasi_')) {
                if (!formData[req]) return false;
            } else {
                if (!formData[req] || formData[req] === '') return false;
            }
        }
        return true;
    };

    const isIssueValid = () => {
        return issueNotes.trim().length > 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (showIssueForm) {
            if (!isIssueValid()) return;
            onUpdateStage('issue_hold', issueNotes, { issueAction });
        } else {
            if (!isMainFormValid()) return;
            onUpdateStage(nextLogicalStageId!, notes, { ...formData, files });
        }
    };

    // Render Field Helpers
    const renderField = (field: string) => {
        switch (field) {
            case 'team_select':
                return (
                    <div key={field} className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700">Tim <span className="text-red-500">*</span></label>
                        <select 
                            required 
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 text-sm"
                            value={formData.team_id || ''}
                            onChange={(e) => handleFormChange('team_id', e.target.value)}
                        >
                            <option value="">Pilih tim lapangan...</option>
                            <option value="t1">Alpha Team (Jakarta)</option>
                            <option value="t2">Beta Team (Bandung)</option>
                            <option value="t3">Gamma Team (Surabaya)</option>
                        </select>
                    </div>
                );
            case 'permit_create_date':
            case 'permit_start_date':
            case 'permit_expiry_date':
            case 'tgl_rencana_impl':
            case 'tgl_aktual_mulai':
            case 'tgl_bast':
            case 'tgl_invoice':
                const labelMap: Record<string, string> = {
                    'permit_create_date': 'Tanggal Buat Permit',
                    'permit_start_date': 'Tanggal Berlaku Permit TPAS',
                    'permit_expiry_date': 'Tanggal Berakhir Permit TPAS',
                    'tgl_rencana_impl': 'Tanggal Rencana Implementasi',
                    'tgl_aktual_mulai': 'Tanggal Aktual Mulai',
                    'tgl_bast': 'Tanggal BAST',
                    'tgl_invoice': 'Tanggal Invoice'
                };
                const isReq = config?.requiredFields.includes(field);
                return (
                    <div key={field} className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700">
                            {labelMap[field]} {isReq && <span className="text-red-500">*</span>}
                        </label>
                        <input 
                            type="date" 
                            required={isReq}
                            value={formData[field] || ''}
                            onChange={(e) => handleFormChange(field, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 text-sm"
                        />
                    </div>
                );
            case 'ci_tim':
            case 'co_tim':
                const dtLabel = field === 'ci_tim' ? 'Jam Check-In (CI)' : 'Jam Check-Out (CO)';
                const r = config?.requiredFields.includes(field);
                return (
                    <div key={field} className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700">
                            {dtLabel} {r && <span className="text-red-500">*</span>}
                        </label>
                        <input 
                            type="datetime-local" 
                            required={r}
                            value={formData[field] || ''}
                            onChange={(e) => handleFormChange(field, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 text-sm"
                        />
                    </div>
                );
            case 'approval_chain':
                return (
                    <div key={field} className="space-y-3 bg-slate-50 p-3 border border-slate-200 rounded">
                        <label className="block text-sm font-semibold text-slate-700">Approval Chain <span className="text-red-500">*</span></label>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={formData.tpas_approved || false} onChange={e => handleFormChange('tpas_approved', e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                TPAS Approved *
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={formData.tp_approved || false} onChange={e => handleFormChange('tp_approved', e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                TP Approved *
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                <input type="checkbox" checked={formData.caf_approved || false} onChange={e => handleFormChange('caf_approved', e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                                CAF Approved <span className="text-slate-400 text-xs ml-1">(Jika TP sewa pihak lain)</span>
                            </label>
                        </div>
                    </div>
                );
            case 'tower_provider':
                return (
                    <div key={field} className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700">Tower Provider <span className="text-red-500">*</span></label>
                        <select 
                            required 
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 text-sm"
                            value={formData.tower_provider || ''}
                            onChange={(e) => handleFormChange('tower_provider', e.target.value)}
                        >
                            <option value="">Pilih provider...</option>
                            <option value="MITRATEL">MITRATEL</option>
                            <option value="STP">STP</option>
                            <option value="PTI">PTI</option>
                            <option value="DMT">DMT</option>
                            <option value="LAINNYA">Lainnya</option>
                        </select>
                    </div>
                );
            case 'jenis_kunci':
                return (
                    <div key={field} className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Jenis Kunci <span className="text-red-500">*</span></label>
                        <div className="flex gap-4">
                            {['PADLOCK', 'SMARTLOCK', 'QUADLOCK'].map(k => (
                                <label key={k} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="jenis_kunci" 
                                        value={k}
                                        checked={formData.jenis_kunci === k}
                                        onChange={(e) => handleFormChange('jenis_kunci', e.target.value)}
                                        className="text-blue-600 focus:ring-blue-500" 
                                    />
                                    {k}
                                </label>
                            ))}
                        </div>
                    </div>
                );
            case 'pic_nama':
            case 'pic_telp':
            case 'no_invoice':
                const textLabels: Record<string, string> = {
                    'pic_nama': 'PIC Akses — Nama',
                    'pic_telp': 'PIC Akses — No. Telp',
                    'no_invoice': 'Nomor Invoice'
                };
                const place: Record<string, string> = {
                    'pic_nama': 'Nama PIC dari Tower Provider',
                    'pic_telp': '08xx xxxx xxxx',
                    'no_invoice': 'INV-XXX'
                };
                const tt = field === 'pic_telp' ? 'tel' : 'text';
                const rtext = config?.requiredFields.includes(field);
                return (
                    <div key={field} className="space-y-1">
                        <label className="block text-sm font-medium text-slate-700">
                            {textLabels[field]} {rtext && <span className="text-red-500">*</span>}
                        </label>
                        <input 
                            type={tt} 
                            placeholder={place[field]}
                            required={rtext}
                            value={formData[field] || ''}
                            onChange={(e) => handleFormChange(field, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 text-sm"
                        />
                    </div>
                );
            case 'konfirmasi_akses':
            case 'konfirmasi_rfi':
            case 'konfirmasi_rfs':
            case 'konfirmasi_dok':
            case 'konfirmasi_final':
                const cLabels: Record<string, string> = {
                    'konfirmasi_akses': 'Akses ke site sudah READY EKSEKUSI',
                    'konfirmasi_rfi': 'RFI sudah selesai dilakukan',
                    'konfirmasi_rfs': 'Site sudah Ready For Service (RFS)',
                    'konfirmasi_dok': 'Semua dokumen pekerjaan sudah disubmit',
                    'konfirmasi_final': 'Semua termin sudah dibayar dan pekerjaan selesai'
                };
                return (
                    <div key={field} className="pt-2">
                        <label className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded cursor-pointer hover:bg-blue-100/50 transition-colors">
                            <input 
                                type="checkbox" 
                                required
                                checked={formData[field] || false}
                                onChange={(e) => handleFormChange(field, e.target.checked)}
                                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4" 
                            />
                            <span className="text-sm font-medium text-slate-800 tracking-tight leading-tight">
                                {cLabels[field]} <span className="text-red-500">*</span>
                            </span>
                        </label>
                    </div>
                );
            case 'file_upload':
                const fr = config?.requiredFields.includes('files');
                const totalSizes = files.reduce((acc, f) => acc + f.size, 0);
                const isOver50MB = totalSizes > 50 * 1024 * 1024;
                const over20MbFiles = files.filter(f => f.size > 20 * 1024 * 1024);

                return (
                    <div key={field} className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700">
                            {config.fileLabel || 'Lampiran / Dokumen'} {fr && <span className="text-red-500">*</span>}
                        </label>
                        
                        <div 
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={clsx(
                                "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                                isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400"
                            )}
                        >
                            <Upload className={clsx("w-8 h-8 mx-auto mb-3 transition-colors", isDragActive ? "text-blue-500" : "text-slate-400")} />
                            <p className="text-sm font-medium text-slate-700 mb-1">
                                📎 Drag & drop files ke sini
                            </p>
                            <p className="text-sm text-slate-500 mb-4">
                                atau <label className="text-blue-600 font-medium cursor-pointer hover:underline">
                                    Browse Files
                                    <input type="file" multiple className="hidden" accept="*/*" onChange={handleFileChange} />
                                </label>
                            </p>
                            <div className="text-xs text-slate-400 space-y-0.5">
                                <p>Semua format diterima • Max 20MB per file</p>
                                <p>Max 10 files per upload</p>
                            </div>
                        </div>

                        {files.length > 0 && (
                            <div className="space-y-2">
                                <div className="space-y-1.5">
                                    {files.map((f, i) => {
                                        const isImage = f.type.startsWith('image/');
                                        const isTooLarge = f.size > 20 * 1024 * 1024;
                                        return (
                                            <div key={i} className={clsx("flex items-center justify-between text-left p-2.5 bg-white border rounded shadow-sm group transition-colors", isTooLarge ? "border-red-300 bg-red-50" : "border-slate-200")}>
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {isImage ? (
                                                        <div className="w-8 h-8 rounded bg-slate-100 flex-shrink-0 flex items-center justify-center text-[10px] text-slate-400 overflow-hidden border border-slate-200">
                                                            {/* Placeholder for real thumbnail if URL.createObjectURL is used */}
                                                            IMG
                                                        </div>
                                                    ) : (
                                                        <File className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-medium text-slate-700" title={f.name}>{f.name}</div>
                                                        <div className={clsx("text-xs", isTooLarge ? "text-red-500 font-medium" : "text-slate-500")}>
                                                            {(f.size / (1024 * 1024)).toFixed(1)} MB {isTooLarge && ' (Melebihi 20MB)'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isImage && <button type="button" className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline px-2 py-1">Preview</button>}
                                                    <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 p-1.5 rounded transition-colors" title="Remove">
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs font-medium text-slate-600">
                                        {files.length} file{files.length > 1 ? 's' : ''} • {(totalSizes / (1024 * 1024)).toFixed(1)} MB total
                                    </span>
                                </div>
                                {isOver50MB && (
                                    <div className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" /> Upload besar, mungkin butuh waktu lebih lama
                                    </div>
                                )}
                            </div>
                        )}
                        {over20MbFiles.length > 0 && (
                             <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center gap-2">
                                 <XCircle className="w-4 h-4 shrink-0 text-red-500" /> Terdapat file melebihi 20MB
                             </div>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Update Stage — {siteId}</h2>
                        <p className="text-sm text-slate-500">{siteName}</p>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Form Body */}
                <div className="flex-1 overflow-y-auto">
                    <form id="update-stage-form" onSubmit={handleSubmit} className="p-5 space-y-6">
                        
                        {/* Progress Indicator */}
                        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="flex-1">
                                <span className="block text-xs font-medium text-slate-500 mb-0.5">Current Stage</span>
                                <span className="font-semibold text-slate-700">{STAGE_LABELS[currentStage] || currentStage}</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            <div className="flex-1">
                                <span className="block text-xs font-medium text-blue-500 mb-0.5">Move to</span>
                                {config ? (
                                    <span className="font-bold text-blue-700">{config.nextLabel}</span>
                                ) : (
                                    <span className="font-bold text-slate-400">Tidak ada next stage</span>
                                )}
                            </div>
                        </div>

                        {config ? (
                            <>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    {config.helper}
                                </p>

                                {/* Dynamic Fields Array */}
                                <div className="space-y-5">
                                    {config.fields.map((f: string) => renderField(f))}
                                </div>
                                
                                <div className="space-y-1 pt-2">
                                    <label className="block text-sm font-medium text-slate-700">Catatan Tambahan</label>
                                    <textarea 
                                        rows={2}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 text-sm placeholder:text-slate-400"
                                        placeholder="Opsional"
                                    />
                                </div>

                                {config.paymentNote && (
                                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded flex gap-2 items-start mt-4">
                                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                                        <span className="font-medium">{config.paymentNote}</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-4 bg-slate-50 text-slate-600 text-center rounded border border-slate-200">
                                Site sudah berada di stage paling akhir, atau transisi tidak valid.
                            </div>
                        )}

                        <hr className="border-slate-100 my-4" />

                        {/* Issue Form Accordion */}
                        <div className="space-y-3">
                            <button 
                                type="button" 
                                onClick={() => setShowIssueForm(!showIssueForm)}
                                className={clsx(
                                    "w-full flex items-center justify-between p-3 rounded text-sm font-medium transition-colors border",
                                    showIssueForm 
                                        ? "bg-red-50 text-red-700 border-red-200" 
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className={clsx("w-4 h-4", showIssueForm ? "text-red-500" : "text-amber-500")} />
                                    Laporkan Issue / Tahan Stage
                                </div>
                                <span>{showIssueForm ? 'Tutup' : 'Buka'}</span>
                            </button>

                            {showIssueForm && (
                                <div className="p-4 bg-red-50/50 border border-red-100 rounded space-y-4 animate-in slide-in-from-top-2 duration-200">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-800 mb-1">Keterangan Issue <span className="text-red-500">*</span></label>
                                        <textarea 
                                            required
                                            rows={3}
                                            value={issueNotes}
                                            onChange={(e) => setIssueNotes(e.target.value)}
                                            className="w-full px-3 py-2 border border-red-200 rounded focus:border-red-500 text-sm bg-white"
                                            placeholder="Jelaskan masalah yang ditemukan secara detail..."
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-800 mb-2">Tindakan</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={issueAction === 'hold'}
                                                    onChange={() => setIssueAction('hold')}
                                                    className="text-red-600 focus:ring-red-500 mt-0.5" 
                                                />
                                                Tahan di stage ini
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                                <input 
                                                    type="radio" 
                                                    checked={issueAction === 'escalate'}
                                                    onChange={() => setIssueAction('escalate')}
                                                    className="text-red-600 focus:ring-red-500 mt-0.5" 
                                                />
                                                Eskalasi ke management
                                            </label>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2">
                                        <label className="block text-sm text-blue-600 font-medium cursor-pointer hover:underline inline-flex items-center gap-1">
                                            <Upload className="w-3 h-3" /> Upload Bukti Issue (Opsional)
                                            <input type="file" className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                    </form>
                </div>
                
                {/* Footer Fixed */}
                <div className="px-5 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors text-sm">
                        Cancel
                    </button>
                    {showIssueForm ? (
                        <button 
                            type="submit" 
                            form="update-stage-form"
                            disabled={!isIssueValid()}
                            className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded transition-colors text-sm shadow-sm"
                        >
                            Laporkan Issue
                        </button>
                    ) : (
                        <button 
                            type="submit" 
                            form="update-stage-form"
                            disabled={!config || !isMainFormValid()}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded transition-colors text-sm shadow-sm flex items-center gap-2"
                        >
                            Update Stage <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
