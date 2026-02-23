

export type ProjectType = 'FILTER' | 'COMBAT' | 'BLACKSITE' | 'L2H' | 'REFINEN';

export type WOStatus = 'Unassigned' | 'Assigned' | 'Pending SPK Approval' | 'SPK Created' | 'Active' | 'Completed';

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
    { id: 'u_mgr', name: 'Manager', role: 'management' },
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
    { 
        id: 's1', projectId: 'p1', name: 'Site 1A', location: 'Jakarta Selatan', budget: 500000000,
        teamId: 't1', jobName: 'Install Filter Unit A', contractNumber: 'CTR-2024-001A', startDate: '2024-01-10', endDate: '2024-03-10'
    },
    // New Demo Sites
    { 
        id: 's1b', projectId: 'p1', name: 'Site 1B', location: 'Jakarta Timur', budget: 750000000,
        teamId: 't3', jobName: 'Install Filter Unit B', contractNumber: 'CTR-2024-001B', startDate: '2024-02-01', endDate: '2024-04-01'
    },
    { 
        id: 's1c', projectId: 'p1', name: 'Site 1C', location: 'Jakarta Pusat', budget: 400000000,
        teamId: 't3', jobName: 'Install Filter Unit C', contractNumber: 'CTR-2024-001C', startDate: '2024-02-15', endDate: '2024-04-15'
    },
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
    // Site 1A (S1) - In Progress
    { id: 'ft-1', siteId: 's1', step: 1, name: 'Termin 1 (30%)', percentage: 30, status: 'paid', amountRequest: 150000000, amountPaid: 150000000, paidAt: '2024-01-15' },
    { id: 'ft-2', siteId: 's1', step: 2, name: 'Termin 2 (50%)', percentage: 50, status: 'approved', amountRequest: 250000000, submittedAt: '2024-02-10' },
    { id: 'ft-3', siteId: 's1', step: 3, name: 'Termin 3 (10%)', percentage: 10, status: 'pending' },
    { id: 'ft-4', siteId: 's1', step: 4, name: 'Termin 4 (10%)', percentage: 10, status: 'pending' },

    // Site 1B (S1B) - Demo Pending Approval
    { id: 'ft-s1b-1', siteId: 's1b', step: 1, name: 'Termin 1 (30%)', percentage: 30, status: 'pengajuan', amountRequest: 225000000, submittedAt: '2024-02-20' },
    { id: 'ft-s1b-2', siteId: 's1b', step: 2, name: 'Termin 2 (50%)', percentage: 50, status: 'pending' },
    { id: 'ft-s1b-3', siteId: 's1b', step: 3, name: 'Termin 3 (10%)', percentage: 10, status: 'pending' },
    { id: 'ft-s1b-4', siteId: 's1b', step: 4, name: 'Termin 4 (10%)', percentage: 10, status: 'pending' },

    // Site 1C (S1C) - Fresh
    { id: 'ft-s1c-1', siteId: 's1c', step: 1, name: 'Termin 1 (30%)', percentage: 30, status: 'pending' },
    { id: 'ft-s1c-2', siteId: 's1c', step: 2, name: 'Termin 2 (50%)', percentage: 50, status: 'pending' },
    { id: 'ft-s1c-3', siteId: 's1c', step: 3, name: 'Termin 3 (10%)', percentage: 10, status: 'pending' },
    { id: 'ft-s1c-4', siteId: 's1c', step: 4, name: 'Termin 4 (10%)', percentage: 10, status: 'pending' },
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

// --- SIDEBAR COUNTERS & HELPERS ---

/**
 * Returns the count of active sites grouped by project type.
 * Applies role-based filtering:
 * - management/backoffice/finance: sees all sites across all projects.
 * - team_leader/engineer: sees only sites assigned to their team.
 */
export const getActiveSiteCountsByType = (currentUser: User, allProjects: Project[], allSites: Site[]) => {
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

    allSites.forEach(site => {
        // If restricted, they can only see sites assigned to their team
        if (isRestricted && (!site.teamId || !userTeamIds.includes(site.teamId))) {
            return;
        }

        const project = allProjects.find(p => p.id === site.projectId);
        if (project && project.status === 'active') {
            counts[project.type]++;
        }
    });

    return counts;
};
