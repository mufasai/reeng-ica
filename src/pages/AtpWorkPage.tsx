import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { atpWorkOrders, siteMasterRecords, workOrderLogs, teams, people, teamMembersRecords } from '../data/mockData';
import { CheckCircle2, ChevronRight, Upload, FileText, Briefcase, FolderCheck, Banknote, ImageIcon, Clock, Download, Paperclip } from 'lucide-react';
import clsx from 'clsx';
import { SaveIndicator, AutoSaveInput } from '../components/work-orders/AtpShared';
import { PermitSection } from '../components/work-orders/PermitSection';
import { ImplSection } from '../components/work-orders/ImplSection';
import { PengajuanPembayaran } from '../components/work-orders/PengajuanPembayaran';

type WorkStep = 'permit' | 'implementasi' | 'atp' | 'penagihan' | 'foto' | 'file' | 'log';

const STAGE_STEPS = ['imported', 'permit', 'implementasi', 'atp', 'bast', 'invoice', 'completed'];
const STAGE_LABELS = ['1·Imported', '2·Permit', '3·Implementasi', '4·ATP', '5·BAST', '6·Invoice', '7·Selesai'];

const INNER_TABS: { id: WorkStep; label: string; icon: any }[] = [
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
  const [activeTab, setActiveTab] = useState<WorkStep>('permit');
  const [localWo, setLocalWo] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');

  useEffect(() => {
    const wo = atpWorkOrders.find(w => w.id === id);
    if (wo) setLocalWo({ ...wo });
  }, [id]);

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
      workOrderLogs.push({ id: `wol-${Date.now()}`, work_order_id: localWo.id, action: `updated ${field} → ${value}`, user_id: currentUser?.id || 'system', timestamp: new Date().toISOString() });
    } catch { setSaveStatus('error'); }
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

  const currentStageIdx = STAGE_STEPS.indexOf(localWo.stage || 'imported');

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
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

      {/* STAGE STEPPER */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex items-start justify-between relative">
        <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
        <div className="absolute top-1/2 left-10 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `calc(${(currentStageIdx / (STAGE_STEPS.length - 1)) * 100}% - 40px)` }} />
        {STAGE_STEPS.map((step, idx) => {
          const isDone = idx < currentStageIdx;
          const isCurrent = idx === currentStageIdx;
          return (
            <div key={step} className="relative z-10 flex flex-col items-center gap-3">
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm',
                isDone ? 'bg-emerald-500 text-white border-2 border-emerald-500' :
                isCurrent ? 'bg-blue-600 text-white border-2 border-blue-600 ring-4 ring-blue-100' :
                'bg-white text-slate-400 border-2 border-slate-200')}>
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : (idx + 1)}
              </div>
              <span className={clsx('text-[10px] font-black uppercase tracking-widest whitespace-nowrap',
                isCurrent ? 'text-blue-700' : isDone ? 'text-slate-700' : 'text-slate-400')}>
                {STAGE_LABELS[idx].split('·')[1]}
              </span>
            </div>
          );
        })}
      </div>

      {/* WORKSPACE TABS */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto hide-scrollbar">
          {INNER_TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={clsx('flex items-center gap-2 px-6 py-4 border-b-2 text-sm font-semibold transition-colors whitespace-nowrap',
                  active ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50')}>
                <Icon className={clsx('w-4 h-4', active ? 'text-blue-600' : 'text-slate-400')} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 p-8">
          {activeTab === 'permit' && (
            <div className="max-w-4xl animate-in fade-in">
              <PermitSection localWo={localWo} handleFieldSave={handleFieldSave} handleUpdateStage={handleUpdateStage} saveStatus={saveStatus} canEdit={canEditFields} />
            </div>
          )}

          {activeTab === 'implementasi' && (
            <div className="max-w-4xl animate-in fade-in">
              <ImplSection localWo={localWo} handleFieldSave={handleFieldSave} handleUpdateStage={handleUpdateStage} saveStatus={saveStatus} canEdit={canEditFields} teamOptions={teamOptions} leaderOptions={leaderOptions} />
            </div>
          )}

          {activeTab === 'atp' && (
            <div className="max-w-4xl animate-in fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-slate-800">ATP & Dokumen</h2>
                <SaveIndicator status={saveStatus} />
              </div>
              <div className="space-y-0 mb-8">
                <AutoSaveInput label="ATP Number" value={localWo.atp_number} field="atp_number" onSave={handleFieldSave} locked={!!localWo.atp_number && !canEditFields} />
                <AutoSaveInput label="PDID" value={localWo.ppid || localWo.pdid} field="pdid" onSave={handleFieldSave} />
                <AutoSaveInput label="Status ATP" value={localWo.status_atp || localWo.atp_status} field="atp_status" type="select" onSave={handleFieldSave}
                  options={[{ label: 'REQUEST PDID', value: 'REQUEST PDID' }, { label: 'UPLOAD TAGGING DONE', value: 'UPLOAD TAGGING DONE' }, { label: 'TAGGING N/A', value: 'TAGGING N/A' }, { label: 'HOLD', value: 'HOLD' }]} />
                <AutoSaveInput label="Note Foto Evidence" value={localWo.note_foto_evidence || localWo.foto_evidence_notes} field="foto_evidence_notes" type="textarea" onSave={handleFieldSave} />
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-sm font-bold text-slate-700">Upload ATP Documents & Certificate</p>
              </div>
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
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Upload Foto
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square flex flex-col items-center justify-center shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                    <ImageIcon className="w-8 h-8 text-slate-300 mb-2 group-hover:text-blue-400 transition-colors" />
                    <p className="text-[10px] text-slate-400 text-center px-2">Sector {i} View</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="animate-in fade-in">
              <h2 className="text-lg font-black text-slate-800 mb-6">File & Lampiran</h2>
              <div className="space-y-3">
                {[
                  { name: 'Permit_Approval.pdf', type: 'Permit', size: '2.4 MB', date: '10 Mar 2026' },
                  { name: 'Implementasi_BAST_Draft.docx', type: 'Implementasi', size: '1.1 MB', date: '14 Mar 2026' },
                  { name: 'ATP_Checklist.xlsx', type: 'ATP', size: '850 KB', date: '15 Mar 2026' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{f.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{f.type}</span>
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
                {workOrderLogs.filter(l => l.work_order_id === localWo.id)
                  .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map(log => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-slate-200 border-4 border-white" />
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
