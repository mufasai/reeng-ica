import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { workOrders as initialWorkOrders, type WorkOrder, teams } from '../data/mockData';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, FileText } from 'lucide-react';
import clsx from 'clsx';
import { 
    TableContainer, 
    FilterBar, 
    DataTable, 
    TableHeader, 
    TableHead, 
    TableBody, 
    TableRow, 
    TableCell, 
    Pagination, 
    EmptyState 
} from '../components/common/Table';

const SpkList = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Filter WO to only those that have an SPK
  const spkWorkOrders = useMemo(() => {
    return initialWorkOrders.filter(wo => 
        ['SPK Created', 'Active', 'Completed'].includes(wo.status)
    );
  }, []);

  // RBAC for Data View
  const visibleSPKs = useMemo(() => {
     if (['management', 'admin', 'backoffice_admin', 'finance'].includes(currentUser.role)) {
         return spkWorkOrders;
     }
     if (currentUser.role === 'team_leader' || currentUser.role === 'engineer') {
         // Show only SPKs assigned to their teams
         const userTeams = teams.filter(t => t.members.some(m => m.personId === currentUser.id));
         const teamIds = userTeams.map(t => t.id);
         return spkWorkOrders.filter(wo => wo.assignedTeamId && teamIds.includes(wo.assignedTeamId));
     }
     return [];
  }, [currentUser, spkWorkOrders]);

  // Filters
  const filteredSPKs = useMemo(() => {
      return visibleSPKs.filter(wo => {
          const spkNumber = `SPK-${wo.woNumber.replace('WO-', '')}`;
          const matchesSearch = 
            spkNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wo.woNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wo.pemberiKerja.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wo.lokasi.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesStatus = statusFilter ? wo.status === statusFilter : true;
          return matchesSearch && matchesStatus;
      });
  }, [visibleSPKs, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSPKs.length / itemsPerPage);
  const paginatedSPKs = filteredSPKs.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const getStatusBadgeColor = (status: WorkOrder['status']) => {
      switch(status) {
          case 'SPK Created': return 'bg-purple-100 text-purple-700 border-purple-200';
          case 'Active': return 'bg-blue-100 text-blue-700 border-blue-200';
          case 'Completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
          default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
  };

  const getTeamName = (teamId?: string) => {
      if (!teamId) return <span className="text-slate-400 italic">Unassigned</span>;
      const team = teams.find(t => t.id === teamId);
      return team ? <span className="font-medium text-slate-700">{team.name}</span> : <span className="text-red-500">Unknown Team</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Surat Perintah Kerja (SPK)</h1>
            <p className="text-slate-500 text-sm mt-1">Daftar SPK yang telah diterbitkan dari Work Order.</p>
        </div>
      </div>

      <TableContainer>
          <FilterBar 
            searchValue={searchTerm}
            onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            searchPlaceholder="Cari SPK Number, WO Number, Mitra..."
            statusOptions={[
                { label: 'SPK Created', value: 'SPK Created' },
                { label: 'Active', value: 'Active' },
                { label: 'Completed', value: 'Completed' },
            ]}
            statusValue={statusFilter}
            onStatusChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
            showDateRange={true}
          />

          <DataTable>
              <TableHeader>
                  <TableHead className="w-32">SPK Number</TableHead>
                  <TableHead>WO Ref</TableHead>
                  <TableHead sortable>Tanggal SPK</TableHead>
                  <TableHead>Pemberi Kerja</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead sortable>Target Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tim Pelaksana</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableHeader>
              <TableBody>
                  {paginatedSPKs.length === 0 ? (
                      <tr>
                        <td colSpan={10}>
                            <EmptyState 
                                message={searchTerm || statusFilter ? "SPK tidak ditemukan" : "Belum ada SPK"}
                                subMessage={searchTerm || statusFilter ? "Coba reset filter atau gunakan kata kunci lain." : "SPK akan muncul di sini setelah disetujui dari Work Order."}
                                onReset={() => { setSearchTerm(''); setStatusFilter(''); }}
                            />
                        </td>
                      </tr>
                  ) : (
                      paginatedSPKs.map((wo) => {
                          const spkNumber = `SPK-${wo.woNumber.replace('WO-', '')}`;
                          return (
                              <TableRow key={wo.id}>
                                  <TableCell className="font-mono text-sm font-bold text-blue-600">
                                      {spkNumber}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-slate-500 hover:text-blue-600">
                                      <Link to={`/work-orders/${wo.id}`} className="hover:underline">
                                          {wo.woNumber}
                                      </Link>
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-600">{wo.tanggalWo}</TableCell>
                                  <TableCell className="font-semibold text-slate-800">{wo.pemberiKerja}</TableCell>
                                  <TableCell>
                                      <span className={clsx(
                                          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide",
                                          wo.tipe === 'FILTER' ? 'bg-emerald-100 text-emerald-700' :
                                          wo.tipe === 'COMBAT' ? 'bg-amber-100 text-amber-700' :
                                          wo.tipe === 'BLACKSITE' ? 'bg-red-100 text-red-700' :
                                          wo.tipe === 'L2H' ? 'bg-blue-100 text-blue-700' :
                                          'bg-purple-100 text-purple-700'
                                      )}>
                                          {wo.tipe}
                                      </span>
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-600 break-words">{wo.lokasi}</TableCell>
                                  <TableCell className="text-sm text-slate-600">{wo.targetDate}</TableCell>
                                  <TableCell>
                                      <span className={clsx(
                                          "inline-flex px-2 py-1 rounded text-xs font-medium border whitespace-nowrap",
                                          getStatusBadgeColor(wo.status)
                                      )}>
                                          {wo.status}
                                      </span>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                      {getTeamName(wo.assignedTeamId)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1">
                                          {/* View WO */}
                                          <button 
                                            onClick={() => navigate(`/work-orders/${wo.id}`)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="View Work Order"
                                          >
                                              <FileText className="w-4 h-4" />
                                          </button>
                                          
                                          {/* View Project / Sites */}
                                          {wo.projectId && (
                                              <button 
                                                onClick={() => navigate(`/projects/${wo.projectId}/dashboard`)}
                                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                                title="View Project Dashboard"
                                              >
                                                  <Eye className="w-4 h-4" />
                                              </button>
                                          )}
                                      </div>
                                  </TableCell>
                              </TableRow>
                          );
                      })
                  )}
              </TableBody>
          </DataTable>

          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredSPKs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
      </TableContainer>
    </div>
  );
};

export default SpkList;
