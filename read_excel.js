import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('files/Monitoring Project Re-Engineering_20260421.xlsx');
const wb = XLSX.read(buf, {type: 'buffer'});

const detailSheet = wb.Sheets['Detail Site-ID'];
const detailData = XLSX.utils.sheet_to_json(detailSheet, { header: 1 });
console.log('Detail Site-ID headers:', detailData[0]);
console.log('Detail Site-ID row 1:', detailData[1]);

const summarySheet = wb.Sheets['Summary'];
const summaryData = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
console.log('\nSummary headers:', summaryData[0]);
console.log('Summary row 1:', summaryData[1]);
console.log('Summary row 2:', summaryData[2]);
