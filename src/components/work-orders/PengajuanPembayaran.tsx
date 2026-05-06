import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, XCircle, Send, FileText, Upload, AlertCircle, Landmark } from 'lucide-react';
import clsx from 'clsx';
import { terminPengajuanRecords } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db';

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-700',
  paid:      'bg-purple-100 text-purple-700',
};

const TERMIN_KEYS = ['T1', 'T2a', 'T2b', 'T2c', 'T3', 'T4', 'Biaya Perizinan', 'Transportasi', 'Material Tambahan', 'Sewa Alat', 'Lainnya'];

interface Props {
  siteId: string;
}

export const PengajuanPembayaran = ({ siteId }: Props) => {
  const { currentUser, can } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [form, setForm] = useState({
    termin_key: 'T1',
    nominal: '',
    deskripsi: '',
    bank_name: '',
    account_number: '',
    account_holder: ''
  });

  // Popup notifications state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showToastMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => {
      setToast(t => ({ ...t, show: false }));
    }, 4000);
  };

  // Load payment requests directly from SurrealDB
  const reloadData = async () => {
    try {
      const res = await db.query('SELECT * FROM payment_requests WHERE site_id = $id ORDER BY submitted_at DESC', { id: siteId });
      if (res && res[0] && Array.isArray(res[0]) && res[0].length > 0) {
        setRecords(res[0]);
      } else {
        // Fallback or Initial seed
        const initial = terminPengajuanRecords.filter(t => t.site_id === siteId);
        setRecords(initial);
      }
    } catch (err) {
      console.error('Failed to load payment requests from DB, using fallback:', err);
      const initial = terminPengajuanRecords.filter(t => t.site_id === siteId);
      setRecords(initial);
    }
  };

  useEffect(() => {
    reloadData();
  }, [siteId]);

  const createStageLog = async (actionText: string) => {
    try {
      let workOrderId = '';
      try {
        const woRes = await db.query('SELECT id FROM atp_work_orders WHERE site_id = $site LIMIT 1', { site: siteId });
        if (woRes?.[0] && Array.isArray(woRes[0]) && woRes[0].length > 0) {
          workOrderId = woRes[0][0].id;
        }
      } catch (e) {
        console.error('Failed to lookup active work order for log:', e);
      }

      const logData = {
        site_id: siteId,
        work_order_id: workOrderId || 'system',
        action: actionText,
        user_id: currentUser?.name || currentUser?.id || 'system',
        timestamp: new Date().toISOString()
      };
      await db.query('CREATE site_stage_logs CONTENT $data', { data: logData });
    } catch (err) {
      console.error('Failed to write site log:', err);
    }
  };

  const handleSubmit = async () => {
    if (!form.nominal) {
      showToastMsg('Nominal wajib diisi!', 'error');
      return;
    }

    const payload = {
      site_id: siteId,
      termin_key: form.termin_key,
      nominal: Number(form.nominal),
      deskripsi: form.deskripsi,
      bank_name: form.bank_name,
      account_number: form.account_number,
      account_holder: form.account_holder,
      status: 'submitted',
      submitted_by: currentUser?.name || currentUser?.id || 'system',
      submitted_at: new Date().toISOString(),
      documents: []
    };

    try {
      await db.query('CREATE payment_requests CONTENT $data', { data: payload });
      await createStageLog(`Mengajukan pembayaran Termin ${form.termin_key} sebesar Rp ${Number(form.nominal).toLocaleString('id-ID')}`);
      showToastMsg('Pengajuan pembayaran berhasil diajukan!');
      reloadData();
    } catch (err) {
      console.error('Failed to create payment_request in DB:', err);
      const mockRecord = { id: `tp-${Date.now()}`, ...payload };
      terminPengajuanRecords.push(mockRecord as any);
      setRecords(terminPengajuanRecords.filter(t => t.site_id === siteId));
      showToastMsg('Pengajuan pembayaran berhasil diajukan (offline mode)!');
    }

    setShowForm(false);
    setForm({
      termin_key: 'T1',
      nominal: '',
      deskripsi: '',
      bank_name: '',
      account_number: '',
      account_holder: ''
    });
  };

  const handleApprove = async (id: string) => {
    const req = records.find(r => r.id === id);
    const info = req ? ` Termin ${req.termin_key} (Rp ${req.nominal.toLocaleString('id-ID')})` : '';
    try {
      await db.query('UPDATE payment_requests SET status = "approved", approved_by = $user, approved_at = $time WHERE id = $id', {
        user: currentUser?.name || currentUser?.id || 'system',
        time: new Date().toISOString(),
        id
      });
      await createStageLog(`Menyetujui pengajuan pembayaran${info}`);
      showToastMsg('Pengajuan pembayaran disetujui!');
      reloadData();
    } catch (err) {
      console.error('Failed to approve:', err);
      const r = terminPengajuanRecords.find(t => t.id === id);
      if (r) {
        r.status = 'approved';
        r.approved_by = currentUser?.name || currentUser?.id;
        r.approved_at = new Date().toISOString();
      }
      setRecords([...terminPengajuanRecords.filter(t => t.site_id === siteId)]);
      showToastMsg('Pengajuan pembayaran disetujui (offline mode)!');
    }
  };

  const handleReject = async (id: string) => {
    const req = records.find(r => r.id === id);
    const info = req ? ` Termin ${req.termin_key} (Rp ${req.nominal.toLocaleString('id-ID')})` : '';
    try {
      await db.query('UPDATE payment_requests SET status = "rejected" WHERE id = $id', { id });
      await createStageLog(`Menolak pengajuan pembayaran${info}`);
      showToastMsg('Pengajuan pembayaran ditolak.', 'error');
      reloadData();
    } catch (err) {
      console.error('Failed to reject:', err);
      const r = terminPengajuanRecords.find(t => t.id === id);
      if (r) r.status = 'rejected';
      setRecords([...terminPengajuanRecords.filter(t => t.site_id === siteId)]);
      showToastMsg('Pengajuan pembayaran ditolak (offline mode).', 'error');
    }
  };

  const handleMarkPaidWithFile = async (id: string, files: FileList | null) => {
    if (!files || files.length === 0) {
      showToastMsg('Gagal mengunggah bukti pembayaran!', 'error');
      return;
    }
    const file = files[0];
    const req = records.find(r => r.id === id);
    const info = req ? ` Termin ${req.termin_key} (Rp ${req.nominal.toLocaleString('id-ID')})` : '';

    try {
      await db.query('UPDATE payment_requests SET status = "paid", bukti_pembayaran_name = $file, paid_at = $time WHERE id = $id', {
        file: file.name,
        time: new Date().toISOString(),
        id
      });
      await createStageLog(`Menyelesaikan pembayaran${info} dengan bukti transfer: "${file.name}"`);
      showToastMsg(`Sukses mengunggah bukti pembayaran: "${file.name}" & lunas!`);
      reloadData();
    } catch (err) {
      console.error('Failed to mark paid:', err);
      const r = terminPengajuanRecords.find(t => t.id === id);
      if (r) {
        r.status = 'paid';
        (r as any).bukti_pembayaran_name = file.name;
        (r as any).paid_at = new Date().toISOString();
      }
      setRecords([...terminPengajuanRecords.filter(t => t.site_id === siteId)]);
      showToastMsg(`Sukses mengunggah bukti pembayaran: "${file.name}" & lunas (offline mode)!`);
    }
  };

  return (
    <div className="animate-in fade-in relative">
      {/* Visual Success/Failed Pop-up Alert Toast */}
      {toast.show && (
        <div className={clsx(
          "fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border animate-in slide-in-from-top-4 duration-300",
          toast.type === 'success' 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-red-50 text-red-800 border-red-200"
        )}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="text-sm font-bold tracking-tight">{toast.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black text-slate-800">Pengajuan Pembayaran</h2>
        {can('financial.submit_pengajuan') && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajukan Pembayaran
          </button>
        )}
      </div>

      {/* Create form — operational/admin only with Rekening info */}
      {showForm && can('financial.submit_pengajuan') && (
        <div className="mb-6 p-5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-blue-900">Form Pengajuan Baru &amp; Informasi Rekening</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Termin</label>
              <select value={form.termin_key} onChange={e => setForm(f => ({ ...f, termin_key: e.target.value }))}
                className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-white">
                {TERMIN_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nominal (Rp)</label>
              <input type="number" value={form.nominal} onChange={e => setForm(f => ({ ...f, nominal: e.target.value }))}
                placeholder="0" className="w-full text-sm p-2 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Deskripsi / Sektor</label>
              <input type="text" value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
                placeholder="Keterangan..." className="w-full text-sm p-2 border border-slate-200 rounded-lg" />
            </div>
          </div>

          <div className="pt-3 border-t border-blue-100">
            <p className="text-xs font-black text-blue-900 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" /> Informasi Rekening Penerima (Penting)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nama Bank</label>
                <input type="text" value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                  placeholder="Contoh: Bank Mandiri, BCA..." className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nomor Rekening</label>
                <input type="text" value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))}
                  placeholder="Contoh: 124000987xxx" className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nama Pemilik Rekening</label>
                <input type="text" value={form.account_holder} onChange={e => setForm(f => ({ ...f, account_holder: e.target.value }))}
                  placeholder="Nama sesuai buku tabungan..." className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-white" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold border border-slate-300 rounded-lg hover:bg-slate-50 bg-white">Batal</button>
            <button onClick={handleSubmit} className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Send className="w-4 h-4" /> Submit Pengajuan
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-slate-200">Termin</th>
              <th className="px-4 py-3 font-bold border-b border-slate-200">Nominal</th>
              <th className="px-4 py-3 font-bold border-b border-slate-200">Status &amp; Rekening</th>
              <th className="px-4 py-3 font-bold border-b border-slate-200">Submitted</th>
              <th className="px-4 py-3 font-bold border-b border-slate-200 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {records.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">Belum ada pengajuan pembayaran.</td></tr>
            )}
            {records.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4 font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> 
                    <span>{t.termin_key}</span>
                  </div>
                  {t.deskripsi && <p className="text-xs text-slate-400 font-normal mt-0.5">{t.deskripsi}</p>}
                </td>
                <td className="px-4 py-4 font-mono font-bold text-slate-600">
                  Rp {t.nominal.toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-4 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={clsx('px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider', STATUS_COLORS[t.status] || 'bg-slate-100 text-slate-600')}>
                      {t.status}
                    </span>
                    {(t as any).bukti_pembayaran_name && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-purple-500" /> Bukti Pembayaran Ada
                      </span>
                    )}
                  </div>
                  {(t as any).bank_name && (
                    <div className="text-[11px] bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-600 flex flex-col max-w-xs">
                      <span className="font-bold text-slate-700 flex items-center gap-1"><Landmark className="w-3 h-3 text-slate-400" /> {(t as any).bank_name}</span>
                      <span>No: <strong className="text-slate-800">{(t as any).account_number}</strong></span>
                      <span>An: <strong className="text-slate-800">{(t as any).account_holder}</strong></span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 text-slate-500 text-xs">
                  {new Date(t.submitted_at).toLocaleDateString('id-ID')}
                </td>
                <td className="px-4 py-4 text-right flex items-center justify-end gap-2">
                  {/* Director: approve/reject submitted */}
                  {can('financial.approve_pengajuan') && t.status === 'submitted' && (
                    <>
                      <button onClick={() => handleApprove(t.id)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleReject(t.id)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {/* Finance: mark paid after approved + Upload Bukti Pembayaran */}
                  {can('financial.mark_paid') && t.status === 'approved' && (
                    <label className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm cursor-pointer transition-colors">
                      <input type="file" className="hidden" onChange={e => handleMarkPaidWithFile(t.id, e.target.files)} />
                      <Upload className="w-3.5 h-3.5" /> Upload Bukti &amp; Bayar
                    </label>
                  )}
                  {t.status === 'paid' && (
                    <span className="text-xs text-purple-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Terbayar Lunas
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role hint */}
      <div className="mt-4 flex items-start gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500">
        <Landmark className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
        <span>
          <strong>Operational/Admin:</strong> mengajukan termin &amp; rekening info. &nbsp;
          <strong>Director:</strong> menyetujui / menolak pembayaran. &nbsp;
          <strong>Finance:</strong> upload bukti pembayaran dan bayar.
        </span>
      </div>
    </div>
  );
};
