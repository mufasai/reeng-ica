import { useState } from 'react';
import { X, ArrowRight, Briefcase } from 'lucide-react';
import clsx from 'clsx';
import type { ProjectType } from '../../types';

interface AssignProjectModalProps {
    siteId: string;
    onClose: () => void;
    onAssign: (projectType: ProjectType) => void;
}

const PROJECT_OPTIONS: { id: ProjectType; label: string; desc: string; icon: string }[] = [
    { id: 'FILTER', label: 'Filter', desc: 'Instalasi filter frekuensi', icon: '📶' },
    { id: 'COMBAT', label: 'Combat', desc: 'Deployment site combat baru', icon: '🏗️' },
    { id: 'RESCOPING', label: 'Rescoping', desc: 'Rescoping existing equipment', icon: '♻️' },
    { id: 'BLACKSITE', label: 'Blacksite', desc: 'Pembuatan site blacksite', icon: '🌑' },
    { id: 'L2H', label: 'L2H', desc: 'Low to High power upgrade', icon: '⚡' },
];

const AssignProjectModal = ({ siteId, onClose, onAssign }: AssignProjectModalProps) => {
    const [selectedType, setSelectedType] = useState<ProjectType | null>(null);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Tugaskan {siteId}</h2>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Pilih Tipe Proyek</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 font-medium mb-2">Tentukan tipe proyek untuk memulai alur pekerjaan site ini:</p>
                    
                    <div className="grid gap-2">
                        {PROJECT_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => setSelectedType(opt.id)}
                                className={clsx(
                                    "flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group",
                                    selectedType === opt.id 
                                        ? "border-blue-600 bg-blue-50/50 shadow-md" 
                                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{opt.icon}</span>
                                <div className="flex-1">
                                    <h3 className={clsx("text-sm font-bold", selectedType === opt.id ? "text-blue-700" : "text-slate-800")}>
                                        {opt.label}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium">{opt.desc}</p>
                                </div>
                                <div className={clsx(
                                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                    selectedType === opt.id ? "border-blue-600 bg-blue-600" : "border-slate-300"
                                )}>
                                    {selectedType === opt.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        disabled={!selectedType}
                        onClick={() => selectedType && onAssign(selectedType)}
                        className={clsx(
                            "px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md",
                            selectedType 
                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 active:scale-95" 
                                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                        )}
                    >
                        Lanjut ke Detail Site <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignProjectModal;
