import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Loader2, AlertCircle, Edit3 } from 'lucide-react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

// We'll pass saveField from useCellSave as a prop.
interface InlineEditProps {
    value: any;
    onSave: (val: any) => Promise<boolean>;
    options?: { label: string; value: any; color?: string }[];
}

export const InlineSectorEdit = ({ value, onSave }: InlineEditProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = async (newVal: number) => {
        setIsOpen(false);
        if (newVal === value) return;
        setSaving(true);
        const ok = await onSave(newVal);
        setSaving(false);
        if (ok) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1500);
        }
    };

    return (
        <div className="relative inline-block" ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="group relative inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer hover:bg-indigo-100 bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm"
            >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : showSuccess ? <Check className="w-3 h-3 text-emerald-500" /> : `S${value || '?'}`}
                <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-24 bg-white border border-slate-200 shadow-lg rounded-lg z-50 overflow-hidden">
                    {[1, 2, 3, 4].map(s => (
                        <button key={s} onClick={() => handleSelect(s)} className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 text-slate-700">
                            Sektor {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const InlineTextEdit = ({ value, onSave, placeholder = "Edit..." }: { value: string, onSave: (val: string) => Promise<boolean>, placeholder?: string }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState(value || '');
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = async () => {
        if (val === value) {
            setIsEditing(false);
            return;
        }
        setSaving(true);
        const ok = await onSave(val);
        setSaving(false);
        setIsEditing(false);
        if (ok) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1500);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1">
                <input 
                    type="text" 
                    value={val} 
                    onChange={e => setVal(e.target.value)} 
                    onBlur={handleSave}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    autoFocus
                    className="w-full px-2 py-1 text-xs border border-blue-400 rounded outline-none shadow-sm"
                    placeholder={placeholder}
                />
            </div>
        );
    }

    return (
        <div 
            onClick={() => setIsEditing(true)}
            className="group relative inline-flex items-center gap-1 text-xs transition-colors cursor-pointer w-full hover:bg-slate-50 min-h-[24px] px-1 -mx-1 rounded"
        >
            {saving && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
            {showSuccess && <Check className="w-3 h-3 text-emerald-500" />}
            {!saving && !showSuccess && (value ? <span className="font-mono text-slate-700">{value}</span> : <span className="text-slate-300 italic">{placeholder}</span>)}
            <Edit3 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1" />
        </div>
    );
};

export const InlineSelectEdit = ({ value, onSave, options = [], placeholder = "Select..." }: InlineEditProps & { placeholder?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = async (newVal: any) => {
        setIsOpen(false);
        if (newVal === value) return;
        setSaving(true);
        const ok = await onSave(newVal);
        setSaving(false);
        if (ok) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1500);
        }
    };

    const displayLabel = options.find(o => o.value === value)?.label || value || placeholder;

    return (
        <div className="relative inline-block w-full" ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="group relative flex items-center justify-between gap-1 w-full text-xs transition-colors cursor-pointer hover:bg-slate-50 min-h-[24px] px-1 -mx-1 rounded text-left"
            >
                <div className="flex items-center gap-1 overflow-hidden">
                    {saving && <Loader2 className="w-3 h-3 animate-spin text-blue-500 shrink-0" />}
                    {showSuccess && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                    {!saving && !showSuccess && <span className={clsx("truncate", !value && "text-slate-400 italic")}>{displayLabel}</span>}
                </div>
                <ChevronDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 shadow-lg rounded-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                    {options.map(o => (
                        <button key={o.value} onClick={() => handleSelect(o.value)} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700 border-b border-slate-50 last:border-0">
                            {o.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const InlineDateEdit = ({ value, onSave, placeholder = "Select date...", warningThresholdDays }: { value: string, onSave: (val: string) => Promise<boolean>, placeholder?: string, warningThresholdDays?: number }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState(value ? value.split('T')[0] : '');
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSave = async () => {
        if (val === value) {
            setIsEditing(false);
            return;
        }
        setSaving(true);
        const ok = await onSave(val);
        setSaving(false);
        setIsEditing(false);
        if (ok) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1500);
        }
    };

    let textColor = "text-slate-700";
    if (value && warningThresholdDays !== undefined) {
        const daysLeft = Math.floor((new Date(value).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        if (daysLeft < 0) textColor = "text-red-600 font-bold";
        else if (daysLeft <= warningThresholdDays) textColor = "text-amber-600 font-bold";
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-1">
                <input 
                    type="date" 
                    value={val} 
                    onChange={e => setVal(e.target.value)} 
                    onBlur={handleSave}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    autoFocus
                    className="w-full px-2 py-1 text-xs border border-blue-400 rounded outline-none shadow-sm"
                />
            </div>
        );
    }

    return (
        <div 
            onClick={() => setIsEditing(true)}
            className="group relative inline-flex items-center gap-1 text-xs transition-colors cursor-pointer w-full hover:bg-slate-50 min-h-[24px] px-1 -mx-1 rounded"
        >
            {saving && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
            {showSuccess && <Check className="w-3 h-3 text-emerald-500" />}
            {!saving && !showSuccess && (value ? <span className={textColor}>{new Date(value).toLocaleDateString('id-ID')}</span> : <span className="text-slate-300 italic">{placeholder}</span>)}
            <Edit3 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1" />
        </div>
    );
};

export const InlineCheckbox = ({ value, onSave, label }: { value: boolean, onSave: (val: boolean) => Promise<boolean>, label?: string }) => {
    const [saving, setSaving] = useState(false);

    const handleToggle = async () => {
        setSaving(true);
        await onSave(!value);
        setSaving(false);
    };

    return (
        <label className="flex items-center gap-2 cursor-pointer group hover:bg-slate-50 px-1 -mx-1 rounded py-0.5">
            <div className="relative flex items-center">
                <input 
                    type="checkbox" 
                    checked={value} 
                    onChange={handleToggle}
                    disabled={saving}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                />
                {saving && <Loader2 className="w-3 h-3 animate-spin text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
            </div>
            {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
        </label>
    );
};

export const InlineTeamEdit = ({ value, onSave, options = [] }: InlineEditProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

    const handleSelect = async (newVal: string) => {
        setIsOpen(false);
        if (newVal === value) return;
        setSaving(true);
        const ok = await onSave(newVal);
        setSaving(false);
        if (ok) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1500);
        }
    };

    return (
        <div className="relative inline-block" ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "group relative inline-flex items-center gap-1 text-xs transition-colors cursor-pointer",
                    value ? "font-medium text-slate-700 hover:text-blue-600" : "text-amber-500 font-medium italic hover:text-amber-600"
                )}
            >
                {saving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                {showSuccess && <Check className="w-3 h-3 text-emerald-500 mr-1" />}
                {!saving && !showSuccess && (value || "Belum ditugaskan")}
                <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 shadow-lg rounded-lg z-50 overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <input 
                            type="text" 
                            placeholder="Cari tim..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-400"
                        />
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                        {filtered.map(o => (
                            <button key={o.value} onClick={() => handleSelect(o.value)} className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 text-slate-700">
                                {o.label}
                            </button>
                        ))}
                        {filtered.length === 0 && <div className="px-3 py-2 text-xs text-slate-400 italic">Tidak ada tim.</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export const InlineStageEdit = ({ value, siteId, onSave }: { value: string, siteId: string, onSave: (val: string) => Promise<boolean> }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = async (newVal: string) => {
        setIsOpen(false);
        if (newVal === value) return;
        setSaving(true);
        const ok = await onSave(newVal);
        setSaving(false);
        if (ok) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1500);
        }
    };

    const getStageColor = (v: string) => {
        const map: any = {
            'imported': 'bg-gray-100 text-gray-700 border-gray-200',
            'assigned': 'bg-gray-100 text-gray-700 border-gray-200',
            'permit_process': 'bg-amber-100 text-amber-700 border-amber-200',
            'permit_ready': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'akses_process': 'bg-amber-100 text-amber-700 border-amber-200',
            'akses_ready': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'implementasi': 'bg-blue-100 text-blue-700 border-blue-200',
            'rfi_done': 'bg-indigo-100 text-indigo-700 border-indigo-200',
            'rfs_done': 'bg-violet-100 text-violet-700 border-violet-200',
            'dokumen_done': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
            'atp': 'bg-purple-100 text-purple-700 border-purple-200',
            'bast': 'bg-pink-100 text-pink-700 border-pink-200',
            'invoice': 'bg-rose-100 text-rose-700 border-rose-200',
            'completed': 'bg-emerald-100 text-emerald-800 border-emerald-300'
        };
        return map[v] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div className="relative inline-block" ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "group relative inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer hover:brightness-95 transition-all",
                    getStageColor(value)
                )}
            >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : showSuccess ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
                {!saving && !showSuccess && value.replace(/_/g, ' ')}
                <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 shadow-lg rounded-lg z-50 overflow-hidden">
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Saat ini: {value.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="p-1">
                        <button onClick={() => handleSelect('dokumen_done')} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded">
                            → ATP / Dokumen Done
                        </button>
                        <button onClick={() => navigate(`/sites/${siteId}#pekerjaan`)} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded">
                            → Buat Pekerjaan Baru
                        </button>
                        <button onClick={() => navigate(`/sites/${siteId}#pekerjaan`)} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 rounded">
                            Update Lengkap →
                        </button>
                        <div className="h-px bg-slate-100 my-1"></div>
                        <button onClick={() => alert('Issue reported!')} className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3" /> Laporkan Issue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
