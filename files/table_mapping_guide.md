# SurrealDB Table Mapping Guide

This guide documents the data flow, table structure, and column mappings between the React frontend components and the SurrealDB backend database for the ReEngineering Budget Tracking Tool.

---

## 🗄️ Database Architecture Overview

The application utilizes a single unified table named `sites` inside SurrealDB to store both site master records and active/historical ATP work orders. 

Upon application startup, `src/initDB.ts` performs a single, authoritative `SELECT * FROM sites` query. The records are sorted to prioritize active, progressed, and recently updated records. These records are then mapped to populate:
1. `atpWorkOrders`: Represents active site-sector work orders with operational milestones.
2. `siteMasterRecords`: Represents general site physical and administrative identity.

---

## 🗺️ Component-to-Database Mapping

The table below outlines which frontend pages and components perform database queries, the user action triggering them, and the target SurrealDB table and column mapping.

| Frontend Page / Component | User Action | SurrealDB Table | Target Column / Schema Field | Description |
| :--- | :--- | :--- | :--- | :--- |
| **SiteDetail.tsx** / **Sites.tsx** | Initiate ATP / Assign Project | `sites` | *Creates a new record* | Generates a new active record with a unique random ID (e.g. `sites:nanoid`) and default `status = "active"`. |
| **AtpWorkPage.tsx** | Fill / Edit ATP Number | `sites` | `atp_number` | Stores the main ticket number. |
| **AtpWorkPage.tsx** | Update Project Stage | `sites` | `stage` | Milestones: `'imported'`, `'permit'`, `'implementasi'`, `'atp'`, `'bast'`, `'invoice'`, `'completed'`. |
| **AtpWorkPage.tsx** | Update Permit Status | `sites` | `permit_status` | Status values: `'1. Planning'`, `'2. Waiting TO'`, `'4. Tpass'`, `'5. Permit Released'`, etc. |
| **AtpWorkPage.tsx** | Fill / Edit PDID | `sites` | `ppid` (mapped from `pdid`) | Stores the unique PPID/PDID code. |
| **AtpWorkPage.tsx** | Update Status ATP | `sites` | `status_atp` (mapped from `atp_status`) | ATP statuses: `'REQUEST PDID'`, `'UPLOAD TAGGING DONE'`, etc. |
| **AtpWorkPage.tsx** | Note Foto Evidence | `sites` | `note_foto_evidence` | Text notes for ATP documentation evidence. |
| **CombatImplChecklist.tsx** | Update substeps progress | `sites` | `combat_impl_steps` | Object containing progress booleans and file metadata for COMBAT implementation substeps. |
| **RescopingSurveyTab.tsx** | Update Rescoping Survey | `sites` | `survey_date`, `survey_result`, `survey_nok_reason` | Stores survey date, result status (`'ok'`/`'nok'`), and reason for non-compliance. |
| **RescopingErfinTab.tsx** | Complete Erfin Step | `sites` | `erfin_number`, `erfin_date`, `erfin_ready_date`, `erfin_note` | Stores administrative ERFIN numbers, dates, and related notes. |
| **InitiationModal.tsx** | Start ATP on active conflict | `sites` | `status` | Updates the status of the older conflicting work order to `"historical"`. |

---

## 🔒 Query Best Practices (Avoid Parser Silent Failures)

When executing `UPDATE` queries on specific RecordIDs (e.g., `sites:bbkwt9b9oso4fwwxztd8`) in SurrealDB, **never wrap the RecordID in backticks** inside the query string. Doing so causes SurrealDB to treat the entire string as a single identifier (a table name), causing silent write failures.

### ❌ Incorrect Pattern
```typescript
await db.query(`UPDATE \`${record.id}\` MERGE $data`, { data });
```

###  Correct Pattern (Parameterized `$id`)
```typescript
await db.query('UPDATE $id MERGE $data', { id: record.id, data });
```
Passing the RecordID string directly as a parameterized `$id` variable is fully secure, ignores colons and hyphens, and is natively resolved by the SurrealDB server.
