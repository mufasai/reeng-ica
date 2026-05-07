import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { atpWorkOrders, siteMasterRecords, workOrderLogs, teams, people, teamMembersRecords } from '../data/mockData';
import { CheckCircle2, ChevronRight, Upload, FileText, Briefcase, FolderCheck, Banknote, ImageIcon, Clock, Download, Paperclip, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { SaveIndicator, AutoSaveInput } from '../components/work-orders/AtpShared';
import { PermitSection } from '../components/work-orders/PermitSection';
import { ImplSection } from '../components/work-orders/ImplSection';
import { CombatImplChecklist } from '../components/work-orders/CombatImplChecklist';
import { PengajuanPembayaran } from '../components/work-orders/PengajuanPembayaran';
import { RescopingSurveyTab } from '../components/work-orders/RescopingSurveyTab';
import { RescopingErfinTab } from '../components/work-orders/RescopingErfinTab';
import { db } from '../db';
import {
  COMBAT_STEPPER_NODES,
  RESCOPING_STEPPER_NODES,
  DEFAULT_COMBAT_IMPL_STEPS,
  type CombatImplSteps,
} from '../config/stagePipelines';

type WorkStep = 'survey' | 'erfin' | 'permit' | 'implementasi' | 'atp' | 'penagihan' | 'foto' | 'file' | 'log';

// Generic (Filter/Blacksite/L2H) stepper
const STAGE_STEPS = ['imported', 'permit', 'implementasi', 'atp', 'bast', 'invoice', 'completed'];
const STAGE_LABELS = ['1·Imported', '2·Permit', '3·Implementasi', '4·ATP', '5·BAST', '6·Invoice', '7·Selesai'];

const BASE_TABS: { id: WorkStep; label: string; icon: any }[] = [
  { id: 'permit',      label: 'Permit',        icon: FileText },
  { id: 'implementasi',label: 'Implementasi',  icon: Briefcase },
  { id: 'atp',         label: 'ATP & Dokumen', icon: FolderCheck },
  { id: 'penagihan',   label: 'Penagihan',     icon: Banknote },
  { id: 'foto',        label: 'Foto',          icon: ImageIcon },
  { id: 'file',        label: 'File & Lampiran', icon: Paperclip },
  { id: 'log',         label: 'Log',           icon: Clock },
];

const InlineMetaField = ({ label, value, field, onSave }: any) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  useEffect(() => setVal(value || ''), [value]);
  const handleBlur = () => { setEditing(false); if (val !== (value || '')) onSave(field, val); };
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap text-[11px]">
      <span className="text-slate-500 font-semibold">{label}:</span>
      {editing ? (
        <input autoFocus value={val} onChange={e => setVal(e.target.value)} onBlur={handleBlur}
          onKeyDown={e => e.key === 'Enter' && handleBlur()}
          className="px-1.5 py-0.5 border border-blue-400 rounded outline-none text-slate-800 font-mono font-bold w-32 shadow-sm" />
      ) : (
        <span onClick={() => setEditing(true)} className="font-mono font-bold text-slate-800 cursor-pointer hover:bg-slate-100 px-1.5 py-0.5 -mx-1.5 rounded transition-colors">
          {value || <span className="text-slate-300 italic font-sans font-normal">kosong</span>}
        </span>
      )}
    </div>
  );
};

const AtpWorkPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, can } = useAuth();
  const [searchParams] = useSearchParams();
  const [localWo, setLocalWo] = useState<any>(null);
  const isRescopingParam = localWo?.project_type === 'RE-SCOPING' || localWo?.project_type === 'RESCOPING';
  const initialTab = searchParams.get('tab') === 'penagihan' ? 'penagihan' : 'permit';
  const [activeTab, setActiveTab] = useState<WorkStep>(initialTab as any);
  
  // Update initial tab for rescoping if not explicitly set to something else
  useEffect(() => {
    if (isRescopingParam && activeTab === 'permit' && !searchParams.get('tab')) {
      setActiveTab('survey');
    }
  }, [isRescopingParam, searchParams]);
  
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [dbLogs, setDbLogs] = useState<any[]>([]);
  const [dbFiles, setDbFiles] = useState<any[]>([]);
  const [combatSteps, setCombatSteps] = useState<CombatImplSteps>(DEFAULT_COMBAT_IMPL_STEPS);

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToastMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  };

  useEffect(() => {
    const wo = atpWorkOrders.find(w => w.id === id);
    if (wo) {
      setLocalWo({ ...wo });
      // Load combat steps from DB for COMBAT sites
      if (wo.project_type === 'COMBAT') {
        db.query(`SELECT combat_impl_steps FROM sites:${wo.site_id}`)
          .then((res: any) => {
            const steps = res?.[0]?.[0]?.combat_impl_steps;
            if (steps) setCombatSteps({ ...DEFAULT_COMBAT_IMPL_STEPS, ...steps });
          })
          .catch(() => {});
      }
    }
  }, [id]);

  useEffect(() => {
    if (!id || !localWo) return;
    const fetchDbData = async () => {
      try {
        // Fetch logs
        const logsRes = await db.query('SELECT * FROM site_stage_logs WHERE work_order_id = $id', { id });
        if (logsRes?.[0] && Array.isArray(logsRes[0]) && logsRes[0].length > 0) {
          setDbLogs(logsRes[0]);
        } else {
          setDbLogs(workOrderLogs.filter(l => l.work_order_id === id));
        }

        // Fetch files
        const filesRes = await db.query('SELECT * FROM site_files WHERE work_order_id = $id', { id });
        if (filesRes?.[0] && Array.isArray(filesRes[0])) {
          setDbFiles(filesRes[0]);
        }
      } catch (err) {
        console.error('Failed to fetch DB files/logs:', err);
        setDbLogs(workOrderLogs.filter(l => l.work_order_id === id));
      }
    };
    fetchDbData();
  }, [id, localWo]);

  const site = useMemo(() => siteMasterRecords.find(s => s.site_id === localWo?.site_id), [localWo?.site_id]);
  const canEditFields = can('site.edit_data');

  if (!localWo || !site) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-slate-500 mb-4">Work Order tidak ditemukan.</p>
        <button onClick={() => navigate('/sites')} className="text-blue-600 hover:underline">Kembali</button>
      </div>
    );
  }

  const patchWO = async (updates: any) => {
    await new Promise(r => setTimeout(r, 300));
    const target = atpWorkOrders.find(w => w.id === localWo.id);
    if (target) Object.assign(target, updates);
    setLocalWo((prev: any) => ({ ...prev, ...updates }));
  };

  const handleFieldSave = async (field: string, value: any) => {
    setSaveStatus('saving');
    try {
      await patchWO({ [field]: value });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);

      const logData = {
        work_order_id: localWo.id,
        site_id: localWo.site_id,
        action: `Field '${field}' diperbarui menjadi '${value}'`,
        user_id: currentUser?.id || 'system',
        timestamp: new Date().toISOString()
      };

      // Save log to DB
      try {
        await db.query('CREATE site_stage_logs CONTENT $data', { data: logData });
        const logsRes = await db.query('SELECT * FROM site_stage_logs WHERE work_order_id = $id', { id: localWo.id });
        if (logsRes?.[0] && Array.isArray(logsRes[0])) {
          setDbLogs(logsRes[0]);
        } else {
          setDbLogs(prev => [logData, ...prev]);
        }
      } catch (err) {
        console.error('Failed to create DB log:', err);
        setDbLogs(prev => [logData, ...prev]);
      }
    } catch { setSaveStatus('error'); }
  };

  const handleFileUpload = async (category: 'document' | 'photo', files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSaveStatus('saving');
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileData = {
          work_order_id: localWo.id,
          site_id: localWo.site_id,
          name: file.name,
          type: category === 'photo' ? 'Photo' : file.name.split('.').pop()?.toUpperCase() || 'File',
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          category,
          date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
          uploaded_by: currentUser?.id || 'system',
          timestamp: new Date().toISOString()
        };

        await db.query('CREATE site_files CONTENT $data', { data: fileData });

        const logData = {
          work_order_id: localWo.id,
          site_id: localWo.site_id,
          action: `Mengunggah ${category === 'photo' ? 'foto' : 'dokumen'} '${file.name}'`,
          user_id: currentUser?.id || 'system',
          timestamp: new Date().toISOString()
        };
        await db.query('CREATE site_stage_logs CONTENT $data', { data: logData });
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
      showToastMsg(`Sukses: ${files.length} file berhasil diunggah!`);

      const filesRes = await db.query('SELECT * FROM site_files WHERE work_order_id = $id', { id: localWo.id });
      if (filesRes?.[0] && Array.isArray(filesRes[0])) {
        setDbFiles(filesRes[0]);
      }
      const logsRes = await db.query('SELECT * FROM site_stage_logs WHERE work_order_id = $id', { id: localWo.id });
      if (logsRes?.[0] && Array.isArray(logsRes[0])) {
        setDbLogs(logsRes[0]);
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
      setSaveStatus('error');
      showToastMsg('Gagal mengunggah file. Silakan coba kembali!', 'error');
    }
  };

  const handleUpdateStage = async (next: string) => {
    await handleFieldSave('stage', next);
  };

  const teamOptions = teams.map(t => ({ label: t.name, value: t.id }));
  const selectedTeam = teams.find(t => t.id === localWo.team_id);
  const leaderOptions = selectedTeam
    ? teamMembersRecords.filter(tm => tm.team_id === selectedTeam.id && tm.role === 'Team Leader').map(tm => {
        const p = people.find(p => p.id === tm.person_id);
        return { label: p?.name || tm.person_id, value: tm.person_id };
      })
    : [];

  const isCombat = localWo.project_type === 'COMBAT';
  const isRescoping = localWo.project_type === 'RE-SCOPING' || localWo.project_type === 'RESCOPING';

  // Map raw stage to stepper node index
  const currentStageIdx = isCombat
    ? COMBAT_STEPPER_NODES.findIndex(n => n.stages.includes(localWo.stage || 'imported'))
    : isRescoping
    ? RESCOPING_STEPPER_NODES.findIndex(n => n.stages.includes(localWo.stage || 'imported'))
    : STAGE_STEPS.indexOf(localWo.stage || 'imported');

  const tabsToRender = useMemo(() => {
    if (isRescoping) {
      return [
        { id: 'survey' as WorkStep, label: 'Survey', icon: FolderCheck, disabled: currentStageIdx < 1 && localWo.stage !== 'assigned' },
        { id: 'erfin' as WorkStep, label: 'ERFIN', icon: FileText, disabled: currentStageIdx < 2 },
        ...BASE_TABS.map(t => ({
          ...t,
          disabled: (t.id === 'permit' && currentStageIdx < 3) || 
                    (t.id === 'implementasi' && currentStageIdx < 4) ||
                    (t.id === 'atp' && currentStageIdx < 6) ||
                    (t.id === 'penagihan' && currentStageIdx < 7)
        }))
      ];
    }
    return BASE_TABS.map(t => ({ ...t, disabled: false }));
  }, [isRescoping, currentStageIdx, localWo.stage]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300 relative">
      {/* Visual Success/Failed Pop-up Alert Toast */}
      {toast.show && (
        <div className={clsx(
          "fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border animate-in slide-in-from-top-4 duration-300",
          toast.type === 'success' 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-red-50 text-red-800 border-red-200"
        )}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="text-sm font-bold tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* BACK TO SITE DETAIL BUTTON */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(`/sites/${localWo.site_id}`)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200/80 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          Kembali ke Detail Site ({localWo.site_id})
        </button>
        <SaveIndicator status={saveStatus} />
      </div>

      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-6 py-5">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {localWo.atp_number || `ATP-${localWo.id.slice(-6).toUpperCase()}`}
          </h1>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded uppercase tracking-wider">Sektor {localWo.sector}</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded uppercase tracking-wider border border-blue-200">{localWo.project_type}</span>
          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded uppercase tracking-wider border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 pt-3 border-t border-slate-100">
          <InlineMetaField label="Site ID" value={localWo.site_id} field="site_id" onSave={handleFieldSave} />
          <span className="text-slate-300">·</span>
          <InlineMetaField label="PO" value={localWo.po_number} field="po_number" onSave={handleFieldSave} />
          <span className="text-slate-300">·</span>
          <InlineMetaField label="SOW" value={localWo.sow_id} field="sow_id" onSave={handleFieldSave} />
          <span className="text-slate-300">·</span>
          <InlineMetaField label="Team" value={localWo.team} field="team" onSave={handleFieldSave} />
        </div>
      </div>

      {/* SURVEY NOK RED BANNER */}
      {isRescoping && localWo.stage === 'survey_nok' && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="font-bold flex items-center gap-2"><AlertCircle className="w-5 h-5"/> ✗ Survey NOK — Proses Dihentikan</p>
            <p className="text-sm mt-1 ml-7">Alasan: {localWo.survey_nok_reason}</p>
          </div>
          {['operational', 'admin'].includes(currentUser?.role || '') && (
            <button onClick={async () => {
              if (confirm('Yakin ingin reset status survey?')) {
                await db.query(`UPDATE sites:${localWo.site_id} SET stage = 'survey', survey_result = null, survey_nok_reason = null, updated_at = time::now()`);
                handleUpdateStage('survey');
              }
            }} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 flex items-center gap-2 shadow-sm">
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          )}
        </div>
      )}

      {/* STAGE STEPPER */}
      {(() => {
        const nodes = isCombat
          ? COMBAT_STEPPER_NODES.map(n => n.label)
          : isRescoping
          ? RESCOPING_STEPPER_NODES.map(n => n.label)
          : STAGE_LABELS.map(l => l.split('·')[1]);
        const nodeCount = nodes.length;
        return (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex items-start justify-between relative">
            <div className="absolute top-7 left-10 right-10 h-0.5 bg-slate-100 z-0" />
            <div className="absolute top-7 left-10 h-0.5 bg-blue-500 z-0 transition-all duration-500"
              style={{ width: `calc(${(Math.max(0, currentStageIdx) / (nodeCount - 1)) * 100}% - 40px)` }} />
            {nodes.map((label, idx) => {
              let isDone = idx < currentStageIdx;
              let isCurrent = idx === currentStageIdx;

              let isRed = false;
              if (isRescoping && label === 'Survey' && localWo.stage === 'survey_nok') {
                isRed = true;
                isDone = false;
                isCurrent = false;
              }

              return (
                <div key={label} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm',
                    isRed ? 'bg-red-500 text-white border-2 border-red-500' :
                    isDone ? 'bg-emerald-500 text-white border-2 border-emerald-500' :
                    isCurrent ? 'bg-blue-600 text-white border-2 border-blue-600 ring-4 ring-blue-100' :
                    'bg-white text-slate-400 border-2 border-slate-200')}>
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : (idx + 1)}
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={clsx('text-[10px] font-black uppercase tracking-widest whitespace-nowrap',
                      isRed ? 'text-red-600' : isCurrent ? 'text-blue-700' : isDone ? 'text-slate-700' : 'text-slate-400')}>
                      {label}
                    </span>
                    {isRed && <span className="text-[10px] font-bold text-red-500 mt-0.5">✗ NOK</span>}
                    {isRescoping && label === 'Survey' && isDone && localWo.survey_date && (
                      <span className="text-[9px] font-medium text-slate-400 mt-0.5">{localWo.survey_date}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* WORKSPACE TABS */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto hide-scrollbar">
          {tabsToRender.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const disabled = tab.disabled;
            return (
              <button key={tab.id} onClick={() => !disabled && setActiveTab(tab.id)}
                className={clsx('flex items-center gap-2 px-6 py-4 border-b-2 text-sm font-semibold transition-colors whitespace-nowrap',
                  active ? 'border-blue-600 text-blue-700 bg-white' : 
                  disabled ? 'border-transparent text-slate-300 cursor-not-allowed bg-slate-50/50' : 
                  'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50')}>
                <Icon className={clsx('w-4 h-4', active ? 'text-blue-600' : disabled ? 'text-slate-300' : 'text-slate-400')} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 p-8">
          {activeTab === 'survey' && isRescoping && (
            <RescopingSurveyTab localWo={localWo} stageIdx={currentStageIdx} onUpdateStage={handleUpdateStage} saveStatus={saveStatus} />
          )}

          {activeTab === 'erfin' && isRescoping && (
            <RescopingErfinTab localWo={localWo} stageIdx={currentStageIdx} onUpdateStage={handleUpdateStage} saveStatus={saveStatus} />
          )}

          {activeTab === 'permit' && (
            <div className="max-w-4xl animate-in fade-in">
              <PermitSection localWo={localWo} handleFieldSave={handleFieldSave} handleUpdateStage={handleUpdateStage} saveStatus={saveStatus} canEdit={canEditFields} />
            </div>
          )}

          {activeTab === 'implementasi' && (
            <div className="max-w-4xl animate-in fade-in">
              {isCombat ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-black text-slate-800">Implementasi — Combat</h2>
                    <SaveIndicator status={saveStatus} />
                  </div>
                  <CombatImplChecklist
                    siteId={localWo.site_id}
                    steps={combatSteps}
                    onUpdate={steps => setCombatSteps(steps)}
                    onMarkSelesai={() => handleUpdateStage('dokumen_done')}
                    currentStage={localWo.stage || 'imported'}
                    canEdit={canEditFields}
                  />
                </div>
              ) : (
                <ImplSection localWo={localWo} handleFieldSave={handleFieldSave} handleUpdateStage={handleUpdateStage} saveStatus={saveStatus} canEdit={canEditFields} teamOptions={teamOptions} leaderOptions={leaderOptions} isRescoping={isRescoping} />
              )}
            </div>
          )}

          {activeTab === 'atp' && (
            <div className="max-w-4xl animate-in fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-slate-800">ATP &amp; Dokumen</h2>
                <SaveIndicator status={saveStatus} />
              </div>
              <div className="space-y-0 mb-8">
                <AutoSaveInput label="ATP Number" value={localWo.atp_number} field="atp_number" onSave={handleFieldSave} locked={!!localWo.atp_number && !canEditFields} />
                <AutoSaveInput label="PDID" value={localWo.ppid || localWo.pdid} field="pdid" onSave={handleFieldSave} />
                <AutoSaveInput label="Status ATP" value={localWo.status_atp || localWo.atp_status} field="atp_status" type="select" onSave={handleFieldSave}
                  options={[{ label: 'REQUEST PDID', value: 'REQUEST PDID' }, { label: 'UPLOAD TAGGING DONE', value: 'UPLOAD TAGGING DONE' }, { label: 'TAGGING N/A', value: 'TAGGING N/A' }, { label: 'HOLD', value: 'HOLD' }]} />
                <AutoSaveInput label="Note Foto Evidence" value={localWo.note_foto_evidence || localWo.foto_evidence_notes} field="foto_evidence_notes" type="textarea" onSave={handleFieldSave} />
              </div>
              
              <label className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group">
                <input type="file" multiple className="hidden" onChange={e => handleFileUpload('document', e.target.files)} />
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-sm font-bold text-slate-700">Upload ATP Documents &amp; Certificate</p>
                <p className="text-xs text-slate-400 mt-1">Pilih satu atau beberapa dokumen untuk diunggah</p>
              </label>

              {canEditFields && (
                <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                  <button className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 shadow-sm">Simpan Draft</button>
                  <button onClick={() => handleUpdateStage('bast')} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2">
                    Tandai ATP Selesai <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'penagihan' && (
            <PengajuanPembayaran siteId={site.site_id} />
          )}

          {activeTab === 'foto' && (
            <div className="animate-in fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-slate-800">Galeri Foto</h2>
                <label className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 cursor-pointer transition-colors">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleFileUpload('photo', e.target.files)} />
                  <Upload className="w-4 h-4" /> Upload Foto
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {dbFiles.filter(f => f.category === 'photo').map((file, i) => (
                  <div key={file.id || i} className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square flex flex-col items-center justify-center shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                    <ImageIcon className="w-8 h-8 text-blue-400 mb-2" />
                    <p className="text-[11px] font-bold text-slate-700 px-2 text-center truncate w-full">{file.name}</p>
                    <p className="text-[9px] text-slate-400 text-center mt-0.5">{file.size} · {file.date}</p>
                  </div>
                ))}
                {dbFiles.filter(f => f.category === 'photo').length === 0 && (
                  [1,2,3,4].map(i => (
                    <div key={i} className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square flex flex-col items-center justify-center shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                      <ImageIcon className="w-8 h-8 text-slate-300 mb-2 group-hover:text-blue-400 transition-colors" />
                      <p className="text-[10px] text-slate-400 text-center px-2">Sector {i} View</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="animate-in fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-slate-800">File &amp; Lampiran</h2>
                <label className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 cursor-pointer transition-colors">
                  <input type="file" multiple className="hidden" onChange={e => handleFileUpload('document', e.target.files)} />
                  <Upload className="w-4 h-4" /> Upload Dokumen
                </label>
              </div>
              <div className="space-y-3">
                {dbFiles.filter(f => f.category === 'document' || !f.category).map((f, i) => (
                  <div key={f.id || i} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{f.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{f.type || 'DOCUMENT'}</span>
                          <span>{f.size}</span><span>·</span><span>{f.date}</span>
                        </div>
                      </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'log' && (
            <div className="animate-in fade-in max-w-3xl">
              <h2 className="text-lg font-black text-slate-800 mb-6">Activity Log</h2>
              <div className="relative pl-6 border-l-2 border-slate-100 space-y-6">
                {dbLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((log, i) => (
                  <div key={log.id || i} className="relative">
                    <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-blue-500 border-4 border-white" />
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {log.user_id.substring(0,2).toUpperCase()}
                      </div>
                      <div className="pt-1.5">
                        <p className="text-sm font-medium text-slate-800">{log.action}</p>
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />{new Date(log.timestamp).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AtpWorkPage;
