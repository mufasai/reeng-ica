import React, { useState, useMemo } from 'react';
import { Search, Plus, Upload, Camera, Edit2, Archive, Activity, Info, Link as LinkIcon, FileText, CheckCircle2, ListPlus } from 'lucide-react';
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
    const [ledgerTypeFilter, setLedgerTypeFilter] = useState('Semua');
    const [ledgerDirectionFilter, setLedgerDirectionFilter] = useState('Semua');
    const [ledgerStartDate, setLedgerStartDate] = useState('');
    const [ledgerEndDate, setLedgerEndDate] = useState('');

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

    const ledgerTypes = useMemo(() => {
        const types = new Set(materialTransactions.map(t => t.material_type).filter(Boolean) as string[]);
        return ['Semua', ...Array.from(types)];
    }, []);

    const filteredLedger = useMemo(() => {
        return materialTransactions.filter(t => {
            const matchSearch = t.material_nama?.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
                                t.delivery_note_no?.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
                                t.po_number?.toLowerCase().includes(ledgerSearch.toLowerCase());
            
            const matchType = ledgerTypeFilter === 'Semua' || t.material_type === ledgerTypeFilter;
            const matchDir = ledgerDirectionFilter === 'Semua' || t.direction === ledgerDirectionFilter;
            
            let matchDate = true;
            if (ledgerStartDate || ledgerEndDate) {
                const dateVal = t.delivery_date || t.created_at;
                if (dateVal) {
                    const date = new Date(dateVal);
                    if (ledgerStartDate) matchDate = matchDate && date >= new Date(ledgerStartDate);
                    if (ledgerEndDate) matchDate = matchDate && date <= new Date(ledgerEndDate);
                }
            }
            
            return matchSearch && matchType && matchDir && matchDate;
        }).sort((a,b) => {
            const dateA = a.delivery_date || a.created_at || '';
            const dateB = b.delivery_date || b.created_at || '';
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
    }, [ledgerSearch, ledgerTypeFilter, ledgerDirectionFilter, ledgerStartDate, ledgerEndDate]);

    // Compute aggregated stock per material for summary cards
    const ledgerSummaryCards = useMemo(() => {
        const groups: Record<string, { totalIn: number, totalOut: number, stock: number }> = {};
        materialTransactions.forEach(t => {
            if (!groups[t.material_nama]) {
                groups[t.material_nama] = { totalIn: 0, totalOut: 0, stock: 0 };
            }
            if (t.direction === 'IN') {
                groups[t.material_nama].totalIn += t.quantity;
                groups[t.material_nama].stock += t.quantity;
            } else {
                groups[t.material_nama].totalOut += t.quantity;
                groups[t.material_nama].stock -= t.quantity;
            }
        });
        return Object.entries(groups).map(([name, data]) => ({ name, ...data })).sort((a,b) => b.stock - a.stock);
    }, []);

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
                    {/* Ledger Summary Cards */}
                    <div className="flex gap-4 overflow-x-auto pb-4 mb-6 scrollbar-hide snap-x">
                        {ledgerSummaryCards.map(card => (
                            <div key={card.name} className="min-w-[280px] bg-white rounded-xl shadow-sm border border-slate-200 p-5 snap-center flex flex-col justify-between hover:shadow-md transition-shadow">
                                <h3 className="font-bold text-slate-800 text-lg mb-4 truncate" title={card.name}>{card.name}</h3>
                                <div className="mb-4">
                                    <div className="text-sm text-slate-500 font-medium mb-1">Stok</div>
                                    <div className="text-3xl font-black text-blue-700">{card.stock} <span className="text-sm font-semibold text-slate-400">unit</span></div>
                                </div>
                                <div className="flex justify-between items-center text-sm font-semibold pt-3 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5 text-emerald-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> IN: {card.totalIn}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-red-600">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> OUT: {card.totalOut}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {ledgerSummaryCards.length === 0 && (
                            <div className="w-full text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                                Belum ada data stok material.
                            </div>
                        )}
                    </div>

                    {/* Ledger Filters */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                        <div className="relative flex-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Pencarian</label>
                            <Search className="absolute left-3 top-[34px] -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Cari material, PO, Surat Jalan..." 
                                value={ledgerSearch}
                                onChange={(e) => setLedgerSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium text-slate-700"
                            />
                        </div>
                        
                        <div className="flex gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Type</label>
                                <select 
                                    value={ledgerTypeFilter}
                                    onChange={(e) => setLedgerTypeFilter(e.target.value)}
                                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium w-[140px]"
                                >
                                    {ledgerTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">IN/OUT</label>
                                <select 
                                    value={ledgerDirectionFilter}
                                    onChange={(e) => setLedgerDirectionFilter(e.target.value)}
                                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium w-[120px]"
                                >
                                    <option value="Semua">Semua</option>
                                    <option value="IN">IN</option>
                                    <option value="OUT">OUT</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Start Date</label>
                                    <input 
                                        type="date" 
                                        value={ledgerStartDate}
                                        onChange={(e) => setLedgerStartDate(e.target.value)}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
                                    />
                                </div>
                                <div className="mt-6 text-slate-400 font-medium">-</div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">End Date</label>
                                    <input 
                                        type="date" 
                                        value={ledgerEndDate}
                                        onChange={(e) => setLedgerEndDate(e.target.value)}
                                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
                                    />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button 
                                    onClick={() => handleOpenModal('excel')}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-sm shadow-sm shadow-emerald-600/20 whitespace-nowrap h-[38px]"
                                >
                                    <ListPlus className="w-4 h-4" /> Import Excel Inventory
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Ledger Table */}
                    <div className="bg-white border text-sm border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 font-semibold text-slate-600">No</th>
                                        <th className="p-4 font-semibold text-slate-600 text-center">Type</th>
                                        <th className="p-4 font-semibold text-slate-600">Material</th>
                                        <th className="p-4 font-semibold text-slate-600 text-center">IN/OUT</th>
                                        <th className="p-4 font-semibold text-slate-600 text-right">Qty</th>
                                        <th className="p-4 font-semibold text-slate-600">Tanggal</th>
                                        <th className="p-4 font-semibold text-slate-600">No Surat Jalan</th>
                                        <th className="p-4 font-semibold text-slate-600">PO</th>
                                        <th className="p-4 font-semibold text-slate-600">Vendor</th>
                                        <th className="p-4 font-semibold text-slate-600">Sender</th>
                                        <th className="p-4 font-semibold text-slate-600">Receiver</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredLedger.map((trx, i) => (
                                        <tr key={trx.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 text-slate-500 font-medium">
                                                {i + 1}
                                            </td>
                                            <td className="p-4 text-center">
                                                {trx.material_type ? (
                                                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold uppercase tracking-wider">{trx.material_type}</span>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <p className="font-bold text-slate-800">{trx.material_nama}</p>
                                                {trx.material_master_id && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 mt-1 uppercase tracking-wide font-bold">
                                                        <CheckCircle2 className="w-3 h-3" /> Master Link
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
                                            <td className="p-4 text-slate-600 whitespace-nowrap">
                                                {trx.delivery_date || (trx.created_at ? new Date(trx.created_at).toISOString().split('T')[0] : '-')}
                                            </td>
                                            <td className="p-4 text-slate-600 font-medium whitespace-nowrap">
                                                {trx.delivery_note_no || '-'}
                                            </td>
                                            <td className="p-4 text-slate-600 font-medium whitespace-nowrap">
                                                {trx.po_number || '-'}
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                <div className="font-medium text-slate-800">{trx.vendor_pengirim || '-'}</div>
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                {trx.sender || '-'}
                                            </td>
                                            <td className="p-4 text-slate-600">
                                                {trx.receiver || '-'}
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
                    pageContext="materials"
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
