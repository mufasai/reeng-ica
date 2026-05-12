import * as XLSX from 'xlsx';
import fs from 'fs';

function getCols(file, sheet) {
    const buf = fs.readFileSync(file);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const s = wb.Sheets[sheet];
    const json = XLSX.utils.sheet_to_json(s);
    return json.length > 0 ? Object.keys(json[0]) : [];
}

console.log('NEW Progress columns:', JSON.stringify(getCols('files/Monitoring Project Re-Engineering.xlsx', 'ReEngineering Progress')));
console.log('OLD Progress columns:', JSON.stringify(getCols('files/Monitoring Project Re-Engineering_20260421.xlsx', 'ReEngineering Progress')));
