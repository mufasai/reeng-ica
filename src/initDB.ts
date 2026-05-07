/**
 * initDB.ts
 *
 * Loads live data from SurrealDB (yerico/project_budget) into the app's
 * in-memory state on startup.
 *
 * Table architecture:
 *  - site_technical_details → siteTechnicalDetails (base/physical identity per NE_ID)
 *  - sites                  → atpWorkOrders (one row per SITE-SECTOR, has atp_number, permit, impl status)
 *  - sites                  → siteMasterRecords (de-duped by site_id, merged from progress data)
 *  - materials              → materialTransactions
 */

import { db, connectDB } from './db';
import {
  siteMasterRecords,
  materialTransactions,
  siteTechnicalDetails,
  atpWorkOrders,
} from './data/mockData';

type SiteMasterStatusType = typeof siteMasterRecords[0]['status'];
type ProjectTypeType = typeof siteMasterRecords[0]['project_type'];
type StageType = typeof siteMasterRecords[0]['stage'];

function toStatus(v: unknown): SiteMasterStatusType {
  return String(v || '') as SiteMasterStatusType;
}
function toProjectType(v: unknown): ProjectTypeType {
  const s = String(v || '').toUpperCase();
  if (s.includes('FILTER')) return 'FILTER' as ProjectTypeType;
  return s as ProjectTypeType;
}
function toStage(v: unknown): StageType {
  return (String(v || 'imported') || 'imported') as StageType;
}

export async function initAppDB() {
  await connectDB();
  try {
    // ── 1. BASE DATA: site_technical_details ──────────────────────────────
    const detailsResult = await db.query('SELECT * FROM site_technical_details');
    if (detailsResult?.[0] && Array.isArray(detailsResult[0])) {
      const techRecords = detailsResult[0].map((d: Record<string, unknown>, i: number) => ({
        id:            String(d.id          || `tech-${i}`),
        site_id:       String(d.site_id     || ''),
        ne_id:         String(d.ne_id       || ''),
        layer:         String(d.layer       || ''),
        sector:        Number(d.sector)     || 0,
        freq_band:     String(d.freq_band   || ''),
        longitude:     Number(d.longitude)  || 0,
        latitude:      Number(d.latitude)   || 0,
        ant_type:      String(d.ant_type    || ''),
        height:        Number(d.height)     || 0,
        tp_id:         String(d.tp_id       || ''),
        tp_name:       String(d.tp_name     || ''),
        cell_name:     String(d.cell_name   || ''),
        enodeb_id:     Number(d.enodeb_id)  || 0,
        cell_id:       Number(d.cell_id)    || 0,
        local_cell_id: Number(d.local_cell_id) || 0,
        cluster:       String(d.cluster     || ''),
        region:        String(d.region      || ''),
        source_file:   String(d.source_file || 'surrealdb'),
        imported_at:   new Date().toISOString(),
        province:      String(d.province    || ''),
        address:       String(d.address     || ''),
        kecamatan:     String(d.kecamatan   || ''),
        kabupaten:     String(d.kabupaten   || ''),
        city:          String(d.city        || ''),
      }));

      siteTechnicalDetails.length = 0;
      siteTechnicalDetails.push(...techRecords);
      console.log('[initDB] Technical details loaded:', siteTechnicalDetails.length);
    }

    // ── 2. WORK DATA: sites (ReEngineering Progress) ──────────────────────
    // Each row = one site-sector work order (atp_number = TIKET NUMBER)
    const sitesResult = await db.query('SELECT * FROM sites');
    if (sitesResult?.[0] && Array.isArray(sitesResult[0])) {
      const rawSites = sitesResult[0] as Record<string, unknown>[];

      // Build atpWorkOrders — one per row (site-sector)
      const atpRecords = rawSites.map((s, i) => ({
        id:               String(s.id || `atp-${i}`),
        site_id:          String(s.site_id || ''),
        atp_number:       String(s.atp_number || ''),     // ← TIKET NUMBER
        sow_id:           String(s.sow_id || ''),
        po_number:        String(s.po_id || ''),
        sector:           Number(s.sector) || 1,
        site_sector_key:  String(s.site_sector || `${s.site_id}-S${s.sector || 1}`),
        project_type:     toProjectType(s.project_type),
        stage:            toStage(s.stage),
        team_id:          String(s.team || ''),
        field_leader_id:  String(s.field_leader_id || ''),
        initiated_by:     'system',
        initiated_at:     new Date().toISOString(),
        status:           'active' as const,
        // Permit fields
        permit_status:    String(s.permit_status || ''),
        issue_problem:    String(s.issue_problem || ''),
        note_problem:     String(s.note_problem || ''),
        permit_create_date: String(s.permit_create_date || ''),
        lock_type:          String(s.lock_type || ''),
        permit_start:       String(s.permit_start || ''),
        pic:                String(s.pic || ''),
        permit_expiry:      String(s.permit_expiry || ''),
        pic_telp:           String(s.pic_telp || ''),
        tpas_no:            String(s.tpas_no || ''),
        tp_no:              String(s.tp_no || ''),
        caf_no:             String(s.caf_no || ''),
        // Implementation fields
        implementasi_status: String(s.implementasi_status || ''),
        impl_status:      String(s.implementasi_status || ''),
        tanggal_rfs:      String(s.tanggal_rfs || ''),
        actual_date:      String(s.tanggal_rfs || ''),
        issue_implementasi: String(s.issue_implementasi || ''),
        note_implementasi: String(s.note_implementasi || s.impl_notes || ''),
        impl_notes:       String(s.note_implementasi || s.impl_notes || ''),
        rfs_done:         s.rfs_done != null ? Boolean(s.rfs_done) : String(s.implementasi_status || '').toUpperCase() === 'RFS',
        plan_date:        String(s.plan_date || ''),
        ci_date:          String(s.ci_date || ''),
        co_date:          String(s.co_date || ''),
        impl_rfi_done:    Boolean(s.impl_rfi_done),
        rfi_done:         Boolean(s.rfi_done),
        // Rescoping Implementasi — building access
        has_akses_gedung:    Boolean(s.has_akses_gedung),
        nama_gedung:         String(s.nama_gedung || ''),
        pic_gedung_nama:     String(s.pic_gedung_nama || ''),
        pic_gedung_telp:     String(s.pic_gedung_telp || ''),
        status_akses_gedung: String(s.status_akses_gedung || ''),
        // Survey fields (Rescoping)
        survey_date:         String(s.survey_date || ''),
        survey_result:       s.survey_result != null ? String(s.survey_result) : null,
        survey_nok_reason:   String(s.survey_nok_reason || ''),
        // ERFIN fields (Rescoping)
        erfin_number:        String(s.erfin_number || ''),
        erfin_date:          String(s.erfin_date || ''),
        erfin_ready_date:    String(s.erfin_ready_date || ''),
        erfin_note:          String(s.erfin_note || ''),
        // ATP fields
        status_atp:       String(s.status_atp || s.atp_status || ''),
        atp_status:       String(s.status_atp || s.atp_status || ''),
        // note_foto_evidence — stored under either name depending on who saved it
        note_foto_evidence:   String(s.note_foto_evidence || s.foto_evidence_notes || ''),
        foto_evidence_notes:  String(s.note_foto_evidence || s.foto_evidence_notes || ''),
        // pdid — may have been saved as either key
        ppid:             String(s.ppid || s.pdid || ''),
        pdid:             String(s.ppid || s.pdid || ''),
        prio:             String(s.prio || ''),
        prio_capex_final: String(s.prio_capex_final || ''),
        new_status_implementation: String(s.new_status_implementation || ''),
        latitude:            Number(s.latitude) || 0,
        longitude:           Number(s.longitude) || 0,
        ne_id:               String(s.ne_id || ''),
        site_name:           String(s.site_name || ''),
        tp_name:             String(s.tp_name || s.tower_provider || ''),
        tower_provider:      String(s.tp_name || s.tower_provider || ''),
        ineom_registered:    Boolean(s.ineom_registered),
        ioms_registered:     Boolean(s.ineom_registered),
        combat_impl_steps:   (s.combat_impl_steps as any) || null,
        // Combat BTS technical fields
        bts_type:            String(s.bts_type || ''),
        mast_type:           String(s.mast_type || ''),

        mast_height:         Number(s.mast_height) || null,
        antenna_count:       Number(s.antenna_count) || null,
        power_source:        String(s.power_source || ''),
        power_capacity_kva:  Number(s.power_capacity_kva) || null,
        luas_lahan_m2:       Number(s.luas_lahan_m2) || null,
        access_road:         s.access_road != null ? Boolean(s.access_road) : null,
        grounding_done:      s.grounding_done != null ? Boolean(s.grounding_done) : null,
        lightning_rod:       s.lightning_rod != null ? Boolean(s.lightning_rod) : null,
        frequency_bands:     Array.isArray(s.frequency_bands) ? s.frequency_bands as string[] : [],
        vendors:             Array.isArray(s.vendors) ? s.vendors as string[] : [],
      }));

      atpWorkOrders.length = 0;
      atpWorkOrders.push(...(atpRecords as unknown as typeof atpWorkOrders));
      console.log('[initDB] ATP work orders loaded:', atpWorkOrders.length);

      // Build siteMasterRecords — de-duped by site_id, take first/best row per site
      const masterMap = new Map<string, typeof siteMasterRecords[0]>();
      for (const s of rawSites) {
        const sid = String(s.site_id || '');
        if (!sid) continue;
        if (!masterMap.has(sid)) {
          masterMap.set(sid, {
            id:           String(s.id || sid),
            unique_key:   sid,
            site_id:      sid,
            ne_id:        String(s.ne_id || ''),
            site_name:    String(s.site_name || ''),
            plan_capex:   '',
            area:         '',
            region:       String(s.region || ''),
            nop:          '',
            sow_eqp:      String(s.sow_id || ''),
            quantity:     1,
            sow_pekerjaan: '',
            po_tsel:      String(s.po_id || ''),
            mitra:        String(s.tp_name || ''),
            project_type: toProjectType(s.project_type),
            status:       toStatus(s.permit_status),
            stage:        toStage(s.stage),
            ineom_registered: Boolean(s.ineom_registered),
            ioms_registered:  Boolean(s.ineom_registered),
            batch_ref:    '',
            imported_by:  'system',
            imported_at:  new Date().toISOString(),
            team_id:      String(s.team || ''),
            geom:         (s.latitude && s.longitude)
                            ? `${s.latitude}, ${s.longitude}`
                            : '',
            combat_impl_steps: (s.combat_impl_steps as any) || null,
          } as any);
        }
      }

      siteMasterRecords.length = 0;
      siteMasterRecords.push(...masterMap.values());

      // Backfill lat/lon from atpRecords into master records (map uses siteMasterRecords)
      for (const master of siteMasterRecords) {
        const atp = atpRecords.find(a => a.site_id === master.site_id && a.latitude && a.longitude);
        if (atp) {
          (master as any).latitude  = atp.latitude;
          (master as any).longitude = atp.longitude;
        }
        // Also copy permit_status, impl_status, team for map tooltip/table
        const firstAtp = atpRecords.find(a => a.site_id === master.site_id);
        if (firstAtp) {
          (master as any).permit_status    = firstAtp.permit_status;
          (master as any).impl_status      = firstAtp.implementasi_status;
          (master as any).team_assigned    = firstAtp.team_id;
          (master as any).status_atp       = firstAtp.status_atp;
          (master as any).tower_provider   = firstAtp.tp_name;
          (master as any).ioms_registered  = firstAtp.ineom_registered;
          (master as any).ineom_registered = firstAtp.ineom_registered;
          // Carry across ATP-level fields the table reads
          (master as any).po_tsel          = firstAtp.po_number || (master as any).po_tsel;
          (master as any).priority         = firstAtp.prio || (master as any).priority;
        }
      }
      console.log('[initDB] Site master records loaded:', siteMasterRecords.length);
    }

    // ── 3. MATERIALS ───────────────────────────────────────────────────────
    const matsResult = await db.query('SELECT * FROM materials');
    if (matsResult?.[0] && Array.isArray(matsResult[0])) {
      const matRecords = matsResult[0].map((m: Record<string, unknown>, i: number) => ({
        id:                String(m.id              || `mat-${i}`),
        material_master_id: `mm-${i}`,
        material_nama:     String(m.name            || ''),
        material_type:     String(m.material_type   || ''),
        direction:         String(m.direction       || 'IN') as 'IN' | 'OUT',
        quantity:          Number(m.qty)            || 0,
        delivery_date:     String(m.tgl             || ''),
        delivery_note_no:  String(m.delivery_note_no || ''),
        po_number:         String(m.po_delivery_date || ''),
        vendor_pengirim:   String(m.vendor          || ''),
        sender:            String(m.sender          || ''),
        receiver:          String(m.receiver        || ''),
        catatan:           '',
        imported_from:     'surrealdb',
        created_at:        new Date().toISOString(),
      }));

      materialTransactions.length = 0;
      materialTransactions.push(...matRecords);
      console.log('[initDB] Materials loaded:', materialTransactions.length);
    }

  } catch (e) {
    console.error('[initDB] Failed to init app data:', e);
  }
}
