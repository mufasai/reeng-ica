import { db, cleanRecordId } from '../db';

export const today = () => new Date().toISOString().slice(0, 10);

export const rupiah = (n: number | null | undefined) =>
  n == null ? '—' : 'Rp ' + n.toLocaleString('id-ID');

export const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) : '—';

/** Get image type from data URL or filename */
export function getImageType(dataUrl: string, filename?: string): 'png'|'jpg'|'jpeg'|'gif' {
  if (dataUrl?.includes('image/png')) return 'png';
  if (dataUrl?.includes('image/gif')) return 'gif';
  const ext = (filename ?? dataUrl ?? '').split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'png';
  if (ext === 'gif') return 'gif';
  return 'jpg';
}

// ── SCHEMA NORMALIZERS ──────────────────────────────────────────────────────
/**
 * Normalizes a site_files record to a consistent shape.
 * Handles the two real schemas found in the DB:
 *   - New uploads: filename, mime_type, file_data, uploaded_at, file_size (int)
 *   - Old uploads: name, timestamp, size (string "1.1 MB"), no file_data
 */
export function normalizeFileRecord(f: any): {
  id: string;
  filename: string;
  mime_type: string;
  tag: string;
  file_data: string | null;
  file_size: number | null;
  uploaded_by: string;
  uploaded_at: string;
  site_id: string;
  work_order_id: string;
  category: string;
} {
  // Resolve filename: new schema has "filename", old schema has "name"
  const filename = f.filename || f.name || 'file';
  // Resolve mime_type from field or guess from filename
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const guessedMime = ext === 'png' ? 'image/png'
    : ['jpg','jpeg'].includes(ext) ? 'image/jpeg'
    : ext === 'pdf' ? 'application/pdf'
    : ext === 'gif' ? 'image/gif'
    : ext === 'webp' ? 'image/webp'
    : 'application/octet-stream';
  const mime_type = f.mime_type || f.type || guessedMime;
  // Resolve timestamp: new schema "uploaded_at", old schema "timestamp"
  const uploaded_at = f.uploaded_at || f.timestamp || '';
  // Resolve file size: new schema is integer bytes, old schema is "1.1 MB" string
  const file_size = typeof f.file_size === 'number' ? f.file_size
    : typeof f.size === 'string' ? null // can't reliably convert "1.1 MB" back to bytes
    : null;
  // Resolve uploader
  const uploaded_by = f.uploaded_by_name || f.uploaded_by || '—';

  return {
    id: cleanRecordId(f.id, String(f.id)),
    filename,
    mime_type,
    tag: f.tag || f.category || '—',
    file_data: f.file_data || null,   // may be null on old records
    file_size,
    uploaded_by,
    uploaded_at,
    site_id: f.site_id || '',
    work_order_id: cleanRecordId(f.work_order_id, ''),
    category: f.category || (mime_type.startsWith('image/') ? 'photo' : 'document'),
  };
}

export async function fileDataToUint8Array(
  fileData: string | null | undefined,
  filename?: string
): Promise<{ data: Uint8Array; type: 'png'|'jpg'|'jpeg'|'gif' } | null> {
  try {
    if (!fileData) return null;

    // Case 1: proper base64 data URL
    if (fileData.startsWith('data:')) {
      const base64 = fileData.split(',')[1];
      if (!base64) return null;
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { data: bytes, type: getImageType(fileData, filename) };
    }

    // Case 2: raw base64 without data: prefix (check first 100 chars)
    if (/^[A-Za-z0-9+/]+=*$/.test(fileData.slice(0, 100))) {
      try {
        const binary = atob(fileData);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return { data: bytes, type: getImageType('', filename) };
      } catch { /* not valid base64 */ }
    }

    // Case 3: URL — fetch the image
    if (fileData.startsWith('http') || fileData.startsWith('/')) {
      const res = await fetch(fileData);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return { data: new Uint8Array(buf), type: getImageType(res.headers.get('content-type') ?? '', filename) };
    }

    return null;
  } catch (err) {
    console.warn('[EXPORT] Failed to convert file:', filename, err);
    return null;
  }
}

// Kept for backwards compatibility
export function base64ToUint8Array(base64: string): Uint8Array {
  const raw = base64.startsWith('data:') ? base64.split(',')[1] : base64;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function fetchPengajuan(siteId: string, recordId: string): Promise<any[]> {
  const results = await Promise.allSettled([
    // Pattern 1: pengajuan table, site_id string (most common real schema)
    db.query(`SELECT * FROM pengajuan WHERE site_id = '${siteId}' ORDER BY submitted_at ASC;`),
    // Pattern 2: pengajuan table, site_record_id record link
    db.query(`SELECT * FROM pengajuan WHERE site_record_id = ${recordId} ORDER BY submitted_at ASC;`),
    // Pattern 3: termins table (older schema)
    db.query(`SELECT * FROM termins WHERE site_id = '${siteId}' ORDER BY created_at ASC;`),
    // Pattern 4: termins with record link
    db.query(`SELECT * FROM termins WHERE site_record_id = ${recordId} ORDER BY created_at ASC;`),
  ]);

  const all: any[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0 && Array.isArray(r.value[0])) {
      all.push(...(r.value[0] as any[]));
    }
  }

  // Deduplicate by id
  return all.filter((v, i, a) => a.findIndex(x => String(x.id) === String(v.id)) === i);
}

async function fetchSiteFiles(siteId: string, recordId: string): Promise<any[]> {
  const results = await Promise.allSettled([
    // Pattern 1: site_id as string (old uploads)
    db.query(`SELECT * FROM site_files WHERE site_id = '${siteId}';`),
    // Pattern 2: work_order_id as record link (new uploads)
    db.query(`SELECT * FROM site_files WHERE work_order_id = ${recordId};`),
    // Pattern 3: site_id as record link (mixed old uploads)
    db.query(`SELECT * FROM site_files WHERE site_id = ${recordId};`),
  ]);

  const all: any[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0 && Array.isArray(r.value[0])) {
      all.push(...(r.value[0] as any[]));
    }
  }

  // Deduplicate by id, then normalize to consistent schema
  const seen = new Set();
  return all
    .filter(f => {
      const key = String(f.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(normalizeFileRecord);
}

/** Fetch all data needed for one ATP export */
export async function fetchAtpExportData(siteId: string) {
  console.log('[EXPORT] Fetching data for site_id:', siteId);

  // Find the sites record using site_id string (the real FK)
  const siteRes = await db.query(`SELECT * FROM sites WHERE site_id = '${siteId}' LIMIT 1;`)
    .catch(() => []);
  
  const site = (siteRes as any[])?.[0]?.[0] ?? null;
  console.log('[EXPORT] site found:', !!site, '| id:', site?.id, '| site_id:', site?.site_id);

  // Get the SurrealDB record ID string (e.g. "sites:n7u07pyp3oxsome5ed33")
  const recordId = site?.id ? cleanRecordId(site.id, `sites:${siteId}`) : `sites:${siteId}`;
  console.log('[EXPORT] using recordId:', recordId);

  // Fetch files with real schema handling
  const files = await fetchSiteFiles(siteId, recordId);
  console.log('[EXPORT] files found:', files.length, '| with file_data:', files.filter(f => !!f.file_data).length);
  if (files.length > 0) {
    console.log('[EXPORT] sample file:', {
      filename: files[0].filename,
      tag: files[0].tag,
      has_data: !!files[0].file_data,
      uploaded_at: files[0].uploaded_at,
    });
  }

  // Fetch pengajuan
  const pengajuan = await fetchPengajuan(siteId, recordId);
  console.log('[EXPORT] pengajuan found:', pengajuan.length);
  if (pengajuan.length > 0) {
    console.log('[EXPORT] sample pengajuan:', {
      id: String(pengajuan[0].id),
      termin_ke: pengajuan[0].termin_ke,
      jumlah: pengajuan[0].jumlah,
      status: pengajuan[0].status,
    });
  }

  // Fetch stage logs — handles both Schema A and Schema B
  const [logsBySiteId, logsByRecordId] = await Promise.allSettled([
    db.query(`SELECT * FROM site_stage_logs WHERE site_id = '${siteId}' ORDER BY created_at, timestamp ASC;`),
    db.query(`SELECT * FROM site_stage_logs WHERE work_order_id = ${recordId} ORDER BY timestamp ASC;`),
  ]);
  const allLogs = [
    ...((logsBySiteId.status === 'fulfilled' ? (logsBySiteId.value as any[])?.[0] : null) || []),
    ...((logsByRecordId.status === 'fulfilled' ? (logsByRecordId.value as any[])?.[0] : null) || []),
  ];
  // Normalize logs to consistent shape (both Schema A and B)
  const seenLogs = new Set();
  const stageLog = allLogs
    .filter(l => {
      const k = String(l.id);
      if (seenLogs.has(k)) return false;
      seenLogs.add(k);
      return true;
    })
    .map(l => ({
      id: String(l.id),
      previous_stage: l.from_stage ?? l.stage_at_time ?? '—',
      new_stage:      l.to_stage ?? l.action ?? '—',
      changed_by:     l.changed_by ?? l.user_name ?? '—',
      created_at:     l.created_at ?? l.timestamp ?? '',
      notes:          l.notes ?? '',
    }));

  // Categorize files
  const photos = files.filter(f =>
    f.mime_type.startsWith('image/') ||
    ['jpg','jpeg','png','gif','webp'].includes(f.filename.split('.').pop()?.toLowerCase() ?? '')
  );
  const docs = files.filter(f => !photos.find(p => p.id === f.id));

  console.log('[EXPORT] photos:', photos.length, '| docs:', docs.length);

  return { site, pengajuan, stageLog, files, photos, docs };
}
