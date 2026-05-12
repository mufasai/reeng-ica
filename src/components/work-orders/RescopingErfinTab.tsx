import { useState } from 'react';
import { Upload, ChevronRight, FileText } from 'lucide-react';
import clsx from 'clsx';
import { db } from '../../db';

export const RescopingErfinTab = ({ localWo, stageIdx, onUpdateStage, onFieldsSaved }: any) => {
  const [erfinNo, setErfinNo] = useState(localWo.erfin_number || '');
  const [erfinDate, setErfinDate] = useState(localWo.erfin_date || '');
  const [erfinReadyDate, setErfinReadyDate] = useState(localWo.erfin_ready_date || '');
  const [erfinNote, setErfinNote] = useState(localWo.erfin_note || '');
  const [hasFile, setHasFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isHistorical = localWo.stage && ['permit_process', 'permit_ready', 'akses_process', 'akses_ready', 'implementasi', 'rfi_done', 'dokumen_done', 'bast', 'invoice', 'completed'].includes(localWo.stage) && !localWo.erfin_number;



  const handleLanjutPermit = async () => {
    setIsSaving(true);
    try {
      const fields = { stage: 'permit_process', erfin_number: erfinNo, erfin_date: erfinDate, erfin_ready_date: erfinReadyDate, erfin_note: erfinNote };
      await db.query(`UPDATE ${localWo.id} MERGE $data`, { data: { stage: 'permit_process', erfin_number: erfinNo, erfin_date: erfinDate, erfin_ready_date: erfinReadyDate, erfin_note: erfinNote, updated_at: new Date().toISOString() } });
      onFieldsSaved?.(fields);
      onUpdateStage('permit_process');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (stageIdx < 2 && localWo.stage !== 'erfin_process' && localWo.stage !== 'erfin_ready') {
    return (
      <div className="max-w-4xl animate-in fade-in">
        <div className="bg-slate-50 border border-slate-200 text-slate-500 p-8 rounded-xl text-center">
          <p className="font-bold">ERFIN dapat diisi setelah Survey OK.</p>
        </div>
      </div>
    );
  }

  if (stageIdx > 2 && localWo.stage !== 'erfin_process' && localWo.stage !== 'erfin_ready') {
    if (isHistorical) {
      return (
        <div className="max-w-4xl animate-in fade-in">
          <div className="bg-slate-50 border border-slate-200 text-slate-600 p-4 rounded-xl">
            <p className="font-bold">Data ERFIN tidak tersedia untuk site yang diimpor dari Excel.</p>
            <p className="text-sm">Isi jika diperlukan.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-4xl animate-in fade-in">
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl">
          <h3 className="font-bold text-emerald-800 mb-4">ERFIN Selesai</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-emerald-600/70 block mb-1">Nomor ERFIN</span>
              <span className="font-medium text-emerald-900">{localWo.erfin_number || erfinNo}</span>
            </div>
            <div>
              <span className="text-emerald-600/70 block mb-1">Tanggal ERFIN</span>
              <span className="font-medium text-emerald-900">{localWo.erfin_date || erfinDate}</span>
            </div>
            <div>
              <span className="text-emerald-600/70 block mb-1">Tanggal ERFIN Ready</span>
              <span className="font-medium text-emerald-900">{localWo.erfin_ready_date || erfinReadyDate}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-in fade-in">
      <h2 className="text-lg font-black text-slate-800 mb-6">Dokumen ERFIN</h2>
      
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Nomor ERFIN *</label>
          <input type="text" value={erfinNo} onChange={e => setErfinNo(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Masukkan nomor dokumen ERFIN..." />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Tanggal ERFIN *</label>
            <input type="date" value={erfinDate} onChange={e => setErfinDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Tanggal ERFIN Ready</label>
            <input type="date" value={erfinReadyDate} onChange={e => setErfinReadyDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5 mt-2">Upload Dokumen ERFIN *</label>
          <label className={clsx("border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer group mb-2", hasFile ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50")}>
            <input type="file" className="hidden" onChange={(e) => { if(e.target.files && e.target.files.length > 0) setHasFile(true); }} />
            <div className={clsx("w-12 h-12 rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", hasFile ? "bg-emerald-500 text-white" : "bg-white text-blue-500")}>
              {hasFile ? <FileText className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            </div>
            <p className={clsx("text-sm font-bold", hasFile ? "text-emerald-700" : "text-slate-700")}>
              {hasFile ? "Dokumen Terunggah" : "Upload Dokumen ERFIN"}
            </p>
          </label>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Catatan</label>
          <textarea value={erfinNote} onChange={e => setErfinNote(e.target.value)} rows={2} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Opsional..." />
        </div>

        <div className="flex items-center justify-end mt-8 pt-6 border-t border-slate-100">
          <button onClick={handleLanjutPermit} disabled={!erfinNo || !hasFile || isSaving} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {isSaving ? 'Menyimpan...' : 'Update ERFIN Stage'} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
