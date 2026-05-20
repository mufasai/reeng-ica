import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, VerticalAlign, PageBreak
} from 'docx';
import { saveAs } from 'file-saver';
import { fetchAtpExportData, formatDate, rupiah, today } from './exportHelpers';

// ── CANVAS IMAGE RESIZE HELPER ─────────────────────────────────────────────
/**
 * Loads file_data (base64 data URL, raw base64, or HTTP URL) into a canvas,
 * resizes to max 900px wide, and returns a Uint8Array PNG ready for ImageRun.
 * This prevents corrupt DOCX from oversized raw images.
 */
async function fileDataToImageBytes(
  fileData: string,
  filename: string,
  maxWidth = 900
): Promise<{ data: Uint8Array; type: 'png' } | null> {
  try {
    if (!fileData) return null;

    let src: string;
    if (fileData.startsWith('data:')) {
      src = fileData;
    } else if (fileData.startsWith('http') || fileData.startsWith('/')) {
      src = fileData;
    } else if (/^[A-Za-z0-9+/]+=*$/.test(fileData.slice(0, 100))) {
      src = `data:image/png;base64,${fileData}`;
    } else {
      console.warn('[EXPORT] Unknown file_data format:', filename);
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
          console.warn('[EXPORT] Canvas resize failed:', filename, err);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.warn('[EXPORT] Image load failed:', filename);
        resolve(null);
      };
      img.src = src;
    });
  } catch (err) {
    console.warn('[EXPORT] fileDataToImageBytes error:', filename, err);
    return null;
  }
}

// Normalize Pengajuan (used by both DOCX and Excel)
export function normalizePengajuan(raw: any): {
  no: string|number, type: string, jumlah: number,
  keterangan: string, status: string,
  submitted_by: string, submitted_at: string,
  approved_by: string, approved_at: string, paid_at: string
} {
  return {
    no:           raw.termin_ke ?? raw.no ?? '—',
    type:         raw.type_pengajuan ?? raw.type_termin ?? raw.tipe ?? '—',
    jumlah:       Number(raw.jumlah ?? raw.amount ?? raw.nominal ?? 0),
    keterangan:   raw.keterangan ?? raw.description ?? raw.notes ?? '—',
    status:       raw.status ?? '—',
    submitted_by: raw.submitted_by ?? raw.created_by ?? '—',
    submitted_at: raw.submitted_at ?? raw.created_at ?? '',
    approved_by:  raw.approved_by ?? raw.reviewed_by ?? '—',
    approved_at:  raw.approved_at ?? raw.reviewed_at ?? '',
    paid_at:      raw.paid_at ?? raw.tgl_bayar ?? raw.tgl_terima ?? '',
  };
}

// Page dimensions (A4, 1-inch margins)
// Content width = 11906 - 1440 - 1440 = 9026 DXA
const CONTENT_W = 9026;
const HALF_W    = Math.floor(CONTENT_W / 2);  // 4513 DXA per photo column
// Image max width per cell in EMU (DXA × 914400 / 1440)
const IMG_W_EMU = Math.floor(HALF_W * 914400 / 1440) - 100000;  // ~2.8 inches, small margin

const border = { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
                   left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

// ── TEXT HELPERS ──────────────────────────────────────────
const H1 = (text: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 140 },
    children: [new TextRun({ text, bold: true, size: 28, color: '1E3A5F', font: 'Arial' })]
  });

const H2 = (text: string) =>
  new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, color: '2563EB', font: 'Arial' })]
  });

const kv = (label: string, value: string) =>
  new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [2400, CONTENT_W - 2400],
    rows: [new TableRow({ children: [
      new TableCell({
        borders, width: { size: 2400, type: WidthType.DXA },
        margins: cellMargins,
        shading: { fill: 'F0F2F5', type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, font: 'Arial' })] })]
      }),
      new TableCell({
        borders, width: { size: CONTENT_W - 2400, type: WidthType.DXA },
        margins: cellMargins,
        children: [new Paragraph({ children: [new TextRun({ text: value || '—', size: 18, font: 'Arial' })] })]
      })
    ]})]
  });

const spacer = () => new Paragraph({ spacing: { before: 80, after: 80 }, children: [] });

// ── PHOTO TABLE (2 per row, canvas-resized) ──────────────────────────────
async function buildPhotoTable(photos: any[], sectionLabel?: string): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = [];
  if (sectionLabel) elements.push(H2(sectionLabel));

  if (!photos || photos.length === 0) {
    elements.push(new Paragraph({
      children: [new TextRun({ text: 'Tidak ada foto.', italics: true, color: '888888', size: 20 })]
    }));
    return elements;
  }

  // Process in pairs
  for (let i = 0; i < photos.length; i += 2) {
    const pair = [photos[i], photos[i + 1]].filter(Boolean);
    const cells = await Promise.all(pair.map(async (photo) => {
      // Resolve field aliases across both old and new schema
      const fname    = photo.filename || photo.name || 'foto';
      const fileData = photo.file_data;
      const uploader = photo.uploaded_by_name || photo.uploaded_by || '';
      const dateStr  = photo.uploaded_at || photo.timestamp || photo.date || '';
      const caption  = [uploader, dateStr ? formatDate(dateStr) : ''].filter(Boolean).join(' · ');

      const cellChildren: Paragraph[] = [];

      // Try to load + resize image via canvas
      let imageRun: ImageRun | null = null;
      if (fileData) {
        try {
          const result = await fileDataToImageBytes(fileData, fname, 900);
          if (result) {
            // 220pt wide × 165pt tall (≈ 4:3). docx uses points here.
            imageRun = new ImageRun({
              data: result.data,
              type: 'png',
              transformation: { width: 220, height: 165 }
            });
          }
        } catch (err) {
          console.warn('[EXPORT] Skipping photo:', fname, err);
        }
      }

      cellChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: imageRun
          ? [imageRun]
          : [new TextRun({ text: '[Gambar tidak tersedia]', italics: true, color: 'AAAAAA', size: 18, font: 'Arial' })]
      }));

      cellChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 20 },
        children: [new TextRun({ text: fname, size: 16, color: '374151', font: 'Arial' })]
      }));

      if (caption) {
        cellChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: caption, size: 14, italics: true, color: '9CA3AF', font: 'Arial' })]
        }));
      }

      return new TableCell({
        borders,
        width: { size: HALF_W, type: WidthType.DXA },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        verticalAlign: VerticalAlign.TOP,
        children: cellChildren
      });
    }));

    // Pad row to 2 cells
    if (cells.length === 1) {
      cells.push(new TableCell({
        borders: noBorder,
        width: { size: HALF_W, type: WidthType.DXA },
        children: [new Paragraph({ children: [] })]
      }));
    }

    elements.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [HALF_W, HALF_W],
      rows: [new TableRow({ children: cells })]
    }));
    elements.push(spacer());
  }
  return elements;
}

// ── DOCX: SINGLE ATP ──────────────────────────────────────
export async function exportAtpDocx(siteId: string) {
  const { site, pengajuan, stageLog, files, photos, docs } =
    await fetchAtpExportData(siteId);
  if (!site) { alert('Data site tidak ditemukan'); return; }

  const atp = site.atp_number || siteId;
  const docChildren: (Paragraph | Table)[] = [];

  // Cover
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1000, after: 200 },
      children: [new TextRun({ text: 'LAPORAN PEKERJAAN ATP', bold: true, size: 48, color: '1E3A5F', font: 'Arial' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: atp, bold: true, size: 32, color: '2563EB', font: 'Arial' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: `${site.project_type} — ${site.site_name || site.site_id}`, size: 24, font: 'Arial', color: '6B7280' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 1400 },
      children: [new TextRun({ text: `Digenerate: ${formatDate(new Date().toISOString())}`, size: 18, font: 'Arial', color: '9CA3AF' })]
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // Section 1: Info
  docChildren.push(H1('1. Informasi Site & ATP'), spacer());
  [
    ['Site ID', site.site_id], ['Site Name', site.site_name],
    ['Project Type', site.project_type], ['Region', site.region],
    ['Tower Provider', site.tp_name], ['Sector', String(site.sector ?? '—')],
    ['IOMS', site.ioms_registered ? 'Registered' : 'Not Registered'],
    ['ATP Number', site.atp_number], ['PO Number', site.po_number],
    ['SOW ID', site.sow_id], ['Stage', site.stage],
  ].forEach(([l, v]) => { docChildren.push(kv(l, String(v ?? '—'))); });
  docChildren.push(spacer(), new Paragraph({ children: [new PageBreak()] }));

  // Section 2: Permit
  docChildren.push(H1('2. Tahap Permit'), spacer());
  [
    ['Permit Status', site.permit_status], ['Create Date', formatDate(site.permit_create_date)],
    ['Permit Start', formatDate(site.permit_start_date)], ['Permit Expiry', formatDate(site.permit_expiry_date)],
    ['TPAS Nomor', site.tpas_number], ['TP Nomor', site.tp_number],
    ['CAF Nomor', site.caf_number], ['PIC Nama', site.pic_nama],
    ['PIC Telp', site.pic_telp], ['Jenis Kunci', site.jenis_kunci],
  ].forEach(([l, v]) => { docChildren.push(kv(l, String(v ?? '—'))); });
  docChildren.push(spacer());
  const permitPhotos = photos.filter((f: any) => (f.tag || '').includes('permit'));
  docChildren.push(...(await buildPhotoTable(permitPhotos, 'Foto Permit')));
  docChildren.push(new Paragraph({ children: [new PageBreak()] }));

  // Section 3: Implementasi
  docChildren.push(H1('3. Tahap Implementasi'), spacer());
  [
    ['Impl Status', site.impl_status], ['Team', site.team_name],
    ['Tanggal Plan', formatDate(site.tanggal_plan)], ['Tanggal Aktual', formatDate(site.tanggal_aktual)],
    ['CI', site.ci_date ? `${site.ci_date} ${site.ci_time ?? ''}` : '—'],
    ['CO', site.co_date ? `${site.co_date} ${site.co_time ?? ''}` : '—'],
    ['RFI Done', site.impl_rfi_done ? 'Ya' : 'Tidak'],
    ['Note', site.note_impl],
  ].forEach(([l, v]) => { docChildren.push(kv(l, String(v ?? '—'))); });
  // Combat substeps
  const steps = ['sitac','dimentle_cruz','towing','psb_pln','instal_cruz','optim'];
  if (site.project_type === 'COMBAT' && site.combat_impl_steps) {
    docChildren.push(spacer(), H2('Tahap Implementasi Combat'));
    const labels = ['SITAC','Dimentle Cruz','Towing','PSB PLN','Instal Cruz','OPTIM'];
    for (let i = 0; i < steps.length; i++) {
      const k = steps[i];
      const s = site.combat_impl_steps[k];
      const val = s ? `${(s.status || '—').toUpperCase()} | ${formatDate(s.date)} | ${s.person || '—'}` : '—';
      docChildren.push(kv(labels[i], val));
      const stepPhotos = photos.filter((f: any) => f.tag === `impl_${k}`);
      docChildren.push(...(await buildPhotoTable(stepPhotos)));
    }
  }
  docChildren.push(spacer());
  const implPhotos = photos.filter((f: any) =>
    (f.tag || '').includes('impl') && !steps.some((k: string) => f.tag === `impl_${k}`)
  );
  docChildren.push(...(await buildPhotoTable(implPhotos, 'Foto Implementasi')));
  docChildren.push(new Paragraph({ children: [new PageBreak()] }));

  // Section 4: ATP & Dokumen
  docChildren.push(H1('4. ATP & Dokumen'), spacer());
  [
    ['ATP Status', site.atp_status], ['PDID', site.pdid],
    ['Tiket ATP', site.tiket_atp], ['Note', site.note_atp],
  ].forEach(([l, v]) => { docChildren.push(kv(l, String(v ?? '—'))); });
  docChildren.push(spacer());
  const atpPhotos = photos.filter((f: any) => (f.tag || '').includes('atp') || (f.tag || '').includes('tagging'));
  docChildren.push(...(await buildPhotoTable(atpPhotos, 'Foto ATP / Tagging')));
  docChildren.push(new Paragraph({ children: [new PageBreak()] }));

  // Section 5: Pengajuan Pembayaran
  docChildren.push(H1('5. Pengajuan & Pembayaran'), spacer());
  const normalizedPQ = pengajuan.map(normalizePengajuan);

  if (!normalizedPQ.length) {
    docChildren.push(new Paragraph({
      children: [new TextRun({
        text: 'Belum ada pengajuan pembayaran untuk ATP ini.',
        italics: true, color: '9CA3AF', size: 18, font: 'Arial'
      })]
    }));
  } else {
    // Summary first
    const totalDiajukan = normalizedPQ.reduce((s, p) => s + p.jumlah, 0);
    const totalDibayar  = normalizedPQ.filter(p => p.status === 'paid').reduce((s, p) => s + p.jumlah, 0);

    docChildren.push(
      kv('Total Diajukan', rupiah(totalDiajukan)),
      kv('Total Dibayar',  rupiah(totalDibayar)),
      spacer()
    );

    // Pengajuan table
    const COL_WIDTHS = [400, 1800, 1400, 2600, 1300, 1526]; // sum = 9026
    docChildren.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: COL_WIDTHS,
      rows: [
        // Header row
        new TableRow({
          tableHeader: true,
          children: ['No','Tipe','Jumlah (Rp)','Keterangan','Status','Tanggal']
            .map((h, ci) => new TableCell({
              borders,
              width: { size: COL_WIDTHS[ci], type: WidthType.DXA },
              margins: cellMargins,
              shading: { fill: '1E3A5F', type: ShadingType.CLEAR },
              children: [new Paragraph({
                children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 18, font: 'Arial' })]
              })]
            }))
        }),
        // Data rows
        ...normalizedPQ.map(p => new TableRow({
          children: [
            String(p.no), p.type,
            p.jumlah.toLocaleString('id-ID'),
            p.keterangan, p.status,
            formatDate(p.submitted_at)
          ].map((val, ci) => new TableCell({
            borders,
            width: { size: COL_WIDTHS[ci], type: WidthType.DXA },
            margins: cellMargins,
            children: [new Paragraph({
              children: [new TextRun({ text: String(val || '—'), size: 16, font: 'Arial' })]
            })]
          }))
        }))
      ]
    }));

    // Bukti bayar photos if any
    const bbPhotos = photos.filter((f: any) =>
      f.tag === 'bukti_bayar' ||
      f.tag === 'payment_proof' ||
      (f.pengajuan_id && f.mime_type?.startsWith('image/'))
    );
    if (bbPhotos.length) {
      docChildren.push(spacer());
      docChildren.push(...(await buildPhotoTable(bbPhotos, 'Bukti Pembayaran')));
    }
  }
  docChildren.push(new Paragraph({ children: [new PageBreak()] }));

  // Section 6: Semua Foto (appendix)
  if (photos.length) {
    docChildren.push(H1('6. Lampiran: Semua Foto'), spacer());
    docChildren.push(...(await buildPhotoTable(photos)));
  }

  // Build document
  try {
    const doc = new Document({
      styles: {
        default: { document: { run: { font: 'Arial', size: 20 } } },
        paragraphStyles: [
          { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: 28, bold: true, font: 'Arial', color: '1E3A5F' },
            paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
          { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
            run: { size: 22, bold: true, font: 'Arial', color: '2563EB' },
            paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 1 } },
        ]
      },
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: docChildren
      }]
    });

    const blob = await Packer.toBlob(doc);
    if (!blob || blob.size < 1000) {
      throw new Error(`Generated docx is suspiciously small (${blob?.size ?? 0} bytes). Dokumen tidak valid.`);
    }
    console.log('[EXPORT DOCX] Success, size:', blob.size, 'bytes');
    saveAs(blob, `Laporan_ATP_${atp}_${today()}.docx`);
  } catch (err) {
    console.error('[EXPORT DOCX] Failed:', err);
    alert('Gagal membuat dokumen: ' + (err as Error).message);
    throw err;
  }
}
