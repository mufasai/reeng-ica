import React, { useState, useRef, useEffect } from 'react';
import { X, FileSpreadsheet, CheckCircle2, ChevronDown, ListPlus, Loader2, Play, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { siteMasterRecords, atpTasks, people, teamMembersRecords, materialTransactions, materialMasterRecords, savedExcelTemplates, siteTechnicalDetails, atpWorkOrders } from '../../data/mockData';
import { db, cleanRecordId, connectDB } from '../../db';
import { useSidebar } from '../../context/SidebarContext';

interface MultiSheetExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete?: (summary: any) => void;
    /** Where the modal is opened from — sets smart defaults for which sheet types are active */
    pageContext?: 'sites' | 'materials' | 'workforce';
}

export type SheetType = 'stage_update' | 'site_technical' | 'inventory_movement' | 'workforce' | 'material_master' | 'unknown' | 'skip';

export interface SheetInfo {
    name: string;
    type: SheetType;
    rowCount: number;
    data: any[];
}

const SHEET_TYPE_LABELS: Record<SheetType, string> = {
    'stage_update': 'Stage Update',
    'site_technical': 'Data Teknis',
    'inventory_movement': 'Stok Material',
    'workforce': 'Workforce',
    'material_master': 'Master Material',
    'unknown': 'Unknown',
    'skip': 'Lewati'
};

const detectSheetType = (headers: string[]): SheetType => {
    const has = (key: string) => headers.some(h => String(h).toUpperCase().includes(key.toUpperCase()));
    const hasAny = (keys: string[]) => keys.some(k => has(k));
    
    // 1. Stok Material / inventory_movement
    const hasQty = has('QUANTITY') || has('QTY');
    const hasDir = has('IN') || has('OUT') || has('DIRECTION');
    const hasMat = has('MATERIAL') || has('TYPE') || has('DESCRIPTION');
    const hasDate = has('DELIVERY DATE') || has('TANGGAL');
    
    if (hasQty && hasDir && hasMat && hasDate) return 'inventory_movement';
    
    // 2. Data Teknis Site / site_technical
    const hasSiteIdAlias = has('SITE_ID') || has('SITE ID') || has('FINAL_SITE_ID') || has('FINAL SITE ID');
    if (hasSiteIdAlias && hasAny(['LAYER', 'FREQ_BAND', 'FREQ BAND', 'CELL_NAME', 'CELL NAME', 'ENODEB'])) return 'site_technical';
    
    // 3. Stage Update / stage_update
    if (hasSiteIdAlias && hasAny(['PERMIT_STATUS', 'PERMIT STATUS', 'IMPLEMENTASI_STATUS', 'IMPLEMENTASI STATUS', 'STATUS_ATP', 'STATUS ATP'])) return 'stage_update';
    
    // 4. Workforce / workforce
    if ((has('NAMA_KARYAWAN') || has('NAMA KARYAWAN') || has('NAMA')) && hasAny(['NO_HP', 'HP', 'NO_KTP', 'KTP', 'JABATAN'])) return 'workforce';
    
    // 5. Material Master / material_master
    if (hasAny(['NAMA_MATERIAL', 'NAMA MATERIAL', 'NAMA']) && hasAny(['SPESIFIKASI', 'SATUAN', 'HARGA'])) return 'material_master';
    
    // 6. Lewati / skip
    return 'skip';
};

// Which sheet types are kept (not force-skipped) per page context.
// Auto-detected types not in this list will be defaulted to 'skip'.
// User can ALWAYS override to any type via the dropdown.
const PAGE_CONTEXT_DEFAULTS: Record<string, SheetType[]> = {
    sites:     ['stage_update', 'site_technical'],
    materials: ['inventory_movement', 'material_master'],
    workforce: ['workforce'],
};

const PAGE_CONTEXT_LABELS: Record<string, { title: string; desc: string; color: string }> = {
    sites:     { title: '📋 Konteks: Halaman Sites', desc: 'Sheet Stage Update dan Data Teknis akan diproses. Sheet lain di-skip secara default.', color: 'bg-blue-50 border-blue-200 text-blue-800' },
    materials: { title: '📦 Konteks: Halaman Material', desc: 'Sheet Stok Material dan Master Material akan diproses. Sheet lain di-skip secara default.', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    workforce: { title: '👤 Konteks: Halaman Workforce', desc: 'Sheet Workforce akan diproses. Sheet lain di-skip secara default.', color: 'bg-violet-50 border-violet-200 text-violet-800' },
};

const MultiSheetExcelModal: React.FC<MultiSheetExcelModalProps> = ({ isOpen, onClose, onImportComplete, pageContext }) => {
    const { triggerCountRefresh } = useSidebar();
    const [step, setStep] = useState<1 | 2 | 2.5 | 3 | 4 | 5>(1);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [permitStatuses, setPermitStatuses] = useState<{val: string, count: number, mapTo: string}[]>([]);
    const [implStatuses, setImplStatuses] = useState<{val: string, count: number, mapTo: string}[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [sheetsInfo, setSheetsInfo] = useState<SheetInfo[]>([]);
    const [sheetTypes, setSheetTypes] = useState<Record<string, SheetType>>({});
    const [processedSummary, setProcessedSummary] = useState<any>({});
    
    // Column Mapping State
    // Format: { [sheetIdx]: { [system_column_key]: [excel_header_string] } }
    const [columnMappings, setColumnMappings] = useState<Record<number, Record<string, string>>>({});
    const [unmappedCount, setUnmappedCount] = useState(0);
    const [syncStrategy, setSyncStrategy] = useState<'merge' | 'replace'>('merge');
    
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep(1);
                setSheetsInfo([]);
                setSheetTypes({});
                setProcessedSummary({});
                setPermitStatuses([]);
                setImplStatuses([]);
                setColumnMappings({});
                setUnmappedCount(0);
                setSyncStrategy('merge');
            }, 300);
        }
    }, [isOpen]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | any) => {
        const file = e.type === 'drop' ? e.dataTransfer.files?.[0] : e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setStep(2);
        
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            
            const infos: SheetInfo[] = [];
            
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                
                let type: SheetType = 'unknown';
                if (json.length > 0) {
                    const headers = Object.keys(json[0] as object);
                    type = detectSheetType(headers);
                } else {
                    type = 'skip';
                }
                
                // Apply page context: if a detected type is not in the allowed list for this context,
                // default it to 'skip'. The user can always change it in the dropdown.
                const allowedTypes = pageContext ? PAGE_CONTEXT_DEFAULTS[pageContext] : null;
                if (allowedTypes && type !== 'skip' && !allowedTypes.includes(type)) {
                    type = 'skip';
                }
                
                infos.push({
                    name: sheetName,
                    type: type === 'unknown' ? 'skip' : type,
                    rowCount: json.length,
                    data: json
                });
            }
            const initialTypes: Record<string, SheetType> = {};
            infos.forEach(i => initialTypes[i.name] = i.type);
            setSheetTypes(initialTypes);
            setSheetsInfo(infos);
        } catch (err) {
            console.error(err);
            alert("Failed to read Excel file.");
            setStep(1);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTypeChange = (sheetName: string, newType: SheetType) => {
        setSheetTypes(prev => ({ ...prev, [sheetName]: newType }));
        setSheetsInfo(prev => prev.map(s => s.name === sheetName ? { ...s, type: newType } : s));
    };

    const suggestValueMapping = (val: string, type: 'permit' | 'implementasi') => {
        // First check saved templates
        const saved = savedExcelTemplates.find(t => t.sheetType === 'stage_update');
        if (saved && saved.valueNormalizations && saved.valueNormalizations[val]) {
            return saved.valueNormalizations[val];
        }

        const v = String(val).toLowerCase();
        if (type === 'permit') {
            if (v.includes('planning')) return '1. Planning';
            if (v.includes('waiting') || v.includes('to approval') || v.includes('pending')) return '2. Waiting for TO Approval';
            if (v.includes('tpass')) return '4. Tpass Released';
            if (v.includes('released') || v.includes('permit released')) return '5. Permit Released';
            if (v.includes('expired')) return '6. Expired Permit';
            if (v.includes('cancelled') || v.includes('batal')) return '9. Cancelled';
            if (v.includes('drop')) return '10. DROP OUT';
            return '1. Planning';
        } else {
            if (v.includes('planning') || v.includes('submit') || v.includes('awaiting') || v.includes('scheduled')) return 'Planning';
            if (v.includes('on going') || v.includes('ongoing') || v.includes('process')) return 'On Going';
            if (v.includes('hold') || v.includes('pending')) return 'On Hold';
            if (v.includes('rfs') || v.includes('done') || v.includes('complete')) return 'RFS';
            if (v.includes('cancelled') || v.includes('drop') || v.includes('batal')) return 'Cancelled';
            return 'Planning';
        }
    };

    const SYSTEM_FIELDS: Record<SheetType, {key: string, label: string, required?: boolean}[]> = {
        'stage_update': [
             { key: 'site_id', label: 'Site ID (*)', required: true },
             { key: 'permit', label: 'Permit Status' },
             { key: 'impl', label: 'Implementasi Status' },
             { key: 'team', label: 'Team / PIC' },
             { key: 'atp_status', label: 'Status ATP' },
             { key: 'atp_tiket', label: 'Tiket Number' },
             { key: 'atp_note', label: 'Catatan ATP' },
             { key: 'project_type', label: 'Project Type' }
        ],
        'inventory_movement': [
             { key: 'material', label: 'Material Name (*)', required: true },
             { key: 'material_type', label: 'Material Type' },
             { key: 'direction', label: 'Direction (IN/OUT) (*)', required: true },
             { key: 'quantity', label: 'Quantity (*)', required: true },
             { key: 'date', label: 'Delivery Date' },
             { key: 'dn', label: 'Delivery Note No' },
             { key: 'po', label: 'PO Number' },
             { key: 'vendor', label: 'Vendor Pengirim' },
             { key: 'sender', label: 'Sender' },
             { key: 'receiver', label: 'Receiver' }
        ],
        'site_technical': [
             { key: 'site_id', label: 'Site ID (*)', required: true },
             { key: 'ne_id', label: 'NE ID' },
             { key: 'layer', label: 'Layer' },
             { key: 'sector', label: 'Sector' },
             { key: 'freq_band', label: 'Freq Band' },
             { key: 'long', label: 'Longitude' },
             { key: 'lat', label: 'Latitude' },
             { key: 'ant_type', label: 'Antenna Type' },
             { key: 'height', label: 'Height' },
             { key: 'tp_id', label: 'TP ID' },
             { key: 'tp_name', label: 'TP Name' },
             { key: 'cell_name', label: 'Cell Name' },
             { key: 'enodeb_id', label: 'eNodeB ID' },
             { key: 'cell_id', label: 'Cell ID' },
             { key: 'local_cell_id', label: 'Local Cell ID' },
             { key: 'tal', label: 'TAL' },
             { key: 'tac', label: 'TAC' },
             { key: 'area', label: 'Area' },
             { key: 'bsc', label: 'BSC' },
             { key: 'site_name', label: 'Site Name' },
             { key: 'provinsi', label: 'Provinsi' },
             { key: 'address', label: 'Address' },
             { key: 'kecamatan', label: 'Kecamatan' },
             { key: 'kabupaten', label: 'Kabupaten' },
             { key: 'desa', label: 'Desa' },
             { key: 'cluster', label: 'Cluster' },
             { key: 'branch', label: 'Branch' },
             { key: 'region', label: 'Region' }
        ],
        'material_master': [
             { key: 'nama', label: 'Nama Material (*)', required: true },
             { key: 'kode', label: 'Kode Material' },
             { key: 'kategori', label: 'Kategori' },
             { key: 'spesifikasi', label: 'Spesifikasi' },
             { key: 'satuan', label: 'Satuan' },
             { key: 'harga', label: 'Harga Satuan' }
        ],
        'workforce': [], 'unknown': [], 'skip': []
    };

    const handleProceedToMapping = () => {
        const initialMappings: Record<number, Record<string, string>> = {};
        let unmapped = 0;

        sheetsInfo.forEach((sheet, idx) => {
             const effectiveType = sheetTypes[sheet.name] || sheet.type;
             if (effectiveType === 'skip' || effectiveType === 'unknown') return;
             if (!SYSTEM_FIELDS[effectiveType] || SYSTEM_FIELDS[effectiveType].length === 0) return;

             const fields = SYSTEM_FIELDS[effectiveType];
             const headers = Object.keys(sheet.data[0] || {});
             const saved = savedExcelTemplates.find(t => t.sheetType === effectiveType);
             
             initialMappings[idx] = {};

             fields.forEach(f => {
                  // Try to find from saved template first
                  let matchedHeader = '';
                  if (saved && saved.columnMappings && saved.columnMappings[f.key]) {
                      const expectedHeader = saved.columnMappings[f.key];
                      if (headers.includes(expectedHeader)) {
                          matchedHeader = expectedHeader;
                      }
                  }
                  
                  // Auto-suggest fallback
                  if (!matchedHeader) {
                      matchedHeader = headers.find(h => {
                           const hl = h.toLowerCase();
                           if (f.key === 'site_id' && (hl.includes('site_id') || hl.includes('site id') || hl.includes('final site'))) return true;
                           if (f.key === 'permit' && hl.includes('permit status')) return true;
                           if (f.key === 'impl' && (hl.includes('implementasi status') || hl.includes('new status'))) return true;
                           if (f.key === 'team' && hl === 'team') return true;
                           if (f.key === 'atp_status' && hl.includes('status atp')) return true;
                           if (f.key === 'atp_tiket' && (hl.includes('tiket') || hl.includes('number'))) return true;
                            if (f.key === 'project_type' && (hl.includes('project') || hl.includes('type'))) return true;
                           
                           if (f.key === 'material' && (hl.includes('material') || hl.includes('type') || hl.includes('nama'))) return true;
                           if (f.key === 'material_type' && (hl === 'type' || hl.includes('kategori'))) return true;
                           if (f.key === 'direction' && (hl === 'in' || hl === 'out' || hl === 'in/out' || hl.includes('direction'))) return true;
                           if (f.key === 'quantity' && (hl.includes('quantity') || hl.includes('qty'))) return true;
                           
                           if (f.key === 'nama' && hl.includes('nama')) return true;
                           if (f.key === 'kode' && hl.includes('kode')) return true;
                           if (f.key === 'kategori' && hl.includes('kategori')) return true;
                           if (f.key === 'spesifikasi' && hl.includes('spesifikasi')) return true;
                           if (f.key === 'satuan' && hl.includes('satuan')) return true;
                           if (f.key === 'harga' && hl.includes('harga')) return true;

                           // site_technical column rules (matching real Detail Site-ID sheet headers)
                           if (f.key === 'site_id' && (hl === 'site id' || hl === 'site_id')) return true;
                           if (f.key === 'ne_id' && (hl === 'ne id' || hl === 'ne_id')) return true;
                           if (f.key === 'layer' && hl === 'layer') return true;
                           if (f.key === 'sector' && (hl === 'sec' || hl === 'sector')) return true;
                           if (f.key === 'freq_band' && (hl === 'freq band' || hl === 'freq_band' || hl === 'frequency band')) return true;
                           if (f.key === 'long' && (hl === 'long' || hl === 'longitude')) return true;
                           if (f.key === 'lat' && (hl === 'lat' || hl === 'latitude')) return true;
                           if (f.key === 'ant_type' && (hl === 'ant type' || hl === 'ant_type' || hl === 'antenna type')) return true;
                           if (f.key === 'height' && hl === 'height') return true;
                           if (f.key === 'tp_id' && (hl === 'tp id' || hl === 'tp_id')) return true;
                           if (f.key === 'tp_name' && (hl === 'tp' || hl === 'tp name' || hl === 'tp_name')) return true;
                           if (f.key === 'cell_name' && (hl === 'cell name' || hl === 'cell_name')) return true;
                           if (f.key === 'enodeb_id' && (hl === 'enodeb id' || hl === 'enodeb_id' || hl.includes('enodeb'))) return true;
                           if (f.key === 'cell_id' && hl === 'cell id') return true;
                           if (f.key === 'local_cell_id' && (hl === 'local cell id' || hl === 'local_cell_id')) return true;
                           if (f.key === 'tal' && hl === 'tal') return true;
                           if (f.key === 'tac' && hl === 'tac') return true;
                           if (f.key === 'area' && hl === 'area') return true;
                           if (f.key === 'bsc' && hl === 'bsc') return true;
                           if (f.key === 'site_name' && (hl === 'site name' || hl === 'site_name' || hl === 'nama site')) return true;
                           if (f.key === 'provinsi' && hl === 'provinsi') return true;
                           if (f.key === 'address' && (hl === 'address' || hl === 'alamat')) return true;
                           if (f.key === 'kecamatan' && hl === 'kecamatan') return true;
                           if (f.key === 'kabupaten' && (hl === 'kabupaten' || hl === 'kota/kab')) return true;
                           if (f.key === 'desa' && hl === 'desa') return true;
                           if (f.key === 'cluster' && (hl === 'cluster_new' || hl === 'cluster new' || hl === 'cluster')) return true;
                           if (f.key === 'branch' && hl === 'branch') return true;
                           if (f.key === 'region' && (hl === 'regions new' || hl === 'region new' || hl === 'region')) return true;
                      }) || '';
                  }

                  initialMappings[idx][f.key] = matchedHeader;
                  if (!matchedHeader) unmapped++;
             });
        });

        setColumnMappings(initialMappings);
        setUnmappedCount(unmapped);
        
        // Go to column mapping step
        // We will repurpose step 2.5 by just overloading step 2 state or making it step 2.5
        // Let's call it block 2.5
        setStep(2.5 as any); 
    };

    const handleProceedToNormalization = () => {
        const stageUpdateSheet = sheetsInfo.find(s => s.type === 'stage_update');
        if (!stageUpdateSheet) {
            handleProcessSequentially(); // skip normalization if no stage update
            return;
        }

        const data = stageUpdateSheet.data;
        const permits = new Map<string, number>();
        const impls = new Map<string, number>();

        data.forEach(row => {
            const mapDict = columnMappings[sheetsInfo.indexOf(stageUpdateSheet)] || {};
            const pKey = mapDict['permit'];
            const iKey = mapDict['impl'];

            const p = pKey ? row[pKey] : null;
            const i = iKey ? row[iKey] : null;
            
            if (p) permits.set(p, (permits.get(p) || 0) + 1);
            if (i) impls.set(i, (impls.get(i) || 0) + 1);
        });

        const pStats = Array.from(permits.entries()).map(([val, count]) => ({ val, count, mapTo: suggestValueMapping(val, 'permit') }));
        const iStats = Array.from(impls.entries()).map(([val, count]) => ({ val, count, mapTo: suggestValueMapping(val, 'implementasi') }));

        setPermitStatuses(pStats.sort((a,b)=>b.count - a.count));
        setImplStatuses(iStats.sort((a,b)=>b.count - a.count));

        if (pStats.length > 0 || iStats.length > 0) {
            setStep(3);
        } else {
            handleProcessSequentially();
        }
    };

    const handleProcessSequentially = async () => {
        setStep(4);
        setIsProcessing(true);
        await connectDB(); // re-authenticate before bulk DB operations
        
        let summary: any = {
            stage_update: { total: 0, processed: 0, error: 0, skipped: 0, errorDetails: [] },
            site_technical: { total: 0, processed: 0, errorDetails: [] },
            inventory_movement: { total: 0, processed: 0 },
            workforce: { total: 0, processed: 0 }
        };

        // SYNC STRATEGY: REPLACE MODE HANDLING
        if (syncStrategy === 'replace') {
             const types = sheetsInfo.map((s) => sheetTypes[s.name] || s.type);
             const clearSites = types.includes('stage_update');
             const clearTech = types.includes('site_technical');

             try {
                 if (clearSites) {
                     console.warn('[SYNC] REPLACE MODE: Clearing all records from "sites" table.');
                     await db.query('DELETE sites');
                     siteMasterRecords.length = 0; // Reset local store
                 }
                 if (clearTech) {
                     console.warn('[SYNC] REPLACE MODE: Clearing all records from "site_technical_details" table.');
                     await db.query('DELETE site_technical_details');
                     siteTechnicalDetails.length = 0; // Reset local store
                 }
             } catch (err) {
                 console.error('[SYNC] Failed to perform full replacement pre-clear:', err);
             }
        }

        // SAVE TEMPLATES IMPLICITLY
        sheetsInfo.forEach((sheet, idx) => {
             if (sheet.type === 'skip' || sheet.type === 'unknown') return;
             if (SYSTEM_FIELDS[sheet.type].length === 0) return;

             let tpl = savedExcelTemplates.find(t => t.sheetType === sheet.type);
             if (!tpl) {
                 const newTpl: any = { id: `tpl-${sheet.type}`, sheetType: sheet.type, columnMappings: {}, valueNormalizations: {} };
                 savedExcelTemplates.push(newTpl);
                 tpl = newTpl;
             }
             
             // Update column mappings for this template 
             const cols = columnMappings[idx] || {};
             Object.entries(cols).forEach(([sys, exc]) => {
                  if (exc) tpl!.columnMappings[sys] = exc;
             });

             // Update value mapping if stage_update
             if (sheet.type === 'stage_update') {
                  permitStatuses.forEach(ps => tpl!.valueNormalizations[ps.val] = ps.mapTo);
                  implStatuses.forEach(is => tpl!.valueNormalizations[is.val] = is.mapTo);
             }
        });

        // Set up mapping registers based on user's selected normalize modes
        const getPermitStatusMap = (rawVal: string) => {
            const match = permitStatuses.find(p => p.val === rawVal);
            if (!match) return null;
            return match.mapTo || null; // empty string = "jangan ubah stage" → return null
        };

        const getImplStatusMap = (rawVal: string) => {
            const match = implStatuses.find(p => p.val === rawVal);
            if (!match) return null;
            return match.mapTo || null;
        };

        // Simulate sequential processing delay and apply mappings
        for (let i = 0; i < sheetsInfo.length; i++) {
            const sheet = sheetsInfo[i];
            const effectiveType = sheetTypes[sheet.name] || sheet.type;
            if (effectiveType === 'skip' || effectiveType === 'unknown') continue;
            
            // Mock processing delay per sheet
            await new Promise(res => setTimeout(res, 800));
            
            // Actually process data mapping
            if (effectiveType === 'stage_update') {
                const mapDict = columnMappings[i] || {};
                let updatedCount = 0;
                let newCount = 0;
                let skippedCount = 0;
                let errorCount = 0;
                const errorLogs: any[] = [];

                // Sync sites from DB so dedup works correctly across sessions
                try {
                    const dbSites = await db.query<any[][]>('SELECT * FROM sites');
                    if (dbSites?.[0]?.length) {
                        dbSites[0].forEach(r => {
                            const rId = cleanRecordId(r.id);
                            const idx = siteMasterRecords.findIndex(s => cleanRecordId(s.id) === rId);
                            if (idx >= 0) siteMasterRecords[idx] = r;
                            else siteMasterRecords.push(r);
                        });
                    }
                } catch (err) {
                    console.error('Failed to sync sites from DB:', err);
                }

                for (const row of sheet.data) {
                    let rawSiteId = row[mapDict['site_id']];
                    
                    // Handcrafted fallback if column map is missing or yields undefined
                    if (!rawSiteId) {
                        const finalSiteKey = Object.keys(row).find(k => {
                            const cleanKey = String(k).toLowerCase().replace(/[\s_-]/g, '');
                            return cleanKey === 'finalsiteid' || cleanKey === 'finalsite_id';
                        });
                        if (finalSiteKey) rawSiteId = row[finalSiteKey];
                    }

                    if (!rawSiteId) { 
                        errorCount++; 
                        errorLogs.push({ site: 'Row ' + (sheet.data.indexOf(row) + 2), reason: 'Kolom Site ID & Final Site ID kosong.', context: 'Validasi Baris' });
                        continue; 
                    }

                    console.log(`[MultiSheetExcelModal] >>> Processing row for raw Site ID: ${rawSiteId}`);
                    let searchSiteId = String(rawSiteId).trim();
                    let priority: string | null = null;
                    const priorityMatch = searchSiteId.match(/\s*\((P[1-3])\)$/i);
                    if (priorityMatch) {
                        priority = priorityMatch[1].toUpperCase();
                        searchSiteId = searchSiteId.replace(/\s*\((P[1-3])\)$/i, '').trim();
                    }

                    if (searchSiteId.includes('_')) {
                        const parts = searchSiteId.split('_');
                        searchSiteId = parts[0];
                    }

                    const existingSite = siteMasterRecords.find(s =>
                        String(s.site_id).toLowerCase() === searchSiteId.toLowerCase() ||
                        String(s.unique_key).toLowerCase() === searchSiteId.toLowerCase() ||
                        String(s.site_id).toLowerCase() === String(rawSiteId).toLowerCase()
                    );

                    if (existingSite) {
                        console.log(`[MultiSheetExcelModal] MATCH FOUND: ${existingSite.site_id} (${existingSite.id}) Current Stage: ${existingSite.stage}`);
                        const dbUpdates: any = {};

                        if (existingSite.project_type === 'COMBAT' && String(rawSiteId).includes('_')) {
                            existingSite.site_name = String(rawSiteId);
                        }
                        if (existingSite.project_type === 'RESCOPING' && priority) {
                            (existingSite as any).priority = priority;
                        }

                        // Standardized project type import / updates
                        const rawProjType = row[mapDict['project_type']];
                        if (rawProjType) {
                            const cleaned = String(rawProjType).toUpperCase().trim();
                            const normalized = cleaned.includes('FILTER') ? 'FILTER' : cleaned;
                            if (normalized && existingSite.project_type !== normalized) {
                                existingSite.project_type = normalized as any;
                                dbUpdates.project_type = normalized;
                            }
                        }

                        // Apply permit mapping
                        const rawPermit = row[mapDict['permit']];
                        if (rawPermit) {
                            const chosenStatus = getPermitStatusMap(rawPermit); // Maps to user picked normalized value "1. Planning", "5. Permit Released"
                            if (chosenStatus) {
                                dbUpdates.permit_status = chosenStatus;
                                (existingSite as any).permit_status = chosenStatus;

                                // Derive stage based on valid permit statuses
                                let nextStage: string | null = null;
                                if (chosenStatus.includes('1.') || chosenStatus.includes('2.') || chosenStatus.includes('4.')) {
                                    nextStage = 'permit_process';
                                } else if (chosenStatus.includes('5.')) {
                                    nextStage = 'permit_ready';
                                } else if (chosenStatus.includes('6.')) {
                                    nextStage = 'issue';
                                } else if (chosenStatus.includes('9.') || chosenStatus.includes('10.')) {
                                    nextStage = 'survey_nok';
                                }

                                console.log(`[MultiSheetExcelModal] Derived Permit Logic: raw='${rawPermit}' -> status='${chosenStatus}' -> stage='${nextStage}'`);

                                if (nextStage && nextStage !== existingSite.stage) {
                                    existingSite.stage = nextStage as any;
                                    dbUpdates.stage = nextStage;
                                }
                            }
                        }

                        // Apply impl mapping
                        const rawImpl = row[mapDict['impl']];
                        if (rawImpl) {
                            const mappedStatus = getImplStatusMap(rawImpl); // Maps to "Planning", "RFS", etc.
                            if (mappedStatus) {
                                dbUpdates.implementasi_status = mappedStatus;
                                (existingSite as any).implementasi_status = mappedStatus;

                                // Automatically translate status into matching system workflow stage
                                let nextStage: string | null = null;
                                if (mappedStatus === 'RFS') {
                                    nextStage = existingSite.project_type === 'COMBAT' ? 'dokumen_done' :
                                                existingSite.project_type === 'RESCOPING' ? 'rfi_done' : 'rfs_done';
                                } else if (mappedStatus === 'Cancelled') {
                                    nextStage = 'cancelled';
                                } else {
                                    // Planning, On Going, On Hold
                                    nextStage = 'implementasi';
                                }

                                console.log(`[MultiSheetExcelModal] Derived Impl Logic: raw='${rawImpl}' -> status='${mappedStatus}' -> stage='${nextStage}'`);

                                if (nextStage && nextStage !== existingSite.stage) {
                                    existingSite.stage = nextStage as any;
                                    dbUpdates.stage = nextStage;
                                }

                                // Automate COMBAT substeps completion when hitting RFS
                                if (existingSite.project_type === 'COMBAT' && mappedStatus === 'RFS') {
                                    const implSteps = {
                                        sitac: { status: 'done', date: new Date().toISOString() },
                                        cme: { status: 'done', date: new Date().toISOString() },
                                        power: { status: 'done', date: new Date().toISOString() },
                                        transmission: { status: 'done', date: new Date().toISOString() },
                                        integration: { status: 'done', date: new Date().toISOString() },
                                        rfs: { status: 'done', date: new Date().toISOString() }
                                    };
                                    (existingSite as any).combat_impl_steps = implSteps;
                                    dbUpdates.combat_impl_steps = implSteps;
                                }
                            }
                        }

                        // Team lookup
                        const teamName = row[mapDict['team']];
                        if (teamName) {
                            const foundPerson = people.find(p => p.name.toLowerCase().includes(String(teamName).toLowerCase()));
                            if (foundPerson) {
                                const teamMemberRecord = teamMembersRecords.find(tm => tm.person_id === foundPerson.id);
                                if (teamMemberRecord) {
                                    existingSite.team_id = teamMemberRecord.team_id;
                                    existingSite.field_leader_id = foundPerson.id;
                                    dbUpdates.team = teamMemberRecord.team_id;
                                    dbUpdates.field_leader_id = foundPerson.id;
                                }
                            } else {
                                existingSite.raw_data = existingSite.raw_data || {};
                                existingSite.raw_data.team_lookup_warning = `Person '${teamName}' tidak ditemukan.`;
                            }
                        }

                        // Status ATP / tiket / note
                        const rawStatusatp = row[mapDict['atp_status']];
                        const rawAtpTicket = row[mapDict['atp_tiket']];
                        const rawAtpNote = row[mapDict['atp_note']];

                        // Dynamic raw_data retention (unmapped columns)
                        const mappedExcelHeaders = Object.values(mapDict).filter(Boolean);
                        const dynamicData: Record<string, any> = {};
                        Object.keys(row).forEach(header => {
                            if (String(header).toUpperCase().includes('IOMS')) {
                                const val = String(row[header] ?? '').toUpperCase().trim();
                                if (val && val !== 'UNDEFINED' && val !== 'NULL') {
                                    const isRegistered = !val.includes('NOT') && (val.includes('REGISTERED') || val.includes('YA') || val === '1' || val === 'TRUE');
                                    existingSite.ioms_registered = isRegistered;
                                    (existingSite as any).ineom_registered = isRegistered;
                                    dbUpdates.ineom_registered = isRegistered;
                                }
                            }
                            if (!mappedExcelHeaders.includes(header) && !header.startsWith('__EMPTY')) {
                                dynamicData[header] = row[header];
                            }
                        });
                        existingSite.raw_data = { ...(existingSite.raw_data || {}), ...dynamicData };

                        if (rawStatusatp || rawAtpTicket || rawAtpNote) {
                            let atpTask = atpTasks.find(a => a.site_id === searchSiteId || a.site_id === existingSite.site_id);
                            if (!atpTask) {
                                atpTask = {
                                    id: `atp-new-${Date.now()}-${Math.random()}`,
                                    site_id: searchSiteId,
                                    pdid: null,
                                    tiket_atp: null,
                                    tagging_status: 'pending',
                                    cell_capture_done: false,
                                    catatan: null,
                                    catatan_atp: null,
                                    updated_by: 'system',
                                    updated_at: new Date().toISOString()
                                };
                                atpTasks.push(atpTask);
                            }
                            if (!atpTask) continue;

                            if (rawStatusatp) {
                                const s = String(rawStatusatp).toUpperCase();
                                if (s.includes('REQUEST PDID')) atpTask.tagging_status = 'pending';
                                else if (s.includes('UPLOAD TAGGING DONE')) atpTask.tagging_status = 'done';
                                else if (s.includes('TAGGING N/A')) {
                                    atpTask.tagging_status = 'na';
                                    if (existingSite.project_type === 'COMBAT' || existingSite.project_type === 'RESCOPING') {
                                        let wo = atpWorkOrders.find((w: any) => w.site_id === searchSiteId || w.site_id === existingSite.site_id);
                                        if (wo) wo.issue_status = 'TAGGING N/A';
                                    }
                                }
                                else if (s.includes('HOLD')) atpTask.catatan_atp = atpTask.catatan_atp ? atpTask.catatan_atp + ' | HOLD' : 'HOLD';
                            }

                            if (rawAtpTicket) atpTask.tiket_atp = String(rawAtpTicket);
                            if (rawAtpNote) atpTask.catatan_atp = String(rawAtpNote);
                        }

                        // Write changes to DB if anything changed
                        if (Object.keys(dbUpdates).length > 0) {
                            console.log(`[MultiSheetExcelModal] DB COMMIT UPDATE for ${existingSite.site_id}:`, dbUpdates);
                            try {
                                const dbRecordId = cleanRecordId(existingSite.id);
                                await db.query(`UPDATE ${dbRecordId} MERGE $data`, { data: { ...dbUpdates, updated_at: new Date().toISOString() } });
                                updatedCount++;
                            } catch (err: any) {
                                console.error('Failed to update site:', err);
                                errorCount++;
                                errorLogs.push({ site: existingSite.site_id, reason: err?.message || String(err), context: 'Database UPDATE' });
                            }
                        } else {
                            console.log(`[MultiSheetExcelModal] SKIPPED UPDATE for ${existingSite.site_id} - No fields changed.`);
                            skippedCount++;
                        }
                    } else {
                        console.log(`[MultiSheetExcelModal] NO MATCH FOUND. Initiating INSERT for site_id: ${searchSiteId}`);
                        // New site not in records — INSERT into DB
                        try {
                            const newSite: any = {
                                site_id: searchSiteId,
                                project_type: (() => { const pt = String(row[mapDict['project_type']] || '').toUpperCase(); return pt.includes('FILTER') ? 'FILTER' : pt || null; })(),
                                sector: row[mapDict['sector']] || null,
                                region: row[mapDict['region']] || null,
                                site_name: row[mapDict['site_name']] || String(rawSiteId),
                                stage: 'assigned',
                                status: 'active',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                                imported_from: 'Excel Import',
                            };
                            const insertResult = await db.query('INSERT INTO sites $record', { record: newSite });
                            const firstRow = Array.isArray(insertResult?.[0]) ? insertResult[0][0] : insertResult?.[0];
                            if (firstRow?.id) newSite.id = cleanRecordId(firstRow.id);
                            siteMasterRecords.push(newSite);
                            atpWorkOrders.push(newSite);
                            newCount++;
                        } catch (err: any) {
                            console.error('Failed to insert new site:', err);
                            errorCount++;
                            errorLogs.push({ site: searchSiteId, reason: err?.message || String(err), context: 'Database INSERT (New Site)' });
                        }
                    }
                }

                summary.stage_update.total += sheet.rowCount;
                summary.stage_update.processed += updatedCount;
                summary.stage_update.new = (summary.stage_update.new || 0) + newCount;
                summary.stage_update.skipped = (summary.stage_update.skipped || 0) + skippedCount;
                summary.stage_update.error += errorCount;
                summary.stage_update.errorDetails = [...(summary.stage_update.errorDetails || []), ...errorLogs];
            } else if (effectiveType === 'inventory_movement') {
                const mapDict = columnMappings[i] || {};
                
                sheet.data.forEach(row => {
                    const materialName = row[mapDict['material']];
                    if (!materialName) return;

                    // Fuzzy match material master
                    const materialMaster = materialMasterRecords.find(m => String(m.nama_material).toLowerCase().includes(String(materialName).toLowerCase()));
                    
                    const mappedExcelHeaders = Object.values(mapDict).filter(Boolean);
                    const dynamicData: Record<string, any> = {};
                    Object.keys(row).forEach(header => {
                        if (!mappedExcelHeaders.includes(header) && !header.startsWith('__EMPTY')) {
                            dynamicData[header] = row[header];
                        }
                    });

                    materialTransactions.push({
                        id: `trx-${Date.now()}-${Math.random()}`,
                        material_master_id: materialMaster ? materialMaster.id : null,
                        material_nama: String(materialName),
                        material_type: row[mapDict['material_type']] || null,
                        direction: (String(row[mapDict['direction']]).toUpperCase() === 'OUT') ? 'OUT' : 'IN',
                        quantity: Number(row[mapDict['quantity']] || 0),
                        delivery_date: row[mapDict['date']] || null,
                        delivery_note_no: row[mapDict['dn']] || null,
                        po_number: row[mapDict['po']] || null,
                        vendor_pengirim: row[mapDict['vendor']] || null,
                        sender: row[mapDict['sender']] || null,
                        receiver: row[mapDict['receiver']] || null,
                        catatan: null,
                        imported_from: 'Excel Import',
                        created_at: new Date().toISOString(),
                        source_file: sheet.name,
                        imported_at: new Date().toISOString(),
                        raw_data: dynamicData
                    });
                });
                if (!summary.inventory_movement) summary.inventory_movement = { total: 0, processed: 0 };
                summary.inventory_movement.total += sheet.rowCount;
                summary.inventory_movement.processed += sheet.rowCount;
            } else if (effectiveType === 'material_master') {
                const mapDict = columnMappings[i] || {};
                let successCount = 0;
                sheet.data.forEach(row => {
                    const nama = row[mapDict['nama']];
                    if (!nama) return;
                    
                    const existing = materialMasterRecords.find(m => m.nama_material.toLowerCase() === String(nama).toLowerCase());
                    if (existing) {
                        if (mapDict['kode'] && row[mapDict['kode']]) existing.kode_material = row[mapDict['kode']];
                        if (mapDict['kategori'] && row[mapDict['kategori']]) existing.kategori = row[mapDict['kategori']];
                        if (mapDict['spesifikasi'] && row[mapDict['spesifikasi']]) existing.spesifikasi = row[mapDict['spesifikasi']];
                        if (mapDict['satuan'] && row[mapDict['satuan']]) existing.satuan = row[mapDict['satuan']];
                        if (mapDict['harga'] && row[mapDict['harga']]) existing.harga_satuan = Number(row[mapDict['harga']]);
                    } else {
                        materialMasterRecords.push({
                            id: `mm-new-${Date.now()}-${Math.random()}`,
                            nama_material: String(nama),
                            kode_material: row[mapDict['kode']] || null,
                            kategori: row[mapDict['kategori']] || null,
                            spesifikasi: row[mapDict['spesifikasi']] || null,
                            satuan: row[mapDict['satuan']] || null,
                            harga_satuan: Number(row[mapDict['harga']]) || null,
                            keterangan: null,
                            status_aktif: true,
                            created_at: new Date().toISOString()
                        });
                    }
                    successCount++;
                });
                
                if (!summary.material_master) summary.material_master = { total: 0, processed: 0 };
                summary.material_master.total += sheet.rowCount;
                summary.material_master.processed += successCount;
            } else if (effectiveType === 'site_technical') {
                const mapDict = columnMappings[i] || {};
                let coordUpdates = 0;
                let updatedCount = 0;
                let newCount = 0;
                let skippedCount = 0;
                const pendingCoordUpdates: { site: any, lat: number, long: number }[] = [];
                const sourceFile = sheet.name;
                const importedAt = new Date().toISOString();

                // Sync in-memory array from DB so dedup works correctly across sessions
                try {
                    const dbRecords = await db.query<any[][]>('SELECT * FROM site_technical_details');
                    if (dbRecords?.[0]?.length) {
                        dbRecords[0].forEach(r => {
                            const rId = cleanRecordId(r.id);
                            const idx = siteTechnicalDetails.findIndex(t => cleanRecordId(t.id) === rId);
                            if (idx >= 0) siteTechnicalDetails[idx] = r;
                            else siteTechnicalDetails.push(r);
                        });
                    }
                } catch (err) {
                    console.error('Failed to sync site_technical_details from DB:', err);
                }

                for (const row of sheet.data) {
                    const siteId = String(row[mapDict['site_id']] || '').trim();
                    if (!siteId) continue;

                    const masterSite = siteMasterRecords.find(s =>
                        String(s.site_id).toLowerCase() === siteId.toLowerCase() ||
                        String(s.unique_key || '').toLowerCase() === siteId.toLowerCase()
                    );
                    const canonicalSiteId = masterSite ? masterSite.site_id : siteId;

                    const longitude = Number(row[mapDict['long']]) || undefined;
                    const latitude = Number(row[mapDict['lat']]) || undefined;
                    const neId = String(row[mapDict['ne_id']] || '');
                    const layer = String(row[mapDict['layer']] || '');
                    const sector = row[mapDict['sector']];

                    const mappedExcelHeaders = new Set(Object.values(mapDict).filter(Boolean));
                    const dynamicData: Record<string, any> = {};
                    Object.keys(row).forEach(header => {
                        if (!mappedExcelHeaders.has(header) && !header.startsWith('__EMPTY')) {
                            dynamicData[header] = row[header];
                        }
                    });

                    const existingIdx = siteTechnicalDetails.findIndex(t =>
                        String(t.site_id).toLowerCase() === canonicalSiteId.toLowerCase() &&
                        t.ne_id === neId &&
                        String(t.layer) === layer &&
                        String(t.sector) === String(sector)
                    );

                    const incoming: any = {
                        site_id: canonicalSiteId,
                        ne_id: neId || undefined,
                        layer: layer || undefined,
                        sector: sector !== undefined ? sector : undefined,
                        freq_band: row[mapDict['freq_band']] || undefined,
                        longitude,
                        latitude,
                        ant_type: row[mapDict['ant_type']] || undefined,
                        height: row[mapDict['height']] || undefined,
                        tp_id: row[mapDict['tp_id']] || undefined,
                        tp_name: row[mapDict['tp_name']] || undefined,
                        cell_name: row[mapDict['cell_name']] || undefined,
                        enodeb_id: row[mapDict['enodeb_id']] || undefined,
                        cell_id: row[mapDict['cell_id']] || undefined,
                        local_cell_id: row[mapDict['local_cell_id']] || undefined,
                        tal: row[mapDict['tal']] || undefined,
                        tac: row[mapDict['tac']] || undefined,
                        area: row[mapDict['area']] || undefined,
                        bsc: row[mapDict['bsc']] || undefined,
                        site_name: row[mapDict['site_name']] || undefined,
                        provinsi: row[mapDict['provinsi']] || undefined,
                        address: row[mapDict['address']] || undefined,
                        kecamatan: row[mapDict['kecamatan']] || undefined,
                        kabupaten: row[mapDict['kabupaten']] || undefined,
                        desa: row[mapDict['desa']] || undefined,
                        cluster: row[mapDict['cluster']] || undefined,
                        branch: row[mapDict['branch']] || undefined,
                        region: row[mapDict['region']] || undefined,
                        raw_data: Object.keys(dynamicData).length > 0 ? dynamicData : undefined,
                        source_file: sourceFile,
                        imported_at: importedAt,
                    };

                    if (existingIdx >= 0) {
                        const existing = siteTechnicalDetails[existingIdx];
                        const keyFields: string[] = ['freq_band', 'longitude', 'latitude', 'ant_type', 'tp_name', 'cluster', 'region'];
                        const hasChanges = keyFields.some(f => incoming[f] !== undefined && incoming[f] !== (existing as any)[f]);

                        if (!hasChanges) {
                            skippedCount++;
                        } else {
                            siteTechnicalDetails[existingIdx] = { ...existing, ...incoming };
                            try {
                                const dbRecordId = cleanRecordId(existing.id);
                                await db.query(`UPDATE ${dbRecordId} MERGE $data`, { data: { ...incoming, updated_at: new Date().toISOString() } });
                            } catch (err) {
                                console.error('Failed to update site_technical_details:', err);
                            }
                            updatedCount++;
                        }
                    } else {
                        const record = { ...incoming, id: `tech-${Date.now()}-${Math.random().toString(36).slice(2)}` };
                        siteTechnicalDetails.push(record);
                        try {
                            const insertResult = await db.query('INSERT INTO site_technical_details $record', { record: incoming });
                            const firstRow = Array.isArray(insertResult?.[0]) ? insertResult[0][0] : insertResult?.[0];
                            if (firstRow?.id) record.id = cleanRecordId(firstRow.id);
                        } catch (err) {
                            console.error('Failed to insert site_technical_details:', err);
                        }
                        newCount++;
                    }

                    if (masterSite && latitude && longitude) {
                        const latDiff = Math.abs((masterSite.latitude || 0) - latitude);
                        const lngDiff = Math.abs((masterSite.longitude || 0) - longitude);
                        if (latDiff > 0.0001 || lngDiff > 0.0001) {
                            pendingCoordUpdates.push({ site: masterSite, lat: latitude, long: longitude });
                            coordUpdates++;
                        }
                    }
                }

                pendingCoordUpdates.forEach(update => {
                    update.site.latitude = update.lat;
                    update.site.longitude = update.long;
                });

                if (!summary.site_technical) summary.site_technical = { total: 0, processed: 0, new: 0, updated: 0, skipped: 0, coordUpdates: 0 };
                summary.site_technical.total += sheet.rowCount;
                summary.site_technical.processed += updatedCount + newCount;
                summary.site_technical.new = (summary.site_technical.new || 0) + newCount;
                summary.site_technical.updated = (summary.site_technical.updated || 0) + updatedCount;
                summary.site_technical.skipped = (summary.site_technical.skipped || 0) + skippedCount;
                summary.site_technical.coordUpdates = (summary.site_technical.coordUpdates || 0) + coordUpdates;
            } else {
                if (summary[effectiveType]) {
                    summary[effectiveType].total += sheet.rowCount;
                    summary[effectiveType].processed += Math.floor(sheet.rowCount * 0.9); // mock 90% success
                    if (summary[effectiveType].error !== undefined) {
                        summary[effectiveType].error += Math.floor(sheet.rowCount * 0.05);
                        summary[effectiveType].skipped += sheet.rowCount - summary[effectiveType].processed - summary[effectiveType].error;
                    }
                }
            }
        }
        
        setProcessedSummary(summary);
        setIsProcessing(false);
        setStep(5);
        triggerCountRefresh();
    };

    if (!isOpen) return null;

    const sheetsToProcessCount = Object.values(sheetTypes).filter(v => v !== 'skip' && v !== 'unknown').length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Multi-Sheet Excel Upload</h2>
                        <p className="text-sm text-slate-500">Upload dan mapping otomatis dari multiple sheet</p>
                    </div>
                    {step !== 3 && (
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Body Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6 relative">
                    
                    {/* STEP 1: UPLOAD */}
                    {step === 1 && (
                        <div 
                            className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-16 flex flex-col items-center justify-center text-center hover:border-blue-400 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={(e) => { e.preventDefault(); handleFileChange(e); }}
                            onDragOver={e => e.preventDefault()}
                        >
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                <FileSpreadsheet className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Upload File Excel (.xlsx)</h3>
                            <p className="text-slate-500 mb-6 text-sm max-w-sm mx-auto">Upload satu file Excel berisi multiple sheet (Progress, Data Teknis, Inventory, dsb). Sistem akan mendeteksi isinya otomatis.</p>
                            <button className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm hover:bg-blue-700 transition-colors">Pilih File</button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls,.csv" />
                        </div>
                    )}

                    {/* STEP 2: SHEET DETECTION & MAPPING */}
                    {step === 2 && !isProcessing && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                            {/* Context banner */}
                            {pageContext && PAGE_CONTEXT_LABELS[pageContext] && (
                                <div className={`border rounded-xl p-3 flex items-start gap-3 ${PAGE_CONTEXT_LABELS[pageContext].color}`}>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold mb-0.5">{PAGE_CONTEXT_LABELS[pageContext].title}</p>
                                        <p className="text-xs">{PAGE_CONTEXT_LABELS[pageContext].desc}</p>
                                    </div>
                                    <span className="text-xs opacity-60 shrink-0 mt-0.5">Dapat diubah ↓</span>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-full mt-0.5"><ListPlus className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-sm font-bold text-blue-800 mb-1">File ini mengandung {sheetsInfo.length} sheet yang terdeteksi:</h3>
                                    <p className="text-sm text-blue-700">Tinjau hasil deteksi. Setiap sheet diarahkan ke tujuan berbeda — ubah jenisnya jika perlu.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {sheetsInfo.map((sheet, idx) => (
                                    <div key={idx} className={clsx(
                                        "bg-white border p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all shadow-sm",
                                        (sheetTypes[sheet.name] === 'skip' || sheetTypes[sheet.name] === undefined) ? "border-slate-200 opacity-60" : "border-emerald-200 ring-1 ring-emerald-500/10"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded text-slate-500">
                                                <FileSpreadsheet className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className={clsx("font-bold", (sheetTypes[sheet.name] === 'skip' || sheetTypes[sheet.name] === undefined) ? "line-through text-slate-500" : "text-slate-800")}>{sheet.name}</p>
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{sheet.rowCount} Baris Data</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <span className="text-xs text-slate-400 font-bold uppercase hidden sm:block">Jenis →</span>
                                            <div className="relative w-full sm:w-56">
                                                <select 
                                                    value={sheetTypes[sheet.name] ?? 'skip'}
                                                    onChange={e => handleTypeChange(sheet.name, e.target.value as SheetType)}
                                                    className={clsx(
                                                        "w-full px-3 py-2 border rounded-lg text-sm font-semibold appearance-none outline-none pr-8 cursor-pointer",
                                                        (sheetTypes[sheet.name] === 'skip' || !sheetTypes[sheet.name]) ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                                                    )}
                                                >
                                                    <option value="stage_update">Stage Update</option>
                                                    <option value="site_technical">Data Teknis Site</option>
                                                    <option value="inventory_movement">Stok Material</option>
                                                    <option value="material_master">Master Material</option>
                                                    <option value="workforce">Workforce</option>
                                                    <option value="skip">Lewati</option>
                                                </select>
                                                <ChevronDown className={clsx("absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none", (sheetTypes[sheet.name] === 'skip' || !sheetTypes[sheet.name]) ? "text-slate-400" : "text-emerald-600")} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end pt-4 border-t border-slate-200">
                                <button 
                                    onClick={handleProceedToMapping}
                                    disabled={sheetsToProcessCount === 0}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm"
                                >
                                    Lanjut ({sheetsToProcessCount} Sheet) <Play className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2.5: COLUMN MAPPING */}
                    {step === 2.5 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Pemetaan Kolom</h3>
                                <p className="text-sm text-slate-500">Sesuaikan header kolom Excel dengan format sistem.</p>
                                {unmappedCount > 0 && (
                                    <div className="mt-3 bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                                        ⚠ Ada {unmappedCount} kolom yang tidak terpetakan otomatis.
                                    </div>
                                )}
                            </div>

                            <div className="space-y-6">
                                {sheetsInfo.map((sheet, idx) => {
                                    if (sheet.type === 'skip' || sheet.type === 'unknown') return null;
                                    const fields = SYSTEM_FIELDS[sheet.type];
                                    if (fields.length === 0) return null;

                                    const headers = Object.keys(sheet.data[0] || {});

                                    return (
                                        <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center gap-2">
                                                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                                                <h4 className="font-bold text-slate-700 text-sm">Sheet: {sheet.name} <span className="text-slate-400 font-normal">({SHEET_TYPE_LABELS[sheet.type]})</span></h4>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {fields.map(f => (
                                                    <div key={f.key} className="p-3 flex items-center gap-4">
                                                        <div className="w-1/3">
                                                            <div className="text-sm font-bold text-slate-700">{f.label}</div>
                                                        </div>
                                                        <div className="text-slate-400">←</div>
                                                        <div className="flex-1 relative">
                                                            <select 
                                                                value={columnMappings[idx]?.[f.key] || ''}
                                                                onChange={e => {
                                                                    setColumnMappings(prev => ({
                                                                        ...prev,
                                                                        [idx]: { ...(prev[idx] || {}), [f.key]: e.target.value }
                                                                    }));
                                                                }}
                                                                className={clsx(
                                                                    "w-full px-3 py-2 border rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500",
                                                                    !columnMappings[idx]?.[f.key] && f.required ? "border-amber-300 bg-amber-50" : "border-slate-300"
                                                                )}
                                                            >
                                                                <option value="">-- Abaikan / Tidak Dipetakan --</option>
                                                                {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between pt-4 border-t border-slate-200">
                                <button onClick={() => setStep(2)} className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Kembali</button>
                                <button 
                                    onClick={handleProceedToNormalization}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm"
                                >
                                    Lanjut Value Mapping <Play className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: NORMALIZATION UI */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Value Normalization</h3>
                                <p className="text-sm text-slate-500">Petakan status dari Excel ke status valid di sistem.</p>
                            </div>
                            
                            {permitStatuses.length > 0 && (
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-slate-50 p-3 border-b border-slate-200">
                                        <h4 className="font-bold text-slate-700 text-sm">PERMIT STATUS — {permitStatuses.length} nilai unik</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">Nilai asli disimpan apa adanya. Pilih stage operasional yang sesuai (atau biarkan kosong untuk skip pembaruan stage).</p>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {permitStatuses.map((ps, idx) => (
                                            <div key={idx} className="p-3 flex items-center gap-3">
                                                <div className="flex-1 text-sm font-medium text-slate-700 font-mono bg-slate-50 px-2 py-1 rounded">{ps.val}</div>
                                                <div className="text-slate-400 text-xs">→ status</div>
                                                <div className="relative w-52">
                                                    <select
                                                        value={ps.mapTo}
                                                        onChange={e => {
                                                            const n = [...permitStatuses];
                                                            n[idx].mapTo = e.target.value;
                                                            setPermitStatuses(n);
                                                        }}
                                                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none focus:border-blue-500"
                                                    >
                                                        <option value="">— jangan ubah status —</option>
                                                        <option value="1. Planning">1. Planning</option>
                                                        <option value="2. Waiting for TO Approval">2. Waiting for TO Approval</option>
                                                        <option value="4. Tpass Released">4. Tpass Released</option>
                                                        <option value="5. Permit Released">5. Permit Released</option>
                                                        <option value="6. Expired Permit">6. Expired Permit</option>
                                                        <option value="9. Cancelled">9. Cancelled</option>
                                                        <option value="10. DROP OUT">10. DROP OUT</option>
                                                    </select>
                                                </div>
                                                <div className="w-16 text-right text-xs text-slate-400">{ps.count} baris</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {implStatuses.length > 0 && (
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-slate-50 p-3 border-b border-slate-200">
                                        <h4 className="font-bold text-slate-700 text-sm">IMPLEMENTASI STATUS — {implStatuses.length} nilai unik</h4>
                                        <p className="text-xs text-slate-400 mt-0.5">Nilai asli disimpan apa adanya. Pilih stage operasional yang sesuai.</p>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {implStatuses.map((is, idx) => (
                                            <div key={idx} className="p-3 flex items-center gap-3">
                                                <div className="flex-1 text-sm font-medium text-slate-700 font-mono bg-slate-50 px-2 py-1 rounded">{is.val}</div>
                                                <div className="text-slate-400 text-xs">→ status</div>
                                                <div className="relative w-52">
                                                    <select
                                                        value={is.mapTo}
                                                        onChange={e => {
                                                            const n = [...implStatuses];
                                                            n[idx].mapTo = e.target.value;
                                                            setImplStatuses(n);
                                                        }}
                                                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none focus:border-blue-500"
                                                    >
                                                        <option value="">— jangan ubah status —</option>
                                                        <option value="Planning">Planning</option>
                                                        <option value="On Going">On Going</option>
                                                        <option value="On Hold">On Hold</option>
                                                        <option value="RFS">RFS</option>
                                                        <option value="Cancelled">Cancelled</option>
                                                    </select>
                                                </div>
                                                <div className="w-16 text-right text-xs text-slate-400">{is.count} baris</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SYNC STRATEGY SELECTION */}
                            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 shadow-sm space-y-3">
                                <div>
                                    <h4 className="font-bold text-amber-900 text-sm">⚡ Strategi Sinkronisasi Database</h4>
                                    <p className="text-xs text-amber-700 mt-0.5">Tentukan bagaimana sistem menyikapi data yang sudah ada saat ini di database.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label className={clsx(
                                        "relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                                        syncStrategy === 'merge' ? "bg-white border-blue-500 ring-1 ring-blue-500 shadow-sm" : "bg-white/50 border-slate-200 hover:border-slate-300"
                                    )}>
                                        <input 
                                            type="radio" 
                                            name="syncStrategy" 
                                            value="merge" 
                                            checked={syncStrategy === 'merge'} 
                                            onChange={() => setSyncStrategy('merge')}
                                            className="mt-0.5 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <div className="font-bold text-slate-800 text-xs">Mode Update & Merge</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">Hanya update yang cocok, sisanya diabaikan. Menumpuk data historis.</div>
                                        </div>
                                    </label>

                                    <label className={clsx(
                                        "relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                                        syncStrategy === 'replace' ? "bg-red-50 border-red-500 ring-1 ring-red-500 shadow-sm" : "bg-white/50 border-slate-200 hover:border-red-200"
                                    )}>
                                        <input 
                                            type="radio" 
                                            name="syncStrategy" 
                                            value="replace" 
                                            checked={syncStrategy === 'replace'} 
                                            onChange={() => setSyncStrategy('replace')}
                                            className="mt-0.5 text-red-600 focus:ring-red-500"
                                        />
                                        <div>
                                            <div className="font-bold text-red-800 text-xs">Mode Overwrite (Full Sync)</div>
                                            <div className="text-[10px] text-red-600 font-medium mt-0.5">⚠️ Hapus isi tabel & ganti total dengan Excel agar angka pivot 100% sama.</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                <span className="text-xs text-slate-500 italic">* Sistem akan mengingat mapping ini untuk import berikutnya.</span>
                                <button 
                                    onClick={handleProcessSequentially}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm"
                                >
                                    Simpan & Proses <Play className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: PROCESSING */}
                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin relative" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-slate-800">Memproses Sheet...</h3>
                                <p className="text-sm text-slate-500 mt-1">Sistem sedang mengeksekusi routing mapper pada masing-masing sheet.</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 5: RESULT SUMMARY */}
                    {step === 5 && (
                        <div className="flex flex-col space-y-6 animate-in slide-in-from-bottom-8 duration-300 py-4 max-w-2xl mx-auto">
                            <div className="text-center space-y-1">
                                <div className="w-16 h-16 bg-emerald-100 border-4 border-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Proses Selesai</h3>
                                <p className="text-slate-500 font-medium">Berdasarkan data yang diproses, berikut adalah summary perubahannya.</p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                                {processedSummary.stage_update?.total > 0 && (
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                        <div className="font-semibold text-slate-700">ReEngineering Progress</div>
                                        <div className="text-sm text-slate-600">
                                            <span className="font-bold text-blue-600">{processedSummary.stage_update.processed}</span> diupdate · <span className="font-bold text-emerald-600">{processedSummary.stage_update.new || 0}</span> baru · {processedSummary.stage_update.skipped || 0} lewati · <span className="font-bold text-red-500">{processedSummary.stage_update.error}</span> error
                                        </div>
                                    </div>
                                )}
                                {processedSummary.site_technical?.total > 0 && (
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                        <div className="font-semibold text-slate-700">Detail Site-ID</div>
                                        <div className="text-sm text-slate-600">
                                            <span className="font-bold text-emerald-600">{processedSummary.site_technical.new || 0}</span> baru · <span className="font-bold text-blue-600">{processedSummary.site_technical.updated || 0}</span> diupdate · {processedSummary.site_technical.skipped || 0} lewati
                                        </div>
                                    </div>
                                )}
                                {processedSummary.inventory_movement?.total > 0 && (
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                        <div className="font-semibold text-slate-700">INVENTORY REPORT</div>
                                        <div className="text-sm text-slate-600">
                                            <span className="font-bold text-amber-600">{processedSummary.inventory_movement.processed}</span> movement records ditambahkan
                                        </div>
                                    </div>
                                )}
                                {processedSummary.workforce?.total > 0 && (
                                    <div className="flex justify-between items-center">
                                        <div className="font-semibold text-slate-700">Workforce Import</div>
                                        <div className="text-sm text-slate-600">
                                            <span className="font-bold text-purple-600">{processedSummary.workforce.processed}</span> personel diperbarui
                                        </div>
                                    </div>
                                )}
                                
                                {Object.values(processedSummary).every((val: any) => val.total === 0) && (
                                    <div className="text-center text-slate-500 italic py-4">Tidak ada data yang diproses.</div>
                                )}
                            </div>

                            {processedSummary.stage_update?.errorDetails?.length > 0 && (
                                <div className="bg-red-50/50 border border-red-100 rounded-xl p-5 space-y-3 animate-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex items-center gap-2 text-red-700 font-bold">
                                        <AlertCircle className="w-5 h-5" />
                                        <span>Rincian Error Pada Eksekusi ({processedSummary.stage_update.errorDetails.length})</span>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto border border-red-200 bg-white rounded-lg shadow-inner">
                                        <table className="w-full text-xs text-left border-collapse">
                                            <thead className="bg-red-50 border-b border-red-100 text-red-800 sticky top-0 shadow-sm">
                                                <tr>
                                                    <th className="px-3 py-2 font-black">Identitas</th>
                                                    <th className="px-3 py-2 font-black">Konteks Alur</th>
                                                    <th className="px-3 py-2 font-black">Penyebab Kegagalan</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-50">
                                                {processedSummary.stage_update.errorDetails.map((err: any, i: number) => (
                                                    <tr key={i} className="hover:bg-red-50/40 transition-colors">
                                                        <td className="px-3 py-2 font-bold text-slate-700 font-mono">{err.site}</td>
                                                        <td className="px-3 py-2 text-slate-500 font-medium"><span className="px-1.5 py-0.5 bg-slate-100 rounded border">{err.context}</span></td>
                                                        <td className="px-3 py-2 text-red-600 font-medium">{err.reason}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={() => {
                                    if(onImportComplete) onImportComplete(processedSummary);
                                    onClose();
                                }}
                                className="mt-8 px-6 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-900 transition-colors w-full"
                            >
                                Tutup
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MultiSheetExcelModal;
