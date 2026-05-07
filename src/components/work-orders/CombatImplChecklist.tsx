import { useState } from 'react';
import { CheckCircle2, Loader2, Circle, ChevronDown, ChevronUp, Upload, ImageIcon, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import {
  COMBAT_IMPL_STEPS,
  type CombatImplSteps,
  type CombatImplStepKey,
  type CombatImplStepStatus,
  countCombatDone,
} from '../../config/stagePipelines';
import { db } from '../../db';

interface Props {
  siteId: string;
  dbRecordId: string;
  steps: CombatImplSteps;
  onUpdate: (steps: CombatImplSteps) => void;
  onMarkSelesai: () => void;
  currentStage: string;
  canEdit: boolean;
}

const STATUS_OPTIONS: { value: CombatImplStepStatus; label: string }[] = [
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done',        label: 'Done' },
];

const StepIcon = ({ status }: { status: CombatImplStepStatus }) => {
  if (status === 'done')
    return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
  if (status === 'in_progress')
    return <Loader2 className="w-5 h-5 text-blue-500 shrink-0 animate-spin" />;
  return <Circle className="w-5 h-5 text-slate-300 shrink-0" />;
};

const borderColor: Record<CombatImplStepStatus, string> = {
  done:        'border-l-emerald-400 bg-emerald-50/30',
  in_progress: 'border-l-blue-400 bg-blue-50/20',
  pending:     'border-l-slate-200 bg-white',
};

export const CombatImplChecklist = ({ siteId, dbRecordId, steps, onUpdate, onMarkSelesai, currentStage, canEdit }: Props) => {
  const [expanded, setExpanded] = useState<Set<CombatImplStepKey>>(new Set());
  const [saving, setSaving] = useState<CombatImplStepKey | null>(null);

  const doneCount = countCombatDone(steps);
  const total = COMBAT_IMPL_STEPS.length;
  const allDone = doneCount === total;
  const pastImpl = ['dokumen_done', 'bast', 'invoice', 'completed'].includes(currentStage);

  const toggleExpand = (key: CombatImplStepKey) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const saveStep = async (key: CombatImplStepKey, patch: Partial<CombatImplSteps[typeof key]>) => {
    const updated: CombatImplSteps = {
      ...steps,
      [key]: { ...steps[key], ...patch },
    };
    onUpdate(updated);
    setSaving(key);
    try {
      // Build SET clauses for each changed field
      const setClauses = Object.entries(patch)
        .map(([f]) => `combat_impl_steps.${key}.${f} = $${f}`)
        .join(', ');
      const params: Record<string, any> = { ...patch };
      await db.query(
        `UPDATE ${dbRecordId} SET ${setClauses}, updated_at = time::now()`,
        params
      );
    } catch (e) {
      console.error('Failed to save combat step:', e);
    } finally {
      setSaving(null);
    }
  };

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
        {COMBAT_IMPL_STEPS.map((stepDef, idx) => {
          const step = steps[stepDef.key] ?? { status: 'pending' as const, date: null, person: null, notes: null };
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
                  {!isExpanded && (
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
                  <p className="text-[11px] text-slate-500 italic">{stepDef.description}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Status */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">Status</label>
                      <select
                        disabled={!canEdit}
                        value={step.status}
                        onChange={e => saveStep(stepDef.key, { status: e.target.value as CombatImplStepStatus })}
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
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors w-fit">
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={async e => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;
                          for (let i = 0; i < files.length; i++) {
                            const file = files[i];
                            try {
                              await db.query('CREATE site_files CONTENT $data', {
                                data: {
                                  site_id: siteId,
                                  name: file.name,
                                  tag: `impl_${stepDef.key}`,
                                  category: 'photo',
                                  size: `${(file.size / 1024).toFixed(0)} KB`,
                                  uploaded_at: new Date().toISOString(),
                                }
                              });
                            } catch (err) {
                              console.error('Photo upload failed:', err);
                            }
                          }
                        }}
                      />
                      <Upload className="w-3.5 h-3.5" />
                      Upload Foto
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mark Selesai button */}
      {!pastImpl && canEdit && (
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
            title={allDone ? 'Tandai implementasi selesai' : `Selesaikan semua ${total} tahap terlebih dahulu`}
          >
            Tandai Implementasi Selesai
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
