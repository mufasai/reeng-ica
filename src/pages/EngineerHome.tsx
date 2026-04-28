import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Signal } from 'lucide-react';
import { atpWorkOrders, siteMasterRecords } from '../data/mockData';

const EngineerHome = () => {
  const navigate = useNavigate();

  // Filter for work orders in implementasi or similar stages.
  // For the mock, we assume the engineer can see all implementasi stages.
  const activeWorkOrders = atpWorkOrders.filter(wo => 
    ['implementasi', 'rfi_done', 'rfs_done'].includes(wo.stage)
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-6 shadow-md rounded-b-3xl">
        <h1 className="text-2xl font-bold">ATP Saya</h1>
        <p className="text-blue-100 text-sm mt-1">Daftar site yang butuh upload foto implementasi</p>
      </div>

      <div className="p-4 space-y-4 -mt-4 relative z-10">
        {activeWorkOrders.map(wo => {
          const site = siteMasterRecords.find(s => s.site_id === wo.site_id);
          
          return (
            <div key={wo.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{wo.site_id}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">{wo.project_type}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">Sektor {wo.sector}</span>
                    </div>
                  </div>
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded uppercase">
                    {wo.stage}
                  </span>
                </div>
                
                <p className="text-sm font-mono text-slate-600 mb-1">{wo.atp_number}</p>
                <div className="flex items-start gap-1.5 text-sm text-slate-500">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="truncate">{site?.site_name || 'Unknown Site'}</span>
                </div>
              </div>
              
              <div className="p-3 bg-slate-50">
                <button 
                  onClick={() => navigate(`/engineer/upload/${wo.id}`)}
                  className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Camera className="w-5 h-5" />
                  Upload Foto
                </button>
              </div>
            </div>
          );
        })}
        
        {activeWorkOrders.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Signal className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-700 text-lg mb-1">Semua Selesai!</h3>
            <p className="text-slate-500 text-sm">Tidak ada work order yang butuh upload foto saat ini.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EngineerHome;
