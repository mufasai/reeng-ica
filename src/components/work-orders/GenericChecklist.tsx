import { useState, useRef } from 'react';
import { CheckCircle2, Loader2, Circle, ChevronDown, ChevronUp, Upload, ImageIcon, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { db } from '../../db';
import type { StageSubstep } from '../../config/projectTypeConfig';

export type SubstepStatus = 'pending' | 'in_progress' | 'done';

export interface SubstepData {
  status: SubstepStatus;
  date: string | null;
  person: string | null;
  notes: string | null;
}

interface Props {
  siteId: string;
  dbRecordId: string;
  stageKey: string;
  substepsDef: StageSubstep[];
  substepsData: Record<string, SubstepData>;
  onUpdate: (data: Record<string, SubstepData>) => void;
  onMarkSelesai: () => void;
  canEdit: boolean;
  onToast?: (msg: string, type: 'success' | 'error') => void;
  onFileUpload?: (category: 'document' | 'photo', files: FileList | File[] | null, tag?: string) => void;
}

const STATUS_OPTIONS: { value: SubstepStatus; label: string }[] = [
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',        label: 'Done' },
];

const StepIcon = ({ status }: { status: SubstepStatus }) => {
  if (status === 'done')
    return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
  if (status === 'in_progress')
    return <Loader2 className="w-5 h-5 text-blue-500 shrink-0 animate-spin" />;
  return <Circle className="w-5 h-5 text-slate-300 shrink-0" />;
};

const borderColor: Record<SubstepStatus, string> = {
  done:        'border-l-emerald-400 bg-emerald-50/30',
  in_progress: 'border-l-blue-400 bg-blue-50/20',
  pending:     'border-l-slate-200 bg-white',
};

export const GenericChecklist = ({ siteId, dbRecordId, stageKey, substepsDef, substepsData, onUpdate, onMarkSelesai, canEdit, onToast, onFileUpload }: Props) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const doneCount = substepsDef.filter(def => substepsData[def.key]?.status === 'done').length;
  const total = substepsDef.length;
  const allDone = total > 0 && doneCount === total;
  
  // If the current stage is past this stage, we shouldn't allow marking as done if it's already done? Wait, `pastImpl` logic was specific.
  // We can just rely on `canEdit`.

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const saveStep = async (key: string, patch: Partial<SubstepData>) => {
    const updated = {
      ...substepsData,
      [key]: { ...(substepsData[key] || { status: 'pending', date: null, person: null, notes: null }), ...patch },
    };
    onUpdate(updated);
    setSaving(key);
    try {
      const fieldName = `${stageKey}_steps`;
      await db.query(`UPDATE ${dbRecordId} MERGE $data`, { data: { [fieldName]: updated, updated_at: new Date().toISOString() } });
    } catch (e) {
      console.error(`Failed to save step ${key}:`, e);
    } finally {
      setSaving(null);
    }
  };

  const handleFileUpload = async (key: string, files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    if (onFileUpload) {
      onFileUpload('photo', files, `${stageKey}_${key}`);
      return;
    }
    setUploading(key);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await db.query('CREATE site_files CONTENT $data', {
          data: {
            work_order_id: dbRecordId,
            site_id: siteId,
            name: file.name,
            tag: `${stageKey}_${key}`,
            category: 'photo',
            size: `${(file.size / 1024).toFixed(0)} KB`,
            file_size: file.size,
            uploaded_at: new Date().toISOString(),
          }
        });
      }
      onToast?.(`${files.length} foto berhasil diunggah`, 'success');
    } catch (err) {
      console.error('Photo upload failed:', err);
      onToast?.('Gagal mengunggah foto', 'error');
    } finally {
      const input = fileInputRefs.current[key];
      if (input) input.value = '';
      setUploading(null);
    }
  };

  if (total === 0) {
    return <div className="text-sm text-slate-500 italic">Belum ada substep dikonfigurasi untuk stage ini.</div>;
  }

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-700">
            PROGRESS: {doneCount}/{total} tahap selesai
          </span>
          <span className="text-sm font-black text-slate-800">{Math.round((doneCount / total) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${(doneCount / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {substepsDef.map((stepDef, idx) => {
          const step = substepsData[stepDef.key] ?? { status: 'pending' as const, date: null, person: null, notes: null };
          const isExpanded = expanded.has(stepDef.key);
          const isSaving = saving === stepDef.key;

          return (
            <div
              key={stepDef.key}
              className={clsx(
                'border border-slate-200 rounded-xl border-l-4 overflow-hidden transition-colors',
                borderColor[step.status]
              )}
            >
              {/* Row header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                onClick={() => toggleExpand(stepDef.key)}
              >
                <StepIcon status={step.status} />
                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    'text-sm font-bold',
                    step.status === 'done' ? 'text-emerald-800' :
                    step.status === 'in_progress' ? 'text-blue-800' : 'text-slate-600'
                  )}>
                    {idx + 1}. {stepDef.label}
                  </p>
                  {!isExpanded && stepDef.description && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{stepDef.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {step.status !== 'pending' && (
                    <span className={clsx(
                      'text-[10px] font-black uppercase px-2 py-0.5 rounded border',
                      step.status === 'done'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    )}>
                      {step.status === 'done' ? 'Done' : 'In Progress'}
                    </span>
                  )}
                  {isSaving && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-1 duration-150">
                  {stepDef.description && (
                    <p className="text-[11px] text-slate-500 italic">{stepDef.description}</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Status */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Status</label>
                      <select
                        disabled={!canEdit}
                        value={step.status}
                        onChange={e => saveStep(stepDef.key, { status: e.target.value as SubstepStatus })}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        {STATUS_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Tanggal */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Tanggal</label>
                      <input
                        type="date"
                        disabled={!canEdit}
                        defaultValue={step.date || ''}
                        onBlur={e => { if (e.target.value !== (step.date || '')) saveStep(stepDef.key, { date: e.target.value || null }); }}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400 disabled:bg-slate-50"
                      />
                    </div>

                    {/* Person */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Person</label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        defaultValue={step.person || ''}
                        placeholder="Nama penanggung jawab"
                        onBlur={e => { if (e.target.value !== (step.person || '')) saveStep(stepDef.key, { person: e.target.value || null }); }}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400 disabled:bg-slate-50 placeholder:text-slate-300"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Notes</label>
                      <textarea
                        disabled={!canEdit}
                        defaultValue={step.notes || ''}
                        rows={2}
                        placeholder="Catatan..."
                        onBlur={e => { if (e.target.value !== (step.notes || '')) saveStep(stepDef.key, { notes: e.target.value || null }); }}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400 disabled:bg-slate-50 placeholder:text-slate-300 resize-none"
                      />
                    </div>
                  </div>

                  {/* Photo upload per step */}
                  {canEdit && (
                    <>
                      <button
                        onClick={() => fileInputRefs.current[stepDef.key]?.click()}
                        disabled={uploading === stepDef.key}
                        className="flex items-center gap-2 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors disabled:text-slate-400"
                      >
                        {uploading === stepDef.key
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Upload className="w-3.5 h-3.5" />}
                        {uploading === stepDef.key ? 'Mengunggah...' : '+ Upload Foto'}
                        {uploading !== stepDef.key && <ImageIcon className="w-3.5 h-3.5 text-slate-400" />}
                      </button>
                      <input
                        ref={el => { fileInputRefs.current[stepDef.key] = el; }}
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        style={{ display: 'none' }}
                        onChange={e => handleFileUpload(stepDef.key, e.target.files)}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mark Selesai button */}
      {canEdit && (
        <div className="flex justify-end pt-2">
          <button
            disabled={!allDone}
            onClick={onMarkSelesai}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm',
              allDone
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
            title={allDone ? `Tandai ${stageKey} selesai` : `Selesaikan semua ${total} tahap terlebih dahulu`}
          >
            Tandai Selesai
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
