import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, FileText, CheckCircle2, UserPlus, 
    Calculator, Building2, AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { workOrders, teams, people, type WorkOrder } from '../data/mockData';
import clsx from 'clsx';

const WorkOrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    if (!currentUser) return null;
    
    // Simulate DB state for this WO
    const [wo, setWo] = useState<WorkOrder | undefined>(workOrders.find(w => w.id === id));
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [pemberiTugas, setPemberiTugas] = useState('');

    // Site Proposal Form State
    const [siteName, setSiteName] = useState('');
    const [namaPekerjaan, setNamaPekerjaan] = useState('');
    const [hargaPengajuan, setHargaPengajuan] = useState<number>(0);
    const [tglStart, setTglStart] = useState('');
    const [tglEnd, setTglEnd] = useState('');
    
    if (!wo) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <p className="text-slate-500 mb-4">Work Order not found.</p>
                <button onClick={() => navigate('/work-orders')} className="text-blue-600 hover:underline">
                    Back to Work Orders
                </button>
            </div>
        );
    }

    const assignedTeam = teams.find(t => t.id === wo.assignedTeamId);
    const teamLeader = assignedTeam?.members?.find(m => (m as any).role === 'team_leader' || m.jabatan === 'Leader');
    const leaderPerson = people.find(p => p.id === teamLeader?.person_id);

    const isManagementOrAdmin = ['management', 'backoffice_admin'].includes(currentUser.role);
    const isTeamLeader = (currentUser.role as any) === 'team_leader' && leaderPerson?.id === currentUser.id;

    // --- Actions ---

    const handleAssignTeam = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeam) return;
        setWo({ ...wo, status: 'Assigned', assignedTeamId: selectedTeam });
        setIsAssigning(false);
        alert('Simulasi: Tim berhasil ditugaskan. Notifikasi dikirim ke Team Leader.');
    };

    const handleCalculateHarga = () => {
        setHargaPengajuan(wo.nilaiWo * 0.7);
    };

    const handleSubmitSiteProposal = (e: React.FormEvent) => {
        e.preventDefault();
        setWo({ ...wo, status: 'Pending SPK Approval' });
        alert('Simulasi: Pengajuan Site berhasil dikirim ke Management.');
    };

    const handleApproveProposal = () => {
        setWo({ ...wo, status: 'SPK Created' });
        alert('Simulasi: Pengajuan disetujui, SPK berhasil digenerate, Site dibuat otomatis.');
        navigate('/projects'); // Navigate back or to the new project
    };
    
    const handleRejectProposal = () => {
        setWo({ ...wo, status: 'Assigned' });
        alert('Simulasi: Pengajuan ditolak, dikembalikan ke Team Leader.');
    };

    // --- Render Helpers ---

    const getStatusBadge = (status: WorkOrder['status']) => {
        switch(status) {
            case 'Unassigned': return 'bg-slate-100 text-slate-700 border-slate-200';
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

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            
            {/* Header */}
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/work-orders')}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-800"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-800">{wo.woNumber}</h1>
                        <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-semibold border", getStatusBadge(wo.status))}>
                            {wo.status}
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-0.5">{wo.pemberiKerja} · {wo.lokasi}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: 1. Information & 2. Assignment */}
                <div className="lg:col-span-1 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col h-min">
                    
                    {/* SECTION 1: WO Information */}
                    <div className="p-5 border-b border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                Informasi WO
                            </h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase">Tipe Pekerjaan</p>
                                <p className="text-sm font-semibold text-slate-800">{wo.tipe}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase">Scope of Work</p>
                                <p className="text-sm text-slate-700 mt-1">{wo.scopeOfWork}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase">Target Date</p>
                                    <p className="text-sm text-slate-700">{wo.targetDate}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase">Nomor Kontrak</p>
                                    <p className="text-sm text-slate-700 truncate">{wo.nomorKontrak}</p>
                                </div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <p className="text-xs font-medium text-slate-500 uppercase mb-1">Nilai WO / Maks Budget</p>
                                <p className="text-lg font-bold text-slate-800">Rp {wo.nilaiWo.toLocaleString('id-ID')}</p>
                            </div>
                            <button className="w-full flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 py-2 rounded-lg transition-colors border border-blue-100">
                                <FileText className="w-4 h-4" />
                                Download Dokumen WO
                            </button>
                        </div>
                    </div>

                    {/* SECTION 2: Team Assignment */}
                    <div className="p-5 bg-slate-50/50">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <UserPlus className="w-4 h-4 text-emerald-600" />
                            Penugasan Tim
                        </h2>

                        {wo.status === 'Unassigned' ? (
                            isManagementOrAdmin ? (
                                isAssigning ? (
                                    <form onSubmit={handleAssignTeam} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Pilih Tim Pelaksana</label>
                                            <select 
                                                required
                                                className="w-full text-sm py-1.5 px-3 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={selectedTeam}
                                                onChange={e => setSelectedTeam(e.target.value)}
                                            >
                                                <option value="" disabled>--- Pilih Tim Aktif ---</option>
                                                {teams.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1">Pemberi Tugas (Management)</label>
                                            <select 
                                                required
                                                className="w-full text-sm py-1.5 px-3 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={pemberiTugas}
                                                onChange={e => setPemberiTugas(e.target.value)}
                                            >
                                                <option value="" disabled>--- Pilih Director ---</option>
                                                {people.filter(p => p.role === 'management').map(m => (
                                                    <option key={m.id} value={m.name}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-1.5 rounded transition-colors shadow-sm">
                                                Assign & Notify
                                            </button>
                                            <button type="button" onClick={() => setIsAssigning(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 text-sm font-medium py-1.5 rounded transition-colors hover:bg-slate-50">
                                                Batal
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <button 
                                        onClick={() => setIsAssigning(true)}
                                        className="w-full flex justify-center items-center gap-2 py-2 border-2 border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium text-sm rounded-lg transition-colors"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        Assign Team Sekarang
                                    </button>
                                )
                            ) : (
                                <p className="text-sm text-slate-500 italic">WO belum di-assign. Menunggu admin/management.</p>
                            )
                        ) : (
                            // Read-only Assigned State
                            <div className="bg-white border border-slate-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-slate-500 mb-1">Tim Ditugaskan:</p>
                                <p className="text-sm font-bold text-slate-800">{assignedTeam?.name}</p>
                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                            {leaderPerson?.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">{leaderPerson?.name}</p>
                                            <p className="text-slate-500 uppercase text-[10px]">Team Leader</p>
                                        </div>
                                    </div>
                                    {isManagementOrAdmin && wo.status === 'Assigned' && (
                                        <button onClick={() => setIsAssigning(true)} className="text-[11px] text-blue-600 hover:underline font-medium">Re-assign</button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: 3. Pengajuan Site & 4. Management Review */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {wo.status === 'Unassigned' ? (
                        <div className="border border-slate-200 rounded-xl bg-white shadow-sm p-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <UserPlus className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Menunggu Penugasan</h3>
                            <p className="text-slate-500 text-sm max-w-sm mt-2">
                                Detail pengajuan site baru bisa dibuat setelah WO ini ditugaskan ke sebuah Tim Pelaksana.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* SECTION 3: Pengajuan Site */}
                            {(wo.status === 'Assigned' || wo.status === 'Pending SPK Approval' || wo.status === 'SPK Created') && (
                                <div className={clsx(
                                    "border rounded-xl shadow-sm overflow-hidden",
                                    wo.status === 'Assigned' ? 'border-blue-200 bg-white' : 'border-slate-200 bg-slate-50/50'
                                )}>
                                    <div className={clsx(
                                        "px-6 py-4 border-b flex justify-between items-center",
                                        wo.status === 'Assigned' ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100'
                                    )}>
                                        <div>
                                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                                <Building2 className={clsx("w-5 h-5", wo.status === 'Assigned' ? 'text-blue-600' : 'text-slate-500')} />
                                                Form Pengajuan Site
                                            </h2>
                                            {wo.status === 'Assigned' && <p className="text-xs text-blue-600/80 mt-0.5">Oleh Team Leader</p>}
                                        </div>
                                        {wo.status !== 'Assigned' && (
                                            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-600 rounded flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Terkirim
                                            </span>
                                        )}
                                    </div>

                                    <div className="p-6">
                                        {wo.status === 'Assigned' ? (
                                            !isTeamLeader && !isManagementOrAdmin ? (
                                                <p className="text-sm text-slate-500 italic">Menunggu Team Leader membuat pengajuan site.</p>
                                            ) : (
                                                <form onSubmit={handleSubmitSiteProposal} className="space-y-6">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Site</label>
                                                            <input type="text" required placeholder="e.g. Site 4A Sudirman" disabled={!isTeamLeader}
                                                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 text-sm disabled:bg-slate-50"
                                                                value={siteName} onChange={e => setSiteName(e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pekerjaan Spesifik</label>
                                                            <input type="text" required placeholder="e.g. Instalasi RRU & Antena" disabled={!isTeamLeader}
                                                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 text-sm disabled:bg-slate-50"
                                                                value={namaPekerjaan} onChange={e => setNamaPekerjaan(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                                                            <span>Harga Pengajuan (Rp)</span>
                                                            <button 
                                                                type="button" 
                                                                onClick={handleCalculateHarga}
                                                                disabled={!isTeamLeader}
                                                                className="text-xs text-blue-600 flex items-center gap-1 hover:underline disabled:opacity-50"
                                                            >
                                                                <Calculator className="w-3.5 h-3.5" /> Saran 70% dari nilai WO
                                                            </button>
                                                        </label>
                                                        <input type="number" required placeholder="0" disabled={!isTeamLeader}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 text-sm font-medium disabled:bg-slate-50"
                                                            value={hargaPengajuan || ''} onChange={e => setHargaPengajuan(Number(e.target.value))}
                                                        />
                                                        {hargaPengajuan > 0 && (
                                                            <p className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3" /> 
                                                                Pengajuan: {((hargaPengajuan / wo.nilaiWo) * 100).toFixed(1)}% dari batas atas WO.
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                                                        <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                            <FileText className="w-4 h-4 text-slate-500" />
                                                            Estimasi Pembayaran Termin (Otomatis berdasarkan tipe '{wo.tipe}')
                                                        </h4>
                                                        {wo.tipe === 'FILTER' ? (
                                                            <div className="space-y-2 text-sm">
                                                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                                                    <span className="text-slate-600">Termin 1 (30%)</span>
                                                                    <span className="font-medium">Rp {(hargaPengajuan * 0.3).toLocaleString('id-ID')}</span>
                                                                </div>
                                                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                                                    <span className="text-slate-600">Termin 2 (50%)</span>
                                                                    <span className="font-medium">Rp {(hargaPengajuan * 0.5).toLocaleString('id-ID')}</span>
                                                                </div>
                                                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                                                    <span className="text-slate-600">Termin 3 (10%)</span>
                                                                    <span className="font-medium">Rp {(hargaPengajuan * 0.1).toLocaleString('id-ID')}</span>
                                                                </div>
                                                                <div className="flex justify-between border-b border-slate-100 pb-1">
                                                                    <span className="text-slate-600">Termin 4 (10%)</span>
                                                                    <span className="font-medium">Rp {(hargaPengajuan * 0.1).toLocaleString('id-ID')}</span>
                                                                </div>
                                                                <div className="flex justify-between font-bold pt-1 text-slate-800">
                                                                    <span>Total</span>
                                                                    <span>Rp {hargaPengajuan.toLocaleString('id-ID')}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-slate-500 italic text-center py-2">
                                                                Estimasi termin untuk COMBAT/Lainnya akan menyesuaikan template yang berlaku pada step pengerjaan. Pastikan harga total valid.
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Mulai (Estimasi)</label>
                                                            <input type="date" required disabled={!isTeamLeader}
                                                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 text-sm disabled:bg-slate-50"
                                                                value={tglStart} onChange={e => setTglStart(e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Selesai (Estimasi)</label>
                                                            <input type="date" required disabled={!isTeamLeader}
                                                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-blue-500 text-sm disabled:bg-slate-50"
                                                                value={tglEnd} onChange={e => setTglEnd(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    {isTeamLeader && (
                                                        <div className="flex justify-end pt-4 border-t border-slate-100">
                                                            <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm rounded-lg text-sm font-medium transition-colors">
                                                                Submit Pengajuan Site
                                                            </button>
                                                        </div>
                                                    )}
                                                </form>
                                            )
                                        ) : (
                                            // Read-only state for Submitted Proposals
                                            <div className="bg-white border rounded-lg p-5">
                                                 <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                                    <div>
                                                        <p className="text-slate-500 uppercase text-[10px] font-bold">Nama Site</p>
                                                        <p className="font-medium">{siteName || 'Site 1 Alpha - Demo'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 uppercase text-[10px] font-bold">Pekerjaan</p>
                                                        <p className="font-medium">{namaPekerjaan || 'Instalasi & Deployment'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 uppercase text-[10px] font-bold">Total Harga Pengajuan</p>
                                                        <p className="font-bold text-slate-800 text-lg">Rp {(hargaPengajuan || wo.nilaiWo*0.7).toLocaleString('id-ID')}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-500 uppercase text-[10px] font-bold">Periode</p>
                                                        <p className="font-medium">{tglStart || '2024-03-01'} sd {tglEnd || '2024-04-30'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SECTION 4: Management Review */}
                            {wo.status === 'Pending SPK Approval' && isManagementOrAdmin && (
                                <div className="border border-amber-200 rounded-xl bg-orange-50/30 shadow-sm overflow-hidden mt-6">
                                     <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between">
                                        <h2 className="font-bold text-amber-800 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5 text-amber-600" />
                                            Review Management
                                        </h2>
                                     </div>
                                     <div className="p-6">
                                         <p className="text-sm text-slate-700 mb-4">
                                             Team Leader telah mengajukan site baru untuk Work Order ini dengan nilai <strong>Rp {(hargaPengajuan || wo.nilaiWo*0.7).toLocaleString('id-ID')}</strong>. 
                                             Silakan review data di atas. Jika disetujui, sistem akan otomatis men-generate SPK dan membuka akses termin pencairan.
                                         </p>

                                         <div className="flex gap-3 mt-6 pt-4 border-t border-amber-100">
                                            <button 
                                                onClick={handleApproveProposal}
                                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm text-white font-medium rounded-lg text-sm transition-colors"
                                            >
                                                Setujui & Buat SPK
                                            </button>
                                            <button 
                                                onClick={handleRejectProposal}
                                                className="px-6 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium rounded-lg text-sm transition-colors"
                                            >
                                                Tolak Pengajuan
                                            </button>
                                         </div>
                                     </div>
                                </div>
                            )}
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default WorkOrderDetail;
