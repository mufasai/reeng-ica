import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  atpWorkOrders, siteMasterRecords, workOrderLogs, terminPengajuanRecords, teams, people, teamMembersRecords
} from '../data/mockData';
import { 
  CheckCircle2, ChevronRight, Upload, FileText, Briefcase, 
  FolderCheck, Banknote, ImageIcon, Clock, Plus, Download, Paperclip, AlertCircle
} from 'lucide-react';
import clsx from 'clsx';

// ─── Constants & Types ────────────────────────────────────────────────────────
type WorkStep = 'permit' | 'implementasi' | 'atp' | 'penagihan' | 'foto' | 'file' | 'log';

const STAGE_STEPS = ['imported', 'permit', 'implementasi', 'atp', 'bast', 'invoice', 'completed'];
const STAGE_LABELS = ['1·Imported', '2·Permit', '3·Implementasi', '4·ATP', '5·BAST', '6·Invoice', '7·Selesai'];

const INNER_TABS: { id: WorkStep; label: string; icon: any }[] = [
  { id: 'permit', label: 'Permit', icon: FileText },
  { id: 'implementasi', label: 'Implementasi', icon: Briefcase },
  { id: 'atp', label: 'ATP & Dokumen', icon: FolderCheck },
  { id: 'penagihan', label: 'Penagihan', icon: Banknote },
  { id: 'foto', label: 'Foto (N)', icon: ImageIcon },
  { id: 'file', label: 'File & Lampiran', icon: Paperclip },
  { id: 'log', label: 'Log', icon: Clock },
];

// ─── Helper Components ───────────────────────────────────────────────────────
const SaveIndicator = ({ status }: { status: 'idle'|'saving'|'saved'|'error' }) => {
  if (status === 'idle') return null;
  if (status === 'saving') return <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 animate-spin"/> Menyimpan...</span>;
  if (status === 'saved') return <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5 animate-in fade-in zoom-in duration-300"><CheckCircle2 className="w-3.5 h-3.5"/> Tersimpan</span>;
  if (status === 'error') return <span className="text-xs font-medium text-red-600 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5"/> Gagal</span>;
  return null;
}

const InlineMetaField = ({ label, value, field, onSave }: any) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  useEffect(() => setVal(value || ''), [value]);

  const handleBlur = () => {
    setEditing(false);
    if(val !== (value || '')) onSave(field, val);
  };
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap text-[11px]">
      <span className="text-slate-500 font-semibold">{label}:</span>
      {editing ? (
        <input 
          autoFocus 
          value={val} 
          onChange={e=>setVal(e.target.value)} 
          onBlur={handleBlur}
          onKeyDown={e => e.key === 'Enter' && handleBlur()}
          className="px-1.5 py-0.5 border border-blue-400 rounded outline-none text-slate-800 font-mono font-bold w-32 shadow-sm"
        />
      ) : (
        <span 
          onClick={() => setEditing(true)} 
          className="font-mono font-bold text-slate-800 cursor-pointer hover:bg-slate-100 px-1.5 py-0.5 -mx-1.5 rounded transition-colors"
        >
          {value || <span className="text-slate-300 italic font-sans font-normal">kosong</span>}
        </span>
      )}
    </div>
  );
}

const AutoSaveInput = ({ label, value, field, type="text", onSave, options, warningThresholdDays }: any) => {
  const [val, setVal] = useState(value || '');
  useEffect(() => { setVal(value || ''); }, [value]);

  const handleBlur = () => {
    if (val !== (value || '')) onSave(field, val);
  };

  const handleChange = (e: any) => {
    const newValue = type === 'checkbox' ? e.target.checked : e.target.value;
    setVal(newValue);
    if (type === 'select' || type === 'checkbox') {
       onSave(field, newValue);
    }
  };

  let textColor = "text-slate-800";
  if (type === 'date' && value && warningThresholdDays !== undefined) {
      const daysLeft = Math.floor((new Date(value).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      if (daysLeft < 0) textColor = "text-red-600";
      else if (daysLeft <= warningThresholdDays) textColor = "text-amber-600";
  }

  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-3 border-b border-slate-50 hover:bg-slate-50/50 px-2 -mx-2 rounded transition-colors">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      {type === 'select' ? (
         <select value={val} onChange={handleChange} className="w-full text-sm font-semibold text-slate-800 p-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all bg-white">
           <option value="">Select...</option>
           {options?.map((o:any) => <option key={o.value} value={o.value}>{o.label}</option>)}
         </select>
      ) : type === 'textarea' ? (
         <textarea value={val} onChange={handleChange} onBlur={handleBlur} className="w-full text-sm font-medium text-slate-800 p-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all min-h-[80px]" />
      ) : type === 'checkbox' ? (
         <input type="checkbox" checked={!!val} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
      ) : (
         <input type={type} value={val} onChange={handleChange} onBlur={handleBlur} className={clsx("w-full text-sm font-semibold p-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all", textColor)} />
      )}
    </div>
  )
}

// ─── Main Page Component ─────────────────────────────────────────────────────
const AtpWorkPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [activeTab, setActiveTab] = useState<WorkStep>('permit');
    const [localWo, setLocalWo] = useState<any>(null);
    const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');

    useEffect(() => {
        const wo = atpWorkOrders.find(w => w.id === id);
        if (wo) setLocalWo({ ...wo });
    }, [id]);

    const site = useMemo(() => siteMasterRecords.find(s => s.site_id === localWo?.site_id), [localWo?.site_id]);

    if (!localWo || !site) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <p className="text-slate-500 mb-4">Work Order tidak ditemukan.</p>
                <button onClick={() => navigate('/sites')} className="text-blue-600 hover:underline">Kembali</button>
            </div>
        );
    }

    const patchWorkOrder = async (workOrderId: string, updates: any) => {
        await new Promise(r => setTimeout(r, 400)); // fake network
        const target = atpWorkOrders.find(w => w.id === workOrderId);
        if (target) Object.assign(target, updates);
        setLocalWo((prev: any) => ({ ...prev, ...updates }));
    };

    const logActivity = async (workOrderId: string, action: string) => {
        workOrderLogs.push({
            id: `wol-${Date.now()}`,
            work_order_id: workOrderId,
            action,
            user_id: currentUser?.id || 'system',
            timestamp: new Date().toISOString()
        });
    };

    const handleFieldSave = async (field: string, value: any) => {
        setSaveStatus('saving');
        try {
            await patchWorkOrder(localWo.id, { [field]: value });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
            await logActivity(localWo.id, `updated ${field} to ${value}`);
        } catch (e) {
            setSaveStatus('error');
        }
    };

    const handleUpdateStage = async (nextStage: string) => {
        await handleFieldSave('stage', nextStage);
        await logActivity(localWo.id, `Stage advanced to ${nextStage}`);
    };

    // Derived dropdown options
    const teamOptions = teams.map(t => ({ label: t.name, value: t.id }));
    const selectedTeam = teams.find(t => t.id === localWo.team_id);
    const leaderOptions = selectedTeam 
        ? teamMembersRecords
            .filter(tm => tm.team_id === selectedTeam.id && tm.role === 'Team Leader')
            .map(tm => {
                const p = people.find(p => p.id === tm.person_id);
                return { label: p?.name || tm.person_id, value: tm.person_id };
            })
        : [];

    const currentStageIdx = STAGE_STEPS.indexOf(localWo.stage || 'imported');

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
            {/* ── HEADER SECTION ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-6 py-5">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            {localWo.atp_number || `ATP${localWo.id.slice(-6).toUpperCase()}`}
                        </h1>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded uppercase tracking-wider">
                            Sektor {localWo.sector}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded uppercase tracking-wider border border-blue-200">
                            {localWo.project_type}
                        </span>
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded uppercase tracking-wider border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                        </span>
                    </div>
                </div>
                
                {/* Meta Row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-3 pt-3 border-t border-slate-100">
                    <InlineMetaField label="Site ID" value={localWo.site_id} field="site_id" onSave={handleFieldSave} />
                    <span className="text-slate-300">·</span>
                    <InlineMetaField label="PO" value={localWo.po_number} field="po_number" onSave={handleFieldSave} />
                    <span className="text-slate-300">·</span>
                    <InlineMetaField label="SOW" value={localWo.sow_id} field="sow_id" onSave={handleFieldSave} />
                    <span className="text-slate-300">·</span>
                    <InlineMetaField label="SOW Type" value={localWo.sow_type} field="sow_type" onSave={handleFieldSave} />
                    <span className="text-slate-300">·</span>
                    <InlineMetaField label="Asset Element" value={localWo.asset_element} field="asset_element" onSave={handleFieldSave} />
                    <span className="text-slate-300">·</span>
                    <InlineMetaField label="Capex Project" value={localWo.capex_project} field="capex_project" onSave={handleFieldSave} />
                    <span className="text-slate-300">·</span>
                    <InlineMetaField label="Batch" value={localWo.batch} field="batch" onSave={handleFieldSave} />
                </div>
            </div>

            {/* ── STAGE STEPPER ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6 flex items-start justify-between relative">
                <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                <div className="absolute top-1/2 left-10 h-0.5 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500" style={{ width: `calc(${(currentStageIdx / (STAGE_STEPS.length - 1)) * 100}% - 40px)` }} />
                
                {STAGE_STEPS.map((step, idx) => {
                    const isDone = idx < currentStageIdx;
                    const isCurrent = idx === currentStageIdx;
                    return (
                        <div key={step} className="relative z-10 flex flex-col items-center gap-3">
                            <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm",
                                isDone ? "bg-emerald-500 text-white border-2 border-emerald-500" :
                                isCurrent ? "bg-blue-600 text-white border-2 border-blue-600 ring-4 ring-blue-100" :
                                "bg-white text-slate-400 border-2 border-slate-200"
                            )}>
                                {isDone ? <CheckCircle2 className="w-5 h-5" /> : (idx + 1)}
                            </div>
                            <div className="flex flex-col items-center">
                                <span className={clsx("text-[10px] font-black uppercase tracking-widest whitespace-nowrap", isCurrent ? "text-blue-700" : isDone ? "text-slate-700" : "text-slate-400")}>
                                    {STAGE_LABELS[idx].split('·')[1]}
                                </span>
                                {isDone && <span className="text-[9px] text-slate-400 font-medium mt-0.5">12 Mar 2026</span>} {/* Mocked Date */}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── MAIN WORKSPACE TABS ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                {/* Tab Bar */}
                <div className="flex border-b border-slate-200 bg-slate-50/50 overflow-x-auto hide-scrollbar">
                    {INNER_TABS.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    "flex items-center gap-2 px-6 py-4 border-b-2 text-sm font-semibold transition-colors whitespace-nowrap",
                                    active ? "border-blue-600 text-blue-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
                                )}
                            >
                                <Icon className={clsx("w-4 h-4", active ? "text-blue-600" : "text-slate-400")} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="flex-1 p-8">
                    {activeTab === 'permit' && (
                        <div className="max-w-4xl animate-in fade-in">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-black text-slate-800">Permit Details</h2>
                                <SaveIndicator status={saveStatus} />
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12">
                                <div className="space-y-0">
                                    <AutoSaveInput label="Permit Status" value={localWo.permit_status} field="permit_status" type="select" onSave={handleFieldSave} options={[
                                        {label: '1.Planning', value: '1.Planning'}, {label: '2.Waiting TO', value: '2.Waiting TO'}, {label: '4.Tpass', value: '4.Tpass'},
                                        {label: '5.Released', value: '5.Released'}, {label: '6.Expired', value: '6.Expired'}, {label: '9.Cancelled', value: '9.Cancelled'}
                                    ]} />
                                    <AutoSaveInput label="Tower Provider" value={localWo.tower_provider} field="tower_provider" onSave={handleFieldSave} />
                                    <AutoSaveInput label="Create Date" value={localWo.permit_create_date} field="permit_create_date" type="date" onSave={handleFieldSave} />
                                    <AutoSaveInput label="Jenis Kunci" value={localWo.lock_type} field="lock_type" type="select" onSave={handleFieldSave} options={[
                                        {label: 'PADLOCK', value: 'PADLOCK'}, {label: 'SMARTLOCK', value: 'SMARTLOCK'}, {label: 'QUADLOCK', value: 'QUADLOCK'}
                                    ]} />
                                    <AutoSaveInput label="Permit Start" value={localWo.permit_start} field="permit_start" type="date" onSave={handleFieldSave} />
                                    <AutoSaveInput label="PIC Nama" value={localWo.pic} field="pic" onSave={handleFieldSave} />
                                </div>
                                <div className="space-y-0">
                                    <AutoSaveInput label="Permit Expiry" value={localWo.permit_expiry} field="permit_expiry" type="date" onSave={handleFieldSave} warningThresholdDays={14} />
                                    <AutoSaveInput label="PIC Telp" value={localWo.pic_telp} field="pic_telp" onSave={handleFieldSave} />
                                    <AutoSaveInput label="TPAS Nomor" value={localWo.tpas_no} field="tpas_no" onSave={handleFieldSave} />
                                    <AutoSaveInput label="TP Nomor" value={localWo.tp_no} field="tp_no" onSave={handleFieldSave} />
                                    <AutoSaveInput label="CAF Nomor" value={localWo.caf_no} field="caf_no" onSave={handleFieldSave} />
                                </div>
                            </div>

                            <div className="mt-8 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group">
                                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="w-5 h-5 text-blue-500" />
                                </div>
                                <p className="text-sm font-bold text-slate-700">Drag & drop permit documents here</p>
                                <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG up to 10MB</p>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                                <button className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                                    Simpan Draft
                                </button>
                                <button onClick={() => handleUpdateStage('implementasi')} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                                    Update Stage Permit <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'implementasi' && (
                        <div className="max-w-4xl animate-in fade-in">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-black text-slate-800">Implementasi</h2>
                                <SaveIndicator status={saveStatus} />
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12">
                                <div className="space-y-0">
                                    <AutoSaveInput label="Tim" value={localWo.team_id} field="team_id" type="select" options={teamOptions} onSave={handleFieldSave} />
                                    <AutoSaveInput label="Field Leader" value={localWo.field_leader_id} field="field_leader_id" type="select" options={leaderOptions} onSave={handleFieldSave} />
                                    <AutoSaveInput label="Tanggal Plan" value={localWo.plan_date} field="plan_date" type="date" onSave={handleFieldSave} />
                                    <AutoSaveInput label="Tanggal Aktual" value={localWo.actual_date} field="actual_date" type="date" onSave={handleFieldSave} />
                                    <AutoSaveInput label="CI Tanggal" value={localWo.ci_date} field="ci_date" type="date" onSave={handleFieldSave} />
                                </div>
                                <div className="space-y-0">
                                    <AutoSaveInput label="CO Tanggal" value={localWo.co_date} field="co_date" type="date" onSave={handleFieldSave} />
                                    <AutoSaveInput label="RFI Done" value={localWo.rfi_done} field="rfi_done" type="checkbox" onSave={handleFieldSave} />
                                    <AutoSaveInput label="RFS Done" value={localWo.rfs_done} field="rfs_done" type="checkbox" onSave={handleFieldSave} />
                                    <AutoSaveInput label="Impl Status" value={localWo.impl_status} field="impl_status" type="select" onSave={handleFieldSave} options={[
                                        {label: 'Awaiting', value: 'Awaiting'}, {label: 'Scheduled', value: 'Scheduled'}, {label: 'On Going', value: 'On Going'}, {label: 'RFS', value: 'RFS'}, {label: 'Cancelled', value: 'Cancelled'}
                                    ]} />
                                </div>
                            </div>
                            <div className="mt-4">
                                <AutoSaveInput label="Note Implementasi" value={localWo.impl_notes} field="impl_notes" type="textarea" onSave={handleFieldSave} />
                            </div>

                            <div className="mt-8 border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group">
                                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <ImageIcon className="w-5 h-5 text-blue-500" />
                                </div>
                                <p className="text-sm font-bold text-slate-700">Upload Implementation Photos</p>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                                <button className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                                    Simpan Draft
                                </button>
                                <button onClick={() => handleUpdateStage('atp')} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                                    Update Stage Implementasi <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'atp' && (
                        <div className="max-w-4xl animate-in fade-in">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-black text-slate-800">ATP & Dokumen</h2>
                                <SaveIndicator status={saveStatus} />
                            </div>
                            
                            <div className="space-y-0 mb-8">
                                <AutoSaveInput label="PDID" value={localWo.pdid} field="pdid" onSave={handleFieldSave} />
                                <AutoSaveInput label="Tiket ATP" value={localWo.tiket_atp} field="tiket_atp" onSave={handleFieldSave} />
                                <AutoSaveInput label="Status ATP" value={localWo.atp_status} field="atp_status" type="select" onSave={handleFieldSave} options={[
                                    {label: 'REQUEST PDID', value: 'REQUEST PDID'}, {label: 'UPLOAD TAGGING DONE', value: 'UPLOAD TAGGING DONE'}, {label: 'TAGGING N/A', value: 'TAGGING N/A'}, {label: 'HOLD', value: 'HOLD'}
                                ]} />
                                <AutoSaveInput label="Note Foto Evidence" value={localWo.foto_evidence_notes} field="foto_evidence_notes" type="textarea" onSave={handleFieldSave} />
                            </div>

                            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">eATP Certificate Section</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-0 mb-8">
                                <AutoSaveInput label="Azimuth S1" value={localWo.azimuth_s1} field="azimuth_s1" type="number" onSave={handleFieldSave} />
                                <AutoSaveInput label="Azimuth S2" value={localWo.azimuth_s2} field="azimuth_s2" type="number" onSave={handleFieldSave} />
                                <AutoSaveInput label="Azimuth S3" value={localWo.azimuth_s3} field="azimuth_s3" type="number" onSave={handleFieldSave} />
                            </div>

                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group">
                                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <Upload className="w-5 h-5 text-blue-500" />
                                </div>
                                <p className="text-sm font-bold text-slate-700">Upload ATP Documents & Certificate</p>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                                <button className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                                    Simpan Draft
                                </button>
                                <button onClick={() => handleUpdateStage('bast')} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                                    Tandai ATP Selesai <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'penagihan' && (
                        <div className="animate-in fade-in">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-black text-slate-800">Daftar Tagihan & Financial Items</h2>
                                <button className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 shadow-sm flex items-center gap-2 transition-colors">
                                    <Plus className="w-4 h-4" /> Tambah Item Pembayaran
                                </button>
                            </div>
                            
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3 font-bold border-b border-slate-200">Termin / Item</th>
                                            <th className="px-4 py-3 font-bold border-b border-slate-200">Nominal</th>
                                            <th className="px-4 py-3 font-bold border-b border-slate-200">Status</th>
                                            <th className="px-4 py-3 font-bold border-b border-slate-200">Submitted At</th>
                                            <th className="px-4 py-3 font-bold border-b border-slate-200 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {terminPengajuanRecords.filter(t => t.site_id === site.site_id).map(t => (
                                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-4 font-bold text-slate-800">{t.termin_key}</td>
                                                <td className="px-4 py-4 font-mono font-bold text-slate-600">Rp {t.nominal.toLocaleString('id-ID')}</td>
                                                <td className="px-4 py-4">
                                                    <span className={clsx(
                                                        "px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider",
                                                        t.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                        t.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    )}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-slate-500 text-xs">{new Date(t.submitted_at).toLocaleDateString('id-ID')}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <button className="text-blue-600 hover:underline text-xs font-bold">Detail</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'foto' && (
                        <div className="animate-in fade-in">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-black text-slate-800">Galeri Foto</h2>
                                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-colors">
                                    <Upload className="w-4 h-4" /> Upload Foto
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square flex flex-col items-center justify-center shadow-sm cursor-pointer hover:border-blue-300 transition-colors">
                                        <ImageIcon className="w-8 h-8 text-slate-300 mb-2 group-hover:text-blue-400 transition-colors" />
                                        <p className="text-[10px] text-slate-400 text-center px-2">Sector {i} View</p>
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <button className="px-3 py-1.5 bg-white text-slate-800 text-xs font-bold rounded shadow-sm">View</button>
                                        </div>
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
                                    { name: 'Permit_Approval_BKS025.pdf', type: 'Permit Docs', size: '2.4 MB', date: '10 Mar 2026' },
                                    { name: 'Implementasi_BAST_Draft.docx', type: 'Implementasi Docs', size: '1.1 MB', date: '14 Mar 2026' },
                                    { name: 'ATP_Checklist.xlsx', type: 'ATP Docs', size: '850 KB', date: '15 Mar 2026' }
                                ].map((f, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{f.name}</p>
                                                <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500">
                                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600">{f.type}</span>
                                                    <span>{f.size}</span>
                                                    <span>·</span>
                                                    <span>{f.date}</span>
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
                                {workOrderLogs.filter(l => l.work_order_id === localWo.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(log => (
                                    <div key={log.id} className="relative">
                                        <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-slate-200 border-4 border-white" />
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                {log.user_id.substring(0,2).toUpperCase()}
                                            </div>
                                            <div className="pt-1.5">
                                                <p className="text-sm font-medium text-slate-800">{log.action}</p>
                                                <p className="text-[11px] font-medium text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(log.timestamp).toLocaleString('id-ID')}
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
