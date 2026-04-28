import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { siteMasterRecords, atpWorkOrders, workOrderLogs } from '../data/mockData';
import { ArrowLeft, Building2, MapPin, Briefcase, Clock, Settings, X, Check, Plus } from 'lucide-react';
import clsx from 'clsx';
import InitiationModal from '../components/modals/InitiationModal';
import WorkOrderTabContent from '../components/work-orders/WorkOrderTabContent';
import AtpTable from '../components/work-orders/AtpTable';
import { useCellSave } from '../hooks/useCellSave';

const SiteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useAuth();

  // Parse hash to determine initial tab
  const hash = location.hash.replace('#', '');

  const [mainTab, setMainTab] = useState<'info' | 'pekerjaan' | 'log'>('info');
  const [activeSubTab, setActiveSubTab] = useState<string>('list');
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [newRowId, setNewRowId] = useState<string | null>(null);

  const { saveField } = useCellSave();
  const [localSiteData, setLocalSiteData] = useState<any>(null);

  useEffect(() => {
    const site = siteMasterRecords.find(s => s.site_id === id);
    if (site) setLocalSiteData({ ...site });

    if (hash === 'pekerjaan') {
      setMainTab('pekerjaan');
    } else if (hash.startsWith('pekerjaan/')) {
      setMainTab('pekerjaan');
      const woId = hash.split('/')[1];
      if (woId) {
        if (!openTabs.includes(woId)) setOpenTabs(prev => [...prev, woId]);
        setActiveSubTab(woId);
      }
    } else if (hash === 'log') {
      setMainTab('log');
    } else if (hash === 'info' || !hash) {
      setMainTab('info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hash]);

  const site = localSiteData;
  const activeWorks = useMemo(() => atpWorkOrders.filter(wo => wo.site_id === id), [id, atpWorkOrders.length]);

  if (!site) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-slate-500 mb-4">Site Master not found.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const handleOpenWoTab = (woId: string) => {
    if (!openTabs.includes(woId)) {
      setOpenTabs(prev => [...prev, woId]);
    }
    setActiveSubTab(woId);
    navigate(`/sites/${id}#pekerjaan/${woId}`, { replace: true });
  };

  const handleCloseWoTab = (woId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t !== woId);
    setOpenTabs(newTabs);
    if (activeSubTab === woId) {
      setActiveSubTab(newTabs.length > 0 ? newTabs[newTabs.length - 1] : 'list');
      navigate(`/sites/${id}#pekerjaan`, { replace: true });
    }
  };

  const handleInfoChange = (field: string, val: string) => {
    setLocalSiteData({ ...localSiteData, [field]: val });
  };

  const saveInfo = async () => {
    const fields = ['ne_id', 'region', 'cluster'];
    for (const f of fields) {
      await saveField(site.site_id, 'site', f, localSiteData[f]);
    }
    setIsEditingInfo(false);
  };

  // ─── Info Site tab ───────────────────────────────────────────────────────────
  const renderInfoSite = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-slate-500" />
            <h2 className="font-bold text-slate-800 text-lg">INFO SITE</h2>
          </div>
          {(can('manage_site') || can('edit_project')) && (
            <button
              onClick={() => isEditingInfo ? saveInfo() : setIsEditingInfo(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              {isEditingInfo ? <Check className="w-4 h-4 text-emerald-600" /> : <Settings className="w-4 h-4" />}
              {isEditingInfo ? 'Simpan Perubahan' : 'Edit Info Site'}
            </button>
          )}
        </div>

        {/* ── IDENTITAS ── */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">IDENTITAS</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 mb-6">
            <InfoField label="Network Element ID" editing={isEditingInfo}
              value={localSiteData.ne_id || ''} field="ne_id" onChange={handleInfoChange} monospace />
            <InfoField label="Site Name" editing={false}
              value={site.site_name || ''} field="site_name" onChange={() => {}} />
            <InfoField label="Site ID" editing={false}
              value={site.site_id || ''} field="site_id" onChange={() => {}} monospace />
          </div>
        </div>

        <div className="mx-6 border-t border-slate-100" />

        {/* ── LOKASI ── */}
        <div className="px-6 pt-5 pb-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">LOKASI</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 mb-6">
            <InfoField label="Region" editing={isEditingInfo}
              value={localSiteData.region || ''} field="region" onChange={handleInfoChange} />
            <InfoField label="Cluster" editing={isEditingInfo}
              value={localSiteData.cluster || ''} field="cluster" onChange={handleInfoChange} />
            <InfoField label="Provinsi" editing={isEditingInfo}
              value={localSiteData.raw_data?.['PROVINSI'] || localSiteData.provinsi || ''} field="provinsi" onChange={handleInfoChange} />
            <InfoField label="Kecamatan" editing={isEditingInfo}
              value={localSiteData.raw_data?.['KECAMATAN'] || localSiteData.kecamatan || ''} field="kecamatan" onChange={handleInfoChange} />
            <InfoField label="Kabupaten" editing={isEditingInfo}
              value={localSiteData.raw_data?.['KABUPATEN'] || localSiteData.kabupaten || ''} field="kabupaten" onChange={handleInfoChange} />
            <InfoField label="Alamat" editing={isEditingInfo}
              value={localSiteData.raw_data?.['ADDRESS'] || localSiteData.address || ''} field="address" onChange={handleInfoChange} />
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Koordinat</p>
              <p className="text-sm font-mono text-slate-700">
                {site.latitude && site.longitude
                  ? `${site.latitude}, ${site.longitude}`
                  : <span className="text-slate-400">—</span>
                }
              </p>
            </div>
          </div>
        </div>

        <div className="mx-6 border-t border-slate-100" />

        {/* ── TEKNIS ── */}
        <div className="px-6 pt-5 pb-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">TEKNIS</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            <InfoField label="Tower Provider (TP)" editing={isEditingInfo}
              value={site.tower_provider || site.raw_data?.['TP NAME'] || ''} field="tower_provider" onChange={handleInfoChange} />
            <InfoField label="Ant Type" editing={isEditingInfo}
              value={localSiteData.raw_data?.['ANT_TYPE'] || localSiteData.ant_type || ''} field="ant_type" onChange={handleInfoChange} />
            <InfoField label="Height (m)" editing={isEditingInfo}
              value={localSiteData.raw_data?.['HEIGHT'] || String(localSiteData.height || '')} field="height" onChange={handleInfoChange} />
            <InfoField label="SOW Equipment" editing={false}
              value={site.sow_eqp || ''} field="sow_eqp" onChange={() => {}} />
            <InfoField label="PO Tsel" editing={false}
              value={site.po_tsel || ''} field="po_tsel" onChange={() => {}} monospace />
            <InfoField label="IOMS" editing={false}
              value={site.ineom_registered ? 'Registered' : 'Not Registered'} field="ineom" onChange={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Pekerjaan tab ───────────────────────────────────────────────────────────
  const renderPekerjaan = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      {/* Sub-tabs header */}
      <div className="flex items-center border-b border-slate-200 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => { setActiveSubTab('list'); navigate(`/sites/${id}#pekerjaan`); }}
          className={clsx(
            'px-4 py-3 font-medium text-sm transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 shrink-0',
            activeSubTab === 'list'
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          )}
        >
          <Briefcase className="w-4 h-4" /> Daftar Pekerjaan
        </button>

        {openTabs.map(woId => {
          const wo = atpWorkOrders.find(w => w.id === woId);
          if (!wo) return null;
          const label = wo.atp_number
            ? `${wo.atp_number} (${wo.project_type} S${wo.sector})`
            : `New Work — ${wo.project_type} S${wo.sector}`;
          const isActive = activeSubTab === woId;
          return (
            <button
              key={woId}
              onClick={() => handleOpenWoTab(woId)}
              className={clsx(
                'px-4 py-3 font-medium text-sm transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 group shrink-0',
                isActive
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              )}
            >
              {label}
              <X
                className={clsx('w-3.5 h-3.5 rounded hover:bg-slate-200 transition-colors', isActive ? 'text-blue-500' : 'text-slate-400')}
                onClick={(e) => handleCloseWoTab(woId, e)}
              />
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <div className="pt-1">
        {activeSubTab === 'list' ? (
          <AtpTable
            siteId={id!}
            onOpenWoTab={handleOpenWoTab}
            onAddNew={() => setIsInitModalOpen(true)}
            newRowId={newRowId}
            canEdit={can('manage_site') || can('edit_project')}
          />
        ) : (
          <WorkOrderTabContent workOrderId={activeSubTab} />
        )}
      </div>
    </div>
  );

  // ─── Log tab ─────────────────────────────────────────────────────────────────
  const renderLog = () => {
    const workOrderIds = activeWorks.map(w => w.id);
    const logs = workOrderLogs
      .filter(l => workOrderIds.includes(l.work_order_id))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-4xl animate-in fade-in slide-in-from-bottom-2">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" /> Activity Log Gabungan
        </h3>
        <div className="space-y-4">
          {logs.map(log => {
            const wo = activeWorks.find(w => w.id === log.work_order_id);
            return (
              <div key={log.id} className="flex gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                  {log.user_id.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-slate-800">{log.action}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</p>
                    {wo && (
                      <>
                        <span className="text-slate-300 text-xs">•</span>
                        <span
                          className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-200"
                          onClick={() => handleOpenWoTab(wo.id)}
                        >
                          {wo.atp_number || `S${wo.sector}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {logs.length === 0 && (
            <p className="text-sm text-slate-500 italic py-8 text-center border-2 border-dashed border-slate-100 rounded-xl">
              Belum ada log tercatat di site ini.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/sites')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-500" />
              {site.site_id}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 font-medium">{site.site_name}</p>

            {/* ATP badges */}
            {activeWorks.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {activeWorks.map(wo => (
                  <button
                    key={wo.id}
                    onClick={() => { setMainTab('pekerjaan'); handleOpenWoTab(wo.id); }}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                      wo.status === 'active'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    {wo.atp_number || `${wo.project_type} S${wo.sector}`}
                    <span className="text-[9px] font-medium capitalize">
                      {wo.project_type} S{wo.sector}
                    </span>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', wo.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')} />
                    <span className="text-[9px] uppercase font-bold">{wo.status}</span>
                  </button>
                ))}
                {(can('manage_site') || can('edit_project')) && (
                  <button
                    onClick={() => setIsInitModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> ATP
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Tabs ── */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto hide-scrollbar">
        {[
          { id: 'info', label: 'INFO SITE', icon: MapPin },
          { id: 'pekerjaan', label: `PEKERJAAN (${activeWorks.length})`, icon: Briefcase },
          { id: 'log', label: 'LOG', icon: Clock },
        ].map(tab => {
          const Icon = tab.icon as any;
          return (
            <button
              key={tab.id}
              onClick={() => { setMainTab(tab.id as any); navigate(`/sites/${id}#${tab.id}`, { replace: true }); }}
              className={clsx(
                'flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-colors whitespace-nowrap',
                mainTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="min-h-[500px]">
        {mainTab === 'info' && renderInfoSite()}
        {mainTab === 'pekerjaan' && renderPekerjaan()}
        {mainTab === 'log' && renderLog()}
      </div>

      {/* ── Initiation Modal ── */}
      {isInitModalOpen && (
        <InitiationModal
          siteId={site.site_id}
          existingWorks={activeWorks}
          onClose={() => setIsInitModalOpen(false)}
          onSuccess={(newWoId: string) => {
            setIsInitModalOpen(false);
            setMainTab('pekerjaan');
            setActiveSubTab('list');
            setNewRowId(newWoId);
            // Clear highlight after 4 seconds
            setTimeout(() => setNewRowId(null), 4000);
          }}
        />
      )}
    </div>
  );
};

// ─── Helper: info field ───────────────────────────────────────────────────────
interface InfoFieldProps {
  label: string;
  value: string;
  field: string;
  editing: boolean;
  onChange: (field: string, val: string) => void;
  monospace?: boolean;
}

const InfoField = ({ label, value, field, editing, onChange, monospace = false }: InfoFieldProps) => (
  <div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
    {editing ? (
      <input
        type="text"
        value={value}
        onChange={e => onChange(field, e.target.value)}
        className={clsx(
          'w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold',
          monospace && 'font-mono'
        )}
      />
    ) : (
      <p className={clsx('text-base font-semibold text-slate-800', monospace && 'font-mono')}>
        {value || <span className="text-slate-400 font-normal">—</span>}
      </p>
    )}
  </div>
);

export default SiteDetail;
