import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, X, ImageIcon, FileText, Clock } from 'lucide-react';
import { query } from '../lib/surreal';
import { db } from '../db';
import { useAuth } from '../context/AuthContext';

interface Site {
  id: string;
  site_id: string;
  site_name?: string;
  atp_number?: string;
  stage?: string;
  project_type?: string;
  ci_date?: string; ci_time?: string;
  co_date?: string; co_time?: string;
  note_impl?: string;
  impl_status?: string;
  permit_status?: string;
  atp_status?: string;
  team_name?: string;
  pic_nama?: string;
  pic_telp?: string;
  jenis_kunci?: string;
}

interface SiteFile {
  id: string;
  filename?: string;
  name?: string;
  tag?: string;
  category?: string;
  mime_type?: string;
  uploaded_at?: string;
  file_data?: string;
}

const fDate = (v?: string) => v
  ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const EngineerSiteView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const initialEdit = searchParams.get('edit') === 'cico';

  const [site, setSite] = useState<Site | null>(null);
  const [files, setFiles] = useState<SiteFile[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCico, setShowCico] = useState(initialEdit);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string; ok: boolean }>({ show: false, msg: '', ok: true });
  const [activeTab, setActiveTab] = useState<'info'|'foto'|'file'|'log'>('info');

  // CI/CO form state
  const [ciDate, setCiDate] = useState('');
  const [ciTime, setCiTime] = useState('');
  const [coDate, setCoDate] = useState('');
  const [coTime, setCoTime] = useState('');
  const [catatan, setCatatan] = useState('');

  const showToast = (msg: string, ok = true) => {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const rows = await query<Site>(`SELECT * FROM ${id};`);
      const s = rows[0] ?? null;
      setSite(s);
      if (s) {
        setCiDate(s.ci_date ?? '');
        setCiTime(s.ci_time ?? '');
        setCoDate(s.co_date ?? '');
        setCoTime(s.co_time ?? '');
        setCatatan(s.note_impl ?? '');
      }
      const fr = await query<SiteFile>(
        `SELECT * FROM site_files WHERE site_id = '${s?.site_id ?? ''}' OR work_order_id = ${id} ORDER BY uploaded_at DESC LIMIT 100;`,
      );
      setFiles(fr);
      const lr = await query<any>(
        `SELECT * FROM site_stage_logs WHERE site_id = '${s?.site_id ?? ''}' OR work_order_id = ${id} ORDER BY timestamp DESC LIMIT 50;`,
      );
      setLogs(lr);
    } catch (e) {
      console.warn('[EngineerSiteView] fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const saveCico = async () => {
    if (!site) return;
    setSaving(true);
    try {
      const updates: any = {
        ci_date: ciDate, ci_time: ciTime,
        co_date: coDate, co_time: coTime,
        note_impl: catatan,
        updated_at: new Date().toISOString(),
      };
      const res = await db.query(`UPDATE ${site.id} MERGE $data`, { data: updates });
      const ok = Array.isArray(res) && res[0] !== undefined &&
        !(typeof res[0] === 'object' && (res[0] as any)?.status === 'ERR');
      if (!ok) {
        showToast('Gagal menyimpan CI/CO', false);
        return;
      }
      // Log it
      await db.query('CREATE site_stage_logs CONTENT $data', { data: {
        work_order_id: site.id,
        site_id: site.site_id,
        action: `[engineer] Update CI/CO: CI=${ciDate} ${ciTime}, CO=${coDate} ${coTime}`,
        user_id: currentUser?.id ?? 'engineer',
        user_name: currentUser?.name ?? 'Engineer',
        stage_at_time: site.stage,
        timestamp: new Date().toISOString(),
      }});
      showToast('CI/CO berhasil disimpan');
      setShowCico(false);
      fetchData();
    } catch (e) {
      console.error(e);
      showToast('Error: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!site) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Site tidak ditemukan.</p>
        <button onClick={() => navigate('/engineer')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Kembali</button>
      </div>
    );
  }

  const photos = files.filter(f =>
    f.mime_type?.startsWith('image/') || f.category === 'photo' ||
    ['jpg','jpeg','png','gif'].includes((f.filename?.split('.').pop() ?? '').toLowerCase()),
  );
  const docs = files.filter(f => !photos.includes(f));

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {toast.show && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-bold ${
          toast.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                     'bg-red-50 text-red-700 border border-red-200'
        }`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-5 rounded-b-3xl">
        <button onClick={() => navigate('/engineer')}
          className="flex items-center gap-1.5 text-blue-100 text-sm mb-3 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <h1 className="text-xl font-bold">{site.site_id}</h1>
        <p className="text-blue-100 text-sm">{site.site_name ?? '—'}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="bg-white/15 text-xs font-bold px-2 py-0.5 rounded uppercase">{site.project_type}</span>
          <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded uppercase">{site.stage}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10 overflow-x-auto">
        {(['info','foto','file','log'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-3 text-xs font-bold uppercase whitespace-nowrap border-b-2 ${
              activeTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
            }`}>{t}</button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === 'info' && (
          <div className="space-y-2">
            <ReadOnlyRow label="ATP Number" value={site.atp_number} />
            <ReadOnlyRow label="Tim" value={site.team_name} />
            <ReadOnlyRow label="Permit Status" value={site.permit_status} />
            <ReadOnlyRow label="Impl Status" value={site.impl_status} />
            <ReadOnlyRow label="ATP Status" value={site.atp_status} />
            <ReadOnlyRow label="CI" value={site.ci_date ? `${site.ci_date} ${site.ci_time ?? ''}` : '—'} />
            <ReadOnlyRow label="CO" value={site.co_date ? `${site.co_date} ${site.co_time ?? ''}` : '—'} />
            <ReadOnlyRow label="PIC" value={site.pic_nama} />
            <ReadOnlyRow label="Jenis Kunci" value={site.jenis_kunci} />
            <ReadOnlyRow label="Catatan" value={site.note_impl} />
            <button onClick={() => setShowCico(true)}
              className="w-full mt-4 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 active:scale-95">
              Update CI/CO
            </button>
          </div>
        )}

        {activeTab === 'foto' && (
          photos.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Belum ada foto.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map(f => (
                <div key={f.id} className="aspect-square bg-white border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center">
                  {f.file_data?.startsWith('data:') ? (
                    <img src={f.file_data} alt={f.filename} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'file' && (
          docs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Belum ada dokumen.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-800 truncate">{f.filename ?? f.name}</p>
                    <p className="text-[11px] text-slate-400">{fDate(f.uploaded_at)} · {f.tag ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'log' && (
          logs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-2" />
              <p className="text-sm">Belum ada log.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((l, i) => (
                <div key={l.id ?? i} className="p-3 bg-white border border-slate-200 rounded-lg">
                  <p className="text-sm text-slate-800">{l.action}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{fDate(l.timestamp)} · {l.user_name ?? l.user_id}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* CI/CO modal */}
      {showCico && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowCico(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-800">Update CI/CO</h3>
              <button onClick={() => setShowCico(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold text-slate-600 uppercase">CI Tanggal</span>
                  <input type="date" value={ciDate} onChange={e => setCiDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-600 uppercase">CI Waktu</span>
                  <input type="time" value={ciTime} onChange={e => setCiTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-600 uppercase">CO Tanggal</span>
                  <input type="date" value={coDate} onChange={e => setCoDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-slate-600 uppercase">CO Waktu</span>
                  <input type="time" value={coTime} onChange={e => setCoTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-bold text-slate-600 uppercase">Catatan</span>
                <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={3}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button onClick={() => setShowCico(false)}
                className="px-4 py-2 text-sm font-bold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50">Batal</button>
              <button onClick={saveCico} disabled={saving}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function ReadOnlyRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-3 py-2 bg-white border border-slate-200 rounded-lg">
      <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
      <span className="col-span-2 text-sm text-slate-800 truncate">{value || '—'}</span>
    </div>
  );
}

export default EngineerSiteView;
