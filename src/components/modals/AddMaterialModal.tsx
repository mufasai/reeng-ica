import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Camera, Edit3, Image as ImageIcon, Plus, Trash2, AlertTriangle, Loader2, PackageSearch, Command, CheckSquare, Square } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { materialMasterRecords } from '../../data/mockData';
import { NavLink } from 'react-router-dom';

interface MaterialItem {
    id: string; // Temporary ID for UI rendering
    nama_material: string;
    spesifikasi: string;
    jumlah: string;
    satuan: string;
    harga_satuan?: number; // Added from master
    keterangan: string;
    material_master_id?: string;
}

interface AddMaterialModalProps {
    isOpen: boolean;
    onClose: () => void;
    siteId: string;
    onSubmit: (materials: any[]) => void;
}

const AddMaterialModal: React.FC<AddMaterialModalProps> = ({ isOpen, onClose, siteId, onSubmit }) => {
    const { currentUser } = useAuth();

    // Modal states
    const [mode, setMode] = useState<'master' | 'ocr' | 'manual'>('master');
    const [items, setItems] = useState<MaterialItem[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [scanConfidence, setScanConfidence] = useState<number | null>(null);
    const [globalStatus, setGlobalStatus] = useState('Dipesan');

    // Master Selection States
    const [masterSearch, setMasterSearch] = useState('');
    const [masterSelections, setMasterSelections] = useState<Record<string, { jumlah: string; catatan: string }>>({});

    // Supporting document state
    const [supportingFile, setSupportingFile] = useState<File | null>(null);

    // Refs for hidden file inputs
    const ocrInputRef = useRef<HTMLInputElement>(null);
    const supportingInputRef = useRef<HTMLInputElement>(null);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setMode('master');
            setItems([]);
            setMasterSearch('');
            setMasterSelections({});
            setIsScanning(false);
            setSourceFile(null);
            setSupportingFile(null);
            setScanConfidence(null);
            setGlobalStatus('Dipesan');
        }
    }, [isOpen]);

    // Auto add empty row if manual mode and no items
    useEffect(() => {
        if (mode === 'manual' && items.length === 0) {
            setItems([createEmptyItem()]);
        }
    }, [mode, items]);

    // Derived Master records
    const availableMasterRecords = useMemo(() => {
        return materialMasterRecords.filter(m => m.status_aktif && (
            m.nama_material.toLowerCase().includes(masterSearch.toLowerCase()) ||
            (m.kode_material || '').toLowerCase().includes(masterSearch.toLowerCase())
        ));
    }, [masterSearch]);

    const handleToggleMasterItem = (id: string) => {
        setMasterSelections(prev => {
            const next = { ...prev };
            if (next[id]) delete next[id];
            else next[id] = { jumlah: '', catatan: '' };
            return next;
        });
    };

    const handleUpdateMasterSelection = (id: string, field: 'jumlah' | 'catatan', val: string) => {
        setMasterSelections(prev => {
            if (!prev[id]) return prev;
            return {
                ...prev,
                [id]: { ...prev[id], [field]: val }
            };
        });
    };

    // ----- OCR API Mock -----
    const mockOcrApi = (file: File) => {
        setIsScanning(true);
        setSourceFile(file);
        if (!supportingFile) {
            setSupportingFile(file);
        }

        setTimeout(() => {
            setIsScanning(false);
            if (Math.random() < 0.1) {
                alert('OCR tidak berhasil membaca dokumen ini.');
                setMode('manual');
                setItems([createEmptyItem()]);
                return;
            }

            const confidenceScore = Math.random() > 0.5 ? 0.92 : 0.65;
            setScanConfidence(confidenceScore);

            setItems([
                { id: `t1`, nama_material: 'Filter LTE 900 MHz', spesifikasi: '900MHz Bandpass Filter', jumlah: '2', satuan: 'pcs', keterangan: '' },
                { id: `t2`, nama_material: 'Cable RG-8', spesifikasi: 'Coaxial 50ohm', jumlah: '10', satuan: 'm', keterangan: '' }
            ]);
        }, 2000);
    };

    const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) mockOcrApi(file);
        e.target.value = '';
    };

    const handleSupportingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setSupportingFile(file);
        e.target.value = '';
    };

    // ----- Table Handlers -----
    const createEmptyItem = (): MaterialItem => ({
        id: `temp-${Date.now()}-${Math.random()}`,
        nama_material: '',
        spesifikasi: '',
        jumlah: '',
        satuan: '',
        keterangan: ''
    });

    const handleAddItem = () => setItems([...items, createEmptyItem()]);
    const handleRemoveItem = (id: string) => setItems(items.filter(item => item.id !== id));
    const handleChangeItem = (id: string, field: keyof MaterialItem, value: string) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    // Validations
    const validManualItemsCount = items.filter(i => i.nama_material.trim() !== '' && i.jumlah.toString().trim() !== '').length;
    const validMasterCount = Object.entries(masterSelections).filter(([_, data]) => data.jumlah.trim() !== '').length;

    // ----- Submit -----
    const handleSave = () => {
        let payload: any[] = [];

        if (mode === 'master') {
            const selectedMasterIds = Object.keys(masterSelections).filter(id => masterSelections[id].jumlah.trim() !== '');
            payload = selectedMasterIds.map(id => {
                const mst = materialMasterRecords.find(m => m.id === id);
                return {
                    site_id: siteId,
                    material_master_id: id,
                    source_master: true,
                    // Copy snapshot from master
                    nama_material: mst?.nama_material,
                    spesifikasi: mst?.spesifikasi || null,
                    satuan: mst?.satuan || null,
                    harga_satuan: mst?.harga_satuan || null,
                    // User inputs
                    jumlah: parseFloat(masterSelections[id].jumlah) || 0,
                    keterangan: masterSelections[id].catatan || null,

                    status: globalStatus,
                    added_by: currentUser?.id,
                    added_at: new Date().toISOString()
                };
            });
        } else {
            const validItems = items.filter(i => i.nama_material.trim() !== '' && i.jumlah.toString().trim() !== '');
            payload = validItems.map(item => ({
                site_id: siteId,
                source_master: false, // Ad-hoc entry
                nama_material: item.nama_material.trim(),
                spesifikasi: item.spesifikasi.trim() || null,
                jumlah: parseFloat(item.jumlah) || 0,
                satuan: item.satuan.trim() || null,
                status: globalStatus,
                keterangan: item.keterangan.trim() || null,
                source: mode,
                source_file_name: supportingFile?.name || null,
                added_by: currentUser?.id,
                added_at: new Date().toISOString()
            }));
        }

        onSubmit(payload);
    };

    // const formatCurrency = (val: number | null) => {
    //     if (!val) return '—';
    //     return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
    // };

    if (!isOpen) return null;

    const isOcrPending = mode === 'ocr' && items.length === 0 && !isScanning;
    const validCount = mode === 'master' ? validMasterCount : validManualItemsCount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Tambah Material — {siteId}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Toggle */}
                <div className="flex border-b border-slate-200 px-6 pt-4 bg-white overflow-x-auto custom-scrollbar">
                    <button
                        onClick={() => setMode('master')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-colors whitespace-nowrap",
                            mode === 'master' ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        )}
                    >
                        <PackageSearch className="w-4 h-4" /> Dari Master (Rekomendasi)
                    </button>
                    <button
                        onClick={() => setMode('ocr')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap",
                            mode === 'ocr' ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        )}
                    >
                        <Camera className="w-4 h-4" /> Scan OCR
                    </button>
                    <button
                        onClick={() => setMode('manual')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap",
                            mode === 'manual' ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        )}
                    >
                        <Edit3 className="w-4 h-4" /> Input Manual
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">

                    {/* --- MASTER MODE --- */}
                    {mode === 'master' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="relative flex-1 max-w-sm">
                                    <Command className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Cari material di master..."
                                        value={masterSearch}
                                        onChange={(e) => setMasterSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 shadow-sm"
                                    />
                                </div>
                                <div className="text-sm font-medium text-slate-500">
                                    {Object.keys(masterSelections).length} Terpilih
                                </div>
                            </div>

                            <div className="bg-white border text-sm border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="p-3 w-10 text-center"><CheckSquare className="w-4 h-4 text-slate-400 inline-block" /></th>
                                            <th className="p-3 font-semibold text-slate-600">Nama Material / Spesifikasi</th>
                                            <th className="p-3 font-semibold text-slate-600">Kode & Satuan</th>
                                            <th className="p-3 font-semibold text-slate-600 whitespace-nowrap">Input Jumlah</th>
                                            <th className="p-3 font-semibold text-slate-600 w-1/4">Catatan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {availableMasterRecords.map(item => {
                                            const isSelected = !!masterSelections[item.id];
                                            return (
                                                <tr key={item.id} className={clsx("transition-colors", isSelected ? "bg-blue-50/50" : "hover:bg-slate-50", !isSelected && Object.keys(masterSelections).length > 0 && "opacity-60")}>
                                                    <td className="p-3 text-center align-middle" onClick={() => handleToggleMasterItem(item.id)}>
                                                        <div className="cursor-pointer flex justify-center">
                                                            {isSelected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-slate-300 hover:text-blue-400" />}
                                                        </div>
                                                    </td>
                                                    <td className="p-3" onClick={!isSelected ? () => handleToggleMasterItem(item.id) : undefined}>
                                                        <p className="font-bold text-slate-800">{item.nama_material}</p>
                                                        {item.spesifikasi && <p className="text-xs text-slate-500 mt-1">{item.spesifikasi}</p>}
                                                    </td>
                                                    <td className="p-3">
                                                        <p className="font-mono text-xs text-slate-500 mb-1">{item.kode_material || '—'}</p>
                                                        <p className="font-medium text-slate-700 bg-slate-100 inline-block px-1.5 py-0.5 rounded border border-slate-200">{item.satuan}</p>
                                                    </td>
                                                    <td className="p-3 align-middle">
                                                        {isSelected ? (
                                                            <div className="relative w-24">
                                                                <input
                                                                    type="number"
                                                                    className="w-full pl-3 pr-8 py-1.5 border-2 border-blue-400 bg-white rounded font-bold text-blue-700 outline-none"
                                                                    min="0"
                                                                    autoFocus
                                                                    placeholder="0"
                                                                    value={masterSelections[item.id].jumlah}
                                                                    onChange={e => handleUpdateMasterSelection(item.id, 'jumlah', e.target.value)}
                                                                />
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">{item.satuan}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 italic">Pilih dulu</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 align-middle">
                                                        {isSelected && (
                                                            <input
                                                                type="text"
                                                                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white outline-none focus:border-blue-500 text-slate-700 placeholder:text-slate-300"
                                                                placeholder="Catatan opsional..."
                                                                value={masterSelections[item.id].catatan}
                                                                onChange={e => handleUpdateMasterSelection(item.id, 'catatan', e.target.value)}
                                                            />
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {availableMasterRecords.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-slate-500">
                                                    Tidak ada material master yang cocok.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="text-center mt-2">
                                <p className="text-sm text-slate-500">
                                    Tidak menemukan material yang dicari? <br />
                                    Anda bisa <NavLink to="/materials" onClick={onClose} className="text-blue-600 font-bold hover:underline">menambahkan ke Material Master</NavLink> terlebih dahulu,
                                    atau gunakan Input Manual untuk barang ad-hoc.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* --- OCR MODE --- */}
                    {mode === 'ocr' && isOcrPending && (
                        <div
                            className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-12 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer"
                            onClick={() => ocrInputRef.current?.click()}
                            onDrop={(e) => { e.preventDefault(); handleFileUploadChange(e as any); }}
                            onDragOver={e => e.preventDefault()}
                        >
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                <Camera className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Upload foto atau dokumen material</h3>
                            <p className="text-slate-500 mb-6 max-w-sm">Foto nota, delivery order, DO, packing list, atau label material</p>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm">Browse Files</span>
                                <span className="text-slate-500">atau drag & drop</span>
                            </div>
                            <input type="file" className="hidden" ref={ocrInputRef} onChange={handleFileUploadChange} />
                        </div>
                    )}

                    {mode === 'ocr' && isScanning && (
                        <div className="bg-white border text-center border-slate-200 rounded-lg p-16 flex flex-col items-center justify-center">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                            <h3 className="text-lg font-medium text-slate-700">Membaca dokumen... 🔍</h3>
                            <p className="text-slate-500 text-sm mt-2">Sedang mengekstrak data material, harap tunggu sebentar.</p>
                        </div>
                    )}

                    {/* --- MANUAL & OCR PREDITED TABLE --- */}
                    {(mode === 'manual' || (mode === 'ocr' && !isScanning && items.length > 0)) && (
                        <div className="space-y-4">
                            {mode === 'ocr' && scanConfidence !== null && (
                                <div className="mb-4">
                                    <h3 className="font-semibold text-slate-700 mb-2">Hasil scan — periksa dan edit sebelum menyimpan:</h3>
                                    {scanConfidence < 0.7 && (
                                        <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200 text-sm">
                                            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
                                            <span>
                                                <strong>Perhatian:</strong> Hasil scan mungkin kurang akurat (Confidence Score: {(scanConfidence * 100).toFixed(0)}%).
                                                Mohon periksa kembali kesesuaian data di bawah ini.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="p-3 font-semibold text-slate-600">Nama Material (Ad-hoc) <span className="text-red-500">*</span></th>
                                                <th className="p-3 font-semibold text-slate-600">Spesifikasi</th>
                                                <th className="p-3 font-semibold text-slate-600 w-24">Qty <span className="text-red-500">*</span></th>
                                                <th className="p-3 font-semibold text-slate-600 w-32">Satuan</th>
                                                <th className="p-3 font-semibold text-slate-600">Keterangan</th>
                                                <th className="p-3 font-semibold text-slate-600 w-12 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {items.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50">
                                                    <td className="p-2">
                                                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500 bg-white shadow-sm" placeholder="Nama..." value={item.nama_material} onChange={e => handleChangeItem(item.id, 'nama_material', e.target.value)} />
                                                    </td>
                                                    <td className="p-2">
                                                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500 bg-white shadow-sm" placeholder="Opsional" value={item.spesifikasi} onChange={e => handleChangeItem(item.id, 'spesifikasi', e.target.value)} />
                                                    </td>
                                                    <td className="p-2">
                                                        <input type="number" min="0" step="any" className="w-full px-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500 bg-white shadow-sm appearance-none font-medium" placeholder="0" value={item.jumlah} onChange={e => handleChangeItem(item.id, 'jumlah', e.target.value)} />
                                                    </td>
                                                    <td className="p-2">
                                                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500 bg-white shadow-sm" placeholder="pcs, m, dll" value={item.satuan} onChange={e => handleChangeItem(item.id, 'satuan', e.target.value)} />
                                                    </td>
                                                    <td className="p-2">
                                                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded outline-none focus:border-blue-500 bg-white shadow-sm" placeholder="Catatan..." value={item.keterangan} onChange={e => handleChangeItem(item.id, 'keterangan', e.target.value)} />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button onClick={() => handleRemoveItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {items.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="p-4 text-center text-slate-500 bg-slate-50 italic">Belum ada material.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-3 bg-slate-50 border-t border-slate-200">
                                    <button onClick={handleAddItem} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded text-slate-600 bg-white hover:bg-slate-50 hover:text-blue-600 text-sm font-bold">
                                        <Plus className="w-4 h-4" /> Tambah baris ad-hoc {items.length > 0 ? 'lainnya' : 'baru'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Shared Bottom Section */}
                <div className="bg-white border-t border-slate-200 p-6 flex flex-col md:flex-row gap-6 shrink-0 relative z-10">
                    <div className="flex-1 space-y-3">
                        <label className="block text-sm font-bold text-slate-700">Lampirkan foto/dokumen (Opsional)</label>
                        <div className="flex items-center gap-3">
                            <button
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-sm text-slate-700 font-bold flex items-center gap-2 transition-colors"
                                onClick={() => supportingInputRef.current?.click()}
                            >
                                <ImageIcon className="w-4 h-4" /> Upload Dokumen Pendukung
                            </button>
                            <input type="file" className="hidden" ref={supportingInputRef} onChange={handleSupportingFileUpload} />
                            {supportingFile && (
                                <div className="flex items-center gap-2 max-w-[200px] bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 text-sm">
                                    <span className="truncate">{supportingFile.name}</span>
                                    <button onClick={() => setSupportingFile(null)} className="text-blue-400 hover:text-blue-600 shrink-0">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                            {mode === 'ocr' && sourceFile
                                ? "Dokumen OCR di-attach secara otomatis."
                                : "Lampirkan bukti berupa foto, DO, dll."}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end gap-3 rounded-b-xl shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={validCount === 0}
                        className={clsx(
                            "px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-all",
                            validCount === 0 ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/30"
                        )}
                    >
                        Simpan Material ({validCount} item)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMaterialModal;
