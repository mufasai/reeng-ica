import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCellSave } from '../../hooks/useCellSave';
import { InlineSectorEdit, InlineTeamEdit, InlineStageEdit, InlineTextEdit, InlineSelectEdit } from '../common/InlineEditCells';
import { type SiteMaster, teams, workOrders, filterTerms, combatTerms, siteStageLogs, USERS, teamMembersRecords, people, atpWorkOrders } from '../../data/mockData';
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

interface ProjectSitesTableProps {
  sites: SiteMaster[];
  onEdit: (site: SiteMaster) => void;
  onDelete: (id: string) => void;
}

const ProjectSitesTable = ({ sites, onEdit, onDelete }: ProjectSitesTableProps) => {
  const { currentUser, can } = useAuth();
  const { saveField } = useCellSave();
  const navigate = useNavigate();

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

  const canBulkAction = ['operational', 'admin'].includes(currentUser.role);
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
  const { visibilityMap, handleVisibilityChange, resetToDefault, col, currentCols } = useTableColumns(currentUser.id);
  
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
        if (currentUser.role !== 'field') return true;
        if (!site.work_order_id) return false;
        
        // Check if user is in the team assigned to this site
        const wo = workOrders.find(w => w.id === site.work_order_id);
        if (!wo || !wo.assignedTeamId) return false;

        const isMember = teamMembersRecords.some(tm => tm.team_id === wo.assignedTeamId && tm.person_id === currentUser.id);
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
               {col('site_id') && <TableHead className="w-16" sortable onSort={() => handleSort('site_id')} sortDirection={sortConfig?.key === 'site_id' ? sortConfig.direction : undefined}>SITE_ID</TableHead>}
               {col('site_name') && <TableHead sortable onSort={() => handleSort('site_name')} sortDirection={sortConfig?.key === 'site_name' ? sortConfig.direction : undefined}>Site Name</TableHead>}
               {col('atp_number') && <TableHead sortable onSort={() => handleSort('atp_number')} sortDirection={sortConfig?.key === 'atp_number' ? sortConfig.direction : undefined}>ATP Number</TableHead>}
               {col('sector') && <TableHead sortable onSort={() => handleSort('sector')} sortDirection={sortConfig?.key === 'sector' ? sortConfig.direction : undefined}>Sektor</TableHead>}
               {col('region') && <TableHead sortable onSort={() => handleSort('region')} sortDirection={sortConfig?.key === 'region' ? sortConfig.direction : undefined}>Region</TableHead>}
               {col('tp_name') && <TableHead sortable onSort={() => handleSort('tp_name')} sortDirection={sortConfig?.key === 'tp_name' ? sortConfig.direction : undefined}>TP</TableHead>}
               {col('permit_status') && <TableHead>Permit Status</TableHead>}
               {col('impl_status') && <TableHead>Impl Status</TableHead>}
               {col('atp_status') && <TableHead>ATP Status</TableHead>}
               {col('team') && <TableHead>Team</TableHead>}
               {col('stage') && <TableHead sortable onSort={() => handleSort('stage')} sortDirection={sortConfig?.key === 'stage' ? sortConfig.direction : undefined}>Stage</TableHead>}
               {col('days') && <TableHead sortable onSort={() => handleSort('days')} sortDirection={sortConfig?.key === 'days' ? sortConfig.direction : undefined}>Last Updated</TableHead>}
               {col('termin') && <TableHead className="w-[80px]">Termin</TableHead>}
               
               {/* Optional Cols */}
               {col('type') && <TableHead>Type</TableHead>}
               {col('cluster') && <TableHead>Cluster</TableHead>}
               {col('po_tsel') && <TableHead>PO Tsel</TableHead>}
               {col('po_number') && <TableHead>PO Number</TableHead>}
               {col('priority') && <TableHead>Priority</TableHead>}
               {col('batch') && <TableHead>Batch</TableHead>}
               {col('lat_long') && <TableHead>Lat/Long</TableHead>}
               {col('ioms') && <TableHead>IOMS</TableHead>}
               {col('sow_id') && <TableHead>SOW ID</TableHead>}
               {col('field_leader') && <TableHead>Field Leader</TableHead>}
               {col('permit_expiry') && <TableHead>Permit Expiry</TableHead>}
               
               {col('actions') && <TableHead className="w-10"> </TableHead>}
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
                   paginatedSites.map(site => {
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
                               {col('site_id') && <TableCell className="font-mono font-bold text-slate-800">{site.site_id}</TableCell>}
                               {col('site_name') && (
                                   <TableCell>
                                       <Link to={`/sites/${site.site_id}`} className="font-medium text-[var(--blue-400)] hover:underline">
                                           <div className="max-w-[150px] truncate" title={site.site_name}>
                                               {site.site_name}
                                           </div>
                                       </Link>
                                   </TableCell>
                               )}
                               {col('atp_number') && (
                                   <TableCell>
                                       <div className="flex items-center gap-1.5">
                                           {(() => {
                                               const wos = atpWorkOrders.filter(w => w.site_id === site.site_id).sort((a,b) => new Date(b.initiated_at).getTime() - new Date(a.initiated_at).getTime());
                                               if (wos.length === 0) return <span className="text-slate-300">—</span>;
                                               const primaryWo = wos[0];
                                               return (
                                                   <>
                                                       <InlineTextEdit 
                                                           value={primaryWo.atp_number || ''} 
                                                           onSave={(val) => saveField(primaryWo.id, 'workOrder', 'atp_number', val)}
                                                           placeholder="Set ATP..."
                                                           className="font-mono text-xs"
                                                       />
                                                       {wos.length > 1 && (
                                                           <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold border border-slate-200" title={`${wos.length} total work orders`}>
                                                               +{wos.length - 1}
                                                           </span>
                                                       )}
                                                   </>
                                               );
                                           })()}
                                       </div>
                                   </TableCell>
                               )}
                               {col('sector') && <TableCell><InlineSectorEdit value={site.sector || ''} onSave={(val) => saveField(site.site_id, 'site', 'sector', val)} /></TableCell>}
                               {col('region') && (
                                   <TableCell>
                                       <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200" title={site.region}>
                                           {regionAbbr}
                                       </span>
                                   </TableCell>
                               )}
                               {col('tp_name') && <TableCell className="text-slate-600 text-xs truncate max-w-[100px]">{site.tower_provider || site.raw_data?.['TP NAME'] || '—'}</TableCell>}
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
                                                   className="text-xs"
                                               />
                                           </div>
                                       ) : <span className="text-slate-300">—</span>}
                                   </TableCell>
                               )}
                               {col('impl_status') && (
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
                               {col('atp_status') && (
                                    <TableCell>
                                        {(() => {
                                            const task = atpTasks.find(t => t.site_id === site.site_id);
                                            const status = task ? task.tagging_status.toUpperCase() : (site.raw_data?.['STATUS ATP'] || null);
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
                               {col('team') && (
                                   <TableCell>
                                       <InlineTeamEdit 
                                            value={(site as any).team_assigned || team?.name || ''} 
                                            onSave={(val) => saveField(site.site_id, 'site', 'team_assigned', val)}
                                            options={teams.map(t => ({ label: t.name, value: t.name }))}
                                            className="text-xs"
                                       />
                                   </TableCell>
                               )}
                               {col('stage') && (
                                   <TableCell>
                                        <InlineStageEdit 
                                            value={site.stage as string} 
                                            siteId={site.site_id}
                                            onSave={(val) => saveField(site.site_id, 'site', 'stage', val)} 
                                        />
                                   </TableCell>
                               )}
                               {col('days') && (
                                   <TableCell className="text-xs font-medium text-slate-600 tabular-nums">
                                        {updateInfo.text}
                                   </TableCell>
                               )}
                               {col('termin') && (
                                   <TableCell>
                                       {renderTerminDots(site)}
                                   </TableCell>
                               )}
                               
                               {col('type') && <TableCell><span className="text-xs uppercase tracking-wider font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{site.project_type}</span></TableCell>}
                               {col('cluster') && <TableCell className="text-[var(--text-primary)] text-xs">{site.cluster || '—'}</TableCell>}
                               {col('po_tsel') && <TableCell className="text-slate-600 text-[10px] font-mono">{site.po_tsel || '—'}</TableCell>}
                               {col('po_number') && <TableCell className="text-slate-600 text-[10px] font-mono">{activeWo?.po_number || '—'}</TableCell>}
                               {col('priority') && <TableCell className="text-slate-600 text-xs">{site.raw_data?.['PRIO CAPEX FINAL'] || site.raw_data?.['PRIO'] || '—'}</TableCell>}
                               {col('batch') && <TableCell className="text-slate-600 text-[10px] truncate max-w-[80px]">{site.batch_ref || site.import_source || '—'}</TableCell>}
                               {col('lat_long') && <TableCell className="text-slate-500 text-[9px] font-mono">{(site.latitude && site.longitude) ? `${site.latitude.toFixed(4)}, ${site.longitude.toFixed(4)}` : '—'}</TableCell>}
                               {col('ioms') && <TableCell className="text-center">{site.ineom_registered ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</TableCell>}
                               {col('sow_id') && <TableCell className="text-slate-600 text-[10px] truncate max-w-[80px] font-mono">{activeWo?.sow_id || '—'}</TableCell>}
                               {col('field_leader') && <TableCell className="text-slate-600 text-xs">{(() => { 
                                   const flId = activeWo?.field_leader_id || site.field_leader_id;
                                   const fl = people.find(p => p.id === flId); 
                                   return fl ? fl.name : '—'; 
                               })()}</TableCell>}
                               {col('permit_expiry') && <TableCell className="text-slate-600 text-xs tabular-nums">{site.raw_data?.permit_expiry_date ? new Date(site.raw_data.permit_expiry_date).toLocaleDateString('id-ID') : '—'}</TableCell>}

                               {col('actions') && (
                                   <TableCell className="px-0 w-10 text-center">
                                       <button 
                                          onClick={(e) => toggleRow(site.id, e)}
                                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded md:block hidden transition-colors"
                                          title={isExpanded ? "Collapse Details" : "Expand Details"}
                                       >
                                           {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                       </button>
                                   </TableCell>
                               )}
                               {col('actions') && (
                                   <TableCell className="text-right">
                                   <div className="flex justify-end items-center gap-2">
                                       {/* Standard Actions */}
                                       <ActionButton type="view" onClick={() => navigate(`/sites/${site.site_id}`)} />
                                       
                                       {can('edit_project') && (
                                           <>
                                               <ActionButton type="edit" onClick={() => onEdit(site)} />
                                               <ActionButton type="delete" onClick={() => onDelete(site.id)} />
                                           </>
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
                                           <div className={clsx("w-[3px] shrink-0", stageProps.color.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500'))} />
                                           
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
