import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { workOrders as initialWorkOrders, type WorkOrder, teams } from '../data/mockData';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Eye, UserPlus, FileSpreadsheet, Trash2, ArrowRight, Bell, CheckCircle, Download } from 'lucide-react';
import clsx from 'clsx';
import AddWorkOrderModal from '../components/modals/AddWorkOrderModal';
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

const WorkOrders = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Guard route
  useRoleAccess(['management', 'backoffice_admin', 'team_leader']);

  // State
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all';

  const [woList, setWoList] = useState<WorkOrder[]>(initialWorkOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // RBAC for Input WO button
  const canInputWO = ['management', 'backoffice_admin'].includes(currentUser.role);
  
  // RBAC for Data View
  const visibleWOs = useMemo(() => {
     if (['management', 'backoffice_admin', 'finance'].includes(currentUser.role)) {
         return woList;
     }
     if (currentUser.role === 'team_leader' || currentUser.role === 'engineer') {
         // Show only WOs assigned to their teams
         const userTeams = teams.filter(t => t.members.some(m => m.personId === currentUser.id));
         const teamIds = userTeams.map(t => t.id);
         return woList.filter(wo => wo.assignedTeamId && teamIds.includes(wo.assignedTeamId));
     }
     return [];
  }, [currentUser, woList]);

  // Tabs filtering
  const filteredWOs = useMemo(() => {
      return visibleWOs.filter(wo => {
          const matchesSearch = 
            wo.woNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wo.pemberiKerja.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wo.lokasi.toLowerCase().includes(searchTerm.toLowerCase());
          
          let matchesTab = true;
          switch (activeTab) {
              case 'unassigned': matchesTab = wo.status === 'Unassigned'; break;
              case 'assigned': matchesTab = wo.status === 'Assigned'; break;
              case 'pengajuan': matchesTab = wo.status === 'Pending SPK Approval'; break;
              case 'spk-active': matchesTab = ['SPK Created', 'Active'].includes(wo.status); break;
              case 'implementasi': matchesTab = wo.status === 'Implementasi'; break;
              case 'bast': matchesTab = wo.status === 'BAST'; break;
              case 'invoice': matchesTab = wo.status === 'Invoice'; break;
              case 'completed': matchesTab = wo.status === 'Completed'; break;
              case 'all':
              default: matchesTab = true; break;
          }
          
          return matchesSearch && matchesTab;
      });
  }, [visibleWOs, searchTerm, activeTab]);

  const handleTabChange = (tabId: string) => {
      setSearchParams({ tab: tabId });
      setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(filteredWOs.length / itemsPerPage);
  const paginatedWOs = filteredWOs.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const handleCreateWO = (newWO: WorkOrder) => {
      setWoList([newWO, ...woList]);
  };

  const getStatusBadgeColor = (status: WorkOrder['status']) => {
      switch(status) {
          case 'Unassigned': return 'bg-slate-100 text-slate-600 border-slate-200';
          case 'Assigned': return 'bg-blue-50 text-blue-700 border-blue-200';
          case 'Pending SPK Approval': return 'bg-amber-50 text-amber-700 border-amber-200';
          case 'SPK Created': return 'bg-purple-50 text-purple-700 border-purple-200';
          case 'Active': return 'bg-green-50 text-green-700 border-green-200';
          case 'Implementasi': return 'bg-orange-50 text-orange-700 border-orange-200';
          case 'BAST': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
          case 'Invoice': return 'bg-sky-50 text-sky-700 border-sky-200';
          case 'Completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
          default: return 'bg-slate-50 text-slate-600 border-slate-200';
      }
  };

  const getTeamName = (teamId?: string) => {
      if (!teamId) return <span className="text-slate-400 italic">No Team</span>;
      const team = teams.find(t => t.id === teamId);
      return team ? <span className="font-medium text-slate-700">{team.name}</span> : <span className="text-red-500">Unknown Team</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-xl font-bold text-slate-800">Work Orders</h1>
            <p className="text-slate-500 text-sm mt-1">Manage incoming work orders and track assignments.</p>
        </div>
        {canInputWO && (
            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm text-sm font-medium transition-colors"
            >
                <Plus className="w-4 h-4" />
                Input WO
            </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
          {[
              { id: 'all', label: 'All Work Orders' },
              { id: 'unassigned', label: 'Unassigned', badge: visibleWOs.filter(w => w.status === 'Unassigned').length },
              { id: 'assigned', label: 'Assigned' },
              { id: 'pengajuan', label: 'Pengajuan' },
              { id: 'spk-active', label: 'SPK Active' },
              { id: 'implementasi', label: 'Implementasi' },
              { id: 'bast', label: 'BAST' },
              { id: 'invoice', label: 'Invoice' },
              { id: 'completed', label: 'Completed' },
          ].map(tab => (
              <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={clsx(
                      "px-4 py-2.5 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
                      activeTab === tab.id 
                          ? "border-blue-600 text-blue-600 bg-blue-50/50" 
                          : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  )}
              >
                  {tab.label}
                  {tab.badge ? (
                      <span className={clsx(
                          "text-[10px] px-1.5 py-0.5 rounded-full text-white",
                          activeTab === tab.id ? "bg-blue-600" : "bg-amber-500"
                      )}>
                          {tab.badge}
                      </span>
                  ) : null}
              </button>
          ))}
      </div>

      <TableContainer>
          <FilterBar 
            searchValue={searchTerm}
            onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            searchPlaceholder="Cari WO Number, Mitra, Lokasi..."
            showDateRange={true}
          />

          <DataTable>
              <TableHeader>
                  <TableHead className="w-32">WO Number</TableHead>
                  <TableHead sortable>Tanggal WO</TableHead>
                  <TableHead>Pemberi Kerja</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Scope of Work</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead sortable>Target Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableHeader>
              <TableBody>
                  {paginatedWOs.length === 0 ? (
                      <tr>
                        <td colSpan={10}>
                            <EmptyState 
                                message={searchTerm ? "WO tidak ditemukan" : `Belum ada Work Order di tab ${activeTab.replace('-', ' ')}`}
                                subMessage={searchTerm ? "Coba reset filter atau gunakan kata kunci lain." : "Data WO baru akan muncul di sini."}
                                onReset={() => { setSearchTerm(''); }}
                            />
                        </td>
                      </tr>
                  ) : (
                      paginatedWOs.map((wo) => {
                          return (
                              <TableRow key={wo.id}>
                                  <TableCell className="font-mono text-sm font-bold text-slate-700">
                                      <Link to={`/work-orders/${wo.id}`} className="hover:text-blue-600 hover:underline">
                                          {wo.woNumber}
                                      </Link>
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-600">{wo.tanggalWo}</TableCell>
                                  <TableCell className="font-semibold text-slate-800">{wo.pemberiKerja}</TableCell>
                                  <TableCell>
                                      <span className={clsx(
                                          "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide",
                                          wo.tipe === 'FILTER' ? 'bg-purple-100 text-purple-700' :
                                          wo.tipe === 'COMBAT' ? 'bg-orange-100 text-orange-700' :
                                          wo.tipe === 'BLACKSITE' ? 'bg-red-100 text-red-700' :
                                          wo.tipe === 'L2H' ? 'bg-blue-100 text-blue-700' :
                                          'bg-green-100 text-green-700'
                                      )}>
                                          {wo.tipe}
                                      </span>
                                  </TableCell>
                                  <TableCell className="text-xs text-slate-500 max-w-[150px] truncate">
                                      <span title={wo.scopeOfWork}>{wo.scopeOfWork}</span>
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-600">{wo.lokasi}</TableCell>
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
                                          {/* View */}
                                          <button 
                                            onClick={() => navigate(`/work-orders/${wo.id}`)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="View Details"
                                          >
                                              <Eye className="w-4 h-4" />
                                          </button>
                                          
                                          {/* Tab-Specific Actions */}
                                          {activeTab === 'all' && canInputWO && wo.status === 'Unassigned' && (
                                              <button 
                                                onClick={() => navigate(`/work-orders/${wo.id}`)}
                                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                                                title="Assign Team"
                                              >
                                                <UserPlus className="w-4 h-4" />
                                              </button>
                                          )}

                                          {activeTab === 'all' && currentUser.role === 'management' && wo.status === 'Pending SPK Approval' && (
                                              <button 
                                                onClick={() => navigate(`/work-orders/${wo.id}`)}
                                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                                                title="Review & Create SPK"
                                              >
                                                  <FileSpreadsheet className="w-4 h-4" />
                                              </button>
                                          )}

                                          {activeTab === 'all' && currentUser.role === 'management' && (
                                              <button 
                                                onClick={() => {
                                                    if (window.confirm('Are you sure you want to delete this WO?')) {
                                                        setWoList(woList.filter(w => w.id !== wo.id));
                                                    }
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Delete"
                                              >
                                                  <Trash2 className="w-4 h-4" />
                                              </button>
                                          )}

                                          {/* Specific Tab Buttons */}
                                          {activeTab === 'unassigned' && canInputWO && (
                                              <button 
                                                onClick={() => navigate(`/work-orders/${wo.id}`)}
                                                className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold ml-2 transition-colors"
                                              >
                                                Assign Team <ArrowRight className="w-3 h-3" />
                                              </button>
                                          )}

                                          {activeTab === 'assigned' && ['management', 'backoffice_admin'].includes(currentUser.role) && (
                                              <button 
                                                className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded text-xs font-semibold ml-2 transition-colors"
                                              >
                                                Remind TL <Bell className="w-3 h-3" />
                                              </button>
                                          )}

                                          {activeTab === 'assigned' && currentUser.role === 'team_leader' && (
                                              <button 
                                                onClick={() => navigate(`/work-orders/${wo.id}`)}
                                                className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-semibold ml-2 transition-colors"
                                              >
                                                Submit Pengajuan <ArrowRight className="w-3 h-3" />
                                              </button>
                                          )}

                                          {activeTab === 'pengajuan' && ['management', 'backoffice_admin'].includes(currentUser.role) && (
                                              <button 
                                                onClick={() => navigate(`/work-orders/${wo.id}`)}
                                                className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded text-xs font-semibold ml-2 transition-colors"
                                              >
                                                Review & Approve <CheckCircle className="w-3 h-3" />
                                              </button>
                                          )}

                                          {activeTab === 'spk-active' && (
                                              <>
                                                <button 
                                                  onClick={() => navigate(`/sites/${wo.id}`)} 
                                                  className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-xs font-semibold ml-2 transition-colors"
                                                >
                                                  Go to Site
                                                </button>
                                                <button 
                                                  className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-xs font-semibold ml-1 transition-colors"
                                                >
                                                  <Download className="w-3 h-3" /> SPK
                                                </button>
                                              </>
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
            totalItems={filteredWOs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
      </TableContainer>

      <AddWorkOrderModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateWO}
      />
    </div>
  );
};

export default WorkOrders;
