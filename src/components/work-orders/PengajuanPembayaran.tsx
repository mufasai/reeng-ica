/**
 * PengajuanPembayaran — role-based payment request panel inside ATP workspace.
 *
 * Roles:
 *  - operational / admin : create pengajuan (submit)
 *  - director            : approve or reject pengajuan
 *  - finance             : mark as paid / send receipt
 */
import { useState } from 'react';
import { Plus, CheckCircle2, XCircle, Banknote, Send, FileText } from 'lucide-react';
import clsx from 'clsx';
import { terminPengajuanRecords } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

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
  const [form, setForm] = useState({ termin_key: 'T1', nominal: '', deskripsi: '' });

  const records = terminPengajuanRecords.filter(t => t.site_id === siteId);

  const handleSubmit = () => {
    if (!form.nominal) return;
    terminPengajuanRecords.push({
      id: `tp-${Date.now()}`,
      site_id: siteId,
      termin_key: form.termin_key as any,
      nominal: Number(form.nominal),
      deskripsi: form.deskripsi,
      status: 'submitted',
      submitted_by: currentUser?.id || 'system',
      submitted_at: new Date().toISOString(),
      documents: [],
    });
    setShowForm(false);
    setForm({ termin_key: 'T1', nominal: '', deskripsi: '' });
  };

  const handleApprove = (id: string) => {
    const r = terminPengajuanRecords.find(t => t.id === id);
    if (r) { r.status = 'approved'; r.approved_by = currentUser?.id; r.approved_at = new Date().toISOString(); }
  };

  const handleReject = (id: string) => {
    const r = terminPengajuanRecords.find(t => t.id === id);
    if (r) { r.status = 'rejected'; }
  };

  const handleMarkPaid = (id: string) => {
    const r = terminPengajuanRecords.find(t => t.id === id);
    if (r) { r.status = 'paid'; }
  };

  return (
    <div className="animate-in fade-in">
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

      {/* Create form — operational/admin only */}
      {showForm && can('financial.submit_pengajuan') && (
        <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-blue-900">Form Pengajuan Baru</h3>
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
              <label className="block text-xs font-bold text-slate-600 mb-1">Deskripsi</label>
              <input type="text" value={form.deskripsi} onChange={e => setForm(f => ({ ...f, deskripsi: e.target.value }))}
                placeholder="Keterangan..." className="w-full text-sm p-2 border border-slate-200 rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold border border-slate-300 rounded-lg hover:bg-slate-50">Batal</button>
            <button onClick={handleSubmit} className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Send className="w-4 h-4" /> Submit Pengajuan
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-slate-200">Termin</th>
              <th className="px-4 py-3 font-bold border-b border-slate-200">Nominal</th>
              <th className="px-4 py-3 font-bold border-b border-slate-200">Status</th>
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
                <td className="px-4 py-4 font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" /> {t.termin_key}
                </td>
                <td className="px-4 py-4 font-mono font-bold text-slate-600">
                  Rp {t.nominal.toLocaleString('id-ID')}
                </td>
                <td className="px-4 py-4">
                  <span className={clsx('px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider', STATUS_COLORS[t.status] || 'bg-slate-100 text-slate-600')}>
                    {t.status}
                  </span>
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
                  {/* Finance: mark paid after approved */}
                  {can('financial.mark_paid') && t.status === 'approved' && (
                    <button onClick={() => handleMarkPaid(t.id)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100">
                      <Banknote className="w-3.5 h-3.5" /> Tandai Lunas
                    </button>
                  )}
                  {t.status === 'paid' && (
                    <span className="text-xs text-purple-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Lunas
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
        <Banknote className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Operational/Admin:</strong> dapat mengajukan pembayaran. &nbsp;
          <strong>Director:</strong> approve/reject. &nbsp;
          <strong>Finance:</strong> kirim bukti & tandai lunas.
        </span>
      </div>
    </div>
  );
};
