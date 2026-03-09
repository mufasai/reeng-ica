import React from 'react';
import { X, CheckCircle, MapPin, Edit3 } from 'lucide-react';
import clsx from 'clsx';

export interface ImportSummaryData {
    totalProcessed: number;
    newCreated: number;
    updated: number;
    coordsUpdated: number;
    nameUpdated: number;
    errors: number;
}

interface ImportSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    summary: ImportSummaryData | null;
}

const ImportSummaryModal: React.FC<ImportSummaryModalProps> = ({ isOpen, onClose, summary }) => {
    if (!isOpen || !summary) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50">
                    <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" /> 
                        Import Selesai
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 p-1 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 bg-white space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm font-medium text-slate-600">Total baris diproses</span>
                        <span className="font-bold text-slate-800">{summary.totalProcessed}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm font-medium text-slate-600">Records <span className="text-emerald-600 font-bold">BARU</span> dibuat</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{summary.newCreated}</span>
                    </div>

                    <div className="py-2 border-b border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-600">Records <span className="text-blue-600 font-bold">DIUPDATE</span> (merge)</span>
                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{summary.updated}</span>
                        </div>
                        {summary.updated > 0 && (
                            <div className="pl-4 space-y-2 mt-2 border-l-2 border-blue-100">
                                <div className="text-xs text-slate-600 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-500" /> Dapat koordinat baru</span>
                                    <span className="font-semibold text-slate-700">{summary.coordsUpdated}</span>
                                </div>
                                <div className="text-xs text-slate-600 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5"><Edit3 className="w-3.5 h-3.5 text-blue-500" /> <code>site_name</code> diupdate</span>
                                    <span className="font-semibold text-slate-700">{summary.nameUpdated}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-slate-600">Errors</span>
                        <span className={clsx("font-bold px-2 py-0.5 rounded", summary.errors > 0 ? "text-red-600 bg-red-50" : "text-slate-400")}>
                            {summary.errors}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
                    <button 
                        onClick={onClose}
                        className="w-full px-4 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                        Lihat Sites yang Diupdate &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportSummaryModal;
