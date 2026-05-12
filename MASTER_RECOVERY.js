import fs from 'fs';
import * as XLSX from 'xlsx';
import { Surreal } from 'surrealdb';

// Configuration
const SURREAL_URL = 'https://surrealdb-production-b201.up.railway.app/rpc';
const NS = 'yerico';
const DB_NAME = 'project_budget';

function excelDateToJSDate(v) {
  if (!v || typeof v !== 'number') return String(v || '');
  return new Date((v - 25569) * 86400 * 1000).toISOString().split('T')[0];
}

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
        } catch (err) {
          fail++;
        }
      }
    }
    process.stdout.write(`  ${table}: ${ok}/${records.length}\r`);
  }
  console.log(`\n  ${table} complete: ${ok} inserted, ${fail} failed.`);
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

async function runRecovery() {
  const db = new Surreal();
  try {
    console.log('Connecting to SurrealDB...');
    await db.connect(SURREAL_URL);
    await db.signin({ username: 'root', password: 'root' });
    await db.use({ namespace: NS, database: DB_NAME });
    console.log('Connected to live database.\n');

    // ================================================================
    // STEP 1: RESTORE FROM JSON DUMP (MAY 4)
    // ================================================================
    console.log('STEP 1: Restoring auxiliary tables from JSON dump...');
    try {
      const jsonPath = 'files/new-query-2026-05-04-4.json';
      if (fs.existsSync(jsonPath)) {
        const dbDump = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const records = dbDump[0] || [];
        console.log(`Found ${records.length} records in JSON.`);
        
        let jsonCount = 0;
        for (const r of records) {
          const record = { ...r };
          const table = record._table;
          const id = record.id;
          delete record._table;
          delete record.id;
          
          // Skip inserting into tables we are about to replace from fresher excel
          if (['sites', 'site_technical_details', 'materials'].includes(table)) {
             continue;
          }

          try {
            if (id) {
                await db.query(`CREATE type::thing($id) CONTENT $record`, { id, record });
            } else {
                await db.create(table, record);
            }
            jsonCount++;
            if (jsonCount % 100 === 0) process.stdout.write(`  Imported ${jsonCount} JSON items...\r`);
          } catch(e) {
            // continue quietly if fail
          }
        }
        console.log(`\nSuccessfully imported ${jsonCount} backup records from JSON.\n`);
      } else {
        console.log('JSON backup file not found. Skipping Step 1.');
      }
    } catch(err) {
       console.error('Error during Step 1 JSON import:', err.message);
    }

    // ================================================================
    // STEP 2: LOAD SITE TECHNICAL DETAILS FROM OLD EXCEL
    // ================================================================
    console.log('STEP 2: Restoring Detail Site-ID from April 21 Excel...');
    const oldExcel = 'files/Monitoring Project Re-Engineering_20260421.xlsx';
    if (fs.existsSync(oldExcel)) {
       await db.query('DELETE site_technical_details');
       const buf = fs.readFileSync(oldExcel);
       const wb  = XLSX.read(buf, { type: 'buffer' });
       const detailSheet = wb.Sheets['Detail Site-ID'];
       if (detailSheet) {
          const raw = XLSX.utils.sheet_to_json(detailSheet);
          const techRecords = raw
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
              source_file:   'Detail_Site-ID (April21)',
            }));
          await batchInsert(db, 'site_technical_details', techRecords);
       }
    } else {
      console.log('Old excel file not found. Skipping tech details.');
    }
    console.log('');

    // ================================================================
    // STEP 3: LOAD FRESH PROGRESS AND MATERIALS FROM MAY 11 EXCEL
    // ================================================================
    console.log('STEP 3: Restoring freshest Tracking data from May 11 Excel...');
    const newExcel = 'files/Monitoring Project Re-Engineering.xlsx';
    if (fs.existsSync(newExcel)) {
       await db.query('DELETE sites');
       await db.query('DELETE materials');
       const buf = fs.readFileSync(newExcel);
       const wb  = XLSX.read(buf, { type: 'buffer' });
       
       // Progress Sheet
       const progressSheet = wb.Sheets['ReEngineering Progress'];
       if (progressSheet) {
         const raw = XLSX.utils.sheet_to_json(progressSheet);
         console.log(`Reading ${raw.length} rows of ReEngineering Progress...`);
         const siteRecords = raw
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
                atp_number:                String(r['TIKET NUMBER']            || ''), 
                note_foto_evidence:        String(r['NOTE FOTO EVIDENCE']      || ''),
                ppid:                      String(r['PPID'] || r['PDID']       || ''),
                pdid:                      String(r['PPID'] || r['PDID']       || ''),
                sow_id:                    String(r['SOW ID']                  || ''),
                po_id:                     String(r['PO ID']                   || ''),
                prio_capex_final:          String(r['PRIO CAPEX FINAL']        || ''),
                new_status_implementation: String(r['NEW STATUS IMPLEMENTATION']|| ''),
                prio:                      String(r['PRIO']                    || ''),
                latitude:                  Number(r['LATITUDE'])               || 0,
                longitude:                 Number(r['LONGITUDE'])              || 0,
                file_date:                 excelDateToJSDate(r['FILE DATE']),
                stage:                     deriveStage(r),
                source:                    'May11_Excel'
              };
            });
          await batchInsert(db, 'sites', siteRecords);
       }

       // Materials Sheet
       const matSheet = wb.Sheets['INVENTORY REPORT'];
       if (matSheet) {
          const raw = XLSX.utils.sheet_to_json(matSheet);
          const matRecords = raw
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
          await batchInsert(db, 'materials', matRecords);
       }
    } else {
      console.log('Newest excel file not found. Skipping step 3.');
    }
    console.log('');

    // ================================================================
    // STEP 4: SEED CUSTOM DATA (Rescoping, etc.)
    // ================================================================
    console.log('STEP 4: Applying custom reseeding statements...');
    const sqlFile = 'seed_rescoping.sql';
    if (fs.existsSync(sqlFile)) {
       const sqlContent = fs.readFileSync(sqlFile, 'utf8');
       // Simple splits by semicolon is naive for block queries, 
       // but SurrealDB query accepts multiple statement blocks at once!
       try {
           await db.query(sqlContent);
           console.log('Successfully applied seed_rescoping.sql\n');
       } catch(err) {
           console.error('Failed to run sql script:', err.message);
       }
    }

    console.log('🏆 COMPLETE RECOVERY SUCCEEDED! DB restored.');
  } catch (err) {
    console.error('Fatal Crash During Recovery:', err);
  } finally {
    db.close();
  }
}

runRecovery();
