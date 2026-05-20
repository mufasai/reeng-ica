import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, WidthType, BorderStyle,
  ShadingType, VerticalAlign, PageBreak,
} from 'docx';
import { query } from './surreal';

// A4 dimensions (DXA). Margins: 1440 each side (1 inch).
// Content width = 11906 - 1440 - 1440 = 9026 DXA
const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = 1440;
const CONT_W = PAGE_W - MARGIN * 2;          // 9026
const HALF_W = Math.floor(CONT_W / 2);       // 4513 — each photo column


// ── Formatters ────────────────────────────────────────
export const today = () => new Date().toISOString().slice(0, 10);
export const fDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fRp = (n?: number | null) =>
  n == null ? '—' : 'Rp ' + Number(n).toLocaleString('id-ID');

// ── Image resize via canvas (prevents corrupt DOCX from oversized raw images) ──
// Loads file_data (base64 data URL, raw base64, or URL), resizes to maxWidth px,
// returns a Uint8Array PNG — always smaller than original, safe for docx ImageRun.
export async function loadImage(
  fileData: string | null | undefined,
  filename: string,
  maxWidth = 900
): Promise<{ data: Uint8Array; type: 'png' } | null> {
  if (!fileData) return null;
  try {
    let src: string;
    if (fileData.startsWith('data:')) {
      src = fileData;
    } else if (fileData.startsWith('http') || fileData.startsWith('/')) {
      src = fileData;
    } else if (/^[A-Za-z0-9+/]+=*$/.test(fileData.slice(0, 100))) {
      src = `data:image/png;base64,${fileData}`;
    } else {
      console.warn('[export] unknown file_data format for:', filename);
      return null;
    }

    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          canvas.toBlob(async (blob) => {
            if (!blob) { resolve(null); return; }
            const buf = await blob.arrayBuffer();
            resolve({ data: new Uint8Array(buf), type: 'png' });
          }, 'image/png', 0.88);
        } catch (err) {
          console.warn('[export] canvas resize failed:', filename, err);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.warn('[export] image load failed:', filename);
        resolve(null);
      };
      img.src = src;
    });
  } catch (e) {
    console.warn('[export] loadImage error:', filename, e);
    return null;
  }
}


// ── Multi-pattern SurrealDB query (handles both ID formats) ──
export async function fetchSiteData(siteId: string) {
  const [byStr, byRec] = await Promise.allSettled([
    query(`SELECT * FROM sites WHERE site_id = '${siteId}' LIMIT 1;`),
    query(`SELECT * FROM sites:${siteId};`),
  ]);
  const site =
    (byStr.status === 'fulfilled' ? (byStr.value as any[])[0] : null) ??
    (byRec.status === 'fulfilled' ? (byRec.value as any[])[0] : null);
  if (!site) return null;

  const recId = site.id as string;

  const filesResults = await Promise.allSettled([
    query(`SELECT * FROM site_files WHERE site_id = '${siteId}' ORDER BY uploaded_at ASC;`),
    query(`SELECT * FROM site_files WHERE site_id = ${recId} ORDER BY uploaded_at ASC;`),
  ]);
  const allFiles = [
    ...((filesResults[0].status === 'fulfilled' ? filesResults[0].value : []) as any[]),
    ...((filesResults[1].status === 'fulfilled' ? filesResults[1].value : []) as any[]),
  ];
  const files = allFiles.filter((f, i, a) => a.findIndex(x => x.id === f.id) === i);

  const pqResults = await Promise.allSettled([
    query(`SELECT * FROM pengajuan WHERE site_id = '${siteId}' ORDER BY created_at ASC;`),
    query(`SELECT * FROM pengajuan WHERE site_record_id = ${recId} ORDER BY created_at ASC;`),
    query(`SELECT * FROM termins WHERE site_id = '${siteId}' ORDER BY created_at ASC;`),
    query(`SELECT * FROM termins WHERE site_record_id = ${recId} ORDER BY created_at ASC;`),
  ]);
  const allPQ = pqResults.flatMap(r => r.status === 'fulfilled' ? (r.value as any[]) : []);
  const pengajuanRaw = allPQ.filter((p, i, a) => a.findIndex(x => x.id === p.id) === i);

  const pengajuan = pengajuanRaw.map((p: any) => ({
    no:           p.termin_ke ?? p.no ?? '—',
    type:         p.type_pengajuan ?? p.type_termin ?? p.tipe ?? '—',
    jumlah:       Number(p.jumlah ?? p.amount ?? p.nominal ?? 0),
    keterangan:   p.keterangan ?? p.description ?? p.notes ?? '—',
    status:       p.status ?? '—',
    submitted_by: p.submitted_by ?? p.created_by ?? '—',
    submitted_at: p.submitted_at ?? p.created_at ?? '',
    approved_by:  p.approved_by ?? '—',
    approved_at:  p.approved_at ?? '',
    paid_at:      p.paid_at ?? p.tgl_terima ?? '',
    pengajuan_id: p.id,
  }));

  const logResult = await Promise.allSettled([
    query(`SELECT * FROM site_stage_logs WHERE site_id = '${siteId}' ORDER BY created_at ASC;`),
    query(`SELECT * FROM site_stage_log WHERE site_id = '${siteId}' ORDER BY created_at ASC;`),
  ]);
  const stageLog = logResult.flatMap(r => r.status === 'fulfilled' ? (r.value as any[]) : [])
    .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);

  const isPhoto = (f: any) =>
    f.mime_type?.startsWith('image/') ||
    ['jpg','jpeg','png','gif','webp'].includes((f.filename?.split('.').pop() ?? '').toLowerCase());
  const photos = files.filter(isPhoto);
  const docs   = files.filter(f => !isPhoto(f));

  return { site, files, photos, docs, pengajuan, stageLog, recId };
}

// ── DOCX helpers ──────────────────────────────────────
const bdr = { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' };
const borders = { top: bdr, bottom: bdr, left: bdr, right: bdr };
const nobdr = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: nobdr, bottom: nobdr, left: nobdr, right: nobdr };
const cellPad = { top: 100, bottom: 100, left: 140, right: 140 };

const spacer = (n = 100) => new Paragraph({ spacing: { before: n, after: n }, children: [] });

const h1 = (text: string) => new Paragraph({
  pageBreakBefore: false,
  spacing: { before: 280, after: 120 },
  children: [new TextRun({ text, bold: true, size: 28, color: '1E3A5F', font: 'Arial' })],
});

const h2 = (text: string) => new Paragraph({
  spacing: { before: 180, after: 80 },
  children: [new TextRun({ text, bold: true, size: 22, color: '2563EB', font: 'Arial' })],
});

const kv = (label: string, value: string) => new Table({
  width: { size: CONT_W, type: WidthType.DXA },
  columnWidths: [2600, CONT_W - 2600],
  rows: [new TableRow({ children: [
    new TableCell({
      borders, width: { size: 2600, type: WidthType.DXA }, margins: cellPad,
      shading: { fill: 'F0F2F5', type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, font: 'Arial' })] })],
    }),
    new TableCell({
      borders, width: { size: CONT_W - 2600, type: WidthType.DXA }, margins: cellPad,
      children: [new Paragraph({ children: [new TextRun({ text: value || '—', size: 18, font: 'Arial' })] })],
    }),
  ]})],
});

// Photo table — 2 per row, canvas-resized image + caption in each cell
async function photoTable(photos: any[], heading?: string): Promise<(Paragraph | Table)[]> {
  if (!photos.length) return [];
  const out: (Paragraph | Table)[] = [];
  if (heading) out.push(h2(heading), spacer(60));

  for (let i = 0; i < photos.length; i += 2) {
    const pair = [photos[i], photos[i + 1]].filter(Boolean);
    const cells = await Promise.all(pair.map(async (photo) => {
      const cellChildren: Paragraph[] = [];
      // Resolve field aliases: old schema uses 'name', new uses 'filename'
      const fname = photo.filename ?? photo.name ?? 'foto';
      const fileData = photo.file_data;
      // Resolve date: old schema 'timestamp', new 'uploaded_at'
      const dateStr = photo.uploaded_at ?? photo.timestamp ?? photo.date ?? '';
      // Resolve uploader
      const uploader = photo.uploaded_by_name ?? photo.uploaded_by ?? '';

      const img = await loadImage(fileData, fname, 900);
      if (img) {
        // 220pt × 165pt (≈ 4:3 ratio). Safe size for A4 half-column.
        cellChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new ImageRun({
            type: 'png',
            data: img.data,
            transformation: { width: 220, height: 165 },
          } as any)],
        }));
      } else {
        cellChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '[Foto tidak dapat dimuat]', italics: true, color: '9CA3AF', size: 16, font: 'Arial' })],
        }));
      }
      cellChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60 },
          children: [new TextRun({ text: fname, size: 16, font: 'Arial' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: [(photo.tag ?? 'foto').toUpperCase(), dateStr ? fDate(dateStr) : '', uploader]
              .filter(Boolean).join(' | '),
            size: 14, color: '9CA3AF', font: 'Arial',
          })],
        }),
      );
      return new TableCell({
        borders, width: { size: HALF_W, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        verticalAlign: VerticalAlign.TOP,
        children: cellChildren,
      });
    }));

    if (cells.length === 1) cells.push(new TableCell({
      borders: noBorders, width: { size: HALF_W, type: WidthType.DXA },
      children: [new Paragraph({ children: [] })],
    }));

    out.push(new Table({
      width: { size: CONT_W, type: WidthType.DXA },
      columnWidths: [HALF_W, HALF_W],
      rows: [new TableRow({ children: cells })],
    }), spacer(80));
  }
  return out;
}

// ── EXCEL EXPORT: per ATP ─────────────────────────────
export async function exportAtpExcel(siteId: string): Promise<void> {
  const data = await fetchSiteData(siteId);
  if (!data) { alert('Site tidak ditemukan'); return; }
  const { site, pengajuan: pq, stageLog, files } = data;
  const atpNum = site.atp_number ?? siteId;
  const wb = XLSX.utils.book_new();
  const HS = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1E3A5F' } } };
  const LS = { font: { bold: true }, fill: { fgColor: { rgb: 'F0F2F5' } } };

  // Sheet 1: Info
  const info: any[][] = [
    [{ v: `LAPORAN ATP — ${atpNum}`, s: { font: { bold: true, sz: 14, color: { rgb: '1E3A5F' } } } }], [''],
  ];
  const addKV = (l: string, v: any) => info.push([{ v: l, s: LS }, { v: String(v ?? '—') }]);
  ([
    ['Site ID', site.site_id], ['Site Name', site.site_name], ['Project Type', site.project_type],
    ['Region', site.region], ['Tower Provider', site.tp_name], ['Sector', site.sector],
    ['IOMS', site.ioms_registered ? 'Registered' : 'Not Registered'],
    ['ATP Number', site.atp_number], ['PO Number', site.po_number], ['SOW ID', site.sow_id],
    ['Stage', site.stage], ['Batch', site.batch], ['Priority', site.priority],
    ['Latitude', site.latitude], ['Longitude', site.longitude],
  ] as [string, any][]).forEach(([l, v]) => addKV(l, v));

  info.push([''], [{ v: 'PERMIT', s: LS }], ['']);
  ([
    ['Permit Status', site.permit_status], ['Create Date', fDate(site.permit_create_date)],
    ['Permit Start', fDate(site.permit_start_date)], ['Permit Expiry', fDate(site.permit_expiry_date)],
    ['PIC Nama', site.pic_nama], ['PIC Telp', site.pic_telp], ['Jenis Kunci', site.jenis_kunci],
  ] as [string, any][]).forEach(([l, v]) => addKV(l, v));

  info.push([''], [{ v: 'IMPLEMENTASI', s: LS }], ['']);
  ([
    ['Impl Status', site.impl_status], ['Team', site.team_name],
    ['CI', site.ci_date ? `${site.ci_date} ${site.ci_time ?? ''}` : '—'],
    ['CO', site.co_date ? `${site.co_date} ${site.co_time ?? ''}` : '—'],
    ['RFI Done', site.impl_rfi_done ? 'Ya' : 'Tidak'], ['Note Impl', site.note_impl],
  ] as [string, any][]).forEach(([l, v]) => addKV(l, v));

  if (site.project_type === 'COMBAT' && site.combat_impl_steps) {
    info.push([''], [{ v: 'COMBAT SUBSTEPS', s: LS }], ['']);
    const steps = ['sitac','dimentle_cruz','towing','psb_pln','instal_cruz','optim'];
    const labels = ['SITAC','Dimentle Cruz','Towing','PSB PLN','Instal Cruz','OPTIM'];
    steps.forEach((k, i) => {
      const s = site.combat_impl_steps[k];
      addKV(labels[i], s ? `${(s.status ?? '').toUpperCase()} | ${fDate(s.date)} | ${s.person ?? '—'}` : '—');
    });
  }
  info.push([''], [{ v: 'ATP & DOKUMEN', s: LS }], ['']);
  ([
    ['ATP Status', site.atp_status], ['PDID', site.pdid], ['Tiket ATP', site.tiket_atp],
  ] as [string, any][]).forEach(([l, v]) => addKV(l, v));

  const ws1 = XLSX.utils.aoa_to_sheet(info);
  ws1['!cols'] = [{ wch: 22 }, { wch: 50 }];
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Info ATP');

  // Sheet 2: Pengajuan
  const pqHdr = ['No','Tipe','Jumlah (Rp)','Keterangan','Status',
                 'Submitted By','Submitted At','Approved By','Approved At','Paid At'];
  const ws2 = XLSX.utils.aoa_to_sheet([
    [{ v: 'PENGAJUAN PEMBAYARAN', s: { font: { bold: true, sz: 12 } } }], [''],
    pqHdr.map(h => ({ v: h, s: HS })),
    ...pq.map(p => [p.no, p.type, p.jumlah, p.keterangan, p.status,
      p.submitted_by, fDate(p.submitted_at), p.approved_by, fDate(p.approved_at), fDate(p.paid_at)]),
  ]);
  ws2['!cols'] = [3,18,16,35,12,18,14,18,14,14].map(w => ({ wch: w }));
  ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Pengajuan');

  // Sheet 3: Stage log
  const ws3 = XLSX.utils.aoa_to_sheet([
    [{ v: 'RIWAYAT STAGE', s: { font: { bold: true, sz: 12 } } }], [''],
    ['Dari Stage','Ke Stage','Oleh','Waktu','Catatan'].map(h => ({ v: h, s: HS })),
    ...stageLog.map((l: any) => [l.previous_stage ?? '—', l.new_stage ?? l.stage ?? '—',
      l.changed_by ?? '—', fDate(l.created_at), l.notes ?? '']),
  ]);
  ws3['!cols'] = [18,18,18,20,40].map(w => ({ wch: w }));
  ws3['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Riwayat Stage');

  // Sheet 4: File list (metadata only)
  const ws4 = XLSX.utils.aoa_to_sheet([
    [{ v: 'DAFTAR FILE & DOKUMEN', s: { font: { bold: true, sz: 12 } } }], [''],
    ['Filename','Kategori','Tipe','Ukuran','Upload Oleh','Tanggal'].map(h => ({ v: h, s: HS })),
    ...files.map((f: any) => [f.filename, f.tag ?? '—', f.mime_type ?? '—',
      f.file_size ? `${Math.round(f.file_size/1024)} KB` : '—', f.uploaded_by ?? '—', fDate(f.uploaded_at)]),
  ]);
  ws4['!cols'] = [35,18,18,10,18,16].map(w => ({ wch: w }));
  ws4['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  XLSX.utils.book_append_sheet(wb, ws4, 'File & Dokumen');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `Export_ATP_${atpNum}_${today()}.xlsx`);
}

// ── DOCX LAPORAN: per ATP ─────────────────────────────
export async function exportAtpDocx(siteId: string): Promise<void> {
  const data = await fetchSiteData(siteId);
  if (!data) { alert('Site tidak ditemukan'); return; }
  const { site, photos, pengajuan: pq } = data;
  const atpNum = site.atp_number ?? siteId;

  console.log('[EXPORT DOCX] photos:', photos.length, 'pengajuan:', pq.length);
  if (photos[0]?.file_data) {
    console.log('[EXPORT DOCX] photo file_data sample:', String(photos[0].file_data).slice(0, 50));
  }

  const ph = (tag: string) => photos.filter((f: any) => (f.tag ?? '').includes(tag));

  const children: (Paragraph | Table)[] = [
    // Cover
    new Paragraph({
      alignment: AlignmentType.CENTER, pageBreakBefore: false,
      spacing: { before: 1200, after: 200 },
      children: [new TextRun({ text: 'LAPORAN PEKERJAAN ATP', bold: true, size: 52, color: '1E3A5F', font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: atpNum, bold: true, size: 36, color: '2563EB', font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: `${site.project_type} — ${site.site_name ?? site.site_id}`, size: 24, color: '6B7280', font: 'Arial' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 1600 },
      children: [new TextRun({ text: `Tanggal: ${fDate(new Date().toISOString())}`, size: 20, color: '9CA3AF', font: 'Arial' })],
    }),
    new Paragraph({ children: [new PageBreak()] }),

    // Section 1
    h1('1. Informasi Site & ATP'), spacer(),
    ...([
      ['Site ID', site.site_id], ['Site Name', site.site_name ?? '—'],
      ['Project Type', site.project_type], ['Region', site.region],
      ['Tower Provider', site.tp_name], ['Sector', String(site.sector ?? '—')],
      ['IOMS', site.ioms_registered ? 'Registered' : 'Not Registered'],
      ['ATP Number', site.atp_number], ['PO Number', site.po_number],
      ['SOW ID', site.sow_id], ['Stage', site.stage],
    ] as [string, any][]).map(([l, v]) => kv(l, String(v ?? '—'))),
    spacer(), new Paragraph({ children: [new PageBreak()] }),

    // Section 2: Permit
    h1('2. Tahap Permit'), spacer(),
    ...([
      ['Permit Status', site.permit_status],
      ['Create Date', fDate(site.permit_create_date)],
      ['Permit Start', fDate(site.permit_start_date)],
      ['Permit Expiry', fDate(site.permit_expiry_date)],
      ['TPAS', site.tpas_number], ['TP', site.tp_number], ['CAF', site.caf_number],
      ['PIC Nama', site.pic_nama], ['PIC Telp', site.pic_telp], ['Jenis Kunci', site.jenis_kunci],
    ] as [string, any][]).map(([l, v]) => kv(l, String(v ?? '—'))),
    spacer(),
    ...(await photoTable(ph('permit'), 'Foto Permit')),
    new Paragraph({ children: [new PageBreak()] }),

    // Section 3: Implementasi
    h1('3. Tahap Implementasi'), spacer(),
    ...([
      ['Impl Status', site.impl_status], ['Team', site.team_name],
      ['CI', site.ci_date ? `${site.ci_date} ${site.ci_time ?? ''}` : '—'],
      ['CO', site.co_date ? `${site.co_date} ${site.co_time ?? ''}` : '—'],
      ['RFI Done', site.impl_rfi_done ? 'Ya' : 'Tidak'], ['Note', site.note_impl],
    ] as [string, any][]).map(([l, v]) => kv(l, String(v ?? '—'))),
    spacer(),
  ];

  if (site.project_type === 'COMBAT' && site.combat_impl_steps) {
    const steps = ['sitac','dimentle_cruz','towing','psb_pln','instal_cruz','optim'];
    const labels = ['SITAC','Dimentle Cruz','Towing','PSB PLN','Instal Cruz','OPTIM'];
    for (let si = 0; si < steps.length; si++) {
      const k = steps[si], lbl = labels[si];
      const s = site.combat_impl_steps[k];
      children.push(
        h2(`${lbl} — ${(s?.status ?? 'pending').toUpperCase()}`),
        kv('Tanggal', fDate(s?.date)), kv('Person', s?.person ?? '—'), kv('Notes', s?.notes ?? '—'),
        spacer(),
        ...(await photoTable(ph(`impl_${k}`))),
      );
    }
  } else {
    children.push(...(await photoTable(ph('impl'), 'Foto Implementasi')));
  }
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Section 4: ATP
  children.push(
    h1('4. ATP & Dokumen'), spacer(),
    ...([
      ['ATP Status', site.atp_status], ['PDID', site.pdid],
      ['Tiket ATP', site.tiket_atp], ['Note', site.note_atp],
    ] as [string, any][]).map(([l, v]) => kv(l, String(v ?? '—'))),
    spacer(),
    ...(await photoTable(ph('atp'), 'Foto ATP / Tagging')),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // Section 5: Pengajuan
  children.push(h1('5. Pengajuan & Pembayaran'), spacer());
  if (!pq.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Belum ada pengajuan pembayaran.', italics: true, color: '9CA3AF', size: 18, font: 'Arial' })],
    }));
  } else {
    const totalDiajukan = pq.reduce((s, p) => s + p.jumlah, 0);
    const totalDibayar  = pq.filter(p => p.status === 'paid').reduce((s, p) => s + p.jumlah, 0);
    children.push(
      kv('Total Diajukan', fRp(totalDiajukan)),
      kv('Total Dibayar',  fRp(totalDibayar)),
      spacer(),
    );
    const COL = [500, 1800, 1400, 2700, 1300, 1326]; // sum = 9026
    children.push(new Table({
      width: { size: CONT_W, type: WidthType.DXA },
      columnWidths: COL,
      rows: [
        new TableRow({
          tableHeader: true,
          children: ['No','Tipe','Jumlah','Keterangan','Status','Tanggal'].map((h, ci) =>
            new TableCell({
              borders, width: { size: COL[ci], type: WidthType.DXA }, margins: cellPad,
              shading: { fill: '1E3A5F', type: ShadingType.CLEAR },
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })] })],
            }),
          ),
        }),
        ...pq.map(p => new TableRow({
          children: [String(p.no), p.type, p.jumlah.toLocaleString('id-ID'),
            p.keterangan, p.status, fDate(p.submitted_at)].map((val, ci) =>
              new TableCell({
                borders, width: { size: COL[ci], type: WidthType.DXA }, margins: cellPad,
                children: [new Paragraph({ children: [new TextRun({ text: String(val ?? '—'), size: 16, font: 'Arial' })] })],
              }),
            ),
        })),
      ],
    }));
    const bbPhotos = photos.filter((f: any) =>
      f.tag === 'bukti_bayar' || f.tag === 'payment_proof' || f.pengajuan_id,
    );
    if (bbPhotos.length) {
      children.push(spacer(), ...(await photoTable(bbPhotos, 'Bukti Pembayaran')));
    }
  }
  children.push(new Paragraph({ children: [new PageBreak()] }));

  // Section 6: Appendix
  if (photos.length) {
    children.push(h1('6. Lampiran: Semua Foto'), spacer());
    children.push(...(await photoTable(photos)));
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 20 } } },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Arial', color: '1E3A5F' },
          paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 22, bold: true, font: 'Arial', color: '2563EB' },
          paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children,
    }],
  });

  try {
    const blob = await Packer.toBlob(doc);
    if (!blob || blob.size < 1000) {
      throw new Error(`Dokumen terlalu kecil (${blob?.size ?? 0} bytes) — kemungkinan corrupt.`);
    }
    console.log('[EXPORT DOCX] Success, blob size:', blob.size, 'bytes');
    saveAs(blob, `Laporan_ATP_${atpNum}_${today()}.docx`);
  } catch (e) {
    console.error('[EXPORT DOCX]', e);
    alert('Gagal membuat DOCX: ' + (e as Error).message);
  }
}
