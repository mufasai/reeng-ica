# SMARTELCO REENGINEERING TOOL — COMPLETE TECHNICAL BRIEFING
# For Claude Code / AI coding assistant
# Last updated: May 2026

---

## 1. WHAT THIS TOOL IS

An operational + financial tracking tool for PT. Smartelco Solusi Teknologi.
Replaces Excel-based tracking for telecom site reengineering work with Telkom Indonesia.

The tool manages: site registry → work initiation → permit → implementation → ATP submission → billing.

Running at: localhost:5173 (React + Vite dev server)

---

## 2. TECH STACK

```
Frontend:   React + TypeScript + Tailwind CSS + Vite
Backend:    Laravel (PHP) — API only
Database:   SurrealDB (NoSQL, schema-optional)
            URL: https://surrealdb-production-b201.up.railway.app
            NS: yerico  DB: project_budget
            User: root  Pass: root
Charts:     Recharts
Excel:      PhpSpreadsheet (direct, NOT maatwebsite wrapper)
Icons:      Lucide React
```

---

## 3. CORE DATA MODEL

### The fundamental unit of work is the ATP TICKET (work_order), NOT the site.

```
site_master          ← base reference data (from Detail Site-ID sheet)
  site_id            unique identifier e.g. 'CLG020'
  site_name          e.g. 'E_CLG020_Cilegon4'
  ne_id, region, cluster, provinsi, address
  tp_name            tower provider
  latitude, longitude

work_orders          ← PRIMARY OPERATIONAL TABLE (one per ATP ticket)
  id
  site_id            → site_master.site_id
  atp_number         e.g. 'ATP000000282692'
  sow_id             e.g. 'R0011058250'
  po_number          e.g. '4200052176'
  sector             int (1, 2, 3...)
  project_type       enum: filter|combat|rescoping|blacksite|l2h
  stage              enum (see Stage Pipeline below)
  team_name          leader's name from Excel (e.g. 'Denny Suhendra')
  team_id            → teams.id (nullable)
  field_leader_id    → people.id (nullable)
  permit_status      human-readable e.g. '5. Permit Released'
  impl_status        e.g. 'RFS', 'Awaiting'
  atp_status         e.g. 'REQUEST PDID', 'UPLOAD TAGGING DONE'
  batch              e.g. 'Batch#2'
  priority           e.g. 'P3'
  latitude, longitude
  note_impl, note_atp
  -- Rescoping-only extra fields (stored directly, no migration needed) --
  survey_date, survey_result ('ok'|'nok'), survey_nok_reason
  erfin_number, erfin_date, erfin_ready_date
  has_akses_gedung (bool), gedung_nama, gedung_pic_nama, gedung_pic_telp
  -- Meta --
  status             'active'|'completed'|'cancelled'
  initiated_by       → users.id
  created_at, updated_at

site_stage_log / work_order_logs
  work_order_id, stage, changed_by, changed_at, note

site_files
  work_order_id, filename, file_url, tag, atp_checked (bool)
  tags: 'permit'|'implementasi'|'atp'|'bast'|'invoice'|'survey_material'|'erfin'

termins / termin_pengajuan
  work_order_id, termin_key (t1|t2a|t2b|t2c|t3|t4)
  nominal, status (submitted|approved|paid|rejected)
  submitted_by, approved_by, paid_at

material_transactions  ← stock ledger (IN/OUT movements)
  material_type, material_name, direction ('IN'|'OUT')
  quantity, delivery_date, delivery_note_no, po_number
  vendor, sender, receiver

material_master        ← catalog
  nama_material, kategori, satuan, harga_satuan

teams
  id, nama_tim, project_type, regional, coordinator_id, status_aktif

team_members
  team_id, person_id, jabatan, is_field_leader (bool)

people / users
  personal data, role, team assignments
```

---

## 4. STAGE PIPELINES

### Filter / Combat / Blacksite / L2H (identical pipelines):
```
imported → assigned → permit_process → permit_ready
→ akses_process → akses_ready → implementasi → rfs_done
→ dokumen_done → bast → invoice → completed
```

### Rescoping (different):
```
imported → assigned → survey → [survey_nok ← dead end, resettable]
survey (OK) → erfin_process → erfin_ready
→ permit_process → permit_ready → akses_process → akses_ready
→ implementasi → rfi_done (NOT rfs_done)
→ dokumen_done → bast → invoice → completed
```

### Stage Mapping from Excel values:
```
Excel PERMIT STATUS              → tool stage
'1. Planning'                    → permit_process
'2. Waiting for TO Approval'     → permit_process
'4. Tpass Released'              → permit_process
'5. Permit Released'             → permit_ready
'6. Expired Permit'              → issue
'9. Cancelled'                   → cancelled

Excel IMPLEMENTASI STATUS        → tool stage
'Awaiting' / 'Scheduled'         → implementasi
'On Going'                       → implementasi
'RFS'                            → rfs_done
'Cancelled'                      → cancelled
```

---

## 5. USER ROLES & PERMISSIONS

```
Role         Login   Can Do
──────────────────────────────────────────────────────────────
director     yes     view all + approve/reject termin (CANNOT edit data)
operational  yes     full ops: initiate ATP, update stages, submit termin
admin        yes     same as operational + system/user management
finance      yes     approve/reject termin + mark paid + limited site view
field        yes     own sites only, upload photos, update implementasi CI/CO
```

### Key permission rules:
- Submit pengajuan termin: operational + admin only
- Approve/reject termin: director + finance only
- Mark paid: finance only
- Delete site: operational only
- Field role → filtered to their team's sites only

---

## 6. NAVIGATION STRUCTURE

```
Sidebar:
  OVERVIEW
    Dashboard
  PEKERJAAN
    Sites [N]          ← all sites (assigned + unassigned)
    Blacksite [N]
    Combat [N]
    Filter [N]
    L2H [N]
    Rescoping [N]
  DATA & DOKUMEN
    Workforce          ← Personnel Data + Field Teams tabs
    Material Master
  SYSTEM
    Options
```

### App-level Tab Bar (Chrome-style):
- Persistent tab bar below topbar
- Default tabs: Dashboard, Sites (non-closeable)
- Opening a site or ATP → adds a closeable tab
- Multiple sites/ATPs can be open simultaneously

---

## 7. URL STRUCTURE

```
/                          → Dashboard
/sites                     → Sites list (assigned + unassigned sections)
/sites?tab=data            → same as above
/projects/type/filter      → Filter sites (work orders filtered by type)
/projects/type/combat      → Combat sites
/projects/type/rescoping   → Rescoping sites
/sites/{siteId}            → Site detail (Info Site | Pekerjaan | Log tabs)
/sites/{siteId}#pekerjaan  → Site detail, Pekerjaan tab active
/atp/{workOrderId}         → ATP work page (the main working environment)
/workforce                 → Personnel Data + Field Teams
/materials                 → Material Master + Riwayat Stok
/dashboard                 → Dashboard
```

---

## 8. KEY PAGES & COMPONENTS

### A. Sites Table (/sites)

Two sections in one table:
1. **PEKERJAAN AKTIF** — sites with active work_orders, show full operational columns
2. **BELUM DITUGASKAN** — sites with no work_orders, show reference columns

Default visible columns:
`SITE_ID | Site Name | ATP Number | Sektor | Region | TP | Permit Status | Impl Status | ATP Status | Team | Stage | Last Updated | Termin | Actions`

Permit/Impl/ATP Status use Excel human-readable values (not internal enum).
Color coded: green=good, amber=in progress, red=cancelled/issue.

Actions per row:
- Assigned: `[Detail →]` opens site as app tab, `[+ ATP]` creates new work order
- Unassigned: `[+ Tugaskan ke Proyek]` opens one-question modal (project type only)

**Inline editing:**
- Stage badge → click → dropdown (next valid stage or "Update Lengkap →")
- Team cell → click → searchable team dropdown, auto-saves
- ATP Number cell → click → edit in place

### B. Site Detail (/sites/{siteId})

Top strip: Site ID (large) + Site Name + meta pills (Region, Cluster, TP, NE ID)
+ `[+ Tugaskan ke Proyek]` button

**Three tabs:**
1. **Info Site** — all data from site_technical_details, 2-col key-value grid, inline editable
2. **Pekerjaan (N)** — table of all work_orders for this site (inline editable ATP/PO/SOW)
3. **Log & Aktivitas** — combined activity log, grouped by ATP, collapsible

In the Pekerjaan tab:
- Table columns: ATP Number | Tipe | Sektor | PO | SOW | Permit Status | Stage | Actions
- `[Buka ↗]` → opens ATP as new app tab
- `[+ Buat ATP Baru]` → initiation modal

### C. ATP Work Page (/atp/{workOrderId})

**The main working environment. This is where all actual work is done.**

Header: ATP number + Sektor badge + Type badge + Status badge
Meta row (inline editable): Site ID · PO Number · SOW ID · SOW Type · Asset Element · Capex Project · Batch

Stage stepper: numbered circles, green=done, blue=current, gray=pending
Under each completed node: date it was reached

**Inner tabs (Filter/Combat/Blacksite/L2H):**
`[📋 Permit] [🔧 Implementasi] [📡 ATP & Dok] [💰 Penagihan] [📷 Foto] [📎 File] [📜 Log]`

**Inner tabs (Rescoping only):**
`[🔍 Survey] [📄 ERFIN] [📋 Permit] [🔧 Implementasi] [📡 ATP & Dok] [💰 Penagihan] [📷 Foto] [📎 File] [📜 Log]`

**All fields auto-save on blur (onBlur → PATCH /api/work-orders/{id})**
Save status shown: 'Tersimpan 14:32' / 'Menyimpan...' / 'Gagal ✗'

**Permit tab** — inline 2-col grid:
Permit Status (dropdown with Excel values) | Tower Provider | Create Date | Jenis Kunci | Permit Start/Expiry | PIC Nama/Telp | TPAS/TP/CAF
File upload zone. `[Simpan Draft]` + `[Update Stage Permit →]`

**Implementasi tab** — inline 2-col grid:
Team | Field Leader | Tanggal Plan/Aktual | CI/CO Date+Time | RFS Done toggle (Filter) / RFI Done toggle (Rescoping) | Impl Status dropdown | Note
Photo upload zone (large, mobile-friendly for engineers).
`[Simpan Draft]` + `[Update Stage Implementasi →]`

**ATP & Dok tab:**
PDID | Tiket ATP | Status ATP (dropdown: REQUEST PDID/UPLOAD TAGGING DONE/TAGGING N/A/HOLD) | Note Foto Evidence
eATP Certificate: Azimuth S1/S2/S3

**Penagihan tab:**
Tracks ALL financial items (not just termin):
- Termin T1-T4 (trigger-based, same logic)
- Biaya Perizinan, Transportasi, Material Tambahan, Sewa Alat, Lainnya
Submit: operational/admin. Approve: director/finance. Mark paid: finance.

**Foto tab:**
Engineer uploads here. Photo grid. Admin names photos (RRU/Tower/Kabel etc.).

### D. Dashboard

Status Lapangan strip (clickable → filters sites table):
`[Survey] [Menunggu Permit] [Permit Ready] [Akses] [Implementasi] | [Proses BAST] [Invoice] | [Issue] [Selesai]`

Dashed border on BAST/Invoice cards = "Fase Komersial" separator.

Role-based action cards (4 cards below the strip):
- Director: Menunggu Approval | Total Terbayar | Proses BAST | Sisa Tagih
- Operational/Admin: Belum Ditugaskan | Stuck >14 Hari | Permit Expiring | Siap Pengajuan Termin
- Finance: Perlu Approval | Sudah Disetujui Belum Dibayar | Terbayar Bulan Ini | Total Sisa Tagih

Charts section:
- Horizontal bar: pipeline distribution (sites per stage group)
- Line chart: completion velocity per week per type

All cards clickable → `/sites?stage=...` with pre-applied filter.

---

## 9. TERMIN PAYMENT SYSTEM

```
Termin   %    Trigger stage       Filter/Combat   Rescoping
────────────────────────────────────────────────────────────
T1       30%  permit_ready        ✓               ✓
T2a      15%  rfi/rfs done        rfi_done*       rfi_done
T2b      25%  rfs done            rfs_done        rfi_done (COMBINED with T2a = 40%)
T2c      10%  dokumen_done        ✓               ✓
T3       10%  bast                ✓               ✓
T4       10%  invoice             ✓               ✓

* rfi_done in Filter context = CI/CO implementasi done
```

Submit flow:
1. Stage reached → Payment Prompt Card appears (operational/admin see this)
2. Click `[Ajukan Sekarang →]` → Pengajuan modal (nominal + docs + catatan)
3. Director/Finance approve in their termin accordion view
4. Finance marks as paid

Director/Finance see: collapsible accordion per termin (T1 collapsed paid, T3 expanded pending)
Each termin card shows: docs attached (direct download), history log, approve/reject buttons.

---

## 10. MULTI-SHEET EXCEL UPLOAD

Single entry point handles multiple sheet types from the same Excel file.

**Sheet classification (auto-detected):**
```
Sheet type          Detection criteria              Destination
────────────────────────────────────────────────────────────────────
Stage Update        SITE_ID + PERMIT_STATUS         Updates work_orders
Data Teknis Site    SITE_ID + LAYER + FREQ_BAND     site_technical_details
Stok Material       Type + IN/OUT + Quantity        material_transactions
Workforce           NAMA_KARYAWAN + NO_HP           people/teams
Lewati              Everything else                  ignored
```

**Context defaults per page:**
- From /sites → Stage Update + Data Teknis = process, others = skip
- From /materials → Stok Material = process, others = skip
- From /workforce → Workforce = process, others = skip
- User can override any sheet's classification via dropdown

**Processing flow (4 steps):**
1. Upload Excel → detect sheets
2. User confirms/adjusts sheet types
3. Column mapper per sheet (maps their headers to system fields)
4. Value normalization for status columns (Excel text → stage enum)
5. Preview (Valid / Skip / Error tabs) → Process

**Smart merge on import:**
- Always update: stage, permit_status, impl_status, atp_status, team_name
- Update if empty: site_name, region, ne_id, coordinates
- Never overwrite: stage_log, files, termin records
- Conflicts shown in `[⚠ Konflik]` tab for manual resolution

**SurrealDB advantage:** unmapped columns stored as `raw_data` object on the record. Nothing lost.

---

## 11. WORKFORCE / PEOPLE & TEAMS

### Page: /workforce
Two tabs: `Personnel Data` | `Field Teams`

**Personnel Data table columns:**
No | Nama | Jabatan Kerja | Pekerjaan (Type) | Regional | No HP | Email | NIK/KTP | Status

**Field Teams:**
Team cards showing: name, type badge, coordinator, member count, active sites

**Excel Import (Column Mapper):**
Auto-detects leader from JABATAN KERJA column ('Leader' → is_field_leader: true)
Groups people by PEKERJAAN value → proposes team creation
Coordinator from header row (e.g. 'Coordinator Area: Rivo Hidayat')
People without PEKERJAAN → individual pool, no team

**Site assignment uses: Team → Field Leader (dropdown filtered to leaders of that team)**
Team dropdown filtered by site's project_type.

---

## 12. ENGINEER PHONE UI

Field/engineer role after login → "ATP Saya" page (not full dashboard)
Shows: work_orders assigned to their team, stage IN (implementasi, rfi_done, rfs_done)

Each card: Site ID · ATP number · Stage · `[📷 Upload Foto]`

Photo upload:
- Large tap-to-upload area
- Supports multiple photos at once
- Optional title tag per photo (quick chips: RRU/Tower/Kabel/Antena/Sebelum/Sesudah)
- Engineers can leave tags blank → admin names them later

Admin photo tagging (in ATP work page Foto tab):
- Grid of uploaded photos
- Photos without admin caption show amber border
- Dropdown per photo: RRU/Tower/Kabel/Antena/Lainnya
- `[Simpan Semua Nama]` bulk save

---

## 13. AUTO-NOTIFICATIONS

When key stages are reached, system generates structured notification:
```
*Permit Rilis*
STATUS PERMIT : 5. Permit Released
PROJECT TYPE  : FILTERING
SITE ID-Sector: CLG020-2
SITE NAME     : E_CLG020_Cilegon4
JUMLAH FILTER : 1
LONG-LAT      : -6.024053, 106.068951
```

`[Salin Notif]` button copies to clipboard in WhatsApp format.
Notification bell shows count badge for unread notifications.
Similar for: RFS done, BAST signed, Termin approved.

---

## 14. CURRENT DATABASE STATE (SurrealDB)

Tables confirmed in DB:
- areas, sites, work_orders, wo_sites, wo_teams
- projects, project_files, projects_dashboard
- users, people, personnel, teams, team_members, site_team_members
- termins, payment_termins, payment_sub_termins, payment_workflows
- material_master, material_transactions, materials
- site_files, site_evidence, site_permit_doc, site_stage_log, site_stage_logs
- costs, site_issue, import_history
- bukti_pembayaran_files, termin_files

⚠ NOTE: The `sites` table currently has corrupted data (wrong column mapping from an
early import — `site_id` = "ME", `sector` contains antenna type string).
The `work_orders` table has only 1 demo record (wo001).
The `import_history` shows the Monitoring Excel was previously imported but incorrectly.

The Monitoring_Project_Re-Engineering_20260421.xlsx has been processed and contains:
- 219 rows in ReEngineering Progress (all FILTERING project type)
- Stage distribution: rfs_done: 92, cancelled: 67, implementasi: 60
- Teams: Denny Suhendra (58 sites), Rizky Maulana Fridiansyah (21), Irfan Kurniawan (8)
- 12 inventory rows (Filter, Accesoris, connectors — all IN direction)

---

## 15. KNOWN BUGS & PENDING FIXES

```
BUG                                  FIX LOCATION
─────────────────────────────────────────────────────────────────────
Multi-sheet dropdown overrides        Part 30 Prompt 1 — state per row
  stuck at "Lewati"
[Kolom ▾] button does nothing        Part 31 Prompt 2 — full React code provided
Detail Site-ID sheet no backend      Part 31 Prompt 1 — POST /api/import/site-technical
Switch Role (DEV) toggle             REMOVE before any production demo
  visible in all screenshots —
  shows on all roles
Work order backfill missing          Part 33 Prompt 3 — migrate site_master.stage
  BDS105/TGR088 show 0 pekerjaan    → work_orders records
Submit Pengajuan modal was           Part 26 + Part 30 Prompt 1
  showing alert() placeholder
```

---

## 16. IMMEDIATE PRIORITIES (what to work on next)

1. **Connect Excel data to SurrealDB properly**
   - The processed data is in `/home/claude/processed_sites.json` (219 rows)
   - Need to create `sites` + `work_orders` records from this data
   - SurrealDB URL: https://surrealdb-production-b201.up.railway.app
     NS: yerico, DB: project_budget, user: root, pass: root
   - Note: Railway has IP allowlist — run import script from the app server or local machine

2. **Fix multi-sheet upload dropdown + column button** (Part 31 Prompt 2)

3. **App-level tab bar** (Part 34 Prompt 1) — Chrome-style, sites/ATPs open as tabs

4. **ATP work page** (Part 36 Prompt 3) — the core working environment

5. **Sites table two-section layout** (Part 35 Prompt 2) — assigned + unassigned

---

## 17. DESIGN SYSTEM

```
Font:        Plus Jakarta Sans
Primary:     #2563EB (Royal Blue)
Dark:        #1E3A5F (Navy)
Page bg:     #F0F2F5
Cards:       white bg, 0.5px border #E5E7EB, 12px border-radius, shadow-sm
Section bg:  #F8F9FB

Stage colors:
  assigned/imported:  #94A3B8 (slate)
  permit:             #F59E0B (amber)
  akses:              #3B82F6 (blue)
  implementasi:       #8B5CF6 (purple)
  ATP/BAST:           #0EA5E9 (cyan, dashed border = commercial phase)
  selesai:            #10B981 (green)
  issue/hold:         #EF4444 (red)
  rescoping/survey:   #0891B2 (teal)

Project type colors:
  blacksite: #DC2626 (red)
  combat:    #EA580C (orange)
  filter:    #16A34A (green)
  l2h:       #2563EB (blue)
  rescoping: #0891B2 (cyan)
```

---

## 18. EXCEL DATA COLUMN MAPPING REFERENCE

### ReEngineering Progress → work_orders:
```
Excel Column              → DB Field
SITE_ID                   → site_id
SITE-SECTOR (FINAL)       → site_sector_key (e.g. 'CLG020-2')
SECTOR                    → sector
PROJECT TYPE              → project_type ('FILTERING' → 'filter')
NE_ID                     → ne_id
SITE_NAME                 → site_name
REGION                    → region
TP NAME                   → tp_name
IOMS REGISTERED           → ioms_registered (bool)
PERMIT STATUS             → permit_status (human-readable) + derived stage
IMPLEMENTASI STATUS       → impl_status (human-readable)
STATUS ATP                → atp_status
TEAM                      → team_name (leader's personal name)
NOTE IMPLEMENTASI         → note_impl
NOTE FOTO EVIDENCE        → note_atp
PPID                      → ppid
SOW ID                    → sow_id
PO ID                     → po_number
TIKET NUMBER              → atp_number (e.g. 'ATP000000282692')
PRIO CAPEX FINAL          → batch (e.g. 'Batch#2')
PRIO                      → priority (e.g. 'P3')
LATITUDE                  → latitude
LONGITUDE                 → longitude
FILE DATE                 → file_date
SEND PERMIT FORMAT        → IGNORE (TEXTJOIN formula, unparseable)
```

### INVENTORY REPORT → material_transactions:
```
Type                      → material_type
IN / OUT                  → direction
Quantity                  → quantity
Material Description      → material_name
Dilivery Date             → delivery_date (note: typo in Excel)
Dilivery Note No          → delivery_note_no
Purchecs Order Dilivery Date → po_delivery
Vendor Pengirim           → vendor
Sender                    → sender
Reciver                   → receiver (note: typo in Excel)
```
