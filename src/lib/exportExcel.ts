import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { fetchAtpExportData, rupiah, formatDate, today } from './exportHelpers';
import { normalizePengajuan } from './exportDocx';
import { db } from '../db';

// ── STYLE HELPERS ──────────────────────────────────────────
const HEADER_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: '1E3A5F' } },
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  border: { bottom: { style: 'thin', color: { rgb: '9CA3AF' } } }
};
const LABEL_STYLE = {
  font: { bold: true, sz: 10 },
  fill: { fgColor: { rgb: 'F0F2F5' } },
  alignment: { wrapText: true }
};
const VALUE_STYLE = { font: { sz: 10 }, alignment: { wrapText: true } };
const SECTION_STYLE = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
  fill: { fgColor: { rgb: '2563EB' } }
};

function addSection(rows: any[][], label: string) {
  rows.push([{ v: label, s: SECTION_STYLE }, '', '', '']);
}

function addKV(rows: any[][], label: string, value: string) {
  rows.push([
    { v: label, s: LABEL_STYLE },
    { v: value ?? '—', s: VALUE_STYLE }, '', ''
  ]);
}

// ── EXCEL: SINGLE ATP ──────────────────────────────────────
export async function exportAtpExcel(siteId: string) {
  const { site, pengajuan, stageLog, files } = await fetchAtpExportData(siteId);
  if (!site) { alert('Data site tidak ditemukan'); return; }

  const wb = XLSX.utils.book_new();
  const atp = site.atp_number || siteId;

  // ── Sheet 1: Info ATP ──────────────────────────────────
  const infoRows: any[][] = [
    [{ v: `LAPORAN ATP — ${atp}`, s: { font: { bold: true, sz: 14, color: { rgb: '1E3A5F' } } } }],
    [{ v: `Digenerate: ${formatDate(new Date().toISOString())}`, s: { font: { sz: 9, color: { rgb: '6B7280' } } } }],
    [''],
  ];
  addSection(infoRows, '📋 IDENTITAS SITE & ATP');
  addKV(infoRows, 'Site ID',        site.site_id);
  addKV(infoRows, 'Site Name',      site.site_name);
  addKV(infoRows, 'Project Type',   site.project_type);
  addKV(infoRows, 'Region',         site.region);
  addKV(infoRows, 'Tower Provider', site.tp_name);
  addKV(infoRows, 'IOMS',           site.ioms_registered ? 'Registered' : 'Not Registered');
  addKV(infoRows, 'ATP Number',     site.atp_number);
  addKV(infoRows, 'PO Number',      site.po_number);
  addKV(infoRows, 'SOW ID',         site.sow_id);
  addKV(infoRows, 'Sector',         String(site.sector ?? '—'));
  addKV(infoRows, 'Stage',          site.stage);
  addKV(infoRows, 'Latitude',       String(site.latitude ?? '—'));
  addKV(infoRows, 'Longitude',      String(site.longitude ?? '—'));
  addKV(infoRows, 'Batch',          site.batch);
  addKV(infoRows, 'Priority',       site.priority);
  infoRows.push(['']);
  addSection(infoRows, '🔒 PERMIT');
  addKV(infoRows, 'Permit Status',  site.permit_status);
  addKV(infoRows, 'Create Date',    formatDate(site.permit_create_date));
  addKV(infoRows, 'Permit Start',   formatDate(site.permit_start_date));
  addKV(infoRows, 'Permit Expiry',  formatDate(site.permit_expiry_date));
  addKV(infoRows, 'TPAS Nomor',     site.tpas_number);
  addKV(infoRows, 'TP Nomor',       site.tp_number);
  addKV(infoRows, 'CAF Nomor',      site.caf_number);
  addKV(infoRows, 'PIC Nama',       site.pic_nama);
  addKV(infoRows, 'PIC Telp',       site.pic_telp);
  addKV(infoRows, 'Jenis Kunci',    site.jenis_kunci);
  infoRows.push(['']);
  addSection(infoRows, '🔧 IMPLEMENTASI');
  addKV(infoRows, 'Impl Status',    site.impl_status);
  addKV(infoRows, 'Team',           site.team_name);
  addKV(infoRows, 'Tanggal Plan',   formatDate(site.tanggal_plan));
  addKV(infoRows, 'Tanggal Aktual', formatDate(site.tanggal_aktual));
  addKV(infoRows, 'CI Tanggal',     site.ci_date ? `${site.ci_date} ${site.ci_time ?? ''}` : '—');
  addKV(infoRows, 'CO Tanggal',     site.co_date ? `${site.co_date} ${site.co_time ?? ''}` : '—');
  addKV(infoRows, 'RFI Done',       site.impl_rfi_done ? 'Ya' : 'Tidak');
  addKV(infoRows, 'Note Impl',      site.note_impl);
  // Combat substeps if applicable
  if (site.project_type === 'COMBAT' && site.combat_impl_steps) {
    infoRows.push(['']);
    addSection(infoRows, '⚙ COMBAT: TAHAP IMPLEMENTASI');
    const steps = ['sitac','dimentle_cruz','towing','psb_pln','instal_cruz','optim'];
    const labels = ['SITAC','Dimentle Cruz','Towing','PSB PLN','Instal Cruz','OPTIM'];
    steps.forEach((k, i) => {
      const s = site.combat_impl_steps[k];
      addKV(infoRows, labels[i], s ? `${s.status?.toUpperCase() ?? '—'} | ${formatDate(s.date)} | ${s.person ?? '—'}` : '—');
    });
  }
  infoRows.push(['']);
  addSection(infoRows, '📡 ATP & DOKUMEN');
  addKV(infoRows, 'ATP Status',     site.atp_status);
  addKV(infoRows, 'PDID',           site.pdid);
  addKV(infoRows, 'Tiket ATP',      site.tiket_atp);
  addKV(infoRows, 'Note ATP',       site.note_atp);

  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
  wsInfo['!cols'] = [{ wch: 22 }, { wch: 45 }, { wch: 10 }, { wch: 10 }];
  wsInfo['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info ATP');

  // ── Sheet 2: Pengajuan ──────────────────────────────────
  const normalizedPQ = pengajuan.map(normalizePengajuan);
  const pqHeaders = ['No','Tipe','Jumlah','Keterangan','Status',
                     'Submitted By','Submitted At','Approved By','Approved At','Paid At'];
  const pqRows = normalizedPQ.map(p => [
    p.no, p.type, p.jumlah,
    p.keterangan, p.status, p.submitted_by,
    formatDate(p.submitted_at), p.approved_by,
    formatDate(p.approved_at), formatDate(p.paid_at)
  ]);
  const wsPQ = XLSX.utils.aoa_to_sheet([
    [{ v: 'PENGAJUAN PEMBAYARAN', s: { font: { bold: true, sz: 12 } } }],
    [''],
    pqHeaders.map(h => ({ v: h, s: HEADER_STYLE })),
    ...pqRows
  ]);
  wsPQ['!cols'] = [4,18,16,35,14,18,16,18,16,16].map(w => ({ wch: w }));
  wsPQ['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
  XLSX.utils.book_append_sheet(wb, wsPQ, 'Pengajuan');

  // ── Sheet 3: Stage Log ─────────────────────────────────
  const slRows = stageLog.map((l: any) => [
    l.previous_stage ?? '—', l.new_stage ?? l.stage ?? '—',
    l.changed_by ?? '—', formatDate(l.created_at), l.notes ?? ''
  ]);
  const wsLog = XLSX.utils.aoa_to_sheet([
    [{ v: 'RIWAYAT STAGE', s: { font: { bold: true, sz: 12 } } }],
    [''],
    ['Dari Stage','Ke Stage','Diubah Oleh','Waktu','Catatan']
      .map(h => ({ v: h, s: HEADER_STYLE })),
    ...slRows
  ]);
  wsLog['!cols'] = [20,20,20,22,40].map(w => ({ wch: w }));
  wsLog['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
  XLSX.utils.book_append_sheet(wb, wsLog, 'Riwayat Stage');

  // ── Sheet 4: File List ─────────────────────────────────
  const flRows = files.map((f: any) => [
    f.filename, f.tag ?? '—',
    f.mime_type ?? '—',
    f.file_size ? Math.round(f.file_size / 1024) + ' KB' : '—',
    f.uploaded_by ?? '—', formatDate(f.uploaded_at)
  ]);
  const wsFiles = XLSX.utils.aoa_to_sheet([
    [{ v: 'DAFTAR FILE & DOKUMEN', s: { font: { bold: true, sz: 12 } } }],
    [''],
    ['Nama File','Kategori','Tipe','Ukuran','Upload Oleh','Tanggal Upload']
      .map(h => ({ v: h, s: HEADER_STYLE })),
    ...flRows
  ]);
  wsFiles['!cols'] = [35,20,20,12,20,18].map(w => ({ wch: w }));
  wsFiles['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  XLSX.utils.book_append_sheet(wb, wsFiles, 'File & Dokumen');

  // Save
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }),
    `Export_ATP_${atp}_${today()}.xlsx`);
}

// ── EXCEL: PER SITE (all ATPs) ────────────────────────────
export async function exportSiteExcel(siteId: string) {
  const allAtpsResult = await db.query(
    `SELECT * FROM sites WHERE site_id = '${siteId}' ORDER BY created_at ASC;`
  ) as any[];
  const allAtps = allAtpsResult[0] || [];
  if (!allAtps.length) { alert('Tidak ada data untuk site ini'); return; }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Info Site (from first ATP record, site_master fields)
  const s = allAtps[0];
  const siteInfoRows: any[][] = [
    [{ v: `SITE REPORT — ${siteId}`, s: { font: { bold: true, sz: 14 } } }],
    [''],
  ];
  [['Site ID', s.site_id],['Site Name', s.site_name],['Region', s.region],
    ['TP', s.tp_name],['IOMS', s.ioms_registered ? 'Registered' : 'Not Registered'],
    ['Latitude', s.latitude],['Longitude', s.longitude]
  ].forEach(([l, v]) => addKV(siteInfoRows, String(l), String(v ?? '—')));
  const wsInfo = XLSX.utils.aoa_to_sheet(siteInfoRows);
  wsInfo['!cols'] = [{ wch: 22 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info Site');

  // Sheet 2: All ATPs summary
  const summaryRows = allAtps.map((a: any, i: number) => [
    i + 1, a.atp_number ?? '—', a.project_type, a.sector ?? '—',
    a.po_number ?? '—', a.sow_id ?? '—', a.stage, a.permit_status ?? '—',
    a.impl_status ?? '—', a.atp_status ?? '—', formatDate(a.created_at)
  ]);
  const wsSummary = XLSX.utils.aoa_to_sheet([
    [{ v: 'DAFTAR ATP', s: { font: { bold: true, sz: 12 } } }], [''],
    ['#','ATP Number','Type','Sector','PO','SOW','Stage',
     'Permit Status','Impl Status','ATP Status','Created']
      .map(h => ({ v: h, s: HEADER_STYLE })),
    ...summaryRows
  ]);
  wsSummary['!cols'] = [3,20,10,8,22,16,18,22,16,22,16].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Daftar ATP');

  // One sheet per ATP
  for (const atp of allAtps) {
    const atpNum = (atp.atp_number || atp.site_id || '').slice(-8);
    const data = await fetchAtpExportData(atp.site_id); // Wait, siteId? Or Atp? 
    // The previous app logic fetched for the site ID. A true multi-sector ATP might have 
    // files tagged differently, but let's use what the prompt requested:
    // "const data = await fetchAtpExportData(atp.site_id)"
    const sheetRows: any[][] = [];
    addSection(sheetRows, `ATP: ${atp.atp_number ?? '—'}`);
    addKV(sheetRows, 'Stage',         atp.stage);
    addKV(sheetRows, 'PO',            atp.po_number);
    addKV(sheetRows, 'SOW',           atp.sow_id);
    addKV(sheetRows, 'Permit Status', atp.permit_status);
    addKV(sheetRows, 'Impl Status',   atp.impl_status);
    sheetRows.push(['']);
    addSection(sheetRows, 'PENGAJUAN');
    sheetRows.push(['No','Tipe','Jumlah','Status','Submitted At','Paid At']
      .map(h => ({ v: h, s: HEADER_STYLE })));
    const normalizedATP_PQ = data.pengajuan.map(normalizePengajuan);
    normalizedATP_PQ.forEach(p => {
      sheetRows.push([p.no, p.type, p.jumlah,
        p.status, formatDate(p.submitted_at), formatDate(p.paid_at)]);
    });
    const wsATP = XLSX.utils.aoa_to_sheet(sheetRows);
    wsATP['!cols'] = [{ wch: 22 }, { wch: 40 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 16 }];
    const sheetName = `ATP_${atpNum}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, wsATP, sheetName);
  }

  // Financial summary sheet
  const allPQResult = await db.query(
    `SELECT * FROM pengajuan WHERE site_id = '${siteId}' ORDER BY created_at ASC;`
  ) as any[];
  const allPQ = allPQResult[0] || [];
  const normalizedAllPQ = allPQ.map(normalizePengajuan);
  const totalPaid = normalizedAllPQ.filter(p => p.status === 'paid').reduce((s, p) => s + p.jumlah, 0);
  const totalApproved = normalizedAllPQ.filter(p => p.status === 'approved').reduce((s, p) => s + p.jumlah, 0);
  const totalPending = normalizedAllPQ.filter(p => p.status === 'submitted').reduce((s, p) => s + p.jumlah, 0);
  const totalDiajukan = normalizedAllPQ.reduce((s, p) => s + p.jumlah, 0);
  const wsFinance = XLSX.utils.aoa_to_sheet([
    [{ v: 'RINGKASAN KEUANGAN', s: { font: { bold: true, sz: 12 } } }], [''],
    [{ v: 'Total Diajukan', s: LABEL_STYLE }, { v: rupiah(totalDiajukan), s: VALUE_STYLE }],
    [{ v: 'Sudah Dibayar', s: LABEL_STYLE },  { v: rupiah(totalPaid), s: VALUE_STYLE }],
    [{ v: 'Sudah Disetujui', s: LABEL_STYLE }, { v: rupiah(totalApproved), s: VALUE_STYLE }],
    [{ v: 'Menunggu Approval', s: LABEL_STYLE }, { v: rupiah(totalPending), s: VALUE_STYLE }],
  ]);
  wsFinance['!cols'] = [{ wch: 22 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsFinance, 'Ringkasan Keuangan');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }),
    `Site_${siteId}_Export_${today()}.xlsx`);
}

// Optional: EXPORT PROJECT TYPE 
export async function exportTypeExcel(projectType: string) {
  const allSitesResult = await db.query(
    `SELECT * FROM sites WHERE project_type = '${projectType}' ORDER BY created_at ASC;`
  ) as any[];
  const allSites = allSitesResult[0] || [];
  if (!allSites.length) { alert('Tidak ada data untuk tipe project ini'); return; }

  const wb = XLSX.utils.book_new();

  // Summary
  const summaryRows = allSites.map((a: any, i: number) => [
    i + 1, a.site_id ?? '—', a.atp_number ?? '—', a.sector ?? '—',
    a.po_number ?? '—', a.sow_id ?? '—', a.stage, a.permit_status ?? '—',
    a.impl_status ?? '—', a.atp_status ?? '—', formatDate(a.created_at)
  ]);
  const wsSummary = XLSX.utils.aoa_to_sheet([
    [{ v: `DAFTAR ATP - ${projectType}`, s: { font: { bold: true, sz: 12 } } }], [''],
    ['#','Site ID','ATP Number','Sector','PO','SOW','Stage',
     'Permit Status','Impl Status','ATP Status','Created']
      .map(h => ({ v: h, s: HEADER_STYLE })),
    ...summaryRows
  ]);
  wsSummary['!cols'] = [3,16,20,8,22,16,18,22,16,22,16].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Daftar Site');

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }),
    `Export_${projectType}_${today()}.xlsx`);
}
