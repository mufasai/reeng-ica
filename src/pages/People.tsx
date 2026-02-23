import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { people as initialPeople, type Person, type UserRole } from '../data/mockData';
import { 
    Search, Plus,  Edit2, Trash2, 
    Download, Printer, 
    X, Camera, Smartphone, FileText, User, Briefcase
} from 'lucide-react';
import { Tooltip } from '../components/common/Tooltip';
import clsx from 'clsx';

// --- ADD/EDIT MODAL COMPONENT ---
interface PersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    person: Person | null;
    onSave: (person: Person) => void;
}

const PersonModal = ({ isOpen, onClose, person, onSave }: PersonModalProps) => {
    const [formData, setFormData] = useState<Partial<Person>>(
        person || {
            name: '', ktp: '', email: '', phone: '', role: 'engineer', vendor: '',
            deviceId: '', imei1: '', imei2: ''
        }
    );

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: person?.id || `u_${Date.now()}`,
            joinedAt: person?.joinedAt || new Date().toISOString().split('T')[0]
        } as Person);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const roles: UserRole[] = ['engineer', 'team_leader', 'finance', 'management'];

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
                                <label className="text-sm font-medium text-slate-700">No. KTP <span className="text-red-500">*</span></label>
                                <input required name="ktp" value={formData.ktp} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="16 digit NIK" />
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
                    </section>

                    {/* Work & Role */}
                    <section className="space-y-4">
                         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                             <Briefcase className="w-4 h-4" /> Role & Vendor
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Role <span className="text-red-500">*</span></label>
                                <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                    {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Vendor <span className="text-red-500">*</span></label>
                                <input required name="vendor" value={formData.vendor} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="PT. Example" />
                            </div>
                        </div>
                    </section>

                    {/* Device Info */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                             <Smartphone className="w-4 h-4" /> Device Registration
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Device ID</label>
                                <input name="deviceId" value={formData.deviceId} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Unique ID" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">IMEI 1</label>
                                <input name="imei1" value={formData.imei1} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="15 digits" />
                            </div>
                             <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">IMEI 2</label>
                                <input name="imei2" value={formData.imei2} onChange={handleChange} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="15 digits" />
                            </div>
                        </div>
                    </section>

                    {/* Documents & Photos */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 border-b pb-2">
                             <FileText className="w-4 h-4" /> Documents & Photos
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                             {['KTP', 'Selfie', 'NDA', 'Selfie w/ NDA'].map((label) => (
                                 <div key={label} className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                                     <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                                         <Camera className="w-5 h-5" />
                                     </div>
                                     <p className="text-xs font-medium text-slate-600 mb-1">Foto {label}</p>
                                     <span className="text-[10px] text-slate-400 block">Click to upload</span>
                                 </div>
                             ))}
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

const People = () => {
    const { currentUser } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [peopleData, setPeopleData] = useState<Person[]>(initialPeople);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);

    // RBAC Redirect
    if (currentUser.role !== 'management') {
        return <Navigate to="/" replace />;
    }

    // Filter Logic
    const filteredPeople = peopleData.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ktp.includes(searchTerm) ||
        p.role.includes(searchTerm)
    );

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

    const handleSave = (person: Person) => {
        if (editingPerson) {
            setPeopleData(prev => prev.map(p => p.id === person.id ? person : p));
        } else {
            setPeopleData(prev => [...prev, person]);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="p-8 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">People Management</h1>
                    <p className="text-slate-500 text-sm">Manage users, roles, and device registrations</p>
                </div>
                <div className="flex gap-2">
                    <Tooltip content="Export data to CSV">
                    <button className="p-2 text-slate-500 hover:bg-slate-100 rounded border border-slate-200"><Download className="w-5 h-5" /></button>
                    </Tooltip>
                    <Tooltip content="Print current view">
                    <button className="p-2 text-slate-500 hover:bg-slate-100 rounded border border-slate-200"><Printer className="w-5 h-5" /></button>
                    </Tooltip>
                    <Tooltip content="Register a new person">
                    <button onClick={handleAdd} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded flex items-center gap-2 shadow-sm transition-all">
                        <Plus className="w-4 h-4" /> Add Person
                    </button>
                    </Tooltip>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search by name, email, KTP..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#f8f9fa] text-slate-500 font-semibold border-b border-slate-200 whitespace-nowrap">
                            <tr>
                                <th className="py-4 px-6">Profile</th>
                                <th className="py-4 px-6">Contact Info</th>
                                <th className="py-4 px-6">Role & Vendor</th>
                                <th className="py-4 px-6">Identity (KTP)</th>
                                <th className="py-4 px-6">Device Info</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                            {filteredPeople.length > 0 ? (
                                filteredPeople.map((person) => (
                                    <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase overflow-hidden">
                                                    {person.avatar ? <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" /> : person.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-800">{person.name}</div>
                                                    <div className="text-xs text-slate-400 font-mono">{person.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-slate-700">{person.email}</span>
                                                <span className="text-xs text-slate-500">{person.phone}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-col gap-1">
                                                <span className={clsx(
                                                    "inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border",
                                                    person.role === 'management' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                    person.role === 'engineer' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    person.role === 'team_leader' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-slate-50 text-slate-700 border-slate-200'
                                                )}>
                                                    {person.role.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-slate-500">{person.vendor}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 font-mono text-slate-600">{person.ktp}</td>
                                        <td className="py-4 px-6 text-xs text-slate-500 space-y-1">
                                            {person.deviceId && <div><span className="font-medium text-slate-400">ID:</span> {person.deviceId}</div>}
                                            {person.imei1 && <div><span className="font-medium text-slate-400">IMEI:</span> {person.imei1}</div>}
                                            {!person.deviceId && !person.imei1 && <span className="italic text-slate-400">Not registered</span>}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Tooltip content="Edit person details">
                                                <button onClick={() => handleEdit(person)} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                </Tooltip>
                                                <Tooltip content="Delete this person">
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
        </div>
    );
};

export default People;
