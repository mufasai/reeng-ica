import * as XLSX from 'xlsx';
import fs from 'fs';

try {
    const buf = fs.readFileSync('files/Monitoring Project Re-Engineering.xlsx');
    const wb  = XLSX.read(buf, { type: 'buffer' });
    console.log('Sheets in NEW file:', wb.SheetNames);
} catch(e) {
    console.log('Error loading NEW file:', e.message);
}

try {
    const bufOld = fs.readFileSync('files/Monitoring Project Re-Engineering_20260421.xlsx');
    const wbOld  = XLSX.read(bufOld, { type: 'buffer' });
    console.log('Sheets in OLD file:', wbOld.SheetNames);
} catch(e) {
    console.log('Error loading OLD file:', e.message);
}
