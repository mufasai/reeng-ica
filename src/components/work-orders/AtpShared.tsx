/**
 * Shared primitive components for ATP workspace tabs.
 * Extracted to avoid circular imports between section components.
 */
import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export const SaveIndicator = ({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) => {
  if (status === 'idle') return null;
  if (status === 'saving') return <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</span>;
  if (status === 'saved') return <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5 animate-in fade-in zoom-in duration-300"><CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan</span>;
  if (status === 'error') return <span className="text-xs font-medium text-red-600 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Gagal</span>;
  return null;
};

export const AutoSaveInput = ({ label, value, field, type = 'text', onSave, options, warningThresholdDays, locked }: any) => {
  // Hooks must be called unconditionally — before any early return
  const [val, setVal] = useState(value || '');
  useEffect(() => { setVal(value || ''); }, [value]);

  if (locked) {
    return (
      <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-3 border-b border-slate-50 px-2 -mx-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        <span className="text-sm font-semibold text-slate-800">
          {type === 'checkbox' ? (value ? '✓ Ya' : '–') : (value || <span className="text-slate-300 italic font-normal">–</span>)}
        </span>
      </div>
    );
  }

  const handleBlur = () => { if (val !== (value || '')) onSave(field, val); };
  const handleChange = (e: any) => {
    const newValue = type === 'checkbox' ? e.target.checked : e.target.value;
    setVal(newValue);
    if (type === 'select' || type === 'checkbox') onSave(field, newValue);
  };

  let textColor = 'text-slate-800';
  if (type === 'date' && value && warningThresholdDays !== undefined) {
    const daysLeft = Math.floor((new Date(value).getTime() - Date.now()) / 86400000);
    if (daysLeft < 0) textColor = 'text-red-600';
    else if (daysLeft <= warningThresholdDays) textColor = 'text-amber-600';
  }

  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-3 border-b border-slate-50 hover:bg-slate-50/50 px-2 -mx-2 rounded transition-colors">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      {type === 'select' ? (
        <select value={val} onChange={handleChange} className="w-full text-sm font-semibold text-slate-800 p-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white">
          <option value="">Select...</option>
          {options?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea value={val} onChange={handleChange} onBlur={handleBlur} className="w-full text-sm font-medium text-slate-800 p-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all min-h-[80px]" />
      ) : type === 'checkbox' ? (
        <input type="checkbox" checked={!!val} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
      ) : (
        <input type={type} value={val} onChange={handleChange} onBlur={handleBlur} className={clsx('w-full text-sm font-semibold p-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all', textColor)} />
      )}
    </div>
  );
};
