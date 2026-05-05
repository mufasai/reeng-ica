import { useState } from 'react';
import { ChevronRight, ImageIcon, Lock, Pencil } from 'lucide-react';
import { SaveIndicator, AutoSaveInput } from './AtpShared';

interface Props {
  localWo: any;
  handleFieldSave: (field: string, value: any) => Promise<void>;
  handleUpdateStage: (stage: string) => Promise<void>;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  canEdit: boolean;
  teamOptions: { label: string; value: string }[];
  leaderOptions: { label: string; value: string }[];
}

export const ImplSection = ({ localWo, handleFieldSave, handleUpdateStage, saveStatus, canEdit, teamOptions, leaderOptions }: Props) => {
  const hasData = !!(localWo.implementasi_status || localWo.team || localWo.tanggal_rfs);
  const [editing, setEditing] = useState(!hasData);
  const locked = hasData && !editing;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black text-slate-800">Implementasi</h2>
        <div className="flex items-center gap-3">
          <SaveIndicator status={saveStatus} />
          {canEdit && hasData && (
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors"
              style={editing
                ? { background: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }
                : { background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}
            >
              {editing ? <Lock className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
              {editing ? 'Kunci' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {locked && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 font-medium">
          <Lock className="w-3.5 h-3.5" /> Data tersimpan dari DB. Klik <strong>Edit</strong> untuk mengubah.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12">
        <div className="space-y-0">
          <AutoSaveInput label="Tim" value={localWo.team_id || localWo.team} field="team_id" type="select" options={teamOptions} onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="Field Leader" value={localWo.field_leader_id} field="field_leader_id" type="select" options={leaderOptions} onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="Tanggal Plan" value={localWo.plan_date} field="plan_date" type="date" onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="Tanggal Aktual" value={localWo.actual_date || localWo.tanggal_rfs} field="actual_date" type="date" onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="CI Tanggal" value={localWo.ci_date} field="ci_date" type="date" onSave={handleFieldSave} locked={locked} />
        </div>
        <div className="space-y-0">
          <AutoSaveInput label="CO Tanggal" value={localWo.co_date} field="co_date" type="date" onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="RFI Done" value={localWo.rfi_done} field="rfi_done" type="checkbox" onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="RFS Done" value={localWo.rfs_done} field="rfs_done" type="checkbox" onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="Impl Status" value={localWo.implementasi_status || localWo.impl_status} field="impl_status" type="select" onSave={handleFieldSave} locked={locked}
            options={[
              { label: 'Awaiting', value: 'Awaiting' },
              { label: 'Scheduled', value: 'Scheduled' },
              { label: 'On Going', value: 'On Going' },
              { label: 'RFS', value: 'RFS' },
              { label: 'Cancelled', value: 'Cancelled' },
            ]} />
        </div>
      </div>

      <div className="mt-4">
        <AutoSaveInput label="Note Implementasi" value={localWo.note_implementasi || localWo.impl_notes} field="impl_notes" type="textarea" onSave={handleFieldSave} locked={locked} />
      </div>

      {!locked && (
        <div className="mt-8 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 cursor-pointer group hover:bg-slate-50 transition-colors">
          <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <ImageIcon className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-sm font-bold text-slate-700">Upload Implementation Photos</p>
        </div>
      )}

      {!locked && (
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
          <button className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            Simpan Draft
          </button>
          <button onClick={() => handleUpdateStage('atp')} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            Update Stage Implementasi <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
