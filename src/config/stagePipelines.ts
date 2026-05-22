import type { SiteStage } from '../types';

export const COMBAT_PIPELINE: SiteStage[] = [
  'imported',
  'assigned',
  'permit_process',
  'permit_ready',
  'akses_process',
  'akses_ready',
  'implementasi',
  'dokumen_done',
  'bast',
  'invoice',
  'completed',
];

export type CombatImplStepKey = 'sitac' | 'dimentle_cruz' | 'towing' | 'psb_pln' | 'instal_cruz' | 'optim';
export type CombatImplStepStatus = 'pending' | 'in_progress' | 'done';

export interface CombatImplStep {
  status: CombatImplStepStatus;
  date: string | null;
  person: string | null;
  notes: string | null;
}

export type CombatImplSteps = Record<CombatImplStepKey, CombatImplStep>;

export const COMBAT_IMPL_STEPS: { key: CombatImplStepKey; label: string; description: string }[] = [
  { key: 'sitac',         label: 'SITAC',        description: 'Site Acquisition — izin lokasi / land rights' },
  { key: 'dimentle_cruz', label: 'Dimentle Cruz', description: 'Civil works — pondasi, grounding' },
  { key: 'towing',        label: 'Towing',        description: 'Tower erection — pemasangan tower' },
  { key: 'psb_pln',       label: 'PSB PLN',       description: 'Power connection — penyambungan PLN' },
  { key: 'instal_cruz',   label: 'Instal Cruz',   description: 'Equipment installation — RRU, antena, kabel' },
  { key: 'optim',         label: 'OPTIM',         description: 'Optimization — tuning, testing, RF optimization' },
];

export const DEFAULT_COMBAT_IMPL_STEPS: CombatImplSteps = {
  sitac:         { status: 'pending', date: null, person: null, notes: null },
  dimentle_cruz: { status: 'pending', date: null, person: null, notes: null },
  towing:        { status: 'pending', date: null, person: null, notes: null },
  psb_pln:       { status: 'pending', date: null, person: null, notes: null },
  instal_cruz:   { status: 'pending', date: null, person: null, notes: null },
  optim:         { status: 'pending', date: null, person: null, notes: null },
};

// Stepper nodes for the ATP work page (7 nodes, simplified)
export const COMBAT_STEPPER_NODES: { label: string; stages: SiteStage[] }[] = [
  { label: 'Imported',     stages: ['imported'] },
  { label: 'Permit',       stages: ['permit_process', 'permit_ready'] },
  { label: 'Implementasi', stages: ['akses_process', 'akses_ready', 'implementasi'] },
  { label: 'ATP',          stages: ['atp', 'dokumen_done'] },
  { label: 'BAST',         stages: ['bast'] },
  { label: 'Invoice',      stages: ['invoice'] },
  { label: 'Selesai',      stages: ['completed'] },
];

export function countCombatDone(steps: CombatImplSteps | null | undefined): number {
  if (!steps) return 0;
  return COMBAT_IMPL_STEPS.filter(s => steps[s.key]?.status === 'done').length;
}

export const RESCOPING_PIPELINE: SiteStage[] = [
  'imported',
  'assigned',
  'survey',          // ← new: survey site, get OK/NOK result
  'survey_nok',      // ← dead end (can be reset)
  'erfin_process',   // ← new: prepare ERFIN installation approval doc
  'erfin_ready',     // ← new: ERFIN approved
  'permit_process',
  'permit_ready',
  'akses_process',
  'akses_ready',
  'implementasi',
  'rfi_done',        // ← RFI not RFS
  'dokumen_done',
  'bast',
  'invoice',
  'completed'
];

export const RESCOPING_VALID_TRANSITIONS: Record<string, string[]> = {
  imported:       ['assigned'],
  assigned:       ['survey'],
  survey:         ['erfin_process', 'survey_nok'],
  survey_nok:     ['survey'],
  erfin_process:  ['erfin_ready'],
  erfin_ready:    ['permit_process'],
  permit_process: ['permit_ready'],
  permit_ready:   ['akses_process'],
  akses_process:  ['akses_ready'],
  akses_ready:    ['implementasi'],
  implementasi:   ['dokumen_done'],   // RFI Done is a checkbox, not a stage gate
  rfi_done:       ['dokumen_done'],   // backward-compat for old data
  dokumen_done:   ['bast'],
  bast:           ['invoice'],
  invoice:        ['completed'],
  completed:      []
};

export const RESCOPING_STEPPER_NODES = [
  { label: 'Imported',       stages: ['imported'] },
  { label: 'Survey',         stages: ['assigned', 'survey', 'survey_nok'] },
  { label: 'ERFIN',          stages: ['erfin_process', 'erfin_ready'] },
  { label: 'Permit',         stages: ['permit_process', 'permit_ready'] },
  { label: 'Implementasi',   stages: ['akses_process', 'akses_ready', 'implementasi', 'rfi_done'] },
  { label: 'ATP',            stages: ['atp', 'dokumen_done'] },
  { label: 'BAST',           stages: ['bast'] },
  { label: 'Selesai',        stages: ['invoice', 'completed'] },
];
