/**
 * One-shot script: delete all site_technical_details and reimport from Excel.
 * Run: node scripts/reimport-site-technical.mjs
 */
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { Surreal } from 'surrealdb';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = path.join(__dirname, '../files/Monitoring Project Re-Engineering_20260421.xlsx');

const DB_URL   = 'https://surrealdb-production-b201.up.railway.app/rpc';
const DB_USER  = 'root';
const DB_PASS  = 'root';
const DB_NS    = 'yerico';
const DB_DB    = 'project_budget';

// Column mapping rules — same logic as MultiSheetExcelModal auto-suggest
function mapHeaders(headers) {
    const map = {};
    const h = (key) => headers.find(h => {
        const hl = h.toLowerCase();
        if (key === 'site_id')       return hl === 'site id' || hl === 'site_id';
        if (key === 'ne_id')         return hl === 'ne id' || hl === 'ne_id';
        if (key === 'layer')         return hl === 'layer';
        if (key === 'sector')        return hl === 'sec' || hl === 'sector';
        if (key === 'freq_band')     return hl === 'freq band' || hl === 'freq_band' || hl === 'frequency band';
        if (key === 'long')          return hl === 'long' || hl === 'longitude';
        if (key === 'lat')           return hl === 'lat' || hl === 'latitude';
        if (key === 'ant_type')      return hl === 'ant type' || hl === 'ant_type' || hl === 'antenna type';
        if (key === 'height')        return hl === 'height';
        if (key === 'tp_id')         return hl === 'tp id' || hl === 'tp_id';
        if (key === 'tp_name')       return hl === 'tp' || hl === 'tp name' || hl === 'tp_name';
        if (key === 'cell_name')     return hl === 'cell name' || hl === 'cell_name';
        if (key === 'enodeb_id')     return hl === 'enodeb id' || hl === 'enodeb_id' || hl.includes('enodeb');
        if (key === 'cell_id')       return hl === 'cell id';
        if (key === 'local_cell_id') return hl === 'local cell id' || hl === 'local_cell_id';
        if (key === 'tal')           return hl === 'tal';
        if (key === 'tac')           return hl === 'tac';
        if (key === 'area')          return hl === 'area';
        if (key === 'bsc')           return hl === 'bsc';
        if (key === 'site_name')     return hl === 'site name' || hl === 'site_name' || hl === 'nama site';
        if (key === 'provinsi')      return hl === 'provinsi';
        if (key === 'address')       return hl === 'address' || hl === 'alamat';
        if (key === 'kecamatan')     return hl === 'kecamatan';
        if (key === 'kabupaten')     return hl === 'kabupaten' || hl === 'kota/kab';
        if (key === 'desa')          return hl === 'desa';
        if (key === 'cluster')       return hl === 'cluster_new' || hl === 'cluster new' || hl === 'cluster';
        if (key === 'branch')        return hl === 'branch';
        if (key === 'region')        return hl === 'regions new' || hl === 'region new' || hl === 'region';
        return false;
    }) || null;

    const keys = ['site_id','ne_id','layer','sector','freq_band','long','lat','ant_type','height',
                  'tp_id','tp_name','cell_name','enodeb_id','cell_id','local_cell_id','tal','tac',
                  'area','bsc','site_name','provinsi','address','kecamatan','kabupaten','desa',
                  'cluster','branch','region'];
    keys.forEach(k => { map[k] = h(k); });
    return map;
}

function isSiteTechnicalSheet(headers) {
    const hs = headers.map(h => h.toUpperCase());
    const has = (k) => hs.some(h => h.includes(k));
    return has('SITE_ID') || has('SITE ID');
}

async function main() {
    // 1. Read Excel
    console.log('Reading Excel file...');
    const fs = await import('fs');
    const buf = fs.readFileSync(EXCEL_PATH);
    const wb = xlsxRead(buf, { type: 'buffer' });

    let techSheet = null;
    let techSheetName = null;
    for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        const data = xlsxUtils.sheet_to_json(ws, { defval: null });
        if (!data.length) continue;
        const headers = Object.keys(data[0]);
        if (isSiteTechnicalSheet(headers)) {
            // Pick the one that also has NE_ID or LAYER — more specific match
            const hs = headers.map(h => h.toUpperCase());
            const hasTech = hs.some(h => h.includes('LAYER') || h.includes('FREQ') || h.includes('CELL') || h.includes('ENODEB') || h.includes('NE ID') || h.includes('NE_ID'));
            if (hasTech) {
                techSheet = data;
                techSheetName = name;
                console.log(`Found site_technical sheet: "${name}" (${data.length} rows)`);
                break;
            }
        }
    }

    if (!techSheet) {
        console.error('No site_technical sheet found in the Excel file. Available sheets:', wb.SheetNames);
        process.exit(1);
    }

    const headers = Object.keys(techSheet[0]);
    const colMap = mapHeaders(headers);
    console.log('Column mapping resolved:');
    Object.entries(colMap).filter(([,v]) => v).forEach(([k,v]) => console.log(`  ${k} → "${v}"`));
    const unmapped = Object.entries(colMap).filter(([,v]) => !v).map(([k]) => k);
    if (unmapped.length) console.log('  (unmapped):', unmapped.join(', '));

    // 2. Connect to SurrealDB
    console.log('\nConnecting to SurrealDB...');
    const db = new Surreal();
    await db.connect(DB_URL);
    await db.signin({ username: DB_USER, password: DB_PASS });
    await db.use({ namespace: DB_NS, database: DB_DB });
    console.log('Connected.');

    // 3. Delete existing records
    console.log('Deleting all site_technical_details...');
    await db.query('DELETE site_technical_details');
    const countCheck = await db.query('SELECT count() FROM site_technical_details GROUP ALL');
    console.log('Records remaining after delete:', countCheck?.[0]?.[0]?.count ?? 0);

    // 4. Insert new records in batches
    const importedAt = new Date().toISOString();
    const batchSize = 50;
    let inserted = 0;
    let skipped = 0;

    console.log(`\nInserting ${techSheet.length} rows in batches of ${batchSize}...`);

    for (let i = 0; i < techSheet.length; i += batchSize) {
        const batch = techSheet.slice(i, i + batchSize);
        const records = [];

        for (const row of batch) {
            const siteId = String(row[colMap['site_id']] || '').trim();
            if (!siteId) { skipped++; continue; }

            const record = {
                site_id:       siteId,
                ne_id:         colMap['ne_id']         ? String(row[colMap['ne_id']] || '')         || undefined : undefined,
                layer:         colMap['layer']         ? String(row[colMap['layer']] || '')         || undefined : undefined,
                sector:        colMap['sector']        ? row[colMap['sector']] ?? undefined          : undefined,
                freq_band:     colMap['freq_band']     ? row[colMap['freq_band']]  || undefined      : undefined,
                longitude:     colMap['long']          ? Number(row[colMap['long']]) || undefined    : undefined,
                latitude:      colMap['lat']           ? Number(row[colMap['lat']]) || undefined     : undefined,
                ant_type:      colMap['ant_type']      ? row[colMap['ant_type']]   || undefined      : undefined,
                height:        colMap['height']        ? row[colMap['height']]     || undefined      : undefined,
                tp_id:         colMap['tp_id']         ? row[colMap['tp_id']]      || undefined      : undefined,
                tp_name:       colMap['tp_name']       ? row[colMap['tp_name']]    || undefined      : undefined,
                cell_name:     colMap['cell_name']     ? row[colMap['cell_name']]  || undefined      : undefined,
                enodeb_id:     colMap['enodeb_id']     ? row[colMap['enodeb_id']]  || undefined      : undefined,
                cell_id:       colMap['cell_id']       ? row[colMap['cell_id']]    || undefined      : undefined,
                local_cell_id: colMap['local_cell_id'] ? row[colMap['local_cell_id']] || undefined   : undefined,
                tal:           colMap['tal']           ? row[colMap['tal']]        || undefined      : undefined,
                tac:           colMap['tac']           ? row[colMap['tac']]        || undefined      : undefined,
                area:          colMap['area']          ? row[colMap['area']]       || undefined      : undefined,
                bsc:           colMap['bsc']           ? row[colMap['bsc']]        || undefined      : undefined,
                site_name:     colMap['site_name']     ? row[colMap['site_name']]  || undefined      : undefined,
                provinsi:      colMap['provinsi']      ? row[colMap['provinsi']]   || undefined      : undefined,
                address:       colMap['address']       ? row[colMap['address']]    || undefined      : undefined,
                kecamatan:     colMap['kecamatan']     ? row[colMap['kecamatan']]  || undefined      : undefined,
                kabupaten:     colMap['kabupaten']     ? row[colMap['kabupaten']]  || undefined      : undefined,
                desa:          colMap['desa']          ? row[colMap['desa']]       || undefined      : undefined,
                cluster:       colMap['cluster']       ? row[colMap['cluster']]    || undefined      : undefined,
                branch:        colMap['branch']        ? row[colMap['branch']]     || undefined      : undefined,
                region:        colMap['region']        ? row[colMap['region']]     || undefined      : undefined,
                source_file:   techSheetName,
                imported_at:   importedAt,
            };
            // Remove undefined keys to keep records clean
            Object.keys(record).forEach(k => record[k] === undefined && delete record[k]);
            records.push(record);
        }

        if (records.length === 0) continue;

        try {
            await db.query('INSERT INTO site_technical_details $records', { records });
            inserted += records.length;
        } catch (err) {
            // Fall back to one-by-one if batch fails
            for (const record of records) {
                try {
                    await db.query('INSERT INTO site_technical_details $record', { record });
                    inserted++;
                } catch (e2) {
                    console.error('Failed to insert row:', record.site_id, e2.message);
                    skipped++;
                }
            }
        }

        process.stdout.write(`\r  Progress: ${Math.min(i + batchSize, techSheet.length)}/${techSheet.length} rows processed`);
    }

    console.log(`\n\nDone!`);
    console.log(`  Inserted: ${inserted}`);
    console.log(`  Skipped (no site_id): ${skipped}`);

    // 5. Final count
    const finalCount = await db.query('SELECT count() FROM site_technical_details GROUP ALL');
    console.log(`  Total in DB: ${finalCount?.[0]?.[0]?.count ?? '?'}`);

    await db.close();
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
