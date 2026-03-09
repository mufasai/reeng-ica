import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { type SiteMaster, teams, workOrders } from '../../data/mockData';
import { useState, useMemo } from 'react';
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
  
  // RBAC Filter: Which sites can I see?
  const visibleSites = useMemo(() => {
      return sites.filter(site => {
        if (currentUser.role === 'management' || currentUser.role === 'finance' || currentUser.role === 'backoffice_admin') return true;
        if (!site.work_order_id) return false;
        
        // Check if user is in the team assigned to this site
        const wo = workOrders.find(w => w.id === site.work_order_id);
        if (!wo || !wo.assignedTeamId) return false;

        const team = teams.find(t => t.id === wo.assignedTeamId);
        return team?.members.some(m => m.personId === currentUser.id);
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
               <TableHead>Last Updated</TableHead>
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
                       
                       return (
                       <TableRow key={site.id}>
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
                           <TableCell className="text-xs text-[var(--text-secondary)]">
                                {site.stage_updated_at ? new Date(site.stage_updated_at).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year:'numeric'}) : '—'}
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
                   )})
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
