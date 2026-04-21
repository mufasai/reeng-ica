const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('./files/Monitoring Project Re-Engineering_20260421.xlsx');
const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('reengineering') || n.toLowerCase().includes('progress')) || workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

// Extract first 15 rows to preview
console.log(JSON.stringify(json.slice(0, 15), null, 2));
