import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet } from 'lucide-react';
import type { WorkOrder, ProjectType } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

interface AddWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (wo: WorkOrder) => void;
}

const AddWorkOrderModal: React.FC<AddWorkOrderModalProps> = ({ isOpen, onClose, onCreate }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  const [formData, setFormData] = useState({
    woNumber: '',
    tanggalWo: '',
    pemberiKerja: '',
    tipe: 'FILTER' as ProjectType,
    scopeOfWork: '',
    lokasi: '',
    targetDate: '',
    nilaiWo: '',
    nomorKontrak: '',
  });

  const [activeTab, setActiveTab] = useState<'manual' | 'excel'>('manual');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newWO: WorkOrder = {
      id: `wo-${Date.now()}`,
      woNumber: formData.woNumber,
      tanggalWo: formData.tanggalWo,
      pemberiKerja: formData.pemberiKerja,
      tipe: formData.tipe,
      scopeOfWork: formData.scopeOfWork,
      lokasi: formData.lokasi,
      targetDate: formData.targetDate,
      nilaiWo: Number(formData.nilaiWo),
      nomorKontrak: formData.nomorKontrak,
      status: 'Unassigned',
      createdBy: currentUser?.id || '',
    };
    onCreate(newWO);
    onClose();
  };

  const handleExcelUpload = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Simulasi: Data Excel berhasi di-import.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Input WO Baru</h2>
            <p className="text-sm text-slate-500 mt-0.5">Entry point baru ke sistem reengineering</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 shrink-0">
            <button 
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'manual' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                onClick={() => setActiveTab('manual')}
            >
                Input Manual
            </button>
            <button 
                className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'excel' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                onClick={() => setActiveTab('excel')}
            >
                <FileSpreadsheet className="w-4 h-4" />
                Import Excel
            </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'manual' ? (
              <form id="add-wo-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">WO Number</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. WO-2024-001"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      value={formData.woNumber}
                      onChange={e => setFormData({...formData, woNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal WO</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      value={formData.tanggalWo}
                      onChange={e => setFormData({...formData, tanggalWo: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pemberi Kerja / Mitra</label>
                    <input 
                        type="text" 
                        required
                        placeholder="e.g. PT Telkom Indonesia"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        value={formData.pemberiKerja}
                        onChange={e => setFormData({...formData, pemberiKerja: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipe WO</label>
                    <select 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      value={formData.tipe}
                      onChange={e => setFormData({...formData, tipe: e.target.value as ProjectType})}
                    >
                      <option value="FILTER">FILTER</option>
                      <option value="COMBAT">COMBAT</option>
                      <option value="BLACKSITE">BLACKSITE</option>
                      <option value="L2H">L2H</option>
                      <option value="RESCOPING">RESCOPING</option>
                    </select>
                  </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Kontrak</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. TELKOM-CTR-2024"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      value={formData.nomorKontrak}
                      onChange={e => setFormData({...formData, nomorKontrak: e.target.value})}
                    />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Scope of Work</label>
                  <textarea 
                    required
                    placeholder="Describe what work is needed..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    value={formData.scopeOfWork}
                    onChange={e => setFormData({...formData, scopeOfWork: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Jakarta Selatan"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      value={formData.lokasi}
                      onChange={e => setFormData({...formData, lokasi: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      value={formData.targetDate}
                      onChange={e => setFormData({...formData, targetDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nilai WO / Total Budget (Rp)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium text-sm">Rp</span>
                    <input 
                      type="number" 
                      required
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      value={formData.nilaiWo}
                      onChange={e => setFormData({...formData, nilaiWo: e.target.value})}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">This becomes the maximum budget reference for the site.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dokumen WO</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.doc,.docx" />
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-slate-400" />
                      <div className="flex text-sm text-slate-600 justify-center">
                        <span className="relative rounded-md font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          Upload a file
                        </span>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-slate-500">PDF up to 10MB</p>
                    </div>
                  </div>
                </div>
              </form>
          ) : (
              <form id="excel-form" onSubmit={handleExcelUpload} className="space-y-6 py-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-4">
                        <div className="mt-1">
                            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-blue-900">Format Import Excel</h4>
                            <p className="text-xs text-blue-700 mt-1 mb-3">Pastikan file Excel Anda menggunakan header kolom berikut sesuai urutan:</p>
                            <code className="text-xs bg-white px-2 py-1 border border-blue-200 rounded text-blue-800 break-all select-all">
                                WO_Number | Pemberi_Kerja | Tipe | Lokasi | Target_Date | Nilai_WO | Nomor_Kontrak | Scope_of_Work
                            </code>
                            <button type="button" className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-800 underline">
                                Download Template XlSX
                            </button>
                        </div>
                    </div>
                    
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".xlsx,.xls,.csv" />
                        <div className="space-y-1 text-center">
                            <Upload className="mx-auto h-12 w-12 text-slate-400" />
                            <div className="flex text-sm text-slate-600 justify-center">
                                <span className="relative rounded-md font-medium text-emerald-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500">
                                Pilih File Excel
                                </span>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-slate-500">XLS, XLSX up to 20MB</p>
                        </div>
                    </div>
              </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-xl">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button 
            type="submit"
            form={activeTab === 'manual' ? 'add-wo-form' : 'excel-form'}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            {activeTab === 'manual' ? 'Simpan Work Order' : 'Proses Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddWorkOrderModal;
