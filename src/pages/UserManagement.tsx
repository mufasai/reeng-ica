import { useState, useMemo } from 'react';
import { Plus, Edit3, KeyRound, UserX, UserCheck, X, AlertCircle, Users } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { teams, type UserRole } from '../data/mockData';

// ─── Types ──────────────────────────────────────────────────────────────────
interface MockUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    teamId?: string;
    lastLogin?: string;
    isActive: boolean;
}

// Mock user list (in real app comes from API)
const MOCK_USERS: MockUser[] = [
    { id: 'u_dir', name: 'Director', email: 'director@demo.com', role: 'director', lastLogin: '2026-03-11', isActive: true },
    { id: 'u_ops', name: 'Operational Staff', email: 'operational@demo.com', role: 'operational', lastLogin: '2026-03-10', isActive: true },
    { id: 'u_adm', name: 'Admin Backoffice', email: 'admin@demo.com', role: 'admin', lastLogin: '2026-03-11', isActive: true },
    { id: 'u_fin', name: 'Finance Staff', email: 'finance@demo.com', role: 'finance', lastLogin: '2026-03-09', isActive: true },
    { id: 'u_field', name: 'Field Engineer', email: 'field@demo.com', role: 'field', teamId: 't1', lastLogin: '2026-03-08', isActive: true },
    { id: 'u_field2', name: 'Charlie Field 2', email: 'charlie@demo.com', role: 'field', teamId: 't3', lastLogin: '2026-03-07', isActive: false },
];

const ROLE_COLORS: Record<UserRole, string> = {
    director:    'bg-purple-50 text-purple-700 border-purple-200',
    operational: 'bg-blue-50 text-blue-700 border-blue-200',
    admin:       'bg-amber-50 text-amber-700 border-amber-200',
    finance:     'bg-emerald-50 text-emerald-700 border-emerald-200',
    field:       'bg-slate-50 text-slate-600 border-slate-200',
};

const ROLE_LABELS: Record<UserRole, string> = {
    director:    'Director',
    operational: 'Operational',
    admin:       'Admin',
    finance:     'Finance',
    field:       'Field',
};

const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Add/Edit User Modal ─────────────────────────────────────────────────────
interface UserFormData {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    teamId: string;
}

const EMPTY_FORM: UserFormData = { name: '', email: '', password: '', role: 'operational', teamId: '' };

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingUser?: MockUser;
    currentUserId: string;
}

const UserModal = ({ isOpen, onClose, editingUser, currentUserId }: UserModalProps) => {
    const [form, setForm] = useState<UserFormData>(
        editingUser
            ? { name: editingUser.name, email: editingUser.email, password: '', role: editingUser.role, teamId: editingUser.teamId || '' }
            : EMPTY_FORM
    );
    const [saved, setSaved] = useState(false);

    const isEditing = !!editingUser;
    const isOwnAccount = editingUser?.id === currentUserId;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSaved(true);
        setTimeout(() => { onClose(); setSaved(false); }, 1000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-base font-bold text-slate-800">
                        {isEditing ? 'Edit User' : '+ Tambah User'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {isOwnAccount && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>Anda tidak dapat mengubah role akun Anda sendiri.</span>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Nama lengkap"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="email"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="email@domain.com"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            />
                        </div>
                        {!isEditing && (
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password <span className="text-red-500">*</span></label>
                                <input
                                    required={!isEditing}
                                    type="password"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    placeholder="Password sementara"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                />
                                <p className="text-xs text-slate-400 mt-1">User wajib ganti password saat login pertama.</p>
                            </div>
                        )}
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={form.role}
                                onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole, teamId: '' }))}
                                disabled={isOwnAccount}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="director">Director</option>
                                <option value="operational">Operational</option>
                                <option value="admin">Admin</option>
                                <option value="finance">Finance</option>
                                <option value="field">Field</option>
                            </select>
                        </div>
                        {/* Team field — only shown when role = field */}
                        {form.role === 'field' && (
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tim <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={form.teamId}
                                    onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                >
                                    <option value="">-- Pilih Tim --</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <p className="text-xs text-slate-400 mt-1">User ini hanya dapat mengakses site dari tim yang dipilih.</p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                            Batal
                        </button>
                        <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-md shadow-blue-500/20">
                            {saved ? '✓ Disimpan!' : (isEditing ? 'Simpan Perubahan' : 'Simpan User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const UserManagement = () => {
    const { currentUser, can } = useAuth();
    const [users, setUsers] = useState<MockUser[]>(MOCK_USERS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<MockUser | undefined>(undefined);
    const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
    const [search, setSearch] = useState('');

    // Guard — only director/operational/admin
    if (!can('system.manage_users')) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                <h2 className="text-xl font-bold text-slate-700">Akses Ditolak</h2>
                <p className="text-slate-500 mt-1 text-sm">Anda tidak memiliki akses ke halaman ini.</p>
            </div>
        );
    }

    const filtered = useMemo(() => {
        return users.filter(u => {
            if (filterRole !== 'all' && u.role !== filterRole) return false;
            if (search) {
                const q = search.toLowerCase();
                if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [users, filterRole, search]);

    const toggleActive = (userId: string) => {
        if (userId === currentUser.id) return; // Cannot deactivate self
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
    };

    const openEdit = (user: MockUser) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setEditingUser(undefined);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">User Management</h1>
                    <p className="text-slate-500 mt-1 text-sm font-medium">Kelola akun pengguna, role, dan akses sistem</p>
                </div>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md transition-colors shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4" /> Tambah User
                </button>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(['all', 'director', 'operational', 'admin', 'finance', 'field'] as const).slice(1).map(role => {
                    const count = users.filter(u => u.role === role && u.isActive).length;
                    return (
                        <button
                            key={role}
                            onClick={() => setFilterRole(prev => prev === role ? 'all' : role)}
                            className={clsx(
                                'text-left px-4 py-3 rounded-xl border transition-all',
                                filterRole === role ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-slate-200 hover:border-slate-300'
                            )}
                        >
                            <p className="text-2xl font-black text-slate-800">{count}</p>
                            <p className="text-xs font-semibold text-slate-500 capitalize mt-0.5">{role}</p>
                        </button>
                    );
                })}
            </div>

            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    placeholder="Cari nama atau email..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                <select
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value as UserRole | 'all')}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                >
                    <option value="all">All Roles</option>
                    <option value="director">Director</option>
                    <option value="operational">Operational</option>
                    <option value="admin">Admin</option>
                    <option value="finance">Finance</option>
                    <option value="field">Field</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">
                        {filtered.length} user{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b border-slate-100">
                            <tr>
                                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Name</th>
                                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Email</th>
                                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Role</th>
                                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Tim</th>
                                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Last Login</th>
                                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                                <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Tidak ada user ditemukan.</td></tr>
                            ) : (
                                filtered.map(user => {
                                    const isSelf = user.id === currentUser.id;
                                    const teamName = user.teamId ? teams.find(t => t.id === user.teamId)?.name : null;
                                    return (
                                        <tr key={user.id} className={clsx('hover:bg-slate-50/50 transition-colors', !user.isActive && 'opacity-60')}>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', user.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400')}>
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-800">{user.name}</p>
                                                        {!user.isActive && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide border border-slate-200 px-1.5 py-0.5 rounded">Nonaktif</span>}
                                                        {isSelf && <span className="text-[10px] font-bold text-blue-500 ml-1">(Anda)</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{user.email}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={clsx('px-2 py-0.5 rounded text-[11px] font-bold uppercase border tracking-wide', ROLE_COLORS[user.role])}>
                                                    {ROLE_LABELS[user.role]}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500 text-xs">{teamName || <span className="text-slate-300">—</span>}</td>
                                            <td className="px-5 py-3.5 text-slate-500 text-xs tabular-nums">{formatDate(user.lastLogin)}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold border', user.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200')}>
                                                    {user.isActive ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => openEdit(user)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
                                                    >
                                                        <Edit3 className="w-3 h-3" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => alert(`Reset password link dikirim ke ${user.email}`)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-600 hover:text-amber-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
                                                        title="Reset Password"
                                                    >
                                                        <KeyRound className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleActive(user.id)}
                                                        disabled={isSelf}
                                                        title={isSelf ? 'Tidak dapat menonaktifkan akun sendiri' : (user.isActive ? 'Nonaktifkan' : 'Aktifkan')}
                                                        className={clsx(
                                                            'inline-flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-all shadow-sm',
                                                            isSelf ? 'opacity-40 cursor-not-allowed bg-white border-slate-200 text-slate-400' :
                                                            user.isActive
                                                                ? 'bg-white border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-700'
                                                                : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700'
                                                        )}
                                                    >
                                                        {user.isActive ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                                                        {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                editingUser={editingUser}
                currentUserId={currentUser.id}
            />
        </div>
    );
};

export default UserManagement;
