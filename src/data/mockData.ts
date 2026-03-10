

export type ProjectType = 'FILTER' | 'COMBAT' | 'BLACKSITE' | 'L2H' | 'REFINEN';

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
  termin_key: 'T1' | 'T2a' | 'T2b' | 'T2c' | 'T3' | 'T4';
  nominal: number;
  status: 'submitted' | 'approved' | 'paid' | 'rejected';
  catatan?: string;
  submitted_by: string; // -> users.id
  submitted_at: string; // datetime
  approved_by?: string; // -> users.id nullable
  approved_at?: string; // datetime nullable
  paid_at?: string; // datetime nullable
  documents: string[]; // json array of file IDs
}

export const terminPengajuanRecords: TerminPengajuan[] = [
    {
        id: 'tp-1',
        site_id: 'JKT010',
        termin_key: 'T1',
        nominal: 45000000,
        status: 'submitted',
        catatan: 'Permit sudah turun sesuai standar operasional',
        submitted_by: 'u_lead',
        submitted_at: '2024-03-05T10:00:00Z',
        documents: ['file-1', 'file-2']
    }
];

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
  jobName?: string;
  contractNumber?: string;
  startDate?: string;
  endDate?: string;
  import_source?: string;
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

export type UserRole = 'engineer' | 'team_leader' | 'finance' | 'management' | 'backoffice_admin';

export interface User {
    id: string;
    name: string;
    role: UserRole;
    avatar?: string;
}

export const USERS: User[] = [
    { id: 'u_eng', name: 'Field Engineer', role: 'engineer' },
    { id: 'u_lead', name: 'Team Leader', role: 'team_leader' },
    { id: 'u_fin', name: 'Finance Staff', role: 'finance' },
    { id: 'u_mgr', name: 'Director', role: 'management' },
    { id: 'u_adm', name: 'Backoffice Admin', role: 'backoffice_admin' },
];

export interface TeamMember {
    personId: string;
    role: 'manager' | 'engineer' | 'team_leader';
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
    projectId: string;
    status: 'active' | 'inactive';
    members: TeamMember[]; 
}

export interface Person {
    id: string;
    name: string;
    role: UserRole;
    // Extended fields
    ktp: string;
    email: string;
    phone: string;
    vendor: string;
    deviceId?: string;
    imei1?: string;
    imei2?: string;
    avatar?: string;
    // Photos
    photoKtp?: string;
    photoSelfie?: string;
    photoNda?: string;
    photoSelfieNda?: string;
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
  { id: 'p5', name: 'Refinen Upgrade', type: 'REFINEN', status: 'completed' },
];

export const sites: Site[] = [
    // Execution sites array (empty for FILTER initially, keeping COMBAT site for example if needed)
    { 
        id: 's2', projectId: 'p2', name: 'Site B - Combat', location: 'Bandung', budget: 750000000,
        teamId: 't2', jobName: 'Site Readiness', contractNumber: 'CTR-2024-002', startDate: '2024-02-01', endDate: '2024-04-01'
    },
];

export const people: Person[] = [
    { 
        id: 'u1', name: 'John Doe', role: 'management', 
        ktp: '3171234567890001', email: 'management@demo.com', phone: '081234567890', 
        vendor: 'Internal', joinedAt: '2023-01-15', avatar: 'https://i.pravatar.cc/150?u=u1'
    },
    { 
        id: 'u2', name: 'Budi Engineer', role: 'engineer', 
        ktp: '3171234567890002', email: 'budi@demo.com', phone: '081234567891', 
        vendor: 'Vendor X', deviceId: 'DEV-001', imei1: '123456789012345', imei2: '123456789012346',
        joinedAt: '2023-03-10', photoKtp: 'ktp_budi.jpg', photoSelfie: 'selfie_budi.jpg'
    },
    { 
        id: 'u3', name: 'Bob Johnson', role: 'team_leader', 
        ktp: '3171234567890003', email: 'bob.j@vendor-y.com', phone: '081234567892', 
        vendor: 'Vendor Y', deviceId: 'DEV-002', imei1: '987654321098765', 
        joinedAt: '2023-02-20' 
    },
    { 
        id: 'u4', name: 'Alice Finance', role: 'finance', 
        ktp: '3171234567890004', email: 'finance@demo.com', phone: '081234567893', 
        vendor: 'Internal', joinedAt: '2023-01-10' 
    },
    { 
        id: 'u5', name: 'Charlie Field', role: 'engineer', 
        ktp: '3171234567890005', email: 'charlie.f@vendor-x.com', phone: '081234567894', 
        vendor: 'Vendor X', deviceId: 'DEV-003', imei1: '112233445566778',
        joinedAt: '2023-06-01' 
    },
    { 
        id: 'u6', name: 'Admin Backoffice', role: 'backoffice_admin', 
        ktp: '3171234567890006', email: 'backoffice@demo.com', phone: '081234567895', 
        vendor: 'Internal', joinedAt: '2023-01-01' 
    },
];

export const teams: Team[] = [
    { 
        id: 't1', projectId: 'p1', name: 'Team Alpha (Budi)', status: 'active',
        members: [
            { personId: 'u2', role: 'engineer' }, // Budi
            { personId: 'u3', role: 'team_leader' }
        ] 
    },
    { 
        id: 't3', projectId: 'p1', name: 'Team Beta', status: 'active',
        members: [
            { personId: 'u5', role: 'engineer' }, // Charlie
            { personId: 'u3', role: 'team_leader' }
        ] 
    },
    { 
        id: 't2', projectId: 'p2', name: 'Bravo Team (Combat)', status: 'active',
        members: [
            { personId: 'u_lead', role: 'team_leader' }
        ] 
    }, 
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

export interface SiteMaterial {
    id: string;
    siteId: string;
    skp: string;
    date: string;
    items: string[];
}

export interface SiteEvidence {
    id: string;
    siteId: string;
    filename: string;
    originalName: string;
    uploadedBy: string; // user name or id
    uploadedAt: string;
    progressTag: string; // e.g., "50%", "BAST Final", "Material Arrival"
    url?: string; // mock url
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
    skpId: string; // Link to SKP
    skp: string; // Keep for legacy
    date: string;
    items: string[];
}

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
    { id: 'm1', siteId: 's1', skpId: 'skp-1', skp: 'SKP-2024-001', date: '2024-01-12', items: ['Semen 50 Sak', 'Besi D13 100btg'] },
    { id: 'm2', siteId: 's1', skpId: 'skp-2', skp: 'SKP-2024-002', date: '2024-01-15', items: ['Kabel NYM 2x1.5', 'Pipa PVC', 'Kabel FO 1000m'] },
    { id: 'm3', siteId: 's2', skpId: 'skp-3', skp: 'SKP-2024-003', date: '2024-02-05', items: ['Antena Sectoral', 'RRU', 'BBU'] },
];

export const siteEvidence: SiteEvidence[] = [
    { id: 'e1', siteId: 's1', filename: 'prog_0.jpg', originalName: 'sitac_clear.jpg', uploadedBy: 'u_eng', uploadedAt: '2024-01-10', progressTag: '0% Start' },
    { id: 'e2', siteId: 's1', filename: 'prog_30.jpg', originalName: 'pondasi_done.jpg', uploadedBy: 'u_eng', uploadedAt: '2024-01-25', progressTag: '30% Pondasi' },
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

export type SiteStage = 'imported' | 'assigned' | 'permit_process' | 'permit_ready' | 'akses_process' | 'akses_ready' | 'implementasi' | 'rfi_done' | 'rfs_done' | 'dokumen_done' | 'bast' | 'invoice' | 'completed';

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
    extra_data?: Record<string, any>;

    impl_cico_done?: boolean;
    impl_rfs_done?: boolean;
    impl_dokumen_done?: boolean;

    longitude?: number;
    latitude?: number;

    work_order_id?: string; // Link to Work Order
    project_site_id?: string; // Link to Execution Site

    batch_ref: string;
    imported_by: string; // ID of the user
    imported_at: string; // Timestamp
}

export const siteMasterRecords: SiteMaster[] = [
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
    }
];

export const STAGE_ORDER = [
    'imported', 'assigned', 'permit_process', 'permit_ready',
    'akses_process', 'akses_ready', 'implementasi',
    'rfi_done', 'rfs_done', 'dokumen_done', 'bast', 'invoice', 'completed'
];

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
    { id: 'log-3', site_master_id: 'sm3', from_stage: 'akses_ready', to_stage: 'implementasi', created_by: 'u_eng', created_at: '2024-02-28T14:00:00Z' }
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
    source: 'direct_upload' | 'stage_update';
    stage_context?: string;
    stage_log_id?: string;
    uploaded_by: string;
    uploaded_at: string;
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
        file_size: 2100000, // ~2.1MB
        source: 'stage_update',
        stage_context: 'permit_process→permit_ready',
        stage_log_id: 'log-2',
        uploaded_by: 'Sari',
        uploaded_at: '2024-02-12T08:31:00Z',
        tags: ['permit', 'TPAS']
    },
    {
        id: 'file-2',
        site_id: 'sm2', // BKS598
        filename: 'foto_site_BKS598.jpg',
        original_name: 'foto_site.jpg',
        file_url: '#',
        mime_type: 'image/jpeg',
        file_size: 1400000, // ~1.4MB
        source: 'stage_update',
        stage_context: 'permit_process→permit_ready',
        stage_log_id: 'log-2',
        uploaded_by: 'Sari',
        uploaded_at: '2024-02-12T08:31:00Z'
    },
    {
        id: 'file-3',
        site_id: 'sm2',
        filename: 'spk_BKS598.pdf',
        original_name: 'spk_BKS598.pdf',
        file_url: '#',
        mime_type: 'application/pdf',
        file_size: 1200000, // ~1.2MB
        source: 'direct_upload',
        uploaded_by: 'Admin',
        uploaded_at: '2024-02-10T10:00:00Z'
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
        REFINEN: 0,
    };

    // Which teams does this user belong to?
    const userTeamIds = teams
        .filter(t => t.members.some(m => m.personId === currentUser.id))
        .map(t => t.id);

    // Is the user restricted?
    const isRestricted = ['engineer', 'team_leader'].includes(currentUser.role);

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
}

export const activityFeed: ActivityLog[] = [
    { id: 'act-1', userId: 'u_lead', action: 'submitted Termin 1 pengajuan', target: 'Site 1B', timestamp: '2 jam lalu' },
    { id: 'act-2', userId: 'u_mgr', action: 'approved Termin 1', target: 'Site 1A', timestamp: '5 jam lalu' },
    { id: 'act-3', userId: 'u_fin', action: 'processed payment Termin 1', target: 'Site 1A', timestamp: '6 jam lalu' },
    { id: 'act-4', userId: 'u_eng', action: 'uploaded 3 evidence photos', target: 'Site 2A', timestamp: '1 hari lalu' },
    { id: 'act-5', userId: 'u_lead', action: 'submitted request for Ops Cash', target: 'Site Demo Pondasi', timestamp: '1 hari lalu' },
    { id: 'act-6', userId: 'u_mgr', action: 'approved WO-2024-004 to SPK', target: 'WO-2024-004', timestamp: '2 hari lalu' },
    { id: 'act-7', userId: 'u_eng', action: 'marked SKP Received', target: 'Site Cruz Alpha', timestamp: '3 hari lalu' },
    { id: 'act-8', userId: 'u_fin', action: 'processed payment for Termin 2', target: 'Site 1C', timestamp: '4 hari lalu' },
];
