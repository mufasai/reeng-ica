const XLSX = require('xlsx');

const workbook = XLSX.utils.book_new();

// 1. Stage Update
const stageUpdateData = [
  { 'SITE_ID': 'S001', 'SITE NAME': 'Test Site 1', 'PERMIT STATUS': '5. Permit Released' },
  { 'SITE_ID': 'S002', 'SITE NAME': 'Test Site 2', 'STATUS ATP': 'REQUEST PDID' }
];
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(stageUpdateData), 'ReEngineering Progress');

// 2. Site Technical
const techData = [
  { 'SITE_ID': 'S001', 'LAYER': 'L1', 'FREQ BAND': '2100', 'CELL NAME': 'Cell A' }
];
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(techData), 'Detail Site-ID');

// 3. Inventory
const invData = [
  { 'TYPE/MATERIAL': 'Router', 'IN/OUT': 'IN', 'QUANTITY': 10, 'DELIVERY DATE': '2023-10-01' }
];
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(invData), 'INVENTORY REPORT');

// 4. Workforce
const wfData = [
  { 'NAMA KARYAWAN': 'John Doe', 'JABATAN': 'Leader', 'NO_HP': '08123456789' }
];
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(wfData), 'Workforce');

XLSX.writeFile(workbook, 'dummy_upload.xlsx');
console.log('Dummy Excel created: dummy_upload.xlsx');
