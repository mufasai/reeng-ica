import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown, ChevronUp, Trash2, FileCheck, Briefcase, FolderCheck, FileText, Plus, ImageIcon,
  Download, Upload, CheckCircle2, MoreVertical, Edit3, ChevronRight
} from 'lucide-react';
import { atpWorkOrders, siteMasterRecords, terminPengajuanRecords, siteEvidence, teams, people } from '../../data/mockData';
import clsx from 'clsx';
import { DataTable, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../common/Table';
import AddPenagihanModal from '../modals/AddPenagihanModal';
import { InlineTextEdit, InlineSelectEdit, InlineDateEdit, InlineCheckbox } from '../common/InlineEditCells';
import { useCellSave } from '../../hooks/useCellSave';

const STAGE_STEPS = ['imported', 'permit', 'implementasi', 'atp', 'bast', 'invoice', 'completed'];

const AccordionSection = ({ title, icon: Icon, children, defaultExpanded = true, saveStatus }: any) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
      <div 
        className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800 tracking-wider uppercase">
            {title}
          </h3>
          {saveStatus && (
            <div className="ml-4 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className={clsx(
                "text-[10px] font-bold uppercase tracking-tight",
                saveStatus.type === 'saving' ? "text-blue-500 animate-pulse" :
                saveStatus.type === 'error' ? "text-red-500" :
                "text-slate-400"
              )}>
                {saveStatus.text}
              </span>
            </div>
          )}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </div>
      {expanded && (
        <div className="p-6">
          {children}
        </div>
      )}
    </div>
  );
};

const KeyValueGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0.5">
    {children}
  </div>
);

const KeyValueRow = ({ label, children, border = true }: { label: string, children: React.ReactNode, border?: boolean }) => (
  <div className={clsx("grid grid-cols-[180px_1fr] items-center gap-4 py-2.5", border && "border-b border-slate-50")}>
    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    <div className="text-sm font-semibold text-slate-700">
      {children}
    </div>
  </div>
);

const WorkOrderTabContent = ({ workOrderId }: { workOrderId: string }) => {
  const navigate = useNavigate();
  const { saveField, saving } = useCellSave();
  const [showAddPenagihan, setShowAddPenagihan] = useState(false);
  
  // Track last save time per section
  const [lastSaves, setLastSaves] = useState<Record<string, string>>({});

  const wo = useMemo(() => atpWorkOrders.find(w => w.id === workOrderId), [workOrderId]);
  const site = useMemo(() => siteMasterRecords.find(s => s.site_id === wo?.site_id), [wo]);

  const handleSave = async (section: string, field: string, val: any) => {
    if (!wo) return false;
    const ok = await saveField(wo.id, 'workOrder', field, val);
    if (ok) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setLastSaves(prev => ({ ...prev, [section]: timeStr }));
    }
    return ok;
  };

  const getSaveStatus = (section: string) => {
    // Check if any field in this section is currently saving
    // For simplicity, we check if global 'saving' has any keys
    const isSaving = Object.values(saving).some(v => v);
    if (isSaving) return { type: 'saving', text: 'Menyimpan...' };
    
    if (lastSaves[section]) return { type: 'saved', text: `Tersimpan · ${lastSaves[section]}` };
    return null;
  };

  if (!wo || !site) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-slate-500 mb-4">Work Order not found.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const currentStageIndex = STAGE_STEPS.indexOf(wo.stage);
  const evidences = useMemo(() => siteEvidence.filter(e => e.siteId === site?.site_id), [site?.site_id]);
  const penagihans = useMemo(() => terminPengajuanRecords.filter(t => t.site_id === site?.site_id).sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()), [site?.site_id]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 max-w-6xl mx-auto pb-12">
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          SUB-TAB HEADER
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">ATP NUMBER</span>
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{wo.atp_number || 'ATP000000XXXXXX'}</h1>
              <div className="flex gap-1.5 ml-2">
                 <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase border border-blue-100">Sektor {wo.sector}</span>
                 <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded uppercase border border-purple-100">{wo.project_type}</span>
                 <span className={clsx(
                   "px-2 py-0.5 text-[10px] font-bold rounded uppercase border",
                   wo.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"
                 )}>{wo.status}</span>
              </div>
            </div>
            
            <div className="flex gap-8 text-sm pt-1">
              <div className="flex gap-2 items-baseline">
                <span className="text-[10px] font-bold text-slate-400 uppercase">PO</span>
                <span className="font-mono font-semibold text-slate-700">{wo.po_number || '-'}</span>
              </div>
              <div className="flex gap-2 items-baseline">
                <span className="text-[10px] font-bold text-slate-400 uppercase">SOW</span>
                <span className="font-mono font-semibold text-slate-700">{wo.sow_id || '-'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
             <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                <MoreVertical className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          KELENGKAPAN DATA CHECKLIST
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 border-l-4 border-l-amber-400">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-500" />
          Kelengkapan Data
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Nomor ATP', value: wo.atp_number, display: wo.atp_number },
            { label: 'PO Number', value: wo.po_number, display: wo.po_number },
            { label: 'SOW ID', value: wo.sow_id, display: wo.sow_id },
            { label: 'Tipe Proyek', value: wo.project_type, display: wo.project_type },
            { label: 'Sektor', value: wo.sector, display: `S${wo.sector}` },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 group">
              <div className={clsx(
                "w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all",
                item.value ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-slate-200 text-slate-200"
              )}>
                {item.value ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />}
              </div>
              <div className="flex flex-col">
                <span className={clsx(
                  "text-[10px] font-bold uppercase tracking-tight",
                  item.value ? "text-slate-400" : "text-red-500"
                )}>
                  {item.label}
                </span>
                <span className="text-xs font-black text-slate-700">
                  {item.value ? item.display : 'Belum diisi'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage Stepper */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 overflow-x-auto">
        <div className="flex items-center min-w-max">
          {STAGE_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            
            return (
              <div key={step} className="flex items-center">
                <div className="flex items-center relative group">
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300",
                    isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                    isCurrent ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100" :
                    "bg-white border-slate-300 text-slate-400"
                  )}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : (idx + 1)}
                  </div>
                  <span className={clsx(
                    "absolute top-10 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap uppercase tracking-widest transition-colors",
                    isCurrent ? "text-blue-700" :
                    isCompleted ? "text-slate-700" :
                    "text-slate-400"
                  )}>
                    {step}
                  </span>
                </div>
                {idx < STAGE_STEPS.length - 1 && (
                  <div className={clsx(
                    "h-1 w-16 sm:w-24 mx-2 rounded-full transition-colors",
                    idx < currentStageIndex ? "bg-emerald-400" : "bg-slate-200"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PERMIT SECTION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AccordionSection title="PERMIT SECTION" icon={FileCheck} saveStatus={getSaveStatus('permit')}>
        <KeyValueGrid>
          <KeyValueRow label="Permit Status">
            <InlineSelectEdit 
              value={wo.permit_status || ''}
              options={[
                {label: '1.Planning', value: '1.Planning'},
                {label: '5.Permit Released', value: '5.Permit Released'},
                {label: '9.Cancelled', value: '9.Cancelled'}
              ]}
              onSave={(val) => handleSave('permit', 'permit_status', val)}
              placeholder="Select Status"
            />
          </KeyValueRow>
          <KeyValueRow label="Create Date">
            <InlineDateEdit 
              value={wo.permit_create_date || ''} 
              onSave={(val) => handleSave('permit', 'permit_create_date', val)} 
            />
          </KeyValueRow>
          <KeyValueRow label="Permit Start">
            <InlineDateEdit 
              value={wo.permit_start || ''} 
              onSave={(val) => handleSave('permit', 'permit_start', val)} 
            />
          </KeyValueRow>
          <KeyValueRow label="Permit Expiry">
            <InlineDateEdit 
              value={wo.permit_expiry || ''} 
              onSave={(val) => handleSave('permit', 'permit_expiry', val)} 
              warningThresholdDays={14}
            />
          </KeyValueRow>
          <KeyValueRow label="TPAS Nomor">
            <InlineTextEdit 
              value={(wo as any).tpas_no || ''} 
              onSave={(val) => handleSave('permit', 'tpas_no', val)} 
              placeholder="Nomor TPAS"
            />
          </KeyValueRow>
          <KeyValueRow label="TP Nomor">
            <InlineTextEdit 
              value={(wo as any).tp_no || ''} 
              onSave={(val) => handleSave('permit', 'tp_no', val)} 
              placeholder="Nomor TP"
            />
          </KeyValueRow>
          <KeyValueRow label="CAF Nomor">
            <InlineTextEdit 
              value={(wo as any).caf_no || ''} 
              onSave={(val) => handleSave('permit', 'caf_no', val)} 
              placeholder="Nomor CAF"
            />
          </KeyValueRow>
          <KeyValueRow label="Tower Provider">
            <InlineTextEdit 
              value={wo.tower_provider || ''} 
              onSave={(val) => handleSave('permit', 'tower_provider', val)} 
              placeholder="e.g. Tower Bersama"
            />
          </KeyValueRow>
          <KeyValueRow label="Jenis Kunci">
            <InlineSelectEdit 
              value={(wo as any).lock_type || 'PADLOCK'}
              options={[
                {label: 'PADLOCK', value: 'PADLOCK'},
                {label: 'SMARTLOCK', value: 'SMARTLOCK'},
                {label: 'QUADLOCK', value: 'QUADLOCK'}
              ]}
              onSave={(val) => handleSave('permit', 'lock_type', val)}
            />
          </KeyValueRow>
          <KeyValueRow label="PIC Nama">
            <InlineTextEdit 
              value={wo.pic || ''} 
              onSave={(val) => handleSave('permit', 'pic', val)} 
              placeholder="e.g. Agus"
            />
          </KeyValueRow>
          <KeyValueRow label="PIC Telp">
            <InlineTextEdit 
              value={(wo as any).pic_telp || ''} 
              onSave={(val) => handleSave('permit', 'pic_telp', val)} 
              placeholder="0812XXXXXXXX"
            />
          </KeyValueRow>
        </KeyValueGrid>

        <div className="mt-8 flex items-center justify-between border-t border-slate-50 pt-6">
          <div className="border-2 border-dashed border-slate-200 rounded-lg px-8 py-4 flex items-center gap-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group flex-1 mr-6">
             <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
             <div className="text-left">
               <p className="text-xs font-bold text-slate-700">Upload Permit Documents</p>
               <p className="text-[10px] text-slate-400">PDF, JPG, PNG (Max 10MB)</p>
             </div>
          </div>
          <div className="flex gap-3">
             <button className="px-5 py-2 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                SIMPAN DRAFT
             </button>
             <button className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                UPDATE PERMIT STAGE <ChevronRight className="w-4 h-4" />
             </button>
          </div>
        </div>
      </AccordionSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          IMPLEMENTASI SECTION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AccordionSection title="IMPLEMENTASI SECTION" icon={Briefcase} saveStatus={getSaveStatus('implementasi')}>
        <KeyValueGrid>
          <KeyValueRow label="Tim">
            <InlineSelectEdit 
              value={wo.team_id || ''}
              options={teams.map(t => ({ label: t.name, value: t.id }))}
              onSave={(val) => handleSave('implementasi', 'team_id', val)}
              placeholder="Select Team"
            />
          </KeyValueRow>
          <KeyValueRow label="Field Leader">
            <InlineSelectEdit 
              value={wo.field_leader_id || ''}
              options={people.filter((p: any) => p.role === 'field' || p.jabatan === 'Leader').map((p: any) => ({ label: p.name, value: p.id }))}
              onSave={(val) => handleSave('implementasi', 'field_leader_id', val)}
              placeholder="Select Field Leader"
            />
          </KeyValueRow>
          <KeyValueRow label="Tanggal Plan">
            <InlineDateEdit 
              value={(wo as any).plan_date || ''} 
              onSave={(val) => handleSave('implementasi', 'plan_date', val)} 
            />
          </KeyValueRow>
          <KeyValueRow label="Tanggal Aktual">
            <InlineDateEdit 
              value={(wo as any).actual_date || ''} 
              onSave={(val) => handleSave('implementasi', 'actual_date', val)} 
            />
          </KeyValueRow>
          <KeyValueRow label="CI Date/Time">
             <InlineDateEdit 
              value={wo.ci_date || ''} 
              onSave={(val) => handleSave('implementasi', 'ci_date', val)} 
            />
          </KeyValueRow>
          <KeyValueRow label="CO Date/Time">
            <InlineDateEdit 
              value={wo.co_date || ''} 
              onSave={(val) => handleSave('implementasi', 'co_date', val)} 
            />
          </KeyValueRow>
          <KeyValueRow label="RFI Done">
            <InlineCheckbox 
              value={!!wo.rfi_done} 
              onSave={(val) => handleSave('implementasi', 'rfi_done', val)} 
            />
          </KeyValueRow>
          <KeyValueRow label="RFS Done">
            <InlineCheckbox 
              value={!!wo.rfs_done} 
              onSave={(val) => handleSave('implementasi', 'rfs_done', val)} 
            />
          </KeyValueRow>
          <KeyValueRow label="Implementasi Status">
            <InlineSelectEdit 
              value={(wo as any).impl_status || 'Awaiting'}
              options={[
                {label: 'Awaiting', value: 'Awaiting'},
                {label: 'Scheduled', value: 'Scheduled'},
                {label: 'On Going', value: 'On Going'},
                {label: 'RFS', value: 'RFS'},
                {label: 'Cancelled', value: 'Cancelled'}
              ]}
              onSave={(val) => handleSave('implementasi', 'impl_status', val)}
            />
          </KeyValueRow>
        </KeyValueGrid>

        <div className="mt-8 border-t border-slate-50 pt-6">
           <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Implementation Photos</h4>
              <button className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded hover:bg-blue-100 transition-colors border border-blue-100">
                ADD MULTIPLE PHOTOS
              </button>
           </div>
           <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {evidences.filter((e: any) => e.tag === 'implementasi_foto').map((ev: any) => (
              <div key={ev.id} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm relative group cursor-pointer">
                {ev.url ? (
                  <img src={ev.url} alt={ev.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Edit3 className="w-5 h-5 text-white" />
                </div>
              </div>
            ))}
            <div className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer group">
              <Plus className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase">Upload</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
           <button className="px-6 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2">
              UPDATE IMPLEMENTASI STAGE <ChevronRight className="w-4 h-4" />
           </button>
        </div>
      </AccordionSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ATP / DOKUMEN SECTION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AccordionSection title="ATP / DOKUMEN SECTION" icon={FolderCheck} saveStatus={getSaveStatus('atp')}>
        <KeyValueGrid>
          <KeyValueRow label="Status ATP">
            <InlineSelectEdit 
              value={(wo as any).atp_status || 'HOLD'}
              options={[
                {label: 'REQUEST PDID', value: 'REQUEST PDID'},
                {label: 'UPLOAD TAGGING DONE', value: 'UPLOAD TAGGING DONE'},
                {label: 'TAGGING N/A', value: 'TAGGING N/A'},
                {label: 'HOLD', value: 'HOLD'}
              ]}
              onSave={(val) => handleSave('atp', 'atp_status', val)}
            />
          </KeyValueRow>
          <KeyValueRow label="PDID">
             <InlineTextEdit 
              value={(wo as any).pdid || ''} 
              onSave={(val) => handleSave('atp', 'pdid', val)} 
              placeholder="e.g. PDID001"
            />
          </KeyValueRow>
          <KeyValueRow label="Tiket ATP">
            <InlineTextEdit 
              value={(wo as any).tiket_atp || ''} 
              onSave={(val) => handleSave('atp', 'tiket_atp', val)} 
              placeholder="e.g. TKT123"
            />
          </KeyValueRow>
          <KeyValueRow label="Tagging Status">
            <InlineSelectEdit 
              value={(wo as any).tagging_status || 'pending'}
              options={[
                {label: 'Pending', value: 'pending'},
                {label: 'Done', value: 'done'},
                {label: 'N/A', value: 'na'}
              ]}
              onSave={(val) => handleSave('atp', 'tagging_status', val)}
            />
          </KeyValueRow>
        </KeyValueGrid>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-50 pt-6">
           {/* File List */}
           <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">File List</h4>
              <div className="space-y-2">
                 {[
                   {name: 'Draft_BAST_JKS509.pdf', size: '2.4 MB', icon: FileText},
                   {name: 'SPK_5992_TC03.pdf', size: '1.1 MB', icon: FileText}
                 ].map(f => (
                   <div key={f.name} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            <f.icon className="w-4 h-4" />
                         </div>
                         <div>
                            <p className="text-xs font-bold text-slate-700">{f.name}</p>
                            <p className="text-[10px] text-slate-400">{f.size}</p>
                         </div>
                      </div>
                      <Download className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                   </div>
                 ))}
              </div>
           </div>
           
           {/* Photo Gallery with Admin Tagging */}
           <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Admin Tagging</h4>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                 <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                       <img src={evidences[0]?.url} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-2">
                       <p className="text-[10px] font-bold text-slate-500 uppercase">Current Tag: <span className="text-blue-600">RRU</span></p>
                       <div className="flex gap-1.5 flex-wrap">
                          {['Tower', 'Kabel', 'Antena'].map(t => (
                            <button key={t} className="px-2 py-0.5 bg-white border border-slate-200 text-[10px] font-bold text-slate-400 rounded hover:border-blue-400 hover:text-blue-500 transition-colors">
                              {t}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </AccordionSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PENAGIHAN SECTION
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <AccordionSection title="PENAGIHAN SECTION" icon={FileText}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <div className="bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
               <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Paid</p>
               <p className="text-lg font-black text-emerald-700">Rp {(penagihans.filter(p => p.status === 'paid').reduce((a,b) => a+b.nominal, 0)).toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
               <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Total Pending</p>
               <p className="text-lg font-black text-amber-700">Rp {(penagihans.filter(p => p.status === 'submitted').reduce((a,b) => a+b.nominal, 0)).toLocaleString()}</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddPenagihan(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" /> TAMBAH PENAGIHAN
          </button>
        </div>

        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <DataTable>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="text-[10px] font-bold">Termin</TableHead>
                <TableHead className="text-[10px] font-bold">Nominal</TableHead>
                <TableHead className="text-[10px] font-bold">Status</TableHead>
                <TableHead className="text-right text-[10px] font-bold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {penagihans.map((tp: any) => (
                <TableRow key={tp.id} className="hover:bg-slate-50/30 transition-colors">
                  <TableCell className="font-bold text-slate-700">{tp.termin_key}</TableCell>
                  <TableCell className="font-mono text-xs font-bold text-slate-600">Rp {tp.nominal.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={clsx(
                      "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border",
                      tp.status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      tp.status === 'submitted' ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                      {tp.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-300 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTable>
        </div>
      </AccordionSection>

      {showAddPenagihan && (
        <AddPenagihanModal 
          siteId={site.site_id} 
          onClose={() => setShowAddPenagihan(false)} 
        />
      )}
    </div>
  );
};

export default WorkOrderTabContent;
