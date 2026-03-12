import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, AlertCircle } from 'lucide-react';
import { type SiteFile } from '../../data/mockData';

const TAG_OPTIONS = ['Permit', 'PKS', 'BAST', 'Invoice', 'Lainnya'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_FILES = 10;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];

export interface QueuedFile {
    file: File;
    id: string;
    tag: string;
    duplicateAction?: 'replace' | 'keep' | 'remove';
    isDuplicate: boolean;
}

interface MultiFileUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingFiles: SiteFile[];
    onSubmit: (files: QueuedFile[]) => void;
}

const MultiFileUploadModal: React.FC<MultiFileUploadModalProps> = ({ isOpen, onClose, existingFiles, onSubmit }) => {
    const [queue, setQueue] = useState<QueuedFile[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFiles = (files: FileList | File[]) => {
        const newQueue = [...queue];
        const existingNames = existingFiles.map(f => f.filename);

        Array.from(files).forEach(file => {
            if (newQueue.length >= MAX_FILES) {
                alert(`Maksimal ${MAX_FILES} file yang dapat diunggah sekaligus.`);
                return;
            }
            if (!ALLOWED_TYPES.includes(file.type)) {
                alert(`Format file ${file.name} tidak didukung.`);
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                alert(`Ukuran file ${file.name} melebihi batas 20MB.`);
                return;
            }

            const isDuplicate = existingNames.includes(file.name);
            
            // Avoid adding double to queue organically
            if (!newQueue.some(q => q.file.name === file.name)) {
                newQueue.push({
                    file,
                    id: Math.random().toString(36).substr(2, 9),
                    tag: 'Lainnya',
                    isDuplicate,
                    duplicateAction: isDuplicate ? 'replace' : undefined
                });
            }
        });

        setQueue(newQueue);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
        // reset input
        if (inputRef.current) inputRef.current.value = '';
    };

    const updateFileTag = (id: string, tag: string) => {
        setQueue(queue.map(q => q.id === id ? { ...q, tag } : q));
    };

    const updateDuplicateAction = (id: string, action: 'replace' | 'keep' | 'remove') => {
        setQueue(queue.map(q => q.id === id ? { ...q, duplicateAction: action } : q));
    };

    const removeFile = (id: string) => {
        setQueue(queue.filter(q => q.id !== id));
    };

    const handleSubmit = () => {
        // filter out files the user explicitly marks as removed
        const finalQueue = queue.filter(q => !q.isDuplicate || q.duplicateAction !== 'remove');
        onSubmit(finalQueue);
        setQueue([]); // clear queue after submit
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 leading-tight">Upload Dokumen</h2>
                        <p className="text-sm text-slate-500">Pilih hingga {MAX_FILES} file (Maks 20MB per file).</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6">
                    {/* DROPZONE */}
                    <div 
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-colors
                            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}
                        `}
                        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                        onDrop={handleDrop}
                    >
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 mb-4 text-blue-500">
                            <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-base font-medium text-slate-700 mb-1">Tarik & Lepas file ke sini</p>
                        <p className="text-sm text-slate-500 mb-4">Mendukung: PDF, JPG, PNG, Excel</p>
                        <button 
                            className="px-4 py-2 bg-white border border-slate-300 rounded font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors shadow-sm"
                            onClick={() => inputRef.current?.click()}
                        >
                            Pilih File dari Komputer
                        </button>
                        <input 
                            ref={inputRef} 
                            type="file" 
                            multiple 
                            className="hidden" 
                            accept={ALLOWED_TYPES.join(',')}
                            onChange={handleChange}
                        />
                    </div>

                    {/* QUEUE LIST */}
                    {queue.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-800 flex items-center justify-between">
                                <span>File Terpilih ({queue.length})</span>
                            </h3>
                            <div className="space-y-3">
                                {queue.map((q) => (
                                    <div key={q.id} className={`p-4 rounded-lg border flex flex-col gap-3 ${q.isDuplicate ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white shadow-sm'}`}>
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 shrink-0 bg-blue-50 text-blue-600 rounded flex items-center justify-center border border-blue-100">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-semibold text-slate-700 truncate" title={q.file.name}>{q.file.name}</p>
                                                    <p className="text-xs text-slate-500">{(q.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                </div>
                                            </div>
                                            <button onClick={() => removeFile(q.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
                                            <div className="flex-1">
                                                <label className="text-xs font-medium text-slate-600 mb-1 block">Kategori / Tag</label>
                                                <select 
                                                    value={q.tag} 
                                                    onChange={(e) => updateFileTag(q.id, e.target.value)}
                                                    className="w-full border-slate-300 rounded-md text-sm bg-white"
                                                >
                                                    {TAG_OPTIONS.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {q.isDuplicate && (
                                                <div className="flex-[2]">
                                                    <label className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                                                        <AlertCircle className="w-3.5 h-3.5" /> 
                                                        File ini sudah ada di sistem. Apa yang ingin dilakukan?
                                                    </label>
                                                    <div className="flex items-center gap-3 mt-1.5">
                                                        <label className="flex items-center gap-1.5 text-sm cursor-pointer border px-2.5 py-1.5 rounded bg-white hover:bg-slate-50 transition-colors">
                                                            <input 
                                                                type="radio" 
                                                                checked={q.duplicateAction === 'replace'} 
                                                                onChange={() => updateDuplicateAction(q.id, 'replace')} 
                                                                className="text-amber-600 focus:ring-amber-500" 
                                                            />
                                                            Replace
                                                        </label>
                                                        <label className="flex items-center gap-1.5 text-sm cursor-pointer border px-2.5 py-1.5 rounded bg-white hover:bg-slate-50 transition-colors">
                                                            <input 
                                                                type="radio" 
                                                                checked={q.duplicateAction === 'keep'} 
                                                                onChange={() => updateDuplicateAction(q.id, 'keep')} 
                                                                className="text-amber-600 focus:ring-amber-500" 
                                                            />
                                                            Keep Both
                                                        </label>
                                                        <label className="flex items-center gap-1.5 text-sm cursor-pointer border px-2.5 py-1.5 rounded bg-white hover:bg-red-50 transition-colors">
                                                            <input 
                                                                type="radio" 
                                                                checked={q.duplicateAction === 'remove'} 
                                                                onChange={() => updateDuplicateAction(q.id, 'remove')} 
                                                                className="text-red-500 focus:ring-red-400" 
                                                            />
                                                            Remove
                                                        </label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded transition-colors">
                        Batal
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={queue.length === 0}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded shadow-sm transition-colors flex items-center gap-2"
                    >
                        <UploadCloud className="w-4 h-4" />
                        Unggah {queue.length > 0 && queue.length} File
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MultiFileUploadModal;
