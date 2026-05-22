import { useEffect, useState } from 'react';
import { Bug, X, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { query, dbErrors } from '../lib/surreal';

interface CheckResult {
  label: string;
  ok: boolean;
  detail: string;
  rows?: any[];
}

const CHECKS: { label: string; run: () => Promise<CheckResult> }[] = [
  {
    label: 'Photos have file_data?',
    run: async () => {
      const all = await query<any>(`SELECT id, file_data, mime_type FROM site_files;`);
      const total = all.length;
      const withData = all.filter(f => !!f.file_data).length;
      return {
        label: 'Photos have file_data?',
        ok: total === 0 || withData / total >= 0.5,
        detail: `${withData}/${total} files have file_data`,
        rows: all.slice(0, 3),
      };
    },
  },
  {
    label: 'Pengajuan linked correctly?',
    run: async () => {
      const pq = await query<any>('SELECT count() FROM pengajuan GROUP ALL;');
      const tr = await query<any>('SELECT count() FROM termins GROUP ALL;');
      return {
        label: 'Pengajuan linked correctly?',
        ok: (pq[0]?.count ?? 0) + (tr[0]?.count ?? 0) > 0,
        detail: `pengajuan=${pq[0]?.count ?? 0}, termins=${tr[0]?.count ?? 0}`,
      };
    },
  },
  {
    label: 'Stage logs exist?',
    run: async () => {
      const a = await query<any>('SELECT count() FROM site_stage_logs GROUP ALL;');
      const b = await query<any>('SELECT count() FROM site_stage_log GROUP ALL;');
      return {
        label: 'Stage logs exist?',
        ok: (a[0]?.count ?? 0) + (b[0]?.count ?? 0) > 0,
        detail: `site_stage_logs=${a[0]?.count ?? 0}, site_stage_log=${b[0]?.count ?? 0}`,
      };
    },
  },
  {
    label: 'Users have roles?',
    run: async () => {
      const users = await query<any>('SELECT id, name, role FROM users;');
      const missing = users.filter(u => !u.role).length;
      return {
        label: 'Users have roles?',
        ok: missing === 0,
        detail: `${users.length} users, ${missing} missing role`,
        rows: users.slice(0, 5),
      };
    },
  },
  {
    label: 'Team members linked?',
    run: async () => {
      const tm = await query<any>('SELECT * FROM team_members WHERE person_id = NONE OR team_id = NONE;');
      return {
        label: 'Team members linked?',
        ok: tm.length === 0,
        detail: `${tm.length} broken team memberships`,
      };
    },
  },
  {
    label: 'Sites with no stage?',
    run: async () => {
      const rows = await query<any>(`SELECT site_id, stage FROM sites WHERE stage = NONE OR stage = '';`);
      return {
        label: 'Sites with no stage?',
        ok: rows.length === 0,
        detail: `${rows.length} sites missing stage`,
        rows: rows.slice(0, 5),
      };
    },
  },
  {
    label: 'Duplicate site_ids?',
    run: async () => {
      const rows = await query<any>('SELECT site_id, count() AS cnt FROM sites GROUP BY site_id;');
      const dups = rows.filter(r => (r.cnt ?? 0) > 1);
      return {
        label: 'Duplicate site_ids?',
        ok: dups.length === 0,
        detail: `${dups.length} duplicated site_ids`,
        rows: dups.slice(0, 5),
      };
    },
  },
];

export default function DebugPanel() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  // Ctrl+Shift+D toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (currentUser?.role !== 'system_admin') return null;

  const runAll = async () => {
    setRunning(true);
    const out: CheckResult[] = [];
    for (const c of CHECKS) {
      try { out.push(await c.run()); }
      catch (e) { out.push({ label: c.label, ok: false, detail: 'EXCEPTION: ' + (e as Error).message }); }
    }
    setResults(out);
    setRunning(false);
  };

  const runOne = async (idx: number) => {
    setRunning(true);
    try {
      const r = await CHECKS[idx].run();
      setResults(prev => {
        const next = [...prev];
        const existing = next.findIndex(x => x.label === r.label);
        if (existing >= 0) next[existing] = r; else next.push(r);
        return next;
      });
    } finally {
      setRunning(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Debug Panel (Ctrl+Shift+D)"
        className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-slate-800 hover:bg-slate-900 text-white rounded-full shadow-xl flex items-center justify-center"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] bg-white border border-slate-300 rounded-xl shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-bold text-slate-800">Debug Panel</span>
          <span className="text-[10px] text-slate-400 font-mono">Ctrl+Shift+D</span>
        </div>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-slate-200 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">DB Health Checks</h3>
            <button onClick={runAll} disabled={running}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50">
              <Play className="w-3 h-3" /> {running ? '...' : 'Run All'}
            </button>
          </div>
          <div className="space-y-1.5">
            {CHECKS.map((c, idx) => {
              const r = results.find(x => x.label === c.label);
              return (
                <div key={c.label} className={`px-2 py-1.5 rounded border text-xs ${
                  !r ? 'bg-slate-50 border-slate-200' :
                  r.ok ? 'bg-emerald-50 border-emerald-200' :
                         'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 truncate">{c.label}</span>
                    <button onClick={() => runOne(idx)} disabled={running}
                      className="text-[10px] text-blue-600 hover:underline">
                      run
                    </button>
                  </div>
                  {r && <p className="text-[11px] text-slate-600 mt-0.5">{r.detail}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-2">
            Last DB Errors ({dbErrors.length})
          </h3>
          {dbErrors.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">No errors logged.</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {dbErrors.slice(-5).reverse().map((e, i) => (
                <div key={i} className="px-2 py-1.5 bg-red-50 border border-red-200 rounded text-[11px]">
                  <p className="text-slate-500 font-mono text-[10px]">{e.time.toLocaleTimeString()}</p>
                  <p className="text-red-700 font-mono break-all">{e.sql}</p>
                  <p className="text-red-500 mt-0.5">{String(e.error).slice(0, 200)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
