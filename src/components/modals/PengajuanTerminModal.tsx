import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle2, Send } from 'lucide-react';
import { type SiteFile } from '../../data/mockData';
import { clsx as _clsx } from "clsx";

interface PengajuanTerminModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  siteName?: string;
  terminKey: 'T1' | 'T2a' | 'T2b' | 'T2c' | 'T3' | 'T4';
  nominal: number;
  prefillDocs?: SiteFile[];
  onSubmit: (payload: any) => void;
}

const PengajuanTerminModal = ({ isOpen, onClose, siteId, siteName, terminKey, nominal, prefillDocs = [], onSubmit }: PengajuanTerminModalProps) => {
  const [formData, setFormData] = useState({
    nominal: nominal.toString(),
    note: '',
    rekening: ''
  });
  
  const [files, setFiles] = useState<File[]>([]);
  const [existingDocs, setExistingDocs] = useState<SiteFile[]>(prefillDocs);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ nominal: nominal.toString(), note: '', rekening: '' });
      setFiles([]);
      setExistingDocs(prefillDocs);
    }
  }, [isOpen, nominal, prefillDocs]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingDoc = (id: string) => {
    setExistingDocs(prev => prev.filter(d => d.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      terminKey,
      nominal: Number(formData.nominal),
      note: formData.note,
      rekening: formData.rekening,
      files,
      existingDocIds: existingDocs.map(d => d.id)
    });
  };

  const renderBanner = () => {
    const banners = {
      'T1': '✓ Permit sudah ready. T1 dapat diajukan.',
      'T2a': '✓ CI/CO selesai. T2a (15% dari total) dapat diajukan.',
      'T2b': '✓ RFS selesai. T2b (25% dari total) dapat diajukan.',
      'T2c': '✓ Dokumen pekerjaan sudah disubmit. T2c (10% dari total) dapat diajukan.',
      'T3': '✓ BAST selesai. T3 dapat diajukan.',
      'T4': '✓ Invoice sudah dikirim. T4 dapat diajukan.'
    };
    return banners[terminKey];
  };

  const renderRequirements = () => {
    switch(terminKey) {
        case 'T1': return (
            <ul className="text-sm space-y-1 mt-2 text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> TPAS Approved</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> TP Approved</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Permit document uploaded</li>
            </ul>
        );
        case 'T2a': return (
            <ul className="text-sm space-y-1 mt-2 text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Check-in: [Selesai]</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Check-out: [Selesai]</li>
            </ul>
        );
        case 'T2b': return (
            <ul className="text-sm space-y-1 mt-2 text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> RFS done</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> RFS document uploaded</li>
            </ul>
        );
        case 'T2c': return (
            <ul className="text-sm space-y-1 mt-2 text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Dokumen submitted</li>
            </ul>
        );
        case 'T3': return (
            <ul className="text-sm space-y-1 mt-2 text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> BAST document uploaded</li>
            </ul>
        );
        case 'T4': return (
            <ul className="text-sm space-y-1 mt-2 text-slate-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Nomor Invoice: INV-{siteId}-01</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Invoice uploaded</li>
            </ul>
        );
        default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[600px] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Ajukan {terminKey} — {siteId}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {siteName && <span>{siteName} &nbsp;•&nbsp; </span>}
              {terminKey === 'T1' ? 'Permit Ready ✓' :
               terminKey === 'T2a' ? 'CI/CO Selesai ✓' :
               terminKey === 'T2b' ? 'RFS Selesai ✓' :
               terminKey === 'T2c' ? 'Dokumen Submit ✓' :
               terminKey === 'T3' ? 'BAST Selesai ✓' : 'Invoice ✓'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
            {/* Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100 rounded-bl-full opacity-50 -mr-4 -mt-4"></div>
                <p className="text-emerald-800 font-medium relative z-10 flex items-start gap-2">
                   {renderBanner()}
                </p>
                <div className="mt-3 bg-white/60 p-3 rounded border border-emerald-100">
                    <p className="text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Syarat Terpenuhi</p>
                    {renderRequirements()}
                </div>
            </div>

            <form id="pengajuanTerminForm" onSubmit={handleSubmit} className="space-y-5">
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nominal Pengajuan <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
                    <input 
                      type="number" 
                      required
                      value={formData.nominal}
                      onChange={e => setFormData({...formData, nominal: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none transition-shadow font-mono text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {terminKey === 'T1' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nomor Rekening Tujuan</label>
                      <input 
                        type="text" 
                        value={formData.rekening}
                        onChange={e => setFormData({...formData, rekening: e.target.value})}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                        placeholder="Contoh: BCA 1234567890 an. PT Mitra"
                      />
                    </div>
                )}

                {terminKey === 'T4' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nomor Invoice</label>
                      <input 
                        type="text" 
                        readOnly
                        value={`INV-${siteId}-01`}
                        className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg outline-none text-slate-500 font-mono"
                      />
                    </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Catatan Pengajuan (Opsional)</label>
                  <textarea 
                    rows={3}
                    value={formData.note}
                    onChange={e => setFormData({...formData, note: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none"
                    placeholder="Tambahkan catatan khusus jika diperlukan..."
                  ></textarea>
                </div>

                {/* Document Upload Zone */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                       {terminKey === 'T1' ? 'Upload: permit document, inv proforma, dsb' :
                        terminKey === 'T2a' ? 'Upload Bukti CI/CO' :
                        terminKey === 'T2b' ? 'Upload Bukti RFS' :
                        terminKey === 'T2c' ? 'Upload Dokumen As-Built' :
                        terminKey === 'T3' ? 'Upload BAST' :
                        'Upload Invoice'} <span className="text-red-500">*</span>
                   </label>
                   
                   {/* Pre-filled docs */}
                   {existingDocs.length > 0 && (
                       <div className="mb-3 space-y-2">
                           <p className="text-xs font-semibold text-slate-500 uppercase">Terlampir dari Stage Sebelumnya:</p>
                           {existingDocs.map(doc => (
                               <div key={doc.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                                   <div className="flex items-center gap-2 overflow-hidden">
                                       <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                                       <span className="text-sm font-medium text-slate-700 truncate">{doc.filename}</span>
                                       <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-2 shrink-0">{doc.stage_context}</span>
                                   </div>
                                    <button type="button" onClick={() => removeExistingDoc(doc.id)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-red-500 transition-colors shrink-0">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                               </div>
                           ))}
                       </div>
                   )}

                   {/* Custom Upload field */}
                   <div 
                        className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer group"
                        onClick={() => document.getElementById('termin-doc-upload')?.click()}
                   >
                        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-blue-500 pb-1" />
                        <p className="text-sm font-medium text-slate-700">Klik untuk upload dokumen tambahan</p>
                        <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG (Max. 10MB)</p>
                        <input id="termin-doc-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                   </div>
                   
                   {/* Newly added files */}
                   {files.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {files.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 border border-blue-100 rounded-md">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span className="text-sm font-medium text-blue-800 truncate">{file.name}</span>
                                        <span className="text-xs text-blue-500 shrink-0">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                    </div>
                                    <button type="button" onClick={() => removeFile(idx)} className="p-1 hover:bg-blue-200 rounded-full text-blue-400 hover:text-blue-700 transition-colors shrink-0">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                   )}
                </div>

            </form>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end gap-3 shrink-0">
            <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
            >
                Batal
            </button>
            <button 
                type="submit" 
                form="pengajuanTerminForm"
                disabled={!formData.nominal || Number(formData.nominal) <= 0}
                className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Ajukan {terminKey} <Send className="w-4 h-4" />
            </button>
        </div>

      </div>
    </div>
  );
};

export default PengajuanTerminModal;
