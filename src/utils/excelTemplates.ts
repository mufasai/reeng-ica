import * as xlsx from 'xlsx';

// Generate a 5-sheet Excel template for updating site stages
export const generateBulkUpdateTemplate = (prefix: string = 'ALL') => {
    const wb = xlsx.utils.book_new();

    // 1. PANDUAN Sheet
    const panduanData = [
        ['PANDUAN BULK UPDATE STAGE'],
        [''],
        ['ATURAN PENGISIAN:'],
        ['- Masukkan SITE_ID yang valid di kolom SITE_ID.'],
        ['- Masukkan stage tujuan di kolom NEW_STAGE.'],
        ['- Anda dapat menambahkan catatan di kolom NOTES (opsional).'],
        [''],
        ['DAFTAR STAGE YANG VALID (Hanya bisa maju, maksimal lompat 1 stage):'],
        ['imported -> assigned -> permit_process -> permit_ready -> akses_process -> akses_ready -> implementasi -> rfi_done -> rfs_done -> dokumen_done -> bast -> invoice -> completed'],
        ['* issue_hold bisa diakses dari stage mana saja.']
    ];
    const wsPanduan = xlsx.utils.aoa_to_sheet(panduanData);
    xlsx.utils.book_append_sheet(wb, wsPanduan, '00_PANDUAN');

    // 2. DATA Sheet (Empty Template)
    const templateHeaders = [
        { SITE_ID: 'TSELXXXX', NEW_STAGE: 'permit_process', NOTES: 'Contoh data, hapus baris ini' }
    ];
    const wsData = xlsx.utils.json_to_sheet(templateHeaders);
    xlsx.utils.book_append_sheet(wb, wsData, 'DATA_UPDATE');

    // Download
    xlsx.writeFile(wb, `Bulk_Update_Template_${prefix}_${new Date().getTime()}.xlsx`);
};
