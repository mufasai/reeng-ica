import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Image as ImageIcon, X, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { query } from '../lib/surreal';
import { db } from '../db';

const QUICK_TAGS = ['RRU','Tower','Kabel','Antena','Sebelum','Sesudah','Site'];

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
  caption: string;
  status: 'pending'|'uploading'|'done'|'error';
  error?: string;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const EngineerUpload = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [site, setSite] = useState<any>(null);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string; ok: boolean }>({ show: false, msg: '', ok: true });

  useEffect(() => {
    if (!id) return;
    query<any>(`SELECT * FROM ${id};`).then(rows => setSite(rows[0] ?? null));
  }, [id]);

  const handleFilesPicked = async (filesList: FileList | null) => {
    if (!filesList) return;
    const arr = Array.from(filesList);
    const next: PendingPhoto[] = [];
    for (const file of arr) {
      try {
        const preview = await readFileAsBase64(file);
        next.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
          file, preview, caption: '', status: 'pending',
        });
      } catch (e) {
        console.warn('[upload] failed to read', file.name, e);
      }
    }
    setPhotos(p => [...p, ...next]);
  };

  const removePhoto = (pid: string) => setPhotos(p => p.filter(x => x.id !== pid));
  const setCaption = (pid: string, c: string) => setPhotos(p => p.map(x => x.id === pid ? { ...x, caption: c } : x));
  const addTag = (pid: string, tag: string) =>
    setPhotos(p => p.map(x => x.id === pid ? { ...x, caption: x.caption ? `${x.caption} ${tag}` : tag } : x));

  const upload = async () => {
    if (!site) return;
    setSubmitting(true);
    let okCount = 0, errCount = 0;
    for (const photo of photos) {
      if (photo.status === 'done') { okCount++; continue; }
      setPhotos(p => p.map(x => x.id === photo.id ? { ...x, status: 'uploading' } : x));
      try {
        const base64 = await readFileAsBase64(photo.file);
        console.log('[UPLOAD] file:', photo.file.name, 'size:', photo.file.size, 'base64 length:', base64.length);

        const data = {
          site_id: site.site_id,
          work_order_id: site.id,
          filename: photo.file.name,
          name: photo.file.name,
          file_data: base64,
          mime_type: photo.file.type || 'image/jpeg',
          file_size: photo.file.size,
          size: `${(photo.file.size / 1024).toFixed(0)} KB`,
          category: 'photo',
          tag: 'implementasi',
          caption: photo.caption || '',
          stage_at_upload: site.stage ?? 'implementasi',
          uploaded_by: currentUser?.id ?? 'engineer',
          uploaded_by_name: currentUser?.name ?? 'Engineer',
          uploaded_at: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        };
        const res = await db.query('CREATE site_files CONTENT $data', { data });
        console.log('[UPLOAD] insert result:', res);
        const ok = Array.isArray(res) && res[0] !== undefined &&
          !(typeof res[0] === 'object' && (res[0] as any)?.status === 'ERR');
        if (!ok) throw new Error('insert failed');

        await db.query('CREATE site_stage_logs CONTENT $data', { data: {
          work_order_id: site.id,
          site_id: site.site_id,
          action: `[engineer] Upload foto: '${photo.file.name}'${photo.caption ? ` — ${photo.caption}` : ''}`,
          user_id: currentUser?.id ?? 'engineer',
          user_name: currentUser?.name ?? 'Engineer',
          stage_at_time: site.stage,
          timestamp: new Date().toISOString(),
        }});

        setPhotos(p => p.map(x => x.id === photo.id ? { ...x, status: 'done' } : x));
        okCount++;
      } catch (e) {
        console.error('[upload] insert failed', e);
        setPhotos(p => p.map(x => x.id === photo.id
          ? { ...x, status: 'error', error: (e as Error).message } : x));
        errCount++;
      }
    }
    setSubmitting(false);
    if (errCount === 0) {
      setToast({ show: true, msg: `${okCount} foto berhasil diunggah`, ok: true });
      setTimeout(() => navigate('/engineer'), 1500);
    } else {
      setToast({ show: true, msg: `${okCount} berhasil, ${errCount} gagal`, ok: false });
      setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
    }
  };

  if (!site) {
    return <div className="p-4">Memuat...</div>;
  }

  return (
    <div className="bg-white min-h-screen pb-24">
      {toast.show && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-bold ${
          toast.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                     'bg-red-50 text-red-700 border border-red-200'
        }`}>{toast.msg}</div>
      )}

      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-white sticky top-0 z-20">
        <button onClick={() => navigate(-1)}
          aria-label="Kembali"
          className="p-2.5 -ml-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-slate-800 text-base leading-tight">Upload Foto Implementasi</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {site.atp_number && (
              <span className="font-mono font-black text-[11px] text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
                {site.atp_number}
              </span>
            )}
            <span className="text-xs font-semibold text-slate-600">{site.site_id}</span>
            {site.sector != null && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                S{site.sector}
              </span>
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileRef} type="file" accept="image/*" multiple
        capture="environment"
        onChange={e => { handleFilesPicked(e.target.files); e.target.value = ''; }}
        className="hidden"
      />
      <input
        ref={galleryRef} type="file" accept="image/*" multiple
        onChange={e => { handleFilesPicked(e.target.files); e.target.value = ''; }}
        className="hidden"
      />

      <div className="p-3 space-y-3">
        {/* Primary action — camera. Big, full-width, easy to thumb-tap. */}
        <button onClick={() => fileRef.current?.click()}
          className="w-full flex items-center justify-center gap-3 px-4 py-5 bg-blue-600 text-white rounded-2xl shadow-sm hover:bg-blue-700 active:scale-[0.98] transition">
          <div className="w-11 h-11 bg-white/20 rounded-full flex items-center justify-center">
            <Camera className="w-6 h-6" />
          </div>
          <div className="text-left">
            <p className="font-black text-base leading-tight">Ambil Foto</p>
            <p className="text-blue-100 text-xs">Buka kamera langsung</p>
          </div>
        </button>

        {/* Secondary — gallery */}
        <button onClick={() => galleryRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl active:scale-[0.98] transition">
          <ImageIcon className="w-5 h-5 text-slate-500" />
          <span className="font-bold text-sm">Pilih dari Galeri</span>
        </button>

        {photos.length > 0 && (
          <div className="space-y-3 pt-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
              {photos.length} foto siap diunggah
            </p>
            {photos.map(p => (
              <div key={p.id} className={`relative bg-white rounded-2xl p-3 border-2 shadow-sm ${
                p.status === 'error' ? 'border-red-300' :
                p.status === 'done' ? 'border-emerald-300' : 'border-slate-100'
              }`}>
                <button onClick={() => removePhoto(p.id)}
                  aria-label="Hapus foto"
                  className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 shadow-md z-10 active:scale-90">
                  <X className="w-4 h-4" />
                </button>
                <div className="flex gap-3">
                  <div className="w-28 h-28 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-white relative">
                    <img src={p.preview} alt="upload" className="w-full h-full object-cover" />
                    {p.status === 'done' && (
                      <div className="absolute inset-0 bg-emerald-500/40 flex items-center justify-center">
                        <Check className="w-9 h-9 text-white" />
                      </div>
                    )}
                    {p.status === 'uploading' && (
                      <div className="absolute inset-0 bg-blue-500/40 flex items-center justify-center">
                        <div className="w-7 h-7 border-4 border-white/40 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                    {p.status === 'error' && (
                      <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center">
                        <AlertCircle className="w-9 h-9 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input type="text" value={p.caption}
                      onChange={e => setCaption(p.id, e.target.value)}
                      placeholder="Caption foto (opsional)…"
                      className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-2" />
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_TAGS.map(tag => (
                        <button key={tag} onClick={() => addTag(p.id, tag)}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 shadow-sm hover:bg-slate-100 active:scale-95">
                          {tag}
                        </button>
                      ))}
                    </div>
                    {p.error && <p className="text-[11px] text-red-600 mt-1.5">{p.error}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {photos.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-20">
          <button onClick={upload} disabled={submitting || photos.every(p => p.status === 'done')}
            className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98]">
            {submitting ? 'Mengunggah...' : `Upload ${photos.filter(p => p.status !== 'done').length} Foto →`}
          </button>
        </div>
      )}
    </div>
  );
};

export default EngineerUpload;
