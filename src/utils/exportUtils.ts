import * as XLSX from 'xlsx';
import type { SiteMaster, AtpWorkOrder, TerminPengajuan, SiteFile } from '../data/mockData';

const download = (wb: XLSX.WorkBook, filename: string) => {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportSitesToExcel = (sites: SiteMaster[], filename = 'sites-export.xlsx') => {
  const rows = sites.map(s => ({
    'Site ID': s.site_id,
    'Site Name': s.site_name,
    'NE ID': s.ne_id,
    'Unique Key': s.unique_key,
    'Area': s.area,
    'Region': s.region,
    'Cluster': s.cluster || '',
    'Sektor': s.sector || '',
    'Project Type': s.project_type,
    'Status': s.status,
    'Stage': s.stage,
    'NOP': s.nop,
    'Tower Provider': s.tower_provider || '',
    'Mitra': s.mitra,
    'PO TSEL': s.po_tsel,
    'SOW Pekerjaan': s.sow_pekerjaan,
    'Plan CAPEX': s.plan_capex,
    'Priority': s.priority || '',
    'Team ID': s.team_id || '',
    'Imported At': s.imported_at ? new Date(s.imported_at).toLocaleDateString('id-ID') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sites');
  download(wb, filename);
};

export const exportSitesToCsv = (sites: SiteMaster[], filename = 'sites-export.csv') => {
  const rows = sites.map(s => ({
    'Site ID': s.site_id,
    'Site Name': s.site_name,
    'NE ID': s.ne_id,
    'Area': s.area,
    'Region': s.region,
    'Project Type': s.project_type,
    'Status': s.status,
    'Stage': s.stage,
    'Mitra': s.mitra,
    'PO TSEL': s.po_tsel,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportWorkTypeToExcel = (workOrders: AtpWorkOrder[], workType: string, filename?: string) => {
  const rows = workOrders.map(w => ({
    'ATP Number': w.atp_number,
    'Site ID': w.site_id,
    'Site Name': w.site_name || '',
    'NE ID': w.ne_id || '',
    'SOW ID': w.sow_id,
    'PO Number': w.po_number,
    'Sektor': w.sector,
    'Project Type': w.project_type,
    'Stage': w.stage,
    'Status': w.status,
    'Team ID': w.team_id || '',
    'Permit Status': w.permit_status || '',
    'CI Date': w.ci_date || '',
    'CO Date': w.co_date || '',
    'RFI Done': w.rfi_done ? 'Ya' : 'Tidak',
    'RFS Done': w.rfs_done ? 'Ya' : 'Tidak',
    'PPID': w.ppid || '',
    'Nomor Tiket': w.tiket_number || '',
    'Initiated At': w.initiated_at ? new Date(w.initiated_at).toLocaleDateString('id-ID') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, workType.slice(0, 31));
  download(wb, filename || `export-${workType.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
};

export const exportAtpToExcel = (
  wo: AtpWorkOrder,
  payments: TerminPengajuan[],
  files: SiteFile[],
  filename?: string
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Work Order Info
  const woRows = [
    ['ATP Number', wo.atp_number],
    ['Site ID', wo.site_id],
    ['Site Name', wo.site_name || ''],
    ['NE ID', wo.ne_id || ''],
    ['SOW ID', wo.sow_id],
    ['PO Number', wo.po_number],
    ['Sektor', wo.sector],
    ['Project Type', wo.project_type],
    ['Stage', wo.stage],
    ['Status', wo.status],
    ['Team ID', wo.team_id || ''],
    ['Permit Status', wo.permit_status || ''],
    ['CI Date', wo.ci_date || ''],
    ['CO Date', wo.co_date || ''],
    ['RFI Done', wo.rfi_done ? 'Ya' : 'Tidak'],
    ['RFS Done', wo.rfs_done ? 'Ya' : 'Tidak'],
    ['PPID', wo.ppid || ''],
    ['Nomor Tiket', wo.tiket_number || ''],
    ['Initiated By', wo.initiated_by],
    ['Initiated At', wo.initiated_at ? new Date(wo.initiated_at).toLocaleDateString('id-ID') : ''],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(woRows);
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info ATP');

  // Sheet 2: Payments
  if (payments.length > 0) {
    const payRows = payments.map(p => ({
      'Termin': p.termin_key,
      'Nominal (Rp)': p.nominal,
      'Deskripsi': p.deskripsi || '',
      'Status': p.status,
      'Nama Bank': p.bank_name || '',
      'Nomor Rekening': p.account_number || '',
      'Pemilik Rekening': p.account_holder || '',
      'Diajukan Oleh': p.submitted_by,
      'Tanggal Diajukan': p.submitted_at ? new Date(p.submitted_at).toLocaleDateString('id-ID') : '',
      'Disetujui Oleh': p.approved_by || '',
      'Tanggal Disetujui': p.approved_at ? new Date(p.approved_at).toLocaleDateString('id-ID') : '',
      'Tanggal Bayar': p.paid_at ? new Date(p.paid_at).toLocaleDateString('id-ID') : '',
      'Bukti Pembayaran': p.bukti_pembayaran_name || '',
    }));
    const wsPay = XLSX.utils.json_to_sheet(payRows);
    XLSX.utils.book_append_sheet(wb, wsPay, 'Pembayaran');
  }

  // Sheet 3: Documents checklist
  if (files.length > 0) {
    const docRows = files.map(f => ({
      'File Name': f.original_name || f.filename,
      'MIME Type': f.mime_type,
      'Size (KB)': Math.round(f.file_size / 1024),
      'Source': f.source,
      'Stage Context': f.stage_context || '',
      'ATP Checked': f.atp_checked ? 'Ya' : 'Tidak',
      'Uploaded By': f.uploaded_by,
      'Uploaded At': f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString('id-ID') : '',
      'Description': f.description || '',
    }));
    const wsDocs = XLSX.utils.json_to_sheet(docRows);
    XLSX.utils.book_append_sheet(wb, wsDocs, 'Dokumen & Foto');
  }

  download(wb, filename || `atp-${wo.atp_number}-report.xlsx`);
};

export const exportSiteReportToExcel = (
  site: SiteMaster,
  workOrders: AtpWorkOrder[],
  payments: TerminPengajuan[],
  files: SiteFile[],
  filename?: string
) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Site info
  const siteRows = [
    ['Site ID', site.site_id],
    ['Site Name', site.site_name],
    ['NE ID', site.ne_id],
    ['Unique Key', site.unique_key],
    ['Area', site.area],
    ['Region', site.region],
    ['Cluster', site.cluster || ''],
    ['Sektor', site.sector || ''],
    ['Project Type', site.project_type],
    ['Status', site.status],
    ['Stage', site.stage],
    ['NOP', site.nop],
    ['Tower Provider', site.tower_provider || ''],
    ['Mitra', site.mitra],
    ['PO TSEL', site.po_tsel],
    ['SOW Pekerjaan', site.sow_pekerjaan],
    ['Plan CAPEX', site.plan_capex],
    ['Team ID', site.team_id || ''],
  ];
  const wsSite = XLSX.utils.aoa_to_sheet(siteRows);
  XLSX.utils.book_append_sheet(wb, wsSite, 'Info Site');

  // Sheet 2: All ATPs
  if (workOrders.length > 0) {
    const atpRows = workOrders.map(w => ({
      'ATP Number': w.atp_number,
      'SOW ID': w.sow_id,
      'PO Number': w.po_number,
      'Sektor': w.sector,
      'Project Type': w.project_type,
      'Stage': w.stage,
      'Permit Status': w.permit_status || '',
      'CI Date': w.ci_date || '',
      'CO Date': w.co_date || '',
      'RFI': w.rfi_done ? 'Ya' : 'Tidak',
      'RFS': w.rfs_done ? 'Ya' : 'Tidak',
      'PPID': w.ppid || '',
    }));
    const wsAtp = XLSX.utils.json_to_sheet(atpRows);
    XLSX.utils.book_append_sheet(wb, wsAtp, 'Work Orders');
  }

  // Sheet 3: Payments
  if (payments.length > 0) {
    const payRows = payments.map(p => ({
      'Termin': p.termin_key,
      'Nominal (Rp)': p.nominal,
      'Status': p.status,
      'Nama Bank': p.bank_name || '',
      'Nomor Rekening': p.account_number || '',
      'Pemilik Rekening': p.account_holder || '',
      'Diajukan Oleh': p.submitted_by,
      'Tanggal Diajukan': p.submitted_at ? new Date(p.submitted_at).toLocaleDateString('id-ID') : '',
      'Tanggal Bayar': p.paid_at ? new Date(p.paid_at).toLocaleDateString('id-ID') : '',
      'Bukti Pembayaran': p.bukti_pembayaran_name || '',
    }));
    const wsPay = XLSX.utils.json_to_sheet(payRows);
    XLSX.utils.book_append_sheet(wb, wsPay, 'Pembayaran');
  }

  // Sheet 4: Documents
  if (files.length > 0) {
    const docRows = files.map(f => ({
      'File Name': f.original_name || f.filename,
      'Type': f.mime_type,
      'Size (KB)': Math.round(f.file_size / 1024),
      'Source': f.source,
      'Stage Context': f.stage_context || '',
      'ATP Checked': f.atp_checked ? 'Ya' : 'Tidak',
      'Uploaded By': f.uploaded_by,
      'Uploaded At': f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString('id-ID') : '',
    }));
    const wsDocs = XLSX.utils.json_to_sheet(docRows);
    XLSX.utils.book_append_sheet(wb, wsDocs, 'Dokumen & Foto');
  }

  download(wb, filename || `site-${site.site_id}-report.xlsx`);
};
