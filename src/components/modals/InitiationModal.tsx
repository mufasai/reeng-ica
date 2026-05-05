import { useState } from 'react';
import { X, AlertTriangle, ArrowRight } from 'lucide-react';
import { type AtpWorkOrder, atpWorkOrders } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

interface InitiationModalProps {
  siteId: string;
  existingWorks: AtpWorkOrder[];
  onClose: () => void;
  onSuccess?: (newWoId: string) => void;
}

const InitiationModal = ({ siteId, existingWorks, onClose, onSuccess }: InitiationModalProps) => {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  
  const [projectType, setProjectType] = useState('');
  const [sector, setSector] = useState<number | ''>('');
  const [atpNumber, setAtpNumber] = useState('');
  const [sowId, setSowId] = useState('');
  const [poNumber, setPoNumber] = useState('');

  // Check for conflicts
  const activeConflict = sector ? existingWorks.find(wo => wo.sector === Number(sector) && wo.status === 'active') : undefined;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectType || !sector || !poNumber) return;

    if (activeConflict) {
      const confirm = window.confirm(`Peringatan: Terdapat pekerjaan aktif (ATP: ${activeConflict.atp_number}) di Sektor ${sector}. Anda yakin ingin memulai pekerjaan baru di sektor ini?`);
      if (!confirm) return;
    }

    const newId = `atp-wo-${Date.now()}`;
    const newWork: AtpWorkOrder = {
      id: newId,
      site_id: siteId,
      atp_number: atpNumber,
      sow_id: sowId,
      po_number: poNumber,
      sector: Number(sector),
      site_sector_key: `${siteId}-S${sector}`,
      project_type: projectType as any,
      stage: 'imported',
      status: 'active',
      initiated_by: currentUser?.id || '',
      initiated_at: new Date().toISOString()
    };

    // One active ATP logic
    atpWorkOrders.forEach(wo => {
        if (wo.site_id === siteId && wo.status === 'active') {
            wo.status = 'historical' as any;
        }
    });

    // Update mock data
    atpWorkOrders.push(newWork);
    
    if (onSuccess) {
      onSuccess(newId);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="font-bold text-slate-800">Mulai Pekerjaan — {siteId}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="initiation-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipe Proyek <span className="text-red-500">*</span></label>
              <select 
                required
                value={projectType}
                onChange={e => setProjectType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="" disabled>Pilih Tipe Proyek</option>
                <option value="FILTER">Filter</option>
                <option value="COMBAT">Combat</option>
                <option value="RESCOPING">Rescoping</option>
                <option value="BLACKSITE">Blacksite</option>
                <option value="L2H">L2H</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sektor <span className="text-red-500">*</span></label>
              <input 
                type="number"
                min="1"
                required
                value={sector}
                onChange={e => setSector(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 1"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Lihat sektor tersedia: S1, S2, S3</p>
            </div>

            {activeConflict && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-amber-800 mt-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                <div className="text-sm">
                  <p className="font-semibold">Peringatan: Pekerjaan Konflik</p>
                  <p className="mt-0.5">Sektor {sector} sudah memiliki tiket aktif (<span className="font-semibold">{activeConflict.atp_number}</span>). Pastikan ini bukan duplikasi.</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nomor ATP</label>
              <input 
                type="text"
                value={atpNumber}
                onChange={e => setAtpNumber(e.target.value)}
                placeholder="ATP000000XXXXXX"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase"
              />
              <p className="text-xs text-slate-500 mt-1">Dari INEOM eATP system</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SOW ID</label>
              <input 
                type="text"
                value={sowId}
                onChange={e => setSowId(e.target.value)}
                placeholder="R0022633070"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PO Number <span className="text-red-500">*</span></label>
              <input 
                type="text"
                required
                value={poNumber}
                onChange={e => setPoNumber(e.target.value)}
                placeholder="5992/TC.03/EN-01/IV/2026"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase"
              />
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
            form="initiation-form"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5"
          >
            Mulai Pekerjaan <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default InitiationModal;
