import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { siteMasterRecords, atpWorkOrders, workOrderLogs, terminPengajuanRecords } from '../data/mockData';
import { exportSiteExcel } from '../lib/exportExcel';
import {
  ArrowLeft, Building2, MapPin, Briefcase, Clock, Settings, Check, Plus,
  ChevronDown, ChevronUp, DollarSign, Download
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

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      if (id) await exportSiteExcel(id);
    } catch (e) {
      alert('Export gagal: ' + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

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

  // ── Financial & Progress Calculation ────────────────────────────────────────
  // Must be before early return to satisfy Rules of Hooks
  const finSummary = useMemo(() => {
    if (!site) return null;
    const siteId = site.site_id;

    // Look up payment claims tied to this site
    const matchingTermins = terminPengajuanRecords.filter(t => t.site_id === siteId);

    const totalPaid = matchingTermins.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.nominal, 0);
    const totalSubmitted = matchingTermins.filter(t => t.status === 'submitted').reduce((sum, t) => sum + t.nominal, 0);
    const totalContract = Number(site.nilai_kontrak || site.budget || 0);

    const formatRupiah = (val: number) => {
      if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1).replace('.', ',')} M`;
      if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1).replace('.', ',')} Jt`;
      return `Rp ${val.toLocaleString('id-ID')}`;
    };

    const getOverallProgress = () => {
      if (activeWorks.length === 0) return 0;
      const weights: Record<string, number> = { 'imported': 5, 'assigned': 10, 'permit_process': 20, 'permit_ready': 35, 'implementasi': 60, 'rfi_done': 80, 'rfs_done': 90, 'dokumen_done': 95, 'completed': 100 };
      const totalW = activeWorks.reduce((sum, w) => sum + (weights[w.stage] || weights[w.status] || 0), 0);
      return Math.floor(totalW / activeWorks.length);
    };

    return {
      totalContract,
      totalPaid,
      totalSubmitted,
      formattedPaid: formatRupiah(totalPaid),
      formattedPending: formatRupiah(totalSubmitted),
      formattedTotal: totalContract > 0 ? formatRupiah(totalContract) : '—',
      pctComplete: getOverallProgress()
    };
  }, [site, activeWorks]);

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

        {/* ATP quick-jump badges + export */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {can('export_data') && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              title="Export laporan site ke Excel"
            >
              <Download className="w-3 h-3" /> {exporting ? 'Exporting...' : 'Export'}
            </button>
          )}
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

      {/* Mini Financial / Progress Summary Bar */}
      {finSummary && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center flex-wrap gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-emerald-50 border border-emerald-100"><DollarSign className="w-3.5 h-3.5 text-emerald-600" /></div>
            <div>
              <p className="text-slate-400 font-bold tracking-wider uppercase text-[9px]">Budget / Nilai Kontrak</p>
              <p className="font-extrabold text-slate-800 text-[13px]">{finSummary.formattedTotal}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-blue-50 border border-blue-100"><Check className="w-3.5 h-3.5 text-blue-600" /></div>
            <div>
              <p className="text-slate-400 font-bold tracking-wider uppercase text-[9px]">Termin Terbayar</p>
              <p className="font-extrabold text-blue-700 text-[13px]">{finSummary.formattedPaid}</p>
            </div>
          </div>
          {finSummary.totalSubmitted > 0 && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-amber-50 border border-amber-100"><Clock className="w-3.5 h-3.5 text-amber-600" /></div>
              <div>
                <p className="text-slate-400 font-bold tracking-wider uppercase text-[9px]">Menunggu Pembayaran</p>
                <p className="font-extrabold text-amber-700 text-[13px]">{finSummary.formattedPending}</p>
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-slate-400 font-bold tracking-wider uppercase text-[9px]">Progres Estimasi</p>
              <p className="font-black text-slate-800 text-sm">{finSummary.pctComplete}%</p>
            </div>
            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${finSummary.pctComplete}%` }} />
            </div>
          </div>
        </div>
      )}
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

      {/* ── Teknis BTS (COMBAT only) ──────────────────────────────────────── */}
      {localSiteData?.project_type === 'COMBAT' && (
        <CombatBtsTeknis dbRecordId={site.id} data={localSiteData} />
      )}
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
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onOpenWo(wo.id); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onOpenWo(wo.id); } }}
              className="text-[10px] font-bold text-blue-600 hover:underline px-2 py-0.5 bg-blue-50 rounded border border-blue-100 cursor-pointer"
            >
              Buka Detail →
            </span>
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

// ── Combat BTS Teknis Section ────────────────────────────────────────────────
const BTS_TYPE_OPTS = ['Macro', 'Micro', 'Pico', 'Femto'];
const MAST_TYPE_OPTS = ['Greenfield', 'Rooftop', 'IBS'];
const POWER_SRC_OPTS = ['PLN', 'Genset', 'Solar', 'PLN+Genset'];
const FREQ_BANDS = ['L700', 'L900', 'L1800', 'L2100', 'L2300', 'L2600'];
const VENDOR_OPTS = ['Nokia', 'Ericsson', 'Huawei', 'ZTE'];

const CombatBtsTeknis = ({ dbRecordId, data }: { dbRecordId: string; data: any }) => {
  const [local, setLocal] = useState<any>({
    bts_type: data.bts_type || '',
    mast_type: data.mast_type || '',
    mast_height: data.mast_height ?? '',
    antenna_count: data.antenna_count ?? '',
    power_source: data.power_source || '',
    power_capacity_kva: data.power_capacity_kva ?? '',
    luas_lahan_m2: data.luas_lahan_m2 ?? '',
    access_road: data.access_road ?? null,
    grounding_done: data.grounding_done ?? null,
    lightning_rod: data.lightning_rod ?? null,
    frequency_bands: Array.isArray(data.frequency_bands) ? data.frequency_bands : [],
    vendors: Array.isArray(data.vendors) ? data.vendors : [],
  });

  const save = async (field: string, value: any) => {
    setLocal((p: any) => ({ ...p, [field]: value }));
    try {
      await db.query(`UPDATE ${dbRecordId} MERGE $data`, { data: { [field]: value, updated_at: new Date().toISOString() } });
    } catch (e) {
      console.error('BTS field save failed:', e);
    }
  };

  const toggleChip = (field: 'frequency_bands' | 'vendors', val: string) => {
    const arr: string[] = local[field] || [];
    const next = arr.includes(val) ? arr.filter((v: string) => v !== val) : [...arr, val];
    save(field, next);
  };

  const BtsField = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  );

  const selectCls = "w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400";
  const inputCls = "w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400";
  const toggleCls = (active: boolean | null, trueVal: boolean) =>
    clsx('px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer transition-colors',
      active === trueVal ? (trueVal ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-red-50 text-red-700 border-red-200')
        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400');

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-orange-50/40 flex items-center gap-2">
        <span className="text-base">🗼</span>
        <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Teknis BTS — Combat</h2>
      </div>
      <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
        <BtsField label="Tipe BTS">
          <select className={selectCls} value={local.bts_type} onChange={e => save('bts_type', e.target.value)}>
            <option value="">— Pilih —</option>
            {BTS_TYPE_OPTS.map(o => <option key={o}>{o}</option>)}
          </select>
        </BtsField>

        <BtsField label="Tipe Mast">
          <select className={selectCls} value={local.mast_type} onChange={e => save('mast_type', e.target.value)}>
            <option value="">— Pilih —</option>
            {MAST_TYPE_OPTS.map(o => <option key={o}>{o}</option>)}
          </select>
        </BtsField>

        <BtsField label="Tinggi Mast (m)">
          <input type="number" className={inputCls} defaultValue={local.mast_height}
            onBlur={e => save('mast_height', e.target.value ? Number(e.target.value) : null)} />
        </BtsField>

        <BtsField label="Jumlah Antena">
          <input type="number" className={inputCls} defaultValue={local.antenna_count}
            onBlur={e => save('antenna_count', e.target.value ? Number(e.target.value) : null)} />
        </BtsField>

        <BtsField label="Sumber Daya">
          <select className={selectCls} value={local.power_source} onChange={e => save('power_source', e.target.value)}>
            <option value="">— Pilih —</option>
            {POWER_SRC_OPTS.map(o => <option key={o}>{o}</option>)}
          </select>
        </BtsField>

        <BtsField label="Kapasitas Daya (kVA)">
          <input type="number" className={inputCls} defaultValue={local.power_capacity_kva}
            onBlur={e => save('power_capacity_kva', e.target.value ? Number(e.target.value) : null)} />
        </BtsField>

        <BtsField label="Luas Lahan (m²)">
          <input type="number" className={inputCls} defaultValue={local.luas_lahan_m2}
            onBlur={e => save('luas_lahan_m2', e.target.value ? Number(e.target.value) : null)} />
        </BtsField>

        <BtsField label="Akses Jalan">
          <div className="flex gap-2 mt-1">
            <span className={toggleCls(local.access_road, true)} onClick={() => save('access_road', true)}>Ada</span>
            <span className={toggleCls(local.access_road, false)} onClick={() => save('access_road', false)}>Tidak Ada</span>
          </div>
        </BtsField>

        <BtsField label="Grounding">
          <div className="flex gap-2 mt-1">
            <span className={toggleCls(local.grounding_done, true)} onClick={() => save('grounding_done', true)}>Selesai</span>
            <span className={toggleCls(local.grounding_done, false)} onClick={() => save('grounding_done', false)}>Belum</span>
          </div>
        </BtsField>

        <BtsField label="Lightning Rod">
          <div className="flex gap-2 mt-1">
            <span className={toggleCls(local.lightning_rod, true)} onClick={() => save('lightning_rod', true)}>Terpasang</span>
            <span className={toggleCls(local.lightning_rod, false)} onClick={() => save('lightning_rod', false)}>Belum</span>
          </div>
        </BtsField>

        <BtsField label="Frekuensi">
          <div className="flex flex-wrap gap-1.5 mt-1">
            {FREQ_BANDS.map(b => (
              <span key={b}
                onClick={() => toggleChip('frequency_bands', b)}
                className={clsx('px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer transition-colors',
                  local.frequency_bands?.includes(b)
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400')}>
                {b}
              </span>
            ))}
          </div>
        </BtsField>

        <BtsField label="Vendor">
          <div className="flex flex-wrap gap-1.5 mt-1">
            {VENDOR_OPTS.map(v => (
              <span key={v}
                onClick={() => toggleChip('vendors', v)}
                className={clsx('px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer transition-colors',
                  local.vendors?.includes(v)
                    ? 'bg-purple-50 text-purple-700 border-purple-300'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-400')}>
                {v}
              </span>
            ))}
          </div>
        </BtsField>
      </div>
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
