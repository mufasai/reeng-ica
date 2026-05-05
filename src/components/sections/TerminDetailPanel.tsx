import { type TerminConfig, type RequirementField, type RequirementDocument } from '../../config/terminRequirements';
import { useAuth } from '../../context/AuthContext';
import { type TerminDocument } from '../../data/mockData';
import { 
    CheckCircle2, Circle, Upload, FileText,
    Lock, CheckSquare, Square, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { Tooltip } from '../common/Tooltip';
import clsx from 'clsx';

interface TerminDetailPanelProps {
    config: TerminConfig;
    formData: Record<string, any>;
    documents: TerminDocument[];
    isLocked: boolean;
    onSaveField: (fieldId: string, value: string | number) => void;
    onUploadDocument: (docId: string, fileData: { name: string, url: string }) => void; // Simulated upload
    onSubmit: () => void;
    
    // External Validation flags
    isSkpReceived?: boolean; // For Filter 1
    disableSubmitMessage?: string;
}

const TerminDetailPanel = ({
    config, formData, documents, isLocked, 
    onSaveField, onUploadDocument, onSubmit,
    isSkpReceived, disableSubmitMessage
}: TerminDetailPanelProps) => {
    const { currentUser, can } = useAuth();
    if (!currentUser) return null;
    
    // --- Validation Logic ---
    const getFieldStatus = (field: RequirementField) => {
        if (!field.required) return true;
        const val = formData[field.id];
        return val !== undefined && val !== null && val !== '';
    };

    const getDocStatus = (doc: RequirementDocument) => {
        if (!doc.required) return true;

        if (doc.isAutoAttached) {
            if (doc.id === 'spk') return true; // Always true for mock
            if (doc.id === 'bukti_skp' && isSkpReceived) return true; 
            return false;
        }

        const uploaded = documents.filter(d => d.typeId === doc.id);
        if (doc.minCount && doc.minCount > 1) {
            return uploaded.length >= doc.minCount;
        }
        return uploaded.length > 0;
    };

    const engineerDocs = config.documents.filter(d => d.role === 'engineer');
    const tlDocs = config.documents.filter(d => d.role === 'team_leader');
    const tlFields = config.fields.filter(f => f.role === 'team_leader');
    const engineerFields = config.fields.filter(f => f.role === 'engineer');

    const isEngComplete = engineerDocs.every(getDocStatus) && engineerFields.every(getFieldStatus);
    const isTlComplete = tlDocs.every(getDocStatus) && tlFields.every(getFieldStatus);
    
    const canSubmit = isEngComplete && isTlComplete && !isLocked;

    // --- Mock Handlers ---
    const handleFileChange = (doc: RequirementDocument, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            onUploadDocument(doc.id, {
                name: file.name,
                url: URL.createObjectURL(file), // Mock URL
            });
        }
    };

    return (
        <div className="bg-slate-50 border-t border-slate-200">
            {/* Warning Banner for Specific Rules */}
            {config.requiresBAST && !getDocStatus(config.documents.find(d => d.id === 'dokumen_bast')!) && (
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 flex items-center gap-2 text-sm text-amber-700">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <strong>Perhatian:</strong> Dokumen BAST belum diupload. Management tidak dapat melakukan Approval tanpa BAST.
                </div>
            )}
            
            {config.requiresSKP && !isSkpReceived && (
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 flex items-center gap-2 text-sm text-amber-700">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <strong>Perhatian:</strong> SKP belum diterima. Modul Termin 1 terkunci.
                </div>
            )}

            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT: Forms */}
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-800 mb-4 border-b pb-2">Form Data</h4>
                        <div className="space-y-4">
                            {config.fields.map(field => {
                                const isDisabled = isLocked || (field.role !== currentUser?.role && !can('manage_data') && !can('manage_finances'));
                                return (
                                    <div key={field.id} className="relative">
                                        <label className="block text-xs font-medium text-slate-700 mb-1 flex justify-between">
                                            <span>{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                                            {field.role === 'engineer' ? <span className="text-[10px] text-blue-500 uppercase">Eng</span> : <span className="text-[10px] text-emerald-500 uppercase">TL</span>}
                                        </label>
                                        
                                        {field.type === 'textarea' ? (
                                            <textarea 
                                                value={formData[field.id] || ''}
                                                onChange={e => onSaveField(field.id, e.target.value)}
                                                disabled={isDisabled}
                                                className="w-full text-sm px-3 py-2 border border-slate-300 rounded focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                                rows={2}
                                            />
                                        ) : field.type === 'select' ? (
                                            <select
                                                value={formData[field.id] || ''}
                                                onChange={e => onSaveField(field.id, e.target.value)}
                                                disabled={isDisabled}
                                                className="w-full text-sm px-3 py-2 border border-slate-300 rounded focus:border-blue-500 disabled:bg-slate-100"
                                            >
                                                <option value="">Pilih...</option>
                                                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : (
                                            <input 
                                                type={field.type === 'currency' ? 'number' : field.type}
                                                value={formData[field.id] || ''}
                                                onChange={e => onSaveField(field.id, e.target.value)}
                                                disabled={isDisabled}
                                                placeholder={field.type === 'currency' ? 'Rp ...' : ''}
                                                className="w-full text-sm px-3 py-2 border border-slate-300 rounded focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                            />
                                        )}
                                        {field.description && <p className="text-[10px] text-slate-500 mt-1">{field.description}</p>}
                                    </div>
                                );
                            })}
                            {config.fields.length === 0 && <p className="text-sm text-slate-500 italic">No form fields required.</p>}
                        </div>
                    </div>

                    {/* Checklists Widget */}
                    <div className="bg-white border rounded p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-slate-800 mb-2">Completion Checklist</h4>
                        <div className="space-y-4">
                            {/* Engineer Checklist */}
                            {(engineerDocs.length > 0 || engineerFields.length > 0) && (
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-blue-800 bg-blue-50 p-1 px-2 rounded">Tugas Engineer</p>
                                    {engineerDocs.map(doc => (
                                        <div key={doc.id} className="flex items-start gap-2 text-xs text-slate-600">
                                            {getDocStatus(doc) ? <CheckSquare className="w-3.5 h-3.5 text-blue-500 mt-0.5" /> : <Square className="w-3.5 h-3.5 text-slate-300 mt-0.5" />}
                                            <span className={getDocStatus(doc) ? 'line-through text-slate-400' : ''}>
                                                Upload {doc.label} {doc.minCount ? `(Min ${doc.minCount})` : ''}
                                            </span>
                                        </div>
                                    ))}
                                    {engineerFields.map(f => (
                                        <div key={f.id} className="flex items-start gap-2 text-xs text-slate-600">
                                            {getFieldStatus(f) ? <CheckSquare className="w-3.5 h-3.5 text-blue-500 mt-0.5" /> : <Square className="w-3.5 h-3.5 text-slate-300 mt-0.5" />}
                                            <span className={getFieldStatus(f) ? 'line-through text-slate-400' : ''}>Isi {f.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* TL Checklist */}
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-1 px-2 rounded">Tugas Team Leader</p>
                                {tlFields.map(f => (
                                    <div key={f.id} className="flex items-start gap-2 text-xs text-slate-600">
                                        {getFieldStatus(f) ? <CheckSquare className="w-3.5 h-3.5 text-emerald-500 mt-0.5" /> : <Square className="w-3.5 h-3.5 text-slate-300 mt-0.5" />}
                                        <span className={getFieldStatus(f) ? 'line-through text-slate-400' : ''}>Isi {f.label}</span>
                                    </div>
                                ))}
                                {tlDocs.map(doc => (
                                    <div key={doc.id} className="flex items-start gap-2 text-xs text-slate-600">
                                        {getDocStatus(doc) ? <CheckSquare className="w-3.5 h-3.5 text-emerald-500 mt-0.5" /> : <Square className="w-3.5 h-3.5 text-slate-300 mt-0.5" />}
                                        <span className={getDocStatus(doc) ? 'line-through text-slate-400' : ''}>Upload {doc.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Document Table */}
                <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-800 border-b pb-2">Dokumen Pendukung</h4>
                    <div className="bg-white border text-sm rounded-lg overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Nama Dokumen</th>
                                    <th className="px-4 py-3 font-medium">Role</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {config.documents.map(doc => {
                                    const uploadedCount = documents.filter(d => d.typeId === doc.id).length;
                                    const isComplete = getDocStatus(doc);
                                    const isEng = doc.role === 'engineer';
                                    const canUpload = !isLocked && (can('manage_data') || (isEng && currentUser?.role === 'engineer') || (!isEng && currentUser?.role === 'team_leader'));

                                    return (
                                        <tr key={doc.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-700 flex items-center gap-1.5">
                                                    {doc.type === 'excel' ? <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500"/> : <FileText className="w-3.5 h-3.5 text-blue-500"/>}
                                                    {doc.label}
                                                    {doc.required && <span className="text-red-500">*</span>}
                                                </div>
                                                {doc.description && <p className="text-[10px] text-slate-500 mt-0.5">{doc.description}</p>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide", 
                                                    isEng ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                )}>
                                                    {isEng ? 'Eng' : 'TL'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {doc.isAutoAttached ? (
                                                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        {isComplete ? 'Auto-attached' : 'Menunggu Sistem'}
                                                    </div>
                                                ) : isComplete ? (
                                                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        {doc.minCount ? `${uploadedCount}/${doc.minCount} Uploaded` : 'Uploaded'}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-amber-600 text-xs">
                                                        <Circle className="w-4 h-4" />
                                                        {doc.minCount ? `${uploadedCount}/${doc.minCount} Uploaded` : 'Belum Upload'}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {!doc.isAutoAttached && (
                                                    <div className="flex justify-end gap-2 text-xs">
                                                        {documents.filter(d => d.typeId === doc.id).map(d => (
                                                            <Tooltip key={d.id} content={`Uploaded by ${d.uploadedBy}`}>
                                                                <button className="text-blue-600 hover:text-blue-800 underline">View</button>
                                                            </Tooltip>
                                                        ))}
                                                        {canUpload && (
                                                            <div className="relative overflow-hidden group">
                                                                <button className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors border border-slate-200">
                                                                    <Upload className="w-3 h-3" />
                                                                    {uploadedCount > 0 ? (doc.minCount ? '+Add' : 'Ganti') : 'Upload'}
                                                                </button>
                                                                <input 
                                                                    type="file" 
                                                                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" 
                                                                    accept={doc.type === 'pdf' ? '.pdf' : doc.type === 'excel' ? '.xlsx,.xls,.csv' : doc.type === 'image' ? 'image/*' : '*'}
                                                                    onChange={(e) => handleFileChange(doc, e)}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 sm:px-6 bg-slate-100/50 border-t border-slate-200 flex items-center justify-between mt-4">
                <div className="text-sm text-slate-500">
                    Otomatis tersimpan ({Object.keys(formData).length} fields, {documents.length} docs).
                </div>
                {can('submit_request') && (
                    <Tooltip content={canSubmit ? '' : (disableSubmitMessage || 'Lengkapi checklist Engineer & TL terlebih dahulu')}>
                        <span className="inline-block"> {/* Span wrapper needed for Tooltip on disabled button */}
                            <button
                                onClick={onSubmit}
                                disabled={!canSubmit}
                                className={clsx(
                                    "flex items-center gap-2 px-5 py-2 rounded font-medium shadow-sm transition-colors duration-200",
                                    canSubmit ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                {!canSubmit && <Lock className="w-4 h-4" />}
                                Submit Pengajuan
                            </button>
                        </span>
                    </Tooltip>
                )}
            </div>
        </div>
    );
};

export default TerminDetailPanel;
