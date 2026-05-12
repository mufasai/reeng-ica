import { useState, useMemo, type FormEvent } from 'react';
import { Plus, Edit3, KeyRound, UserX, UserCheck, X, AlertCircle, Users, Shield, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { teams, type UserRole, USERS } from '../data/mockData';

// ─── Types ──────────────────────────────────────────────────────────────────
interface MockUser {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    teamId?: string;
    lastLogin?: string;
    isActive: boolean;
}

interface RoleDefinition {
    id: string;
    value: UserRole | string;
    label: string;
    description: string;
    colorClass: string;
    isSystem: boolean; // built-in roles cannot be deleted
}

const INITIAL_ROLES: RoleDefinition[] = [
    { id: 'r_sysadmin',      value: 'system_admin',   label: 'System Administrator', description: 'Akses penuh ke semua fitur termasuk manajemen role dan user.',     colorClass: 'bg-red-50 text-red-700 border-red-200',            isSystem: true },
    { id: 'r_director',      value: 'director',       label: 'Director',             description: 'Menyetujui pembayaran, melihat semua laporan keuangan.',            colorClass: 'bg-purple-50 text-purple-700 border-purple-200',   isSystem: true },
    { id: 'r_finance',       value: 'finance',        label: 'Finance',              description: 'Memproses pembayaran, upload bukti bayar, laporan keuangan.',       colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',isSystem: true },
    { id: 'r_operational',   value: 'operational',    label: 'Operational',          description: 'Mengelola pekerjaan site, tim, import data, pengajuan pembayaran.', colorClass: 'bg-blue-50 text-blue-700 border-blue-200',          isSystem: true },
    { id: 'r_field_engineer',value: 'field_engineer', label: 'Field Engineer',       description: 'Engineer lapangan, upload foto implementasi dan lihat site aktif.', colorClass: 'bg-amber-50 text-amber-700 border-amber-200',       isSystem: true },
];

const PREPARED_USERS: MockUser[] = USERS.map((u, i) => ({
    ...u,
    isActive: i !== USERS.length - 1, // mock one inactive
    lastLogin: '2026-05-12'
}));

const COLOR_PRESETS = [
    { cls: 'bg-blue-50 text-blue-700 border-blue-200',      preview: 'bg-blue-500' },
    { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', preview: 'bg-emerald-500' },
    { cls: 'bg-amber-50 text-amber-700 border-amber-200',   preview: 'bg-amber-500' },
    { cls: 'bg-purple-50 text-purple-700 border-purple-200', preview: 'bg-purple-500' },
    { cls: 'bg-rose-50 text-rose-700 border-rose-200',      preview: 'bg-rose-500' },
    { cls: 'bg-cyan-50 text-cyan-700 border-cyan-200',      preview: 'bg-cyan-500' },
    { cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', preview: 'bg-indigo-500' },
    { cls: 'bg-slate-50 text-slate-600 border-slate-200',   preview: 'bg-slate-500' },
];

const formatDate = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Add/Edit User Modal ─────────────────────────────────────────────────────
interface UserFormData {
    name: string;
    email: string;
    password: string;
    role: string;
    teamId: string;
}
const EMPTY_USER_FORM: UserFormData = { name: '', email: '', password: '', role: 'operational', teamId: '' };

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingUser?: MockUser;
    currentUserId: string;
    availableRoles: RoleDefinition[];
}

const UserModal = ({ isOpen, onClose, editingUser, currentUserId, availableRoles }: UserModalProps) => {
    const [form, setForm] = useState<UserFormData>(
        editingUser
            ? { name: editingUser.name, email: editingUser.email, password: '', role: editingUser.role, teamId: editingUser.teamId || '' }
            : EMPTY_USER_FORM
    );
    const [saved, setSaved] = useState(false);
    const isEditing = !!editingUser;
    const isOwnAccount = editingUser?.id === currentUserId;

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaved(true);
        setTimeout(() => { onClose(); setSaved(false); }, 1000);
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-base font-bold text-slate-800">{isEditing ? 'Edit User' : '+ Tambah User'}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"><X className="w-4 h-4" /></button>
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
                            <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nama lengkap"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email <span className="text-red-500">*</span></label>
                            <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@domain.com"
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                        </div>
                        {!isEditing && (
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password <span className="text-red-500">*</span></label>
                                <input required={!isEditing} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password sementara"
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                                <p className="text-xs text-slate-400 mt-1">User wajib ganti password saat login pertama.</p>
                            </div>
                        )}
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role <span className="text-red-500">*</span></label>
                            <select required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value, teamId: '' }))}
                                disabled={isOwnAccount}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed">
                                {availableRoles.map(r => <option key={r.id} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        {form.role === 'field_engineer' && (
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tim <span className="text-red-500">*</span></label>
                                <select required value={form.teamId} onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                                    <option value="">-- Pilih Tim --</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <p className="text-xs text-slate-400 mt-1">User ini hanya dapat mengakses site dari tim yang dipilih.</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Batal</button>
                        <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-md shadow-blue-500/20">
                            {saved ? '✓ Disimpan!' : (isEditing ? 'Simpan Perubahan' : 'Simpan User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── Create Role Modal (system_admin only) ───────────────────────────────────
interface RoleFormData { label: string; value: string; description: string; colorClass: string; }
const EMPTY_ROLE_FORM: RoleFormData = { label: '', value: '', description: '', colorClass: COLOR_PRESETS[0].cls };

interface RoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (role: RoleDefinition) => void;
}

const RoleModal = ({ isOpen, onClose, onSave }: RoleModalProps) => {
    const [form, setForm] = useState<RoleFormData>(EMPTY_ROLE_FORM);
    const [saved, setSaved] = useState(false);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const slug = form.value || form.label.toLowerCase().replace(/\s+/g, '_');
        onSave({
            id: `r_custom_${Date.now()}`,
            value: slug as UserRole,
            label: form.label,
            description: form.description,
            colorClass: form.colorClass,
            isSystem: false,
        });
        setSaved(true);
        setTimeout(() => { onClose(); setSaved(false); setForm(EMPTY_ROLE_FORM); }, 800);
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-500" />
                        <h2 className="text-base font-bold text-slate-800">Buat Role Baru</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
                        <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Hanya <strong>System Administrator</strong> yang dapat membuat role baru.</span>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Role <span className="text-red-500">*</span></label>
                        <input required type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Contoh: Supervisor Regional"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Slug / Kode Role</label>
                        <input type="text" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} placeholder="supervisor_regional (otomatis dari nama)"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                        <p className="text-xs text-slate-400 mt-1">Dikosongkan = dibuat otomatis dari nama.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Deskripsi</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Jelaskan fungsi dan batasan akses role ini..." rows={2}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-2">Warna Badge</label>
                        <div className="flex gap-2 flex-wrap">
                            {COLOR_PRESETS.map((p, i) => (
                                <button key={i} type="button" onClick={() => setForm(f => ({ ...f, colorClass: p.cls }))}
                                    className={clsx('w-7 h-7 rounded-full transition-all border-2', p.preview,
                                        form.colorClass === p.cls ? 'border-slate-800 scale-110' : 'border-transparent opacity-60 hover:opacity-100')}>
                                </button>
                            ))}
                        </div>
                        {form.label && (
                            <div className="mt-2">
                                <span className={clsx('px-2 py-0.5 rounded text-[11px] font-bold uppercase border tracking-wide', form.colorClass)}>
                                    {form.label}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">Batal</button>
                        <button type="submit" className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors shadow-md shadow-red-500/20">
                            {saved ? '✓ Role Dibuat!' : 'Buat Role'}
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
    if (!currentUser) return null;

    const isSysAdmin = currentUser.role === 'system_admin';

    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
    const [users, setUsers] = useState<MockUser[]>(PREPARED_USERS);
    const [roles, setRoles] = useState<RoleDefinition[]>(INITIAL_ROLES);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<MockUser | undefined>(undefined);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [expandedRole, setExpandedRole] = useState<string | null>(null);

    if (!can('system.manage_users')) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                <h2 className="text-xl font-bold text-slate-700">Akses Ditolak</h2>
                <p className="text-slate-500 mt-1 text-sm">Anda tidak memiliki akses ke halaman ini.</p>
            </div>
        );
    }

    const filteredUsers = useMemo(() => users.filter(u => {
        if (filterRole !== 'all' && u.role !== filterRole) return false;
        if (search) {
            const q = search.toLowerCase();
            if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
        }
        return true;
    }), [users, filterRole, search]);

    const toggleActive = (userId: string) => {
        if (userId === currentUser.id) return;
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
    };

    const handleDeleteRole = (roleId: string) => {
        if (!isSysAdmin) return;
        setRoles(prev => prev.filter(r => r.id !== roleId));
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">User Management</h1>
                    <p className="text-slate-500 mt-1 text-sm font-medium">Kelola akun pengguna, role, dan akses sistem</p>
                </div>
                <div className="flex items-center gap-2">
                    {activeTab === 'roles' && isSysAdmin && (
                        <button onClick={() => setIsRoleModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-md transition-colors shadow-red-500/20">
                            <Shield className="w-4 h-4" /> Buat Role Baru
                        </button>
                    )}
                    {activeTab === 'users' && (
                        <button onClick={() => { setEditingUser(undefined); setIsUserModalOpen(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md transition-colors shadow-blue-500/20">
                            <Plus className="w-4 h-4" /> Tambah User
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <div className="flex gap-6">
                    <button onClick={() => setActiveTab('users')}
                        className={clsx('pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2',
                            activeTab === 'users' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                        <Users className="w-4 h-4" /> Pengguna
                        <span className={clsx('px-1.5 py-0.5 rounded-full text-[10px] font-bold border',
                            activeTab === 'users' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200')}>
                            {users.length}
                        </span>
                    </button>
                    <button onClick={() => setActiveTab('roles')}
                        className={clsx('pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2',
                            activeTab === 'roles' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-700')}>
                        <Shield className="w-4 h-4" /> Kelola Role
                        <span className={clsx('px-1.5 py-0.5 rounded-full text-[10px] font-bold border',
                            activeTab === 'roles' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200')}>
                            {roles.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* ── USERS TAB ── */}
            {activeTab === 'users' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Stats Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {(['director', 'operational', 'finance', 'field_engineer', 'system_admin'] as const).map(role => {
                            const count = users.filter(u => u.role === role && u.isActive).length;
                            return (
                                <button key={role} onClick={() => setFilterRole(prev => prev === role ? 'all' : role)}
                                    className={clsx('text-left px-4 py-3 rounded-xl border transition-all',
                                        filterRole === role ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white border-slate-200 hover:border-slate-300')}>
                                    <p className="text-2xl font-black text-slate-800">{count}</p>
                                    <p className="text-xs font-semibold text-slate-500 capitalize mt-0.5">{role}</p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input type="text" placeholder="Cari nama atau email..." value={search} onChange={e => setSearch(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none">
                            <option value="all">All Roles</option>
                            {roles.map(r => <option key={r.id} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-semibold text-slate-700">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="border-b border-slate-100">
                                    <tr>
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Name</th>
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Email</th>
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Password</th>
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Role</th>
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Tim</th>
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Last Login</th>
                                        <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Status</th>
                                        <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredUsers.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">Tidak ada user ditemukan.</td></tr>
                                    ) : filteredUsers.map(user => {
                                        const isSelf = user.id === currentUser.id;
                                        const teamName = user.teamId ? teams.find(t => t.id === user.teamId)?.name : null;
                                        const roleDef = roles.find(r => r.value === user.role);
                                        return (
                                            <tr key={user.id} className={clsx('hover:bg-slate-50/50 transition-colors', !user.isActive && 'opacity-60')}>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                                                            user.isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400')}>
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
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-amber-800 border border-yellow-200 rounded font-mono text-[11px] font-bold shadow-sm">
                                                        <KeyRound className="w-3 h-3 opacity-70" />
                                                        {user.password || '—'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className={clsx('px-2 py-0.5 rounded text-[11px] font-bold uppercase border tracking-wide',
                                                        roleDef?.colorClass || 'bg-slate-50 text-slate-600 border-slate-200')}>
                                                        {roleDef?.label || user.role}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-500 text-xs">{teamName || <span className="text-slate-300">—</span>}</td>
                                                <td className="px-5 py-3.5 text-slate-500 text-xs tabular-nums">{formatDate(user.lastLogin)}</td>
                                                <td className="px-5 py-3.5">
                                                    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold border',
                                                        user.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200')}>
                                                        {user.isActive ? 'Aktif' : 'Nonaktif'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg text-xs font-semibold transition-all shadow-sm">
                                                            <Edit3 className="w-3 h-3" /> Edit
                                                        </button>
                                                        <button onClick={() => toggleActive(user.id)} disabled={isSelf}
                                                            title={isSelf ? 'Tidak dapat menonaktifkan akun sendiri' : (user.isActive ? 'Nonaktifkan' : 'Aktifkan')}
                                                            className={clsx('inline-flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-all shadow-sm',
                                                                isSelf ? 'opacity-40 cursor-not-allowed bg-white border-slate-200 text-slate-400' :
                                                                    user.isActive ? 'bg-white border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-700'
                                                                        : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700')}>
                                                            {user.isActive ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                                                            {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── ROLES TAB ── */}
            {activeTab === 'roles' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    {!isSysAdmin && (
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>Anda dapat <strong>melihat</strong> semua role. Hanya <strong>System Administrator</strong> yang dapat membuat atau menghapus role kustom.</span>
                        </div>
                    )}

                    <div className="grid gap-3">
                        {roles.map(role => {
                            const userCount = users.filter(u => u.role === role.value).length;
                            const isExpanded = expandedRole === role.id;
                            return (
                                <div key={role.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <button
                                        onClick={() => setExpandedRole(isExpanded ? null : role.id)}
                                        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors">
                                        <div className={clsx('w-2.5 h-2.5 rounded-full shrink-0',
                                            COLOR_PRESETS.find(p => p.cls === role.colorClass)?.preview || 'bg-slate-400')} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={clsx('px-2 py-0.5 rounded text-[11px] font-bold uppercase border tracking-wide', role.colorClass)}>
                                                    {role.label}
                                                </span>
                                                <span className="text-xs text-slate-400 font-mono">{role.value}</span>
                                                {role.isSystem && (
                                                    <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wide">Built-in</span>
                                                )}
                                                {!role.isSystem && (
                                                    <span className="text-[10px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wide">Kustom</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">{role.description || 'Tidak ada deskripsi.'}</p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-xs text-slate-400 tabular-nums">{userCount} user{userCount !== 1 ? 's' : ''}</span>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-5 pb-4 border-t border-slate-100 pt-3 space-y-3 animate-in fade-in duration-150">
                                            <div className="text-sm text-slate-600">
                                                <p className="font-semibold text-slate-700 mb-1 text-xs uppercase tracking-wide">Deskripsi</p>
                                                <p>{role.description || <span className="text-slate-400 italic">Tidak ada deskripsi.</span>}</p>
                                            </div>

                                            {userCount > 0 && (
                                                <div>
                                                    <p className="font-semibold text-slate-700 mb-2 text-xs uppercase tracking-wide">User dengan role ini</p>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {users.filter(u => u.role === role.value).map(u => (
                                                            <span key={u.id} className={clsx(
                                                                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border',
                                                                u.isActive ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                                                            )}>
                                                                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">{u.name.charAt(0)}</span>
                                                                {u.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {isSysAdmin && !role.isSystem && (
                                                <div className="flex justify-end pt-1">
                                                    <button onClick={() => handleDeleteRole(role.id)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold rounded-lg transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5" /> Hapus Role
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modals */}
            <UserModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                editingUser={editingUser}
                currentUserId={currentUser.id}
                availableRoles={roles}
            />
            <RoleModal
                isOpen={isRoleModalOpen}
                onClose={() => setIsRoleModalOpen(false)}
                onSave={newRole => setRoles(prev => [...prev, newRole])}
            />
        </div>
    );
};

export default UserManagement;
