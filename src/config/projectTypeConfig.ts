import { query } from '../lib/surreal';
import { db } from '../db';

// ───────────────────────────────────────────────────────────
// Field types
// ───────────────────────────────────────────────────────────
export type StageFieldType =
  | 'text' | 'textarea' | 'number' | 'date' | 'time' | 'datetime'
  | 'dropdown' | 'toggle' | 'file_upload' | 'photo_upload'
  // Legacy aliases — still accepted from old data, normalised on read
  | 'file' | 'image';

export interface StageField {
  key: string;
  label: string;
  type: StageFieldType;
  required: boolean;
  placeholder?: string;
  // dropdown
  options?: string[];
  // file_upload / photo_upload
  accept?: string;          // comma-separated extensions, e.g. 'pdf,docx,xlsx,jpg,png'
  multiple?: boolean;
  // photo_upload only
  allow_camera?: boolean;
  // legacy — old data attached fields to substeps via this key
  substep_key?: string;
}

export interface StageSubstep {
  key: string;
  label: string;
  order: number;
  description?: string;
  // NEW: per-substep fields. In the UI, sysadmin defines ONE shared template
  // that is applied to every substep on save.
  fields?: StageField[];
}

export interface StageDef {
  key: string;
  label: string;
  order: number;
  is_auto?: boolean;          // Imported / BAST / Invoice / Selesai — no configurable fields
  has_substeps: boolean;
  substeps: StageSubstep[];
  // NEW name. Old data uses `fields` — readers below normalise.
  stage_fields?: StageField[];
  fields?: StageField[];      // legacy
}

export interface ProjectTypeConfig {
  id?: string;
  type_key: string;
  label: string;
  color: string;
  is_system: boolean;
  stages: StageDef[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ───────────────────────────────────────────────────────────
// Read helpers — handle both new and legacy shapes
// ───────────────────────────────────────────────────────────
export function getStageFields(stage: StageDef): StageField[] {
  const fs = stage.stage_fields ?? stage.fields ?? [];
  // Filter out legacy substep_key fields — they belong to substeps in old data
  if (stage.stage_fields) return stage.stage_fields;
  return fs.filter(f => !f.substep_key);
}

export function getSubstepFields(stage: StageDef, substep: StageSubstep): StageField[] {
  if (substep.fields && substep.fields.length > 0) return substep.fields;
  const legacy = stage.fields ?? [];
  return legacy.filter(f => f.substep_key === substep.key);
}

// Normalise a field type from legacy names → new names
export function normaliseFieldType(t: StageFieldType): StageFieldType {
  if (t === 'file') return 'file_upload';
  if (t === 'image') return 'photo_upload';
  return t;
}

// ───────────────────────────────────────────────────────────
// Auto-tab constants (used by the ATP work page, NOT stored in config)
// ───────────────────────────────────────────────────────────
export const AUTO_TAB_KEYS = ['penagihan', 'foto', 'file', 'log'] as const;

// ───────────────────────────────────────────────────────────
// Field templates — reused across stages
// ───────────────────────────────────────────────────────────
const PERMIT_FIELDS: StageField[] = [
  {
    key: 'permit_status', label: 'Permit Status', type: 'dropdown', required: false, placeholder: 'Select...',
    options: ['1. Planning', '2. Waiting for TO Approval', '4. Tpass Released',
              '5. Permit Released', '6. Expired Permit', '9. Cancelled'],
  },
  { key: 'permit_create_date', label: 'Create Date',   type: 'date', required: false, placeholder: 'mm/dd/yyyy' },
  { key: 'permit_start_date',  label: 'Permit Start',  type: 'date', required: false, placeholder: 'mm/dd/yyyy' },
  { key: 'permit_expiry_date', label: 'Permit Expiry', type: 'date', required: false, placeholder: 'mm/dd/yyyy' },
  { key: 'tpas_number', label: 'TPAS Nomor', type: 'text', required: false },
  { key: 'pic_nama',    label: 'PIC Nama',   type: 'text', required: false },
  { key: 'pic_telp',    label: 'PIC Telp',   type: 'text', required: false },
  {
    key: 'jenis_kunci', label: 'Jenis Kunci', type: 'dropdown', required: false, placeholder: 'Select...',
    options: ['PADLOCK', 'SMARTLOCK', 'QUADLOCK'],
  },
  {
    key: 'permit_docs', label: 'Upload Dokumen Permit', type: 'file_upload', required: false,
    placeholder: 'PDF, DOCX, XLSX, JPG, PNG — drag & drop atau klik',
    accept: 'pdf,docx,xlsx,jpg,png', multiple: true,
  },
  {
    key: 'permit_photos', label: 'Upload Foto Permit', type: 'photo_upload', required: false,
    placeholder: 'JPG, PNG — drag & drop atau klik',
    accept: 'jpg,png', multiple: true, allow_camera: true,
  },
];

const IMPL_FIELDS_FILTER: StageField[] = [
  {
    key: 'implementasi_status', label: 'Implementasi Status', type: 'dropdown', required: false,
    options: ['Awaiting', 'Scheduled', 'On Going', 'RFS', 'On Hold', 'Cancelled'],
  },
  { key: 'team_name',      label: 'Tim',            type: 'text', required: false },
  { key: 'tanggal_plan',   label: 'Tanggal Plan',   type: 'date', required: false, placeholder: 'mm/dd/yyyy' },
  { key: 'tanggal_aktual', label: 'Tanggal Aktual', type: 'date', required: false, placeholder: 'mm/dd/yyyy' },
  { key: 'ci_date', label: 'CI Tanggal', type: 'date', required: false, placeholder: 'mm/dd/yyyy' },
  { key: 'ci_time', label: 'CI Waktu',   type: 'time', required: false },
  { key: 'co_date', label: 'CO Tanggal', type: 'date', required: false, placeholder: 'mm/dd/yyyy' },
  { key: 'co_time', label: 'CO Waktu',   type: 'time', required: false },
  { key: 'impl_rfi_done', label: 'RFI Done', type: 'toggle',   required: false },
  { key: 'note_impl',     label: 'Catatan',  type: 'textarea', required: false },
  {
    key: 'impl_docs', label: 'Upload Dokumen Implementasi', type: 'file_upload', required: false,
    placeholder: 'PDF, DOCX, XLSX, JPG, PNG — drag & drop atau klik',
    accept: 'pdf,docx,xlsx,jpg,png', multiple: true,
  },
  {
    key: 'impl_photos', label: 'Upload Foto Implementasi', type: 'photo_upload', required: false,
    placeholder: 'JPG, PNG — drag & drop atau klik',
    accept: 'jpg,png', multiple: true, allow_camera: true,
  },
];

const ATP_FIELDS: StageField[] = [
  {
    key: 'status_atp', label: 'Status ATP', type: 'dropdown', required: false, placeholder: 'Select...',
    options: ['REQUEST PDID', 'UPLOAD TAGGING DONE', 'TAGGING N/A', 'HOLD'],
  },
  { key: 'pdid',      label: 'PDID',      type: 'text', required: false, placeholder: 'NEED PDID' },
  { key: 'tiket_atp', label: 'Tiket ATP', type: 'text', required: false },
  { key: 'note_atp',  label: 'Note',      type: 'textarea', required: false },
  {
    key: 'atp_docs', label: 'Upload Dokumen ATP & Dokumen', type: 'file_upload', required: false,
    placeholder: 'PDF, DOCX, XLSX, JPG, PNG — drag & drop atau klik',
    accept: 'pdf,docx,xlsx,jpg,png', multiple: true,
  },
  {
    key: 'atp_photos', label: 'Upload Foto ATP & Dokumen', type: 'photo_upload', required: false,
    placeholder: 'JPG, PNG — drag & drop atau klik',
    accept: 'jpg,png', multiple: true, allow_camera: true,
  },
];

// Combat substep template — every substep shares this field schema.
const COMBAT_SUBSTEP_FIELDS: StageField[] = [
  { key: 'status', label: 'Status', type: 'dropdown', required: false,
    options: ['pending', 'in_progress', 'done'] },
  { key: 'date',   label: 'Tanggal', type: 'date', required: false },
  { key: 'person', label: 'Person',  type: 'text', required: false },
  { key: 'notes',  label: 'Catatan', type: 'textarea', required: false },
  { key: 'docs',   label: 'Upload Dokumen', type: 'file_upload', required: false,
    placeholder: 'PDF, DOCX, JPG, PNG', accept: 'pdf,docx,jpg,png', multiple: true },
  { key: 'photos', label: 'Upload Foto',    type: 'photo_upload', required: false,
    placeholder: 'JPG, PNG', accept: 'jpg,png', multiple: true, allow_camera: true },
];

const mkSub = (key: string, label: string, order: number, description: string): StageSubstep => ({
  key, label, order, description, fields: COMBAT_SUBSTEP_FIELDS,
});

// Rescoping survey + erfin
const SURVEY_FIELDS: StageField[] = [
  { key: 'survey_date', label: 'Survey Date', type: 'date', required: false, placeholder: 'mm/dd/yyyy' },
  {
    key: 'survey_result', label: 'Survey Result', type: 'dropdown', required: false,
    options: ['OK', 'NOK'],
  },
  { key: 'survey_nok_reason', label: 'NOK Reason', type: 'textarea', required: false },
  {
    key: 'survey_photos', label: 'Upload Foto Survey', type: 'photo_upload', required: false,
    placeholder: 'JPG, PNG', accept: 'jpg,png', multiple: true, allow_camera: true,
  },
];

const ERFIN_FIELDS: StageField[] = [
  { key: 'erfin_number',     label: 'ERFIN Number',     type: 'text',     required: false },
  { key: 'erfin_date',       label: 'ERFIN Date',       type: 'date',     required: false, placeholder: 'mm/dd/yyyy' },
  { key: 'erfin_ready_date', label: 'ERFIN Ready Date', type: 'date',     required: false, placeholder: 'mm/dd/yyyy' },
  { key: 'erfin_note',       label: 'ERFIN Notes',      type: 'textarea', required: false },
  {
    key: 'erfin_docs', label: 'ERFIN Document', type: 'file_upload', required: false,
    placeholder: 'PDF, DOCX, JPG, PNG', accept: 'pdf,docx,jpg,png', multiple: true,
  },
];

// ───────────────────────────────────────────────────────────
// SYSTEM DEFAULTS
// ───────────────────────────────────────────────────────────
export const SYSTEM_DEFAULTS: ProjectTypeConfig[] = [
  {
    type_key: 'filter',
    label: 'Filter',
    color: '#16A34A',
    is_system: true,
    stages: [
      { key: 'imported',     label: 'Imported',     order: 0, is_auto: true,  has_substeps: false, stage_fields: [], substeps: [] },
      { key: 'permit',       label: 'Permit',       order: 1, is_auto: false, has_substeps: false, stage_fields: PERMIT_FIELDS,      substeps: [] },
      { key: 'implementasi', label: 'Implementasi', order: 2, is_auto: false, has_substeps: false, stage_fields: IMPL_FIELDS_FILTER, substeps: [] },
      { key: 'atp',          label: 'ATP & Dokumen', order: 3, is_auto: false, has_substeps: false, stage_fields: ATP_FIELDS,         substeps: [] },
      { key: 'bast',         label: 'BAST',         order: 4, is_auto: true,  has_substeps: false, stage_fields: [], substeps: [] },
      { key: 'invoice',      label: 'Invoice',      order: 5, is_auto: true,  has_substeps: false, stage_fields: [], substeps: [] },
      { key: 'selesai',      label: 'Selesai',      order: 6, is_auto: true,  has_substeps: false, stage_fields: [], substeps: [] },
    ],
  },
  {
    type_key: 'combat',
    label: 'Combat',
    color: '#EA580C',
    is_system: true,
    stages: [
      { key: 'imported', label: 'Imported', order: 0, is_auto: true,  has_substeps: false, stage_fields: [], substeps: [] },
      { key: 'permit',   label: 'Permit',   order: 1, is_auto: false, has_substeps: false, stage_fields: PERMIT_FIELDS, substeps: [] },
      {
        key: 'implementasi', label: 'Implementasi', order: 2, is_auto: false, has_substeps: true,
        stage_fields: [
          { key: 'impl_status', label: 'Status', type: 'dropdown', required: false,
            options: ['Awaiting', 'On Going', 'Selesai'] },
          { key: 'note_impl', label: 'Catatan', type: 'textarea', required: false },
        ],
        substeps: [
          mkSub('sitac',         'SITAC',         1, 'Site Acquisition — izin lokasi'),
          mkSub('dimentle_cruz', 'Dimentle Cruz', 2, 'Civil works — pondasi, grounding'),
          mkSub('towing',        'Towing',        3, 'Tower erection'),
          mkSub('psb_pln',       'PSB PLN',       4, 'Power connection'),
          mkSub('instal_cruz',   'Instal Cruz',   5, 'Equipment installation'),
          mkSub('optim',         'OPTIM',         6, 'RF optimization'),
        ],
      },
      { key: 'atp',     label: 'ATP & Dokumen', order: 3, is_auto: false, has_substeps: false, stage_fields: ATP_FIELDS, substeps: [] },
      { key: 'bast',    label: 'BAST',    order: 4, is_auto: true, has_substeps: false, stage_fields: [], substeps: [] },
      { key: 'invoice', label: 'Invoice', order: 5, is_auto: true, has_substeps: false, stage_fields: [], substeps: [] },
      { key: 'selesai', label: 'Selesai', order: 6, is_auto: true, has_substeps: false, stage_fields: [], substeps: [] },
    ],
  },
  {
    type_key: 'rescoping',
    label: 'Rescoping',
    color: '#0891B2',
    is_system: true,
    stages: [
      { key: 'imported',     label: 'Imported',     order: 0, is_auto: true,  has_substeps: false, stage_fields: [],             substeps: [] },
      { key: 'survey',       label: 'Survey',       order: 1, is_auto: false, has_substeps: false, stage_fields: SURVEY_FIELDS,  substeps: [] },
      { key: 'erfin',        label: 'ERFIN',        order: 2, is_auto: false, has_substeps: false, stage_fields: ERFIN_FIELDS,   substeps: [] },
      { key: 'permit',       label: 'Permit',       order: 3, is_auto: false, has_substeps: false, stage_fields: PERMIT_FIELDS,  substeps: [] },
      { key: 'implementasi', label: 'Implementasi', order: 4, is_auto: false, has_substeps: false, stage_fields: IMPL_FIELDS_FILTER, substeps: [] },
      { key: 'atp',          label: 'ATP & Dokumen', order: 5, is_auto: false, has_substeps: false, stage_fields: ATP_FIELDS,    substeps: [] },
      { key: 'bast',         label: 'BAST',         order: 6, is_auto: true,  has_substeps: false, stage_fields: [], substeps: [] },
      { key: 'invoice',      label: 'Invoice',      order: 7, is_auto: true,  has_substeps: false, stage_fields: [], substeps: [] },
      { key: 'selesai',      label: 'Selesai',      order: 8, is_auto: true,  has_substeps: false, stage_fields: [], substeps: [] },
    ],
  },
];

// ───────────────────────────────────────────────────────────
// Schema + seed
// ───────────────────────────────────────────────────────────
// NOTE: PERMISSIONS FULL is required — without it SurrealDB rejects CREATE/UPDATE
// with "IAM error: Not enough permissions to perform this action" for non-root scope.
// `DEFINE TABLE OVERWRITE` re-applies the table-level options (incl. permissions)
// without dropping data or field definitions.
const SCHEMA_SQL = `
  DEFINE TABLE OVERWRITE project_type_configs SCHEMAFULL PERMISSIONS FULL;
  DEFINE FIELD IF NOT EXISTS type_key      ON project_type_configs TYPE string;
  DEFINE FIELD IF NOT EXISTS label         ON project_type_configs TYPE string;
  DEFINE FIELD IF NOT EXISTS color         ON project_type_configs TYPE string DEFAULT '#2563EB';
  DEFINE FIELD IF NOT EXISTS is_system     ON project_type_configs TYPE bool DEFAULT false;
  DEFINE FIELD IF NOT EXISTS stages        ON project_type_configs TYPE array DEFAULT [];
  DEFINE FIELD IF NOT EXISTS created_by    ON project_type_configs TYPE option<string>;
  DEFINE FIELD IF NOT EXISTS created_at    ON project_type_configs TYPE datetime DEFAULT time::now();
  DEFINE FIELD IF NOT EXISTS updated_at    ON project_type_configs TYPE datetime DEFAULT time::now();
  DEFINE INDEX IF NOT EXISTS idx_type_key  ON project_type_configs FIELDS type_key UNIQUE;
`;

// Detect old-shape stage (has `fields` but no `stage_fields`, or uses legacy type names).
function hasLegacyShape(cfg: ProjectTypeConfig): boolean {
  for (const s of cfg.stages || []) {
    if (s.is_auto === undefined) return true;
    if ((s as any).fields && !s.stage_fields) return true;
    const all = [...(s.stage_fields ?? []), ...(s.fields ?? [])];
    if (all.some(f => f.type === 'file' || f.type === 'image')) return true;
  }
  return false;
}

let schemaApplied = false;
export async function ensureProjectTypeConfigSchema(): Promise<void> {
  // Always re-apply DEFINE TABLE OVERWRITE so PERMISSIONS FULL is set even on existing tables.
  // Field/index definitions use IF NOT EXISTS so they're safe to re-run.
  try {
    await db.query(SCHEMA_SQL);
    schemaApplied = true;
  } catch (e) {
    console.warn('[project_type_configs] DEFINE TABLE failed:', e);
  }
  if (schemaApplied) {
    // Already seeded during this session — skip
    return;
  }
  try {
    const existing = await query<ProjectTypeConfig>('SELECT * FROM project_type_configs;');
    const byKey = new Map(existing.map(r => [r.type_key, r] as const));
    for (const def of SYSTEM_DEFAULTS) {
      const cur = byKey.get(def.type_key);
      if (!cur) {
        await db.query(
          `CREATE project_type_configs SET type_key = $type_key, label = $label, color = $color, is_system = true, stages = $stages, created_at = time::now(), updated_at = time::now()`,
          { type_key: def.type_key, label: def.label, color: def.color, stages: def.stages },
        );
      } else if (cur.is_system && hasLegacyShape(cur)) {
        await db.query(
          `UPDATE ${cur.id} SET label = $label, color = $color, is_system = true, stages = $stages, updated_at = time::now()`,
          { label: def.label, color: def.color, stages: def.stages },
        );
      }
    }
  } catch (e) {
    console.warn('[project_type_configs] seed failed:', e);
  }
}

// ───────────────────────────────────────────────────────────
// Persistence layer — write-both strategy
//
// 1. localStorage → written first, instant, always succeeds
// 2. SurrealDB    → written async; if DB has IAM restrictions
//                   or is offline the localStorage copy is the
//                   source of truth.
// On READ: DB rows + localStorage rows are merged; localStorage
// wins on conflict (most recent browser edit takes precedence).
// ───────────────────────────────────────────────────────────
const LS_KEY = 'project_type_configs_v2';

function lsRead(): ProjectTypeConfig[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProjectTypeConfig[];
  } catch {
    return [];
  }
}

function lsWrite(rows: ProjectTypeConfig[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  } catch (e) {
    console.warn('[project_type_configs] localStorage write failed', e);
  }
}

/** Try to persist a record to SurrealDB. Never throws — logs on failure. */
async function dbSave(record: ProjectTypeConfig): Promise<void> {
  try {
    const params = {
      type_key:  record.type_key,
      label:     record.label,
      color:     record.color,
      is_system: record.is_system,
      stages:    record.stages,
    };
    // Find the real DB id (may be stored in localStorage or passed in)
    const dbId = record.id && !record.id.startsWith('local_') && !record.id.startsWith('__system_')
      ? record.id
      : null;

    if (dbId) {
      await db.query(
        `UPDATE ${dbId} SET type_key = $type_key, label = $label, color = $color, is_system = $is_system, stages = $stages, updated_at = time::now()`,
        params,
      );
    } else {
      // Check if a DB record already exists for this type_key
      const existing = await query<ProjectTypeConfig>(
        `SELECT id FROM project_type_configs WHERE type_key = $type_key LIMIT 1`,
        { type_key: record.type_key },
      );
      if (existing[0]?.id) {
        // Update the existing DB record and cache its id in localStorage
        const realId = String(existing[0].id);
        await db.query(
          `UPDATE ${realId} SET type_key = $type_key, label = $label, color = $color, is_system = $is_system, stages = $stages, updated_at = time::now()`,
          params,
        );
        // Patch the localStorage record with the real DB id for future updates
        const rows = lsRead();
        const idx = rows.findIndex(r => r.type_key === record.type_key);
        if (idx >= 0) { rows[idx].id = realId; lsWrite(rows); }
      } else {
        // Truly new — create in DB
        const res = await db.query(
          `CREATE project_type_configs SET type_key = $type_key, label = $label, color = $color, is_system = $is_system, stages = $stages, created_at = time::now(), updated_at = time::now()`,
          params,
        );
        // Patch localStorage with real DB id so future saves use UPDATE
        const created = (res as any)?.[0]?.[0] ?? (res as any)?.[0];
        const newId = created?.id ? String(created.id) : null;
        if (newId) {
          const rows = lsRead();
          const idx = rows.findIndex(r => r.type_key === record.type_key);
          if (idx >= 0) { rows[idx].id = newId; lsWrite(rows); }
        }
      }
    }
    console.info('[project_type_configs] DB save OK →', record.type_key);
  } catch (e) {
    console.warn('[project_type_configs] DB save failed (localStorage is source of truth):', e);
  }
}

/** Try to delete a record from SurrealDB by DB id. */
async function dbDelete(id: string): Promise<void> {
  if (!id || id.startsWith('local_') || id.startsWith('__system_')) return;
  try {
    await db.query(`DELETE ${id};`);
  } catch (e) {
    console.warn('[project_type_configs] DB delete failed:', e);
  }
}

/**
 * Merge all sources:
 * - DB (all rows, not just system)
 * - localStorage edits
 * localStorage wins on conflict.
 */
async function mergedConfigs(): Promise<ProjectTypeConfig[]> {
  // 1. Read all DB rows
  let dbRows: ProjectTypeConfig[] = [];
  try {
    dbRows = await query<ProjectTypeConfig>(
      `SELECT * FROM project_type_configs ORDER BY label ASC;`,
    );
  } catch {
    // DB unavailable — rely on localStorage + in-memory defaults
  }

  // 2. Seed in-memory defaults for any system type missing from DB
  const dbKeys = new Set(dbRows.map(r => r.type_key));
  const fallbackSystemRows = SYSTEM_DEFAULTS
    .filter(d => !dbKeys.has(d.type_key))
    .map((d, i) => ({ ...d, id: `__system_${i}` }));

  // 3. Read localStorage
  const lsRows = lsRead();

  // 4. Merge: DB < fallback-defaults < localStorage
  const merged = new Map<string, ProjectTypeConfig>();
  for (const r of [...dbRows, ...fallbackSystemRows]) merged.set(r.type_key, r);
  for (const r of lsRows) merged.set(r.type_key, r); // ls always wins

  return Array.from(merged.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export async function loadAllProjectTypeConfigs(): Promise<ProjectTypeConfig[]> {
  return mergedConfigs();
}

export async function loadProjectTypeConfig(typeKey: string): Promise<ProjectTypeConfig | null> {
  const key = String(typeKey || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const candidates = key === 're_scoping' ? ['rescoping', key] : [key];
  const all = await mergedConfigs();
  for (const k of candidates) {
    const found = all.find(c => c.type_key === k);
    if (found) return found;
  }
  return null;
}

export async function saveProjectTypeConfig(cfg: ProjectTypeConfig): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const record: ProjectTypeConfig = {
      ...cfg,
      id: cfg.id ?? `local_${cfg.type_key}_${Date.now()}`,
      updated_at: now,
      created_at: cfg.created_at ?? now,
    };

    // Step 1: Write to localStorage immediately (instant, reliable)
    const rows = lsRead();
    const idx = rows.findIndex(r => r.type_key === record.type_key);
    if (idx >= 0) rows[idx] = record;
    else rows.push(record);
    lsWrite(rows);

    // Step 2: Write to DB asynchronously (best-effort, non-blocking)
    dbSave(record);

    return true;
  } catch (e) {
    console.error('[saveProjectTypeConfig]', e);
    return false;
  }
}

export async function deleteProjectTypeConfig(id: string): Promise<boolean> {
  try {
    // Remove from localStorage
    const rows = lsRead().filter(r => r.id !== id && r.type_key !== id);
    lsWrite(rows);
    // Remove from DB best-effort
    dbDelete(id);
    return true;
  } catch (e) {
    console.error('[deleteProjectTypeConfig]', e);
    return false;
  }
}

// Reset a single system type to defaults.
export async function resetSystemTypeToDefaults(typeKey: string): Promise<boolean> {
  const def = SYSTEM_DEFAULTS.find(d => d.type_key === typeKey);
  if (!def) return false;
  return saveProjectTypeConfig({ ...def });
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}


