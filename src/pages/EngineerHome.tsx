import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Signal, Eye, Pencil, RefreshCw, Search, X, CheckCircle2, CircleSlash, Image as ImageIcon, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { query } from '../lib/surreal';

interface SiteRow {
  id: string;
  site_id: string;
  site_name?: string;
  atp_number?: string;
  stage?: string;
  project_type?: string;
  sector?: string | number;
  team_id?: string;
  team?: string;
  updated_at?: string;
}

const isMyTeam = (s: SiteRow, teamSet: Set<string>): boolean => {
  const t = String(s.team ?? s.team_id ?? '');
  return t.length > 0 && teamSet.has(t);
};

const ACTIVE_STAGES = ['implementasi','akses_ready','rfi_done','akses_process','permit_ready'];

type FilterMode = 'all' | 'unuploaded' | 'uploaded';

const EngineerHome = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [uploadCounts, setUploadCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const fetchSites = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1. Find this user's record in DB (by email)
      const users = await query<any>(
        `SELECT * FROM users WHERE email = '${currentUser.email}' LIMIT 1;`,
      );
      const userRecordId = users[0]?.id;

      // 2. Team memberships — used ONLY for sorting/badge, NOT as a hard filter.
      // Future: re-enable hard filter once `sites.team` is populated consistently
      // for all rows (engineer should not open detail of sites outside their team).
      let myTeamIds: string[] = [];
      if (userRecordId) {
        const memberships = await query<any>(
          `SELECT * FROM team_members WHERE person_id = ${userRecordId};`,
        );
        myTeamIds = memberships.map(m => String(m.team_id ?? m.team ?? ''))
          .filter(Boolean);
      }
      setTeamIds(myTeamIds);

      // 3. Sites — fetch ALL active-stage sites (same as operasional sees).
      // Team is applied as a sort priority below, not a WHERE clause.
      const sitesRows = await query<any>(
        `SELECT * FROM sites WHERE stage IN [${ACTIVE_STAGES.map(s => `'${s}'`).join(',')}]
           ORDER BY updated_at DESC LIMIT 200;`,
      );

      // Sort: rows whose `team` or `team_id` matches my teams come first.
      const teamSet = new Set(myTeamIds);
      const sorted = (sitesRows as SiteRow[]).slice().sort((a, b) => {
        const teamOf = (r: any) => String(r.team ?? r.team_id ?? '');
        const aMine = teamSet.has(teamOf(a)) && teamOf(a).length > 0;
        const bMine = teamSet.has(teamOf(b)) && teamOf(b).length > 0;
        if (aMine !== bMine) return aMine ? -1 : 1;
        return 0;
      });
      setSites(sorted);

      // 4. Photo-upload status per site (tag='implementasi' is what EngineerUpload writes)
      if (sorted.length) {
        const idList = sorted.map((s: any) => String(s.id)).filter(Boolean);
        if (idList.length) {
          const inIds = idList.join(',');
          const files = await query<any>(
            `SELECT work_order_id FROM site_files
              WHERE work_order_id IN [${inIds}]
                AND (tag = 'implementasi' OR category = 'photo');`,
          );
          const counts: Record<string, number> = {};
          for (const f of files) {
            const wid = String(f.work_order_id || '');
            if (!wid) continue;
            counts[wid] = (counts[wid] || 0) + 1;
          }
          setUploadCounts(counts);
        } else {
          setUploadCounts({});
        }
      } else {
        setUploadCounts({});
      }
    } catch (e) {
      console.warn('[EngineerHome] fetch failed', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSites(); }, [currentUser?.id]);

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter(s => {
      const count = uploadCounts[String(s.id)] || 0;
      if (filter === 'uploaded' && count === 0) return false;
      if (filter === 'unuploaded' && count > 0) return false;
      if (!q) return true;
      return (
        (s.site_id || '').toLowerCase().includes(q) ||
        (s.atp_number || '').toLowerCase().includes(q) ||
        (s.site_name || '').toLowerCase().includes(q) ||
        (s.project_type || '').toLowerCase().includes(q)
      );
    });
  }, [sites, uploadCounts, search, filter]);

  const totalUploaded = useMemo(
    () => sites.filter(s => (uploadCounts[String(s.id)] || 0) > 0).length,
    [sites, uploadCounts],
  );

  const myTeamSet = useMemo(() => new Set(teamIds), [teamIds]);
  const myTeamCount = useMemo(
    () => sites.filter(s => isMyTeam(s, myTeamSet)).length,
    [sites, myTeamSet],
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 pt-6 pb-5 shadow-md rounded-b-3xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight">ATP Saya</h1>
            <p className="text-blue-100 text-xs mt-0.5">
              {teamIds.length
                ? `${myTeamCount} site tim Anda · ${sites.length} total aktif`
                : `${sites.length} site aktif`}
            </p>
          </div>
          <button onClick={fetchSites}
            className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full active:scale-95 transition">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-200/80" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari site, ATP, tower…"
            className="w-full bg-white/15 placeholder-blue-200/60 text-white text-sm pl-9 pr-9 py-2.5 rounded-xl outline-none focus:bg-white/20 focus:ring-2 focus:ring-white/30 transition"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-100/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-4 pt-3 -mt-1">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            Semua <span className="opacity-60">· {sites.length}</span>
          </FilterChip>
          <FilterChip active={filter === 'unuploaded'} onClick={() => setFilter('unuploaded')} variant="amber">
            <CircleSlash className="w-3.5 h-3.5" />
            Belum upload <span className="opacity-60">· {sites.length - totalUploaded}</span>
          </FilterChip>
          <FilterChip active={filter === 'uploaded'} onClick={() => setFilter('uploaded')} variant="emerald">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sudah upload <span className="opacity-60">· {totalUploaded}</span>
          </FilterChip>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : filteredSites.length === 0 ? (
          <EmptyState search={search} filter={filter} totalSites={sites.length} />
        ) : (
          filteredSites.map(s => (
            <SiteCard
              key={s.id}
              s={s}
              uploadCount={uploadCounts[String(s.id)] || 0}
              isMine={isMyTeam(s, myTeamSet)}
              onUpload={() => navigate(`/engineer/upload/${encodeURIComponent(s.id)}`)}
              onCiCo={() => navigate(`/engineer/site/${encodeURIComponent(s.id)}?edit=cico`)}
              onView={() => navigate(`/engineer/site/${encodeURIComponent(s.id)}`)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
function FilterChip({ active, onClick, variant = 'blue', children }: {
  active: boolean;
  onClick: () => void;
  variant?: 'blue' | 'amber' | 'emerald';
  children: React.ReactNode;
}) {
  const activeClasses = {
    blue:    'bg-blue-600 text-white border-blue-600',
    amber:   'bg-amber-500 text-white border-amber-500',
    emerald: 'bg-emerald-600 text-white border-emerald-600',
  }[variant];
  return (
    <button onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition active:scale-95 ${
        active ? activeClasses : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
      }`}>
      {children}
    </button>
  );
}

// ────────────────────────────────────────────────────────────
function SiteCard({ s, uploadCount, isMine, onUpload, onCiCo, onView }: {
  s: SiteRow;
  uploadCount: number;
  isMine: boolean;
  onUpload: () => void;
  onCiCo: () => void;
  onView: () => void;
}) {
  const hasUploads = uploadCount > 0;
  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
      isMine ? 'border-blue-300 ring-1 ring-blue-100' :
      hasUploads ? 'border-emerald-200' : 'border-slate-100'
    }`}>
      {/* Top: ATP number prominent */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {s.atp_number ? (
            <span className="font-mono font-black text-sm text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md truncate">
              {s.atp_number}
            </span>
          ) : (
            <span className="font-mono text-xs text-slate-400 italic">tanpa ATP</span>
          )}
          {s.sector != null && (
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              S{s.sector}
            </span>
          )}
          {isMine && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
              <Users className="w-2.5 h-2.5" /> Tim Anda
            </span>
          )}
        </div>
        {hasUploads ? (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> {uploadCount} foto
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
            <ImageIcon className="w-3 h-3" /> belum upload
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pb-3 border-b border-slate-50">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-slate-800 text-base">{s.site_id}</h3>
          {s.stage && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
              {s.stage}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
          {s.project_type && (
            <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium text-[10px] uppercase">{s.project_type}</span>
          )}
        </div>
        <div className="flex items-start gap-1.5 text-xs text-slate-500">
          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="truncate">{s.site_name ?? '—'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-2.5 bg-slate-50 grid grid-cols-[1fr_1fr_auto] gap-2">
        <button onClick={onUpload}
          className={`font-bold py-2.5 px-3 rounded-xl shadow-sm flex items-center justify-center gap-1.5 text-sm active:scale-95 transition ${
            hasUploads
              ? 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
          <Camera className="w-4 h-4" />
          {hasUploads ? 'Tambah' : 'Foto'}
        </button>
        <button onClick={onCiCo}
          className="bg-white text-slate-700 border border-slate-200 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-sm active:scale-95">
          <Pencil className="w-4 h-4" /> CI/CO
        </button>
        <button onClick={onView}
          aria-label="View detail"
          className="px-3 bg-white text-slate-700 border border-slate-200 font-bold py-2.5 rounded-xl flex items-center justify-center active:scale-95">
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
function EmptyState({ search, filter, totalSites }: { search: string; filter: FilterMode; totalSites: number }) {
  if (search) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
          <Search className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="font-bold text-slate-700 mb-1">Tidak ditemukan</h3>
        <p className="text-slate-500 text-sm">Tidak ada site cocok dengan "{search}".</p>
      </div>
    );
  }
  if (filter === 'unuploaded') {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <h3 className="font-bold text-slate-700 mb-1">Semua site sudah upload!</h3>
        <p className="text-slate-500 text-sm">Tidak ada yang menunggu foto implementasi.</p>
      </div>
    );
  }
  if (filter === 'uploaded') {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <ImageIcon className="w-7 h-7 text-amber-600" />
        </div>
        <h3 className="font-bold text-slate-700 mb-1">Belum ada upload</h3>
        <p className="text-slate-500 text-sm">Belum ada site dengan foto yang sudah diunggah.</p>
      </div>
    );
  }
  return (
    <div className="text-center py-12 px-4">
      <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
        <Signal className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="font-bold text-slate-700 mb-1">Semua Selesai!</h3>
      <p className="text-slate-500 text-sm">
        {totalSites === 0 ? 'Belum ada site yang ditugaskan ke kamu.' : 'Tidak ada site yang butuh upload foto saat ini.'}
      </p>
    </div>
  );
}

export default EngineerHome;
