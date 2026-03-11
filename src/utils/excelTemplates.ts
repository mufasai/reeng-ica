import * as xlsx from 'xlsx';
import { siteMasterRecords, STAGE_ORDER, type ProjectType } from '../data/mockData';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface TemplateScope {
    projectType: ProjectType | 'ALL';
    stageFilters: string[]; // empty = all stages
}

// ─── Column definitions ─────────────────────────────────────────────────────
export const TEMPLATE_COLUMNS = [
    // Locked columns
    { key: 'unique_key',    label: 'unique_key',    locked: true },
    { key: 'site_id',       label: 'site_id',       locked: true },
    { key: 'site_name',     label: 'site_name',     locked: true },
    { key: 'curr_stage',    label: 'curr_stage',    locked: true },
    // Editable
    { key: 'new_stage',         label: 'new_stage',         group: 'stage' },
    // PERMIT
    { key: 'permit_create_date', label: 'permit_create_date', group: 'permit' },
    { key: 'tpas_approved',      label: 'tpas_approved',      group: 'permit' },
    { key: 'tp_approved',        label: 'tp_approved',        group: 'permit' },
    { key: 'caf_approved',       label: 'caf_approved',       group: 'permit' },
    { key: 'permit_start_date',  label: 'permit_start_date',  group: 'permit' },
    { key: 'permit_expiry_date', label: 'permit_expiry_date', group: 'permit' },
    // AKSES
    { key: 'tower_provider',  label: 'tower_provider',  group: 'akses' },
    { key: 'jenis_kunci',     label: 'jenis_kunci',     group: 'akses' },
    { key: 'pic_akses_nama',  label: 'pic_akses_nama',  group: 'akses' },
    { key: 'pic_akses_telp',  label: 'pic_akses_telp',  group: 'akses' },
    // IMPLEMENTASI
    { key: 'tanggal_plan',    label: 'tanggal_plan',    group: 'impl' },
    { key: 'tanggal_aktual',  label: 'tanggal_aktual',  group: 'impl' },
    { key: 'ci_date',         label: 'ci_date',         group: 'impl' },
    { key: 'ci_time',         label: 'ci_time',         group: 'impl' },
    { key: 'co_date',         label: 'co_date',         group: 'impl' },
    { key: 'co_time',         label: 'co_time',         group: 'impl' },
    { key: 'rfi_done',        label: 'rfi_done',        group: 'impl' },
    { key: 'rfs_done',        label: 'rfs_done',        group: 'impl' },
    { key: 'dokumen_done',    label: 'dokumen_done',    group: 'impl' },
    // GENERAL
    { key: 'catatan',         label: 'catatan',         group: 'general' },
];



// Valid "next stage" options for each current stage (max +1 step forward)
export const getValidNextStages = (current: string): string[] => {
    const idx = STAGE_ORDER.indexOf(current);
    if (idx === -1 || idx >= STAGE_ORDER.length - 1) return [];
    return [STAGE_ORDER[idx + 1]];
};

// ─── Template Generator ─────────────────────────────────────────────────────
export const generateBulkUpdateTemplate = (scope: TemplateScope | string) => {
    // Support legacy call signature (just a string prefix)
    const opts: TemplateScope = typeof scope === 'string'
        ? { projectType: scope as ProjectType | 'ALL', stageFilters: [] }
        : scope;

    // 1. Filter sites by scope
    let sites = [...siteMasterRecords];
    if (opts.projectType !== 'ALL') {
        sites = sites.filter(s => s.project_type === opts.projectType);
    }
    if (opts.stageFilters.length > 0) {
        sites = sites.filter(s => opts.stageFilters.includes(s.stage || 'imported'));
    }

    // Sort by stage order ASC, then site_id ASC
    sites.sort((a, b) => {
        const sa = STAGE_ORDER.indexOf(a.stage || 'imported');
        const sb = STAGE_ORDER.indexOf(b.stage || 'imported');
        if (sa !== sb) return sa - sb;
        return (a.site_id || '').localeCompare(b.site_id || '');
    });

    // 2. Build header row
    const headers = TEMPLATE_COLUMNS.map(c => c.label);

    // 3. Build data rows
    const dataRows = sites.map(site => {
        const stage = site.stage || 'imported';
        const row: string[] = [
            `${site.site_id}-S1`,   // unique_key
            site.site_id,
            site.site_name || '',
            stage,
        ];
        // Fill editable columns with empty strings
        for (let i = 4; i < TEMPLATE_COLUMNS.length; i++) {
            row.push('');
        }
        return row;
    });

    // 4. Create workbook
    const wb = xlsx.utils.book_new();

    // Sheet 1: UPDATE_STAGE
    const allRows = [headers, ...dataRows];
    const ws = xlsx.utils.aoa_to_sheet(allRows);

    // Set column widths
    ws['!cols'] = TEMPLATE_COLUMNS.map((_col, i) => {
        if (i === 0) return { wch: 14 }; // unique_key
        if (i === 1) return { wch: 12 }; // site_id
        if (i === 2) return { wch: 22 }; // site_name
        if (i === 3) return { wch: 16 }; // curr_stage
        if (i === 4) return { wch: 18 }; // new_stage
        return { wch: 16 };
    });

    xlsx.utils.book_append_sheet(wb, ws, 'UPDATE_STAGE');

    // Sheet 2: PANDUAN
    const panduanData = [
        ['PANDUAN BULK UPDATE STAGE'],
        [''],
        ['ATURAN PENGISIAN:'],
        ['1. Jangan mengubah kolom abu-abu (unique_key, site_id, site_name, curr_stage)'],
        ['2. Isi kolom new_stage dengan stage tujuan yang valid'],
        ['3. Kosongkan new_stage jika tidak ingin mengupdate baris ini'],
        ['4. Anda hanya boleh maju 1 stage (tidak boleh lompat)'],
        [''],
        ['URUTAN STAGE YANG VALID:'],
        ['imported → assigned → permit_process → permit_ready → akses_process → akses_ready → implementasi → rfi_done → rfs_done → dokumen_done → bast → invoice → completed'],
        [''],
        ['FORMAT DATA:'],
        ['- Tanggal: DD/MM/YYYY (contoh: 10/03/2026)'],
        ['- Waktu: HH:MM (contoh: 14:30)'],
        ['- Y/N: ketik Y untuk Ya, N untuk Tidak'],
        ['- tower_provider: MITRATEL / STP / PTI / DMT'],
        ['- jenis_kunci: PADLOCK / SMARTLOCK / QUADLOCK'],
        [''],
        ['KOLOM PERMIT (isi jika stage berhubungan dengan permit):'],
        ['- permit_create_date, tpas_approved, tp_approved, caf_approved, permit_start_date, permit_expiry_date'],
        [''],
        ['KOLOM AKSES (isi jika stage berhubungan dengan akses):'],
        ['- tower_provider, jenis_kunci, pic_akses_nama, pic_akses_telp'],
        [''],
        ['KOLOM IMPLEMENTASI (isi jika stage berhubungan dengan implementasi):'],
        ['- tanggal_plan, tanggal_aktual, ci_date, ci_time, co_date, co_time, rfi_done, rfs_done, dokumen_done'],
        [''],
        ['CATATAN:'],
        ['- Kolom catatan bersifat opsional, bisa diisi untuk semua stage'],
        ['- Kolom yang tidak relevan dengan stage saat ini tidak perlu diisi'],
    ];
    const wsPanduan = xlsx.utils.aoa_to_sheet(panduanData);
    wsPanduan['!cols'] = [{ wch: 90 }];
    xlsx.utils.book_append_sheet(wb, wsPanduan, 'PANDUAN');

    // 5. Download — strip metadata to avoid xl/metadata.xml corruption
    const typeLabel = opts.projectType === 'ALL' ? 'ALL' : opts.projectType;
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `BulkUpdate_${typeLabel}_${dateStr}.xlsx`;

    // Remove any metadata that could cause sheetMetadata references
    delete (wb as any).Workbook;

    const wbOut = xlsx.write(wb, {
        bookType: 'xlsx',
        type: 'array',
        bookSST: false,      // avoid shared string table issues
        compression: true,   // produce smaller, cleaner zip structure
    });
    const blob = new Blob([wbOut], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);

    return sites.length; // return count for UI feedback
};

// ─── Template Parser (for upload) ────────────────────────────────────────────
export interface ParsedBulkRow {
    unique_key: string;
    site_id: string;
    site_name: string;
    curr_stage: string;
    new_stage: string;
    // Additional fields from template
    permit_create_date?: string;
    tpas_approved?: string;
    tp_approved?: string;
    caf_approved?: string;
    permit_start_date?: string;
    permit_expiry_date?: string;
    tower_provider?: string;
    jenis_kunci?: string;
    pic_akses_nama?: string;
    pic_akses_telp?: string;
    tanggal_plan?: string;
    tanggal_aktual?: string;
    ci_date?: string;
    ci_time?: string;
    co_date?: string;
    co_time?: string;
    rfi_done?: string;
    rfs_done?: string;
    dokumen_done?: string;
    catatan?: string;
    [key: string]: any;
}

export interface ValidatedBulkRow {
    row: ParsedBulkRow;
    status: 'valid' | 'skip' | 'error';
    reason?: string;
    changedFields?: string[];
}

export const isToolTemplate = (headers: string[]): boolean => {
    return headers.includes('unique_key') && headers.includes('curr_stage') && headers.includes('new_stage');
};

export const parseBulkTemplate = (file: File): Promise<{
    isValid: boolean;
    rows: ValidatedBulkRow[];
    headers: string[];
}> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = xlsx.read(data, { type: 'array' });

                const firstSheet = workbook.SheetNames[0];
                const ws = workbook.Sheets[firstSheet];
                const rawJson = xlsx.utils.sheet_to_json<ParsedBulkRow>(ws, { defval: '' });

                // Check headers
                const headerRow = xlsx.utils.sheet_to_json<string[]>(ws, { header: 1 })[0] || [];
                const stringHeaders = headerRow.map(h => String(h).trim());

                if (!isToolTemplate(stringHeaders)) {
                    resolve({ isValid: false, rows: [], headers: stringHeaders });
                    return;
                }

                // Validate each row
                const validatedRows: ValidatedBulkRow[] = rawJson.map(row => {
                    const current = String(row.curr_stage || '').trim();
                    const next = String(row.new_stage || '').trim();
                    const uniqueKey = String(row.unique_key || '').trim();

                    // Skip if no new_stage
                    if (!next) {
                        return { row, status: 'skip' as const, reason: 'new_stage kosong (dilewati)' };
                    }

                    // Check unique_key exists in our data
                    const siteId = String(row.site_id || '').trim();
                    const siteExists = siteMasterRecords.some(s => s.site_id === siteId);
                    if (!siteExists) {
                        return { row, status: 'error' as const, reason: `unique_key "${uniqueKey}" tidak ditemukan di database` };
                    }

                    // Check if new_stage is a valid stage
                    const nextIndex = STAGE_ORDER.indexOf(next);
                    if (nextIndex === -1) {
                        return { row, status: 'error' as const, reason: `Stage tidak valid: "${next}"` };
                    }

                    const currentIndex = STAGE_ORDER.indexOf(current);

                    // Same stage = skip
                    if (next === current) {
                        return { row, status: 'skip' as const, reason: 'new_stage = curr_stage (tidak ada perubahan)' };
                    }

                    // Backward = skip
                    if (nextIndex < currentIndex) {
                        return { row, status: 'skip' as const, reason: `Stage mundur (${current} → ${next})` };
                    }

                    // Skipping >1 stage = error
                    if (nextIndex > currentIndex + 1) {
                        return { row, status: 'error' as const, reason: `Lompat ${nextIndex - currentIndex - 1} stage (${current} → ${next})` };
                    }

                    // Exactly +1 = valid. Collect changed fields.
                    const changedFields: string[] = [];
                    TEMPLATE_COLUMNS.forEach(col => {
                        if (col.locked) return;
                        if (col.key === 'new_stage') return;
                        const val = String(row[col.key] || '').trim();
                        if (val) changedFields.push(col.key);
                    });

                    return { row, status: 'valid' as const, changedFields };
                });

                resolve({ isValid: true, rows: validatedRows, headers: stringHeaders });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

// ─── Stage transition grouping helper ────────────────────────────────────────
export interface StageTransitionGroup {
    fromStage: string;
    toStage: string;
    count: number;
    icon: string;
    label: string;
    docExamples: string;
}

const STAGE_EMOJI: Record<string, string> = {
    'permit_process': '📋',
    'permit_ready': '📋',
    'akses_process': '🔑',
    'akses_ready': '🔑',
    'implementasi': '🔧',
    'rfi_done': '📡',
    'rfs_done': '📡',
    'dokumen_done': '📄',
    'bast': '📝',
    'invoice': '💰',
    'completed': '✅',
};

const STAGE_DOC_EXAMPLES: Record<string, string> = {
    'permit_process': 'Formulir permit, surat pengajuan',
    'permit_ready': 'TPAS approval, izin TP, permit dokumen',
    'akses_process': 'Surat permintaan akses tower',
    'akses_ready': 'Foto kondisi site, bukti akses',
    'implementasi': 'Jadwal implementasi, SPK tim',
    'rfi_done': 'RFI report, foto antena',
    'rfs_done': 'RFS report, screenshot integration',
    'dokumen_done': 'ATP, dokumen serah terima',
    'bast': 'BAST dokumen',
    'invoice': 'Invoice, bukti tagihan',
    'completed': 'Dokumen penutupan proyek',
};

export const groupByTransition = (rows: ValidatedBulkRow[]): StageTransitionGroup[] => {
    const validRows = rows.filter(r => r.status === 'valid');
    const groups: Record<string, StageTransitionGroup> = {};

    validRows.forEach(r => {
        const key = `${r.row.curr_stage}→${r.row.new_stage}`;
        if (!groups[key]) {
            groups[key] = {
                fromStage: r.row.curr_stage,
                toStage: r.row.new_stage,
                count: 0,
                icon: STAGE_EMOJI[r.row.new_stage] || '📦',
                label: r.row.new_stage.replace(/_/g, ' '),
                docExamples: STAGE_DOC_EXAMPLES[r.row.new_stage] || 'Dokumen pendukung',
            };
        }
        groups[key].count++;
    });

    return Object.values(groups);
};
