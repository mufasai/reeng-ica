import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { type Site, teams } from '../../data/mockData';
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

interface ProjectSitesTableProps {
  sites: Site[];
  onEdit: (site: Site) => void;
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
        if (currentUser.role === 'management' || currentUser.role === 'finance') return true;
        if (!site.teamId) return false;
        
        // Check if user is in the team assigned to this site
        const team = teams.find(t => t.id === site.teamId);
        return team?.members.some(m => m.personId === currentUser.id);
      });
  }, [sites, currentUser]);

  // Search Filter
  const filteredSites = useMemo(() => {
      return visibleSites.filter(site => 
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        site.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [visibleSites, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredSites.length / itemsPerPage);
  const paginatedSites = filteredSites.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );



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
               <TableHead className="w-16">ID</TableHead>
               <TableHead sortable>Site Name</TableHead>
               <TableHead>Job Name</TableHead>
               <TableHead>Location</TableHead>
               <TableHead>Schedule</TableHead>
               <TableHead>Max Budget</TableHead>
               <TableHead className="text-right">Actions</TableHead>
           </TableHeader>
           <TableBody>
               {paginatedSites.length === 0 ? (
                   <tr>
                       <td colSpan={7}>
                           <EmptyState 
                               message={searchTerm ? "Tidak ada site ditemukan" : "Belum ada site"}
                               subMessage={searchTerm ? "Coba kata kunci lain." : "Site belum ditambahkan ke project ini."} 
                               onReset={() => setSearchTerm('')}
                           />
                       </td>
                   </tr>
               ) : (
                   paginatedSites.map(site => (
                       <TableRow key={site.id}>
                           <TableCell className="font-mono text-xs text-[var(--text-muted)]">{site.id}</TableCell>
                           <TableCell>
                               <Link to={`/sites/${site.id}`} className="font-medium text-[var(--blue-400)] hover:underline">
                                   {site.name}
                               </Link>
                           </TableCell>
                           <TableCell className="text-[var(--text-primary)]">{site.jobName || '-'}</TableCell>
                           <TableCell className="text-[var(--text-primary)]">{site.location}</TableCell>
                           <TableCell className="text-xs text-[var(--text-secondary)]">
                                {site.startDate ? (
                                    <div className="flex flex-col">
                                        <span>{site.startDate}</span>
                                        <span className="text-[var(--text-muted)]">to {site.endDate}</span>
                                    </div>
                                ) : '-'}
                           </TableCell>
                           <TableCell className="font-medium text-[var(--text-primary)]">
                                Rp {site.budget.toLocaleString('id-ID')}
                           </TableCell>
                           <TableCell className="text-right">
                               <div className="flex justify-end items-center gap-2">
                                   {/* Role Specific Buttons */}
                                   {currentUser.role === 'engineer' && (
                                       <ActionButton type="upload" label="Evidence" onClick={() => console.log('Upload Evidence')} />
                                   )}
                                   {currentUser.role === 'team_leader' && (
                                       <ActionButton type="approve" label="Submit" onClick={() => console.log('Submit')} />
                                   )}
                                   {currentUser.role === 'finance' && (
                                       <ActionButton type="view" label="Proof" onClick={() => console.log('Check Proof')} />
                                   )}

                                   {/* Standard Actions */}
                                   <ActionButton type="view" onClick={() => navigate(`/sites/${site.id}`)} />
                                   
                                   {can('edit_project') && (
                                       <>
                                           <ActionButton type="edit" onClick={() => onEdit(site)} />
                                           <ActionButton type="delete" onClick={() => onDelete(site.id)} />
                                       </>
                                   )}
                               </div>
                           </TableCell>
                       </TableRow>
                   ))
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
