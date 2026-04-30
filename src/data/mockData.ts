import type { ProjectType, SiteStage } from '../types';
export type { ProjectType, SiteStage };

export type WOStatus = 'Unassigned' | 'Assigned' | 'Pending SPK Approval' | 'SPK Created' | 'Active' | 'Implementasi' | 'BAST' | 'Invoice' | 'Completed';
export interface WorkOrder {
  id: string;
  woNumber: string;
  tanggalWo: string;
  pemberiKerja: string;
  tipe: ProjectType;
  scopeOfWork: string;
  lokasi: string;
  targetDate: string;
  nilaiWo: number;
  nomorKontrak: string;
  dokumenWoUrl?: string; // Optional URL for uploaded PDF/Excel
  status: WOStatus;
  assignedTeamId?: string;
  siteId?: string;
  projectId?: string;
  createdBy?: string;
}

export interface TerminPengajuan {
  id: string; // auto
  site_id: string; // -> site reference
  termin_key: 'T1' | 'T2a' | 'T2b' | 'T2c' | 'T3' | 'T4' | 'Biaya Perizinan' | 'Transportasi' | 'Material Tambahan' | 'Sewa Alat' | 'Lainnya';
  deskripsi?: string;
  nominal: number;
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected';
  catatan?: string;
  submitted_by: string; // -> users.id
  submitted_at: string; // datetime
  approved_by?: string; // -> users.id nullable
  approved_at?: string; // datetime nullable
  paid_at?: string; // datetime nullable
  documents: string[]; // json array of file IDs
  history?: { action: string; by: string; at: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
//  BAST DOCUMENT CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────
// Obsolete BAST types (will be removed once fully migrated to SiteFile atp_checked)
export type BastDocType =
  | 'as_built_drawing'
  | 'bap_implementasi'
  | 'foto_instalasi'
  | 'rekap_pekerjaan'
  | 'bast_draft'
  | 'foto_label_perangkat'
  | 'catatan_teknis';

export interface BastDocumentChecklistItem {
  id: string;
  site_id: string;
  doc_type: BastDocType;
  doc_label: string;
  is_required: boolean;
  is_uploaded: boolean;
  file_name?: string;
  file_size?: number; // bytes
  uploaded_by?: string;
  uploaded_at?: string;
  catatan?: string;
}

const BAST_DOC_DEFAULTS: { doc_type: BastDocType; doc_label: string; is_required: boolean }[] = [
  { doc_type: 'as_built_drawing',     doc_label: 'As-Built Drawing',           is_required: true  },
  { doc_type: 'bap_implementasi',     doc_label: 'BAP Implementasi',            is_required: true  },
  { doc_type: 'foto_instalasi',       doc_label: 'Foto Instalasi (min 5 foto)', is_required: true  },
  { doc_type: 'rekap_pekerjaan',      doc_label: 'Rekapitulasi Pekerjaan',      is_required: true  },
  { doc_type: 'bast_draft',           doc_label: 'Draft BAST',                  is_required: true  },
  { doc_type: 'foto_label_perangkat', doc_label: 'Foto Label Perangkat',        is_required: false },
  { doc_type: 'catatan_teknis',       doc_label: 'Catatan Teknis',              is_required: false },
];

const makeBastChecklist = (siteId: string, prefix: string): BastDocumentChecklistItem[] =>
  BAST_DOC_DEFAULTS.map((d, i) => ({
    id: `bast-${prefix}-${i}`,
    site_id: siteId,
    doc_type: d.doc_type,
    doc_label: d.doc_label,
    is_required: d.is_required,
    is_uploaded: false,
  }));

// Pre-seed checklists for demo sites (empty — admins fill via modal)
export const bastDocumentChecklists: BastDocumentChecklistItem[] = [
  ...makeBastChecklist('JKT010', 'jkt010'),
  ...makeBastChecklist('JKS026', 'jks026'),
  ...makeBastChecklist('RS-001', 'rs001'),
];

/** Returns the default 7-item template for any new site */
export const createBastChecklistForSite = (siteId: string): BastDocumentChecklistItem[] =>
  BAST_DOC_DEFAULTS.map((d, i) => ({
    id: `bast-new-${siteId}-${i}-${Date.now()}`,
    site_id: siteId,
    doc_type: d.doc_type,
    doc_label: d.doc_label,
    is_required: d.is_required,
    is_uploaded: false,
  }));



export const terminPengajuanRecords: TerminPengajuan[] = [
    {
        id: 'tp-1',
        site_id: 'JKT010',
        termin_key: 'T1',
        nominal: 45000000,
        status: 'paid',
        catatan: 'Permit sudah turun sesuai standar operasional',
        submitted_by: 'Sari Admin',
        submitted_at: '2024-03-05T10:00:00Z',
        approved_by: 'Budi Director',
        approved_at: '2024-03-06T14:30:00Z',
        paid_at: '2024-03-07T11:00:00Z',
        documents: ['file-1', 'file-2'],
        history: [
            { action: 'submitted', by: 'Sari Admin', at: '2024-03-05T10:00:00Z' },
            { action: 'approved', by: 'Budi Director', at: '2024-03-06T14:30:00Z' },
            { action: 'paid', by: 'Keuangan', at: '2024-03-07T11:00:00Z' }
        ]
    },
    {
        id: 'tp-rs1',
        site_id: 'RS-001',
        termin_key: 'T1',
        nominal: 45000000,
        status: 'paid',
        catatan: 'DP 30% Terbayar',
        submitted_by: 'u_lead',
        submitted_at: '2026-03-11T10:00:00Z',
        paid_at: '2026-03-12T09:00:00Z',
        documents: ['file-3'],
        history: [
            { action: 'submitted', by: 'u_lead', at: '2026-03-11T10:00:00Z' },
            { action: 'paid', by: 'Keuangan', at: '2026-03-12T09:00:00Z' }
        ]
    },
    {
        id: 'tp-rs2',
        site_id: 'RS-001',
        termin_key: 'T2a',
        nominal: 75000000,
        status: 'submitted',
        catatan: 'Pengajuan Termin 2a',
        submitted_by: 'Sari Admin',
        submitted_at: '2026-03-13T10:00:00Z',
        documents: [],
        history: [
            { action: 'submitted', by: 'Sari Admin', at: '2026-03-13T10:00:00Z' }
        ]
    },
    {
        id: 'tp-jkt010-t2a',
        site_id: 'JKT010',
        termin_key: 'T2a',
        nominal: 20000000,
        status: 'paid',
        catatan: '',
        submitted_by: 'Sari Admin',
        submitted_at: '2024-03-10T10:00:00Z',
        approved_by: 'Budi Director',
        approved_at: '2024-03-11T14:30:00Z',
        paid_at: '2024-03-12T11:00:00Z',
        documents: [],
        history: [
            { action: 'submitted', by: 'Sari Admin', at: '2024-03-10T10:00:00Z' },
            { action: 'approved', by: 'Budi Director', at: '2024-03-11T14:30:00Z' },
            { action: 'paid', by: 'Keuangan', at: '2024-03-12T11:00:00Z' }
        ]
    },
    {
        id: 'tp-jkt010-t2b',
        site_id: 'JKT010',
        termin_key: 'T2b',
        nominal: 25000000,
        status: 'rejected',
        catatan: 'Tolak: Dokumen BAST belum ada ttd lengkap',
        submitted_by: 'Sari Admin',
        submitted_at: '2024-03-15T10:00:00Z',
        documents: [],
        history: [
            { action: 'submitted', by: 'Sari Admin', at: '2024-03-15T10:00:00Z' },
            { action: 'rejected', by: 'Budi Director', at: '2024-03-16T14:30:00Z' }
        ]
    },
    {
        id: 'tp-jkt010-t2b-retry',
        site_id: 'JKT010',
        termin_key: 'T2b',
        nominal: 25000000,
        status: 'submitted',
        catatan: 'Re-submit: Dokumen BAST sudah disematkan ttd',
        submitted_by: 'Sari Admin',
        submitted_at: '2024-03-18T10:00:00Z',
        documents: ['file-4'],
        history: [
            { action: 'submitted', by: 'Sari Admin', at: '2024-03-18T10:00:00Z' }
        ]
    },
    {
        id: 'tp-jkt010-t3',
        site_id: 'JKT010',
        termin_key: 'T3',
        deskripsi: 'Pengajuan Termin T3 (30%)',
        nominal: 15000000,
        status: 'submitted',
        catatan: 'Pengajuan Termin 3 menunggu approve',
        submitted_by: 'Sari Admin',
        submitted_at: '2026-03-09T09:12:00Z',
        documents: [],
        history: [
            { action: 'submitted', by: 'Sari Admin', at: '2026-03-09T09:12:00Z' }
        ]
    },
    // Mock new items
    {
        id: 'tp-jks509-izin',
        site_id: 'JKS509',
        termin_key: 'Biaya Perizinan',
        deskripsi: 'Fee untuk Tower Provider JKS509',
        nominal: 2500000,
        status: 'submitted',
        catatan: 'Harap segera approve untuk mulai pekerjaan',
        submitted_by: 'u_ops',
        submitted_at: '2026-03-15T09:12:00Z',
        documents: [],
        history: [
            { action: 'submitted', by: 'u_ops', at: '2026-03-15T09:12:00Z' }
        ]
    },
    {
        id: 'tp-jks509-transport',
        site_id: 'JKS509',
        termin_key: 'Transportasi',
        deskripsi: 'Sewa mobil pick-up untuk tim instalasi',
        nominal: 800000,
        status: 'draft',
        catatan: '',
        submitted_by: 'u_field',
        submitted_at: '2026-03-18T09:12:00Z',
        documents: [],
        history: []
    }
];

export const getTerminSummary = (siteId: string): { summary: Record<string, any>; has_pending_approval: boolean; pending_termin_key: string | null; pending_termin_amount: number | null; pending_termin_date: string | null } => {
    // Collect pengajuan for this site
    const tKeys = ['T1', 'T2a', 'T2b', 'T2c', 'T3', 'T4'] as const;
    const summary: Record<string, any> = {};
    let has_pending_approval = false;
    let pending_termin_key: string | null = null;
    let pending_termin_amount: number | null = null;
    let pending_termin_date: string | null = null;

    const sitePengajuans = terminPengajuanRecords.filter(tp => tp.site_id === siteId);

    // To simulate 'unlocked' vs 'locked' accurately, we need the site's stage.
    // For simplicity in mock data, we determine locked/unlocked via standard flow pseudo-logic:
    // If previous termin is paid/submitted, current is unlocked.
    let anyPreviousPaid = true;

    tKeys.forEach(tKey => {
        // Find latest pengajuan for this termin key
        const reqs = sitePengajuans.filter(tp => tp.termin_key === tKey).sort((a,b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
        const latest = reqs.length > 0 ? reqs[0] : null;

        let status = 'locked';
        if (latest) {
            status = latest.status;
            if (status === 'submitted') {
                has_pending_approval = true;
                if (!pending_termin_key) {
                    pending_termin_key = tKey;
                    pending_termin_amount = latest.nominal;
                    pending_termin_date = latest.submitted_at;
                }
            } else if (status === 'rejected') {
                status = 'open'; // It needs re-submission
            }
        } else if (anyPreviousPaid) {
            status = 'open'; // Ready to submit
        }

        anyPreviousPaid = (status === 'paid' || status === 'approved' || status === 'submitted');

        summary[tKey.toLowerCase()] = { status };
    });

    return { summary, has_pending_approval, pending_termin_key, pending_termin_amount, pending_termin_date };
};

export const workOrders: WorkOrder[] = [
  {
    id: 'wo-1',
    woNumber: 'WO-2024-001',
    tanggalWo: '2024-01-05',
    pemberiKerja: 'PT Telkom Indonesia',
    tipe: 'FILTER',
    scopeOfWork: 'Deployment of 3 filter units in Jakarta area',
    lokasi: 'Jakarta Raya',
    targetDate: '2024-03-31',
    nilaiWo: 1650000000,
    nomorKontrak: 'TELKOM-CTR-2024-001',
    status: 'Active',
    assignedTeamId: 't1',
    projectId: 'p1',
    createdBy: 'u_mgr'
  },
  {
    id: 'wo-2',
    woNumber: 'WO-2024-002',
    tanggalWo: '2024-02-15',
    pemberiKerja: 'Mitra Telco Nusantara',
    tipe: 'COMBAT',
    scopeOfWork: 'Full combat deployment for 100 new sites',
    lokasi: 'Bandung Region',
    targetDate: '2024-08-30',
    nilaiWo: 50000000000,
    nomorKontrak: 'MTN-CTR-2024-002',
    status: 'Assigned',
    assignedTeamId: 't2',
    createdBy: 'u_adm'
  },
  {
    id: 'wo-3',
    woNumber: 'WO-2024-003',
    tanggalWo: '2024-02-20',
    pemberiKerja: 'Provider X',
    tipe: 'L2H',
    scopeOfWork: 'Migration of 50 links from legacy to high speed',
    lokasi: 'Surabaya',
    targetDate: '2024-06-30',
    nilaiWo: 12500000000,
    nomorKontrak: 'PROVX-CTR-2024-003',
    status: 'Unassigned',
    createdBy: 'u_mgr'
  },
  {
    id: 'wo-4',
    woNumber: 'WO-2024-004',
    tanggalWo: '2024-02-18',
    pemberiKerja: 'PT Telkom Indonesia',
    tipe: 'BLACKSITE',
    scopeOfWork: 'Dismantle and relocation of 5 Blacksites',
    lokasi: 'Medan',
    targetDate: '2024-05-15',
    nilaiWo: 3000000000,
    nomorKontrak: 'TELKOM-CTR-2024-004',
    status: 'Pending SPK Approval',
    assignedTeamId: 't3',
    createdBy: 'u_mgr'
  }
];

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: 'active' | 'completed' | 'hold';
  description?: string;
  // Dashboard fields
  sites?: number;
  activeTeams?: number;
  budget?: number; // Total Project Budget
  cost?: number; // Total Project Cost (Realization)
  startDate?: string;
  endDate?: string;
}

export interface Site {
  id: string;
  projectId: string;
  name: string;
  location: string;
  budget: number;
  // New fields for Dashboard
  teamId?: string;
  field_leader_id?: string;
  jobName?: string;
  contractNumber?: string;
  startDate?: string;
  endDate?: string;
  import_source?: string;
  extra_data?: Record<string, any>;
  projectType?: ProjectType; // Added for consistency with SiteMaster
  status?: string; // Added for consistency with mockRescopingSite
  stage?: string; // Added for consistency with mockRescopingSite
  progress?: number; // Added for consistency with mockRescopingSite
  geom?: string; // Added for consistency with mockRescopingSite

  // Rescoping Added Fields
  has_akses_gedung?: boolean;
  gedung_nama?: string;
  gedung_pic_nama?: string;
  gedung_pic_telp?: string;
  gedung_akses_status?: string;
  gedung_dokumen_url?: string;
  survey_date?: string;
  survey_result?: 'ok' | 'nok';
  survey_nok_reason?: string;
  survey_dokumen_url?: string;
  erfin_number?: string;
  erfin_date?: string;
  erfin_ready_date?: string;
  erfin_dokumen_url?: string;
}

export interface ProjectFile {
    id: string;
    projectId: string;
    title: string;
    originalName: string;
    size: string;
    type: string;
    uploadedAt: string;
    uploadedBy: string;
}

export const files: ProjectFile[] = [
    { id: 'f1', projectId: 'p1', title: 'Contract Phase 1', originalName: 'contract_p1_signed.pdf', size: '2.4 MB', type: 'PDF', uploadedAt: '2024-01-15', uploadedBy: 'u_mgr' },
    { id: 'f2', projectId: 'p1', title: 'Site Plan A', originalName: 'site_a_layout.dwg', size: '15 MB', type: 'DWG', uploadedAt: '2024-01-20', uploadedBy: 'u_eng' },
    { id: 'f3', projectId: 'p2', title: 'Combat Drill Manual', originalName: 'manual_v1.pdf', size: '5.1 MB', type: 'PDF', uploadedAt: '2024-02-01', uploadedBy: 'u_lead' },
];

export type UserRole = 'director' | 'operational' | 'admin' | 'finance' | 'field';

export interface User {
    id: string;
    name: string;
    role: UserRole;
    avatar?: string;
}

export const USERS: User[] = [
    { id: 'u_field', name: 'Field Engineer', role: 'field' },
    { id: 'u_ops', name: 'Operational Staff', role: 'operational' },
    { id: 'u_fin', name: 'Finance Staff', role: 'finance' },
    { id: 'u_dir', name: 'Director', role: 'director' },
    { id: 'u_adm', name: 'Admin Backoffice', role: 'admin' },
];

export interface Certification {
    id: string;
    person_id: string; // -> people.id
    nama_sertifikat: string; // e.g., 'TKPK 1', 'BFA', 'BES'
    expired_date?: string; // date nullable
    created_at?: string;
    updated_at?: string;
}

export interface TeamMember {
    id: string;
    team_id: string; // -> teams.id
    person_id: string; // -> people.id
    jabatan: string; // Leader | Engineer | Member | Transport | SITAC | Lainnya
    is_field_leader: boolean;
    joined_date?: string;
    left_date?: string;
}

export interface TerminDocument {
    id: string;
    typeId: string; // The requirement type, e.g. 'surat_pengajuan', 'bast'
    name: string;
    url: string;
    uploadedBy: string; // User ID or name
    uploadedAt: string;
}

export interface Team {
    id: string;
    name: string;
    coordinator_id?: string; // -> people.id
    project_type: ProjectType;
    regional?: string;
    status_aktif: boolean;
    members?: TeamMember[]; // Keeping for legacy/convenience, though ideally queried from TeamMember table
}

export interface Person {
    id: string;
    name: string;
    role: UserRole; // Keeping for system access role
    
    // New Extended fields
    nik?: string;
    tempat_lahir?: string;
    tanggal_lahir?: string;
    agama?: string;
    jenis_kelamin?: 'Laki-laki' | 'Perempuan';
    no_ktp?: string;
    alamat?: string;
    nama_kontak_darurat?: string;
    no_kontak_darurat?: string;
    pendidikan_terakhir?: string;
    nama_sekolah?: string;
    jurusan?: string;
    tahun_lulus?: number;
    regional?: string;
    foto_ktp_url?: string;
    foto_diri_url?: string;
    status_aktif: boolean;
    jabatan?: string; // Leader | Engineer | Member | Member 1 | Member 2 | SITAC | Transport | Lainnya
    pekerjaan?: ProjectType | ''; // Project Type or ''

    // Legacy fields (keeping for backward compatibility if used elsewhere)
    email: string;
    phone: string;
    vendor: string;
    deviceId?: string;
    imei1?: string;
    imei2?: string;
    avatar?: string;
    joinedAt?: string;
}

export interface Termin {
    id: string;
    projectId: string;
    name: string;
    percentage: number;
    status: 'pending' | 'in_progress' | 'completed';
}

export const projects: Project[] = [
  // Total Budget: 1,650,000,000 (S1 500M + S2 750M + S3 400M)
  { id: 'p1', name: 'Reengineering Q1 Jakarta 2024', type: 'FILTER', status: 'active', description: 'Phase 1 filter deployment', sites: 3, budget: 1650000000, cost: 750000000 },
  { id: 'p2', name: 'Jabo - Combat 500 Sites', type: 'COMBAT', sites: 500, activeTeams: 12, budget: 50000000000, cost: 12000000000, status: 'active', startDate: '2023-11-01', endDate: '2024-06-30' },
  { id: 'p3', name: 'Blacksite Alpha', type: 'BLACKSITE', status: 'active' },
  { id: 'p4', name: 'L2H Migration', type: 'L2H', status: 'active' },
  { id: 'p5', name: 'Refinen Upgrade', type: 'RESCOPING', status: 'completed' }, // Changed from REFINEN to RESCOPING
];

export const sites: Site[] = [
    // Execution sites array (empty for FILTER initially, keeping COMBAT site for example if needed)
    { 
        id: 's2', projectId: 'p2', name: 'Site B - Combat', location: 'Bandung', budget: 750000000,
        teamId: 't2', jobName: 'Site Readiness', contractNumber: 'CTR-2024-002', startDate: '2024-02-01', endDate: '2024-04-01'
    },
];

// Add a mock Rescoping site for testing
export const mockRescopingSite: Site = {
    id: 'RS-001',
    projectId: 'p5', // Assuming p5 is now RESCOPING
    name: 'Rescoping Test Site',
    location: 'Jakarta Selatan',
    status: 'In Progress',
    stage: 'assigned',
    progress: 30,
    budget: 150000000,
    teamId: 't1',
    projectType: 'RESCOPING',
    jobName: 'RESCOPING JKS-001',
    contractNumber: 'RESP-CTR-2026',
    import_source: 'Rescoping DB',
    geom: '-6.200000, 106.816666'
};
sites.push(mockRescopingSite);

export const people: Person[] = [
    { 
        id: 'u1', name: 'John Doe', role: 'director', 
        no_ktp: '3171234567890001', email: 'director@demo.com', phone: '081234567890', 
        vendor: 'Internal', joinedAt: '2023-01-15', avatar: 'https://i.pravatar.cc/150?u=u1', status_aktif: true,
        jabatan: 'Manager', pekerjaan: ''
    },
    { 
        id: 'u2', name: 'Budi Field', role: 'field', 
        no_ktp: '3171234567890002', email: 'budi@demo.com', phone: '081234567891', 
        vendor: 'Vendor X', deviceId: 'DEV-001', imei1: '123456789012345', imei2: '123456789012346',
        joinedAt: '2023-03-10', foto_ktp_url: 'ktp_budi.jpg', foto_diri_url: 'selfie_budi.jpg', status_aktif: true,
        jabatan: 'Engineer', pekerjaan: 'FILTER', regional: 'Jabodetabek'
    },
    { 
        id: 'u3', name: 'Ervin Putra', role: 'operational', 
        no_ktp: '3171234567890003', email: 'bob.j@vendor-y.com', phone: '081234567892', 
        vendor: 'Vendor Y', deviceId: 'DEV-002', imei1: '987654321098765', 
        joinedAt: '2023-02-20', status_aktif: true,
        jabatan: 'Leader', pekerjaan: 'BLACKSITE', regional: 'Jabodetabek'
    },
    { 
        id: 'u4', name: 'Alice Finance', role: 'finance', 
        no_ktp: '3171234567890004', email: 'finance@demo.com', phone: '081234567893', 
        vendor: 'Internal', joinedAt: '2023-01-10', status_aktif: true,
        jabatan: 'Finance', pekerjaan: ''
    },
    { 
        id: 'u5', name: 'Charlie Field 2', role: 'field', 
        no_ktp: '3171234567890005', email: 'charlie.f@vendor-x.com', phone: '081234567894', 
        vendor: 'Vendor X', deviceId: 'DEV-003', imei1: '112233445566778',
        joinedAt: '2023-06-01', status_aktif: true,
        jabatan: 'Engineer', pekerjaan: 'COMBAT', regional: 'Jawa Barat'
    },
    { 
        id: 'u6', name: 'Admin Backoffice', role: 'admin', 
        no_ktp: '3171234567890006', email: 'backoffice@demo.com', phone: '081234567895', 
        vendor: 'Internal', joinedAt: '2023-01-01', status_aktif: true,
        jabatan: 'Admin', pekerjaan: ''
    },
    // === CSV IMPORTS ===
    { id: 'p_csv_1776399752105_1', name: 'Hairul Umam', role: 'field', no_ktp: '3672051007040002', email: 'umam45171@gmail.com', phone: '085691351474', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: 'Member 1', pekerjaan: 'BLACKSITE', regional: 'Jabodetabek' },
    { id: 'p_csv_1776399752105_2', name: 'Holil Jaelani', role: 'field', no_ktp: '3672072609000001', email: 'holiljaeni26@gmail.com', phone: '085774349836', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: 'Engineer', pekerjaan: 'BLACKSITE', regional: 'Jabodetabek' },
    { id: 'p_csv_1776399752105_3', name: 'Ervin Putra', role: 'field', no_ktp: '3672081709970002', email: 'ervinputra7@gmail.com', phone: '089528148622', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: 'Leader', pekerjaan: 'BLACKSITE', regional: 'Jabodetabek' },
    { id: 'p_csv_1776399752105_4', name: 'Adia Fardan', role: 'field', no_ktp: '3672051903050001', email: 'adifauzan232@gmail.com', phone: '081280278681', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: 'Member 2', pekerjaan: 'BLACKSITE', regional: 'Jabodetabek' },
    { id: 'p_csv_1776399752105_5', name: 'Nusa Satria Wibowo', role: 'field', no_ktp: '3201132407790005', email: 'nusa.satria@gmail.com', phone: '081288235307', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: 'Leader', pekerjaan: 'FILTER', regional: 'Jabodetabek' },
    { id: 'p_csv_1776399752105_6', name: 'Supriadi Sihombing', role: 'field', no_ktp: '3603120202920015', email: 'supriadi.sihombing@gmail.co,', phone: '087856872575', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: 'Member 2', pekerjaan: 'FILTER', regional: 'Jabodetabek' },
    { id: 'p_csv_1776399752105_7', name: 'Rizky Maulana Fridiansyah', role: 'field', no_ktp: '3201170610040003', email: 'rizkymaulanafridiansyahh@gmail.com', phone: '0881011667544', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: 'Member', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752105_8', name: 'Rivaldi', role: 'field', no_ktp: '3173031111991001', email: 'rivaldialdi4139@gmail.com', phone: '081285190136', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: 'Leader', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752105_9', name: 'Hamzah', role: 'field', no_ktp: '3173030708890001', email: 'hamzzahhbzah@gmail.com', phone: '087783208474', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_10', name: 'Dwi Prastiyo', role: 'field', no_ktp: '3672082304980003', email: 'dwiaksara038@gmail.com', phone: '082124008431', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_11', name: 'Suriya Berata', role: 'field', no_ktp: '3201170705080007', email: 'suryaberata9@gmail.com', phone: '083821328790', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_12', name: 'Irfan Kurniawan', role: 'field', no_ktp: '3175041512790015', email: 'elbadroen79@gmail.com', phone: '0882005596976', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_13', name: 'Arif Sarif Hidayat', role: 'field', no_ktp: '3205331005931005', email: 'sbalap732@gmail.com', phone: '083869060068', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_14', name: 'Rizal pangestu', role: 'field', no_ktp: '3303131601010002', email: 'nzallotsky427@gmail.com', phone: '08986627784', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_15', name: 'Wahyu Nur M Kahfi', role: 'field', no_ktp: '3275062210010022', email: 'mhmmd.kahfii13@gmail.com', phone: '0895401515685', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_16', name: 'Isbandi', role: 'field', no_ktp: '', email: 'isbandiconk@gmail.com', phone: '085928017725', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_17', name: 'Denny Suhendra', role: 'field', no_ktp: '1802231709890001', email: 'densuh44@gmail.com', phone: '087788712907', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_18', name: 'Septian Dwi Cahyo Ginting', role: 'field', no_ktp: '3637013010990003', email: 'septianginting24@gmail.com', phone: '087838074835', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_19', name: 'Sandi Sukardi', role: 'field', no_ktp: '3203110209880001', email: 'sandisukardi02@gmail.com', phone: '085393637988', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_20', name: 'Heri', role: 'field', no_ktp: '3203112808860010', email: 'toktokheri07@gmail.com', phone: '087797091552', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_21', name: 'Harco Setiawan', role: 'field', no_ktp: '3276011508900002', email: 'harco.setiawan@gmail.com', phone: '0895392148712', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_22', name: 'Herman Fitrianto', role: 'field', no_ktp: '3275040409780019', email: 'fitrianto.herman88@gmail.com', phone: '081276731861', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_23', name: 'Irvan Fadhila', role: 'field', no_ktp: '3174050410981002', email: 'irfanfadhila78@gmail.com', phone: '087885739880', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_24', name: 'Suryadi', role: 'field', no_ktp: '3275061807930007', email: 'adis94546@gmail.com', phone: '082116226863', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_25', name: 'Agus Mustofa', role: 'field', no_ktp: '3174092705860011', email: 'agusiyank@gmail.com', phone: '087785622266', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_26', name: 'Dede Robiulawal', role: 'field', no_ktp: '3175090412860003', email: 'dederobiulawal0412@gmail.com', phone: '085719357820', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_27', name: 'Hendhy Kurniawan', role: 'field', no_ktp: '3173022106820001', email: 'kenziehendhy@gmail.com', phone: '087874442334', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_28', name: 'Paberto', role: 'field', no_ktp: '3172040109890002', email: 'Bertocuy@gmail.com', phone: '082241837640', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' },
    { id: 'p_csv_1776399752106_29', name: 'Iqbal Khoirul Rasyid', role: 'field', no_ktp: '3173012406980003', email: 'ikbalkhoirul12345@gmail.com', phone: '089525410233', vendor: 'Internal', joinedAt: '2024-04-17', status_aktif: true, jabatan: '', pekerjaan: '', regional: '' }
];

export const teams: Team[] = [
    { 
        id: 't1', project_type: 'FILTER', name: 'Team Alpha (Budi)', status_aktif: true, regional: 'Jakarta', coordinator_id: 'u1',
        members: [
            { id: 'tm1', team_id: 't1', person_id: 'u2', jabatan: 'Engineer', is_field_leader: false }, // Budi
            { id: 'tm2', team_id: 't1', person_id: 'u3', jabatan: 'Leader', is_field_leader: true }
        ] 
    },
    { 
        id: 't3', project_type: 'FILTER', name: 'Team Beta', status_aktif: true, regional: 'Jakarta', coordinator_id: 'u1',
        members: [
            { id: 'tm3', team_id: 't3', person_id: 'u5', jabatan: 'Engineer', is_field_leader: false }, // Charlie
            { id: 'tm4', team_id: 't3', person_id: 'u3', jabatan: 'Leader', is_field_leader: true }
        ] 
    },
    { 
        id: 't2', name: 'Bravo Team (Combat)', status_aktif: true, project_type: 'COMBAT', regional: 'Jawa Barat'
    },
    // === CSV IMPORTS ===
    { id: 't_csv_1776399752105_1', name: 'Team BLACKSITE (Ervin Putra)', status_aktif: true, project_type: 'BLACKSITE', regional: 'Jabodetabek', members: [
            { id: 'tm_csv_p_csv_1776399752105_3', team_id: 't_csv_1776399752105_1', person_id: 'p_csv_1776399752105_3', jabatan: 'Leader', is_field_leader: true },
            { id: 'tm_csv_p_csv_1776399752105_4', team_id: 't_csv_1776399752105_1', person_id: 'p_csv_1776399752105_4', jabatan: 'Member 2', is_field_leader: false }
        ] },
    { id: 't_csv_1776399752105_2', name: 'Team FILTER (Nusa Satria Wibowo)', status_aktif: true, project_type: 'FILTER', regional: 'Jabodetabek', members: [
            { id: 'tm_csv_p_csv_1776399752105_5', team_id: 't_csv_1776399752105_2', person_id: 'p_csv_1776399752105_5', jabatan: 'Leader', is_field_leader: true },
            { id: 'tm_csv_p_csv_1776399752105_6', team_id: 't_csv_1776399752105_2', person_id: 'p_csv_1776399752105_6', jabatan: 'Member 2', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752105_7', team_id: 't_csv_1776399752105_2', person_id: 'p_csv_1776399752105_7', jabatan: 'Member', is_field_leader: false }
        ] },
    { id: 't_csv_1776399752105_3', name: 'Team FILTER (Rivaldi)', status_aktif: true, project_type: 'FILTER', regional: 'Jabodetabek', members: [
            { id: 'tm_csv_p_csv_1776399752105_8', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752105_8', jabatan: 'Leader', is_field_leader: true },
            { id: 'tm_csv_p_csv_1776399752105_9', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752105_9', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_10', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_10', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_11', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_11', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_12', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_12', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_13', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_13', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_14', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_14', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_15', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_15', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_16', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_16', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_17', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_17', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_18', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_18', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_19', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_19', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_20', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_20', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_21', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_21', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_22', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_22', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_23', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_23', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_24', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_24', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_25', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_25', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_26', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_26', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_27', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_27', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_28', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_28', jabatan: '', is_field_leader: false },
            { id: 'tm_csv_p_csv_1776399752106_29', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_29', jabatan: '', is_field_leader: false }
        ] }
];

export interface TeamMemberRecord {
    id: string;
    team_id: string;
    person_id: string;
    role: 'Team Leader' | 'Engineer' | 'Koordinator';
    is_active: boolean;
    joined_at: string;
}

export const teamMembersRecords: TeamMemberRecord[] = [
    { id: 'tm-1', team_id: 't1', person_id: 'u3', role: 'Team Leader', is_active: true, joined_at: '2023-01-01' }, // Ervin
    { id: 'tm-2', team_id: 't1', person_id: 'u2', role: 'Engineer', is_active: true, joined_at: '2023-01-15' }, // Budi
    { id: 'tm-3', team_id: 't3', person_id: 'u3', role: 'Team Leader', is_active: true, joined_at: '2023-06-01' }, // Ervin
    { id: 'tm-4', team_id: 't3', person_id: 'u5', role: 'Engineer', is_active: true, joined_at: '2023-06-15' }, // Charlie
    { id: 'tm-5', team_id: 't2', person_id: 'u1', role: 'Koordinator', is_active: true, joined_at: '2023-06-01' }, // John,
    // === CSV IMPORTS ===
    { id: 'tm_csv_p_csv_1776399752105_3', team_id: 't_csv_1776399752105_1', person_id: 'p_csv_1776399752105_3', role: 'Team Leader', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752105_4', team_id: 't_csv_1776399752105_1', person_id: 'p_csv_1776399752105_4', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752105_5', team_id: 't_csv_1776399752105_2', person_id: 'p_csv_1776399752105_5', role: 'Team Leader', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752105_6', team_id: 't_csv_1776399752105_2', person_id: 'p_csv_1776399752105_6', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752105_7', team_id: 't_csv_1776399752105_2', person_id: 'p_csv_1776399752105_7', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752105_8', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752105_8', role: 'Team Leader', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752105_9', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752105_9', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_10', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_10', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_11', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_11', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_12', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_12', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_13', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_13', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_14', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_14', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_15', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_15', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_16', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_16', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_17', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_17', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_18', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_18', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_19', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_19', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_20', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_20', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_21', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_21', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_22', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_22', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_23', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_23', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_24', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_24', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_25', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_25', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_26', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_26', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_27', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_27', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_28', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_28', role: 'Engineer', is_active: true, joined_at: '2024-04-17' },
    { id: 'tm_csv_p_csv_1776399752106_29', team_id: 't_csv_1776399752105_3', person_id: 'p_csv_1776399752106_29', role: 'Engineer', is_active: true, joined_at: '2024-04-17' }
];

export const termins: Termin[] = [
    // FILTER Flow Termins (30, 50, 10, 10)
    { id: 't-f1', projectId: 'p1', name: 'Termin 1 (30%)', percentage: 30, status: 'completed' },
    { id: 't-f2', projectId: 'p1', name: 'Termin 2 (50%)', percentage: 50, status: 'in_progress' },
    { id: 't-f3', projectId: 'p1', name: 'Termin 3 (10%)', percentage: 10, status: 'pending' },
    { id: 't-f4', projectId: 'p1', name: 'Termin 4 (10%)', percentage: 10, status: 'pending' },

    // COMBAT Flow Termins (6 steps)
    { id: 't-c1', projectId: 'p2', name: 'SITAC', percentage: 15, status: 'completed' },
    { id: 't-c2', projectId: 'p2', name: 'Dimentle Cruz', percentage: 15, status: 'completed' },
    { id: 't-c3', projectId: 'p2', name: 'Towing', percentage: 15, status: 'in_progress' },
    { id: 't-c4', projectId: 'p2', name: 'PSB PLN', percentage: 20, status: 'pending' },
    { id: 't-c5', projectId: 'p2', name: 'Instal Cruz', percentage: 20, status: 'pending' },
    { id: 't-c6', projectId: 'p2', name: 'OPTIM', percentage: 15, status: 'pending' },
];

// Removed early duplicate of SiteMaterial

export interface SiteEvidence {
    id: string;
    siteId: string;
    work_order_id?: string;
    filename: string;
    originalName: string;
    uploadedBy: string; // user name or id
    uploadedAt: string;
    progressTag: string; // e.g., "50%", "BAST Final", "Material Arrival"
    url?: string; // mock url
    tag?: string; // e.g. 'implementasi_foto'
    engineer_caption?: string;
    admin_caption?: string | null;
    atp_checked?: boolean;
}

export type CostStatus = 'pengajuan' | 'approved' | 'paid' | 'rejected';
export type TerminStatus = 'pending' | 'pending_review' | 'pengajuan' | 'diterima' | 'dibayarkan' | 'approved' | 'paid' | 'rejected' | 'locked' | 'open' | 'submitted';

export interface SiteCost {
    id: string;
    siteId: string;
    typeTermin: string; // e.g. "Termin 1 (30%)"
    status: CostStatus;
    jumlahPengajuan: number;
    jumlahPembayaran: number;
    submittedBy?: string;
    approvedBy?: string;
    paidAt?: string;
}

export interface SKP {
    id: string;
    siteId: string;
    skpNumber: string;
    tanggal: string;
    keterangan: string;
    status: 'Draft' | 'Submitted' | 'Received';
    uploadedBy: string; // user id
    documentUrl?: string; // mock url
    receivedEvidenceUrl?: string; // proof of receipt
}

export interface SiteMaterial {
    id: string;
    siteId: string;
    skpId?: string; 
    skp?: string; 
    date: string;
    
    // New fields replacing just string[] for items
    nama_material: string;
    spesifikasi?: string;
    jumlah?: number;
    satuan?: string;
    harga_satuan?: number;
    status?: string;
    keterangan?: string;
    source?: string;
    source_file_name?: string;
    added_by?: string;
    added_at?: string;

    // Master link
    material_master_id?: string;
    source_master: boolean;
}

export interface MaterialMaster {
    id: string;
    kode_material: string | null;
    nama_material: string;
    kategori: string | null;
    spesifikasi: string | null;
    satuan: string | null;
    harga_satuan: number | null;
    keterangan: string | null;
    status_aktif: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface MaterialTransaction {
    id: string;
    material_master_id: string | null;
    material_nama: string;
    material_type: string | null;
    direction: 'IN' | 'OUT';
    quantity: number;
    delivery_date: string | null;
    delivery_note_no: string | null;
    po_number: string | null;
    vendor_pengirim: string | null;
    sender: string | null;
    receiver: string | null;
    catatan: string | null;
    imported_from: string | null;
    created_at?: string;
    source_file?: string;
    imported_at?: string;
    raw_data?: Record<string, any>;
}

export const materialTransactions: MaterialTransaction[] = [
    {
        id: 'trx-1',
        material_master_id: 'mm-1',
        material_nama: 'Semen Portland',
        material_type: 'Sipil',
        direction: 'IN',
        quantity: 100,
        delivery_date: '2024-04-01',
        delivery_note_no: 'DN-001',
        po_number: 'PO-001',
        vendor_pengirim: 'PT Pemasok',
        sender: 'Agus',
        receiver: 'Budi',
        catatan: '',
        imported_from: 'legacy.xlsx',
        created_at: '2024-04-01T10:00:00Z'
    }
];

export interface ATPTask {
  id: string;
  site_id: string; // references SiteMaster.id or SiteMaster.site_id depending on usage, we'll use site_id like "BKS598"
  pdid: string | null;
  tiket_atp: string | null;
  tagging_status: 'pending' | 'done' | 'na';
  cell_capture_done: boolean;
  catatan: string | null;
  updated_by: string | null;
  updated_at: string;
}

export const atpTasks: ATPTask[] = [
  { id: 'atp-1', site_id: 'JKT010', pdid: null, tiket_atp: 'ATP000000282692', tagging_status: 'pending', cell_capture_done: false, catatan: 'Need PDID', updated_by: 'u1', updated_at: '2024-03-01T10:00:00Z' }
];

export const materialMasterRecords: MaterialMaster[] = [
    {
        id: 'mm-1', kode_material: 'MT-001', nama_material: 'Semen Portland', kategori: 'Sipil', spesifikasi: '50kg', satuan: 'ZAK', harga_satuan: 65000, keterangan: '', status_aktif: true
    },
    {
        id: 'mm-2', kode_material: 'MT-002', nama_material: 'Besi Beton D13', kategori: 'Sipil', spesifikasi: 'Ulir 12m', satuan: 'Btg', harga_satuan: 115000, keterangan: 'SNI', status_aktif: true
    },
    {
        id: 'mm-3', kode_material: 'MT-003', nama_material: 'Filter LTE 900 MHz', kategori: 'Telecom', spesifikasi: '900MHz Bandpass', satuan: 'pcs', harga_satuan: 2500000, keterangan: 'Import', status_aktif: true
    },
    {
        id: 'mm-4', kode_material: 'MT-004', nama_material: 'Cable RG-8', kategori: 'Telecom', spesifikasi: 'Coaxial 50ohm', satuan: 'm', harga_satuan: 25000, keterangan: '', status_aktif: true
    },
    {
        id: 'mm-5', kode_material: null, nama_material: 'Pipa PVC', kategori: 'Sipil', spesifikasi: '3 inch', satuan: 'Btg', harga_satuan: 75000, keterangan: '', status_aktif: false
    }
];

export interface SiteBoQ {
    id: string;
    siteId: string;
    itemCode: string;
    description: string;
    quantity: number;
    unit: string;
}

export const siteBoQRecords: SiteBoQ[] = [
    { id: 'boq1', siteId: 's1', itemCode: 'MAT-001', description: 'Semen Portland', quantity: 50, unit: 'Sak' },
    { id: 'boq2', siteId: 's1', itemCode: 'MAT-002', description: 'Besi Beton D13', quantity: 100, unit: 'Batang' },
    { id: 'boq3', siteId: 's1', itemCode: 'MAT-003', description: 'Kabel NYM 2x1.5', quantity: 200, unit: 'Meter' },
    { id: 'boq4', siteId: 's2', itemCode: 'MAT-004', description: 'Antena Sectoral', quantity: 3, unit: 'Unit' },
    { id: 'boq5', siteId: 's2', itemCode: 'MAT-005', description: 'RRU', quantity: 3, unit: 'Unit' },
    { id: 'boq6', siteId: 's2', itemCode: 'MAT-006', description: 'BBU', quantity: 1, unit: 'Unit' },
    { id: 'boq7', siteId: 'BKS598', itemCode: 'EQP-001', description: 'EQP Filter LTE 900', quantity: 1, unit: 'Set' },
];

export const skpRecords: SKP[] = [
    { id: 'skp-1', siteId: 's1', skpNumber: 'SKP-2024-001', tanggal: '2024-01-10', keterangan: 'Material Sipil Awal', status: 'Received', uploadedBy: 'u_lead' },
    { id: 'skp-2', siteId: 's1', skpNumber: 'SKP-2024-002', tanggal: '2024-01-15', keterangan: 'Material Elektrikal', status: 'Submitted', uploadedBy: 'u_lead' },
    { id: 'skp-3', siteId: 's2', skpNumber: 'SKP-2024-003', tanggal: '2024-02-05', keterangan: 'Kabel dan Antena', status: 'Draft', uploadedBy: 'u_lead' },
];

export const siteMaterials: SiteMaterial[] = [
    { id: 'm1', siteId: 's1', skpId: 'skp-1', skp: 'SKP-2024-001', date: '2024-01-12', nama_material: 'Semen 50 Sak', source_master: false },
    { id: 'm2', siteId: 's1', skpId: 'skp-2', skp: 'SKP-2024-002', date: '2024-01-15', nama_material: 'Kabel NYM 2x1.5', source_master: false },
    { id: 'm3', siteId: 's2', skpId: 'skp-3', skp: 'SKP-2024-003', date: '2024-02-05', nama_material: 'Antena Sectoral', source_master: false },
];

export const siteEvidence: SiteEvidence[] = [
    { id: 'e1', siteId: 's1', filename: 'prog_0.jpg', originalName: 'sitac_clear.jpg', uploadedBy: 'u_eng', uploadedAt: '2024-01-10', progressTag: '0% Start' },
    { id: 'e2', siteId: 's1', filename: 'prog_30.jpg', originalName: 'pondasi_done.jpg', uploadedBy: 'u_eng', uploadedAt: '2024-01-25', progressTag: '30% Pondasi' },
    { id: 'e3', siteId: 'JKS509', work_order_id: 'atp-wo-1', filename: 'rru_instalasi.jpg', originalName: 'rru.jpg', uploadedBy: 'u_field', uploadedAt: '2026-03-22T10:00:00Z', progressTag: 'Instalasi', url: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=500&h=500&fit=crop', tag: 'implementasi_foto', engineer_caption: 'RRU', admin_caption: null, atp_checked: false },
    { id: 'e4', siteId: 'JKS509', work_order_id: 'atp-wo-1', filename: 'kabel_power.jpg', originalName: 'kabel.jpg', uploadedBy: 'u_field', uploadedAt: '2026-03-22T10:05:00Z', progressTag: 'Instalasi', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&h=500&fit=crop', tag: 'implementasi_foto', engineer_caption: '', admin_caption: null, atp_checked: false },
];

export const siteCosts: SiteCost[] = [
    { id: 'c1', siteId: 's1', typeTermin: 'DP 30%', status: 'paid', jumlahPengajuan: 150000000, jumlahPembayaran: 150000000, paidAt: '2024-01-12' },
    { id: 'c3', siteId: 's1', typeTermin: 'Termin 2 (Progress 80%)', status: 'approved', jumlahPengajuan: 100000000, jumlahPembayaran: 0, submittedBy: 'u_lead' },
];

export interface FilterTerm {
    id: string;
    siteId: string;
    step: number;
    name: string;
    percentage: number;
    status: TerminStatus;
    amountRequest?: number;
    amountPaid?: number;
    rejectionNote?: string;
    // New fields for strict validation
    formData?: Record<string, unknown>;
    documents?: TerminDocument[];
    proofUrl?: string; // mock
    submittedAt?: string;
    paidAt?: string;
}

export const filterTerms: FilterTerm[] = [
    {
        id: 'ft-1',
        siteId: 'JKT010',
        step: 1,
        name: 'Termin 1 (30%)',
        percentage: 30,
        status: 'approved',
        amountRequest: 45000000,
        amountPaid: 0,
        submittedAt: '2024-02-15T10:00:00Z'
    },
    {
        id: 'ft-2',
        siteId: 'JKT010',
        step: 2,
        name: 'Termin 2 (50%)',
        percentage: 50,
        status: 'open',
        amountRequest: 0,
        amountPaid: 0,
    },
    {
        id: 'ft-3',
        siteId: 'JKT010',
        step: 3,
        name: 'Termin 3 (10%)',
        percentage: 10,
        status: 'open',
        amountRequest: 0,
        amountPaid: 0,
    },
    {
        id: 'ft-4',
        siteId: 'JKT010',
        step: 4,
        name: 'Termin 4 (10%)',
        percentage: 10,
        status: 'open',
        amountRequest: 0,
        amountPaid: 0,
    },
    {
        id: 'ft-rs1',
        siteId: 'RS-001',
        step: 1,
        name: 'Termin 1 (30%)',
        percentage: 30,
        status: 'paid',
        amountRequest: 45000000,
        amountPaid: 45000000,
        paidAt: '2026-03-12T09:00:00Z'
    },
    {
        id: 'ft-rs2',
        siteId: 'RS-001',
        step: 2,
        name: 'Termin 2 (50%)',
        percentage: 50,
        status: 'open',
        amountRequest: 75000000,
        amountPaid: 0,
    },
    {
        id: 'ft-rs3',
        siteId: 'RS-001',
        step: 3,
        name: 'Termin 3 (10%)',
        percentage: 10,
        status: 'open',
        amountRequest: 0,
        amountPaid: 0,
    },
    {
        id: 'ft-rs4',
        siteId: 'RS-001',
        step: 4,
        name: 'Termin 4 (10%)',
        percentage: 10,
        status: 'open',
        amountRequest: 0,
        amountPaid: 0,
    },
];

export interface CombatSubStep {
    id: string;
    name: string;
    maxAmount: number;
    status: TerminStatus;
    assignedRole: 'engineer' | 'team_leader' | 'management' | 'finance'; // Primary actor who starts it
    requiredDocs?: string[]; // Legacy - To be replaced by configuration 
    requiredPhotos?: string[]; // Legacy - To be replaced by configuration
    
    // Data
    amountApproved?: number; // For Term 1.1 Ops Cash
    amountRequest?: number;
    amountPaid?: number;
    paidAt?: string;
    rejectionNote?: string;
    
    // New fields for strict validation
    formData?: Record<string, unknown>;
    documents?: TerminDocument[];
    
    // Legacy uploads (mock)
    uploadedDocs?: string[]; 
    uploadedPhotos?: string[];
}

export interface CombatTerm {
    id: string;
    siteId: string;
    step: number;
    title: string;
    totalMaxAmount: number;
    subSteps: CombatSubStep[];
    status: 'locked' | 'in_progress' | 'completed';
}

export const combatTerms: CombatTerm[] = [
    {
        id: 'ct-1', siteId: 's2', step: 1, title: '1. SITAC', totalMaxAmount: 35000000, status: 'in_progress',
        subSteps: [
            { id: '1.1', name: '1.1 Ops Cash', maxAmount: 5000000, status: 'paid', assignedRole: 'management', amountApproved: 4500000, amountPaid: 4500000, paidAt: '2024-02-01' },
            { id: '1.2', name: '1.2 Sewa Lahan', maxAmount: 15000000, status: 'approved', assignedRole: 'team_leader', requiredDocs: ['Perjanjian Sewa', 'Foto Lokasi', 'KTP Owner'], uploadedDocs: ['doc_sewa.pdf'] },
            { id: '1.3', name: '1.3 Izin Warga', maxAmount: 3000000, status: 'open', assignedRole: 'team_leader', requiredDocs: ['KTP Warga', 'Foto Bersama'] },
            { id: '1.4', name: '1.4 Izin Aparat', maxAmount: 7000000, status: 'locked', assignedRole: 'team_leader', requiredDocs: ['Surat Izin Resmi'] },
        ]
    },
    {
        id: 'ct-2', siteId: 's2', step: 2, title: '2. Dimentle Cruz', totalMaxAmount: 38500000, status: 'locked',
        subSteps: [
            { id: '2.1', name: '2.1 DP 30%', maxAmount: 11550000, status: 'locked', assignedRole: 'team_leader', requiredDocs: ['PO', 'Contract'] },
            { id: '2.2', name: '2.2 Install 50%', maxAmount: 19250000, status: 'locked', assignedRole: 'team_leader', requiredPhotos: ['Progress Photo'] },
            { id: '2.3', name: '2.3 BAST 20%', maxAmount: 7700000, status: 'locked', assignedRole: 'team_leader', requiredDocs: ['BAST Doc'], requiredPhotos: ['Final Photo'] },
        ]
    },
    {
        id: 'ct-3', siteId: 's2', step: 3, title: '3. Towing', totalMaxAmount: 5550000, status: 'locked',
        subSteps: [
            { id: '3.1', name: '3.1 Towing Execution', maxAmount: 5550000, status: 'locked', assignedRole: 'team_leader', requiredDocs: ['Surat Jalan'], requiredPhotos: ['Foto Towing'] }
        ]
    },
     {
        id: 'ct-4', siteId: 's2', step: 4, title: '4. PSB PLN', totalMaxAmount: 11000000, status: 'locked',
        subSteps: [
            { id: '4.1', name: '4.1 Pasang Baru', maxAmount: 11000000, status: 'locked', assignedRole: 'team_leader', requiredDocs: ['Bukti Daftar'], requiredPhotos: ['Foto Meteran'] }
        ]
    },
    {
        id: 'ct-5', siteId: 's2', step: 5, title: '5. Instal Cruz', totalMaxAmount: 21000000, status: 'locked',
        subSteps: [
            { id: '5.1', name: '5.1 DP 30%', maxAmount: 6300000, status: 'locked', assignedRole: 'team_leader', requiredDocs: ['Equipment List'] },
            { id: '5.2', name: '5.2 Install 50%', maxAmount: 10500000, status: 'locked', assignedRole: 'team_leader', requiredPhotos: ['Install Photo'] },
            { id: '5.3', name: '5.3 BAST 20%', maxAmount: 4200000, status: 'locked', assignedRole: 'team_leader', requiredDocs: ['BAST Final'] },
        ]
    },
    {
        id: 'ct-6', siteId: 's2', step: 6, title: '6. OPTIM', totalMaxAmount: 4500000, status: 'locked',
        subSteps: [
            { id: '6.1', name: '6.1 Optimization', maxAmount: 4500000, status: 'locked', assignedRole: 'team_leader', requiredDocs: ['Report Optim', 'Signal Params'] }
        ]
    }
];

export type SiteMasterStatus = 'unassigned' | 'assigned' | 'spk_active' | 'completed' | 'reallocated' | 'on_hold';


export interface SiteMaster {
    id: string; // BIGINT equivalent
    unique_key: string; // e.g. "BKS598-S1" or "BKS598"
    site_id: string; // e.g., "BKS598"
    ne_id: string; // e.g., "BKS598MT1"
    site_name: string;
    cluster?: string;
    sector?: string;
    tower_provider?: string;
    plan_capex: string;
    area: string;
    region: string;
    nop: string;
    sow_eqp: string;
    quantity: number;
    sow_pekerjaan: string;
    po_tsel: string;
    mitra: string;

    project_type: ProjectType;
    status: SiteMasterStatus;
    stage: SiteStage;
    stage_updated_at?: string;
    stage_notes?: string;
    ineom_registered: boolean;
    import_source?: string;
    notes?: string;
    raw_data?: Record<string, any>;
    provinsi?: string;
    team_assigned?: string;

    impl_cico_done?: boolean;
    impl_rfi_done?: boolean;
    impl_rfs_done?: boolean;
    impl_dokumen_done?: boolean;

    longitude?: number;
    latitude?: number;

    work_order_id?: string; // Link to Work Order
    project_site_id?: string; // Link to Execution Site

    team_id?: string;
    field_leader_id?: string; // -> people.id, the field leader assigned to THIS specific site

    batch_ref: string;
    imported_by: string; // ID of the user
    imported_at: string; // Timestamp
    geom?: string; // Added for consistency
}

export const siteMasterRecords: SiteMaster[] = [
    {
        id: 'sm-rs001',
        unique_key: 'JKS-RESP-01',
        site_id: 'RS-001',
        ne_id: 'RS-001-NE',
        site_name: 'Rescoping Test Site',
        plan_capex: 'CAPEX RESCOPING 2026',
        area: 'Area 1',
        region: 'R03 Jakarta & Banten',
        nop: 'NOP JAKARTA SELATAN',
        sow_eqp: 'EQP RESCOPING',
        quantity: 1,
        sow_pekerjaan: 'Rescoping Services Jakarta',
        po_tsel: '4200052177',
        mitra: 'Smartelco',
        project_type: 'RESCOPING',
        status: 'assigned',
        stage: 'assigned',
        ineom_registered: false,
        batch_ref: 'EPROC20260310001_Smartelco_BoQ_Rescoping_Batch1',
        imported_by: 'u_adm',
        imported_at: '2026-03-10T09:00:00Z',
        team_id: 't1',
        geom: '-6.200000, 106.816666'
    },
    {
        id: 'sm-jks509',
        unique_key: 'JKS509',
        site_id: 'JKS509',
        ne_id: 'JKS509MT1',
        site_name: 'MSJDBBSSALAM',
        cluster: 'JAKSEL',
        plan_capex: 'CAPEX FILTER 2026',
        area: 'Area 2',
        region: 'R03 Jakarta',
        nop: 'NOP JAKARTA SELATAN',
        sow_eqp: 'EQP FILTER',
        quantity: 1,
        sow_pekerjaan: 'Instalasi Filter',
        po_tsel: '4200052178',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'assigned',
        stage: 'imported',
        ineom_registered: true,
        batch_ref: 'EPROC20260310002_Smartelco_BoQ_Filter_Batch1',
        imported_by: 'u_adm',
        imported_at: '2026-03-01T09:00:00Z',
        latitude: -6.2255,
        longitude: 106.8016,
    },
    {
        id: 'sm1',
        unique_key: 'BKS598',
        site_id: 'BKS598',
        ne_id: 'BKS598MT1', // Adjusted to match site_id prefix for realism
        site_name: 'CIPINANGJAYA2DMT',
        sector: '1',
        tower_provider: 'Tower Bersama',
        plan_capex: 'CAPEX RAN Filter Frekuensi 900 MHz 2024',
        area: 'Area 2',
        region: 'R03 Jakarta & Banten',
        nop: 'NOP EASTERN JAKARTA',
        sow_eqp: 'EQP Filter LTE 900',
        quantity: 1,
        sow_pekerjaan: 'Impl Services for Filter Jabo & Jabar',
        po_tsel: '4200052176',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'unassigned',
        stage: 'imported',
        stage_updated_at: '2024-02-10T10:00:00Z',
        ineom_registered: false,
        batch_ref: 'EPROC20240210001_Smartelco_BoQ_Filter_Batch1',
        imported_by: 'u_adm',
        imported_at: '2024-02-10T10:00:00Z',
        latitude: -6.2479,
        longitude: 106.5844,
        raw_data: {
            permit_start_date: '2026-02-10',
            permit_expiry_date: '2026-06-10',
            tpas_status: true,
            tp_status: true,
            caf_status: null,
            akses_provider: 'Tower Bersama',
            akses_kunci: 'Gembok Tsel',
            akses_pic: 'Andi',
            akses_telp: '0812-3456-7890',
            impl_plan: '2026-03-10',
            impl_aktual: null,
            impl_ci: null,
            impl_co: null,
            impl_rfi: null,
            impl_rfs: null,
            impl_dok: null
        }
    },
    {
        id: 'sm2',
        unique_key: 'JKS026',
        site_id: 'JKT010',
        ne_id: 'JKT010-S1',
        site_name: 'Menara Sudirman',
        cluster: 'JAKSEL',
        sector: 'Sector 1',
        tower_provider: 'TBG',
        plan_capex: 'CAPEX RAN Filter Frekuensi 900 MHz 2024',
        area: 'Area 2',
        region: 'R03 Jakarta & Banten',
        nop: 'NOP EASTERN JAKARTA',
        sow_eqp: 'EQP Filter LTE 900',
        quantity: 2,
        sow_pekerjaan: 'Impl Services for Filter Jabo & Jabar',
        po_tsel: '4200052176',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'assigned',
        stage: 'permit_ready',
        stage_updated_at: '2024-03-01T14:00:00Z',
        stage_notes: 'Permit TPAS sudah turun',
        ineom_registered: true,
        impl_cico_done: true, // For testing T2a unlock
        impl_rfs_done: false,
        impl_dokumen_done: false,
        work_order_id: 'wo-1', // Linked to WO-2024-001
        batch_ref: 'EPROC20240210001_Smartelco_BoQ_Filter_Batch1',
        imported_by: 'u_adm',
        imported_at: '2024-02-10T10:05:00Z',
        latitude: -6.2255,
        longitude: 106.8016,
        raw_data: {
            permit_start_date: '2026-02-15',
            permit_expiry_date: '2026-03-20', // Expiring soon
            tpas_status: true,
            tp_status: false,
            caf_status: true,
            akses_provider: 'TBG',
            akses_kunci: 'Padlock Numeric',
            akses_pic: 'Junaedi',
            akses_telp: '0813-1030-0199',
            impl_plan: '2026-03-15',
            impl_aktual: '2026-03-15',
            impl_ci: '08:00',
            impl_co: '17:30',
            impl_rfi: true,
            impl_rfs: false,
            impl_dok: null
        }
    },
    {
        id: 'sm3',
        unique_key: 'BDS105',
        site_id: 'BDS105',
        ne_id: 'BDS105MT2',
        site_name: 'DAGO-PAKAR',
        sector: '3',
        tower_provider: 'Mitratel',
        plan_capex: 'CAPEX RAN COMBAT 2024',
        area: 'Area 3',
        region: 'R12 Jawa Barat',
        nop: 'NOP WEST JAVA',
        sow_eqp: 'EQP COMBAT NEW',
        quantity: 1,
        sow_pekerjaan: 'Impl Services Combat Jabar',
        po_tsel: '4200052273',
        mitra: 'Smartelco',
        project_type: 'COMBAT',
        status: 'spk_active',
        stage: 'implementasi',
        stage_updated_at: '2024-02-28T14:00:00Z',
        ineom_registered: true,
        impl_cico_done: true,
        impl_rfs_done: true,
        impl_dokumen_done: true,
        work_order_id: 'wo-2', // Linked to WO-2024-002
        project_site_id: 's2', // Linked to actual Site 2
        batch_ref: 'EPROC20240215002_Smartelco_BoQ_Combat_Batch1',
        imported_by: 'u_mgr',
        imported_at: '2024-02-15T14:30:00Z',
        latitude: -6.8795,
        longitude: 107.6254,
    },
    {
        id: 'sm4',
        unique_key: 'TGR088',
        site_id: 'TGR088',
        ne_id: 'TGR088MT1',
        site_name: 'BSD_CITY_SQUARE',
        sector: '1',
        plan_capex: 'CAPEX RAN Filter Frekuensi 900 MHz 2024',
        area: 'Area 2',
        region: 'R03 Jakarta & Banten',
        nop: 'NOP WESTERN JAKARTA',
        sow_eqp: 'EQP Filter LTE 900',
        quantity: 1,
        sow_pekerjaan: 'Impl Services for Filter Jabo & Jabar',
        po_tsel: '4200052176',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'completed',
        stage: 'completed',
        stage_updated_at: '2024-03-01T10:00:00Z',
        ineom_registered: true,
        work_order_id: 'wo-1',
        batch_ref: 'EPROC20240105001_Smartelco_BoQ_Filter_Early',
        imported_by: 'u_adm',
        imported_at: '2024-01-05T09:15:00Z',
        latitude: -6.2954,
        longitude: 106.6436,
    },
    {
        id: 'sm5',
        unique_key: 'JKS999',
        site_id: 'JKS999',
        ne_id: 'JKS999MT1',
        site_name: 'GHOST_SITE_SOUTH',
        sector: '2',
        plan_capex: 'CAPEX RAN Filter Frekuensi 900 MHz 2024',
        area: 'Area 2',
        region: 'R03 Jakarta & Banten',
        nop: 'NOP EASTERN JAKARTA',
        sow_eqp: 'EQP Filter LTE 900',
        quantity: 0,
        sow_pekerjaan: 'Impl Services for Filter Jabo & Jabar',
        po_tsel: '4200052176',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'reallocated',
        stage: 'imported',
        stage_updated_at: '2024-02-10T10:00:00Z',
        ineom_registered: false,
        notes: 'Site sudah dialihkan ke mitra lain',
        batch_ref: 'EPROC20240210001_Smartelco_BoQ_Filter_Batch1',
        imported_by: 'u_adm',
        imported_at: '2024-02-10T10:00:00Z',
        // Intentional: missing coordinates to test "missing coordinates" logic
    },
    {
        id: 'sm-real-1',
        unique_key: 'BKS025-3',
        site_id: 'BKS025',
        ne_id: 'BKS025MT1',
        site_name: 'TBG/CIBARUSOHTL15M',
        sector: '3',
        tower_provider: 'TBG', // inferred
        plan_capex: 'Batch#2',
        area: 'Area 2',
        region: 'R03 Jakarta & Banten',
        nop: '',
        sow_eqp: 'R0009678385',
        quantity: 1,
        sow_pekerjaan: 'Filtering',
        po_tsel: '4200052273',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'spk_active',
        stage: 'permit_process',
        ineom_registered: true,
        batch_ref: 'Real-Excel-Data',
        imported_by: 'system',
        imported_at: '2026-04-21T00:00:00Z',
        latitude: -6.44299,
        longitude: 107.065261,
        team_id: 't2',
        raw_data: {
            "PROJECT TYPE": "FILTERING",
            "SITE MOVING STATUS": "Fix",
            "FINAL SITE ID": "BKS025",
            "TP NAME": "TBG",
            "IOMS REGISTERED": "Registered",
            "PERMIT STATUS": "1. Planning",
            "ISSUE PROBLEM": "1. NO ISSUE",
            "IMPLEMENTASI STATUS": "Scheduled",
            "TEAM": "Denny Suhendra",
            "STATUS ATP": "REQUEST PDID",
            "PRIO CAPEX FINAL": "Batch#2",
        }
    },
    {
        id: 'sm-real-2',
        unique_key: 'JTX540-3',
        site_id: 'JTX540',
        ne_id: 'JTX540MT1',
        site_name: 'JTX540-PERMANENCOMBATPASARKRAMATDJATI-PTI-MACRO',
        sector: '3',
        tower_provider: 'PTI',
        plan_capex: 'Batch#2',
        area: 'Area 2',
        region: 'R03 Jakarta & Banten',
        nop: '',
        sow_eqp: 'R0009678886',
        quantity: 1,
        sow_pekerjaan: 'Filtering',
        po_tsel: '4200052273',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'spk_active',
        stage: 'rfs_done',
        ineom_registered: true,
        batch_ref: 'Real-Excel-Data',
        imported_by: 'system',
        imported_at: '2026-04-21T00:00:00Z',
        latitude: -6.29509,
        longitude: 106.86988,
        team_id: 't2',
        raw_data: {
            "PROJECT TYPE": "FILTERING",
            "SITE MOVING STATUS": "Fix",
            "FINAL SITE ID": "JTX540",
            "TP NAME": "PTI",
            "IOMS REGISTERED": "Registered",
            "PERMIT STATUS": "5. Permit Released",
            "ISSUE PROBLEM": "1. NO ISSUE",
            "IMPLEMENTASI STATUS": "RFS",
            "TEAM": "Nusa Satria Wibowo",
            "TEAM ONSITE STATUS": "ONSITE",
            "STATUS ATP": "UPLOAD TAGGING DONE",
            "PRIO CAPEX FINAL": "Batch#2",
        }
    },
    // --- UNASSIGNED SITES (from Detail Site-ID) ---
    {
        id: 'sm-tnx240',
        unique_key: 'TNX240',
        site_id: 'TNX240',
        ne_id: 'TNX240MT1',
        site_name: 'AeonmallbsdAptBranz-IBS-M',
        region: 'R03 Jakarta Banten',
        cluster: 'KAB TANGERANG',
        plan_capex: 'CAPEX FILTER 2026',
        area: 'Area 2',
        nop: 'NOP TANGERANG',
        sow_eqp: 'EQP FILTER',
        quantity: 1,
        sow_pekerjaan: 'Instalasi Filter',
        po_tsel: '',
        mitra: '',
        project_type: 'FILTER',
        status: 'unassigned',
        stage: 'imported',
        ineom_registered: false,
        batch_ref: 'Detail_Site-ID',
        imported_by: 'u_adm',
        imported_at: '2026-03-20T09:00:00Z',
        latitude: -6.30501,
        longitude: 106.64217,
        tower_provider: 'INTI BANGUN SEJAHTERA'
    },
    {
        id: 'sm-jsx887',
        unique_key: 'JSX887',
        site_id: 'JSX887',
        ne_id: 'JSX887MT1',
        site_name: 'SomeSite-Jakarta',
        region: 'R03 Jakarta',
        cluster: 'JAKSEL',
        plan_capex: 'CAPEX FILTER 2026',
        area: 'Area 2',
        nop: 'NOP JAKARTA SELATAN',
        sow_eqp: 'EQP FILTER',
        quantity: 1,
        sow_pekerjaan: 'Instalasi Filter',
        po_tsel: '',
        mitra: '',
        project_type: 'FILTER',
        status: 'unassigned',
        stage: 'imported',
        ineom_registered: false,
        batch_ref: 'Detail_Site-ID',
        imported_by: 'u_adm',
        imported_at: '2026-03-21T09:00:00Z',
        latitude: -6.2255,
        longitude: 106.8016,
        tower_provider: 'MITRATEL'
    },
    {
        id: 'sm-tgr463',
        unique_key: 'TGR463',
        site_id: 'TGR463',
        ne_id: 'TGR463MT1',
        site_name: 'E_TGR463_Jlkpcrewed-TBG',
        region: 'R03 Jakarta Banten',
        cluster: 'TANGERANG',
        plan_capex: 'CAPEX FILTER 2026',
        area: 'Area 2',
        nop: 'NOP TANGERANG',
        sow_eqp: 'EQP FILTER',
        quantity: 1,
        sow_pekerjaan: 'Instalasi Filter',
        po_tsel: '',
        mitra: '',
        project_type: 'FILTER',
        status: 'unassigned',
        stage: 'imported',
        ineom_registered: false,
        batch_ref: 'Detail_Site-ID',
        imported_by: 'u_adm',
        imported_at: '2026-03-22T09:00:00Z',
        latitude: -6.216991,
        longitude: 106.538491,
        tower_provider: 'TOWER BERSAMA'
    },
    {
        id: 'sm-tgr317',
        unique_key: 'TGR317',
        site_id: 'TGR317',
        ne_id: 'TGR317MT1',
        site_name: 'E_TGR317_Cangkudubalarajapermai-TBG',
        region: 'R03 Jakarta Banten',
        cluster: 'TANGERANG',
        plan_capex: 'CAPEX FILTER 2026',
        area: 'Area 2',
        nop: 'NOP TANGERANG',
        sow_eqp: 'EQP FILTER',
        quantity: 1,
        sow_pekerjaan: 'Instalasi Filter',
        po_tsel: '',
        mitra: '',
        project_type: 'FILTER',
        status: 'unassigned',
        stage: 'imported',
        ineom_registered: false,
        batch_ref: 'Detail_Site-ID',
        imported_by: 'u_adm',
        imported_at: '2026-03-23T09:00:00Z',
        latitude: -6.182635,
        longitude: 106.458132,
        tower_provider: 'TOWER BERSAMA'
    },
    // --- ASSIGNED SITES (from ReEngineering Progress) ---
    {
        id: 'sm-clg020',
        unique_key: 'CLG020',
        site_id: 'CLG020',
        ne_id: 'CLG020MT1',
        site_name: 'E_CLG020_Cilegon4',
        region: 'R03 Jakarta & Banten',
        cluster: 'CILEGON',
        plan_capex: 'Batch#2',
        area: 'Area 2',
        nop: 'NOP CILEGON',
        sow_eqp: 'R0011058250',
        quantity: 1,
        sow_pekerjaan: 'Filtering',
        po_tsel: '4200052176',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'spk_active',
        stage: 'rfs_done',
        ineom_registered: true,
        batch_ref: 'Batch#2',
        imported_by: 'system',
        imported_at: '2026-03-09T00:00:00Z',
        latitude: -6.024053,
        longitude: 106.068951,
        tower_provider: 'DMT',
        work_order_id: 'atp-wo-clg020'
    },
    {
        id: 'sm-clg036',
        unique_key: 'CLG036',
        site_id: 'CLG036',
        ne_id: 'CLG036MT1',
        site_name: 'E_CLG036_Banjarnegara-IND',
        region: 'R03 Jakarta & Banten',
        cluster: 'CILEGON',
        plan_capex: 'Batch#4',
        area: 'Area 2',
        nop: 'NOP CILEGON',
        sow_eqp: 'R0013075459',
        quantity: 1,
        sow_pekerjaan: 'Filtering',
        po_tsel: '9372/TC.03/EN-01/XI/2025',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'spk_active',
        stage: 'rfs_done',
        ineom_registered: true,
        batch_ref: 'Batch#4',
        imported_by: 'system',
        imported_at: '2026-03-09T00:00:00Z',
        latitude: -6.042431,
        longitude: 105.984701,
        tower_provider: 'DMT',
        work_order_id: 'atp-wo-clg036'
    },
    {
        id: 'sm-clg071',
        unique_key: 'CLG071',
        site_id: 'CLG071',
        ne_id: 'CLG071MT1',
        site_name: 'E_CLG071_Karangasemcilegon-PTI',
        region: 'R03 Jakarta & Banten',
        cluster: 'CILEGON',
        plan_capex: 'Batch#4',
        area: 'Area 2',
        nop: 'NOP CILEGON',
        sow_eqp: 'R0013075435',
        quantity: 1,
        sow_pekerjaan: 'Filtering',
        po_tsel: '9372/TC.03/EN-01/XI/2025',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'spk_active',
        stage: 'rfs_done',
        ineom_registered: true,
        batch_ref: 'Batch#4',
        imported_by: 'system',
        imported_at: '2026-04-17T00:00:00Z',
        latitude: -6.037469,
        longitude: 106.056404,
        tower_provider: 'PTI',
        work_order_id: 'atp-wo-clg071'
    },
    {
        id: 'sm-clg115',
        unique_key: 'CLG115',
        site_id: 'CLG115',
        ne_id: 'CLG115MT1',
        site_name: 'E_CLG115_Bendungancilegon-TBG',
        region: 'R03 Jakarta & Banten',
        cluster: 'CILEGON',
        plan_capex: 'Batch#2',
        area: 'Area 2',
        nop: 'NOP CILEGON',
        sow_eqp: 'R0011058231',
        quantity: 1,
        sow_pekerjaan: 'Filtering',
        po_tsel: '4200052176',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'spk_active',
        stage: 'rfs_done',
        ineom_registered: true,
        batch_ref: 'Batch#2',
        imported_by: 'system',
        imported_at: '2026-03-09T00:00:00Z',
        latitude: -6.034021,
        longitude: 106.050611,
        tower_provider: 'TBG',
        work_order_id: 'atp-wo-clg115'
    },
    {
        id: 'sm-clg117',
        unique_key: 'CLG117',
        site_id: 'CLG117',
        ne_id: 'CLG117MT1',
        site_name: 'E_CLG117M41_Kampungciporong-DMT',
        region: 'R03 Jakarta & Banten',
        cluster: 'CILEGON',
        plan_capex: 'Batch#6',
        area: 'Area 2',
        nop: 'NOP CILEGON',
        sow_eqp: 'R0022633078',
        quantity: 1,
        sow_pekerjaan: 'Filtering',
        po_tsel: '5992/TC.03/EN-01/IV/2026',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'spk_active',
        stage: 'rfs_done',
        ineom_registered: true,
        batch_ref: 'Batch#6',
        imported_by: 'system',
        imported_at: '2026-04-17T00:00:00Z',
        latitude: -5.94011,
        longitude: 106.06038,
        tower_provider: 'DMT',
        work_order_id: 'atp-wo-clg117'
    },
    {
        id: 'sm-clg117-2',
        unique_key: 'CLG117-2',
        site_id: 'CLG117',
        ne_id: 'CLG117MT1',
        site_name: 'E_CLG117M41_Kampungciporong-DMT',
        region: 'R03 Jakarta & Banten',
        cluster: 'CILEGON',
        plan_capex: 'Batch#5',
        area: 'Area 2',
        nop: 'NOP CILEGON',
        sow_eqp: 'Batch#5',
        quantity: 1,
        sow_pekerjaan: 'Filtering',
        po_tsel: '',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'unassigned',
        stage: 'imported',
        ineom_registered: false,
        batch_ref: 'Batch#5',
        imported_by: 'system',
        imported_at: '2026-03-09T00:00:00Z',
        latitude: -5.94011,
        longitude: 106.06038,
        tower_provider: 'DMT',
        stage_notes: '9. Cancelled - SITE-ID N/A IOMS'
    },
    {
        id: 'sm-clg071',
        unique_key: 'CLG071',
        site_id: 'CLG071',
        ne_id: 'CLG071MT1',
        site_name: 'E_CLG071_Karangasemcilegon-PTI',
        region: 'R03 Jakarta & Banten',
        cluster: 'CILEGON',
        plan_capex: 'Batch#4',
        area: 'Area 2',
        nop: 'NOP CILEGON',
        sow_eqp: 'R0013075435',
        quantity: 1,
        sow_pekerjaan: 'Filtering',
        po_tsel: '9372/TC.03/EN-01/XI/2025',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'spk_active',
        stage: 'rfs_done',
        ineom_registered: true,
        batch_ref: 'Batch#4',
        imported_by: 'system',
        imported_at: '2026-04-22T00:00:00Z',
        latitude: -6.0345,
        longitude: 106.0678,
        tower_provider: 'PTI',
        work_order_id: 'atp-wo-clg071',
        notes: 'Tidak bisa create permit karena sistemnya error. Sudah lapor ke helpdesk INEOM sejak 24 Feb'
    },
    {
        id: 'sm-clg115',
        unique_key: 'CLG115',
        site_id: 'CLG115',
        ne_id: 'CLG115MT1',
        site_name: 'E_CLG115_Bendungancilegon-TBG',
        region: 'R03 Jakarta & Banten',
        cluster: 'CILEGON',
        plan_capex: 'Batch#2',
        area: 'Area 2',
        nop: 'NOP CILEGON',
        sow_eqp: 'R0011058231',
        quantity: 1,
        sow_pekerjaan: 'Filtering',
        po_tsel: '4200052176',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'spk_active',
        stage: 'rfs_done',
        ineom_registered: true,
        batch_ref: 'Batch#2',
        imported_by: 'system',
        imported_at: '2026-04-23T00:00:00Z',
        latitude: -6.0456,
        longitude: 106.0789,
        tower_provider: 'TBG',
        work_order_id: 'atp-wo-clg115'
    },
    {
        id: 'sm-clg117',
        unique_key: 'CLG117',
        site_id: 'CLG117',
        ne_id: 'CLG117MT1',
        site_name: 'E_CLG117M41_Kampungciporong-DMT',
        region: 'R03 Jakarta & Banten',
        cluster: 'CILEGON',
        plan_capex: 'Batch#6',
        area: 'Area 2',
        nop: 'NOP CILEGON',
        sow_eqp: 'R0022633078',
        quantity: 1,
        sow_pekerjaan: 'Filtering',
        po_tsel: '5992/TC.03/EN-01/IV/2026',
        mitra: 'Smartelco',
        project_type: 'FILTER',
        status: 'spk_active',
        stage: 'rfs_done',
        ineom_registered: true,
        batch_ref: 'Batch#6',
        imported_by: 'system',
        imported_at: '2026-04-24T00:00:00Z',
        latitude: -6.0567,
        longitude: 106.0890,
        tower_provider: 'DMT',
        work_order_id: 'atp-wo-clg117'
    }
];

export const STAGE_ORDER = [
    'imported',
    'assigned',
    'survey',
    'survey_nok',
    'erfin_process',
    'erfin_ready',
    'permit_process',
    'permit_ready',
    'akses_process',
    'akses_ready',
    'implementasi',
    'rfi_done',
    'rfs_done',
    'dokumen_done',
    'bast',
    'invoice',
    'completed'
];

export const STAGE_PIPELINES: Record<string, SiteStage[]> = {
    'FILTER': [
        'imported', 'assigned', 'permit_process', 'permit_ready', 
        'akses_process', 'akses_ready', 'implementasi', 'rfs_done', 
        'dokumen_done', 'bast', 'invoice', 'completed'
    ],
    'RESCOPING': [
        'imported', 'assigned', 'survey', 'erfin_process', 'erfin_ready', 
        'permit_process', 'permit_ready', 'akses_process', 'akses_ready', 
        'implementasi', 'rfi_done', 'dokumen_done', 'bast', 'invoice', 'completed'
    ]
};
// fallback
['COMBAT', 'BLACKSITE', 'L2H'].forEach(pt => STAGE_PIPELINES[pt] = STAGE_PIPELINES['FILTER']);

export interface SiteStageLog {
    id: string; // auto-increment / SurrealDB auto ID
    site_master_id: string; // reference to site_master (required)
    from_stage: SiteStage | null; // string, nullable (null if first stage)
    to_stage: SiteStage; // string, required
    notes?: string; // text, nullable
    created_by: string; // reference to users (nullable) - user ID
    created_at: string; // datetime, default now()
    evidence_files?: string[]; // array of site_files IDs
    source?: 'manual' | 'bulk_import'; // flag for bulk imported stage transitions
}

export const siteStageLogs: SiteStageLog[] = [
    { id: 'log-1', site_master_id: 'sm2', from_stage: 'imported', to_stage: 'assigned', created_by: 'u_mgr', created_at: '2024-02-11T09:00:00Z' },
    { id: 'log-2', site_master_id: 'sm2', from_stage: 'assigned', to_stage: 'permit_process', notes: 'Pengurusan permit sedang berjalan', created_by: 'u_lead', created_at: '2024-02-12T08:30:00Z', evidence_files: ['file-1'] },
    { id: 'log-3', site_master_id: 'sm3', from_stage: 'akses_ready', to_stage: 'implementasi', created_by: 'u_eng', created_at: '2024-02-28T14:00:00Z' },
    // Rescoping sample logs
    {
        id: 'sl-rs1',
        site_master_id: 'sm-rs001',
        from_stage: 'imported',
        to_stage: 'assigned',
        notes: 'Assigned to Team Alpha',
        created_by: 'u_ops',
        created_at: '2026-03-12T09:00:00Z'
    }
];

// --- UNIFIED SITE FILES ---
export interface SiteFile {
    id: string;
    site_id: string;
    filename: string;
    original_name: string;
    file_url: string;
    mime_type: string;
    file_size: number;
    source: 'direct_upload' | 'stage_update' | 'bast_dokumen';
    stage_context?: string;
    stage_log_id?: string;
    uploaded_by: string;
    uploaded_at: string;
    atp_checked?: boolean;
    description?: string;
    tags?: string[];
}

export const mockSiteFiles: SiteFile[] = [
    {
        id: 'file-1',
        site_id: 'sm2', // BKS598
        filename: 'permit_tpas_BKS598.pdf',
        original_name: 'permit_tpas.pdf',
        file_url: '#',
        mime_type: 'application/pdf',
        file_size: 2100000, 
        source: 'stage_update',
        stage_context: 'permit_process→permit_ready',
        stage_log_id: 'log-2',
        uploaded_by: 'Sari',
        uploaded_at: '2024-02-12T08:31:00Z',
        tags: ['permit', 'TPAS'],
        atp_checked: true
    },
    {
        id: 'file-2',
        site_id: 'sm2', // BKS598
        filename: 'foto_site_BKS598.jpg',
        original_name: 'foto_site.jpg',
        file_url: '#',
        mime_type: 'image/jpeg',
        file_size: 1400000, 
        source: 'stage_update',
        stage_context: 'permit_process→permit_ready',
        stage_log_id: 'log-2',
        uploaded_by: 'Sari',
        uploaded_at: '2024-02-12T08:31:00Z',
        atp_checked: true
    },
    {
        id: 'file-3',
        site_id: 'sm2',
        filename: 'spk_BKS598.pdf',
        original_name: 'spk_BKS598.pdf',
        file_url: '#',
        mime_type: 'application/pdf',
        file_size: 1200000, 
        source: 'direct_upload',
        uploaded_by: 'Admin',
        uploaded_at: '2024-02-10T10:00:00Z',
        atp_checked: false
    }
];

// --- SIDEBAR COUNTERS & HELPERS ---

/**
 * Returns the count of active sites grouped by project type.
 * Applies role-based filtering:
 * - management/backoffice/finance: sees all sites across all projects.
 * - team_leader/engineer: sees only sites assigned to their team.
 */
export const getActiveSiteCountsByType = (currentUser: User, _allProjects: Project[], masters: SiteMaster[]) => {
    const counts: Record<ProjectType, number> = {
        FILTER: 0,
        COMBAT: 0,
        BLACKSITE: 0,
        L2H: 0,
        RESCOPING: 0,
    };

    // Which teams does this user belong to?
    const userTeamIds = Array.from(new Set(
        teamMembersRecords
            .filter(tm => tm.person_id === currentUser.id)
            .map(tm => tm.team_id)
    ));

    // Is the user restricted?
    const isRestricted = currentUser.role === 'field';

    masters.forEach(site => {
        // Find assigned team from work_order
        let siteTeamId: string | undefined;
        if (site.work_order_id) {
            const wo = workOrders.find(w => w.id === site.work_order_id);
            if (wo) siteTeamId = wo.assignedTeamId;
        }

        // If restricted, they can only see sites assigned to their team
        if (isRestricted && (!siteTeamId || !userTeamIds.includes(siteTeamId))) {
            return;
        }

        // Just use project_type directly
        if (site.project_type && counts[site.project_type] !== undefined) {
             counts[site.project_type]++;
        }
    });

    return counts;
};

// --- ACTIVITY LOG (MOCK) ---
export interface ActivityLog {
    id: string;
    userId: string;
    action: string;
    target: string;
    timestamp: string;
    wa_formatted_text?: string;
}

export const activityFeed: ActivityLog[] = [
    { 
      id: 'act-new-1', 
      userId: 'u_ops', 
      action: 'released Permit', 
      target: 'JKS509 S1', 
      timestamp: '5 menit lalu',
      wa_formatted_text: `*Permit Rilis*\nSTATUS PERMIT : 5. Permit Released\nPROJECT TYPE  : FILTERING\nSITE ID-Sector: JKS509-1\nSITE NAME     : MSJDBBSSALAM\nJUMLAH FILTER : 2\nLONG-LAT      : 106.538491, -6.216991`
    },
    { 
      id: 'act-new-2', 
      userId: 'u_field', 
      action: 'marked Site RFS', 
      target: 'JKS509', 
      timestamp: '1 jam lalu',
      wa_formatted_text: `Site RFS: JKS509 ATP000000288836`
    },
    { 
      id: 'act-new-3', 
      userId: 'u_adm', 
      action: 'signed BAST', 
      target: 'JKS509', 
      timestamp: '2 jam lalu',
      wa_formatted_text: `BAST Selesai: JKS509 ATP000000288836`
    },
    { 
      id: 'act-new-4', 
      userId: 'u_dir', 
      action: 'approved Termin 3', 
      target: 'JKS509', 
      timestamp: '3 jam lalu',
      wa_formatted_text: `T3 Disetujui: JKS509 Rp 15jt`
    },
    { id: 'act-1', userId: 'u_lead', action: 'submitted Termin 1 pengajuan', target: 'Site 1B', timestamp: '2 jam lalu' },
    { id: 'act-2', userId: 'u_mgr', action: 'approved Termin 1', target: 'Site 1A', timestamp: '5 jam lalu' },
    { id: 'act-3', userId: 'u_fin', action: 'processed payment Termin 1', target: 'Site 1A', timestamp: '6 jam lalu' },
    { id: 'act-4', userId: 'u_eng', action: 'uploaded 3 evidence photos', target: 'Site 2A', timestamp: '1 hari lalu' },
    { id: 'act-5', userId: 'u_lead', action: 'submitted request for Ops Cash', target: 'Site Demo Pondasi', timestamp: '1 hari lalu' },
    { id: 'act-6', userId: 'u_mgr', action: 'approved WO-2024-004 to SPK', target: 'WO-2024-004', timestamp: '2 hari lalu' },
    { id: 'act-7', userId: 'u_eng', action: 'marked SKP Received', target: 'Site Cruz Alpha', timestamp: '3 hari lalu' },
    { id: 'act-8', userId: 'u_fin', action: 'processed payment for Termin 2', target: 'Site 1C', timestamp: '4 hari lalu' },
];

// --- MAPPING PERSISTENCE ---
export interface SavedExcelTemplate {
    id: string;
    sheetType: 'stage_update' | 'site_technical' | 'inventory_movement' | 'workforce' | 'material_master';
    columnMappings: Record<string, string>; // Excel Header -> System Field
    valueNormalizations: Record<string, string>; // Raw Cell Value (status) -> System Stage
}

export const savedExcelTemplates: SavedExcelTemplate[] = [];

export interface SiteTechnicalDetail {
    id: string;
    site_id: string;
    ne_id?: string;
    layer?: string;          // 'ML', 'MR', 'L1800', 'L2100' etc.
    sector?: number | string;
    freq_band?: string;
    longitude?: number;
    latitude?: number;
    ant_type?: string;
    height?: number | string;
    tp_id?: string;
    tp_name?: string;
    site_type?: string;
    cell_name?: string;
    enodeb_id?: number | string;
    cell_id?: number | string;
    local_cell_id?: number | string;
    tal?: number | string;
    tac?: number | string;
    area?: string;
    bsc?: string;
    site_name?: string;
    provinsi?: string;
    address?: string;
    kecamatan?: string;
    kabupaten?: string;
    desa?: string;
    cluster?: string;
    branch?: string;
    region?: string;
    raw_data?: Record<string, any>;
    source_file?: string;
    imported_at?: string;
}

// Seed with realistic demo data for testing
export const siteTechnicalDetails: SiteTechnicalDetail[] = [
    // 6 rows for first mock site: 2 layers (ML + MR) × 3 sectors
    { id: 'tech-001', site_id: 'BKS001', ne_id: 'BKS001MT1', layer: 'ML', sector: 1, freq_band: 'L1800', longitude: 107.015, latitude: -6.215, ant_type: 'ZTE ATR518R14v06', height: 32, tp_id: 'TP-BKS001', tp_name: 'TOWER_BERSAMA', cell_name: 'BKS001_1800_1', enodeb_id: 50401, cell_id: 1, local_cell_id: 1, cluster: 'BEKASI_SELATAN', region: 'JABAR', source_file: 'Detail_Site-ID.xlsx', imported_at: new Date().toISOString() },
    { id: 'tech-002', site_id: 'BKS001', ne_id: 'BKS001MT2', layer: 'ML', sector: 2, freq_band: 'L1800', longitude: 107.015, latitude: -6.215, ant_type: 'ZTE ATR518R14v06', height: 32, tp_id: 'TP-BKS001', tp_name: 'TOWER_BERSAMA', cell_name: 'BKS001_1800_2', enodeb_id: 50401, cell_id: 2, local_cell_id: 2, cluster: 'BEKASI_SELATAN', region: 'JABAR', source_file: 'Detail_Site-ID.xlsx', imported_at: new Date().toISOString() },
    { id: 'tech-003', site_id: 'BKS001', ne_id: 'BKS001MT3', layer: 'ML', sector: 3, freq_band: 'L1800', longitude: 107.015, latitude: -6.215, ant_type: 'ZTE ATR518R14v06', height: 32, tp_id: 'TP-BKS001', tp_name: 'TOWER_BERSAMA', cell_name: 'BKS001_1800_3', enodeb_id: 50401, cell_id: 3, local_cell_id: 3, cluster: 'BEKASI_SELATAN', region: 'JABAR', source_file: 'Detail_Site-ID.xlsx', imported_at: new Date().toISOString() },
    { id: 'tech-004', site_id: 'BKS001', ne_id: 'BKS001MR1', layer: 'MR', sector: 1, freq_band: 'L2100', longitude: 107.015, latitude: -6.215, ant_type: 'Huawei AAU5613', height: 30, tp_id: 'TP-BKS001', tp_name: 'TOWER_BERSAMA', cell_name: 'BKS001_2100_1', enodeb_id: 50402, cell_id: 4, local_cell_id: 1, cluster: 'BEKASI_SELATAN', region: 'JABAR', source_file: 'Detail_Site-ID.xlsx', imported_at: new Date().toISOString() },
    { id: 'tech-005', site_id: 'BKS001', ne_id: 'BKS001MR2', layer: 'MR', sector: 2, freq_band: 'L2100', longitude: 107.015, latitude: -6.215, ant_type: 'Huawei AAU5613', height: 30, tp_id: 'TP-BKS001', tp_name: 'TOWER_BERSAMA', cell_name: 'BKS001_2100_2', enodeb_id: 50402, cell_id: 5, local_cell_id: 2, cluster: 'BEKASI_SELATAN', region: 'JABAR', source_file: 'Detail_Site-ID.xlsx', imported_at: new Date().toISOString() },
    { id: 'tech-006', site_id: 'BKS001', ne_id: 'BKS001MR3', layer: 'MR', sector: 3, freq_band: 'L2100', longitude: 107.015, latitude: -6.215, ant_type: 'Huawei AAU5613', height: 30, tp_id: 'TP-BKS001', tp_name: 'TOWER_BERSAMA', cell_name: 'BKS001_2100_3', enodeb_id: 50402, cell_id: 6, local_cell_id: 3, cluster: 'BEKASI_SELATAN', region: 'JABAR', source_file: 'Detail_Site-ID.xlsx', imported_at: new Date().toISOString() },
    { id: 'tech-tnx240', site_id: 'TNX240', ne_id: 'TNX240MT1', layer: 'ML', sector: 1, freq_band: 'L1800', longitude: 106.64217, latitude: -6.30501, cluster: 'KAB TANGERANG', region: 'R03 Jakarta Banten', tp_name: 'INTI BANGUN SEJAHTERA', source_file: 'Detail_Site-ID.xlsx' },
    { id: 'tech-jsx887', site_id: 'JSX887', ne_id: 'JSX887MT1', layer: 'ML', sector: 1, freq_band: 'L1800', longitude: 106.8016, latitude: -6.2255, cluster: 'JAKSEL', region: 'R03 Jakarta', tp_name: 'MITRATEL', source_file: 'Detail_Site-ID.xlsx' },
    { id: 'tech-tgr463', site_id: 'TGR463', ne_id: 'TGR463MT1', layer: 'ML', sector: 1, freq_band: 'L1800', longitude: 106.538491, latitude: -6.216991, cluster: 'TANGERANG', region: 'R03 Jakarta Banten', tp_name: 'TOWER BERSAMA', source_file: 'Detail_Site-ID.xlsx' },
    { id: 'tech-tgr317', site_id: 'TGR317', ne_id: 'TGR317MT1', layer: 'ML', sector: 1, freq_band: 'L1800', longitude: 106.458132, latitude: -6.182635, cluster: 'TANGERANG', region: 'R03 Jakarta Banten', tp_name: 'TOWER BERSAMA', source_file: 'Detail_Site-ID.xlsx' },
    { id: 'tech-clg020', site_id: 'CLG020', ne_id: 'CLG020MT1', layer: 'ML', sector: 2, freq_band: 'L1800', longitude: 106.0456, latitude: -6.0123, cluster: 'CILEGON', region: 'R03 Jakarta & Banten', tp_name: 'DMT', source_file: 'ReEngineering Progress.xlsx' },
    { id: 'tech-clg036', site_id: 'CLG036', ne_id: 'CLG036MT1', layer: 'ML', sector: 2, freq_band: 'L1800', longitude: 106.0567, latitude: -6.0234, cluster: 'CILEGON', region: 'R03 Jakarta & Banten', tp_name: 'DMT', source_file: 'ReEngineering Progress.xlsx' },
    { id: 'tech-clg071', site_id: 'CLG071', ne_id: 'CLG071MT1', layer: 'ML', sector: 1, freq_band: 'L1800', longitude: 106.0678, latitude: -6.0345, cluster: 'CILEGON', region: 'R03 Jakarta & Banten', tp_name: 'PTI', source_file: 'ReEngineering Progress.xlsx' },
    { id: 'tech-clg115', site_id: 'CLG115', ne_id: 'CLG115MT1', layer: 'ML', sector: 1, freq_band: 'L1800', longitude: 106.0789, latitude: -6.0456, cluster: 'CILEGON', region: 'R03 Jakarta & Banten', tp_name: 'TBG', source_file: 'ReEngineering Progress.xlsx' },
    { id: 'tech-clg117', site_id: 'CLG117', ne_id: 'CLG117MT1', layer: 'ML', sector: 1, freq_band: 'L1800', longitude: 106.0890, latitude: -6.0567, cluster: 'CILEGON', region: 'R03 Jakarta & Banten', tp_name: 'DMT', source_file: 'ReEngineering Progress.xlsx' },
];

export interface AtpWorkOrder {
  id: string;
  site_id: string;
  atp_number: string;
  sow_id: string;
  po_number: string;
  sector: number;
  site_sector_key: string;
  project_type: ProjectType;
  stage: SiteStage;
  team_id?: string;
  field_leader_id?: string;
  initiated_by: string;
  initiated_at: string;
  status: 'active' | 'completed' | 'cancelled';
  
  // PERMIT
  permit_status?: string;
  permit_create_date?: string;
  tpas_tp_caf?: string;
  impl_status?: string;
  permit_start?: string;
  permit_expiry?: string;
  tower_provider?: string;
  jenis_kunci?: string;
  pic?: string;

  // IMPLEMENTASI
  ci_date?: string;
  co_date?: string;
  rfi_done?: boolean;
  rfs_done?: boolean;
  issue_status?: string;
  note_problem?: string;
  impl_cico_done?: boolean;
  impl_dokumen_done?: boolean;
  impl_foto_evidence?: string;
  ppid?: string;
  tiket_number?: string;
  prio_capex_final?: string;
  new_status_implementation?: string;
  prio?: string;
  file_date?: string;
}

export interface WorkOrderLog {
  id: string;
  work_order_id: string;
  action: string;
  user_id: string; // -> people.id
  timestamp: string;
}

export const workOrderLogs: WorkOrderLog[] = [
  { id: 'wol-1', work_order_id: 'atp-wo-1', action: 'Work order initiated', user_id: 'u_adm', timestamp: '2026-03-01T09:00:00Z' },
  { id: 'wol-2', work_order_id: 'atp-wo-1', action: 'Permit status updated to in_progress', user_id: 'u_ops', timestamp: '2026-03-02T10:15:00Z' },
  { id: 'wol-3', work_order_id: 'atp-wo-1', action: 'CI date set to 2026-03-10', user_id: 'u3', timestamp: '2026-03-10T08:30:00Z' }
];

export const atpWorkOrders: AtpWorkOrder[] = [
  {
    id: 'atp-wo-1',
    site_id: 'JKS509',
    atp_number: 'ATP000000282836',
    sow_id: 'R0022633070',
    po_number: '5992/TC.03/EN-01/IV/2026',
    sector: 1,
    site_sector_key: 'JKS509-S1',
    project_type: 'FILTER',
    stage: 'implementasi',
    team_id: 't1',
    field_leader_id: 'u3',
    initiated_by: 'u_adm',
    initiated_at: '2026-03-01T09:00:00Z',
    status: 'active',
    // Mock data for the new tabs
    permit_status: 'in_progress',
    permit_create_date: '2026-03-02',
    tower_provider: 'Tower Bersama',
    pic: 'Bpk. Agus (TBG)',
    ci_date: '2026-03-10T08:30:00Z',
    rfi_done: false,
    rfs_done: false
  },
  {
    id: 'atp-wo-clg020',
    site_id: 'CLG020',
    atp_number: 'ATP000000282692',
    sow_id: 'R0011058250',
    po_number: '4200052176',
    sector: 2,
    site_sector_key: 'CLG020-S2',
    project_type: 'FILTER',
    stage: 'rfs_done',
    team_id: 't2', // Denny Suhendra
    field_leader_id: 'u3',
    initiated_by: 'system',
    initiated_at: '2026-04-20T09:00:00Z',
    status: 'active',
    permit_status: 'completed',
    rfs_done: true
  },
  {
    id: 'atp-wo-clg036',
    site_id: 'CLG036',
    atp_number: 'ATP000000278733',
    sow_id: 'R0013075459',
    po_number: '9372/TC.03/EN-01/XI/2025',
    sector: 2,
    site_sector_key: 'CLG036-S2',
    project_type: 'FILTER',
    stage: 'rfs_done',
    team_id: 't2',
    field_leader_id: 'u3',
    initiated_by: 'system',
    initiated_at: '2026-03-09T09:00:00Z',
    status: 'active',
    permit_status: '5. Permit Released',
    issue_status: 'UPLOAD TAGGING DONE',
    note_problem: 'Complate',
    rfs_done: true
  },
  {
    id: 'atp-wo-clg071',
    site_id: 'CLG071',
    atp_number: 'ATP000000278556',
    sow_id: 'R0013075435',
    po_number: '9372/TC.03/EN-01/XI/2025',
    sector: 1,
    site_sector_key: 'CLG071-S1',
    project_type: 'FILTER',
    stage: 'rfs_done',
    team_id: 't2',
    field_leader_id: 'u3',
    initiated_by: 'system',
    initiated_at: '2026-04-17T09:00:00Z',
    status: 'active',
    permit_status: '5. Permit Released',
    issue_status: 'UPLOAD TAGGING DONE',
    note_problem: 'Foto Tagging N/a and Capture Cell Status, Cell Bandwidth, Board Status N/A',
    rfs_done: true
  },
  {
    id: 'atp-wo-clg115',
    site_id: 'CLG115',
    atp_number: 'ATP000000282668',
    sow_id: 'R0011058231',
    po_number: '4200052176',
    sector: 1,
    site_sector_key: 'CLG115-S1',
    project_type: 'FILTER',
    stage: 'rfs_done',
    team_id: 't2',
    field_leader_id: 'u3',
    initiated_by: 'system',
    initiated_at: '2026-03-09T09:00:00Z',
    status: 'active',
    permit_status: '5. Permit Released',
    issue_status: 'REQUEST PDID',
    note_problem: 'Complate',
    rfs_done: true
  },
  {
    id: 'atp-wo-clg117',
    site_id: 'CLG117',
    atp_number: 'ATP000000288425',
    sow_id: 'R0022633078',
    po_number: '5992/TC.03/EN-01/IV/2026',
    sector: 1,
    site_sector_key: 'CLG117-S1',
    project_type: 'FILTER',
    stage: 'rfs_done',
    team_id: 't2',
    field_leader_id: 'u3',
    initiated_by: 'system',
    initiated_at: '2026-04-24T09:00:00Z',
    status: 'active',
    permit_status: 'completed',
    rfs_done: true
  }
];

// Data Migration: Backfill atpWorkOrders for existing sites
(() => {
  siteMasterRecords.forEach(site => {
    if (site.stage !== 'imported') {
      const hasWorkOrder = atpWorkOrders.some(wo => wo.site_id === site.site_id);
      if (!hasWorkOrder) {
        atpWorkOrders.push({
          id: `atp-migrated-${site.site_id.toLowerCase()}`,
          site_id: site.site_id,
          atp_number: '', // Unknown, left blank
          sow_id: site.sow_eqp || '',
          po_number: site.po_tsel || '',
          sector: 1, // Default sector
          site_sector_key: `${site.site_id}-S1`,
          project_type: site.project_type as ProjectType,
          stage: site.stage,
          status: site.stage === 'completed' ? 'completed' : 'active',
          initiated_by: 'system_migration',
          initiated_at: new Date().toISOString(),
          team_id: (site as any).team_assigned || '',
          field_leader_id: ''
        });
      }
    }
  });
})();
