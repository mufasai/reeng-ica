import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  loadAllProjectTypeConfigs, saveProjectTypeConfig, deleteProjectTypeConfig,
  resetSystemTypeToDefaults, slugify,
  type ProjectTypeConfig, type StageDef, type StageField, type StageSubstep,
  type StageFieldType,
} from '../../config/projectTypeConfig';
import {
  Plus, Trash2, Pencil, Save, X, AlertCircle, ArrowLeft,
  CheckCircle2, Settings, Layers, Lock, Image as ImageIcon, FileText,
  ChevronDown, ChevronUp, RotateCcw,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────
const FIELD_TYPES: StageFieldType[] = [
  'text', 'textarea', 'number', 'date', 'time', 'datetime',
  'dropdown', 'toggle', 'file_upload', 'photo_upload',
];

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Text — single line input',
  textarea: 'Textarea — multiline text',
  number: 'Number — numeric input',
  date: 'Date — date picker',
  time: 'Time — time input',
  datetime: 'Datetime — date + time',
  dropdown: 'Dropdown — select with options',
  toggle: 'Toggle — boolean checkbox',
  file_upload: 'File Upload — PDF/DOCX/XLSX/JPG/PNG',
  photo_upload: 'Photo Upload — JPG/PNG with camera',
};

const PRESET_COLORS = [
  '#2563EB', '#16A34A', '#EA580C', '#DC2626', '#9333EA', '#0891B2',
];

const FILE_EXTS = ['PDF', 'DOCX', 'XLSX', 'JPG', 'PNG', 'MP4'] as const;

// ────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────
export default function ProjectTypeConfigPage() {
  const { currentUser } = useAuth();
  if (currentUser?.role !== 'system_admin') return <Navigate to="/" replace />;

  const [configs, setConfigs] = useState<ProjectTypeConfig[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ show: boolean; msg: string; ok: boolean }>({ show: false, msg: '', ok: true });
  const [editingStageIdx, setEditingStageIdx] = useState<number | null>(null);

  const showMsg = (msg: string, ok = true) => {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3500);
  };

  const reload = useCallback(async () => {
    setLoading(true);
    const rows = await loadAllProjectTypeConfigs();
    // Sort: system first, then custom; both alpha by label
    rows.sort((a, b) => {
      if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
    setConfigs(rows);
    setActiveKey(prev => prev ?? rows[0]?.type_key ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const active = configs.find(c => c.type_key === activeKey) ?? null;

  const persist = async (next: ProjectTypeConfig) => {
    const ok = await saveProjectTypeConfig(next);
    if (ok) {
      setConfigs(prev => prev.map(c => c.type_key === next.type_key ? { ...next } : c));
      showMsg('✓ Tersimpan');
    } else {
      showMsg('Gagal menyimpan', false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Memuat konfigurasi…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto relative">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" /> Konfigurasi Project Type
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Atur stage, substep, dan field form untuk setiap project type.
        </p>
      </div>

      {/* Toast */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold border ${
          toast.ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex gap-6">
        {/* LEFT PANEL */}
        <LeftPanel
          configs={configs}
          activeKey={activeKey}
          onSelect={(k) => { setActiveKey(k); setEditingStageIdx(null); }}
          onCreate={async (label, color, key) => {
            if (configs.some(c => c.type_key === key)) {
              showMsg('Key sudah dipakai', false);
              return;
            }
            const cfg: ProjectTypeConfig = {
              type_key: key, label, color, is_system: false,
              stages: [
                { key: 'imported', label: 'Imported', order: 0, is_auto: true, has_substeps: false, stage_fields: [], substeps: [] },
                { key: 'bast',     label: 'BAST',     order: 1, is_auto: true, has_substeps: false, stage_fields: [], substeps: [] },
                { key: 'invoice',  label: 'Invoice',  order: 2, is_auto: true, has_substeps: false, stage_fields: [], substeps: [] },
                { key: 'selesai',  label: 'Selesai',  order: 3, is_auto: true, has_substeps: false, stage_fields: [], substeps: [] },
              ],
            };
            const ok = await saveProjectTypeConfig(cfg);
            if (ok) {
              await reload();
              setActiveKey(key);
              showMsg('Project type dibuat');
            } else showMsg('Gagal membuat', false);
          }}
        />

        {/* RIGHT PANEL */}
        <div className="flex-1 min-w-0">
          {!active ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Layers className="w-10 h-10 text-slate-200" />
              <p className="text-sm font-semibold">Pilih project type untuk mengedit</p>
            </div>
          ) : (
            <RightPanel
              cfg={active}
              onChange={persist}
              onDelete={async () => {
                if (active.is_system) { showMsg('Tipe sistem tidak dapat dihapus', false); return; }
                if (!confirm(`Hapus "${active.label}"? Data site tetap tersimpan.`)) return;
                if (!active.id) return;
                const ok = await deleteProjectTypeConfig(active.id);
                if (ok) {
                  const remaining = configs.filter(c => c.type_key !== active.type_key);
                  setConfigs(remaining);
                  setActiveKey(remaining[0]?.type_key ?? null);
                  showMsg('Project type dihapus');
                } else showMsg('Gagal menghapus', false);
              }}
              onResetDefaults={async () => {
                if (!active.is_system) return;
                if (!confirm(`Reset "${active.label}" ke defaults? Custom field yang ditambahkan akan hilang. Data site tetap tersimpan.`)) return;
                const ok = await resetSystemTypeToDefaults(active.type_key);
                if (ok) { await reload(); showMsg('Reset ke defaults berhasil'); }
                else showMsg('Reset gagal', false);
              }}
              onEditStage={setEditingStageIdx}
            />
          )}
        </div>
      </div>

      {/* Slide-out stage editor */}
      {active && editingStageIdx !== null && active.stages[editingStageIdx] && (
        <StageEditorPanel
          stage={active.stages[editingStageIdx]}
          allKeys={active.stages.map((s, i) => i === editingStageIdx ? '' : s.key).filter(Boolean)}
          onClose={() => setEditingStageIdx(null)}
          onSave={(next) => {
            const stages = [...active.stages];
            stages[editingStageIdx] = next;
            persist({ ...active, stages });
            setEditingStageIdx(null);
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// LEFT PANEL — flat list + inline new-type form
// ────────────────────────────────────────────────────────────
function LeftPanel({ configs, activeKey, onSelect, onCreate }: {
  configs: ProjectTypeConfig[];
  activeKey: string | null;
  onSelect: (k: string) => void;
  onCreate: (label: string, color: string, key: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const derivedKey = keyTouched ? key : slugify(label);
  const keyConflict = configs.some(c => c.type_key === derivedKey) && derivedKey !== '';
  const canSubmit = label.trim() && derivedKey.length >= 2 && !keyConflict;

  const cancel = () => {
    setCreating(false);
    setLabel(''); setKey(''); setKeyTouched(false); setColor(PRESET_COLORS[0]);
  };

  return (
    <div className="w-60 shrink-0">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm sticky top-6">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">Project Types</p>
        </div>
        <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
          {configs.map(c => (
            <button
              key={c.type_key}
              onClick={() => onSelect(c.type_key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition ${
                activeKey === c.type_key ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                style={{ background: c.color }} />
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-slate-800 truncate">{c.label}</span>
                <span className="block text-[10px] text-slate-400 font-mono">{c.type_key}</span>
              </span>
              {c.is_system && (
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">sistem</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-2 border-t border-slate-100">
          {!creating ? (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:border-blue-300 hover:text-blue-600 transition"
            >
              <Plus className="w-3.5 h-3.5" /> New Project Type
            </button>
          ) : (
            <div className="space-y-2 p-2 bg-slate-50 rounded-lg">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Label *</label>
                <input
                  autoFocus
                  value={label}
                  onChange={e => {
                    setLabel(e.target.value);
                    if (!keyTouched) setKey(slugify(e.target.value));
                  }}
                  placeholder="mis. L2H, Blacksite…"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type Key *</label>
                <input
                  value={derivedKey}
                  onChange={e => { setKey(slugify(e.target.value)); setKeyTouched(true); }}
                  className={`w-full px-2 py-1.5 border rounded text-xs font-mono focus:outline-none focus:ring-1 ${
                    keyConflict ? 'border-red-300 focus:ring-red-300' : 'border-slate-300 focus:ring-blue-300'
                  }`}
                />
                {keyConflict && <p className="text-[10px] text-red-600 mt-0.5">Key sudah dipakai</p>}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Warna</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`w-5 h-5 rounded-full ring-offset-1 transition ${color === c ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-slate-300'}`}
                      style={{ background: c }}
                    />
                  ))}
                  <input type="color" value={color} onChange={e => setColor(e.target.value)}
                    className="w-5 h-5 rounded border border-slate-200 cursor-pointer" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <button onClick={cancel}
                  className="flex-1 px-2 py-1.5 text-[11px] font-bold text-slate-600 border border-slate-300 rounded hover:bg-white">
                  Batal
                </button>
                <button
                  disabled={!canSubmit}
                  onClick={() => { onCreate(label.trim(), color, derivedKey); cancel(); }}
                  className="flex-1 px-2 py-1.5 text-[11px] font-bold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Buat
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// RIGHT PANEL — metadata + stage list
// ────────────────────────────────────────────────────────────
function RightPanel({ cfg, onChange, onDelete, onResetDefaults, onEditStage }: {
  cfg: ProjectTypeConfig;
  onChange: (next: ProjectTypeConfig) => void;
  onDelete: () => void;
  onResetDefaults: () => void;
  onEditStage: (idx: number) => void;
}) {
  const [editingMeta, setEditingMeta] = useState(false);
  const [draft, setDraft] = useState({ label: cfg.label, color: cfg.color });
  useEffect(() => setDraft({ label: cfg.label, color: cfg.color }), [cfg.type_key]);

  const [adding, setAdding] = useState(false);
  const [newStage, setNewStage] = useState({ key: '', label: '', has_substeps: false });
  const [newKeyTouched, setNewKeyTouched] = useState(false);
  const derivedNewKey = newKeyTouched ? newStage.key : slugify(newStage.label);

  const updateStages = (stages: StageDef[]) => onChange({ ...cfg, stages });

  const moveStage = (idx: number, dir: -1 | 1) => {
    const next = [...cfg.stages];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    next.forEach((s, i) => { s.order = i; });
    updateStages(next);
  };

  const addStage = () => {
    const key = derivedNewKey;
    if (!key || cfg.stages.some(s => s.key === key)) return;
    const stage: StageDef = {
      key, label: newStage.label.trim(),
      order: cfg.stages.length,
      is_auto: false,
      has_substeps: newStage.has_substeps,
      stage_fields: [],
      substeps: newStage.has_substeps ? [] : [],
    };
    updateStages([...cfg.stages, stage]);
    setAdding(false);
    setNewStage({ key: '', label: '', has_substeps: false });
    setNewKeyTouched(false);
  };

  return (
    <div className="space-y-4">
      {/* Metadata header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {editingMeta ? (
              <>
                <input type="color" value={draft.color}
                  onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                  className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer shrink-0" />
                <div className="flex-1 min-w-0">
                  <input autoFocus value={draft.label}
                    onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
                    className="w-full text-lg font-black text-slate-800 border-b-2 border-blue-400 outline-none bg-transparent" />
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{cfg.type_key}</p>
                </div>
              </>
            ) : (
              <>
                <span className="w-5 h-5 rounded-full ring-2 ring-white shadow shrink-0" style={{ background: cfg.color }} />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-800">{cfg.label}</h2>
                    {cfg.is_system && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded">
                        <Lock className="w-3 h-3" /> sistem
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-400">{cfg.type_key}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {editingMeta ? (
              <>
                <button onClick={() => { setDraft({ label: cfg.label, color: cfg.color }); setEditingMeta(false); }}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Batal
                </button>
                <button onClick={() => { onChange({ ...cfg, label: draft.label, color: draft.color }); setEditingMeta(false); }}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Simpan
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditingMeta(true)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" /> Edit Metadata
                </button>
                {cfg.is_system && (
                  <button onClick={onResetDefaults}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
                  </button>
                )}
                {!cfg.is_system && (
                  <button onClick={onDelete}
                    className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {editingMeta && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preset:</span>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setDraft(d => ({ ...d, color: c }))}
                className={`w-5 h-5 rounded-full ring-offset-1 transition ${draft.color === c ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-slate-300'}`}
                style={{ background: c }} />
            ))}
          </div>
        )}

        {cfg.is_system && !editingMeta && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Tipe sistem. Perubahan tidak menghapus data yang sudah tersimpan.</span>
          </div>
        )}
      </div>

      {/* Stage list */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-black text-slate-800">Stages</h3>
            <p className="text-[11px] text-slate-400">{cfg.stages.length} stage</p>
          </div>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Tambah Stage
          </button>
        </div>

        {/* Inline new stage form */}
        {adding && (
          <div className="mb-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stage Label *</label>
                <input
                  autoFocus
                  value={newStage.label}
                  onChange={e => setNewStage(s => ({ ...s, label: e.target.value, key: newKeyTouched ? s.key : slugify(e.target.value) }))}
                  placeholder="mis. Permit"
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stage Key *</label>
                <input
                  value={derivedNewKey}
                  onChange={e => { setNewStage(s => ({ ...s, key: slugify(e.target.value) })); setNewKeyTouched(true); }}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
              <input type="checkbox" checked={newStage.has_substeps}
                onChange={e => setNewStage(s => ({ ...s, has_substeps: e.target.checked }))}
                className="w-3.5 h-3.5 rounded" />
              <span>Stage ini memiliki substeps (checklist)</span>
            </label>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => { setAdding(false); setNewStage({ key: '', label: '', has_substeps: false }); setNewKeyTouched(false); }}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-300 rounded hover:bg-white">
                Batal
              </button>
              <button onClick={addStage}
                disabled={!newStage.label.trim() || !derivedNewKey || cfg.stages.some(s => s.key === derivedNewKey)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                Tambah
              </button>
            </div>
          </div>
        )}

        {cfg.stages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-300 gap-2">
            <Layers className="w-8 h-8" />
            <p className="text-sm font-semibold">Belum ada stage</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cfg.stages.map((stage, idx) => (
              <StageRow
                key={stage.key + idx}
                stage={stage}
                idx={idx}
                last={idx === cfg.stages.length - 1}
                onMoveUp={() => moveStage(idx, -1)}
                onMoveDown={() => moveStage(idx, 1)}
                onEdit={() => onEditStage(idx)}
                onDelete={() => {
                  if (!confirm(`Hapus stage "${stage.label}"? Data field yang sudah diisi tetap tersimpan.`)) return;
                  updateStages(cfg.stages.filter((_, i) => i !== idx));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StageRow({ stage, idx, last, onMoveUp, onMoveDown, onEdit, onDelete }: {
  stage: StageDef;
  idx: number;
  last: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const fieldCount = (stage.stage_fields ?? stage.fields ?? []).length;
  const substepFieldCount = stage.substeps.reduce((n, ss) => n + (ss.fields?.length ?? 0), 0);
  const auto = stage.is_auto;

  return (
    <div className={`flex items-center gap-2 px-3 py-3 rounded-xl border transition ${
      auto ? 'bg-slate-50/60 border-slate-100' : 'bg-white border-slate-200 hover:border-slate-300'
    }`}>
      <div className="flex flex-col gap-0.5">
        <button onClick={onMoveUp} disabled={idx === 0}
          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[10px] leading-none">▲</button>
        <button onClick={onMoveDown} disabled={last}
          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-[10px] leading-none">▼</button>
      </div>
      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0">
        {idx + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`font-bold text-sm ${auto ? 'text-slate-500' : 'text-slate-800'}`}>{stage.label}</p>
          {auto && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
              <Lock className="w-2.5 h-2.5" /> auto
            </span>
          )}
          {!auto && stage.has_substeps && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
              {stage.substeps.length} substeps
            </span>
          )}
          {!auto && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded">
              {fieldCount + substepFieldCount} fields
            </span>
          )}
        </div>
        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{stage.key}</p>
      </div>
      {!auto && (
        <>
          <button onClick={onEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-1 text-xs font-bold">
            <Pencil className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button onClick={onDelete}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// STAGE EDITOR — slide-out
// ────────────────────────────────────────────────────────────
function StageEditorPanel({ stage, allKeys, onClose, onSave }: {
  stage: StageDef;
  allKeys: string[];                       // sibling stage keys (excluding self)
  onClose: () => void;
  onSave: (next: StageDef) => void;
}) {
  // Deep-ish clone to allow local edits
  const initial: StageDef = {
    ...stage,
    stage_fields: [...(stage.stage_fields ?? stage.fields ?? [])],
    substeps: stage.substeps.map(ss => ({ ...ss, fields: ss.fields ? [...ss.fields] : [] })),
    fields: undefined,
  };
  const [s, setS] = useState<StageDef>(initial);

  // Substep template = first substep's fields (shared schema)
  const substepTemplate: StageField[] = s.substeps[0]?.fields ?? [];

  const [editingField, setEditingField] = useState<
    | { mode: 'stage'; idx: number | null }
    | { mode: 'substep'; idx: number | null }
    | null
  >(null);

  const updateStageField = (idx: number | null, f: StageField | null) => {
    let next = [...(s.stage_fields ?? [])];
    if (f === null && idx !== null) next.splice(idx, 1);
    else if (idx !== null) next[idx] = f!;
    else next.push(f!);
    setS({ ...s, stage_fields: next });
  };

  const moveStageField = (idx: number, dir: -1 | 1) => {
    const next = [...(s.stage_fields ?? [])];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setS({ ...s, stage_fields: next });
  };

  // Substep template is shared — write the same array to every substep
  const setSubstepTemplate = (template: StageField[]) => {
    setS({
      ...s,
      substeps: s.substeps.map(ss => ({ ...ss, fields: template })),
    });
  };

  const updateSubstepField = (idx: number | null, f: StageField | null) => {
    const next = [...substepTemplate];
    if (f === null && idx !== null) next.splice(idx, 1);
    else if (idx !== null) next[idx] = f!;
    else next.push(f!);
    setSubstepTemplate(next);
  };

  const moveSubstepField = (idx: number, dir: -1 | 1) => {
    const next = [...substepTemplate];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setSubstepTemplate(next);
  };

  const addSubstep = () => {
    const newKey = `substep_${s.substeps.length + 1}`;
    setS({
      ...s,
      substeps: [
        ...s.substeps,
        { key: newKey, label: `Substep ${s.substeps.length + 1}`, order: s.substeps.length + 1, description: '', fields: substepTemplate },
      ],
    });
  };
  const updateSubstep = (idx: number, patch: Partial<StageSubstep>) => {
    const next = [...s.substeps];
    next[idx] = { ...next[idx], ...patch };
    setS({ ...s, substeps: next });
  };
  const removeSubstep = (idx: number) => {
    if (!confirm(`Hapus substep "${s.substeps[idx].label}"?`)) return;
    setS({ ...s, substeps: s.substeps.filter((_, i) => i !== idx) });
  };
  const moveSubstep = (idx: number, dir: -1 | 1) => {
    const next = [...s.substeps];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    next.forEach((ss, i) => { ss.order = i + 1; });
    setS({ ...s, substeps: next });
  };

  const handleSave = () => {
    // Uniqueness checks
    const stageFieldKeys = (s.stage_fields ?? []).map(f => f.key);
    if (new Set(stageFieldKeys).size !== stageFieldKeys.length) {
      alert('Field keys di stage harus unik');
      return;
    }
    const substepKeys = s.substeps.map(ss => ss.key);
    if (new Set(substepKeys).size !== substepKeys.length) {
      alert('Substep keys harus unik');
      return;
    }
    const tplKeys = substepTemplate.map(f => f.key);
    if (new Set(tplKeys).size !== tplKeys.length) {
      alert('Field keys di substep harus unik');
      return;
    }
    if (allKeys.includes(s.key)) {
      alert('Stage key bertabrakan dengan stage lain di project type ini');
      return;
    }
    // If has_substeps was just turned off, drop substeps (data persists in DB on sites)
    const cleaned: StageDef = {
      ...s,
      substeps: s.has_substeps ? s.substeps : [],
    };
    onSave(cleaned);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl h-full overflow-hidden shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <button onClick={onClose} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="text-center flex-1 px-4 truncate">
            <p className="text-base font-black text-slate-800 truncate">{s.label || 'Stage baru'}</p>
            <p className="text-[10px] font-mono text-slate-400">{s.key}</p>
          </div>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm">
            <Save className="w-4 h-4" /> Simpan
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Stage Info */}
          <section>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Stage Info</p>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Stage Label *</span>
                <input value={s.label}
                  onChange={e => setS({ ...s, label: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Stage Key *</span>
                <input value={s.key}
                  onChange={e => setS({ ...s, key: slugify(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </label>
              <label className="flex items-center gap-3 cursor-pointer px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                <input type="checkbox" checked={s.has_substeps}
                  onChange={e => setS({ ...s, has_substeps: e.target.checked })}
                  className="w-4 h-4 rounded" />
                <div>
                  <p className="text-sm font-bold text-slate-700">Has Substeps?</p>
                  <p className="text-[11px] text-slate-400">Centang untuk mode checklist (mis. Combat Implementasi)</p>
                </div>
              </label>
            </div>
          </section>

          {!s.has_substeps && (
            <FieldsSection
              title="Form Fields"
              fields={s.stage_fields ?? []}
              onAdd={() => setEditingField({ mode: 'stage', idx: null })}
              onEdit={(idx) => setEditingField({ mode: 'stage', idx })}
              onDelete={(idx) => {
                if (!confirm('Hapus field? Data yang sudah tersimpan di site tidak akan dihapus.')) return;
                updateStageField(idx, null);
              }}
              onMove={moveStageField}
            />
          )}

          {s.has_substeps && (
            <>
              <FieldsSection
                title="Stage-level Fields (di atas substeps)"
                hint="Field ini muncul satu kali di atas semua substep — cocok untuk Status / Catatan global."
                fields={s.stage_fields ?? []}
                onAdd={() => setEditingField({ mode: 'stage', idx: null })}
                onEdit={(idx) => setEditingField({ mode: 'stage', idx })}
                onDelete={(idx) => {
                  if (!confirm('Hapus field?')) return;
                  updateStageField(idx, null);
                }}
                onMove={moveStageField}
              />

              {/* Substeps */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">Substeps ({s.substeps.length})</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Semua substep menggunakan skema field yang sama (lihat bawah)</p>
                  </div>
                  <button onClick={addSubstep}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
                    <Plus className="w-3.5 h-3.5" /> Tambah Substep
                  </button>
                </div>
                <div className="space-y-2">
                  {s.substeps.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada substep</p>
                  )}
                  {s.substeps.map((ss, i) => (
                    <SubstepRow
                      key={i}
                      ss={ss}
                      idx={i}
                      total={s.substeps.length}
                      onChange={(patch) => updateSubstep(i, patch)}
                      onMove={(dir) => moveSubstep(i, dir)}
                      onRemove={() => removeSubstep(i)}
                    />
                  ))}
                </div>
              </section>

              <FieldsSection
                title="Fields per Substep (shared template)"
                hint="Field ini muncul di setiap substep dengan skema yang sama."
                fields={substepTemplate}
                onAdd={() => setEditingField({ mode: 'substep', idx: null })}
                onEdit={(idx) => setEditingField({ mode: 'substep', idx })}
                onDelete={(idx) => {
                  if (!confirm('Hapus field dari semua substep? Data yang sudah tersimpan tidak dihapus.')) return;
                  updateSubstepField(idx, null);
                }}
                onMove={moveSubstepField}
              />
            </>
          )}
        </div>

        {editingField && (
          <FieldEditorModal
            initial={
              editingField.mode === 'stage'
                ? (editingField.idx !== null ? (s.stage_fields ?? [])[editingField.idx] : undefined)
                : (editingField.idx !== null ? substepTemplate[editingField.idx] : undefined)
            }
            existingKeys={
              editingField.mode === 'stage'
                ? (s.stage_fields ?? []).map(f => f.key).filter((_, i) => i !== editingField.idx)
                : substepTemplate.map(f => f.key).filter((_, i) => i !== editingField.idx)
            }
            onClose={() => setEditingField(null)}
            onSave={(f) => {
              if (editingField.mode === 'stage') updateStageField(editingField.idx, f);
              else updateSubstepField(editingField.idx, f);
              setEditingField(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function SubstepRow({ ss, idx, total, onChange, onMove, onRemove }: {
  ss: StageSubstep;
  idx: number;
  total: number;
  onChange: (patch: Partial<StageSubstep>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/60 border border-blue-100 rounded-lg">
      <div className="flex flex-col gap-0.5">
        <button onClick={() => onMove(-1)} disabled={idx === 0}
          className="text-blue-400 hover:text-blue-700 disabled:opacity-20 text-[9px] leading-none">▲</button>
        <button onClick={() => onMove(1)} disabled={idx === total - 1}
          className="text-blue-400 hover:text-blue-700 disabled:opacity-20 text-[9px] leading-none">▼</button>
      </div>
      <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 text-[9px] font-black flex items-center justify-center shrink-0">
        {idx + 1}
      </span>
      <input value={ss.label} placeholder="Label substep"
        onChange={e => onChange({ label: e.target.value, key: slugify(e.target.value) })}
        className="flex-1 px-2 py-1 border border-blue-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
      <input placeholder="Deskripsi (opsional)"
        value={ss.description ?? ''}
        onChange={e => onChange({ description: e.target.value })}
        className="flex-1 px-2 py-1 border border-blue-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
      <button onClick={onRemove} className="p-1 text-red-400 hover:bg-red-50 rounded">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function FieldsSection({ title, hint, fields, onAdd, onEdit, onDelete, onMove }: {
  title: string;
  hint?: string;
  fields: StageField[];
  onAdd: () => void;
  onEdit: (idx: number) => void;
  onDelete: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">{title} ({fields.length})</p>
          {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
        </div>
        <button onClick={onAdd}
          className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700">
          <Plus className="w-3.5 h-3.5" /> Tambah Field
        </button>
      </div>
      <div className="space-y-2">
        {fields.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Belum ada field</p>
        )}
        {fields.map((f, i) => (
          <FieldRow
            key={i}
            f={f}
            idx={i}
            total={fields.length}
            onEdit={() => onEdit(i)}
            onDelete={() => onDelete(i)}
            onMoveUp={() => onMove(i, -1)}
            onMoveDown={() => onMove(i, 1)}
          />
        ))}
      </div>
    </section>
  );
}

function FieldRow({ f, idx, total, onEdit, onDelete, onMoveUp, onMoveDown }: {
  f: StageField;
  idx: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isUpload = f.type === 'file_upload' || f.type === 'photo_upload' || f.type === 'file' || f.type === 'image';
  const TypeIcon = f.type === 'photo_upload' || f.type === 'image' ? ImageIcon : isUpload ? FileText : null;
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50/60 border border-emerald-100 rounded-lg">
      <div className="flex flex-col gap-0.5">
        <button onClick={onMoveUp} disabled={idx === 0}
          className="text-emerald-500 hover:text-emerald-700 disabled:opacity-20 text-[9px] leading-none">▲</button>
        <button onClick={onMoveDown} disabled={idx === total - 1}
          className="text-emerald-500 hover:text-emerald-700 disabled:opacity-20 text-[9px] leading-none">▼</button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {TypeIcon && <TypeIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
          <p className="font-bold text-sm text-slate-800 truncate">{f.label}</p>
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-white text-emerald-700 rounded border border-emerald-200">
            {f.type}
          </span>
          {f.required && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-50 text-red-600 rounded">required</span>
          )}
          {f.type === 'dropdown' && f.options && (
            <span className="text-[10px] text-slate-500">· {f.options.length} opsi</span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{f.key}</p>
      </div>
      <button onClick={onEdit} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={onDelete} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// FIELD EDITOR MODAL
// ────────────────────────────────────────────────────────────
function FieldEditorModal({ initial, existingKeys, onClose, onSave }: {
  initial?: StageField;
  existingKeys: string[];
  onClose: () => void;
  onSave: (f: StageField) => void;
}) {
  const [f, setF] = useState<StageField>(
    initial ?? {
      key: '', label: '', type: 'text', required: false,
      placeholder: '', options: [], accept: '', multiple: false, allow_camera: false,
    }
  );
  const [keyTouched, setKeyTouched] = useState(!!initial);

  // For file_upload, derive accept from extension checkbox state
  const acceptExts = (f.accept ?? '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const toggleExt = (ext: string) => {
    const set = new Set(acceptExts);
    set.has(ext) ? set.delete(ext) : set.add(ext);
    setF({ ...f, accept: Array.from(set).map(s => s.toLowerCase()).join(',') });
  };

  const keyConflict = f.key && existingKeys.includes(f.key);
  const canSave = f.label.trim() && f.key && !keyConflict;

  // Normalise on save
  const handleSave = () => {
    const out: StageField = { ...f };
    if (out.type === 'photo_upload') {
      out.accept = 'jpg,png';
      out.allow_camera = out.allow_camera ?? true;
      out.multiple = out.multiple ?? true;
    } else if (out.type === 'file_upload') {
      if (!out.accept) out.accept = 'pdf,docx,xlsx,jpg,png';
      out.multiple = out.multiple ?? true;
      delete out.allow_camera;
    } else {
      delete out.accept;
      delete out.multiple;
      delete out.allow_camera;
    }
    if (out.type !== 'dropdown') delete out.options;
    onSave(out);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h4 className="text-base font-black text-slate-800">{initial ? 'Edit Field' : 'Tambah Field'}</h4>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <label className="block">
            <span className="text-xs font-bold text-slate-600 uppercase">Field Label *</span>
            <input
              autoFocus
              value={f.label}
              onChange={e => {
                const lbl = e.target.value;
                setF(prev => ({
                  ...prev,
                  label: lbl,
                  key: keyTouched ? prev.key : slugify(lbl),
                }));
              }}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-600 uppercase">Field Key *</span>
            <input
              value={f.key}
              onChange={e => { setF({ ...f, key: slugify(e.target.value) }); setKeyTouched(true); }}
              className={`w-full mt-1 px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 ${
                keyConflict ? 'border-red-300 focus:ring-red-300' : 'border-slate-300 focus:ring-blue-300'
              }`}
            />
            <p className="text-[10px] text-slate-400 mt-1">Key ini digunakan sebagai nama field di database.</p>
            {keyConflict && <p className="text-[10px] text-red-600 mt-1">Key sudah dipakai oleh field lain.</p>}
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-600 uppercase">Field Type *</span>
            <select
              value={f.type}
              onChange={e => setF({ ...f, type: e.target.value as StageFieldType })}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {FIELD_TYPES.map(t => (
                <option key={t} value={t}>{FIELD_TYPE_LABELS[t] || t}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={f.required}
              onChange={e => setF({ ...f, required: e.target.checked })}
              className="w-4 h-4 rounded" />
            <span className="text-sm font-bold text-slate-700">Required?</span>
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-600 uppercase">Placeholder</span>
            <input
              value={f.placeholder ?? ''}
              onChange={e => setF({ ...f, placeholder: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </label>

          {f.type === 'dropdown' && (
            <label className="block">
              <span className="text-xs font-bold text-slate-600 uppercase">Options (satu per baris)</span>
              <textarea
                value={(f.options ?? []).join('\n')}
                onChange={e => setF({ ...f, options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                rows={5}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {(f.options ?? []).length > 0 && (
                <div className="mt-2 flex items-center gap-1 flex-wrap">
                  {(f.options ?? []).map((o, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">{o}</span>
                  ))}
                </div>
              )}
            </label>
          )}

          {f.type === 'file_upload' && (
            <>
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase">Accepted Files</span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {FILE_EXTS.map(ext => (
                    <label key={ext} className="flex items-center gap-2 cursor-pointer px-2 py-1.5 border border-slate-200 rounded hover:bg-slate-50">
                      <input type="checkbox" checked={acceptExts.includes(ext)}
                        onChange={() => toggleExt(ext)}
                        className="w-3.5 h-3.5 rounded" />
                      <span className="text-xs font-bold text-slate-700">{ext}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={f.multiple ?? false}
                  onChange={e => setF({ ...f, multiple: e.target.checked })}
                  className="w-4 h-4 rounded" />
                <span className="text-sm font-bold text-slate-700">Allow Multiple Files</span>
              </label>
            </>
          )}

          {f.type === 'photo_upload' && (
            <>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Accepted Files</p>
                <p className="text-xs text-slate-700 mt-0.5">JPG, PNG (fixed)</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={f.multiple ?? true}
                  onChange={e => setF({ ...f, multiple: e.target.checked })}
                  className="w-4 h-4 rounded" />
                <span className="text-sm font-bold text-slate-700">Allow Multiple Files</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={f.allow_camera ?? true}
                  onChange={e => setF({ ...f, allow_camera: e.target.checked })}
                  className="w-4 h-4 rounded" />
                <div>
                  <p className="text-sm font-bold text-slate-700">Camera Capture (mobile)</p>
                  <p className="text-[10px] text-slate-400">Buka kamera langsung di mobile</p>
                </div>
              </label>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-700 border border-slate-300 rounded-lg hover:bg-white">
            Batal
          </button>
          <button onClick={handleSave} disabled={!canSave}
            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Simpan Field
          </button>
        </div>
      </div>
    </div>
  );
}

// Re-export unused icons to avoid TS warnings if removed later
export { ChevronDown, ChevronUp };
