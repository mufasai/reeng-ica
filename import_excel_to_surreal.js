/**
 * import_excel_to_surreal.js
 *
 * Architecture:
 *  - `sites` table               = WORK data (ReEngineering Progress sheet)
 *                                  One row per SITE-SECTOR, has atp_number (TIKET NUMBER),
 *                                  permit/impl/atp status, team, etc.
 *  - `site_technical_details`    = BASE data (Detail Site-ID sheet)
 *                                  One row per NE_ID/cell, has antenna, geo, tower info
 *  - `materials`                 = Inventory (INVENTORY REPORT sheet)
 *
 * Key mapping:
 *   TIKET NUMBER  → atp_number   (the real ATP ticket ID)
 *   STATUS ATP    → status_atp   (workflow status e.g. "UPLOAD TAGGING DONE")
 */

import fs from 'fs';
import * as XLSX from 'xlsx';
import { Surreal } from 'surrealdb';

function excelDateToJSDate(v) {
  if (!v || typeof v !== 'number') return String(v || '');
  return new Date((v - 25569) * 86400 * 1000).toISOString().split('T')[0];
}

/** Insert records in batches; falls back to row-by-row on a bad chunk. */
async function batchInsert(db, table, records, batchSize = 50) {
  let ok = 0, fail = 0;
  for (let i = 0; i < records.length; i += batchSize) {
    const chunk = records.slice(i, i + batchSize);
    try {
      await db.query(`INSERT INTO ${table} $records`, { records: chunk });
      ok += chunk.length;
    } catch {
      for (const r of chunk) {
        try {
          await db.query(`INSERT INTO ${table} $record`, { record: r });
          ok++;
        } catch {
          fail++;
        }
      }
    }
    process.stdout.write(`  ${ok}/${records.length}\r`);
  }
  return { ok, fail };
}

function deriveStage(row) {
  const impl   = (row['IMPLEMENTASI STATUS'] || '').toLowerCase();
  const satp   = (row['STATUS ATP']          || '').toLowerCase();
  const tiket  = row['TIKET NUMBER']         || '';
  const permit = (row['PERMIT STATUS']       || '').toLowerCase();

  if (satp.includes('done') || satp.includes('tagging')) return 'atp';
  if (tiket) return 'atp';
  if (impl.includes('rfs')) return 'atp';
  if (impl) return 'implementasi';
  if (permit) return 'permit';
  return 'imported';
}

async function importExcel() {
  const db = new Surreal();
  try {
    console.log('Connecting to SurrealDB (yerico/project_budget)...');
    await db.connect('https://surrealdb-production-b201.up.railway.app/rpc');
    await db.signin({ username: 'root', password: 'root' });
    await db.use({ namespace: 'yerico', database: 'project_budget' });
    console.log('Connected!\n');

    // ── Truncate ──────────────────────────────────────────────────────────
    console.log('Truncating existing tables...');
    await db.query('DELETE sites');
    await db.query('DELETE site_technical_details');
    await db.query('DELETE materials');
    console.log('Cleared.\n');

    const buf = fs.readFileSync('files/Monitoring Project Re-Engineering_20260421.xlsx');
    const wb  = XLSX.read(buf, { type: 'buffer' });

    // ── 1. BASE DATA — Detail Site-ID ──────────────────────────────────────
    const detailSheet = wb.Sheets['Detail Site-ID'];
    if (detailSheet) {
      const raw = XLSX.utils.sheet_to_json(detailSheet);
      console.log(`[Detail Site-ID] ${raw.length} rows — inserting...`);

      const records = raw
        .filter(r => r['SITE ID'] || r['SITE_ID'])
        .map(r => ({
          site_id:       String(r['SITE ID'] || r['SITE_ID'] || ''),
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
          enodeb_id:     String(r['eNodeB ID']       || ''),
          cell_id:       Number(r['Cell ID'])        || 0,
          local_cell_id: Number(r['Local Cell ID'])  || 0,
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
          source_file:   'Detail_Site-ID',
        }));

      const { ok, fail } = await batchInsert(db, 'site_technical_details', records);
      console.log(`\n[Detail Site-ID] Done. ok=${ok}, fail=${fail}\n`);
    }

    // ── 2. WORK DATA — ReEngineering Progress ──────────────────────────────
    const progressSheet = wb.Sheets['ReEngineering Progress'];
    if (progressSheet) {
      const raw = XLSX.utils.sheet_to_json(progressSheet);
      console.log(`[ReEngineering Progress] ${raw.length} rows — inserting...`);

      const records = raw
        .filter(r => r['SITE_ID'] || r['FINAL SITE ID'])
        .map(r => {
          const siteId = String(r['SITE_ID'] || r['FINAL SITE ID'] || '');
          const sector = Number(r['SECTOR']) || 1;
          return {
            site_id:                   siteId,
            final_site_id:             String(r['FINAL SITE ID']           || siteId),
            site_sector:               String(r['SITE-SECTOR (FINAL)']     || `${siteId}-${sector}`),
            sector,
            project_type:              String(r['PROJECT TYPE']             || ''),
            region:                    String(r['REGION']                   || ''),
            ne_id:                     String(r['NE_ID']                    || ''),
            site_name:                 String(r['SITE_NAME']               || ''),
            tp_name:                   String(r['TP NAME']                  || ''),
            ineom_registered:          String(r['IOMS REGISTERED']         || '') === 'Registered',
            permit_status:             String(r['PERMIT STATUS']            || ''),
            issue_problem:             String(r['ISSUE PROBLEM']           || ''),
            note_problem:              String(r['NOTE PROBLEM']            || ''),
            implementasi_status:       String(r['IMPLEMENTASI STATUS']     || ''),
            tanggal_rfs:               excelDateToJSDate(r['Tanggal RFS']),
            team:                      String(r['TEAM']                    || ''),
            issue_implementasi:        String(r['ISSUE IMPLEMENTASI']      || ''),
            note_implementasi:         String(r['NOTE IMPLEMENTASI']       || ''),
            status_atp:                String(r['STATUS ATP']              || ''),
            atp_number:                String(r['TIKET NUMBER']            || ''), // ← TIKET NUMBER
            note_foto_evidence:        String(r['NOTE FOTO EVIDENCE']      || ''),
            ppid:                      String(r['PPID']                    || ''),
            sow_id:                    String(r['SOW ID']                  || ''),
            po_id:                     String(r['PO ID']                   || ''),
            prio_capex_final:          String(r['PRIO CAPEX FINAL']        || ''),
            new_status_implementation: String(r['NEW STATUS IMPLEMENTATION']|| ''),
            prio:                      String(r['PRIO']                    || ''),
            latitude:                  Number(r['LATITUDE'])               || 0,
            longitude:                 Number(r['LONGITUDE'])              || 0,
            file_date:                 excelDateToJSDate(r['FILE DATE']),
            stage:                     deriveStage(r),
          };
        });

      const { ok, fail } = await batchInsert(db, 'sites', records);
      console.log(`\n[ReEngineering Progress] Done. ok=${ok}, fail=${fail}\n`);
    }

    // ── 3. MATERIALS — Inventory Report ────────────────────────────────────
    const matSheet = wb.Sheets['INVENTORY REPORT'];
    if (matSheet) {
      const raw = XLSX.utils.sheet_to_json(matSheet);
      console.log(`[INVENTORY REPORT] ${raw.length} rows — inserting...`);

      const records = raw
        .filter(r => r['Material Description'])
        .map(r => ({
          material_type:    String(r['Type']                           || ''),
          direction:        String(r['IN / OUT']                       || ''),
          qty:              Number(r['Quantity'])                      || 0,
          name:             String(r['Material Description']          || ''),
          tgl:              excelDateToJSDate(r['Dilivery Date']),
          delivery_note_no: String(r['Dilivery Note No']              || ''),
          po_delivery_date: String(r['Purchecs Order Dilivery Date']  || ''),
          vendor:           String(r['Vendor Pengirim']               || ''),
          sender:           String(r['Sender']                        || ''),
          receiver:         String(r['Reciver']                       || ''),
        }));

      const { ok, fail } = await batchInsert(db, 'materials', records);
      console.log(`\n[INVENTORY REPORT] Done. ok=${ok}, fail=${fail}\n`);
    }

    console.log('✅ Import complete!');
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    db.close();
  }
}

importExcel();
