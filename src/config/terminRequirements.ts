export interface RequirementField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'currency';
    options?: string[]; // For 'select' type
    required: boolean;
    role: 'team_leader' | 'engineer';
    description?: string;
    disabledIfAuto?: boolean; // For fields like Amount that might auto-fill based on percentage
}

export interface RequirementDocument {
    id: string;
    label: string;
    type: 'pdf' | 'excel' | 'image' | 'any';
    required: boolean;
    role: 'team_leader' | 'engineer';
    description?: string;
    minCount?: number; // For multiple photos requirement
    isAutoAttached?: boolean; // If system handles it
}

export interface TerminConfig {
    terminId: string; // Identifier for mapping e.g. 'filter_1' or 'combat_1_1'
    fields: RequirementField[];
    documents: RequirementDocument[];
    requiresSKP?: boolean; // Specifically for filter_1
    requiresBAST?: boolean; // Specifically for blocking management approval
}

// ----------------------------------------------------
// FILTER Project Configurations
// ----------------------------------------------------
export const filterTerminConfigs: Record<number, TerminConfig> = {
    1: { // Termin 1 (30%)
        terminId: 'filter_1',
        requiresSKP: true,
        fields: [
            { id: 'jumlah_pengajuan', label: 'Jumlah Pengajuan', type: 'currency', required: true, role: 'team_leader' },
            { id: 'nomor_invoice', label: 'Nomor Invoice / Referensi', type: 'text', required: true, role: 'team_leader' },
            { id: 'tanggal_pengajuan', label: 'Tanggal Pengajuan', type: 'date', required: true, role: 'team_leader' },
            { id: 'catatan', label: 'Catatan', type: 'textarea', required: false, role: 'team_leader' },
        ],
        documents: [
            { id: 'surat_pengajuan', label: 'Surat Pengajuan Termin 1', type: 'pdf', required: true, role: 'team_leader' },
            { id: 'spk', label: 'Copy SPK', type: 'pdf', required: true, role: 'team_leader', isAutoAttached: true, description: 'Auto-attached from system' },
            { id: 'bukti_skp', label: 'Bukti SKP + Serah Terima Material', type: 'pdf', required: true, role: 'team_leader', isAutoAttached: true, description: 'Auto-attached when SKP Received' },
            { id: 'foto_progres', label: 'Foto Progres Lapangan', type: 'image', required: false, role: 'engineer', minCount: 1 },
        ]
    },
    2: { // Termin 2 (50%)
        terminId: 'filter_2',
        fields: [
            { id: 'jumlah_pengajuan', label: 'Jumlah Pengajuan', type: 'currency', required: true, role: 'team_leader' },
            { id: 'persentase_progres', label: 'Persentase Progres saat ini (%)', type: 'number', required: true, role: 'team_leader' },
            { id: 'tanggal_laporan', label: 'Tanggal Laporan Progres', type: 'date', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'laporan_progres', label: 'Laporan Progres', type: 'any', required: true, role: 'team_leader', description: 'PDF or Excel Report' },
            { id: 'evidence_photo', label: 'Evidence Photo Implementasi', type: 'image', required: true, role: 'engineer', minCount: 3 },
            { id: 'evidence_file', label: 'Evidence File Pendukung', type: 'pdf', required: true, role: 'team_leader', description: 'Site info, team, prices' },
        ]
    },
    3: { // Termin 3 (10%)
        terminId: 'filter_3',
        requiresBAST: true,
        fields: [
            { id: 'nomor_bast', label: 'Nomor BAST', type: 'text', required: true, role: 'team_leader' },
            { id: 'tanggal_bast', label: 'Tanggal BAST', type: 'date', required: true, role: 'team_leader' },
            { id: 'pihak_penyerah', label: 'Nama Pihak Penyerah BAST', type: 'text', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'dokumen_bast', label: 'Dokumen BAST', type: 'pdf', required: true, role: 'team_leader', description: 'MANDATORY for Approval' },
            { id: 'dokumen_po', label: 'Dokumen terkait PO', type: 'pdf', required: true, role: 'team_leader' },
            { id: 'invoice_ineom', label: 'Invoice dari INEOM/Mitra', type: 'pdf', required: true, role: 'team_leader' },
        ]
    },
    4: { // Termin 4 (10%)
        terminId: 'filter_4',
        fields: [
            { id: 'nomor_invoice', label: 'Nomor Invoice TI', type: 'text', required: true, role: 'team_leader' },
            { id: 'tanggal_invoice', label: 'Tanggal Invoice', type: 'date', required: true, role: 'team_leader' },
            { id: 'masa_garansi', label: 'Masa Garansi', type: 'select', options: ['3 bulan', '6 bulan', '12 bulan'], required: true, role: 'team_leader' },
            { id: 'tanggal_mulai_garansi', label: 'Tanggal Mulai Garansi', type: 'date', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'invoice_ti', label: 'Invoice dari TI/Pemberi Kerja', type: 'pdf', required: true, role: 'team_leader' },
            { id: 'dokumen_garansi', label: 'Dokumen Garansi / Warranty Certificate', type: 'pdf', required: true, role: 'team_leader' },
            { id: 'bapp', label: 'Berita Acara Penyelesaian Pekerjaan', type: 'pdf', required: true, role: 'team_leader' },
        ]
    },
};

// ----------------------------------------------------
// COMBAT Project Configurations 
// Mapping by substep ID e.g. "1.1", "1.2"
// ----------------------------------------------------
export const combatTerminConfigs: Record<string, TerminConfig> = {
    '1.1': { // Ops Cash
        terminId: 'combat_1_1',
        fields: [
            { id: 'jenis_pengeluaran', label: 'Jenis Pengeluaran', type: 'text', required: true, role: 'team_leader' },
            { id: 'jumlah_diminta', label: 'Jumlah yang diminta', type: 'currency', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'nota_kwitansi', label: 'Nota / Kwitansi Pengeluaran', type: 'any', required: true, role: 'team_leader', description: 'Image or PDF' }
        ]
    },
    '1.2': { // Sewa Lahan
        terminId: 'combat_1_2',
        fields: [
            { id: 'nama_pemilik', label: 'Nama Pemilik Lahan', type: 'text', required: true, role: 'team_leader' },
            { id: 'durasi_sewa', label: 'Durasi Sewa (Bulan)', type: 'number', required: true, role: 'team_leader' },
            { id: 'jumlah', label: 'Jumlah (Rp)', type: 'currency', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'perjanjian_sewa', label: 'Perjanjian Sewa', type: 'pdf', required: true, role: 'team_leader' },
            { id: 'foto_lokasi', label: 'Foto Lokasi', type: 'image', required: true, role: 'engineer' },
            { id: 'ktp_pemilik', label: 'KTP Pemilik Lahan', type: 'image', required: true, role: 'team_leader' },
        ]
    },
    '1.3': { // Izin Warga
        terminId: 'combat_1_3',
        fields: [
            { id: 'jumlah_warga', label: 'Jumlah Warga yang didata', type: 'number', required: true, role: 'team_leader' },
            { id: 'total_dana', label: 'Total Dana (Rp)', type: 'currency', required: true, role: 'team_leader' },
            { id: 'tanggal_pertemuan', label: 'Tanggal Pertemuan', type: 'date', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'daftar_ktp', label: 'Daftar KTP Warga', type: 'any', required: true, role: 'team_leader', description: 'PDF or Excel' },
            { id: 'foto_bersama', label: 'Foto Bersama Warga', type: 'image', required: true, role: 'engineer' },
        ]
    },
    '1.4': { // Izin Aparat
        terminId: 'combat_1_4',
        fields: [
            { id: 'jenis_aparat', label: 'Jenis Aparat', type: 'select', options: ['RT', 'RW', 'Kelurahan', 'Polsek', 'Koramil', 'Ormas'], required: true, role: 'team_leader' },
            { id: 'nama_pejabat', label: 'Nama Pejabat', type: 'text', required: true, role: 'team_leader' },
            { id: 'jumlah', label: 'Jumlah (Rp)', type: 'currency', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'surat_izin', label: 'Surat Izin Resmi (Ttd)', type: 'pdf', required: true, role: 'team_leader' },
        ]
    },
    '2.1': { // Dimentle DP 30%
        terminId: 'combat_2_1',
        fields: [
            { id: 'nama_vendor', label: 'Nama Vendor', type: 'text', required: true, role: 'team_leader' },
            { id: 'jumlah_dp', label: 'Jumlah DP', type: 'currency', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'po', label: 'Purchase Order / PO', type: 'pdf', required: true, role: 'team_leader' },
            { id: 'kontrak_vendor', label: 'Kontrak dengan Vendor', type: 'pdf', required: true, role: 'team_leader' },
            { id: 'equipment_list', label: 'Equipment List (Excel/PDF)', type: 'any', required: true, role: 'team_leader' },
        ]
    },
    '2.2': { // Install 50%
        terminId: 'combat_2_2',
        fields: [
            { id: 'persentase_progres', label: 'Persentase Progres', type: 'number', required: true, role: 'team_leader' },
            { id: 'tanggal_laporan', label: 'Tanggal Laporan', type: 'date', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'progress_photo', label: 'Progress Photos (with % tags)', type: 'image', required: true, role: 'engineer', minCount: 5 },
            { id: 'progress_report', label: 'Progress Report', type: 'pdf', required: true, role: 'team_leader' },
        ]
    },
    '2.3': { // BAST 20%
        terminId: 'combat_2_3',
        requiresBAST: true,
        fields: [
            { id: 'nomor_bast', label: 'Nomor BAST', type: 'text', required: true, role: 'team_leader' },
            { id: 'tanggal_bast', label: 'Tanggal BAST', type: 'date', required: true, role: 'team_leader' },
            { id: 'pihak_penerima', label: 'Nama Pihak Penerima', type: 'text', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'dokumen_bast', label: 'BAST Document', type: 'pdf', required: true, role: 'team_leader', description: 'Blocks Approval if missing' },
            { id: 'final_photo', label: 'Final Photos', type: 'image', required: true, role: 'engineer', minCount: 3 },
            { id: 'as_built', label: 'As-Built Documentation', type: 'pdf', required: false, role: 'team_leader' },
        ]
    },
    '3.1': { // Towing
        terminId: 'combat_3_1',
        fields: [
            { id: 'nama_vendor', label: 'Nama Vendor Towing', type: 'text', required: true, role: 'team_leader' },
            { id: 'asal', label: 'Asal (Origin)', type: 'text', required: true, role: 'team_leader' },
            { id: 'tujuan', label: 'Tujuan (Destination)', type: 'text', required: true, role: 'team_leader' },
            { id: 'tanggal_towing', label: 'Tanggal Towing', type: 'date', required: true, role: 'team_leader' },
            { id: 'jumlah', label: 'Jumlah (Rp)', type: 'currency', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'surat_jalan', label: 'Surat Jalan', type: 'pdf', required: true, role: 'team_leader' },
            { id: 'foto_towing', label: 'Foto Proses Towing', type: 'image', required: true, role: 'engineer', minCount: 2 },
        ]
    },
    '4.1': { // PSB PLN
        terminId: 'combat_4_1',
        fields: [
            { id: 'daya_listrik', label: 'Daya Listrik (VA)', type: 'number', required: true, role: 'team_leader' },
            { id: 'no_registrasi', label: 'Nomor Registrasi PLN', type: 'text', required: true, role: 'team_leader' },
            { id: 'jumlah', label: 'Jumlah (Rp)', type: 'currency', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'bukti_daftar', label: 'Bukti Pendaftaran PLN', type: 'pdf', required: true, role: 'team_leader' },
            { id: 'foto_meteran', label: 'Foto Meteran Terpasang', type: 'image', required: true, role: 'engineer' },
            { id: 'foto_panel', label: 'Foto Panel Listrik', type: 'image', required: true, role: 'engineer' },
        ]
    },
    '5.1': { // Instal Cruz DP 30% (same format as 2.1)
        terminId: 'combat_5_1',
        fields: [
            { id: 'nama_vendor', label: 'Nama Vendor', type: 'text', required: true, role: 'team_leader' },
            { id: 'jumlah_dp', label: 'Jumlah DP', type: 'currency', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'po', label: 'Purchase Order / PO', type: 'pdf', required: true, role: 'team_leader' },
            { id: 'kontrak_vendor', label: 'Kontrak dengan Vendor', type: 'pdf', required: true, role: 'team_leader' },
            { id: 'equipment_list', label: 'Equipment List (Excel/PDF)', type: 'any', required: true, role: 'team_leader' },
        ]
    },
    '5.2': { // Instal 50%
        terminId: 'combat_5_2',
        fields: [
            { id: 'persentase_progres', label: 'Persentase Progres', type: 'number', required: true, role: 'team_leader' },
            { id: 'tanggal_laporan', label: 'Tanggal Laporan', type: 'date', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'progress_photo', label: 'Install Photos (with % tags)', type: 'image', required: true, role: 'engineer', minCount: 5 },
            { id: 'progress_report', label: 'Progress Report', type: 'pdf', required: true, role: 'team_leader' },
        ]
    },
    '5.3': { // BAST 20%
        terminId: 'combat_5_3',
        requiresBAST: true,
        fields: [
            { id: 'nomor_bast', label: 'Nomor BAST', type: 'text', required: true, role: 'team_leader' },
            { id: 'tanggal_bast', label: 'Tanggal BAST', type: 'date', required: true, role: 'team_leader' },
            { id: 'pihak_penerima', label: 'Nama Pihak Penerima', type: 'text', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'dokumen_bast', label: 'BAST Final Document', type: 'pdf', required: true, role: 'team_leader', description: 'Blocks Approval if missing' },
            { id: 'final_photo', label: 'Final Photos', type: 'image', required: true, role: 'engineer', minCount: 3 },
            { id: 'as_built', label: 'As-Built Documentation', type: 'pdf', required: false, role: 'team_leader' },
        ]
    },
    '6.1': { // OPTIM
        terminId: 'combat_6_1',
        fields: [
            { id: 'jenis_optimasi', label: 'Jenis Optimasi', type: 'select', options: ['Signal', 'Power', 'Network', 'Other'], required: true, role: 'team_leader' },
            { id: 'param_sebelum', label: 'Parameter Sebelum Optimasi', type: 'textarea', required: true, role: 'team_leader' },
            { id: 'param_sesudah', label: 'Parameter Sesudah Optimasi', type: 'textarea', required: true, role: 'team_leader' },
            { id: 'jumlah', label: 'Jumlah (Rp)', type: 'currency', required: true, role: 'team_leader' },
        ],
        documents: [
            { id: 'laporan_optimasi', label: 'Laporan Optimasi / Report Optim', type: 'pdf', required: true, role: 'team_leader' },
            { id: 'signal_sheet', label: 'Signal Parameter Sheet', type: 'any', required: true, role: 'team_leader', description: 'Excel or PDF' },
        ]
    }
};
