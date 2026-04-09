import React, { useState, useMemo } from 'react';
import { Search, Plus, Upload, Camera, Edit2, Archive, Activity, Info, Link as LinkIcon } from 'lucide-react';
import { materialMasterRecords, type MaterialMaster, siteMaterials } from '../data/mockData';
import clsx from 'clsx';
// Import Modals (we will create these next)
import MaterialMasterModals from '../components/modals/MaterialMasterModals';

const MaterialMasterPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Semua');
    const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Nonaktif'>('Semua');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'manual' | 'excel' | 'ocr'>('manual');

    const handleOpenModal = (mode: 'manual' | 'excel' | 'ocr') => {
        setModalMode(mode);
        setIsModalOpen(true);
    };

    // Calculate usage
    const getUsageCount = (materialId: string) => {
        return siteMaterials.filter(sm => sm.material_master_id === materialId).length;
    };

    // Derived states
    const categories = useMemo(() => {
        const cats = new Set(materialMasterRecords.map(m => m.kategori).filter(Boolean) as string[]);
        return ['Semua', ...Array.from(cats)];
    }, []);

    const filteredRecords = useMemo(() => {
        return materialMasterRecords.filter(m => {
            const matchesSearch = (m.nama_material.toLowerCase().includes(searchQuery.toLowerCase())) || 
                                  (m.kode_material?.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCat = categoryFilter === 'Semua' || m.kategori === categoryFilter;
            const matchesStatus = statusFilter === 'Semua' 
                                  || (statusFilter === 'Aktif' && m.status_aktif) 
                                  || (statusFilter === 'Nonaktif' && !m.status_aktif);
            return matchesSearch && matchesCat && matchesStatus;
        });
    }, [searchQuery, categoryFilter, statusFilter]);

    // Summary Strip calculations
    const sumActive = materialMasterRecords.filter(m => m.status_aktif).length;
    const sumCategories = categories.length - 1; // excluding 'Semua'
    const sumUsedActive = new Set(siteMaterials.map(sm => sm.siteId)).size; // simplified metric 'sites using materials'

    const formatRupiah = (val: number | null) => {
        if (val == null) return '—';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(val);
    };

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Material Master</h1>
                    <p className="text-sm text-slate-500 mt-1">Daftar referensi material standar</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => handleOpenModal('ocr')}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors text-sm shadow-sm"
                    >
                        <Camera className="w-4 h-4" /> Scan OCR
                    </button>
                    <button 
                        onClick={() => handleOpenModal('excel')}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors text-sm shadow-sm"
                    >
                        <Upload className="w-4 h-4" /> Import Excel
                    </button>
                    <button 
                        onClick={() => handleOpenModal('manual')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm shadow-sm shadow-blue-600/20"
                    >
                        <Plus className="w-4 h-4" /> Tambah Manual
                    </button>
                </div>
            </div>

            {/* Summary Strip */}
            <div className="bg-slate-100 rounded-lg p-3 px-5 mb-6 text-sm font-medium text-slate-600 flex items-center justify-center border border-slate-200">
                <span className="text-blue-700 font-bold">{sumActive}</span> <span className="ml-1 mr-3">material aktif</span> •
                <span className="text-blue-700 font-bold ml-3">{sumCategories}</span> <span className="ml-1 mr-3">kategori</span> •
                <span className="text-blue-700 font-bold ml-3">{sumUsedActive}</span> <span className="ml-1">berbagai site aktif sedang digunakan</span>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Cari nama atau kode..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700 placeholder:font-normal"
                    />
                </div>
                
                <div className="flex gap-4 flex-1">
                    <select 
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
                    >
                        {categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        {(['Semua', 'Aktif', 'Nonaktif'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={clsx(
                                    "px-4 py-1 text-sm font-medium rounded-md transition-colors",
                                    statusFilter === s 
                                        ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" 
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border text-sm border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-4 font-semibold text-slate-600 whitespace-nowrap">Kode</th>
                                <th className="p-4 font-semibold text-slate-600">Nama Material</th>
                                <th className="p-4 font-semibold text-slate-600">Kategori</th>
                                <th className="p-4 font-semibold text-slate-600">Spesifikasi</th>
                                <th className="p-4 font-semibold text-slate-600 whitespace-nowrap">Satuan</th>
                                <th className="p-4 font-semibold text-slate-600 whitespace-nowrap text-right">Harga Satuan</th>
                                <th className="p-4 font-semibold text-slate-600 text-center">Digunakan</th>
                                <th className="p-4 font-semibold text-slate-600">Status</th>
                                <th className="p-4 font-semibold text-slate-600 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRecords.map((item) => {
                                const usage = getUsageCount(item.id);
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 whitespace-nowrap">
                                            {item.kode_material ? (
                                                <span className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs select-all">
                                                    {item.kode_material}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 font-medium text-slate-800">
                                            {item.nama_material}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {item.kategori || <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="p-4 text-slate-600">
                                            {item.spesifikasi || <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="p-4 text-slate-600 whitespace-nowrap">
                                            {item.satuan || <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <span className={item.harga_satuan ? "font-mono text-slate-700" : "text-slate-300"}>
                                                {formatRupiah(item.harga_satuan)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button className={clsx(
                                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors",
                                                usage > 0 ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-slate-100 text-slate-500 cursor-default"
                                            )}>
                                                {usage}
                                                {usage > 0 && <LinkIcon className="w-3 h-3" />}
                                            </button>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className={clsx("w-2 h-2 rounded-full", item.status_aktif ? "bg-emerald-500" : "bg-slate-300")} />
                                                <span className={clsx("text-xs font-semibold uppercase tracking-wider", item.status_aktif ? "text-emerald-700" : "text-slate-500")}>
                                                    {item.status_aktif ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <button className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button className="p-1.5 text-slate-400 hover:text-red-600 transition-colors ml-1" title={item.status_aktif ? "Nonaktifkan" : "Aktifkan"}>
                                                {item.status_aktif ? <Archive className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                            
                            {filteredRecords.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Info className="w-8 h-8 text-slate-300 mb-2" />
                                            <p>Tidak ada material yang ditemukan.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals Placeholder */}
            {isModalOpen && (
                <MaterialMasterModals 
                    mode={modalMode} 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                />
            )}
        </div>
    );
};

export default MaterialMasterPage;
