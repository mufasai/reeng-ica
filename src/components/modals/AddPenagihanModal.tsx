import React, { useState } from 'react';
import { X, Upload, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { terminPengajuanRecords } from '../../data/mockData';

interface AddPenagihanModalProps {
  siteId: string;
  onClose: () => void;
}

const PENAGIHAN_TYPES = [
  'T1', 'T2a', 'T2b', 'T2c', 'T3', 'T4',
  'Biaya Perizinan', 'Transportasi', 'Material Tambahan', 'Sewa Alat', 'Lainnya'
];

const AddPenagihanModal = ({ siteId, onClose }: AddPenagihanModalProps) => {
  const { currentUser } = useAuth();
  
  const [tipe, setTipe] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [nominal, setNominal] = useState('');
  const [catatan, setCatatan] = useState('');

  const handleTipeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTipe = e.target.value;
    setTipe(newTipe);
    if (newTipe.startsWith('T')) {
      setDeskripsi(`Pengajuan Termin ${newTipe}`);
    } else {
      setDeskripsi('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipe || !deskripsi || !nominal) return;

    const newPenagihan = {
      id: `tp-new-${Date.now()}`,
      site_id: siteId,
      termin_key: tipe as any,
      deskripsi,
      nominal: Number(nominal),
      status: 'submitted' as const,
      catatan,
      submitted_by: currentUser.name,
      submitted_at: new Date().toISOString(),
      documents: [],
      history: [
        { action: 'submitted', by: currentUser.name, at: new Date().toISOString() }
      ]
    };

    terminPengajuanRecords.unshift(newPenagihan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Tambah Penagihan
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="penagihan-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipe <span className="text-red-500">*</span></label>
              <select 
                required
                value={tipe}
                onChange={handleTipeChange}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="" disabled>Pilih Tipe Pembayaran</option>
                {PENAGIHAN_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi <span className="text-red-500">*</span></label>
              <input 
                type="text"
                required
                value={deskripsi}
                onChange={e => setDeskripsi(e.target.value)}
                placeholder="Deskripsi keperluan pembayaran"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nominal (Rp) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500 text-sm">Rp</span>
                <input 
                  type="number"
                  min="0"
                  required
                  value={nominal}
                  onChange={e => setNominal(e.target.value)}
                  placeholder="0"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Catatan</label>
              <textarea 
                value={catatan}
                onChange={e => setCatatan(e.target.value)}
                rows={3}
                placeholder="Catatan opsional..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dokumen Pendukung</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Klik atau drag file kesini</p>
                <p className="text-xs text-slate-400 mt-1">Invoice, Kwitansi (PDF/JPG max 5MB)</p>
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            Batal
          </button>
          <button 
            type="submit"
            form="penagihan-form"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
          >
            Ajukan Pembayaran <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddPenagihanModal;
