import React, { useState, useRef, useEffect } from 'react';
import { X, FileSpreadsheet, CheckCircle2, ChevronDown, ListPlus, Loader2, Play } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { siteMasterRecords, atpTasks, people, teamMembersRecords, materialTransactions, materialMasterRecords, savedExcelTemplates } from '../../data/mockData';

interface MultiSheetExcelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportComplete?: (summary: any) => void;
}

export type SheetType = 'stage_update' | 'site_technical' | 'inventory_movement' | 'workforce' | 'unknown' | 'skip';

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
    'unknown': 'Unknown',
    'skip': 'Lewati'
};

const detectSheetType = (headers: string[]): SheetType => {
    const has = (key: string) => headers.some(h => String(h).toUpperCase().includes(key.toUpperCase()));
    
    if (has('SITE_ID') && (has('PERMIT STATUS') || has('IMPLEMENTASI STATUS') || has('STATUS ATP'))) return 'stage_update';
    if (has('SITE_ID') && has('LAYER') && has('FREQ BAND') && has('CELL NAME')) return 'site_technical';
    if (has('TYPE') || has('MATERIAL') && has('IN') || has('OUT') && has('QUANTITY') || has('DELIVERY DATE')) return 'inventory_movement';
    if (has('NAMA KARYAWAN') || has('NAMA') && has('JABATAN') && (has('NO_HP') || has('HP'))) return 'workforce';
    
    return 'unknown';
};

const MultiSheetExcelModal: React.FC<MultiSheetExcelModalProps> = ({ isOpen, onClose, onImportComplete }) => {
    const [step, setStep] = useState<1 | 2 | 2.5 | 3 | 4 | 5>(1);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [permitStatuses, setPermitStatuses] = useState<{val: string, count: number, mapTo: string}[]>([]);
    const [implStatuses, setImplStatuses] = useState<{val: string, count: number, mapTo: string}[]>([]);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [sheetsInfo, setSheetsInfo] = useState<SheetInfo[]>([]);
    const [processedSummary, setProcessedSummary] = useState<any>({});
    
    // Column Mapping State
    // Format: { [sheetIdx]: { [system_column_key]: [excel_header_string] } }
    const [columnMappings, setColumnMappings] = useState<Record<number, Record<string, string>>>({});
    const [unmappedCount, setUnmappedCount] = useState(0);
    
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep(1);
                setSheetsInfo([]);
                setProcessedSummary({});
                setPermitStatuses([]);
                setImplStatuses([]);
                setColumnMappings({});
                setUnmappedCount(0);
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
                
                infos.push({
                    name: sheetName,
                    type: type === 'unknown' ? 'skip' : type, // default to skip if unknown, or allow override
                    rowCount: json.length,
                    data: json
                });
            }
            
            setSheetsInfo(infos);
        } catch (err) {
            console.error(err);
            alert("Failed to read Excel file.");
            setStep(1);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTypeChange = (idx: number, newType: SheetType) => {
        const newInfos = [...sheetsInfo];
        newInfos[idx].type = newType;
        setSheetsInfo(newInfos);
    };

    const suggestValueMapping = (val: string, type: 'permit' | 'implementasi') => {
        // First check saved templates
        const saved = savedExcelTemplates.find(t => t.sheetType === 'stage_update');
        if (saved && saved.valueNormalizations && saved.valueNormalizations[val]) {
            return saved.valueNormalizations[val];
        }

        const v = String(val).toLowerCase();
        if (type === 'permit') {
            if (v.includes('planning') || v.includes('pending') || v.includes('submitted') || v.includes('tpass')) return 'permit_process';
            if (v.includes('released')) return 'permit_ready';
            if (v.includes('expired')) return 'issue';
            if (v.includes('hold')) return 'hold';
            if (v.includes('cancelled')) return 'survey_nok';
            return 'permit_process';
        } else {
            if (v.includes('awaiting') || v.includes('scheduled') || v.includes('on going')) return 'implementasi';
            if (v.includes('rfs')) return 'rfs_done';
            if (v.includes('hold')) return 'hold';
            if (v.includes('cancelled')) return 'cancelled';
            return 'implementasi';
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
             { key: 'atp_note', label: 'Catatan ATP' }
        ],
        'inventory_movement': [
             { key: 'material', label: 'Material Name (*)', required: true },
             { key: 'direction', label: 'Direction (IN/OUT) (*)', required: true },
             { key: 'quantity', label: 'Quantity (*)', required: true },
             { key: 'date', label: 'Delivery Date' },
             { key: 'dn', label: 'Delivery Note No' },
             { key: 'po', label: 'PO Number' },
             { key: 'vendor', label: 'Vendor Pengirim' },
             { key: 'sender', label: 'Sender' },
             { key: 'receiver', label: 'Receiver' }
        ],
        'site_technical': [], 'workforce': [], 'unknown': [], 'skip': []
    };

    const handleProceedToMapping = () => {
        const initialMappings: Record<number, Record<string, string>> = {};
        let unmapped = 0;

        sheetsInfo.forEach((sheet, idx) => {
             if (sheet.type === 'skip' || sheet.type === 'unknown') return;
             if (SYSTEM_FIELDS[sheet.type].length === 0) return; // no mapping needed

             const fields = SYSTEM_FIELDS[sheet.type];
             const headers = Object.keys(sheet.data[0] || {});
             const saved = savedExcelTemplates.find(t => t.sheetType === sheet.type);
             
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
                           if (f.key === 'site_id' && hl.includes('site_id')) return true;
                           if (f.key === 'permit' && hl.includes('permit status')) return true;
                           if (f.key === 'impl' && (hl.includes('implementasi status') || hl.includes('new status'))) return true;
                           if (f.key === 'team' && hl === 'team') return true;
                           if (f.key === 'atp_status' && hl.includes('status atp')) return true;
                           if (f.key === 'atp_tiket' && (hl.includes('tiket') || hl.includes('number'))) return true;
                           
                           if (f.key === 'material' && (hl.includes('material') || hl.includes('type'))) return true;
                           if (f.key === 'direction' && (hl === 'in' || hl === 'out' || hl === 'in/out')) return true;
                           if (f.key === 'quantity' && hl.includes('quantity')) return true;
                           
                           return false; // add more logic if needed
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
        
        let summary: any = {
            stage_update: { total: 0, processed: 0, error: 0, skipped: 0 },
            site_technical: { total: 0, processed: 0 },
            inventory_movement: { total: 0, processed: 0 },
            workforce: { total: 0, processed: 0 }
        };

        // SAVE TEMPLATES IMPLICITLY
        sheetsInfo.forEach((sheet, idx) => {
             if (sheet.type === 'skip' || sheet.type === 'unknown') return;
             if (SYSTEM_FIELDS[sheet.type].length === 0) return;

             let tpl = savedExcelTemplates.find(t => t.sheetType === sheet.type);
             if (!tpl) {
                 tpl = { id: `tpl-${sheet.type}`, sheetType: sheet.type, columnMappings: {}, valueNormalizations: {} };
                 savedExcelTemplates.push(tpl);
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
            return match ? match.mapTo : null;
        };

        const getImplStatusMap = (rawVal: string) => {
            const match = implStatuses.find(p => p.val === rawVal);
            return match ? match.mapTo : null;
        };

        // Simulate sequential processing delay and apply mappings
        for (let i = 0; i < sheetsInfo.length; i++) {
            const sheet = sheetsInfo[i];
            if (sheet.type === 'skip' || sheet.type === 'unknown') continue;
            
            // Mock processing delay per sheet
            await new Promise(res => setTimeout(res, 800));
            
            // Actually process data mapping
            if (sheet.type === 'stage_update') {
                const mapDict = columnMappings[i] || {};
                let successCount = 0;
                let errorCount = 0;
                
                sheet.data.forEach(row => {
                    const siteId = row[mapDict['site_id']];
                    if (!siteId) { errorCount++; return; }

                    const existingSite = siteMasterRecords.find(s => String(s.site_id).toLowerCase() === String(siteId).toLowerCase() || String(s.unique_key).toLowerCase() === String(siteId).toLowerCase());
                    if (existingSite) {
                        // Apply normalizations
                        const rawPermit = row[mapDict['permit']];
                        if (rawPermit) {
                            const newStage = getPermitStatusMap(rawPermit);
                            if (newStage) existingSite.stage = newStage as any;
                        }

                        const rawImpl = row[mapDict['impl']];
                        if (rawImpl) {
                            const newStage = getImplStatusMap(rawImpl);
                            if (newStage) existingSite.stage = newStage as any;
                        }

                        // TEAM Lookup
                        const teamName = row[mapDict['team']];
                        if (teamName) {
                            const foundPerson = people.find(p => p.name.toLowerCase().includes(String(teamName).toLowerCase()));
                            if (foundPerson) {
                                const teamMemberRecord = teamMembersRecords.find(tm => tm.person_id === foundPerson.id);
                                if (teamMemberRecord) {
                                    existingSite.team_id = teamMemberRecord.team_id;
                                    existingSite.field_leader_id = foundPerson.id;
                                }
                            } else {
                                existingSite.extra_data = existingSite.extra_data || {};
                                existingSite.extra_data.team_lookup_warning = `Person '${teamName}' tidak ditemukan di sistem.`;
                            }
                        }

                        // STATUS ATP Workflow
                        const rawStatusatp = row[mapDict['atp_status']];
                        const rawAtpTicket = row[mapDict['atp_tiket']];
                        const rawAtpNote = row[mapDict['atp_note']];

                        // DYNAMIC NoSQL RETENTION
                        // Keep all columns that aren't mapped
                        const mappedExcelHeaders = Object.values(mapDict).filter(Boolean);
                        const dynamicData: Record<string, any> = {};
                        Object.keys(row).forEach(header => {
                            if (!mappedExcelHeaders.includes(header) && !header.startsWith('__EMPTY')) {
                                dynamicData[header] = row[header];
                            }
                        });
                        
                        existingSite.extra_data = {
                            ...(existingSite.extra_data || {}),
                            ...dynamicData
                        };
                        
                        if (rawStatusatp || rawAtpTicket || rawAtpNote) {
                            let atpTask = atpTasks.find(a => a.site_id === siteId);
                            if (!atpTask) {
                                atpTask = {
                                    id: `atp-new-${Date.now()}-${Math.random()}`,
                                    site_id: siteId,
                                    pdid: null,
                                    tiket_atp: null,
                                    tagging_status: 'pending',
                                    cell_capture_done: false,
                                    catatan: null,
                                    updated_by: 'system',
                                    updated_at: new Date().toISOString()
                                };
                                atpTasks.push(atpTask);
                            }

                            if (rawStatusatp) {
                                const s = String(rawStatusatp).toUpperCase();
                                if (s.includes('REQUEST PDID')) atpTask.tagging_status = 'pending';
                                else if (s.includes('UPLOAD TAGGING DONE')) atpTask.tagging_status = 'done';
                                else if (s.includes('TAGGING N/A')) atpTask.tagging_status = 'na';
                                else if (s.includes('HOLD')) atpTask.catatan = atpTask.catatan ? atpTask.catatan + ' | HOLD' : 'HOLD';
                            }

                            if (rawAtpTicket) atpTask.tiket_atp = String(rawAtpTicket);
                            if (rawAtpNote) atpTask.catatan = String(rawAtpNote);
                        }

                        successCount++;
                    } else {
                        errorCount++;
                    }
                });
                
                summary.stage_update.total += sheet.rowCount;
                summary.stage_update.processed += successCount;
                summary.stage_update.error += errorCount;
            } else if (sheet.type === 'inventory_movement') {
                const mapDict = columnMappings[i] || {};
                sheet.data.forEach(row => {
                    const materialName = row[mapDict['material']];
                    if (!materialName) return;

                    // Fuzzy match material master
                    const materialMaster = materialMasterRecords.find(m => String(m.nama_material).toLowerCase().includes(String(materialName).toLowerCase()));

                    materialTransactions.push({
                        id: `trx-${Date.now()}-${Math.random()}`,
                        material_master_id: materialMaster ? materialMaster.id : null,
                        material_nama: String(materialName),
                        material_type: null,
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
                        created_at: new Date().toISOString()
                    });
                });
                summary.inventory_movement.total += sheet.rowCount;
                summary.inventory_movement.processed += sheet.rowCount;
            } else {
                if (summary[sheet.type]) {
                    summary[sheet.type].total += sheet.rowCount;
                    summary[sheet.type].processed += Math.floor(sheet.rowCount * 0.9); // mock 90% success
                    if (summary[sheet.type].error !== undefined) {
                        summary[sheet.type].error += Math.floor(sheet.rowCount * 0.05);
                        summary[sheet.type].skipped += sheet.rowCount - summary[sheet.type].processed - summary[sheet.type].error;
                    }
                }
            }
        }
        
        setProcessedSummary(summary);
        setIsProcessing(false);
        setStep(5);
    };

    if (!isOpen) return null;

    const sheetsToProcessCount = sheetsInfo.filter(s => s.type !== 'skip' && s.type !== 'unknown').length;

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
                        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-4">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-full mt-0.5"><ListPlus className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-sm font-bold text-blue-800 mb-1">File ini mengandung {sheetsInfo.length} sheet yang terdeteksi:</h3>
                                    <p className="text-sm text-blue-700 mb-3">Tinjau hasil deteksi otomatis. Anda bisa mengubah jenis sheet jika sistem salah mendeteksi.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {sheetsInfo.map((sheet, idx) => (
                                    <div key={idx} className={clsx(
                                        "bg-white border p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all shadow-sm",
                                        sheet.type === 'skip' ? "border-slate-200 opacity-60" : "border-emerald-200 ring-1 ring-emerald-500/10"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded text-slate-500">
                                                <FileSpreadsheet className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className={clsx("font-bold", sheet.type === 'skip' ? "line-through text-slate-500" : "text-slate-800")}>{sheet.name}</p>
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{sheet.rowCount} Baris Data</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <span className="text-xs text-slate-400 font-bold uppercase hidden sm:block">Update →</span>
                                            <div className="relative w-full sm:w-48">
                                                <select 
                                                    value={sheet.type}
                                                    onChange={e => handleTypeChange(idx, e.target.value as SheetType)}
                                                    className={clsx(
                                                        "w-full px-3 py-2 border rounded-lg text-sm font-semibold appearance-none outline-none pr-8",
                                                        sheet.type === 'skip' ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                                                    )}
                                                >
                                                    {Object.entries(SHEET_TYPE_LABELS).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className={clsx("absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none", sheet.type === 'skip' ? "text-slate-400" : "text-emerald-600")} />
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
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {permitStatuses.map((ps, idx) => (
                                            <div key={idx} className="p-3 flex items-center gap-4">
                                                <div className="flex-1 text-sm font-medium text-slate-700">{ps.val}</div>
                                                <div className="text-slate-400">→</div>
                                                <div className="relative w-48">
                                                    <select 
                                                        value={ps.mapTo}
                                                        onChange={e => {
                                                            const n = [...permitStatuses];
                                                            n[idx].mapTo = e.target.value;
                                                            setPermitStatuses(n);
                                                        }}
                                                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none focus:border-blue-500"
                                                    >
                                                        <option value="permit_process">Permit Process</option>
                                                        <option value="permit_ready">Permit Ready</option>
                                                        <option value="issue">Issue/Expired</option>
                                                        <option value="hold">Hold</option>
                                                        <option value="survey_nok">Cancelled / Survey NOK</option>
                                                    </select>
                                                </div>
                                                <div className="w-20 text-right text-xs text-slate-500">{ps.count} baris</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {implStatuses.length > 0 && (
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-slate-50 p-3 border-b border-slate-200">
                                        <h4 className="font-bold text-slate-700 text-sm">IMPLEMENTASI STATUS — {implStatuses.length} nilai unik</h4>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {implStatuses.map((is, idx) => (
                                            <div key={idx} className="p-3 flex items-center gap-4">
                                                <div className="flex-1 text-sm font-medium text-slate-700">{is.val}</div>
                                                <div className="text-slate-400">→</div>
                                                <div className="relative w-48">
                                                    <select 
                                                        value={is.mapTo}
                                                        onChange={e => {
                                                            const n = [...implStatuses];
                                                            n[idx].mapTo = e.target.value;
                                                            setImplStatuses(n);
                                                        }}
                                                        className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white outline-none focus:border-blue-500"
                                                    >
                                                        <option value="implementasi">Implementasi (On Going)</option>
                                                        <option value="rfs_done">RFS Done</option>
                                                        <option value="hold">Hold</option>
                                                        <option value="cancelled">Cancelled</option>
                                                    </select>
                                                </div>
                                                <div className="w-20 text-right text-xs text-slate-500">{is.count} baris</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

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
                                            <span className="font-bold text-blue-600">{processedSummary.stage_update.processed}</span> stage updates diproses · <span className="font-bold text-red-500">{processedSummary.stage_update.error}</span> error · {processedSummary.stage_update.skipped} lewati
                                        </div>
                                    </div>
                                )}
                                {processedSummary.site_technical?.total > 0 && (
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                        <div className="font-semibold text-slate-700">Detail Site-ID</div>
                                        <div className="text-sm text-slate-600">
                                            <span className="font-bold text-emerald-600">{processedSummary.site_technical.processed}</span> baris teknis tersimpan
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
