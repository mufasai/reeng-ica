import React, { useState, useRef } from 'react';
import { X, Upload, Plus, FileSpreadsheet } from 'lucide-react';
import clsx from 'clsx';

interface ImportSiteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportExcel: () => void;
    onAddManual: () => void;
}

const ImportSiteModal: React.FC<ImportSiteModalProps> = ({ isOpen, onClose, onImportExcel, onAddManual }) => {
    const [activeTab, setActiveTab] = useState<'excel' | 'manual'>('excel');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Reset file when modal closes
    const handleClose = () => {
        setSelectedFile(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">Add Site</h2>
                    <button 
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-2 border-b border-slate-200 flex items-center gap-6 bg-slate-50 shrink-0">
                    <button 
                        onClick={() => setActiveTab('excel')}
                        className={clsx(
                            "py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
                            activeTab === 'excel' ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        )}
                    >
                        <Upload className="w-4 h-4" /> Upload BoQ Excel
                    </button>
                    <button 
                        onClick={() => setActiveTab('manual')}
                        className={clsx(
                            "py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2",
                            activeTab === 'manual' ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        )}
                    >
                        <Plus className="w-4 h-4" /> Add Manual
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto bg-white flex-1 custom-scrollbar">
                    {activeTab === 'excel' && (
                        <div className="space-y-6">
                            <p className="text-sm text-slate-600">
                                Unggah file Excel Bill of Quantities (BoQ) dari Telkomsel untuk melakukan import data Site Master secara massal. Pastikan format kolom sesuai dengan template standar.
                            </p>

                            <input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef} 
                                accept=".xlsx, .xls"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            />
                            <div 
                                className={clsx(
                                    "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer group",
                                    selectedFile ? "border-emerald-400 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-blue-400"
                                )}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {selectedFile ? (
                                    <>
                                        <div className="w-12 h-12 bg-white border border-emerald-200 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                                        </div>
                                        <h3 className="text-sm font-bold text-emerald-800 mb-1">{selectedFile.name}</h3>
                                        <p className="text-xs text-emerald-600 mb-4">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                        <button className="px-4 py-2 bg-white border border-emerald-300 rounded text-sm font-medium text-emerald-700 hover:bg-emerald-50 shadow-sm transition-colors">
                                            Change File
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <Upload className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-800 mb-1">Click to upload or drag and drop</h3>
                                        <p className="text-xs text-slate-500 mb-4">XLSX, XLS up to 10MB</p>
                                        <button className="px-4 py-2 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors">
                                            Select File
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                                <span className="text-xl">💡</span>
                                <div className="text-sm text-blue-800">
                                    <p className="font-bold mb-1">Catatan Import:</p>
                                    <ul className="list-disc pl-4 space-y-1 text-blue-700/80">
                                        <li>Kolom wajib: <code>SITE_ID</code>, <code>Region</code>, <code>PO Tsel</code>.</li>
                                        <li>Site yang sudah ada akan diabaikan atau diupdate berdasarkan SITE_ID.</li>
                                        <li>Status awal otomatis diset menjadi <strong>Unassigned</strong>.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'manual' && (
                        <div className="space-y-5">
                            <p className="text-sm text-slate-600">
                                Isi formulir di bawah untuk menambahkan site baru ke dalam Site Master secara manual.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">SITE ID <span className="text-red-500">*</span></label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="e.g. BKS598" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">NE ID</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="e.g. BKS598MT1" />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-xs font-bold text-slate-700">Site Name <span className="text-red-500">*</span></label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="e.g. CIPINANGJAYA2DMT" />
                                </div>
                                
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Project Type <span className="text-red-500">*</span></label>
                                    <select className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                                        <option value="">Select Type...</option>
                                        <option value="FILTER">FILTER</option>
                                        <option value="COMBAT">COMBAT</option>
                                        <option value="BLACKSITE">BLACKSITE</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Region</label>
                                    <select className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white">
                                        <option value="R03 Jakarta & Banten">R03 Jakarta & Banten</option>
                                        <option value="R12 Jawa Barat">R12 Jawa Barat</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">PO Tsel</label>
                                    <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" placeholder="PO Number" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700">Quantity Equipment</label>
                                    <input type="number" defaultValue={1} min={0} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                    <button 
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    {activeTab === 'excel' ? (
                        <button 
                            onClick={onImportExcel}
                            disabled={!selectedFile}
                            className={clsx(
                                "px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-colors flex items-center gap-2",
                                selectedFile ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-400 cursor-not-allowed"
                            )}
                        >
                            <Upload className="w-4 h-4" /> Import Excel
                        </button>
                    ) : (
                        <button 
                            onClick={onAddManual}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Save Site
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportSiteModal;
