// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCellSave } from '../../hooks/useCellSave';
import { countCombatDone, COMBAT_IMPL_STEPS } from '../../config/stagePipelines';
import { InlineSectorEdit, InlineTeamEdit, InlineStageEdit, InlineSelectEdit } from '../common/InlineEditCells';
import { type SiteMaster, teams, workOrders, filterTerms, combatTerms, siteStageLogs, USERS, teamMembersRecords, people, atpWorkOrders, atpTasks } from '../../data/mockData';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { 
    TableContainer, 
    FilterBar, 
    DataTable, 
    TableHeader, 
    TableHead, 
    TableBody, 
    TableRow, 
    TableCell, 
    ActionButton, 
    Pagination, 
    EmptyState 
} from '../common/Table';
import clsx from 'clsx';
import { useTableColumns } from '../../hooks/useTableColumns';
import TableColumnToggle from '../common/TableColumnToggle';
import { useTabContext } from '../../context/TabContext';

interface ProjectSitesTableProps {
  sites: SiteMaster[];
  onEdit: (site: SiteMaster) => void;
  onDelete: (id: string) => void;
}

const ProjectSitesTable = ({ sites,  }: ProjectSitesTableProps) => {
  const { currentUser } = useAuth();
  const { saveField } = useCellSave();
  // const navigate = useNavigate();
  const { openTab } = useTabContext();

  // Local State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const canBulkAction = ['operational', 'admin'].includes(currentUser?.role ?? '');
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>, visibleSiteIds: string[]) => {
      if (e.target.checked) {
          setSelectedSiteIds(new Set(visibleSiteIds));
      } else {
          setSelectedSiteIds(new Set());
      }
  };

  const handleSelectRow = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const next = new Set(selectedSiteIds);
      if (e.target.checked) next.add(id);
      else next.delete(id);
      setSelectedSiteIds(next);
  };

  // Column visibility
  const { visibilityMap, handleVisibilityChange, resetToDefault, col, currentCols } = useTableColumns(currentUser?.id ?? 'guest');
  
  const toggleRow = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedRowId(prev => prev === id ? null : id);
  };
  
  const formatRelativeDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).replace('.', ':');
  };
  
  const getLatestUpdate = (site: SiteMaster) => {
    const logs = siteStageLogs.filter(l => l.site_master_id === site.id || l.site_master_id === site.site_id);
    let latest = site.stage_updated_at ? new Date(site.stage_updated_at).getTime() : 0;
    
    logs.forEach(l => {
        const logTime = new Date(l.created_at).getTime();
        if (logTime > latest) latest = logTime;
    });

    if (latest === 0) return { text: '—', daysInStage: 0 };
    
    const latestDateStr = new Date(latest).toISOString();
    
    // Days in Stage
    const currentStageEntry = logs.find(l => l.to_stage === site.stage);
    let daysInStage = 0;
    if (currentStageEntry) {
       daysInStage = Math.floor((new Date().getTime() - new Date(currentStageEntry.created_at).getTime()) / (1000 * 3600 * 24));
    } else if (site.stage_updated_at) {
       daysInStage = Math.floor((new Date().getTime() - new Date(site.stage_updated_at).getTime()) / (1000 * 3600 * 24));
    }

    return { 
        text: formatRelativeDate(latestDateStr), 
        daysInStage 
    };
  };
  
  // RBAC Filter: Which sites can I see?
  const visibleSites = useMemo(() => {
      return sites.filter(site => {
        if (currentUser?.role !== 'field') return true;
        if (!site.work_order_id) return false;
        
        // Check if user is in the team assigned to this site
        const wo = workOrders.find(w => w.id === site.work_order_id);
        if (!wo || !wo.assignedTeamId) return false;

        const isMember = teamMembersRecords.some(tm => tm.team_id === wo.assignedTeamId && tm.person_id === currentUser?.id);
        return isMember;
      });
  }, [sites, currentUser]);

  // Search Filter
  const filteredSites = useMemo(() => {
      let result = visibleSites.filter(site => {
        const lowerSearch = searchTerm.toLowerCase();
        const siteMatch = site.site_name.toLowerCase().includes(lowerSearch) ||
                         site.site_id.toLowerCase().includes(lowerSearch);
        
        // Search ATP numbers
        const wos = atpWorkOrders.filter(w => w.site_id === site.site_id);
        const atpMatch = wos.some(w => w.atp_number?.toLowerCase().includes(lowerSearch));
        
        return siteMatch || atpMatch;
      });

      // Sorting logic
      if (sortConfig) {
          result = [...result].sort((a, b) => {
              let aValue: any = (a as any)[sortConfig.key];
              let bValue: any = (b as any)[sortConfig.key];

              // Handle derived fields
              if (sortConfig.key === 'atp_number') {
                  const aWo = atpWorkOrders.filter(w => w.site_id === a.site_id).sort((x,y) => new Date(y.initiated_at).getTime() - new Date(x.initiated_at).getTime())[0];
                  const bWo = atpWorkOrders.filter(w => w.site_id === b.site_id).sort((x,y) => new Date(y.initiated_at).getTime() - new Date(x.initiated_at).getTime())[0];
                  aValue = aWo?.atp_number || '';
                  bValue = bWo?.atp_number || '';
              } else if (sortConfig.key === 'days') {
                  aValue = a.stage_updated_at ? new Date(a.stage_updated_at).getTime() : 0;
                  bValue = b.stage_updated_at ? new Date(b.stage_updated_at).getTime() : 0;
              }

              if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
              if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }

      return result;
  }, [visibleSites, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredSites.length / itemsPerPage);
  const paginatedSites = filteredSites.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const getStageProps = (stage: string) => {
        switch (stage) {
            case 'imported': return { color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Imported' };
            case 'assigned': return { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Assigned' };
            case 'survey': return { color: 'bg-cyan-100 text-cyan-700 border-cyan-200', label: 'Survey' };
            case 'survey_nok': return { color: 'bg-red-100 text-red-700 border-red-300 shadow-[0_0_8px_rgba(239,68,68,0.4)]', label: 'Survey NOK' };
            case 'erfin_process': return { color: 'bg-teal-100 text-teal-700 border-teal-200', label: 'ERFIN Process' };
            case 'erfin_ready': return { color: 'bg-teal-100 text-teal-700 border-teal-200', label: 'ERFIN Ready' };
            case 'permit_process': return { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Permit' };
            case 'permit_ready': return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Permit Ready' };
            case 'akses_process': return { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Akses' };
            case 'akses_ready': return { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Akses Ready' };
            case 'implementasi': return { color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200', label: 'Implementasi' };
            case 'rfi_done': return { color: 'bg-teal-100 text-teal-700 border-teal-200', label: 'RFI Done' };
            case 'rfs_done': return { color: 'bg-teal-100 text-teal-700 border-teal-200', label: 'RFS Done' };
            case 'dokumen_done': return { color: 'bg-teal-100 text-teal-700 border-teal-200', label: 'Docs Done' };
            case 'bast': return { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'BAST' };
            case 'invoice': return { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Invoice' };
            case 'completed': return { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: '✓ Selesai' };
            default: return { color: 'bg-slate-100 text-slate-700 border-slate-200', label: stage || '-' };
        }
  };

  const renderTerminDots = (site: SiteMaster) => {
      const isFilter = site.project_type === 'FILTER';
      const terms = isFilter ? filterTerms.filter(t => t.siteId === site.id) : combatTerms.filter(t => t.siteId === site.id);
      
      const stageOrder = ['imported', 'assigned', 'permit_process', 'permit_ready', 'akses_process', 'akses_ready', 'implementasi', 'bast', 'invoice', 'completed'];
      const stageIndex = stageOrder.indexOf(site.stage || 'imported');
      
      if (terms.length === 0 || stageIndex < 3) {
          return (
              <div className="flex items-center gap-1 text-slate-300 font-bold" title="Belum ada data termin">
                  <span>—</span><span className="text-[10px]">·</span>
                  <span>—</span><span className="text-[10px]">·</span>
                  <span>—</span><span className="text-[10px]">·</span>
                  <span>—</span>
              </div>
          );
      }

      const renderDot = (step: number) => {
          let term;
          let title = `T${step}: `;
          
          if (isFilter) {
              term = terms.find(t => t.step === step);
              if (!term) return { char: '🔒', color: 'text-slate-400', title: title + 'Terkunci' };
              
              const pct = step === 1 ? '30%' : (step === 2 ? '50%' : '10%');
              title = `T${step} (${pct}): `;
              
              if (term.status === 'paid' || term.status === 'dibayarkan' || term.status === 'approved' || term.status === 'diterima') return { char: '✓', color: 'text-emerald-500 font-bold', title: title + 'Dibayarkan/Approved' };
              if (term.status === 'pengajuan' || term.status === 'pending_review' || term.status === 'submitted') return { char: '●', color: 'text-blue-500', title: title + 'Menunggu approval' };
              if (term.status === 'open' || term.status === 'rejected') return { char: '⚡', color: 'text-amber-500 font-bold', title: title + 'Siap diajukan' };
              return { char: '●', color: 'text-blue-400', title: title + 'In Progress' };
          } else {
              term = step === 4 ? terms.find(t => t.step >= 4) : terms.find(t => t.step === step);
              if (!term) return { char: '🔒', color: 'text-slate-400', title: title + 'Terkunci' };
              
              if (term.status === 'completed') return { char: '✓', color: 'text-emerald-500 font-bold', title: title + 'Selesai' };
              if (term.status === 'in_progress') {
                  const hasPending = term.subSteps.some((s:any) => s.status === 'pengajuan' || s.status === 'pending_review');
                  if (hasPending) return { char: '●', color: 'text-blue-500', title: title + 'Menunggu approval' };
                  return { char: '⚡', color: 'text-amber-500 font-bold', title: title + 'Siap diajukan' };
              }
              return { char: '●', color: 'text-blue-400', title: title + 'In Progress' };
          }
      };

      const d1 = renderDot(1);
      const d2 = renderDot(2);
      const d3 = renderDot(3);
      const d4 = renderDot(4);

      const fullTitle = `${d1.title}\n${d2.title}\n${d3.title}\n${d4.title}`;

      return (
          <div className="flex items-center gap-1 cursor-help w-[80px]" title={fullTitle}>
              <span className={clsx("w-2.5 h-2.5 flex items-center justify-center text-[10px] leading-none", d1.color)}>{d1.char}</span>
              <span className="text-slate-300 text-[10px]">·</span>
              <span className={clsx("w-2.5 h-2.5 flex items-center justify-center text-[10px] leading-none", d2.color)}>{d2.char}</span>
              <span className="text-slate-300 text-[10px]">·</span>
              <span className={clsx("w-2.5 h-2.5 flex items-center justify-center text-[10px] leading-none", d3.color)}>{d3.char}</span>
              <span className="text-slate-300 text-[10px]">·</span>
              <span className={clsx("w-2.5 h-2.5 flex items-center justify-center text-[10px] leading-none", d4.color)}>{d4.char}</span>
          </div>
      );
  };

  return (
    <>
    <TableContainer>
       <FilterBar 
            searchValue={searchTerm}
            onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            searchPlaceholder="Cari site..."
            onExport={(type) => console.log('Exporting sites', type)}
            extraActions={<TableColumnToggle visibilityMap={visibilityMap} onChange={handleVisibilityChange} onReset={resetToDefault} currentCols={currentCols} />}
       />

       <DataTable>
           <TableHeader>
               {canBulkAction && (
                   <TableHead className="w-10">
                       <input 
                           type="checkbox" 
                           className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                           checked={paginatedSites.length > 0 && selectedSiteIds.size === paginatedSites.length}
                           onChange={(e) => handleSelectAll(e, paginatedSites.map(s => s.id))}
                       />
                   </TableHead>
               )}
                {col('no') && <TableHead>No</TableHead>}
                {col('project_type') && <TableHead>Project Type</TableHead>}
                {col('site_id') && <TableHead sortable onSort={() => handleSort('site_id')} sortDirection={sortConfig?.key === 'site_id' ? sortConfig.direction : undefined}>Site ID</TableHead>}
                {col('site_moving_status') && <TableHead>Site Moving Status</TableHead>}
                {col('final_site_id') && <TableHead>Final Site ID</TableHead>}
                {col('site_sector_final') && <TableHead>Site Sector Final</TableHead>}
                {col('sector') && <TableHead>Sector</TableHead>}
                {col('filter_per_sector') && <TableHead>Filter Per Sector</TableHead>}
                {col('region') && <TableHead sortable onSort={() => handleSort('region')} sortDirection={sortConfig?.key === 'region' ? sortConfig.direction : undefined}>Region</TableHead>}
                {col('ne_id') && <TableHead>NE ID</TableHead>}
                {col('site_name') && <TableHead sortable onSort={() => handleSort('site_name')} sortDirection={sortConfig?.key === 'site_name' ? sortConfig.direction : undefined}>Site Name</TableHead>}
                {col('tp_name') && <TableHead sortable onSort={() => handleSort('tp_name')} sortDirection={sortConfig?.key === 'tp_name' ? sortConfig.direction : undefined}>TP Name</TableHead>}
                {col('ioms_registered') && <TableHead>IOMS Registered</TableHead>}
                {col('permit_status') && <TableHead>Permit Status</TableHead>}
                {col('issue_problem') && <TableHead>Issue Problem</TableHead>}
                {col('note_problem') && <TableHead>Note Problem</TableHead>}
                {col('send_permit_format') && <TableHead>Send Permit Format</TableHead>}
                {col('implementasi_status') && <TableHead>Implementasi Status</TableHead>}
                {col('tanggal_rfs') && <TableHead>Tanggal RFS</TableHead>}
                {col('team') && <TableHead>Team</TableHead>}
                {col('team_onsite_status') && <TableHead>Team Onsite Status</TableHead>}
                {col('issue_implementasi') && <TableHead>Issue Implementasi</TableHead>}
                {col('note_implementasi') && <TableHead>Note Implementasi</TableHead>}
                {col('status_atp') && <TableHead>Status ATP</TableHead>}
                {col('note_foto_evidence') && <TableHead>Note Foto Evidence</TableHead>}
                {col('ppid') && <TableHead>PPID</TableHead>}
                {col('sow_id') && <TableHead>SOW ID</TableHead>}
                {col('po_id') && <TableHead>PO ID</TableHead>}
                {col('tiket_number') && <TableHead>Tiket Number</TableHead>}
                {col('prio_capex_final') && <TableHead>Prio Capex Final</TableHead>}
                {col('new_status_implementation') && <TableHead>New Status Implementation</TableHead>}
                {col('prio') && <TableHead sortable onSort={() => handleSort('priority')} sortDirection={sortConfig?.key === 'priority' ? sortConfig.direction : undefined}>Prio</TableHead>}
                {col('latitude') && <TableHead>Latitude</TableHead>}
                {col('longitude') && <TableHead>Longitude</TableHead>}
                {col('file_date') && <TableHead>File Date</TableHead>}
                {col('actions') && <TableHead className="text-right">Actions</TableHead>}
           </TableHeader>
           <TableBody>
               {paginatedSites.length === 0 ? (
                   <tr>
                       <td colSpan={9}>
                           <EmptyState 
                               message={searchTerm ? "Tidak ada site ditemukan" : "Belum ada site"}
                               subMessage={searchTerm ? "Coba kata kunci lain." : "Site belum ditambahkan ke project ini."} 
                               onReset={() => setSearchTerm('')}
                           />
                       </td>
                   </tr>
               ) : (
                   paginatedSites.map((site, index) => {
                       const wo = site.work_order_id ? workOrders.find(w => w.id === site.work_order_id) : null;
                       const team = wo && wo.assignedTeamId ? teams.find(t => t.id === wo.assignedTeamId) : null;
                       const regionAbbr = site.region.split(' ')[0] || site.region;
                       
                       const updateInfo = getLatestUpdate(site);
                       const isStale = updateInfo.daysInStage > 14;
                       const isExpanded = expandedRowId === site.id;
                       
                       // Derived Expandable Data
                       const eData = site.raw_data || {};
                       const renderBool = (val: boolean | null | undefined) => {
                           if (val === true) return <span className="text-emerald-500 font-bold">✓</span>;
                           if (val === false) return <span className="text-red-500 font-bold">✗</span>;
                           return <span className="text-slate-400">—</span>;
                       };

                       const permitDaysLeft = eData.permit_expiry_date 
                           ? Math.floor((new Date(eData.permit_expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                           : null;
                           
                       let expiryColor = 'text-slate-700';
                       if (permitDaysLeft !== null) {
                           if (permitDaysLeft < 0) expiryColor = 'text-red-600 font-bold';
                           else if (permitDaysLeft <= 14) expiryColor = 'text-amber-600 font-bold';
                       }
                       
                       const isSurveyNok = site.stage === 'survey_nok';

                       const activeWo = atpWorkOrders.find(w => w.site_id === site.site_id && w.status === 'active') || atpWorkOrders.find(w => w.site_id === site.site_id);

                       return (
                        <React.Fragment key={site.id}>
                           <TableRow className={clsx(
                               isSurveyNok ? "bg-red-50/20 border-l-[3px] border-l-red-500" : (isStale ? "bg-amber-50/30" : ""), 
                               isExpanded ? "border-b-0" : ""
                           )}>
                               {canBulkAction && (
                                   <TableCell onClick={e => e.stopPropagation()} className="w-10">
                                       <input 
                                           type="checkbox" 
                                           className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                           checked={selectedSiteIds.has(site.id)}
                                           onChange={e => handleSelectRow(site.id, e)}
                                       />
                                   </TableCell>
                               )}
                               {col('no') && <TableCell className="text-center font-bold text-slate-500">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>}
                               {col('project_type') && <TableCell className="text-xs uppercase tracking-wider font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{site.project_type}</TableCell>}
                               {col('site_id') && (
                                   <TableCell className="font-mono font-bold text-slate-800">
                                       <Link to={`/sites/${site.site_id}`} className="hover:underline hover:text-blue-600 transition-colors">
                                           {site.site_id}
                                       </Link>
                                   </TableCell>
                               )}
                               {col('site_moving_status') && <TableCell className="text-xs text-slate-600">{site.project_type === 'RESCOPING' && site.is_relokasi ? 'Relokasi' : 'Fix'}</TableCell>}
                               {col('final_site_id') && <TableCell className="font-mono text-xs">{site.site_id}</TableCell>}
                               {col('site_sector_final') && <TableCell className="font-mono text-xs">{site.site_id}-S{site.sector || 1}</TableCell>}
                               {col('sector') && <TableCell><InlineSectorEdit value={site.sector || ''} onSave={(val) => saveField(site.site_id, 'site', 'sector', val)} /></TableCell>}
                               {col('filter_per_sector') && <TableCell className="text-xs text-center">{1}</TableCell>}
                               {col('region') && (
                                   <TableCell>
                                       <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200" title={site.region}>
                                           {regionAbbr}
                                       </span>
                                   </TableCell>
                               )}
                               {col('ne_id') && <TableCell className="font-mono text-[10px] text-slate-600">{site.ne_id || '—'}</TableCell>}
                               {col('site_name') && (
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <Link to={`/sites/${site.site_id}`} className="font-semibold text-[var(--blue-400)] hover:underline break-all leading-tight">
                                                {site.site_name}
                                            </Link>
                                            {site.project_type === 'RESCOPING' && site.is_relokasi && (
                                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold rounded uppercase whitespace-nowrap">Relokasi</span>
                                            )}
                                          </div>
                                        </div>
                                    </TableCell>
                               )}
                               {col('tp_name') && <TableCell className="text-slate-600 text-xs truncate max-w-[100px]">{site.tower_provider || site.raw_data?.['TP NAME'] || '—'}</TableCell>}
                               {col('ioms_registered') && (
                                    <TableCell>
                                        {site.ioms_registered ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                Registered
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap border border-red-100">
                                                Not Registered
                                            </span>
                                        )}
                                    </TableCell>
                               )}
                               {col('permit_status') && (
                                   <TableCell>
                                       {activeWo ? (
                                           <div className="flex items-center gap-2">
                                               <div className={clsx(
                                                   "w-1.5 h-1.5 rounded-full shrink-0",
                                                   (activeWo.permit_status?.includes('5') || activeWo.permit_status?.includes('7')) ? "bg-emerald-500" :
                                                   (activeWo.permit_status?.includes('1') || activeWo.permit_status?.includes('3')) ? "bg-amber-500" :
                                                   activeWo.permit_status?.includes('9') ? "bg-red-500" : "bg-slate-300"
                                               )} />
                                               <InlineSelectEdit 
                                                   value={activeWo.permit_status || ''} 
                                                   onSave={(val) => saveField(activeWo.id, 'workOrder', 'permit_status', val)}
                                                   options={[
                                                       {label: '1.Planning', value: '1.Planning'},
                                                       {label: '3.Submission', value: '3.Submission'},
                                                       {label: '5.Permit Released', value: '5.Permit Released'},
                                                       {label: '7.Final Doc', value: '7.Final Doc'},
                                                       {label: '9.Cancelled', value: '9.Cancelled'}
                                                   ]}
                                                   placeholder="Status"
                                               />
                                           </div>
                                       ) : <span className="text-slate-300">—</span>}
                                   </TableCell>
                               )}
                               {col('issue_problem') && <TableCell className="text-xs text-slate-600 truncate max-w-[120px]">{activeWo?.issue_problem || '1. NO ISSUE'}</TableCell>}
                               {col('note_problem') && <TableCell className="text-xs text-slate-600 truncate max-w-[120px]">{activeWo?.note_problem || ''}</TableCell>}
                               {col('send_permit_format') && <TableCell className="text-xs text-slate-600">{''}</TableCell>}
                               {col('implementasi_status') && (
                                   <TableCell>
                                       {(() => {
                                           const status = activeWo?.impl_status || (site.stage === 'rfs_done' ? 'RFS' : site.stage === 'implementasi' ? 'Awaiting' : null);
                                           if (!status) return <span className="text-slate-300">—</span>;
                                           const color = status === 'RFS' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                                         (status === 'Awaiting' || status === 'On Going') ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                                         status === 'Cancelled' ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-500 bg-slate-50';
                                           return (
                                               <span className={clsx("px-2 py-0.5 rounded text-[10px] font-bold border", color)}>
                                                   {status}
                                               </span>
                                           );
                                       })()}
                                   </TableCell>
                               )}
                               {col('tanggal_rfs') && <TableCell className="text-xs tabular-nums text-slate-600">{activeWo?.tanggal_rfs || ''}</TableCell>}
                               {col('team') && (
                                   <TableCell>
                                       <InlineTeamEdit
                                            value={(site as any).team_assigned || team?.name || ''} 
                                            onSave={(val) => saveField(site.site_id, 'site', 'team_assigned', val)}
                                            options={teams.map(t => ({ label: t.name, value: t.name }))}
                                       />
                                   </TableCell>
                               )}
                               {col('team_onsite_status') && <TableCell className="text-xs text-slate-600">{''}</TableCell>}
                               {col('issue_implementasi') && <TableCell className="text-xs text-slate-600 truncate max-w-[120px]">{activeWo?.issue_implementasi || ''}</TableCell>}
                               {col('note_implementasi') && <TableCell className="text-xs text-slate-600 truncate max-w-[120px]">{activeWo?.note_implementasi || ''}</TableCell>}
                               {col('status_atp') && (
                                    <TableCell>
                                        {(() => {
                                            const wo = atpWorkOrders.find(w => w.site_id === site.site_id);
                                            const task = atpTasks.find((t: any) => t.site_id === site.site_id);
                                            const status = wo?.status_atp || (task ? task.tagging_status.toUpperCase() : (site.raw_data?.['STATUS ATP'] || null));
                                            if (!status) return <span className="text-slate-300">—</span>;
                                            
                                            const s = status.toUpperCase();
                                            const color = s.includes('DONE') ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                                                          s.includes('PDID') ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                                          s.includes('HOLD') ? 'text-red-600 bg-red-50 border-red-100' :
                                                          'text-slate-500 bg-slate-50 border-slate-100';
                                            
                                            return (
                                                <span className={clsx("px-2 py-0.5 rounded text-[9px] font-black border tracking-tight", color)}>
                                                    {s}
                                                </span>
                                            );
                                        })()}
                                    </TableCell>
                                )}
                               {col('note_foto_evidence') && <TableCell className="text-xs text-slate-600 truncate max-w-[150px]">{activeWo?.note_foto_evidence || ''}</TableCell>}
                               {col('ppid') && <TableCell className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{activeWo?.ppid || ''}</TableCell>}
                               {col('sow_id') && <TableCell className="text-slate-600 text-[10px] truncate max-w-[80px] font-mono">{activeWo?.sow_id || '—'}</TableCell>}
                               {col('po_id') && <TableCell className="text-slate-600 text-[10px] font-mono">{activeWo?.po_number || '—'}</TableCell>}
                               {col('tiket_number') && (
                                   <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {atpWorkOrders.filter(w => w.site_id === site.site_id).sort((a,b) => new Date(b.initiated_at).getTime() - new Date(a.initiated_at).getTime()).map((wo, i) => (
                                                <div key={wo.id} className="flex items-center gap-1.5 min-w-0">
                                                    <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', wo.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
                                                    {wo.atp_number ? (
                                                        <button
                                                            onClick={() => {
                                                                openTab({
                                                                    id: `atp-${wo.id}`,
                                                                    label: `ATP${wo.atp_number ? wo.atp_number.slice(-6) : ''}`,
                                                                    path: `/atp/${wo.id}`,
                                                                    icon: '📋',
                                                                    closeable: true
                                                                });
                                                            }}
                                                            className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors truncate max-w-[140px] text-left"
                                                            title={`Buka detail ${wo.atp_number}`}
                                                        >
                                                            {wo.atp_number}
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-xs">Belum ada ATP</span>
                                                    )}
                                                    {i === 0 && wo.status === 'active' && (
                                                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded uppercase tracking-tight shrink-0">aktif</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                   </TableCell>
                               )}
                               {col('prio_capex_final') && <TableCell className="text-xs font-semibold text-slate-700">{activeWo?.prio_capex_final || site.batch_ref || ''}</TableCell>}
                               {col('new_status_implementation') && <TableCell className="text-[10px] text-slate-600 truncate max-w-[150px]">{activeWo?.new_status_implementation || ''}</TableCell>}
                               {col('prio') && (
                                    <TableCell>
                                      {site.priority === 'P1' && <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-red-100 text-red-700 font-bold text-[11px]">P1</span>}
                                      {site.priority === 'P2' && <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-100 text-amber-700 font-bold text-[11px]">P2</span>}
                                      {site.priority === 'P3' && <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">P3</span>}
                                      {!['P1','P2','P3'].includes(site.priority as string) && <span className="text-slate-300">—</span>}
                                    </TableCell>
                               )}
                               {col('latitude') && <TableCell className="text-[10px] font-mono text-slate-500">{site.latitude || '—'}</TableCell>}
                               {col('longitude') && <TableCell className="text-[10px] font-mono text-slate-500">{site.longitude || '—'}</TableCell>}
                               {col('file_date') && <TableCell className="text-xs tabular-nums text-slate-600">{site.imported_at ? new Date(site.imported_at).toISOString().split('T')[0] : '—'}</TableCell>}
                               {col('actions') && (
                                    <TableCell className="text-right">
                                    <div className="flex justify-end items-center gap-2">
                                        <button 
                                           onClick={(e) => toggleRow(site.id, e)}
                                           className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded md:block hidden transition-colors shrink-0"
                                           title={isExpanded ? "Collapse Details" : "Expand Details"}
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                        {activeWo ? (
                                            <button
                                                onClick={() => {
                                                    openTab({
                                                        id: `atp-${activeWo.id}`,
                                                        label: `ATP${activeWo.atp_number ? activeWo.atp_number.slice(-6) : activeWo.id.slice(-6)}`,
                                                        path: `/atp/${activeWo.id}`,
                                                        icon: '📋',
                                                        closeable: true
                                                    });
                                                }}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors whitespace-nowrap"
                                            >
                                                Buka ATP
                                            </button>
                                        ) : (
                                            <Link
                                                to={`/sites/${site.site_id}`}
                                                className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors whitespace-nowrap"
                                            >
                                                Detail
                                            </Link>
                                        )}
                                    </div>
                                    </TableCell>
                                )}
                           </TableRow>
                           {isExpanded && (
                               <tr className="bg-[#F8FAFC]">
                                   <td colSpan={100} className="p-0 border-b border-slate-200">
                                       <div className="flex w-full overflow-hidden animate-in slide-in-from-top-2 duration-200">
                                           {/* Colored left border indicating stage */}
                                           <div className={clsx("w-[3px] shrink-0", getStageProps(site.stage).color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500'))} />
                                           
                                           <div className="flex-1 p-4 px-6">
                                               <div className="grid grid-cols-4 gap-6 text-sm">
                                                   {/* PERMIT COLUMN */}
                                                   <div className="space-y-2">
                                                       <h4 className="font-bold text-slate-700 text-xs tracking-wider flex items-center gap-1.5 mb-3 border-b border-slate-200 pb-1">
                                                           📋 PERMIT
                                                       </h4>
                                                       <div className="grid grid-cols-[60px_1fr] gap-x-2 gap-y-1 text-xs">
                                                           <span className="text-slate-500">Create:</span> 
                                                           <span className="text-slate-700 font-medium">{eData.permit_start_date ? new Date(eData.permit_start_date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'}) : '—'}</span>
                                                           
                                                           <span className="text-slate-500">TPAS:</span> 
                                                           <span>{renderBool(eData.tpas_status)}</span>
                                                           
                                                           <span className="text-slate-500">TP:</span> 
                                                           <span>{renderBool(eData.tp_status)}</span>
                                                           
                                                           <span className="text-slate-500">CAF:</span> 
                                                           <span>{renderBool(eData.caf_status)}</span>
                                                           
                                                           <span className="text-slate-500 mt-2 pt-2 border-t border-slate-200">Mulai:</span> 
                                                           <span className="text-slate-700 mt-2 pt-2 border-t border-slate-200">{eData.permit_start_date ? new Date(eData.permit_start_date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'}) : '—'}</span>
                                                           
                                                           <span className="text-slate-500">Expiry:</span> 
                                                           <span className={clsx("font-medium", expiryColor)}>{eData.permit_expiry_date ? new Date(eData.permit_expiry_date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'}) : '—'}</span>
                                                       </div>
                                                   </div>
                                                   
                                                   {/* AKSES COLUMN */}
                                                   <div className="space-y-2">
                                                       <h4 className="font-bold text-slate-700 text-xs tracking-wider flex items-center gap-1.5 mb-3 border-b border-slate-200 pb-1">
                                                           🔑 AKSES
                                                       </h4>
                                                       <div className="grid grid-cols-[60px_1fr] gap-x-2 gap-y-1 text-xs">
                                                           <span className="text-slate-500">Provider:</span> 
                                                           <span className="text-slate-700 font-medium truncate" title={eData.akses_provider}>{eData.akses_provider || '—'}</span>
                                                           
                                                           <span className="text-slate-500">Kunci:</span> 
                                                           <span className="text-slate-700 truncate" title={eData.akses_kunci}>{eData.akses_kunci || '—'}</span>
                                                           
                                                           <span className="text-slate-500 mt-2 pt-2 border-t border-slate-200">PIC:</span> 
                                                           <span className="text-slate-700 mt-2 pt-2 border-t border-slate-200 truncate">{eData.akses_pic || '—'}</span>
                                                           
                                                           <span className="text-slate-500">Telp:</span> 
                                                           <span className="text-slate-700">{eData.akses_telp || '—'}</span>
                                                       </div>
                                                   </div>
                                                   
                                                   {/* IMPLEMENTASI COLUMN */}
                                                   <div className="space-y-2">
                                                       <h4 className="font-bold text-slate-700 text-xs tracking-wider flex items-center gap-1.5 mb-3 border-b border-slate-200 pb-1">
                                                           🔧 IMPLEMENTASI
                                                       </h4>
                                                       <div className="grid grid-cols-[45px_1fr] gap-x-2 gap-y-1 text-xs">
                                                           <span className="text-slate-500">Plan:</span> 
                                                           <span className="text-slate-700">{eData.impl_plan ? new Date(eData.impl_plan).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'}) : '—'}</span>
                                                           
                                                           <span className="text-slate-500">Aktual:</span> 
                                                           <span className="text-slate-700 font-medium">{eData.impl_aktual ? new Date(eData.impl_aktual).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'}) : '—'}</span>
                                                           
                                                           <span className="text-slate-500 mt-2 pt-2 border-t border-slate-200">CI/CO:</span> 
                                                           <span className="text-slate-700 mt-2 pt-2 border-t border-slate-200 text-[11px]">
                                                               {eData.impl_ci || '—'}  /  {eData.impl_co || '—'}
                                                           </span>
                                                           
                                                           <span className="text-slate-500">RFI:</span> 
                                                           <span className="flex items-center gap-2">{renderBool(eData.impl_rfi)} <span className="text-slate-500 ml-2">RFS:</span> {renderBool(eData.impl_rfs)}</span>
                                                           
                                                           <span className="text-slate-500">Dok:</span> 
                                                           <span>{renderBool(eData.impl_dok)}</span>
                                                       </div>
                                                   </div>
                                                   
                                                   {/* INFO COLUMN */}
                                                   <div className="space-y-2 relative">
                                                       <h4 className="font-bold text-slate-700 text-xs tracking-wider flex items-center gap-1.5 mb-3 border-b border-slate-200 pb-1">
                                                           ℹ INFO
                                                       </h4>
                                                       <div className="grid grid-cols-[50px_1fr] gap-x-2 gap-y-1 text-xs">
                                                           <span className="text-slate-500">Tim:</span> 
                                                           <span className="text-slate-700 font-medium">{team ? team.name : '—'}</span>
                                                           
                                                           <span className="text-slate-500">Leader:</span> 
                                                           <span className="text-slate-700">{
                                                               team ? (USERS.find(u => u.id === teamMembersRecords.find(tm => tm.team_id === team.id && tm.role === 'Team Leader')?.person_id)?.name || '—') : '—'
                                                           }</span>
                                                           
                                                           <span className="text-slate-500 mt-2 pt-2 border-t border-slate-200">ATP No:</span> 
                                                           <span className="text-slate-700 mt-2 pt-2 border-t border-slate-200 font-mono">{activeWo?.atp_number || '—'}</span>

                                                           <span className="text-slate-500">Note ATP:</span> 
                                                           <span className="text-slate-700 italic">{activeWo?.note_problem || '—'}</span>

                                                           <span className="text-slate-500 mt-2 pt-2 border-t border-slate-200">PO:</span> 
                                                           <span className="text-slate-700 mt-2 pt-2 border-t border-slate-200 font-mono">{site.po_tsel || '—'}</span>
                                                           
                                                           <span className="text-slate-500">Region:</span> 
                                                           <span className="text-slate-700">{site.region || '—'}</span>
                                                       </div>
                                                       
                                                       <div className="absolute bottom-0 right-0">
                                                           <Link to={`/sites/${site.site_id}`} className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-md transition-colors border border-blue-100 shadow-sm">
                                                               Lihat Detail Penuh <ChevronDown className="w-3 h-3 -rotate-90" />
                                                           </Link>
                                                       </div>
                                                   </div>
                                               </div>
                                           </div>
                                       </div>
                                   </td>
                               </tr>
                           )}
                        </React.Fragment>
                       )
                   })
               )}
           </TableBody>
       </DataTable>

       <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredSites.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
       />
    </TableContainer>

    {selectedSiteIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-2xl border border-slate-200 px-4 py-2 flex items-center gap-4 z-[100] animate-in slide-in-from-bottom-10">
            <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">{selectedSiteIds.size} sites dipilih</span>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                <button className="text-sm font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors">Assign Tim</button>
                <button className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm transition-colors">Update Stage</button>
                <button className="text-sm font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5" onClick={() => setSelectedSiteIds(new Set())}>✕ Batal</button>
            </div>
        </div>
    )}
    </>
  );
};

export default ProjectSitesTable;
