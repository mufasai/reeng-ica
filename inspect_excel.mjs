import * as XLSX from 'xlsx';
import fs from 'fs';

function inspectSheet(wb, sheetName) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) { console.log(`  [SHEET NOT FOUND: ${sheetName}]`); return; }
  const raw = XLSX.utils.sheet_to_json(sheet);
  console.log(`  Row count: ${raw.length}`);
  if (raw.length > 0) {
    console.log(`  Columns: ${JSON.stringify(Object.keys(raw[0]))}`);
    console.log(`  Sample row 0: ${JSON.stringify(raw[0])}`);
  }
}

console.log('\n===== OLD FILE (20260421) =====');
const bufOld = fs.readFileSync('files/Monitoring Project Re-Engineering_20260421.xlsx');
const wbOld = XLSX.read(bufOld, { type: 'buffer' });
console.log('Sheets:', wbOld.SheetNames);
for (const s of wbOld.SheetNames) {
  console.log(`\n--- Sheet: ${s} ---`);
  inspectSheet(wbOld, s);
}

console.log('\n===== NEW FILE (no date suffix) =====');
const bufNew = fs.readFileSync('files/Monitoring Project Re-Engineering.xlsx');
const wbNew = XLSX.read(bufNew, { type: 'buffer' });
console.log('Sheets:', wbNew.SheetNames);
for (const s of wbNew.SheetNames) {
  console.log(`\n--- Sheet: ${s} ---`);
  inspectSheet(wbNew, s);
}
