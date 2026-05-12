import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Plus, FileSpreadsheet, CheckCircle2, Loader2, ListChecks, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import { db, cleanRecordId, connectDB } from '../../db';
import { siteMasterRecords, atpWorkOrders, siteTechnicalDetails } from '../../data/mockData';
import { useSidebar } from '../../context/SidebarContext';

interface ImportSiteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportExcel: (parsedData: any[], fileName: string) => void;
    onAddManual: () => void;
}



const ImportSiteModal: React.FC<ImportSiteModalProps> = ({ isOpen, onClose, onImportExcel }) => {
    const { triggerCountRefresh } = useSidebar();

    // Top-level Wizard State
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

    // Step 1 State
    const [activeTab, setActiveTab] = useState<'excel' | 'manual'>('excel');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Step 3 State (Conflicts)
    const [conflicts, setConflicts] = useState<any[]>([]);

    // Step 4 State (Result)
    const [resultCounts, setResultCounts] = useState({ new: 0, updated: 0, skipped: 0, unchanged: 0 });

    // Manual entry state
    const [manualMode, setManualMode] = useState<'tiket' | 'teknis'>('tiket');
    const [manualSaving, setManualSaving] = useState(false);
    const [manualSuccess, setManualSuccess] = useState(false);
    const [manualError, setManualError] = useState('');
    const [manualForm, setManualForm] = useState({
        site_id: '', project_type: 'FILTERING', sector: '1', region: '', site_name: '',
        ne_id: '', layer: '', freq_band: '', latitude: '', longitude: '', tp_name: '',
    });
    const setField = (k: string, v: string) => setManualForm(prev => ({ ...prev, [k]: v }));

    const handleManualSubmit = async () => {
        if (!manualForm.site_id.trim()) { setManualError('Site ID wajib diisi.'); return; }
        setManualSaving(true);
        setManualError('');
        try {
            await connectDB();
            if (manualMode === 'tiket') {
                const record: any = {
                    site_id: manualForm.site_id.trim().toUpperCase(),
                    project_type: manualForm.project_type || null,
                    sector: Number(manualForm.sector) || 1,
                    region: manualForm.region || null,
                    site_name: manualForm.site_name || null,
                    stage: 'assigned',
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                const result = await db.query('INSERT INTO sites $record', { record });
                const firstRow = Array.isArray(result?.[0]) ? result[0][0] : result?.[0];
                if (firstRow?.id) record.id = cleanRecordId(firstRow.id);
                siteMasterRecords.push({ ...record, unique_key: record.site_id } as any);
                atpWorkOrders.push({ ...record, atp_number: '', team_id: '', field_leader_id: '' } as any);
            } else {
                const record: any = {
                    site_id: manualForm.site_id.trim().toUpperCase(),
                    ne_id: manualForm.ne_id || null,
                    layer: manualForm.layer || null,
                    sector: Number(manualForm.sector) || null,
                    freq_band: manualForm.freq_band || null,
                    latitude: manualForm.latitude ? Number(manualForm.latitude) : null,
                    longitude: manualForm.longitude ? Number(manualForm.longitude) : null,
                    tp_name: manualForm.tp_name || null,
                    imported_at: new Date().toISOString(),
                };
                const result = await db.query('INSERT INTO site_technical_details $record', { record });
                const firstRow = Array.isArray(result?.[0]) ? result[0][0] : result?.[0];
                if (firstRow?.id) record.id = cleanRecordId(firstRow.id);
                siteTechnicalDetails.push(record as any);
            }
            triggerCountRefresh();
            setManualSuccess(true);
            setManualForm({ site_id: '', project_type: 'FILTERING', sector: '1', region: '', site_name: '', ne_id: '', layer: '', freq_band: '', latitude: '', longitude: '', tp_name: '' });
        } catch (err: any) {
            setManualError('Gagal menyimpan: ' + (err?.message || 'Unknown error'));
        } finally {
            setManualSaving(false);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            // Reset state fully when modal closes
            setTimeout(() => {
                setStep(1);
                setActiveTab('excel');
                setSelectedFile(null);
                setConflicts([]);
            }, 300);
        }
    }, [isOpen]);

    const [excelImporting, setExcelImporting] = useState(false);
    const [excelResult, setExcelResult] = useState<{ inserted: number; skipped: number; error: number } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setSelectedFile(file || null);
        setExcelResult(null);
    };

    const handleImportExcelTechnical = async () => {
        if (!selectedFile) return;
        setExcelImporting(true);
        setExcelResult(null);
        try {
            await connectDB();
            const buf = await selectedFile.arrayBuffer();
            const wb = (XLSX as any).read(buf, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows: any[] = (XLSX as any).utils.sheet_to_json(ws, { defval: null });

            let inserted = 0, skipped = 0, error = 0;
            const importedAt = new Date().toISOString();

            for (const row of rows) {
                const siteId = String(row['SITE_ID'] || row['site_id'] || row['Site ID'] || '').trim().toUpperCase();
                if (!siteId) { skipped++; continue; }

                const getV = (...keys: string[]) => { for (const k of keys) { if (row[k] != null && row[k] !== '') return row[k]; } return null; };

                const record: any = {
                    site_id: siteId,
                    ne_id:         String(getV('NE_ID', 'ne_id', 'NE ID') || '') || null,
                    layer:         String(getV('LAYER', 'layer', 'Layer') || '') || null,
                    sector:        Number(getV('SEC', 'sec', 'SECTOR', 'sector')) || null,
                    ant_type:      String(getV('ANT_TYPE', 'ant_type', 'ANTENNA_TYPE', 'antenna_type', 'Antenna Type') || '') || null,
                    height:        Number(getV('HEIGHT', 'height')) || null,
                    freq_band:     String(getV('FREQ_BAND', 'freq_band', 'FREQ BAND') || '') || null,
                    longitude:     Number(getV('LONGITUDE', 'longitude', 'LONG', 'long')) || null,
                    latitude:      Number(getV('LATITUDE', 'latitude', 'LAT', 'lat')) || null,
                    tp_id:         String(getV('TP_ID', 'tp_id', 'TP ID') || '') || null,
                    tp_name:       String(getV('TP', 'tp', 'TP_NAME', 'tp_name', 'TP NAME') || '') || null,
                    site_type:     String(getV('SITE_TYPE', 'site_type', 'SITE TYPE') || '') || null,
                    cell_name:     String(getV('CELL_NAME', 'cell_name', 'CELL NAME', 'lte_ne_name', 'LTE_NE_NAME') || '') || null,
                    enodeb_id:     Number(getV('ENODEB_ID', 'enodeb_id', 'ENODEB ID')) || null,
                    cell_id:       Number(getV('CELL_ID', 'cell_id', 'CELL ID')) || null,
                    local_cell_id: Number(getV('LOCAL_CELL_ID', 'local_cell_id', 'LOCAL CELL ID')) || null,
                    tal:           Number(getV('TAL', 'tal')) || null,
                    tac:           Number(getV('TAC', 'tac')) || null,
                    area:          String(getV('AREA', 'area') || '') || null,
                    bsc:           String(getV('BSC', 'bsc') || '') || null,
                    site_name:     String(getV('SITENAME', 'sitename', 'SITE_NAME', 'site_name', 'SITE NAME', 'site') || '') || null,
                    provinsi:      String(getV('PROVINSI', 'provinsi') || '') || null,
                    address:       String(getV('ADDRESS', 'address', 'ALAMAT') || '') || null,
                    kecamatan:     String(getV('KECAMATAN', 'kecamatan') || '') || null,
                    kabupaten:     String(getV('KABUPATEN', 'kabupaten', 'KOTA/KAB') || '') || null,
                    desa:          String(getV('DESA', 'desa') || '') || null,
                    cluster:       String(getV('CLUSTER_NEW', 'cluster_new', 'CLUSTER NEW', 'CLUSTER', 'cluster') || '') || null,
                    branch:        String(getV('BRANCH_NEW', 'branch_new', 'BRANCH', 'branch') || '') || null,
                    region:        String(getV('REGIONS_NEW', 'regions_new', 'REGION NEW', 'REGION', 'region') || '') || null,
                    source_file: selectedFile.name,
                    imported_at: importedAt,
                };
                // Remove null values to keep records clean
                Object.keys(record).forEach(k => { if (record[k] === null || record[k] === 0) delete record[k]; });
                record.site_id = siteId; // always keep site_id

                try {
                    const res = await db.query('INSERT INTO site_technical_details $record', { record });
                    const firstRow = Array.isArray(res?.[0]) ? res[0][0] : res?.[0];
                    if (firstRow?.id) record.id = cleanRecordId(firstRow.id);
                    siteTechnicalDetails.push(record);
                    inserted++;
                } catch {
                    error++;
                }
            }

            setExcelResult({ inserted, skipped, error });
            if (inserted > 0) triggerCountRefresh();
        } catch (err: any) {
            console.error('Excel import failed:', err);
            setExcelResult({ inserted: 0, skipped: 0, error: 1 });
        } finally {
            setExcelImporting(false);
        }
    };

    const handleAcceptToggle = (key: string, field: string, val: boolean) => {
        setConflicts(prev => prev.map(c => 
            (c.unique_key === key && c.field === field) ? { ...c, accepted: val } : c
        ));
    };

    const handleBulkAccept = (val: boolean) => {
        setConflicts(prev => prev.map(c => ({ ...c, accepted: val })));
    };

    const handleFinishImport = () => {
        // Calculate result
        const acceptedCount = conflicts.filter(c => c.accepted).length;
        const skippedCount = conflicts.length - acceptedCount;
        setResultCounts({
            new: 12, // Mock 12 new sites
            updated: acceptedCount,
            skipped: skippedCount,
            unchanged: 45 // Mock 45 unchanged
        });
        
        // Let the parent know
        onImportExcel([], selectedFile?.name || 'Import_Batch');
        
        setStep(4);
    };

    // ─── Renders ─────────────────────────────────────────────────────────────
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Header with Steps */}
                <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-slate-800">Add Site & Import</h2>
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-slate-300">|</span>
                            <div className="flex flex-row gap-2 text-xs font-bold">
                                {[1, 2, 3, 4].map((s, idx) => (
                                    <div key={s} className="flex items-center gap-2">
                                        <span className={clsx(
                                            "flex items-center justify-center w-5 h-5 rounded-full",
                                            step === s ? "bg-blue-600 text-white" : step > s ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {step > s ? <CheckCircle2 className="w-3 h-3" /> : s}
                                        </span>
                                        <span className={clsx(step === s ? "text-slate-800" : step > s ? "text-emerald-600" : "text-slate-400")}>
                                            {s === 1 ? 'Upload' : s === 2 ? 'Analysis' : s === 3 ? 'Review' : 'Result'}
                                        </span>
                                        {idx < 3 && <div className="w-4 h-px bg-slate-200"></div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {step !== 2 && (
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Body Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 relative">
                    {/* STEP 1: UPLOAD */}
                    {step === 1 && (
                        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex border-b border-slate-200 bg-slate-50">
                                <button onClick={() => setActiveTab('excel')} className={clsx("flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2", activeTab === 'excel' ? "border-blue-600 text-blue-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100")}>
                                    <Upload className="w-4 h-4" /> Upload Excel BoQ
                                </button>
                                <button onClick={() => setActiveTab('manual')} className={clsx("flex-1 py-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2", activeTab === 'manual' ? "border-blue-600 text-blue-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100")}>
                                    <Plus className="w-4 h-4" /> Entry Manual
                                </button>
                            </div>
                            
                            <div className="p-6">
                                {activeTab === 'excel' && (
                                    <div className="space-y-4">
                                        <p className="text-sm text-slate-500">
                                            Import Excel langsung ke tabel <strong>Detail Teknis Site</strong>. Kolom <code className="bg-slate-100 px-1 rounded text-xs">SITE_ID</code> wajib ada — kolom lain opsional dan di-match otomatis.
                                        </p>
                                        <input type="file" className="hidden" ref={fileInputRef} accept=".xlsx,.xls" onChange={handleFileChange} />

                                        <div
                                            className={clsx(
                                                "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer group",
                                                selectedFile ? "border-blue-400 bg-blue-50/40" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/20"
                                            )}
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {selectedFile ? (
                                                <div className="animate-in zoom-in duration-150">
                                                    <FileSpreadsheet className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                                                    <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB · klik untuk ganti</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors mx-auto mb-2" />
                                                    <p className="text-sm font-bold text-slate-700">Klik atau drop file Excel</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">XLSX / XLS</p>
                                                </div>
                                            )}
                                        </div>

                                        {excelResult && (
                                            <div className={clsx("rounded-lg px-4 py-3 text-sm font-semibold flex items-center gap-2", excelResult.inserted > 0 ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700")}>
                                                {excelResult.inserted > 0 ? <CheckCircle2 className="w-4 h-4" /> : null}
                                                {excelResult.inserted} baris disimpan · {excelResult.skipped} dilewati · {excelResult.error} error
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                            <p className="text-xs text-slate-400">Sheet pertama yang ditemukan akan diproses.</p>
                                            <button
                                                onClick={handleImportExcelTechnical}
                                                disabled={!selectedFile || excelImporting}
                                                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {excelImporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengimpor...</> : 'Import ke Database'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {activeTab === 'manual' && (
                                    <div className="space-y-4">
                                        {/* Target selector */}
                                        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                            <button onClick={() => { setManualMode('tiket'); setManualSuccess(false); setManualError(''); }} className={clsx('flex-1 py-1.5 rounded-md text-xs font-bold transition-colors', manualMode === 'tiket' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                                Site Progress (Tiket)
                                            </button>
                                            <button onClick={() => { setManualMode('teknis'); setManualSuccess(false); setManualError(''); }} className={clsx('flex-1 py-1.5 rounded-md text-xs font-bold transition-colors', manualMode === 'teknis' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                                                Detail Teknis Site
                                            </button>
                                        </div>

                                        {manualSuccess && (
                                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" /> Berhasil disimpan ke database!
                                            </div>
                                        )}
                                        {manualError && (
                                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">{manualError}</div>
                                        )}

                                        {manualMode === 'tiket' && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">SITE ID <span className="text-red-500">*</span></label>
                                                    <input value={manualForm.site_id} onChange={e => setField('site_id', e.target.value)} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. CLG071" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">Project Type</label>
                                                    <select value={manualForm.project_type} onChange={e => setField('project_type', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500">
                                                        <option value="COMBAT">COMBAT</option>
                                                        <option value="FILTERING">FILTERING</option>
                                                        <option value="FILTER">FILTER</option>
                                                        <option value="RESCOPING">RESCOPING</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">Sector</label>
                                                    <input value={manualForm.sector} onChange={e => setField('sector', e.target.value)} type="number" min="1" max="6" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="1" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">Region</label>
                                                    <input value={manualForm.region} onChange={e => setField('region', e.target.value)} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. JAWA" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">Site Name</label>
                                                    <input value={manualForm.site_name} onChange={e => setField('site_name', e.target.value)} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. CIPINANGJAYA" />
                                                </div>
                                            </div>
                                        )}

                                        {manualMode === 'teknis' && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">SITE ID <span className="text-red-500">*</span></label>
                                                    <input value={manualForm.site_id} onChange={e => setField('site_id', e.target.value)} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. CLG071" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">NE ID</label>
                                                    <input value={manualForm.ne_id} onChange={e => setField('ne_id', e.target.value)} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. CLG071A_L1800" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">Layer</label>
                                                    <select value={manualForm.layer} onChange={e => setField('layer', e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500">
                                                        <option value="">— pilih —</option>
                                                        <option>2G</option><option>3G</option><option>4G</option><option>5G</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">Sector</label>
                                                    <input value={manualForm.sector} onChange={e => setField('sector', e.target.value)} type="number" min="0" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="1" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">Freq Band</label>
                                                    <input value={manualForm.freq_band} onChange={e => setField('freq_band', e.target.value)} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. 1800" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">Latitude</label>
                                                    <input value={manualForm.latitude} onChange={e => setField('latitude', e.target.value)} type="number" step="any" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="-6.2000" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">Longitude</label>
                                                    <input value={manualForm.longitude} onChange={e => setField('longitude', e.target.value)} type="number" step="any" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="106.8000" />
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <label className="text-xs font-bold text-slate-700">TP Name</label>
                                                    <input value={manualForm.tp_name} onChange={e => setField('tp_name', e.target.value)} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. Mitratel" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                            {manualSuccess && (
                                                <button onClick={() => setManualSuccess(false)} className="text-xs text-slate-500 hover:text-blue-600 font-semibold">+ Tambah lagi</button>
                                            )}
                                            <div className="ml-auto">
                                                <button
                                                    onClick={handleManualSubmit}
                                                    disabled={manualSaving || !manualForm.site_id.trim()}
                                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {manualSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan ke Database'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: ANALYZING (Spinner) */}
                    {step === 2 && (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                                <Loader2 className="w-12 h-12 text-blue-600 animate-spin relative" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-slate-800">Menganalisis Data Excel...</h3>
                                <p className="text-sm text-slate-500 mt-1">Membandingkan baris excel dengan database operasional saat ini</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: REVIEW CONFLICTS */}
                    {step === 3 && (
                        <div className="h-full flex flex-col space-y-4 animate-in slide-in-from-right-8 duration-300">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-4">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-full mt-0.5"><ListChecks className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-sm font-bold text-amber-800 mb-1">Ditemukan Perbedaan Data TI pada {conflicts.length} Site</h3>
                                    <p className="text-sm text-amber-700 mb-3">Tinjau dan pilih data baru yang ingin diupdate ke database. <strong>Data Operasional dan Stage tidak akan berubah.</strong></p>
                                    
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => handleBulkAccept(true)} className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 rounded text-xs font-bold transition-colors">✓ Terima Semua</button>
                                        <button onClick={() => handleBulkAccept(false)} className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 rounded text-xs font-bold transition-colors">✗ Tolak Semua</button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-[300px]">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 font-bold text-slate-600 w-16 text-center">Update?</th>
                                            <th className="px-4 py-3 font-bold text-slate-600">SITE_ID</th>
                                            <th className="px-4 py-3 font-bold text-slate-600">Kolom</th>
                                            <th className="px-4 py-3 font-bold text-slate-600 w-1/3">Data Di Sistem</th>
                                            <th className="px-4 py-3 font-bold text-slate-600 w-1/3">Data Dari Excel</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {conflicts.map((c, i) => (
                                            <tr key={`${c.unique_key}-${c.field}-${i}`} className={clsx("transition-colors", c.accepted ? "bg-white" : "bg-slate-50")}>
                                                <td className="px-4 py-3 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={c.accepted} 
                                                        onChange={(e) => handleAcceptToggle(c.unique_key, c.field, e.target.checked)}
                                                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 font-mono font-bold text-slate-800">{c.site_id}</td>
                                                <td className="px-4 py-3 text-slate-600 font-medium">
                                                    <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-xs">{c.field}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={clsx("transition-all duration-300", c.accepted ? "line-through text-slate-400" : "font-semibold text-slate-700")}>
                                                        {c.oldVal}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={clsx("transition-all flex items-center gap-2 font-semibold duration-300", c.accepted ? "text-blue-600" : "text-slate-400")}>
                                                        {c.accepted && <ArrowRight className="w-3 h-3 text-blue-400" />} {c.newVal}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <span className="text-sm font-medium text-slate-500">
                                    <strong className="text-blue-600">{conflicts.filter(x => x.accepted).length}</strong> / {conflicts.length} perubahan dipilih
                                </span>
                                <button 
                                    onClick={handleFinishImport}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm"
                                >
                                    Lanjut Simpan ke Database
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: RESULT */}
                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center space-y-6 animate-in slide-in-from-bottom-8 duration-300 py-8">
                            <div className="w-16 h-16 bg-emerald-100 border-4 border-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Import Berhasil</h3>
                                <p className="text-slate-500 font-medium">{selectedFile?.name} telah masuk ke sistem.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-4">
                                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                                    <p className="text-3xl font-black text-blue-600 mb-1">{resultCounts.new}</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Site Baru</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                                    <p className="text-3xl font-black text-emerald-600 mb-1">{resultCounts.updated}</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Data Diperbarui</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                                    <p className="text-3xl font-black text-amber-500 mb-1">{resultCounts.skipped}</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Data Dilewati/Tolak</p>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm opacity-60">
                                    <p className="text-3xl font-black text-slate-400 mb-1">{resultCounts.unchanged}</p>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tidak Berubah</p>
                                </div>
                            </div>

                            <button 
                                onClick={onClose}
                                className="mt-8 px-6 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-900 transition-colors w-full max-w-xs"
                            >
                                Kembali ke Registri
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportSiteModal;
