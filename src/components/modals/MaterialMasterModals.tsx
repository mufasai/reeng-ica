import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Plus, Trash2, AlertTriangle, Loader2, Upload, TableProperties, Play, CopyCheck, ArchiveX } from 'lucide-react';
import clsx from 'clsx';
import { materialMasterRecords } from '../../data/mockData';

interface MaterialMasterModalsProps {
    mode: 'manual' | 'excel' | 'ocr';
    isOpen: boolean;
    onClose: () => void;
}

// Minimal row data for entry
interface MasterEntryRow {
    id: string; // temp UI id
    kode: string;
    nama: string;
    kategori: string;
    spesifikasi: string;
    satuan: string;
    harga_satuan: string;
}

const MaterialMasterModals: React.FC<MaterialMasterModalsProps> = ({ mode, isOpen, onClose }) => {
    // Shared states
    const [isSaving, setIsSaving] = useState(false);

    // MODE: MANUAL / OCR Shared Entries
    const [entries, setEntries] = useState<MasterEntryRow[]>([]);
    
    // OCR Specific
    const ocrInputRef = useRef<HTMLInputElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanConfidence, setScanConfidence] = useState<number | null>(null);
    const [showOcrDropzone, setShowOcrDropzone] = useState(mode === 'ocr');

    // EXCEL Specific Navigation
    // steps: 1=upload, 2=mapping, 3=preview, 4=result
    const [excelStep, setExcelStep] = useState<number>(1);
    const excelInputRef = useRef<HTMLInputElement>(null);
    const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
    
    // Default system fields
    const systemFields = [
        { key: 'nama', label: 'Nama Material *', required: true },
        { key: 'kode', label: 'Kode Material', required: false },
        { key: 'kategori', label: 'Kategori', required: false },
        { key: 'spesifikasi', label: 'Spesifikasi', required: false },
        { key: 'satuan', label: 'Satuan', required: false },
        { key: 'harga_satuan', label: 'Harga Satuan', required: false },
    ];
    
    const [mappings, setMappings] = useState<Record<string, string>>({});
    
    // Excel validation results
    const [validatedRows, setValidatedRows] = useState<any[]>([]);
    const [duplicates, setDuplicates] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            setEntries([]);
            setExcelStep(1);
            setShowOcrDropzone(mode === 'ocr');
            setScanConfidence(null);
            
            if (mode === 'manual') {
                setEntries([createEmptyEntry()]);
            }
        }
    }, [isOpen, mode]);

    const createEmptyEntry = (): MasterEntryRow => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        kode: '',
        nama: '',
        kategori: '',
        spesifikasi: '',
        satuan: '',
        harga_satuan: ''
    });

    const handleAddEntry = () => setEntries([...entries, createEmptyEntry()]);
    const handleRemoveEntry = (id: string) => setEntries(entries.filter(e => e.id !== id));
    const handleEntryChange = (id: string, field: keyof MasterEntryRow, val: string) => {
        setEntries(entries.map(e => e.id === id ? { ...e, [field]: val } : e));
    };

    // --- OCR SIMULATION ---
    const handleOcrUpload = (e: React.ChangeEvent<HTMLInputElement> | any) => {
        const file = e.type === 'drop' ? e.dataTransfer.files?.[0] : e.target.files?.[0];
        if (!file) return;

        setShowOcrDropzone(false);
        setIsScanning(true);
        setTimeout(() => {
            setIsScanning(false);
            setScanConfidence(0.85);
            setEntries([
                { id: `t1`, kode: 'MT-NEW-1', nama: 'Router Board RB750', kategori: 'Telecom', spesifikasi: 'MikroTik Level 4', satuan: 'pcs', harga_satuan: '750000' },
                { id: `t2`, kode: 'MT-NEW-2', nama: 'Kabel UTP Cat 6', kategori: 'Sipil', spesifikasi: 'Belden 305m', satuan: 'Roll', harga_satuan: '1150000' }
            ]);
        }, 1500);
    };

    // --- EXCEL SIMULATION ---
    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement> | any) => {
        const file = e.type === 'drop' ? e.dataTransfer.files?.[0] : e.target.files?.[0];
        if (!file) return;

        // Simulate detecting headers
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            setExcelHeaders(['No', 'PartCode', 'Description', 'Category', 'Specs', 'UoM', 'UnitPrice', 'Remarks']);
            // Auto mapping best guesses
            setMappings({
                'nama': 'Description',
                'kode': 'PartCode',
                'kategori': 'Category',
                'spesifikasi': 'Specs',
                'satuan': 'UoM',
                'harga_satuan': 'UnitPrice'
            });
            setExcelStep(2);
        }, 800);
    };

    const handleRunMapping = () => {
        // Validate mapping
        if (!mappings['nama']) {
            alert('Nama Material wajib di-map!');
            return;
        }

        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            
            // Simulate 5 valid, 1 duplicate
            setValidatedRows([
                { tempId: 1, nama: 'Bolt M8x40', kode: 'HW-01', kategori: 'Hardware', satuan: 'pcs', harga_satuan: 1500 },
                { tempId: 2, nama: 'Nut M8', kode: 'HW-02', kategori: 'Hardware', satuan: 'pcs', harga_satuan: 500 },
            ]);

            // Simulation: we found a duplicate with existing material "Semen Portland"
            setDuplicates([
                { 
                    tempId: 3, 
                    nama: 'Semen Portland',  // matches existing!
                    kode: 'MT-001', 
                    kategori: 'Sipil', 
                    satuan: 'ZAK', 
                    harga_satuan: 68000, // new price
                    existing: materialMasterRecords.find(m => m.kode_material === 'MT-001')
                }
            ]);

            setExcelStep(3);
        }, 800);
    };

    const handleCompleteExcel = () => {
        setExcelStep(4);
    };

    const handleSaveManualOcr = () => {
        const valid = entries.filter(e => e.nama.trim() !== '');
        if (valid.length === 0) return;
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            onClose();
            // Optional: toast success
        }, 600);
    };

    if (!isOpen) return null;

    const validManualCount = entries.filter(e => e.nama.trim() !== '').length;

    // RENDERS
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {mode === 'manual' ? 'Tambah Material Manual' : mode === 'ocr' ? 'Scan Material ke Master' : 'Import Excel ke Master'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                    
                    {/* --- MANUAL & OCR MODE --- */}
                    {(mode === 'manual' || mode === 'ocr') && (
                        <div className="space-y-6">
                            
                            {/* OCR Dropzone */}
                            {mode === 'ocr' && showOcrDropzone && (
                                <div 
                                    className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-16 flex flex-col items-center justify-center text-center hover:border-blue-400 transition-colors cursor-pointer"
                                    onClick={() => ocrInputRef.current?.click()}
                                    onDrop={(e) => { e.preventDefault(); handleOcrUpload(e); }}
                                    onDragOver={e => e.preventDefault()}
                                >
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                        <Camera className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">Upload foto Delivery Order / Nota</h3>
                                    <p className="text-slate-500 mb-6">Mengekstrak list barang otomatis menjadi data material master</p>
                                    <button className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm">Pilih File</button>
                                    <input type="file" ref={ocrInputRef} onChange={handleOcrUpload} className="hidden" accept="image/*,.pdf" />
                                </div>
                            )}

                            {isScanning && (
                                <div className="bg-white border text-center border-slate-200 rounded-lg p-16 flex flex-col items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                                    <h3 className="text-lg font-medium text-slate-700">Membaca dokumen... 🔍</h3>
                                </div>
                            )}

                            {(!showOcrDropzone && !isScanning) && (
                                <>
                                    {mode === 'ocr' && scanConfidence && (
                                        <div className="flex items-start gap-3 bg-blue-50 text-blue-800 p-4 rounded-lg border border-blue-200">
                                            <CopyCheck className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
                                            <div>
                                                <p className="font-semibold text-sm">Berhasil mengekstrak {entries.length} baris! (Confidence: {(scanConfidence*100).toFixed(0)}%)</p>
                                                <p className="text-xs text-blue-600/80 mt-1.5">Tinjau dan koreksi data sebelum disimpan ke Material Master. Anda juga masih bisa menambahkan baris manual.</p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-sm whitespace-nowrap">
                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                    <tr>
                                                        <th className="p-3 font-semibold text-slate-600">Kode</th>
                                                        <th className="p-3 font-semibold text-slate-600">Nama Material <span className="text-red-500">*</span></th>
                                                        <th className="p-3 font-semibold text-slate-600">Kategori</th>
                                                        <th className="p-3 font-semibold text-slate-600">Spesifikasi</th>
                                                        <th className="p-3 font-semibold text-slate-600 w-24">Satuan</th>
                                                        <th className="p-3 font-semibold text-slate-600 w-32">Harga Satuan</th>
                                                        <th className="p-3 font-semibold text-slate-600 w-12 text-center"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {entries.map(e => (
                                                        <tr key={e.id} className="hover:bg-slate-50">
                                                            <td className="p-2">
                                                                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500" placeholder="Kode..." value={e.kode} onChange={ev => handleEntryChange(e.id, 'kode', ev.target.value)} />
                                                            </td>
                                                            <td className="p-2">
                                                                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500" placeholder="Nama..." value={e.nama} onChange={ev => handleEntryChange(e.id, 'nama', ev.target.value)} />
                                                            </td>
                                                            <td className="p-2">
                                                                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500" placeholder="Kategori..." value={e.kategori} onChange={ev => handleEntryChange(e.id, 'kategori', ev.target.value)} />
                                                            </td>
                                                            <td className="p-2">
                                                                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500" placeholder="Spesifikasi..." value={e.spesifikasi} onChange={ev => handleEntryChange(e.id, 'spesifikasi', ev.target.value)} />
                                                            </td>
                                                            <td className="p-2">
                                                                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500" placeholder="pcs" value={e.satuan} onChange={ev => handleEntryChange(e.id, 'satuan', ev.target.value)} />
                                                            </td>
                                                            <td className="p-2">
                                                                <div className="relative">
                                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Rp</span>
                                                                    <input type="number" min="0" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500" placeholder="0" value={e.harga_satuan} onChange={ev => handleEntryChange(e.id, 'harga_satuan', ev.target.value)} />
                                                                </div>
                                                            </td>
                                                            <td className="p-2 text-center">
                                                                <button onClick={() => handleRemoveEntry(e.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="p-3 bg-slate-50 border-t border-slate-200">
                                            <button onClick={handleAddEntry} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5">
                                                <Plus className="w-4 h-4" /> Tambah Baris
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* --- EXCEL MODE --- */}
                    {mode === 'excel' && (
                        <div className="space-y-6">
                            
                            {/* Stepper */}
                            <div className="flex items-center justify-between mx-auto max-w-2xl mb-8 relative">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-slate-200 -z-10"></div>
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-blue-600 -z-10 transition-all duration-500" style={{ width: `${((excelStep - 1) / 3) * 100}%` }}></div>
                                
                                {['Upload', 'Mapping', 'Preview', 'Result'].map((label, idx) => {
                                    const step = idx + 1;
                                    const active = excelStep === step;
                                    const completed = excelStep > step;
                                    return (
                                        <div key={step} className="flex flex-col items-center gap-2">
                                            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors", active ? "bg-white border-blue-600 text-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.2)]" : completed ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-300 text-slate-400")}>
                                                {step}
                                            </div>
                                            <span className={clsx("text-xs font-semibold uppercase tracking-wide", active ? "text-blue-600" : completed ? "text-slate-700" : "text-slate-400")}>{label}</span>
                                        </div>
                                    )
                                })}
                            </div>

                            {excelStep === 1 && (
                                <div 
                                    className="bg-white max-w-2xl mx-auto border-2 border-dashed border-slate-300 rounded-xl p-16 flex flex-col items-center justify-center text-center hover:border-blue-400 transition-colors cursor-pointer"
                                    onClick={() => excelInputRef.current?.click()}
                                    onDrop={(e) => { e.preventDefault(); handleExcelUpload(e); }}
                                    onDragOver={e => e.preventDefault()}
                                >
                                    {isSaving ? <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" /> : <TableProperties className="w-12 h-12 text-blue-500 mb-4" />}
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">Upload File Excel</h3>
                                    <p className="text-slate-500 mb-6 text-sm">Upload daftar master material dalam format .xlsx / .xls. Baris pertama (header) akan dideteksi secara otomatis.</p>
                                    <button className="bg-slate-100 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-medium shadow-sm hover:bg-slate-200 transition-colors">Browse Files</button>
                                    <input type="file" ref={excelInputRef} onChange={handleExcelUpload} className="hidden" accept=".xlsx,.xls,.csv" />
                                </div>
                            )}

                            {excelStep === 2 && (
                                <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl shadow-sm p-6 overflow-hidden">
                                    <div className="mb-6 flex justify-between items-end">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800">Maping Kolom</h3>
                                            <p className="text-sm text-slate-500 mt-1">Sistem mendeteksi <strong>{excelHeaders.length}</strong> kolom di file Anda. Pasangkan dengan kolom di database.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {systemFields.map(sf => (
                                            <div key={sf.key} className="flex flex-col md:flex-row md:items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                <div className="w-48 shrink-0">
                                                    <span className={clsx("text-sm font-semibold", sf.required ? "text-slate-800" : "text-slate-600")}>
                                                        {sf.label} 
                                                    </span>
                                                </div>
                                                <div className="text-slate-400 hidden md:block">→</div>
                                                <select 
                                                    className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white"
                                                    value={mappings[sf.key] || ''}
                                                    onChange={e => setMappings({...mappings, [sf.key]: e.target.value})}
                                                >
                                                    <option value="">- Abaikan (Tidak diisi) -</option>
                                                    <optgroup label="Kolom Excel Anda:">
                                                        {excelHeaders.map(h => (
                                                            <option key={h} value={h}>[{h}]</option>
                                                        ))}
                                                    </optgroup>
                                                </select>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end">
                                        <button onClick={handleRunMapping} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2">
                                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                            Preview Data <Play className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {excelStep === 3 && (
                                <div className="space-y-6">
                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="text-emerald-700 font-bold text-lg">{validatedRows.length}</p>
                                                <p className="text-emerald-600 text-sm font-medium">Baris valid (Siap Insert)</p>
                                            </div>
                                            <CopyCheck className="w-8 h-8 text-emerald-400 opacity-50" />
                                        </div>
                                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
                                            <div>
                                                <p className="text-amber-700 font-bold text-lg">{duplicates.length}</p>
                                                <p className="text-amber-600 text-sm font-medium">Deteksi Duplikat / Bentrok</p>
                                            </div>
                                            <AlertTriangle className="w-8 h-8 text-amber-400 opacity-50" />
                                        </div>
                                    </div>

                                    {/* Duplicates conflict resolver */}
                                    {duplicates.length > 0 && (
                                        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="bg-amber-50 p-4 border-b border-amber-200">
                                                <h3 className="font-bold text-amber-800 flex items-center gap-2">
                                                    <AlertTriangle className="w-5 h-5" /> Perlu Perhatian: Data Duplikat
                                                </h3>
                                                <p className="text-amber-700 text-sm mt-1">Nama material atau kode ini sudah ada di Master. Pilih tindakan untuk baris ini:</p>
                                            </div>
                                            <div className="divide-y divide-slate-200">
                                                {duplicates.map((dup, i) => (
                                                    <div key={i} className="p-5 flex gap-6 overflow-x-auto items-start">
                                                        <div className="flex-1 bg-slate-50 p-3 rounded border border-slate-200 shadow-inner">
                                                            <div className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Data di Master (Saat Ini)</div>
                                                            <div className="text-sm space-y-1">
                                                                <p><span className="text-slate-400 min-w-24 inline-block">Nama:</span> <strong className="text-slate-700">{dup.existing.nama_material}</strong></p>
                                                                <p><span className="text-slate-400 min-w-24 inline-block">Kode:</span> <span className="text-slate-600">{dup.existing.kode_material || '—'}</span></p>
                                                                <p><span className="text-slate-400 min-w-24 inline-block">Harga/Satuan:</span> <span className="text-slate-600">Rp {dup.existing.harga_satuan} / {dup.existing.satuan}</span></p>
                                                            </div>
                                                        </div>
                                                        <div className="w-12 flex justify-center items-center self-stretch opacity-50">
                                                            <div className="h-full w-px bg-slate-300 relative"><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs font-bold text-slate-400">VS</span></div>
                                                        </div>
                                                        <div className="flex-1 bg-white p-3 rounded border border-amber-200 shadow-sm relative overflow-hidden">
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                                            <div className="text-xs font-bold text-amber-600 uppercase mb-2 tracking-wider">Data Baru di Excel</div>
                                                            <div className="text-sm space-y-1">
                                                                <p><span className="text-slate-400 min-w-24 inline-block">Nama:</span> <strong className="text-slate-700">{dup.nama}</strong></p>
                                                                <p><span className="text-slate-400 min-w-24 inline-block">Kode:</span> <span className="text-slate-600">{dup.kode || '—'}</span></p>
                                                                <p><span className="text-slate-400 min-w-24 inline-block">Harga/Satuan:</span> <span className={clsx(dup.harga_satuan !== dup.existing.harga_satuan ? "text-amber-700 font-bold bg-amber-100 px-1 rounded" : "text-slate-600")}>Rp {dup.harga_satuan}</span> / <span className="text-slate-600">{dup.satuan}</span></p>
                                                            </div>
                                                            
                                                            {/* Actions inline */}
                                                            <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                                                                <button className="flex-1 py-1.5 px-3 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50">Lewati (Abaikan)</button>
                                                                <button className="flex-1 py-1.5 px-3 bg-blue-50 border border-blue-200 rounded text-xs font-semibold text-blue-700 hover:bg-blue-100">Update Master</button>
                                                                <button className="flex-1 py-1.5 px-3 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50">Tambah Baru</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-4">
                                        <button onClick={handleCompleteExcel} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm shadow-blue-600/30">
                                            Konfirmasi & Import Sekarang
                                        </button>
                                    </div>
                                </div>
                            )}

                            {excelStep === 4 && (
                                <div className="bg-white max-w-xl mx-auto border border-emerald-200 rounded-xl p-12 text-center shadow-sm">
                                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CopyCheck className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Import Selesai!</h3>
                                    <p className="text-slate-600 mb-8 max-w-sm mx-auto">Berhasil menambahkan <strong>{validatedRows.length + duplicates.length}</strong> material baru ke Master. Perubahan bisa Anda lihat di tabel.</p>
                                    <button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-bold shadow-sm shadow-emerald-600/20">
                                        Kembali ke Material Master
                                    </button>
                                </div>
                            )}

                        </div>
                    )}

                </div>

                {/* Footer (Only for Manual and OCR, Excel has built-in navigation buttons) */}
                {(mode === 'manual' || mode === 'ocr') && !showOcrDropzone && (
                    <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-3 rounded-b-xl shrink-0">
                        <button 
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            Batal
                        </button>
                        <button 
                            onClick={handleSaveManualOcr}
                            disabled={validManualCount === 0 || isSaving}
                            className={clsx(
                                "px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all",
                                (validManualCount === 0 || isSaving)
                                    ? "bg-slate-300 text-slate-500 cursor-not-allowed" 
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                            )}
                        >
                            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Simpan ke Master ({validManualCount} item)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MaterialMasterModals;
