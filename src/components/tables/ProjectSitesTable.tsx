import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { type SiteMaster, teams, workOrders, filterTerms, combatTerms, siteStageLogs, USERS, teamMembersRecords } from '../../data/mockData';
import { ChevronDown, ChevronUp } from 'lucide-react';
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

interface ProjectSitesTableProps {
  sites: SiteMaster[];
  onEdit: (site: SiteMaster) => void;
  onDelete: (id: string) => void;
}

const ProjectSitesTable = ({ sites, onEdit, onDelete }: ProjectSitesTableProps) => {
  const { currentUser, can } = useAuth();
  const navigate = useNavigate();

  // Local State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  
  const toggleRow = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedRowId(prev => prev === id ? null : id);
  };
  
  const formatRelativeDate = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(d);
    target.setHours(0,0,0,0);
    
    const diffTime = today.getTime() - target.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
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
      return visibleSites.filter(site => 
        site.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.site_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [visibleSites, searchTerm]);

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
    <TableContainer>
       <FilterBar 
            searchValue={searchTerm}
            onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            searchPlaceholder="Cari site..."
            // No status filter for sites in mock data currently, but could add later
            onExport={(type) => console.log('Exporting sites', type)}
       />

       <DataTable>
           <TableHeader>
               <TableHead className="w-16">SITE_ID</TableHead>
               <TableHead sortable>Site Name</TableHead>
               <TableHead>Sector</TableHead>
               <TableHead>Cluster</TableHead>
               <TableHead>Region</TableHead>
               <TableHead>Team</TableHead>
               <TableHead>Stage</TableHead>
               <TableHead className="w-[80px]">Termin</TableHead>
               <TableHead>Last Updated</TableHead>
               <TableHead className="w-10"> </TableHead>
               <TableHead className="text-right">Actions</TableHead>
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
                       const stageProps = getStageProps(site.stage);
                       
                       const updateInfo = getLatestUpdate(site);
                       const isStale = updateInfo.daysInStage > 14;
                       const isExpanded = expandedRowId === site.id;
                       
                       // Derived Expandable Data
                       const eData = site.extra_data || {};
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
                       
                       return (
                        <React.Fragment key={site.id}>
                           <TableRow className={clsx(isStale ? "bg-amber-50/30" : "", isExpanded ? "border-b-0" : "")}>
                               <TableCell className="font-mono font-bold text-slate-800">{site.site_id}</TableCell>
                               <TableCell>
                                   <Link to={`/sites/${site.site_id}`} className="font-medium text-[var(--blue-400)] hover:underline">
                                       <div className="max-w-[150px] truncate" title={site.site_name}>
                                           {site.site_name}
                                       </div>
                                   </Link>
                               </TableCell>
                               <TableCell className="text-[var(--text-primary)]">{site.sector || '—'}</TableCell>
                               <TableCell className="text-[var(--text-primary)]">{site.cluster || '—'}</TableCell>
                               <TableCell>
                                   <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200" title={site.region}>
                                       {regionAbbr}
                                   </span>
                               </TableCell>
                               <TableCell>
                                   {team ? (
                                       <span className="text-sm text-slate-700 font-medium">{team.name}</span>
                                   ) : (
                                       <span className="text-amber-600 text-sm font-medium flex items-center gap-1">Belum ditugaskan</span>
                                   )}
                               </TableCell>
                               <TableCell>
                                   <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border whitespace-nowrap", stageProps.color)}>
                                       {stageProps.label}
                                   </span>
                               </TableCell>
                               <TableCell>
                                   {renderTerminDots(site)}
                               </TableCell>
                               {/* 
                                 // TODO: activate hover tooltip if team requests it
                                 <TableCell className="text-xs text-[var(--text-secondary)]" title={`Di stage ini sejak ${updateInfo.daysInStage} hari lalu`}>
                               */}
                               <TableCell className="text-xs font-medium text-slate-600">
                                    {updateInfo.text}
                               </TableCell>
                               <TableCell className="px-0 w-10 text-center">
                                   <button 
                                      onClick={(e) => toggleRow(site.id, e)}
                                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded md:block hidden transition-colors"
                                      title={isExpanded ? "Collapse Details" : "Expand Details"}
                                   >
                                       {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                   </button>
                               </TableCell>
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
                           </TableRow>
                           {isExpanded && (
                               <tr className="bg-[#F8FAFC]">
                                   <td colSpan={11} className="p-0 border-b border-slate-200">
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
                                                               team ? (USERS.find(u => u.id === teamMembersRecords.find(tm => tm.team_id === team.id && tm.is_field_leader)?.person_id)?.name || '—') : '—'
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
  );
};

export default ProjectSitesTable;
