import { useState } from 'react';
import { ChevronRight, Lock, Pencil } from 'lucide-react';
import { SaveIndicator, AutoSaveInput } from './AtpShared';
import { FileUploadZone } from './FileUploadZone';

interface Props {
  localWo: any;
  handleFieldSave: (field: string, value: any) => Promise<any>;
  handleUpdateStage: (stage: string) => Promise<any>;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  canEdit: boolean;
  onFileUpload: (category: 'document' | 'photo', files: File[]) => Promise<void>;
}

export const PermitSection = ({ localWo, handleFieldSave, handleUpdateStage, saveStatus, canEdit, onFileUpload }: Props) => {
  const PERMIT_ACTIVE_STAGES = ['imported', 'assigned', 'survey', 'survey_nok', 'erfin_process', 'erfin_ready', 'permit', 'permit_process', 'permit_ready'];
  const isPastPermit = !PERMIT_ACTIVE_STAGES.includes(localWo.stage || 'imported');
  const hasData = !!(localWo.permit_status || localWo.tower_provider || localWo.permit_start);
  const [editing, setEditing] = useState(!hasData);
  const locked = (isPastPermit || hasData) && !editing;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black text-slate-800">Permit Details</h2>
        <div className="flex items-center gap-3">
          <SaveIndicator status={saveStatus} />
          {canEdit && (hasData || isPastPermit) && (
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

      {isPastPermit && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700 font-bold">
          <Lock className="w-3.5 h-3.5" /> Data terkunci karena stage permit telah selesai.
        </div>
      )}

      {!isPastPermit && locked && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 font-medium">
          <Lock className="w-3.5 h-3.5" /> Data tersimpan dari DB. Klik <strong>Edit</strong> untuk mengubah.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12">
        <div className="space-y-0">
          <AutoSaveInput label="Permit Status" value={localWo.permit_status} field="permit_status" type="select" onSave={handleFieldSave} locked={locked}
            options={[
              { label: '1. Planning', value: '1. Planning' },
              { label: '2. Waiting for TO Approval', value: '2. Waiting for TO Approval' },
              { label: '4. Tpass Released', value: '4. Tpass Released' },
              { label: '5. Permit Released', value: '5. Permit Released' },
              { label: '6. Expired Permit', value: '6. Expired Permit' },
              { label: '9. Cancelled', value: '9. Cancelled' },
              { label: '10. DROP OUT', value: '10. DROP OUT' },
              { label: '(Blanks)', value: '(Blanks)' },
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
          <AutoSaveInput label="IOMS Registered" value={localWo.ioms_registered} field="ioms_registered" type="select" onSave={handleFieldSave} locked={locked}
            options={[{ label: 'Registered', value: 'Registered' }, { label: 'Not Registered', value: 'Not Registered' }]} />
        </div>
      </div>

      {/* Upload zones — always visible so evidence can be added at any stage */}
      <div className="mt-8 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dokumen Permit</p>
        <FileUploadZone
          label="Upload Dokumen Permit"
          hint="PDF, JPG, PNG, DOCX — drag & drop atau klik · tersimpan di tab File & Lampiran"
          accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
          icon="document"
          onUpload={files => onFileUpload('document', files)}
        />
        <FileUploadZone
          label="Upload Foto Permit / Site"
          hint="Foto tersimpan di tab Foto"
          accept="image/*"
          icon="image"
          compact
          onUpload={files => onFileUpload('photo', files)}
        />
      </div>

      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
        {editing ? (
          <>
            <button
              onClick={() => setEditing(false)}
              className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              disabled={saveStatus === 'saving'}
              onClick={() => { 
                const isReleased = /^[57]/.test(localWo.permit_status || '');
                handleUpdateStage(isReleased ? 'implementasi' : 'permit');
                setEditing(false); 
              }}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saveStatus === 'saving' ? 'Menyimpan...' : 'Simpan & Lanjutkan'} <ChevronRight className="w-4 h-4" />
            </button>
          </>
        ) : isPastPermit ? (
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm rounded-lg flex items-center gap-1.5 shadow-sm animate-in fade-in">
            ✓ Stage Permit Selesai
          </div>
        ) : null}
      </div>
    </div>
  );
};
