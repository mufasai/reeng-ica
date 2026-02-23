import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, File, AlertCircle, CheckCircle2, Download, Sheet } from 'lucide-react';
import clsx from 'clsx';


interface ExcelUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (data: any[]) => void; // Returns valid rows
    title: string;
    templateUrl: string;
    templateName: string;
    mockParseFn: (file: File) => Promise<{ valid: any[], invalid: any[], preview: any[] }>;
}

const ExcelUploadModal = ({ isOpen, onClose, onUpload, title, templateUrl, templateName, mockParseFn }: ExcelUploadModalProps) => {
    const [activeTab, setActiveTab] = useState<'single' | 'excel'>('single');
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
    
    // Preview Data
    const [validRows, setValidRows] = useState<any[]>([]);
    const [invalidRows, setInvalidRows] = useState<any[]>([]);
    const [previewRows, setPreviewRows] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleProcess = async () => {
        if (!file) return;
        setIsLoading(true);
        
        // Simulate network delay
        setTimeout(async () => {
            try {
                const result = await mockParseFn(file);
                setValidRows(result.valid);
                setInvalidRows(result.invalid);
                setPreviewRows(result.preview);
                setStep('preview');
            } catch (error) {
                console.error("Parse error", error);
                alert("Failed to parse file");
            } finally {
                setIsLoading(false);
            }
        }, 1500);
    };

    const handleConfirm = () => {
        onUpload(validRows);
        setStep('success');
        setTimeout(() => {
            onClose();
            // Reset state
            setStep('upload');
            setFile(null);
            setValidRows([]);
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                {step === 'upload' && (
                    <div className="flex border-b border-slate-200">
                        <button
                            onClick={() => setActiveTab('single')}
                            className={clsx(
                                "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                                activeTab === 'single' ? "border-blue-500 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <File className="w-4 h-4" /> Upload Single File
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('excel')}
                            className={clsx(
                                "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
                                activeTab === 'excel' ? "border-emerald-500 text-emerald-600 bg-emerald-50/50" : "border-transparent text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <FileSpreadsheet className="w-4 h-4" /> Upload Excel (Bulk)
                            </span>
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-6">
                    {step === 'upload' && (
                        <>
                            {activeTab === 'single' ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <p className="text-slate-600 mb-2">Upload a single document (PDF, JPG, DOCX)</p>
                                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm">
                                        Select File
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Template Download */}
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center">
                                        <div>
                                            <h4 className="font-semibold text-slate-800 text-sm">Download Template</h4>
                                            <p className="text-xs text-slate-500">Use this template to format your data correctly.</p>
                                        </div>
                                        <a href={templateUrl} className="flex items-center gap-2 text-sm text-emerald-600 font-medium hover:underline">
                                            <Download className="w-4 h-4" /> {templateName}
                                        </a>
                                    </div>

                                    {/* Dropzone */}
                                    <div 
                                        className={clsx(
                                            "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                                            isDragging ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-emerald-400 hover:bg-slate-50"
                                        )}
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            accept=".xlsx, .csv" 
                                            onChange={handleFileChange}
                                        />
                                        
                                        {file ? (
                                            <div className="flex flex-col items-center">
                                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                                    <FileSpreadsheet className="w-6 h-6" />
                                                </div>
                                                <p className="font-medium text-slate-800">{file.name}</p>
                                                <p className="text-xs text-slate-500 mb-4">{(file.size / 1024).toFixed(2)} KB</p>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                                    className="text-xs text-red-500 hover:underline"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-slate-500">
                                                <Upload className="w-10 h-10 mb-3 text-slate-300" />
                                                <p className="font-medium">Click to upload or drag & drop</p>
                                                <p className="text-xs mt-1">Excel (.xlsx) or CSV (.csv)</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button 
                                            onClick={handleProcess}
                                            disabled={!file || isLoading}
                                            className={clsx(
                                                "px-6 py-2 rounded font-medium flex items-center gap-2",
                                                !file ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                                            )}
                                        >
                                            {isLoading ? (
                                                <>Processing...</>
                                            ) : (
                                                <>Process File <Sheet className="w-4 h-4" /></>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {step === 'preview' && (
                         <div className="space-y-4">
                            <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                    <CheckCircle2 className="w-4 h-4" /> {validRows.length} Valid
                                </span>
                                {invalidRows.length > 0 && (
                                    <span className="flex items-center gap-1.5 text-red-600 font-medium">
                                        <AlertCircle className="w-4 h-4" /> {invalidRows.length} Errors
                                    </span>
                                )}
                            </div>

                            <div className="max-h-[300px] overflow-auto border border-slate-200 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-700">
                                        <tr>
                                            {previewRows.length > 0 && Object.keys(previewRows[0]).filter(k => k !== 'errors' && k !== 'isValid').map(key => (
                                                <th key={key} className="px-4 py-2 capitalize">{key.replace('_', ' ')}</th>
                                            ))}
                                            <th className="px-4 py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {previewRows.map((row, idx) => (
                                            <tr key={idx} className={row.isValid ? "bg-white" : "bg-red-50"}>
                                                {Object.keys(row).filter(k => k !== 'errors' && k !== 'isValid').map(key => (
                                                    <td key={key} className="px-4 py-2 text-slate-600">{row[key]}</td>
                                                ))}
                                                <td className="px-4 py-2">
                                                    {row.isValid ? (
                                                        <span className="text-emerald-600 text-xs font-semibold">OK</span>
                                                    ) : (
                                                        <span className="text-red-500 text-xs font-semibold">{row.errors}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <button 
                                    onClick={() => setStep('upload')}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleConfirm}
                                    disabled={validRows.length === 0}
                                    className={clsx(
                                        "px-4 py-2 rounded text-sm font-medium text-white shadow-sm transition-colors",
                                        validRows.length === 0 ? "bg-slate-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                                    )}
                                >
                                    Import {validRows.length} Rows
                                </button>
                            </div>
                         </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Import Successful!</h3>
                            <p className="text-slate-600">Successfully imported {validRows.length} records.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExcelUploadModal;
