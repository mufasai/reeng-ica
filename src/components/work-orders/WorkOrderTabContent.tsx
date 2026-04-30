import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2, FileText, Plus, ImageIcon,
  Download, Upload, CheckCircle2, Edit3, ChevronRight
} from 'lucide-react';
import { atpWorkOrders, siteMasterRecords, terminPengajuanRecords, siteEvidence, teams, people } from '../../data/mockData';
import clsx from 'clsx';
import { DataTable, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../common/Table';
import AddPenagihanModal from '../modals/AddPenagihanModal';
import { InlineTextEdit, InlineSelectEdit, InlineDateEdit, InlineCheckbox } from '../common/InlineEditCells';
import { useCellSave } from '../../hooks/useCellSave';

type WorkStep = 'permit' | 'implementasi' | 'atp' | 'penagihan';

interface Props {
  workOrderId: string;
  activeStep?: WorkStep;
  onStepChange?: (step: WorkStep) => void;
}

// ── Shared layout helpers ──────────────────────────────────────────────────────
const KVGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-0.5">{children}</div>
);
const KVRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="grid grid-cols-[180px_1fr] items-center gap-4 py-2.5 border-b border-slate-50">
    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
    <div className="text-sm font-semibold text-slate-700">{children}</div>
  </div>
);
const SectionActions = ({ onDraft, onNext, nextLabel }: { onDraft?: () => void; onNext?: () => void; nextLabel?: string }) => (
  <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
    {onDraft && (
      <button onClick={onDraft} className="px-5 py-2 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
        SIMPAN DRAFT
      </button>
    )}
    {onNext && (
      <button onClick={onNext} className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
        {nextLabel || 'UPDATE STAGE'} <ChevronRight className="w-4 h-4" />
      </button>
    )}
  </div>
);

// ── KELENGKAPAN checklist (shared top bar) ────────────────────────────────────
const KelengkapanBar = ({ wo }: { wo: any }) => {
  const items = [
    { label: 'ATP No', value: wo.atp_number },
    { label: 'PO Number', value: wo.po_number },
    { label: 'SOW ID', value: wo.sow_id },
    { label: 'Tipe', value: wo.project_type },
    { label: 'Sektor', value: wo.sector },
  ];
  const done = items.filter(i => i.value).length;
  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-amber-50 border-b border-amber-100">
      <CheckCircle2 className={clsx('w-4 h-4 shrink-0', done === items.length ? 'text-emerald-500' : 'text-amber-400')} />
      <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Kelengkapan Data</span>
      <div className="flex items-center gap-3 flex-wrap">
        {items.map(item => (
          <span key={item.label} className={clsx(
            'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border',
            item.value ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'
          )}>
            {item.value ? '✓' : '!'} {item.label}
          </span>
        ))}
      </div>
      <span className="ml-auto text-[11px] font-black text-slate-600 tabular-nums">{done}/{items.length}</span>
    </div>
  );
};

// ── Stage stepper ─────────────────────────────────────────────────────────────
const STAGE_STEPS = ['permit', 'implementasi', 'atp', 'penagihan'];
const STAGE_LABELS: Record<string, string> = { permit: 'Permit', implementasi: 'Impl', atp: 'ATP/Dok', penagihan: 'Penagihan' };

const StageStepper = ({ currentStage, activeStep, onStepChange }: { currentStage: string; activeStep: WorkStep; onStepChange?: (s: WorkStep) => void }) => {
  const currentIdx = STAGE_STEPS.indexOf(currentStage);
  return (
    <div className="flex items-center px-6 py-4 gap-0 bg-white border-b border-slate-100 overflow-x-auto">
      {STAGE_STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const current = idx === currentIdx;
        const active = step === activeStep;
        return (
          <React.Fragment key={step}>
            {idx > 0 && <div className={clsx('h-0.5 w-12 shrink-0 mx-1', done ? 'bg-emerald-400' : 'bg-slate-200')} />}
            <button
              onClick={() => onStepChange?.(step as WorkStep)}
              className={clsx(
                'flex flex-col items-center gap-1 group shrink-0 transition-all',
                active ? 'opacity-100' : 'opacity-60 hover:opacity-90'
              )}
            >
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all',
                done ? 'bg-emerald-500 border-emerald-500 text-white' :
                current && active ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100' :
                active ? 'bg-blue-600 border-blue-600 text-white' :
                'bg-white border-slate-300 text-slate-400'
              )}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>
              <span className={clsx(
                'text-[9px] font-bold uppercase tracking-widest whitespace-nowrap',
                active ? 'text-blue-700' : done ? 'text-slate-600' : 'text-slate-400'
              )}>{STAGE_LABELS[step]}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const WorkOrderTabContent = ({ workOrderId, activeStep = 'permit', onStepChange }: Props) => {
  const navigate = useNavigate();
  const { saveField } = useCellSave();
  const [showAddPenagihan, setShowAddPenagihan] = useState(false);

  const wo = useMemo(() => atpWorkOrders.find(w => w.id === workOrderId), [workOrderId]);
  const site = useMemo(() => siteMasterRecords.find(s => s.site_id === wo?.site_id), [wo]);

  const handleSave = async (field: string, val: any) => {
    if (!wo) return false;
    return saveField(wo.id, 'workOrder', field, val);
  };

  if (!wo || !site) {
    return (
      <div className="flex flex-col items-center justify-center h-48">
        <p className="text-slate-500 mb-4">Work Order tidak ditemukan.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">Kembali</button>
      </div>
    );
  }

  const evidences = useMemo(() => siteEvidence.filter(e => e.siteId === site?.site_id), [site?.site_id]);
  const penagihans = useMemo(() => terminPengajuanRecords.filter(t => t.site_id === site?.site_id)
    .sort((a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()), [site?.site_id]);

  // ── Permit Panel ─────────────────────────────────────────────────────────────
  const renderPermit = () => (
    <div className="p-6 space-y-0">
      <KVGrid>
        <KVRow label="Permit Status">
          <InlineSelectEdit value={wo.permit_status || ''} options={[
            { label: '1.Planning', value: '1.Planning' },
            { label: '3.Submission', value: '3.Submission' },
            { label: '5.Permit Released', value: '5.Permit Released' },
            { label: '7.Final Doc', value: '7.Final Doc' },
            { label: '9.Cancelled', value: '9.Cancelled' },
          ]} onSave={v => handleSave('permit_status', v)} placeholder="Select Status" />
        </KVRow>
        <KVRow label="Create Date">
          <InlineDateEdit value={wo.permit_create_date || ''} onSave={v => handleSave('permit_create_date', v)} />
        </KVRow>
        <KVRow label="Permit Start">
          <InlineDateEdit value={wo.permit_start || ''} onSave={v => handleSave('permit_start', v)} />
        </KVRow>
        <KVRow label="Permit Expiry">
          <InlineDateEdit value={wo.permit_expiry || ''} onSave={v => handleSave('permit_expiry', v)} warningThresholdDays={14} />
        </KVRow>
        <KVRow label="TPAS Nomor">
          <InlineTextEdit value={(wo as any).tpas_no || ''} onSave={v => handleSave('tpas_no', v)} placeholder="Nomor TPAS" />
        </KVRow>
        <KVRow label="TP Nomor">
          <InlineTextEdit value={(wo as any).tp_no || ''} onSave={v => handleSave('tp_no', v)} placeholder="Nomor TP" />
        </KVRow>
        <KVRow label="CAF Nomor">
          <InlineTextEdit value={(wo as any).caf_no || ''} onSave={v => handleSave('caf_no', v)} placeholder="Nomor CAF" />
        </KVRow>
        <KVRow label="Tower Provider">
          <InlineTextEdit value={wo.tower_provider || ''} onSave={v => handleSave('tower_provider', v)} placeholder="e.g. Tower Bersama" />
        </KVRow>
        <KVRow label="Jenis Kunci">
          <InlineSelectEdit value={(wo as any).lock_type || 'PADLOCK'} options={[
            { label: 'PADLOCK', value: 'PADLOCK' },
            { label: 'SMARTLOCK', value: 'SMARTLOCK' },
            { label: 'QUADLOCK', value: 'QUADLOCK' },
          ]} onSave={v => handleSave('lock_type', v)} />
        </KVRow>
        <KVRow label="PIC Nama">
          <InlineTextEdit value={wo.pic || ''} onSave={v => handleSave('pic', v)} placeholder="e.g. Agus" />
        </KVRow>
        <KVRow label="PIC Telp">
          <InlineTextEdit value={(wo as any).pic_telp || ''} onSave={v => handleSave('pic_telp', v)} placeholder="0812XXXXXXXX" />
        </KVRow>
      </KVGrid>

      <div className="mt-6 border-t border-slate-100 pt-6 flex items-center gap-4">
        <div className="flex-1 border-2 border-dashed border-slate-200 rounded-lg px-6 py-4 flex items-center gap-4 bg-slate-50 hover:bg-slate-100 cursor-pointer group transition-colors">
          <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
          <div>
            <p className="text-xs font-bold text-slate-700">Upload Permit Documents</p>
            <p className="text-[10px] text-slate-400">PDF, JPG, PNG (Max 10MB)</p>
          </div>
        </div>
        <SectionActions onDraft={() => {}} onNext={() => onStepChange?.('implementasi')} nextLabel="LANJUT IMPLEMENTASI" />
      </div>
    </div>
  );

  // ── Implementasi Panel ────────────────────────────────────────────────────────
  const renderImplementasi = () => (
    <div className="p-6">
      <KVGrid>
        <KVRow label="Tim">
          <InlineSelectEdit value={wo.team_id || ''} options={teams.map(t => ({ label: t.name, value: t.id }))} onSave={v => handleSave('team_id', v)} placeholder="Select Team" />
        </KVRow>
        <KVRow label="Field Leader">
          <InlineSelectEdit value={wo.field_leader_id || ''} options={people.filter((p: any) => p.role === 'field' || p.jabatan === 'Leader').map((p: any) => ({ label: p.name, value: p.id }))} onSave={v => handleSave('field_leader_id', v)} placeholder="Select Field Leader" />
        </KVRow>
        <KVRow label="Tanggal Plan">
          <InlineDateEdit value={(wo as any).plan_date || ''} onSave={v => handleSave('plan_date', v)} />
        </KVRow>
        <KVRow label="Tanggal Aktual">
          <InlineDateEdit value={(wo as any).actual_date || ''} onSave={v => handleSave('actual_date', v)} />
        </KVRow>
        <KVRow label="CI Date/Time">
          <InlineDateEdit value={wo.ci_date || ''} onSave={v => handleSave('ci_date', v)} />
        </KVRow>
        <KVRow label="CO Date/Time">
          <InlineDateEdit value={wo.co_date || ''} onSave={v => handleSave('co_date', v)} />
        </KVRow>
        <KVRow label="RFI Done">
          <InlineCheckbox value={!!wo.rfi_done} onSave={v => handleSave('rfi_done', v)} />
        </KVRow>
        <KVRow label="RFS Done">
          <InlineCheckbox value={!!wo.rfs_done} onSave={v => handleSave('rfs_done', v)} />
        </KVRow>
        <KVRow label="Implementasi Status">
          <InlineSelectEdit value={(wo as any).impl_status || 'Awaiting'} options={[
            { label: 'Awaiting', value: 'Awaiting' },
            { label: 'Scheduled', value: 'Scheduled' },
            { label: 'On Going', value: 'On Going' },
            { label: 'RFS', value: 'RFS' },
            { label: 'Cancelled', value: 'Cancelled' },
          ]} onSave={v => handleSave('impl_status', v)} />
        </KVRow>
      </KVGrid>

      <div className="mt-6 border-t border-slate-100 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Implementation Photos</h4>
          <button className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded hover:bg-blue-100 border border-blue-100 transition-colors">ADD MULTIPLE PHOTOS</button>
        </div>
        <div className="grid gap-3 grid-cols-3 md:grid-cols-6">
          {evidences.filter((e: any) => e.tag === 'implementasi_foto').map((ev: any) => (
            <div key={ev.id} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shadow-sm relative group cursor-pointer">
              {ev.url ? <img src={ev.url} alt={ev.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400"><ImageIcon className="w-6 h-6" /></div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Edit3 className="w-4 h-4 text-white" />
              </div>
            </div>
          ))}
          <div className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer group transition-colors">
            <Plus className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase">Upload</span>
          </div>
        </div>
      </div>
      <SectionActions onDraft={() => {}} onNext={() => onStepChange?.('atp')} nextLabel="LANJUT ATP/DOKUMEN" />
    </div>
  );

  // ── ATP / Dokumen Panel ───────────────────────────────────────────────────────
  const renderAtp = () => (
    <div className="p-6">
      <KVGrid>
        <KVRow label="Status ATP">
          <InlineSelectEdit value={(wo as any).atp_status || 'HOLD'} options={[
            { label: 'REQUEST PDID', value: 'REQUEST PDID' },
            { label: 'UPLOAD TAGGING DONE', value: 'UPLOAD TAGGING DONE' },
            { label: 'TAGGING N/A', value: 'TAGGING N/A' },
            { label: 'HOLD', value: 'HOLD' },
          ]} onSave={v => handleSave('atp_status', v)} />
        </KVRow>
        <KVRow label="PDID">
          <InlineTextEdit value={(wo as any).pdid || ''} onSave={v => handleSave('pdid', v)} placeholder="e.g. PDID001" />
        </KVRow>
        <KVRow label="Tiket ATP">
          <InlineTextEdit value={(wo as any).tiket_atp || ''} onSave={v => handleSave('tiket_atp', v)} placeholder="e.g. TKT123" />
        </KVRow>
        <KVRow label="Tagging Status">
          <InlineSelectEdit value={(wo as any).tagging_status || 'pending'} options={[
            { label: 'Pending', value: 'pending' },
            { label: 'Done', value: 'done' },
            { label: 'N/A', value: 'na' },
          ]} onSave={v => handleSave('tagging_status', v)} />
        </KVRow>
        <KVRow label="ATP Number">
          <InlineTextEdit value={wo.atp_number || ''} onSave={v => handleSave('atp_number', v)} placeholder="Set ATP Number" />
        </KVRow>
        <KVRow label="PO Number">
          <InlineTextEdit value={wo.po_number || ''} onSave={v => handleSave('po_number', v)} placeholder="Set PO Number" />
        </KVRow>
        <KVRow label="SOW ID">
          <InlineTextEdit value={wo.sow_id || ''} onSave={v => handleSave('sow_id', v)} placeholder="Set SOW ID" />
        </KVRow>
      </KVGrid>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-100 pt-6">
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">File List</h4>
          <div className="space-y-2">
            {[
              { name: 'Draft_BAST.pdf', size: '2.4 MB' },
              { name: 'SPK_5992_TC03.pdf', size: '1.1 MB' },
            ].map(f => (
              <div key={f.name} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer group transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <FileText className="w-4 h-4" />
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
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Admin Tagging</h4>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                <img src={evidences[0]?.url} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Current Tag: <span className="text-blue-600">RRU</span></p>
                <div className="flex gap-1.5 flex-wrap">
                  {['Tower', 'Kabel', 'Antena'].map(t => (
                    <button key={t} className="px-2 py-0.5 bg-white border border-slate-200 text-[10px] font-bold text-slate-400 rounded hover:border-blue-400 hover:text-blue-500 transition-colors">{t}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SectionActions onDraft={() => {}} onNext={() => onStepChange?.('penagihan')} nextLabel="LANJUT PENAGIHAN" />
    </div>
  );

  // ── Penagihan Panel ───────────────────────────────────────────────────────────
  const renderPenagihan = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4">
          <div className="bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Paid</p>
            <p className="text-lg font-black text-emerald-700">
              Rp {penagihans.filter(p => p.status === 'paid').reduce((a, b) => a + b.nominal, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-amber-50 px-4 py-3 rounded-xl border border-amber-100">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Total Pending</p>
            <p className="text-lg font-black text-amber-700">
              Rp {penagihans.filter(p => p.status === 'submitted').reduce((a, b) => a + b.nominal, 0).toLocaleString()}
            </p>
          </div>
        </div>
        <button onClick={() => setShowAddPenagihan(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-lg">
          <Plus className="w-4 h-4" /> TAMBAH PENAGIHAN
        </button>
      </div>

      <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <DataTable>
          <TableHeader>
            <TableHead className="text-[10px] font-bold">Termin</TableHead>
            <TableHead className="text-[10px] font-bold">Nominal</TableHead>
            <TableHead className="text-[10px] font-bold">Status</TableHead>
            <TableHead className="text-right text-[10px] font-bold">Aksi</TableHead>
          </TableHeader>
          <TableBody>
            {penagihans.map((tp: any) => (
              <TableRow key={tp.id} className="hover:bg-slate-50/30 transition-colors">
                <TableCell className="font-bold text-slate-700">{tp.termin_key}</TableCell>
                <TableCell className="font-mono text-xs font-bold text-slate-600">Rp {tp.nominal.toLocaleString()}</TableCell>
                <TableCell>
                  <span className={clsx(
                    'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border',
                    tp.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    tp.status === 'submitted' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-50 text-slate-500 border-slate-200'
                  )}>{tp.status}</span>
                </TableCell>
                <TableCell className="text-right">
                  <button className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-slate-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {penagihans.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-slate-400 text-sm">Belum ada data penagihan</TableCell>
              </TableRow>
            )}
          </TableBody>
        </DataTable>
      </div>

      {showAddPenagihan && (
        <AddPenagihanModal siteId={site.site_id} onClose={() => setShowAddPenagihan(false)} />
      )}
    </div>
  );

  return (
    <div className="bg-white">
      <KelengkapanBar wo={wo} />
      <StageStepper currentStage={wo.stage || 'permit'} activeStep={activeStep} onStepChange={onStepChange} />
      <div className="animate-in fade-in duration-200">
        {activeStep === 'permit'       && renderPermit()}
        {activeStep === 'implementasi' && renderImplementasi()}
        {activeStep === 'atp'          && renderAtp()}
        {activeStep === 'penagihan'    && renderPenagihan()}
      </div>
    </div>
  );
};

export default WorkOrderTabContent;
