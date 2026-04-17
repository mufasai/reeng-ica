import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
    teams as initialTeams, people as allPeople, teamMembersRecords,
    type Team, type TeamMember, type Person 
} from '../data/mockData';
import { 
    Plus, Search, User, X, Users, FileSpreadsheet
} from 'lucide-react';
import TeamPeopleImportModal from '../components/modals/TeamPeopleImportModal';
import { Tooltip } from '../components/common/Tooltip';
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
    ActionButton,
    Pagination,
    EmptyState
} from '../components/common/Table';

// --- ADD/EDIT MODAL ---
interface TeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: Team | null;
    onSave: (team: Team) => void;
}

const TeamModal = ({ isOpen, onClose, team, onSave }: TeamModalProps) => {
    const [formData, setFormData] = useState<Partial<Team>>(
        team || { name: '', status_aktif: true, members: [] }
    );
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const teamSpecificMembers = useMemo(() => {
        return teamMembersRecords.filter(tm => tm.team_id === team?.id);
    }, [team?.id]);

    const availablePeople = allPeople.filter(p => !teamSpecificMembers.some(m => m.person_id === p.id));
    const filteredAvailable = availablePeople.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const addMember = (person: Person) => {
        const newMember: TeamMember = {
            id: `tm_${Date.now()}`,
            team_id: team?.id || `t_temp`,
            person_id: person.id,
            jabatan: 'Engineer',
            is_field_leader: false,
            joined_date: new Date().toISOString().split('T')[0]
        };
        setFormData({ ...formData, members: [...(formData.members || []), newMember] });
    };

    const removeMember = (personId: string) => {
        setFormData({ ...formData, members: formData.members?.filter(m => m.person_id !== personId) });
    };

    const updateMemberRole = (personId: string, role: string) => {
        setFormData({
            ...formData,
            members: formData.members?.map(m => m.person_id === personId ? { 
                ...m, 
                jabatan: role === 'team_leader' ? 'Leader' : 'Engineer',
                is_field_leader: role === 'team_leader' 
            } : m)
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: team?.id || `t_${Date.now()}`,
            project_type: formData.project_type || 'FILTER',
            status_aktif: formData.status_aktif !== undefined ? formData.status_aktif : true
        } as Team);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800">{team ? 'Edit Team' : 'Create New Team'}</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-500 hover:text-slate-800" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Team Name *</label>
                            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Installation Team A" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Status Aktif</label>
                            <select value={formData.status_aktif ? 'active' : 'inactive'} onChange={e => setFormData({...formData, status_aktif: e.target.value === 'active'})} className="w-full p-2 border rounded bg-white">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest border-b pb-2">Members</h3>
                        
                        {/* Member Selection */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                             <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    className="w-full pl-9 p-2 text-sm border rounded outline-none" 
                                    placeholder="Search people to add..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {filteredAvailable.map(p => (
                                    <div key={p.id} onClick={() => addMember(p)} className="flex items-center justify-between p-2 hover:bg-white rounded cursor-pointer text-sm text-slate-600 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">{p.name.charAt(0)}</div>
                                            <span>{p.name}</span>
                                        </div>
                                        <Plus className="w-4 h-4 text-slate-400" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Selected Members List */}
                        <div className="space-y-2">
                            {formData.members?.map(m => {
                                const person = allPeople.find(p => p.id === m.person_id);
                                if (!person) return null;
                                return (
                                    <div key={m.person_id} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                                        <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{person.name.charAt(0)}</div>
                                             <div>
                                                 <p className="text-sm font-medium text-slate-800">{person.name}</p>
                                                 <p className="text-xs text-slate-500">{person.phone}</p>
                                             </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <select 
                                                value={m.is_field_leader ? 'team_leader' : 'engineer'} 
                                                onChange={(e) => updateMemberRole(m.person_id, e.target.value)}
                                                className="text-xs border-none bg-slate-100 rounded px-2 py-1 outline-none cursor-pointer hover:bg-slate-200"
                                            >
                                                <option value="engineer">Engineer</option>
                                                <option value="team_leader">Team Leader</option>
                                            </select>
                                            <button type="button" onClick={() => removeMember(m.person_id)} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                );
                            })}
                            {(!formData.members || formData.members.length === 0) && (
                                <p className="text-center text-sm text-slate-400 py-4 italic">No members added yet.</p>
                            )}
                        </div>
                    </div>
                </form>

                 <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-10">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-sm">Save Team</button>
                </div>
            </div>
        </div>
    );
};

// --- TEAM DETAIL MODAL ---
interface TeamDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: Team | null;
}
const TeamDetailModal = ({ isOpen, onClose, team }: TeamDetailModalProps) => {
    if (!isOpen || !team) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                 <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{team.name}</h2>
                            <span className={clsx("text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded", team.status_aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{team.status_aktif ? 'Active' : 'Inactive'}</span>
                        </div>
                    </div>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-700" /></button>
                </div>

                <div className="p-6">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <User className="w-4 h-4" /> Team Members ({teamMembersRecords.filter(tm => tm.team_id === team.id).length})
                    </h3>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                                <tr>
                                    <th className="py-3 px-4">Name</th>
                                    <th className="py-3 px-4">Team Role</th>
                                    <th className="py-3 px-4">System Role</th>
                                    <th className="py-3 px-4">Vendor</th>
                                    <th className="py-3 px-4">Contact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {teamMembersRecords.filter(tm => tm.team_id === team.id).map(m => {
                                    const p = allPeople.find(person => person.id === m.person_id);
                                    if (!p) return null;
                                    return (
                                        <tr key={m.person_id} className="hover:bg-slate-50">
                                            <td className="py-3 px-4 font-medium text-slate-800">{p.name}</td>
                                            <td className="py-3 px-4">
                                                <span className={clsx("px-2 py-0.5 rounded text-xs font-bold uppercase", m.role === 'Team Leader' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>
                                                    {m.role} {m.role === 'Team Leader' ? '👑' : ''}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 capitalize">{p.role.replace('_', ' ')}</td>
                                            <td className="py-3 px-4 text-slate-500">{p.vendor}</td>
                                            <td className="py-3 px-4 text-slate-500 font-mono text-xs">{p.phone}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- MAIN PAGE ---
interface TeamsProps {
    isSubView?: boolean;
}
const Teams = ({ isSubView = false }: TeamsProps) => {
    const { can } = useAuth();
    const [teams, setTeams] = useState<Team[]>(initialTeams);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    
    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Logic
    const filteredTeams = useMemo(() => {
        return teams.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'active' ? t.status_aktif : (statusFilter === 'inactive' ? !t.status_aktif : true);
            return matchesSearch && matchesStatus;
        });
    }, [teams, searchTerm, statusFilter]);

    // RBAC — director, operational, admin can manage teams
    if (!can('teams.view')) return <Navigate to="/" replace />;

    const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);
    const paginatedTeams = filteredTeams.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleCreate = () => {
        setSelectedTeam(null);
        setIsEditModalOpen(true);
    };

    const handleEdit = (team: Team) => {
        setSelectedTeam(team);
        setIsEditModalOpen(true);
    };

    const handleView = (team: Team) => {
        setSelectedTeam(team);
        setIsViewModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if(window.confirm('Delete this team?')) {
            setTeams(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleSave = (team: Team) => {
        if (selectedTeam && teams.find(t => t.id === team.id)) {
            setTeams(prev => prev.map(t => t.id === team.id ? team : t));
        } else {
            setTeams(prev => [...prev, team]);
        }
        setIsEditModalOpen(false);
    };

    return (
        <div className={clsx("animate-in fade-in duration-500", !isSubView && "p-8 space-y-6")}>
            {!isSubView && (
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Teams</h1>
                        <p className="text-slate-500 text-sm">Manage field teams and memberships</p>
                    </div>
                </div>
            )}

            <div className={clsx("flex justify-between items-center mb-6", isSubView && "mt-2")}>
                <div className="flex-1 w-full max-w-xl">
                    <FilterBar
                        searchValue={searchTerm}
                        onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
                        searchPlaceholder="Search teams..."
                        statusOptions={[
                            { label: 'Active', value: 'active' },
                            { label: 'Inactive', value: 'inactive' },
                        ]}
                        statusValue={statusFilter}
                        onStatusChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
                        onExport={(type) => console.log(type)}
                    />
                </div>
                <div className="flex gap-2">
                    <Tooltip content="Create a new team" className="z-50">
                        <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded flex items-center gap-2 shadow-sm transition-all whitespace-nowrap">
                            <Plus className="w-4 h-4" /> Add Team
                        </button>
                    </Tooltip>
                    {!isSubView && (
                        <Tooltip content="Import dari Excel" className="z-50">
                            <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded flex items-center gap-2 shadow-sm transition-all whitespace-nowrap">
                                <FileSpreadsheet className="w-4 h-4" /> Import Excel
                            </button>
                        </Tooltip>
                    )}
                </div>
            </div>

            <TableContainer>

                <DataTable>
                    <TableHeader>
                        <TableHead sortable>Team Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Project Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableHeader>
                    <TableBody>
                        {paginatedTeams.length === 0 ? (
                            <tr>
                                <td colSpan={5}>
                                    <EmptyState 
                                        message={searchTerm ? "No teams found" : "No teams available"} 
                                        subMessage="Coba reset filter atau buat team baru."
                                        onReset={() => { setSearchTerm(''); setStatusFilter(''); }}
                                    />
                                </td>
                            </tr>
                        ) : (
                            paginatedTeams.map(team => (
                                <TableRow key={team.id}>
                                    <TableCell className="font-medium text-slate-800">{team.name}</TableCell>
                                    <TableCell>
                                        <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", 
                                            team.status_aktif ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200")}>
                                            <div className={clsx("w-1.5 h-1.5 rounded-full", team.status_aktif ? "bg-emerald-500" : "bg-slate-400")} />
                                            {team.status_aktif ? 'Active' : 'Inactive'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex -space-x-2">
                                            {teamMembersRecords.filter(tm => tm.team_id === team.id).slice(0, 4).map((m, i) => (
                                                <div key={i} className={clsx("w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-sm font-bold", m.role === 'Team Leader' ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600")} title={m.role}>
                                                    {allPeople.find(p => p.id === m.person_id)?.name.charAt(0) || '?'}
                                                </div>
                                            ))}
                                            {teamMembersRecords.filter(tm => tm.team_id === team.id).length > 4 && (
                                                <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">+{teamMembersRecords.filter(tm => tm.team_id === team.id).length - 4}</div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{team.project_type}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <ActionButton type="view" onClick={() => handleView(team)} />
                                            <ActionButton type="edit" onClick={() => handleEdit(team)} />
                                            <ActionButton type="delete" onClick={() => handleDelete(team.id)} />
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
                    totalItems={filteredTeams.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </TableContainer>

            <TeamModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} team={selectedTeam} onSave={handleSave} />
            <TeamDetailModal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} team={selectedTeam} />
            <TeamPeopleImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                targetType="teams"
                onImportComplete={(results) => {
                    console.log("Import Complete", results);
                    alert(results.message);
                }}
            />
        </div>
    );
};

export default Teams;
