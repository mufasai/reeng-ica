import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { people as initialPeople, teams, teamMembersRecords, type Person, type UserRole } from '../data/mockData';
import { 
    Search, Plus,  Edit2, Trash2, 
    Download, Printer, FileSpreadsheet,
    X, Camera, Smartphone, FileText, User, Briefcase
} from 'lucide-react';
import { Tooltip } from '../components/common/Tooltip';
import clsx from 'clsx';
import TeamPeopleImportModal from '../components/modals/TeamPeopleImportModal';

// --- ADD/EDIT MODAL COMPONENT ---
interface PersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    person: Person | null;
    onSave: (person: Person) => void;
}

const PersonModal = ({ isOpen, onClose, person, onSave }: PersonModalProps) => {
    const [formData, setFormData] = useState<Partial<Person> & { assignedTeamId?: string }>(() => {
        const activeRecord = person ? teamMembersRecords.find(tm => tm.person_id === person.id && tm.is_active) : undefined;
        return {
            ...(person || {
                name: '', email: '', phone: '', role: 'field', vendor: 'Internal',
                tempat_lahir: '', tanggal_lahir: '', agama: '', jenis_kelamin: 'Laki-laki', 
                no_ktp: '', alamat: '', regional: '', status_aktif: true,
                jabatan: 'Engineer', pekerjaan: ''
            }),
            assignedTeamId: activeRecord ? activeRecord.team_id : ''
        };
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: person?.id || `u_${Date.now()}`,
            joinedAt: person?.joinedAt || new Date().toISOString().split('T')[0]
        } as Person & { assignedTeamId?: string });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const jabatans = ['Leader', 'Engineer', 'Member', 'Member 1', 'Member 2', 'SITAC', 'Transport', 'Lainnya'];
    const pekerjaans = ['Blacksite', 'Combat', 'Filter', 'L2H', 'Rescoping'];

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-slate-800">
                        {person ? 'Edit Person' : 'Add New Person'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8">
                    {/* Personal Info */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                             <User className="w-4 h-4" /> Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Full Name <span className="text-red-500">*</span></label>
                                <input required name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. John Doe" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">No KTP / NIK <span className="text-red-500">*</span></label>
                                <input required name="no_ktp" value={formData.no_ktp || formData.nik || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="No KTP or NIK" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></label>
                                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="john@example.com" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Phone Number <span className="text-red-500">*</span></label>
                                <input required name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0812..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Tempat Lahir</label>
                                <input name="tempat_lahir" value={formData.tempat_lahir || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Kota Lahir" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Tanggal Lahir</label>
                                <input type="date" name="tanggal_lahir" value={formData.tanggal_lahir || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Jenis Kelamin</label>
                                <select name="jenis_kelamin" value={formData.jenis_kelamin || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    <option value="">Pilih...</option>
                                    <option value="Laki-laki">Laki-laki</option>
                                    <option value="Perempuan">Perempuan</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Agama</label>
                                <select name="agama" value={formData.agama || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    <option value="">Pilih...</option>
                                    <option value="Islam">Islam</option>
                                    <option value="Kristen">Kristen</option>
                                    <option value="Katolik">Katolik</option>
                                    <option value="Hindu">Hindu</option>
                                    <option value="Buddha">Buddha</option>
                                    <option value="Konghucu">Konghucu</option>
                                </select>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700">Alamat</label>
                                <input name="alamat" value={formData.alamat || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Alamat lengkap" />
                            </div>
                        </div>
                    </section>

                    {/* Work & Role */}
                    <section className="space-y-4">
                         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                             <Briefcase className="w-4 h-4" /> Role & Assignment
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Jabatan Kerja <span className="text-red-500">*</span></label>
                                <select required name="jabatan" value={formData.jabatan || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    <option value="">Pilih Jabatan...</option>
                                    {jabatans.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Pekerjaan (Type)</label>
                                <select name="pekerjaan" value={formData.pekerjaan || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    <option value="">(Kosong)</option>
                                    {pekerjaans.map(r => <option key={r} value={r.toUpperCase()}>{r}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Regional</label>
                                <input name="regional" value={formData.regional || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Jabodetabek" />
                            </div>
                            
                            {/* Team Assignment Dropdown */}
                            {(!formData.jabatan?.toLowerCase().includes('leader')) && (
                                <div className="space-y-2 lg:col-span-3"> {/* Span across to look good if it's the 4th item */}
                                    <label className="text-sm font-medium text-slate-700">Assign to Team (Optional)</label>
                                    <select name="assignedTeamId" value={formData.assignedTeamId || ''} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                        <option value="">(No Team / Unassigned)</option>
                                        {teams.filter(t => t.status_aktif).map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400">Selecting a team will sync this member immediately upon save.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </form>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-10">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow-sm transition-all hover:shadow-md">
                        {person ? 'Save Changes' : 'Create Person'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
interface PeopleProps {
    isSubView?: boolean;
}

const People = ({ isSubView = false }: PeopleProps) => {
    const { can } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [peopleData, setPeopleData] = useState<Person[]>(initialPeople);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);

    // RBAC Redirect — only director, operational, admin can access People
    if (!can('people.view')) {
        return <Navigate to="/" replace />;
    }

    const [roleFilter, setRoleFilter] = useState('');
    const [projectFilter, setProjectFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Filter Logic
    const filteredPeople = peopleData.filter(p => {
        const matchesSearch = 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.nik || p.no_ktp || '').includes(searchTerm) ||
            p.phone.includes(searchTerm);
            
        const matchesRole = roleFilter === '' || p.jabatan === roleFilter;
        const matchesProject = projectFilter === '' || p.pekerjaan === projectFilter;
        const matchesStatus = statusFilter === '' || (statusFilter === 'active' ? p.status_aktif : !p.status_aktif);

        return matchesSearch && matchesRole && matchesProject && matchesStatus;
    });

    // CRUD Handlers
    const handleAdd = () => {
        setEditingPerson(null);
        setIsModalOpen(true);
    };

    const handleEdit = (person: Person) => {
        setEditingPerson(person);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this person? This action cannot be undone.")) {
            setPeopleData(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleSave = (personPayload: Person & { assignedTeamId?: string }) => {
        // Strip out extended properties for canonical Person object
        const { assignedTeamId, ...person } = personPayload;
        
        if (editingPerson) {
            setPeopleData(prev => prev.map(p => p.id === person.id ? person : p));
        } else {
            setPeopleData(prev => [...prev, person]);
        }

        // Handle team mapping implicitly in mock data structure
        if (assignedTeamId !== undefined) {
             // Invalidate prior bindings
             teamMembersRecords.forEach(tm => {
                 if (tm.person_id === person.id) tm.is_active = false;
             });

             // Apply new binding
             if (assignedTeamId) {
                 const newId = `tm_${Date.now()}`;
                 teamMembersRecords.push({
                     id: newId,
                     team_id: assignedTeamId,
                     person_id: person.id,
                     role: person.jabatan === 'Leader' ? 'Team Leader' : 'Engineer',
                     is_active: true,
                     joined_at: new Date().toISOString().split('T')[0]
                 });
                 
                 // Cleanly sync inline 'members' properties on the mocked Teams object
                 teams.forEach(t => t.members = t.members.filter(m => m.person_id !== person.id));
                 const targetTeam = teams.find(t => t.id === assignedTeamId);
                 if (targetTeam) {
                     targetTeam.members.push({
                         id: newId,
                         team_id: assignedTeamId,
                         person_id: person.id,
                         jabatan: person.jabatan || 'Engineer',
                         is_field_leader: person.jabatan === 'Leader'
                     });
                 }
             } else {
                 // Removed from any team
                 teams.forEach(t => t.members = t.members.filter(m => m.person_id !== person.id));
             }
        }
        
        setIsModalOpen(false);
    };

    return (
        <div className={clsx("animate-in fade-in duration-500", !isSubView && "p-8 space-y-6")}>
            {/* Header */}
            {!isSubView && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">People Management</h1>
                        <p className="text-slate-500 text-sm">Manage users, roles, and device registrations</p>
                    </div>
                </div>
            )}
            
            <div className={clsx("flex flex-col gap-4 mb-6", isSubView && "mt-2")}>
                <div className="flex justify-between items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Search by name, email, NIK, No HP..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600 bg-white"
                        />
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Tooltip content="Export data to CSV">
                        <button className="p-2 text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded transition-colors"><Download className="w-5 h-5" /></button>
                        </Tooltip>
                        <Tooltip content="Register a new person">
                        <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded flex items-center gap-2 shadow-sm transition-all">
                            <Plus className="w-4 h-4" /> Add Person
                        </button>
                        </Tooltip>
                        <Tooltip content="Import dari Excel">
                            <button onClick={() => setIsImportModalOpen(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded flex items-center gap-2 shadow-sm transition-all">
                                <FileSpreadsheet className="w-4 h-4" /> Import Excel
                            </button>
                        </Tooltip>
                    </div>
                </div>
                {/* Advanced Filters */}
                <div className="flex gap-3">
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        <option value="">Semua Jabatan</option>
                        <option value="Leader">Leader</option>
                        <option value="Engineer">Engineer</option>
                        <option value="Member">Member</option>
                    </select>
                    <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        <option value="">Semua Pekerjaan</option>
                        <option value="BLACKSITE">Blacksite</option>
                        <option value="COMBAT">Combat</option>
                        <option value="FILTER">Filter</option>
                        <option value="L2H">L2H</option>
                        <option value="RESCOPING">Rescoping</option>
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        <option value="">Semua Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>




            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#f8f9fa] text-slate-500 font-semibold border-b border-slate-200 whitespace-nowrap">
                            <tr>
                                <th className="py-4 px-6 w-12 text-center">No</th>
                                <th className="py-4 px-6">Nama</th>
                                <th className="py-4 px-6">Jabatan Kerja</th>
                                <th className="py-4 px-6">Pekerjaan</th>
                                <th className="py-4 px-6">Regional</th>
                                <th className="py-4 px-6">No HP</th>
                                <th className="py-4 px-6">Email</th>
                                <th className="py-4 px-6">NIK/KTP</th>
                                <th className="py-4 px-6 text-center">Status</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                            {filteredPeople.length > 0 ? (
                                filteredPeople.map((person, index) => (
                                    <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6 text-center text-slate-400 font-medium">{index + 1}</td>
                                        <td className="py-4 px-6 font-semibold text-slate-800">{person.name}</td>
                                        <td className="py-4 px-6">
                                            {person.jabatan ? (
                                                <span className={clsx(
                                                    "inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border",
                                                    person.jabatan === 'Leader' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    person.jabatan === 'Engineer' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    person.jabatan?.includes('Member') ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                    'bg-slate-50 text-slate-700 border-slate-200'
                                                )}>
                                                    {person.jabatan}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            {person.pekerjaan ? (
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx(
                                                        "w-2 h-2 rounded-full",
                                                        person.pekerjaan === 'BLACKSITE' ? 'bg-rose-500' :
                                                        person.pekerjaan === 'COMBAT' ? 'bg-amber-500' :
                                                        person.pekerjaan === 'FILTER' ? 'bg-emerald-500' :
                                                        person.pekerjaan === 'L2H' ? 'bg-sky-500' :
                                                        'bg-violet-500'
                                                    )} />
                                                    <span className="text-xs font-medium uppercase tracking-wide text-slate-600">{person.pekerjaan}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">{person.regional || <span className="text-slate-400">—</span>}</td>
                                        <td className="py-4 px-6 font-mono text-xs">{person.phone || '-'}</td>
                                        <td className="py-4 px-6 text-xs max-w-[150px] truncate" title={person.email}>{person.email || '-'}</td>
                                        <td className="py-4 px-6 font-mono text-xs">{person.nik || person.no_ktp ? (person.nik || person.no_ktp || '').substring(0, 8) + '...' : '-'}</td>
                                        <td className="py-4 px-6 text-center">
                                            <Tooltip content={person.status_aktif ? "Active" : "Inactive"}>
                                                <div className={clsx("w-2 h-2 rounded-full mx-auto", person.status_aktif ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-slate-300")} />
                                            </Tooltip>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Tooltip content="Edit person">
                                                    <button onClick={() => handleEdit(person)} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                </Tooltip>
                                                <Tooltip content="Delete person">
                                                    <button onClick={() => handleDelete(person.id)} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">No people found matching your search.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination (Mock) */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
                    <span>Showing 1-{filteredPeople.length} of {filteredPeople.length} entries</span>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 border rounded bg-white hover:bg-slate-50 disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1 border rounded bg-white hover:bg-slate-50 disabled:opacity-50" disabled>Next</button>
                    </div>
                </div>
            </div>

            <PersonModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                person={editingPerson} 
                onSave={handleSave}
            />

            <TeamPeopleImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                targetType="people"
                onImportComplete={(results) => {
                    console.log("Import Complete", results);
                    alert(results.message);
                    // Mock behavior: Refresh the page or append to peopleData
                }}
            />
        </div>
    );
};

export default People;
