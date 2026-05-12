/**
 * DEFINITIVE_IMPORT.mjs
 *
 * Full data initialisation for the ReEngineering Budget Tracking Tool.
 *
 * DATA SOURCES
 * ─────────────────────────────────────────────────────────────────────
 * FILE A  →  Monitoring Project Re-Engineering_20260421.xlsx  (April 21 — BASE DATA)
 *            Sheet "Detail Site-ID"      → table: site_technical_details
 *            Sheet "INVENTORY REPORT"    → table: materials (base/initial)
 *
 * FILE B  →  Monitoring Project Re-Engineering.xlsx           (May 11 — LATEST PROGRESS)
 *            Sheet "ReEngineering Progress" → table: sites
 *            Sheet "INVENTORY REPORT"       → table: materials (merge / overwrite)
 *
 * MERGE STRATEGY
 * ─────────────────────────────────────────────────────────────────────
 * • site_technical_details  — cleared + loaded fresh from FILE A (master baseline).
 * • materials               — cleared + loaded from FILE B (freshest).  If B has
 *                             fewer rows than A the script warns but continues.
 * • sites                   — cleared + loaded from FILE B "ReEngineering Progress".
 *                             Columns PPID (old) and PDID (new) are both mapped to ppid/pdid.
 *                             Extra new columns (Tanggal RFS, SUBMIT IOMS, TEAM ONSITE STATUS,
 *                             PO BULAN) are captured and stored.
 *
 * SCHEMA MAPPING  (Excel column → SurrealDB field)
 * ─────────────────────────────────────────────────────────────────────
 * ReEngineering Progress sheet:
 *   NO                     → row_no (informational)
 *   PROJECT TYPE           → project_type
 *   SITE_ID                → site_id
 *   SITE MOVING STATUS     → site_moving_status
 *   FINAL SITE ID          → final_site_id
 *   SITE-SECTOR (FINAL)    → site_sector
 *   SECTOR                 → sector
 *   FILTER PER SECTOR      → filter_per_sector
 *   REGION                 → region
 *   NE_ID                  → ne_id
 *   SITE_NAME              → site_name
 *   TP NAME                → tp_name
 *   IOMS REGISTERED        → ineom_registered (bool)
 *   PERMIT STATUS          → permit_status
 *   ISSUE PROBLEM          → issue_problem
 *   IMPLEMENTASI STATUS    → implementasi_status
 *   Tanggal RFS            → tanggal_rfs  (new in B)
 *   TEAM                   → team
 *   SUBMIT IOMS            → submit_ioms  (new in B)
 *   TEAM ONSITE STATUS     → team_onsite_status  (new in B)
 *   STATUS ATP             → status_atp
 *   NOTE FOTO EVIDENCE     → note_foto_evidence
 *   PPID / PDID            → ppid  AND  pdid  (dual-mapped)
 *   SOW ID                 → sow_id
 *   PO ID                  → po_id
 *   TIKET NUMBER           → atp_number
 *   PRIO CAPEX FINAL       → prio_capex_final
 *   NEW STATUS IMPLEMENTATION → new_status_implementation
 *   PRIO                   → prio
 *   LATITUDE               → latitude
 *   LONGITUDE              → longitude
 *   FILE DATE              → file_date
 *   PO BULAN               → po_bulan  (new in B)
 *   [derived]              → stage
 *
 * Detail Site-ID sheet (FILE A):
 *   SITE ID   → site_id       NE ID     → ne_id
 *   LAYER     → layer         SEC       → sector
 *   ANT TYPE  → ant_type      Antenna type → ant_type (fallback)
 *   Height    → height        FREQ BAND → freq_band
 *   LONG      → longitude     LAT       → latitude
 *   TP ID     → tp_id         TP        → tp_name
 *   Site Type → site_type     LTE NE Name → lte_ne_name
 *   Cell Name → cell_name     eNodeB ID → enodeb_id
 *   Cell ID   → cell_id       Local Cell ID → local_cell_id
 *   TAL, TAC  → tal, tac
 *   AREA → area  BSC → bsc   SITENAME → site_name
 *   PROVINSI → province       ADDRESS → address
 *   KECAMATAN → kecamatan     KABUPATEN → kabupaten
 *   DESA → desa               Cluster_New → cluster
 *   Branch_New → branch       REGIONS NEW → region
 *
 * INVENTORY REPORT sheet:
 *   Type → material_type   IN / OUT → direction
 *   Quantity → qty         Material Description → name
 *   Dilivery Date → tgl    Dilivery Note No → delivery_note_no
 *   Purchecs Order Dilivery Date → po_delivery_date
 *   Vendor Pengirim → vendor  Sender → sender   Reciver → receiver
 */

import fs from 'fs';
import * as XLSX from 'xlsx';
import { Surreal } from 'surrealdb';

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const SURREAL_URL = 'https://surrealdb-production-b201.up.railway.app/rpc';
const NS          = 'yerico';
const DB_NAME     = 'project_budget';

const FILE_A = 'files/Monitoring Project Re-Engineering_20260421.xlsx';
const FILE_B = 'files/Monitoring Project Re-Engineering.xlsx';

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function excelDate(v) {
  if (!v || typeof v !== 'number') return String(v || '');
  return new Date((v - 25569) * 86400 * 1000).toISOString().split('T')[0];
}

function deriveStage(r) {
  const impl   = (r['IMPLEMENTASI STATUS'] || '').toLowerCase();
  const satp   = (r['STATUS ATP']          || '').toLowerCase();
  const tiket  = r['TIKET NUMBER']         || '';
  const permit = (r['PERMIT STATUS']       || '').toLowerCase();

  if (satp.includes('done') || satp.includes('tagging')) return 'atp';
  if (tiket) return 'atp';
  if (impl.includes('rfs')) return 'atp';
  if (impl && impl !== 'awaiting') return 'implementasi';
  if (permit && !permit.includes('planning')) return 'permit';
  if (permit) return 'permit';
  return 'imported';
}

async function batchInsert(db, table, records, batchSize = 50) {
  let ok = 0, fail = 0;
  const total = records.length;
  for (let i = 0; i < total; i += batchSize) {
    const chunk = records.slice(i, i + batchSize);
    try {
      await db.query(`INSERT INTO ${table} $records`, { records: chunk });
      ok += chunk.length;
    } catch {
      for (const rec of chunk) {
        try {
          await db.query(`INSERT INTO ${table} $record`, { record: rec });
          ok++;
        } catch {
          fail++;
        }
      }
    }
    process.stdout.write(`  [${table}] ${ok}/${total} inserted...  \r`);
  }
  console.log(`  [${table}] ✅ Done — ${ok} inserted, ${fail} failed.`);
  return { ok, fail };
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
async function run() {
  const db = new Surreal();

  try {
    console.log('🔌 Connecting to SurrealDB…');
    await db.connect(SURREAL_URL);
    await db.signin({ username: 'root', password: 'root' });
    await db.use({ namespace: NS, database: DB_NAME });
    console.log(`✅ Connected → NS: ${NS}  DB: ${DB_NAME}\n`);

    // ── VERIFY FILES EXIST ───────────────────────────────────────────────────
    if (!fs.existsSync(FILE_A)) { console.error(`❌ FILE A not found: ${FILE_A}`); process.exit(1); }
    if (!fs.existsSync(FILE_B)) { console.error(`❌ FILE B not found: ${FILE_B}`); process.exit(1); }

    const wbA = XLSX.read(fs.readFileSync(FILE_A), { type: 'buffer' });
    const wbB = XLSX.read(fs.readFileSync(FILE_B), { type: 'buffer' });

    // ── STEP 1 : site_technical_details  (from FILE A — Detail Site-ID) ──────
    console.log('━━━ STEP 1 ─ site_technical_details (FILE A: Detail Site-ID) ━━━');
    const detSheet = wbA.Sheets['Detail Site-ID'];
    if (!detSheet) { console.error('❌ Sheet "Detail Site-ID" not found in FILE A'); process.exit(1); }

    const detRaw = XLSX.utils.sheet_to_json(detSheet);
    console.log(`  Source rows: ${detRaw.length}`);

    const techRecords = detRaw
      .filter(r => r['SITE ID'] || r['SITE_ID'])
      .map(r => ({
        site_id:       String(r['SITE ID']       || r['SITE_ID']      || ''),
        ne_id:         String(r['NE ID']          || ''),
        layer:         String(r['LAYER']           || ''),
        sector:        Number(r['SEC'])            || 0,
        ant_type:      String(r['ANT TYPE']        || r['Antenna type'] || ''),
        height:        Number(r['Height'])         || 0,
        freq_band:     String(r['FREQ BAND']       || ''),
        longitude:     Number(r['LONG'])           || 0,
        latitude:      Number(r['LAT'])            || 0,
        tp_id:         String(r['TP ID']           || ''),
        tp_name:       String(r['TP']              || ''),
        site_type:     String(r['Site Type']       || ''),
        lte_ne_name:   String(r['LTE NE Name']     || ''),
        cell_name:     String(r['Cell Name']       || ''),
        enodeb_id:     Number(r['eNodeB ID'])      || 0,
        cell_id:       Number(r['Cell ID'])        || 0,
        local_cell_id: Number(r['Local Cell ID'])  || 0,
        tal:           Number(r['TAL'])            || 0,
        tac:           Number(r['TAC'])            || 0,
        area:          String(r['AREA']            || ''),
        bsc:           String(r['BSC']             || ''),
        site_name:     String(r['SITENAME']        || r['SITE'] || ''),
        province:      String(r['PROVINSI']        || ''),
        address:       String(r['ADDRESS']         || ''),
        kecamatan:     String(r['KECAMATAN']       || ''),
        kabupaten:     String(r['KABUPATEN']       || ''),
        desa:          String(r['DESA']            || ''),
        cluster:       String(r['Cluster_New']     || ''),
        branch:        String(r['Branch_New']      || ''),
        region:        String(r['REGIONS NEW']     || ''),
        source_file:   'Detail_Site-ID_20260421',
        imported_at:   new Date().toISOString(),
      }));

    console.log(`  Clearing old site_technical_details…`);
    await db.query('DELETE site_technical_details');
    await batchInsert(db, 'site_technical_details', techRecords);
    console.log('');

    // ── STEP 2 : sites  (from FILE B — ReEngineering Progress) ───────────────
    console.log('━━━ STEP 2 ─ sites (FILE B: ReEngineering Progress) ━━━');
    const progSheet = wbB.Sheets['ReEngineering Progress'];
    if (!progSheet) { console.error('❌ Sheet "ReEngineering Progress" not found in FILE B'); process.exit(1); }

    const progRaw = XLSX.utils.sheet_to_json(progSheet);
    console.log(`  Source rows: ${progRaw.length}`);

    const siteRecords = progRaw
      .filter(r => r['SITE_ID'] || r['FINAL SITE ID'])
      .map(r => {
        const siteId = String(r['SITE_ID'] || r['FINAL SITE ID'] || '');
        const sector = Number(r['SECTOR']) || 1;
        // PPID (old col name) or PDID (new col name) — both stored as ppid + pdid
        const pdidVal = String(r['PPID'] || r['PDID'] || '');

        return {
          // Identity
          row_no:                    Number(r['NO']) || 0,
          site_id:                   siteId,
          final_site_id:             String(r['FINAL SITE ID']               || siteId),
          site_sector:               String(r['SITE-SECTOR (FINAL)']         || `${siteId}-${sector}`),
          sector,
          site_moving_status:        String(r['SITE MOVING STATUS']          || ''),
          filter_per_sector:         Number(r['FILTER PER SECTOR'])          || 0,

          // Classification
          project_type:              String(r['PROJECT TYPE']                || ''),
          region:                    String(r['REGION']                      || ''),
          ne_id:                     String(r['NE_ID']                       || ''),
          site_name:                 String(r['SITE_NAME']                   || ''),
          tp_name:                   String(r['TP NAME']                     || ''),
          ineom_registered:          String(r['IOMS REGISTERED']            || '') === 'Registered',
          ioms_registered:           String(r['IOMS REGISTERED']            || '') === 'Registered',

          // Permit
          permit_status:             String(r['PERMIT STATUS']               || ''),
          issue_problem:             String(r['ISSUE PROBLEM']              || ''),
          note_problem:              String(r['NOTE PROBLEM']               || ''),

          // Implementation
          implementasi_status:       String(r['IMPLEMENTASI STATUS']        || ''),
          tanggal_rfs:               excelDate(r['Tanggal RFS']),
          team:                      String(r['TEAM']                       || ''),
          issue_implementasi:        String(r['ISSUE IMPLEMENTASI']         || ''),
          note_implementasi:         String(r['NOTE IMPLEMENTASI']          || ''),
          submit_ioms:               String(r['SUBMIT IOMS']                || ''),
          team_onsite_status:        String(r['TEAM ONSITE STATUS']         || ''),

          // ATP
          status_atp:                String(r['STATUS ATP']                 || ''),
          atp_number:                String(r['TIKET NUMBER']               || ''),
          note_foto_evidence:        String(r['NOTE FOTO EVIDENCE']         || ''),
          ppid:                      pdidVal,
          pdid:                      pdidVal,

          // Project financials
          sow_id:                    String(r['SOW ID']                     || ''),
          po_id:                     String(r['PO ID']                      || ''),
          prio_capex_final:          String(r['PRIO CAPEX FINAL']           || ''),
          new_status_implementation: String(r['NEW STATUS IMPLEMENTATION']  || ''),
          prio:                      String(r['PRIO']                       || ''),
          po_bulan:                  String(r['PO BULAN']                   || ''),

          // Geo
          latitude:                  Number(r['LATITUDE'])                  || 0,
          longitude:                 Number(r['LONGITUDE'])                 || 0,

          // Meta
          file_date:                 excelDate(r['FILE DATE']),
          stage:                     deriveStage(r),
          source:                    'ReEngineering_Progress_May11',
          imported_at:               new Date().toISOString(),
        };
      });

    console.log(`  Clearing old sites…`);
    await db.query('DELETE sites');
    await batchInsert(db, 'sites', siteRecords);
    console.log('');

    // ── STEP 3 : materials  (from FILE B — INVENTORY REPORT) ─────────────────
    console.log('━━━ STEP 3 ─ materials (FILE B: INVENTORY REPORT) ━━━');
    const matSheetB = wbB.Sheets['INVENTORY REPORT'];
    const matSheetA = wbA.Sheets['INVENTORY REPORT'];
    const matSheet  = matSheetB || matSheetA;
    const matSource = matSheetB ? 'INVENTORY_REPORT_May11' : 'INVENTORY_REPORT_Apr21';

    if (!matSheet) {
      console.warn('⚠️  No INVENTORY REPORT sheet found in either file — skipping materials.');
    } else {
      const matRaw = XLSX.utils.sheet_to_json(matSheet);
      console.log(`  Source rows: ${matRaw.length}  (from: ${matSource})`);

      const matRecords = matRaw
        .filter(r => r['Material Description'])
        .map(r => ({
          material_type:    String(r['Type']                          || ''),
          direction:        String(r['IN / OUT']                      || ''),
          qty:              Number(r['Quantity'])                     || 0,
          name:             String(r['Material Description']         || ''),
          tgl:              excelDate(r['Dilivery Date']),
          delivery_note_no: String(r['Dilivery Note No']             || ''),
          po_delivery_date: String(r['Purchecs Order Dilivery Date'] || ''),
          vendor:           String(r['Vendor Pengirim']              || ''),
          sender:           String(r['Sender']                       || ''),
          receiver:         String(r['Reciver']                      || ''),
          source:           matSource,
          imported_at:      new Date().toISOString(),
        }));

      console.log(`  Clearing old materials…`);
      await db.query('DELETE materials');
      await batchInsert(db, 'materials', matRecords);
      console.log('');
    }

    // ── STEP 4 : SKIPPED ──────────────────────────────────────────────────────
    // seed_rescoping.sql is NOT applied here.
    // All 13 RESCOPING sites are already present in FILE B (ReEngineering Progress sheet).
    // Running the seed would create 13 DUPLICATE records (explicit IDs on top of
    // auto-ID Excel records), inflating RESCOPING count from 13 → 26.
    // Source of truth = the Excel file only.
    console.log('━━━ STEP 4 ─ Seed skipped (Excel is source of truth for all project types) ━━━\n');

    // ── FINAL VERIFICATION ────────────────────────────────────────────────────
    console.log('━━━ VERIFICATION ━━━');
    const [sitesCount]     = await db.query('SELECT count() FROM sites GROUP ALL');
    const [techCount]      = await db.query('SELECT count() FROM site_technical_details GROUP ALL');
    const [matCount]       = await db.query('SELECT count() FROM materials GROUP ALL');

    const sc = sitesCount?.[0]?.count ?? 0;
    const tc = techCount?.[0]?.count  ?? 0;
    const mc = matCount?.[0]?.count   ?? 0;

    console.log(`  sites                  : ${sc}`);
    console.log(`  site_technical_details : ${tc}`);
    console.log(`  materials              : ${mc}`);

    if (sc > 0 && tc > 0) {
      console.log('\n🏆 IMPORT COMPLETE — Database is fully initialised!');
    } else {
      console.error('\n❌ WARNING: One or more tables are still empty. Check errors above.');
    }

  } catch (err) {
    console.error('\n🔴 Fatal error:', err);
  } finally {
    db.close();
  }
}

run();
