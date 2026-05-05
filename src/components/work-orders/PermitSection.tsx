import { useState } from 'react';
import { ChevronRight, Upload, Lock, Pencil } from 'lucide-react';
import { SaveIndicator, AutoSaveInput } from './AtpShared';

interface Props {
  localWo: any;
  handleFieldSave: (field: string, value: any) => Promise<void>;
  handleUpdateStage: (stage: string) => Promise<void>;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  canEdit: boolean;
}

export const PermitSection = ({ localWo, handleFieldSave, handleUpdateStage, saveStatus, canEdit }: Props) => {
  const hasData = !!(localWo.permit_status || localWo.tower_provider || localWo.permit_start);
  const [editing, setEditing] = useState(!hasData);
  const locked = hasData && !editing;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black text-slate-800">Permit Details</h2>
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
          <AutoSaveInput label="Permit Status" value={localWo.permit_status} field="permit_status" type="select" onSave={handleFieldSave} locked={locked}
            options={[
              { label: '1. Planning', value: '1. Planning' },
              { label: '2. Waiting TO', value: '2. Waiting TO' },
              { label: '4. Tpass', value: '4. Tpass' },
              { label: '5. Permit Released', value: '5. Permit Released' },
              { label: '6. Expired', value: '6. Expired' },
              { label: '9. Cancelled', value: '9. Cancelled' },
            ]} />
          <AutoSaveInput label="Tower Provider" value={localWo.tower_provider || localWo.tp_name} field="tower_provider" onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="Create Date" value={localWo.permit_create_date} field="permit_create_date" type="date" onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="Jenis Kunci" value={localWo.lock_type} field="lock_type" type="select" onSave={handleFieldSave} locked={locked}
            options={[{ label: 'PADLOCK', value: 'PADLOCK' }, { label: 'SMARTLOCK', value: 'SMARTLOCK' }, { label: 'QUADLOCK', value: 'QUADLOCK' }]} />
          <AutoSaveInput label="Permit Start" value={localWo.permit_start} field="permit_start" type="date" onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="PIC Nama" value={localWo.pic} field="pic" onSave={handleFieldSave} locked={locked} />
        </div>
        <div className="space-y-0">
          <AutoSaveInput label="Permit Expiry" value={localWo.permit_expiry} field="permit_expiry" type="date" onSave={handleFieldSave} locked={locked} warningThresholdDays={14} />
          <AutoSaveInput label="PIC Telp" value={localWo.pic_telp} field="pic_telp" onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="TPAS Nomor" value={localWo.tpas_no} field="tpas_no" onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="TP Nomor" value={localWo.tp_no} field="tp_no" onSave={handleFieldSave} locked={locked} />
          <AutoSaveInput label="CAF Nomor" value={localWo.caf_no} field="caf_no" onSave={handleFieldSave} locked={locked} />
        </div>
      </div>

      {!locked && (
        <div className="mt-8 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group">
          <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Upload className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-sm font-bold text-slate-700">Drag & drop permit documents here</p>
          <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG up to 10MB</p>
        </div>
      )}

      {!locked && (
        <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
          <button className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
            Simpan Draft
          </button>
          <button onClick={() => handleUpdateStage('implementasi')} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            Update Stage Permit <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
