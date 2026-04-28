import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Check, Loader2, X, ExternalLink, Plus, Edit3 } from 'lucide-react';
import { atpWorkOrders, type SiteStage } from '../../data/mockData';
import { useCellSave } from '../../hooks/useCellSave';
import clsx from 'clsx';

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTORS = [1, 2, 3, 4];
const STAGES: SiteStage[] = [
  'imported', 'assigned', 'permit_process', 'permit_ready',
  'akses_process', 'akses_ready', 'implementasi', 'rfi_done',
  'rfs_done', 'dokumen_done', 'bast', 'invoice', 'completed',
];
const STATUSES = ['active', 'completed', 'cancelled'];

// ─── Stage color map ─────────────────────────────────────────────────────────
const stageColor = (v: string) => {
  const map: Record<string, string> = {
    imported: 'bg-gray-100 text-gray-700 border-gray-200',
    assigned: 'bg-gray-100 text-gray-700 border-gray-200',
    permit_process: 'bg-amber-100 text-amber-700 border-amber-200',
    permit_ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    akses_process: 'bg-amber-100 text-amber-700 border-amber-200',
    akses_ready: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    implementasi: 'bg-blue-100 text-blue-700 border-blue-200',
    rfi_done: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    rfs_done: 'bg-violet-100 text-violet-700 border-violet-200',
    dokumen_done: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    bast: 'bg-pink-100 text-pink-700 border-pink-200',
    invoice: 'bg-rose-100 text-rose-700 border-rose-200',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };
  return map[v] || 'bg-slate-100 text-slate-700 border-slate-200';
};

const statusColor = (s: string) => {
  if (s === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'completed') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const typeBadge = (t: string) => {
  const map: Record<string, string> = {
    FILTER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMBAT: 'bg-orange-50 text-orange-600 border-orange-200',
    RESCOPING: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    BLACKSITE: 'bg-red-50 text-red-600 border-red-200',
    L2H: 'bg-blue-50 text-blue-600 border-blue-200',
  };
  return map[t] || 'bg-slate-50 text-slate-600 border-slate-200';
};

// ─── Inline text cell ─────────────────────────────────────────────────────────
interface InlineTextCellProps {
  value: string;
  placeholder?: string;
  onSave: (v: string) => Promise<boolean>;
  autoFocus?: boolean;
  monospace?: boolean;
  placeholderClassName?: string;
}

const InlineTextCell = ({ value, placeholder, onSave, autoFocus = false, monospace = false, placeholderClassName }: InlineTextCellProps) => {
  const [editing, setEditing] = useState(autoFocus);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      if (inputRef.current) {
        inputRef.current.selectionStart = inputRef.current.value.length;
      }
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = useCallback(async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 1400);
      setEditing(false);
    } else {
      setStatus('error');
      setDraft(value); // revert
      setTimeout(() => setStatus('idle'), 2000);
      setEditing(false);
    }
  }, [draft, value, onSave]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        className={clsx(
          'w-full px-2 py-1 text-xs border-2 border-blue-400 rounded outline-none focus:ring-1 focus:ring-blue-300 bg-white min-w-[100px]',
          monospace && 'font-mono'
        )}
        placeholder={placeholder}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={clsx(
        'group flex items-center gap-1 text-left w-full px-1 py-0.5 rounded hover:bg-blue-50 transition-colors',
        monospace && 'font-mono'
      )}
    >
      {saving ? (
        <Loader2 className="w-3 h-3 animate-spin text-blue-400 shrink-0" />
      ) : status === 'success' ? (
        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
      ) : status === 'error' ? (
        <X className="w-3 h-3 text-red-500 shrink-0" />
      ) : null}
      <span className={clsx(
        'text-xs truncate max-w-[130px]',
        value ? 'text-slate-700' : (placeholderClassName || 'text-slate-400 italic')
      )}>
        {value || placeholder || '—'}
      </span>
      {status === 'idle' && !saving && (
        <Edit3 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
      )}
    </button>
  );
};

// ─── Inline select cell ───────────────────────────────────────────────────────
interface InlineSelectCellProps {
  value: string;
  options: { label: string; value: string }[];
  onSave: (v: string) => Promise<boolean>;
  renderValue?: (v: string) => React.ReactNode;
}

const InlineSelectCell = ({ value, options, onSave, renderValue }: InlineSelectCellProps) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setEditing(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = async (v: string) => {
    setEditing(false);
    if (v === value) return;
    setSaving(true);
    const ok = await onSave(v);
    setSaving(false);
    if (ok) {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 1400);
    } else {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setEditing(!editing)}
        className="group flex items-center gap-1 px-1 py-0.5 rounded hover:bg-blue-50 transition-colors min-h-[24px]"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin text-blue-400" /> :
         status === 'success' ? <Check className="w-3 h-3 text-emerald-500" /> :
         status === 'error' ? <X className="w-3 h-3 text-red-500" /> :
         renderValue ? renderValue(value) : <span className="text-xs text-slate-700">{value}</span>}
        <ChevronDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </button>
      {editing && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 shadow-xl rounded-lg overflow-hidden min-w-[140px]">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => select(o.value)}
              className={clsx(
                'w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 transition-colors',
                o.value === value ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface AtpTableProps {
  siteId: string;
  onOpenWoTab: (woId: string) => void;
  onAddNew: () => void;   // opens the initiation modal
  newRowId?: string | null;  // highlights the just-created row
  canEdit: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const AtpTable = ({ siteId, onOpenWoTab, onAddNew, newRowId, canEdit }: AtpTableProps) => {
  const { saveField } = useCellSave();
  const [, forceUpdate] = useState(0);

  // Get and sort rows: if newRowId is present, put it first. Otherwise sort by id desc.
  const rows = useMemo(() => {
    const siteRows = atpWorkOrders.filter(wo => wo.site_id === siteId);
    return siteRows.sort((a, b) => {
      if (a.id === newRowId) return -1;
      if (b.id === newRowId) return 1;
      return b.id.localeCompare(a.id); // Assuming ID increases or we want latest
    });
  }, [siteId, atpWorkOrders.length, newRowId]);

  const makeSave = (woId: string, field: string) =>
    async (val: any): Promise<boolean> => {
      const ok = await saveField(woId, 'workOrder', field, val);
      if (ok) forceUpdate((n: number) => n + 1);
      return ok;
    };

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">Daftar Pekerjaan (ATP)</p>
          {canEdit && (
            <button
              onClick={onAddNew}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah ATP
            </button>
          )}
        </div>
        <div className="py-16 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-sm font-semibold text-slate-600">Belum ada pekerjaan (ATP)</p>
          <p className="text-xs text-slate-400 mt-1">Klik "+ Tambah ATP" untuk menginisiasi pekerjaan baru.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Table header bar */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
        <p className="text-sm font-semibold text-slate-700">
          Daftar Pekerjaan (ATP)
          <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-bold rounded-full">{rows.length}</span>
        </p>
        {canEdit && (
          <button
            onClick={onAddNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah ATP
          </button>
        )}
      </div>

      {/* Guidance Banner */}
      {rows.some(wo => !wo.atp_number) && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-start gap-3 animate-in slide-in-from-top-2">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">ℹ</div>
            <div className="text-xs text-blue-800">
                <p className="font-bold">1 pekerjaan belum memiliki nomor ATP.</p>
                <p className="opacity-80">Klik <span className="font-bold">[+ Isi ATP]</span> untuk melengkapi data pekerjaan.</p>
            </div>
        </div>
      )}

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-white border-b border-slate-100">
            <tr>
              <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] min-w-[150px]">ATP Number</th>
              <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] min-w-[120px]">SOW Project</th>
              <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] min-w-[110px]">Asset Element</th>
              <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] min-w-[130px]">Capex Project</th>
              <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] min-w-[160px]">PO Number</th>
              <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] min-w-[110px]">SOW ID</th>
              <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] min-w-[130px]">SOW Type</th>
              <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Sector</th>
              <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Type</th>
              <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] min-w-[120px]">Stage</th>
              <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Status</th>
              <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
                  {rows.map((wo: any) => {
              const isNew = wo.id === newRowId;
              return (
                <tr
                  key={wo.id}
                  className={clsx(
                    'transition-all group border-l-4 relative',
                    isNew
                      ? 'bg-blue-50/70 border-l-blue-500 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.1)]'
                      : 'hover:bg-slate-50/60 border-l-transparent'
                  )}
                >
                  {/* ATP Number */}
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {canEdit ? (
                        <InlineTextCell
                          value={wo.atp_number || ''}
                          placeholder="[+ Isi Nomor ATP]"
                          onSave={makeSave(wo.id, 'atp_number')}
                          autoFocus={isNew}
                          monospace
                          placeholderClassName="text-blue-600 font-bold italic"
                        />
                      ) : (
                        <span className="font-mono text-slate-700">{wo.atp_number || <span className="text-slate-400 italic">—</span>}</span>
                      )}
                      {isNew && (
                        <span className="text-[10px] font-black text-blue-600 flex items-center gap-1 animate-bounce mt-1">
                          Lengkapi data ATP untuk memulai pekerjaan →
                        </span>
                      )}
                    </div>
                  </td>

                  {/* SOW Project */}
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <InlineTextCell
                        value={(wo as any).sow_project || ''}
                        placeholder="Re-Engineering"
                        onSave={makeSave(wo.id, 'sow_project')}
                      />
                    ) : (
                      <span className="text-slate-600">{(wo as any).sow_project || '—'}</span>
                    )}
                  </td>

                  {/* Asset Element */}
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <InlineTextCell
                        value={(wo as any).asset_element || ''}
                        placeholder="S00000848"
                        onSave={makeSave(wo.id, 'asset_element')}
                        monospace
                      />
                    ) : (
                      <span className="font-mono text-slate-600">{(wo as any).asset_element || '—'}</span>
                    )}
                  </td>

                  {/* Capex Project */}
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <InlineTextCell
                        value={(wo as any).capex_project || ''}
                        placeholder="Re-Engineering 4G"
                        onSave={makeSave(wo.id, 'capex_project')}
                      />
                    ) : (
                      <span className="text-slate-600">{(wo as any).capex_project || '—'}</span>
                    )}
                  </td>

                  {/* PO Number */}
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <InlineTextCell
                        value={wo.po_number || ''}
                        placeholder="5992/TC.03/…"
                        onSave={makeSave(wo.id, 'po_number')}
                        monospace
                      />
                    ) : (
                      <span className="font-mono text-slate-600">{wo.po_number || '—'}</span>
                    )}
                  </td>

                  {/* SOW ID */}
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <InlineTextCell
                        value={wo.sow_id || ''}
                        placeholder="R0022633070"
                        onSave={makeSave(wo.id, 'sow_id')}
                        monospace
                      />
                    ) : (
                      <span className="font-mono text-slate-600">{wo.sow_id || '—'}</span>
                    )}
                  </td>

                  {/* SOW Type */}
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <InlineTextCell
                        value={(wo as any).sow_type || ''}
                        placeholder="EQP Filter LTE 900"
                        onSave={makeSave(wo.id, 'sow_type')}
                      />
                    ) : (
                      <span className="text-slate-600">{(wo as any).sow_type || '—'}</span>
                    )}
                  </td>

                  {/* Sector */}
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <InlineSelectCell
                        value={String(wo.sector)}
                        options={SECTORS.map(s => ({ label: `S${s}`, value: String(s) }))}
                        onSave={makeSave(wo.id, 'sector')}
                        renderValue={v => (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            S{v}
                          </span>
                        )}
                      />
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">S{wo.sector}</span>
                    )}
                  </td>

                  {/* Type — read-only badge */}
                  <td className="px-3 py-2">
                    <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border', typeBadge(wo.project_type))}>
                      {wo.project_type}
                    </span>
                  </td>

                  {/* Stage */}
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <InlineSelectCell
                        value={wo.stage}
                        options={STAGES.map(s => ({ label: s.replace(/_/g, ' '), value: s }))}
                        onSave={makeSave(wo.id, 'stage')}
                        renderValue={v => (
                          <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border', stageColor(v))}>
                            {v.replace(/_/g, ' ')}
                          </span>
                        )}
                      />
                    ) : (
                      <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border', stageColor(wo.stage))}>
                        {wo.stage.replace(/_/g, ' ')}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <InlineSelectCell
                        value={wo.status}
                        options={STATUSES.map(s => ({ label: s.toUpperCase(), value: s }))}
                        onSave={makeSave(wo.id, 'status')}
                        renderValue={v => (
                          <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border', statusColor(v))}>
                            {v}
                          </span>
                        )}
                      />
                    ) : (
                      <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border', statusColor(wo.status))}>
                        {wo.status}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => onOpenWoTab(wo.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
                    >
                      Buka <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AtpTable;
