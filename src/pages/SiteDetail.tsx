import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { siteMasterRecords, atpWorkOrders, workOrderLogs } from '../data/mockData';
import {
  ArrowLeft, Building2, MapPin, Briefcase, Clock, Settings, Check, Plus,
  ChevronDown, ChevronUp
} from 'lucide-react';
import clsx from 'clsx';
import InitiationModal from '../components/modals/InitiationModal';
import AtpTable from '../components/work-orders/AtpTable';
import { useCellSave } from '../hooks/useCellSave';
import { useTabContext } from '../context/TabContext';
import { db } from '../db';

type MainTab = 'info' | 'pekerjaan' | 'log';


const SiteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = useAuth();

  const hash = location.hash.replace('#', '');

  const [mainTab, setMainTab] = useState<MainTab>('info');
  const { openTab } = useTabContext();
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [newRowId, setNewRowId] = useState<string | null>(null);

  const { saveField } = useCellSave();
  const [localSiteData, setLocalSiteData] = useState<any>(null);
  const [dbLogs, setDbLogs] = useState<any[]>([]);

  useEffect(() => {
    const site = siteMasterRecords.find(s => s.site_id === id);
    if (site) setLocalSiteData({ ...site });

    if (hash.startsWith('pekerjaan/')) {
      setMainTab('pekerjaan');
    } else if (hash === 'pekerjaan') {
      setMainTab('pekerjaan');
    } else if (hash === 'log') {
      setMainTab('log');
    } else {
      setMainTab('info');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hash]);

  const site = localSiteData;
  const activeWorks = useMemo(() => atpWorkOrders.filter(wo => wo.site_id === id), [id]);

  useEffect(() => {
    if (!id) return;
    const fetchLogs = async () => {
      try {
        const logsRes = await db.query('SELECT * FROM site_stage_logs WHERE site_id = $id', { id });
        if (logsRes?.[0] && Array.isArray(logsRes[0]) && logsRes[0].length > 0) {
          setDbLogs(logsRes[0]);
        } else {
          const workOrderIds = activeWorks.map(w => w.id);
          setDbLogs(workOrderLogs.filter(l => workOrderIds.includes(l.work_order_id)));
        }
      } catch (err) {
        console.error('Failed to fetch DB logs:', err);
        const workOrderIds = activeWorks.map(w => w.id);
        setDbLogs(workOrderLogs.filter(l => workOrderIds.includes(l.work_order_id)));
      }
    };
    fetchLogs();
  }, [id, activeWorks]);

  if (!site) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-slate-500 mb-4">Site tidak ditemukan.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">Kembali</button>
      </div>
    );
  }

  const handleInfoChange = (field: string, val: string) => setLocalSiteData({ ...localSiteData, [field]: val });

  const saveInfo = async () => {
    for (const f of ['ne_id', 'region', 'cluster']) {
      await saveField(site.site_id, 'site', f, localSiteData[f]);
    }
    setIsEditingInfo(false);
  };

  const handleToggleWo = (woId: string) => {
    const wo = atpWorkOrders.find(w => w.id === woId);
    if (!wo) return;
    openTab({
      id: `atp-${wo.id}`,
      label: `ATP${wo.atp_number ? wo.atp_number.slice(-6) : wo.id.slice(-6)}`,
      path: `/atp/${wo.id}`,
      icon: '📋',
      closeable: true
    });
  };

  // ── Sticky Site Header ──────────────────────────────────────────────────────
  const renderHeader = () => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-6 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/sites')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-800 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500 shrink-0" />
              {site.site_id}
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">{site.site_name}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
              {site.region && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200 font-medium">{site.region}</span>}
              {site.cluster && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200 font-medium">{site.cluster}</span>}
              {site.tower_provider && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200 font-medium">{site.tower_provider}</span>}
              {site.ineom_registered && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-bold">IOMS ✓</span>}
            </div>
          </div>
        </div>

        {/* ATP quick-jump badges */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {activeWorks.map(wo => (
            <button
              key={wo.id}
              onClick={() => { setMainTab('pekerjaan'); handleToggleWo(wo.id); }}
              className={clsx(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                wo.status === 'active'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              )}
            >
              <span className={clsx('w-1.5 h-1.5 rounded-full', wo.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')} />
              {wo.atp_number || `${wo.project_type} S${wo.sector}`}
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
      </div>
    </div>
  );

  // ── Main Tab Bar ────────────────────────────────────────────────────────────
  const renderTabBar = () => (
    <div className="flex gap-0 border-b border-slate-200 bg-white rounded-t-xl overflow-hidden">
      {[
        { id: 'info' as MainTab, label: 'Info Site', icon: MapPin },
        { id: 'pekerjaan' as MainTab, label: `Daftar Pekerjaan (${activeWorks.length})`, icon: Briefcase },
        { id: 'log' as MainTab, label: 'Log & Riwayat', icon: Clock },
      ].map(tab => {
        const Icon = tab.icon;
        const active = mainTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => { setMainTab(tab.id); navigate(`/sites/${id}#${tab.id}`, { replace: true }); }}
            className={clsx(
              'flex items-center gap-2 px-5 py-3.5 border-b-2 font-bold text-sm transition-colors whitespace-nowrap',
              active
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
  );

  // ── Info Site Tab ───────────────────────────────────────────────────────────
  const renderInfoSite = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
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

        <div className="px-6 pt-5 pb-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">IDENTITAS</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 mb-6">
            <InfoField label="Network Element ID" editing={isEditingInfo} value={localSiteData.ne_id || ''} field="ne_id" onChange={handleInfoChange} monospace />
            <InfoField label="Site Name" editing={false} value={site.site_name || ''} field="site_name" onChange={() => { }} />
            <InfoField label="Site ID" editing={false} value={site.site_id || ''} field="site_id" onChange={() => { }} monospace />
          </div>
        </div>

        <div className="mx-6 border-t border-slate-100" />

        <div className="px-6 pt-5 pb-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">LOKASI</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 mb-6">
            <InfoField label="Region" editing={isEditingInfo} value={localSiteData.region || ''} field="region" onChange={handleInfoChange} />
            <InfoField label="Cluster" editing={isEditingInfo} value={localSiteData.cluster || ''} field="cluster" onChange={handleInfoChange} />
            <InfoField label="Provinsi" editing={isEditingInfo} value={localSiteData.raw_data?.['PROVINSI'] || localSiteData.provinsi || ''} field="provinsi" onChange={handleInfoChange} />
            <InfoField label="Kecamatan" editing={isEditingInfo} value={localSiteData.raw_data?.['KECAMATAN'] || localSiteData.kecamatan || ''} field="kecamatan" onChange={handleInfoChange} />
            <InfoField label="Kabupaten" editing={isEditingInfo} value={localSiteData.raw_data?.['KABUPATEN'] || localSiteData.kabupaten || ''} field="kabupaten" onChange={handleInfoChange} />
            <InfoField label="Alamat" editing={isEditingInfo} value={localSiteData.raw_data?.['ADDRESS'] || localSiteData.address || ''} field="address" onChange={handleInfoChange} />
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Koordinat</p>
              <p className="text-sm font-mono text-slate-700">
                {site.latitude && site.longitude ? `${site.latitude}, ${site.longitude}` : <span className="text-slate-400">—</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-6 border-t border-slate-100" />

        <div className="px-6 pt-5 pb-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">TEKNIS</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            <InfoField label="Tower Provider (TP)" editing={isEditingInfo} value={site.tower_provider || site.raw_data?.['TP NAME'] || ''} field="tower_provider" onChange={handleInfoChange} />
            <InfoField label="Ant Type" editing={isEditingInfo} value={localSiteData.raw_data?.['ANT_TYPE'] || localSiteData.ant_type || ''} field="ant_type" onChange={handleInfoChange} />
            <InfoField label="Height (m)" editing={isEditingInfo} value={localSiteData.raw_data?.['HEIGHT'] || String(localSiteData.height || '')} field="height" onChange={handleInfoChange} />
            <InfoField label="SOW Equipment" editing={false} value={site.sow_eqp || ''} field="sow_eqp" onChange={() => { }} />
            <InfoField label="PO Tsel" editing={false} value={site.po_tsel || ''} field="po_tsel" onChange={() => { }} monospace />
            <InfoField label="IOMS" editing={false} value={site.ineom_registered ? 'Registered' : 'Not Registered'} field="ineom" onChange={() => { }} />
          </div>
        </div>
      </div>
    </div>
  );

  // ── Pekerjaan Tab ───────────────────────────────────────────────────────────
  const renderPekerjaan = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
      {/* ATP Work Order List Table */}
      <AtpTable
        siteId={id!}
        onOpenWoTab={handleToggleWo}
        onAddNew={() => setIsInitModalOpen(true)}
        newRowId={newRowId}
        canEdit={can('manage_site') || can('edit_project')}
      />
    </div>
  );

  // ── Log Tab ─────────────────────────────────────────────────────────────────
  const renderLog = () => {
    const allLogs = [...dbLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Group by ATP
    const grouped: Record<string, typeof allLogs> = {};
    allLogs.forEach(log => {
      const wo = activeWorks.find(w => w.id === log.work_order_id);
      const key = wo?.atp_number || wo?.id || 'Site History';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(log);
    });

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 max-w-4xl">
        {Object.entries(grouped).map(([atpKey, logs]) => (
          <LogGroup key={atpKey} atpKey={atpKey} logs={logs} activeWorks={activeWorks} onOpenWo={(woId: string) => handleToggleWo(woId)} />
        ))}
        {allLogs.length === 0 && (
          <p className="text-sm text-slate-500 italic py-8 text-center border-2 border-dashed border-slate-100 rounded-xl bg-white">
            Belum ada log tercatat di site ini.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {renderHeader()}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {renderTabBar()}
        <div className="p-6 min-h-[400px]">
          {mainTab === 'info' && renderInfoSite()}
          {mainTab === 'pekerjaan' && renderPekerjaan()}
          {mainTab === 'log' && renderLog()}
        </div>
      </div>

      {isInitModalOpen && (
        <InitiationModal
          siteId={site.site_id}
          existingWorks={activeWorks}
          onClose={() => setIsInitModalOpen(false)}
          onSuccess={(newWoId: string) => {
            setIsInitModalOpen(false);
            setMainTab('pekerjaan');
            setNewRowId(newWoId);
            setTimeout(() => setNewRowId(null), 4000);
          }}
        />
      )}
    </div>
  );
};

// ── Log Group Component ──────────────────────────────────────────────────────
const LogGroup = ({ atpKey, logs, activeWorks, onOpenWo }: any) => {
  const [open, setOpen] = useState(true);
  const wo = activeWorks.find((w: any) => w.atp_number === atpKey || w.id === atpKey);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full px-5 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-800 text-sm font-mono">{atpKey}</span>
          <span className="text-[10px] text-slate-400">{logs.length} entri</span>
          {wo && (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenWo(wo.id); }}
              className="text-[10px] font-bold text-blue-600 hover:underline px-2 py-0.5 bg-blue-50 rounded border border-blue-100"
            >
              Buka Detail →
            </button>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="divide-y divide-slate-50">
          {logs.map((log: any) => (
            <div key={log.id} className="flex gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {log.user_id.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-slate-800">{log.action}</p>
                <p className="text-xs text-slate-400 mt-0.5">{new Date(log.timestamp).toLocaleString('id-ID')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── InfoField Helper ─────────────────────────────────────────────────────────
interface InfoFieldProps {
  label: string; value: string; field: string; editing: boolean;
  onChange: (field: string, val: string) => void; monospace?: boolean;
}
const InfoField = ({ label, value, field, editing, onChange, monospace = false }: InfoFieldProps) => (
  <div>
    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
    {editing ? (
      <input type="text" value={value} onChange={e => onChange(field, e.target.value)}
        className={clsx('w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold', monospace && 'font-mono')} />
    ) : (
      <p className={clsx('text-base font-semibold text-slate-800', monospace && 'font-mono')}>
        {value || <span className="text-slate-400 font-normal">—</span>}
      </p>
    )}
  </div>
);

export default SiteDetail;
