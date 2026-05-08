import { useState } from 'react';
import { Upload, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';
import { db } from '../../db';

export const RescopingSurveyTab = ({ localWo, onUpdateStage, onFieldsSaved }: any) => {
  const { currentUser } = useAuth();
  const [surveyDate, setSurveyDate] = useState(localWo.survey_date || '');
  const [surveyResult, setSurveyResult] = useState<'ok' | 'nok' | null>(localWo.survey_result || null);
  const [nokReason, setNokReason] = useState(localWo.survey_nok_reason || '');

  const isHistorical = localWo.stage && ['permit_process', 'permit_ready', 'akses_process', 'akses_ready', 'implementasi', 'rfi_done', 'dokumen_done', 'bast', 'invoice', 'completed'].includes(localWo.stage) && !localWo.survey_date && !localWo.survey_result;

  const handleStartSurvey = () => {
    onUpdateStage('survey');
  };

  const handleLanjutErfin = async () => {
    if (!surveyDate || surveyResult !== 'ok') return;
    const fields = { stage: 'erfin_process', survey_date: surveyDate, survey_result: 'ok' };
    await db.query(`UPDATE ${localWo.id} SET stage = 'erfin_process', survey_date = $date, survey_result = 'ok', updated_at = time::now()`, { date: surveyDate });
    onFieldsSaved?.(fields);
    onUpdateStage('erfin_process');
  };

  const handleTandaiNok = async () => {
    if (!nokReason) return;
    const fields = { stage: 'survey_nok', survey_result: 'nok', survey_nok_reason: nokReason };
    await db.query(`UPDATE ${localWo.id} SET stage = 'survey_nok', survey_result = 'nok', survey_nok_reason = $reason, updated_at = time::now()`, { reason: nokReason });
    onFieldsSaved?.(fields);
    onUpdateStage('survey_nok');
  };

  const handleReset = async () => {
    if (confirm('Yakin ingin reset status survey?')) {
      const fields = { stage: 'survey', survey_result: null, survey_nok_reason: null };
      await db.query(`UPDATE ${localWo.id} SET stage = 'survey', survey_result = null, survey_nok_reason = null, updated_at = time::now()`);
      onFieldsSaved?.(fields);
      onUpdateStage('survey');
    }
  };

  // STATE A
  if (localWo.stage === 'assigned' || localWo.stage === 'imported') {
    return (
      <div className="max-w-4xl animate-in fade-in">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl mb-6">
          <p className="font-bold mb-1">Mulai dengan mengisi data survei.</p>
          <p className="text-sm">Survei menentukan apakah site layak untuk dilanjutkan ke proses ERFIN dan Permit.</p>
        </div>
        <button onClick={handleStartSurvey} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm">
          Mulai Survei
        </button>
      </div>
    );
  }

  // STATE C
  if (localWo.stage === 'survey_nok') {
    return (
      <div className="max-w-4xl animate-in fade-in">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6">
          <p className="font-bold flex items-center gap-2"><AlertCircle className="w-5 h-5"/> ✗ Survey NOK — Proses Dihentikan</p>
          <p className="text-sm mt-1">Alasan: {localWo.survey_nok_reason || nokReason}</p>
        </div>
        {['operational', 'admin'].includes(currentUser?.role || '') && (
          <button onClick={handleReset} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 flex items-center gap-2 shadow-sm">
            <RefreshCw className="w-4 h-4" /> Reset ke Survey
          </button>
        )}
      </div>
    );
  }

  // STATE D & HISTORICAL
  if (localWo.stage !== 'survey') {
    if (isHistorical) {
      return (
        <div className="max-w-4xl animate-in fade-in">
          <div className="bg-slate-50 border border-slate-200 text-slate-600 p-4 rounded-xl">
            <p className="font-bold">Data survei tidak tersedia untuk site yang diimpor dari Excel.</p>
            <p className="text-sm">Isi jika diperlukan.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="max-w-4xl animate-in fade-in">
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl">
          <h3 className="font-bold text-emerald-800 mb-4">Survey Selesai</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-emerald-600/70 block mb-1">Tanggal Survey</span>
              <span className="font-medium text-emerald-900">{localWo.survey_date || surveyDate}</span>
            </div>
            <div>
              <span className="text-emerald-600/70 block mb-1">Hasil</span>
              <span className="font-bold text-emerald-700">✓ OK</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STATE B
  return (
    <div className="max-w-2xl animate-in fade-in">
      <h2 className="text-lg font-black text-slate-800 mb-6">Detail Survey</h2>
      
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Tanggal Survey *</label>
          <input type="date" value={surveyDate} onChange={e => setSurveyDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Hasil Survey *</label>
          <div className="flex gap-4">
            <label className={clsx("flex items-center gap-2 px-4 py-3 border rounded-lg cursor-pointer flex-1 transition-all", surveyResult === 'ok' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:bg-slate-50")}>
              <input type="radio" name="hasil" value="ok" checked={surveyResult === 'ok'} onChange={() => setSurveyResult('ok')} className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">OK — Lanjut ke ERFIN</span>
            </label>
            <label className={clsx("flex items-center gap-2 px-4 py-3 border rounded-lg cursor-pointer flex-1 transition-all", surveyResult === 'nok' ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 hover:bg-slate-50")}>
              <input type="radio" name="hasil" value="nok" checked={surveyResult === 'nok'} onChange={() => setSurveyResult('nok')} className="w-4 h-4 text-red-600" />
              <span className="font-semibold">NOK — Hentikan sementara</span>
            </label>
          </div>
        </div>

        {surveyResult === 'ok' && (
          <div className="animate-in slide-in-from-top-2">
            <label className="block text-sm font-bold text-slate-700 mb-1.5 mt-2">Upload Laporan Survey + Dokumen Material</label>
            <label className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group mb-6">
              <input type="file" multiple className="hidden" />
              <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-sm font-bold text-slate-700">Upload Dokumen Survey</p>
              <p className="text-xs text-slate-400 mt-1">Maksimal 10 file</p>
            </label>
            
            <button onClick={handleLanjutErfin} disabled={!surveyDate} className="w-full px-5 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              Lanjut ke ERFIN <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {surveyResult === 'nok' && (
          <div className="animate-in slide-in-from-top-2">
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Alasan NOK *</label>
            <textarea value={nokReason} onChange={e => setNokReason(e.target.value)} rows={3} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 mb-6" placeholder="Jelaskan alasan survey NOK..." />
            
            <button onClick={handleTandaiNok} disabled={!nokReason} className="w-full px-5 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              Tandai NOK
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
