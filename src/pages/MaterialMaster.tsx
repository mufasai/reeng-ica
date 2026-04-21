import React, { useState, useMemo } from 'react';
import { Search, Plus, Upload, Camera, Edit2, Archive, Activity, Info, Link as LinkIcon, FileText, ArrowDown, ArrowUp, CheckCircle2 } from 'lucide-react';
import { materialMasterRecords, siteMaterials, materialTransactions } from '../data/mockData';
import clsx from 'clsx';
// Import Modals (we will create these next)
import MaterialMasterModals from '../components/modals/MaterialMasterModals';
import MultiSheetExcelModal from '../components/modals/MultiSheetExcelModal';

const MaterialMasterPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Semua');
    const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Nonaktif'>('Semua');

    const [activeTab, setActiveTab] = useState<'master' | 'ledger'>('master');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'manual' | 'ocr'>('manual');
    const [isMultiSheetOpen, setIsMultiSheetOpen] = useState(false);

    // Ledger state
    const [ledgerSearch, setLedgerSearch] = useState('');

    const handleOpenModal = (mode: 'manual' | 'excel' | 'ocr') => {
        if (mode === 'excel') {
            setIsMultiSheetOpen(true);
        } else {
            setModalMode(mode);
            setIsModalOpen(true);
        }
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

    const filteredLedger = useMemo(() => {
        return materialTransactions.filter(t => 
            t.material_nama?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
            t.imported_from?.toLowerCase().includes(ledgerSearch.toLowerCase())
        ).sort((a,b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }, [ledgerSearch]);

    // Compute aggregated view for ledger Summary
    const ledgerSummary = useMemo(() => {
        let totalIn = 0;
        let totalOut = 0;
        filteredLedger.forEach(t => {
            if (t.direction === 'IN') totalIn += t.quantity;
            else if (t.direction === 'OUT') totalOut += t.quantity;
        });
        return { totalIn, totalOut, netBalance: totalIn - totalOut };
    }, [filteredLedger]);

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

            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 mb-6">
                <button
                    onClick={() => setActiveTab('master')}
                    className={clsx("px-5 py-3 font-semibold text-sm border-b-2 transition-colors", activeTab === 'master' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}
                >
                    Master Data
                </button>
                <button
                    onClick={() => setActiveTab('ledger')}
                    className={clsx("px-5 py-3 font-semibold text-sm border-b-2 transition-colors", activeTab === 'ledger' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}
                >
                    Riwayat Stok (Ledger)
                </button>
            </div>

            {activeTab === 'master' && (
                <div className="animate-in slide-in-from-left-4 duration-300">
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
            </div>
            )}

            {activeTab === 'ledger' && (
                <div className="animate-in slide-in-from-right-4 duration-300">
                    {/* Ledger Summary Strip */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6 flex flex-col md:flex-row gap-6 justify-around items-center divide-x divide-slate-100">
                        <div className="flex flex-col items-center px-6">
                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold mb-1 border border-emerald-100">
                                <ArrowDown className="w-3 h-3" /> Total Stock In
                            </div>
                            <div className="text-2xl font-black text-slate-800">{ledgerSummary.totalIn} <span className="text-sm font-semibold text-slate-500">units</span></div>
                        </div>
                        <div className="flex flex-col items-center px-6">
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-bold mb-1 border border-red-100">
                                <ArrowUp className="w-3 h-3" /> Total Stock Out
                            </div>
                            <div className="text-2xl font-black text-slate-800">{ledgerSummary.totalOut} <span className="text-sm font-semibold text-slate-500">units</span></div>
                        </div>
                        <div className="flex flex-col items-center px-6">
                            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-bold mb-1 border border-blue-100">
                                <Activity className="w-3 h-3" /> Net Balance
                            </div>
                            <div className="text-2xl font-black text-slate-800">{ledgerSummary.netBalance} <span className="text-sm font-semibold text-slate-500">units</span></div>
                        </div>
                    </div>

                    {/* Ledger Filters */}
                    <div className="relative max-w-md mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Cari transaksi material..." 
                            value={ledgerSearch}
                            onChange={(e) => setLedgerSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700"
                        />
                    </div>

                    {/* Ledger Table */}
                    <div className="bg-white border text-sm border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-semibold text-slate-600">Terdaftar</th>
                                        <th className="p-4 font-semibold text-slate-600">Material</th>
                                        <th className="p-4 font-semibold text-slate-600 text-center">Tipe</th>
                                        <th className="p-4 font-semibold text-slate-600 text-right">Quantity</th>
                                        <th className="p-4 font-semibold text-slate-600">Source Dokumen</th>
                                        <th className="p-4 font-semibold text-slate-600">Vendor / Pengirim</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLedger.map((trx) => (
                                        <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 text-slate-500 whitespace-nowrap">
                                                {trx.created_at ? new Date(trx.created_at).toLocaleDateString('id-ID', {day:'numeric',month:'short'}) : '-'}
                                                <div className="text-xs">{trx.created_at ? new Date(trx.created_at).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) : ''}</div>
                                            </td>
                                            <td className="p-4">
                                                <p className="font-bold text-slate-800">{trx.material_nama}</p>
                                                {trx.material_master_id ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 mt-1 uppercase tracking-wide font-bold">
                                                        <CheckCircle2 className="w-3 h-3" /> Master Link
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 mt-1 uppercase tracking-wide font-bold">
                                                        Unlinked
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {trx.direction === 'IN' ? (
                                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-black tracking-wider border border-emerald-200">IN</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-black tracking-wider border border-red-200">OUT</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={clsx("font-bold text-lg", trx.direction === 'IN' ? "text-emerald-600" : "text-red-600")}>
                                                    {trx.direction === 'IN' ? '+' : '-'}{trx.quantity}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-600 text-xs">
                                                <div className="font-medium">{trx.delivery_note_no || trx.po_number || '-'}</div>
                                                <div className="text-slate-400 mt-0.5">Date: {trx.delivery_date || '-'}</div>
                                            </td>
                                            <td className="p-4 text-slate-600 text-sm">
                                                <div className="font-medium text-slate-800">{trx.vendor_pengirim || '-'}</div>
                                                <div className="text-slate-500 text-xs">Sender: {trx.sender || '-'}</div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLedger.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <FileText className="w-8 h-8 text-slate-300 mb-2" />
                                                    <p>Belum ada riwayat pergerakan stok.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals Placeholder */}
            {isModalOpen && (
                <MaterialMasterModals 
                    mode={modalMode} 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                />
            )}
            {isMultiSheetOpen && (
                <MultiSheetExcelModal
                    isOpen={isMultiSheetOpen}
                    onClose={() => setIsMultiSheetOpen(false)}
                    onImportComplete={(summary) => {
                        console.log('Processed Multi-Sheet from Material:', summary);
                        setIsMultiSheetOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default MaterialMasterPage;
