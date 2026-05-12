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
  teamOptions: { label: string; value: string }[];
  leaderOptions: { label: string; value: string }[];
  isRescoping?: boolean;
  onFileUpload: (category: 'document' | 'photo', files: File[]) => Promise<void>;
}

export const ImplSection = ({ localWo, handleFieldSave, handleUpdateStage, saveStatus, canEdit, teamOptions, leaderOptions, isRescoping, onFileUpload }: Props) => {
  const isPastImpl = ['atp', 'dokumen_done', 'bast', 'invoice', 'completed', 'rfi_done'].includes(localWo.stage);
  const hasData = !!(localWo.implementasi_status || localWo.team || localWo.tanggal_rfs);
  const [editing, setEditing] = useState(!hasData);
  const locked = (isPastImpl || hasData) && !editing;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black text-slate-800">Implementasi</h2>
        <div className="flex items-center gap-3">
          <SaveIndicator status={saveStatus} />
          {canEdit && (hasData || isPastImpl) && (
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

      {isPastImpl && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-700 font-bold">
          <Lock className="w-3.5 h-3.5" /> Data terkunci karena stage implementasi telah selesai.
        </div>
      )}

      {!isPastImpl && locked && (
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
          {isRescoping ? (
            <AutoSaveInput label="RFI Done" value={localWo.rfi_done || localWo.impl_rfi_done} field="impl_rfi_done" type="checkbox" onSave={handleFieldSave} locked={locked} />
          ) : (
            <>
              <AutoSaveInput label="RFI Done" value={localWo.rfi_done} field="rfi_done" type="checkbox" onSave={handleFieldSave} locked={locked} />
              <AutoSaveInput label="RFS Done" value={localWo.rfs_done} field="rfs_done" type="checkbox" onSave={handleFieldSave} locked={locked} />
            </>
          )}
          <AutoSaveInput label="Impl Status" value={localWo.implementasi_status || localWo.impl_status} field="impl_status" type="select" onSave={handleFieldSave} locked={locked}
            options={[
              { label: 'Planning', value: 'Planning' },
              { label: 'On Going', value: 'On Going' },
              { label: 'On Hold', value: 'On Hold' },
              { label: 'RFS', value: 'RFS' },
              { label: 'Cancelled', value: 'Cancelled' },
            ]} />
        </div>
      </div>

      <div className="mt-4">
        <AutoSaveInput label="Note Implementasi" value={localWo.note_implementasi || localWo.impl_notes} field="impl_notes" type="textarea" onSave={handleFieldSave} locked={locked} />
      </div>

      {isRescoping && (
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h3 className="font-bold text-slate-800 mb-4">Akses Gedung</h3>
          <AutoSaveInput label="Ada Akses Gedung?" value={localWo.has_akses_gedung} field="has_akses_gedung" type="checkbox" onSave={handleFieldSave} locked={locked} />
          {localWo.has_akses_gedung && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-x-12 animate-in fade-in">
              <div className="space-y-0">
                <AutoSaveInput label="Nama Gedung" value={localWo.nama_gedung} field="nama_gedung" onSave={handleFieldSave} locked={locked} />
                <AutoSaveInput label="PIC Gedung Nama" value={localWo.pic_gedung_nama} field="pic_gedung_nama" onSave={handleFieldSave} locked={locked} />
              </div>
              <div className="space-y-0">
                <AutoSaveInput label="PIC Gedung Telp" value={localWo.pic_gedung_telp} field="pic_gedung_telp" onSave={handleFieldSave} locked={locked} />
                <AutoSaveInput label="Status Akses Gedung" value={localWo.status_akses_gedung} field="status_akses_gedung" onSave={handleFieldSave} locked={locked} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload zones — always visible for evidence capture */}
      <div className="mt-8 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upload Bukti Implementasi</p>
        <FileUploadZone
          label="Upload Foto Implementasi"
          hint="JPG, PNG — drag & drop atau klik · tersimpan di tab Foto"
          accept="image/*"
          icon="image"
          onUpload={files => onFileUpload('photo', files)}
        />
        <FileUploadZone
          label="Upload Dokumen Implementasi"
          hint="Surat jalan, BA, laporan — tersimpan di tab File & Lampiran"
          accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
          icon="document"
          compact
          onUpload={files => onFileUpload('document', files)}
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
                handleUpdateStage(isRescoping ? 'dokumen_done' : 'atp');
                setEditing(false);
              }}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saveStatus === 'saving' ? 'Menyimpan...' : (isRescoping ? 'Selesai Implementasi' : 'Update Implementasi Stage')} <ChevronRight className="w-4 h-4" />
            </button>
          </>
        ) : isPastImpl ? (
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm rounded-lg flex items-center gap-1.5 shadow-sm animate-in fade-in">
            ✓ Stage Implementasi Selesai
          </div>
        ) : null}
      </div>
    </div>
  );
};
