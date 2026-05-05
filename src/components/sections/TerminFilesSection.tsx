import { useState } from 'react';
import { FileText, FileSpreadsheet, Upload, Download } from 'lucide-react';
import { type TerminDocument } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';
import { Tooltip } from '../common/Tooltip';

interface TerminFilesSectionProps {
    documents: TerminDocument[];
    onUploadFile: (file: File) => void;
    onUploadExcel: (file: File) => void;
    isLocked?: boolean;
}

export const TerminFilesSection = ({ documents, onUploadFile, onUploadExcel, isLocked }: TerminFilesSectionProps) => {
    const [activeTab, setActiveTab] = useState<'files' | 'excel'>('files');
    const { currentUser } = useAuth();
    if (!currentUser) return null;
    const canUpload = !isLocked && (currentUser?.role === 'team_leader' || currentUser?.role === 'engineer');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUploadFile(e.target.files[0]);
        }
    };

    const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUploadExcel(e.target.files[0]);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm mt-6">
            <div className="border-b border-slate-200 px-6 py-4 flex flex-wrap gap-4 items-center justify-between bg-slate-50 rounded-t-lg">
                <h3 className="font-bold text-slate-800 text-lg">Dokumen Pendukung Termin</h3>
                
                {canUpload && (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setActiveTab('files')}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
                                activeTab === 'files' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            <FileText className="w-4 h-4" />
                            File Tunggal
                        </button>
                        <button 
                            onClick={() => setActiveTab('excel')}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border",
                                activeTab === 'excel' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            Upload via Excel
                        </button>
                    </div>
                )}
            </div>

            <div className="p-6">
                {activeTab === 'excel' && canUpload ? (
                    <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-6 text-center">
                        <FileSpreadsheet className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                        <h4 className="text-emerald-800 font-semibold mb-2">Bulk Upload Dokumen Pendukung via Excel</h4>
                        <p className="text-sm text-emerald-600/80 mb-6 max-w-md mx-auto">
                            Gunakan format template yang disediakan untuk mengunggah banyak referensi dokumen sekaligus.
                        </p>
                        
                        <div className="flex justify-center gap-4">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-50 transition-colors shadow-sm font-medium text-sm">
                                <Download className="w-4 h-4" />
                                Download Template
                            </button>
                            
                            <div className="relative overflow-hidden group">
                                <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm">
                                    <Upload className="w-4 h-4" />
                                    Upload Data Excel
                                </button>
                                <input 
                                    type="file" 
                                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" 
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleExcelChange}
                                />
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-emerald-200/50 text-left">
                            <h5 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">Struktur Kolom Template:</h5>
                            <div className="bg-white rounded border border-emerald-100 p-3 flex gap-2 overflow-x-auto text-sm">
                                <div className="px-3 py-1.5 bg-slate-100 rounded text-slate-700 border border-slate-200 whitespace-nowrap"><span className="font-mono text-emerald-600 font-semibold mr-1">A</span> Nama_Dokumen</div>
                                <div className="px-3 py-1.5 bg-slate-100 rounded text-slate-700 border border-slate-200 whitespace-nowrap"><span className="font-mono text-emerald-600 font-semibold mr-1">B</span> Keterangan</div>
                                <div className="px-3 py-1.5 bg-slate-100 rounded text-slate-700 border border-slate-200 whitespace-nowrap"><span className="font-mono text-emerald-600 font-semibold mr-1">C</span> Tanggal_Dokumen</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        {canUpload && (
                            <div className="flex justify-end mb-4">
                                <div className="relative overflow-hidden group">
                                    <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors shadow-sm font-medium text-sm">
                                        <Upload className="w-4 h-4" />
                                        Upload File Tambahan
                                    </button>
                                    <input 
                                        type="file" 
                                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" 
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                                    <tr>
                                        <th className="px-4 py-3">Nama File</th>
                                        <th className="px-4 py-3">Tipe Data</th>
                                        <th className="px-4 py-3">Upload By</th>
                                        <th className="px-4 py-3">Tanggal</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {documents.length > 0 ? (
                                        documents.map(doc => (
                                            <tr key={doc.id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                                                        <FileText className="w-4 h-4 text-blue-500" />
                                                        {doc.name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wide">
                                                        {doc.typeId}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{doc.uploadedBy}</td>
                                                <td className="px-4 py-3 text-slate-500">{doc.uploadedAt}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <Tooltip content="Preview">
                                                        <button className="text-blue-600 hover:text-blue-800 underline text-xs font-medium mr-3">View</button>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                                Belum ada dokumen yang diunggah.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
