import { useState, useEffect, useMemo } from 'react';
import { Plus, CheckCircle2, XCircle, Send, FileText, Upload, AlertCircle, Landmark, Eye, TrendingUp, Clock, Banknote, Trash2, Pencil } from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../../context/AuthContext';
import { db } from '../../db';

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-700',
  paid:      'bg-purple-100 text-purple-700',
};

const STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  submitted: 'Diajukan',
  approved:  'Disetujui',
  rejected:  'Ditolak',
  paid:      'Terbayar',
};

const TERMIN_KEYS = ['T1', 'T2a', 'T2b', 'T2c', 'T3', 'T4', 'Biaya Perizinan', 'Transportasi', 'Material Tambahan', 'Sewa Alat', 'Lainnya'];

const fmtRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

interface Props {
  siteId: string;
  siteRecordId?: string;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const PengajuanPembayaran = ({ siteId, siteRecordId }: Props) => {
  const { currentUser, can } = useAuth();
  const [showForm, setShowForm] = useState(false);
// Replaced state
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    termin_key: 'T1',
    nominal: '',
    deskripsi: '',
    bank_name: '',
    account_number: '',
    account_holder: ''
  });

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false, message: '', type: 'success'
  });

  const [records, setRecords] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    termin_key: '', nominal: '', deskripsi: '', bank_name: '', account_number: '', account_holder: ''
  });

  const fetchRecords = async () => {
    try {
      // Fetch matching string ID or surrealdb ID
      const queryStr = `SELECT * FROM pengajuan WHERE site_id = $siteId OR site_record_id = $siteRecordId ORDER BY submitted_at ASC`;
      const res = await db.query(queryStr, { 
        siteId, 
        siteRecordId: siteRecordId || siteId 
      });
      if (res?.[0] && Array.isArray(res[0])) {
        setRecords(res[0]);
      } else {
        setRecords([]);
      }
    } catch (err) {
      console.error('Failed to fetch pengajuan:', err);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [siteId]);

  const summary = useMemo(() => {
    const diajukan = records.filter(r => r.status === 'submitted');
    const disetujui = records.filter(r => r.status === 'approved');
    const terbayar = records.filter(r => r.status === 'paid');
    return {
      totalDiajukan: diajukan.reduce((s, r) => s + r.nominal, 0),
      countDiajukan: diajukan.length,
      totalDisetujui: disetujui.reduce((s, r) => s + r.nominal, 0),
      countDisetujui: disetujui.length,
      totalTerbayar: terbayar.reduce((s, r) => s + r.nominal, 0),
      countTerbayar: terbayar.length,
    };
  }, [records]);

  const showToastMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 4000);
  };

  const handleSubmit = async () => {
    if (!form.nominal || Number(form.nominal) <= 0) {
      showToastMsg('Nominal wajib diisi!', 'error');
      return;
    }
    setIsSaving(true);
    const newRecord = {
      site_id: siteId,
      site_record_id: siteRecordId || siteId,
      termin_ke: form.termin_key,
      termin_key: form.termin_key,
      jumlah: Number(form.nominal),
      nominal: Number(form.nominal),
      keterangan: form.deskripsi || undefined,
      deskripsi: form.deskripsi || undefined,
      bank_name: form.bank_name || undefined,
      account_number: form.account_number || undefined,
      account_holder: form.account_holder || undefined,
      status: 'submitted',
      submitted_by: currentUser?.name || 'Operational',
      submitted_at: new Date().toISOString(),
      history: [{ action: 'submitted', by: currentUser?.name || 'Operational', at: new Date().toISOString() }],
    };
    
    try {
      await db.query('CREATE pengajuan CONTENT $data', { data: newRecord });
      await fetchRecords();
      setShowForm(false);
      setForm({ termin_key: 'T1', nominal: '', deskripsi: '', bank_name: '', account_number: '', account_holder: '' });
      showToastMsg('Pengajuan berhasil dikirim.');
    } catch (err) {
      console.error(err);
      showToastMsg('Gagal mengirim pengajuan.', 'error');
    }
    setIsSaving(false);
  };

  const handleApprove = async (id: string) => {
    setIsSaving(true);
    try {
      const rec = records.find(r => r.id === id);
      const newHistory = [...(rec?.history || []), { action: 'approved', by: currentUser?.name || 'Director', at: new Date().toISOString() }];
      await db.query('UPDATE type::thing($id) MERGE { status: "approved", approved_by: $by, approved_at: $at, history: $history }', {
        id, by: currentUser?.name || 'Director', at: new Date().toISOString(), history: newHistory
      });
      await fetchRecords();
      showToastMsg('Pengajuan disetujui.');
    } catch (err) {
      console.error(err);
      showToastMsg('Gagal menyetujui pengajuan.', 'error');
    }
    setIsSaving(false);
  };

  const handleReject = async (id: string) => {
    setIsSaving(true);
    try {
      const rec = records.find(r => r.id === id);
      const newHistory = [...(rec?.history || []), { action: 'rejected', by: currentUser?.name || 'Director', at: new Date().toISOString() }];
      await db.query('UPDATE type::thing($id) MERGE { status: "rejected", history: $history }', {
        id, history: newHistory
      });
      await fetchRecords();
      showToastMsg('Pengajuan ditolak.');
    } catch (err) {
      console.error(err);
      showToastMsg('Gagal menolak pengajuan.', 'error');
    }
    setIsSaving(false);
  };

  const handleMarkPaidWithFile = async (id: string, files: FileList | null) => {
    if (!files || files.length === 0) {
      showToastMsg('Pilih file bukti pembayaran terlebih dahulu!', 'error');
      return;
    }
    const file = files[0];
    setIsSaving(true);
    
    try {
      const base64Data = await fileToBase64(file);
      const rec = records.find(r => r.id === id);
      const newHistory = [...(rec?.history || []), { action: 'paid', by: currentUser?.name || 'Finance', at: new Date().toISOString() }];
      
      // Save file to site_files so export script can pick it up!
      const fileRecord = {
        site_id: siteId,
        site_record_id: siteRecordId || siteId,
        pengajuan_id: id,
        filename: file.name,
        mime_type: file.type || 'image/jpeg',
        tag: 'bukti_bayar',
        file_data: base64Data,
        file_size: file.size,
        uploaded_by: currentUser?.name || 'Finance',
        uploaded_at: new Date().toISOString()
      };
      const createdFile = await db.query('CREATE site_files CONTENT $data', { data: fileRecord });
      const fileId = Array.isArray(createdFile?.[0]) ? createdFile[0][0]?.id : undefined;
      
      await db.query('UPDATE type::thing($id) MERGE { status: "paid", paid_at: $at, bukti_pembayaran_name: $filename, bukti_pembayaran_url: $base64Data, bukti_pembayaran_file_id: $fileId, history: $history }', {
        id, at: new Date().toISOString(), filename: file.name, base64Data, fileId, history: newHistory
      });
      
      await fetchRecords();
      showToastMsg(`Bukti bayar "${file.name}" berhasil diupload. Pembayaran selesai.`);
    } catch (err) {
      console.error(err);
      showToastMsg('Gagal mengupload bukti pembayaran.', 'error');
    }
    setIsSaving(false);
  };

  const handleDeleteBukti = async (id: string) => {
    if (!window.confirm('Apakah anda yakin ingin menghapus bukti pembayaran ini? Status pengajuan akan kembali menjadi Disetujui.')) return;
    setIsSaving(true);
    try {
      const rec = records.find(r => r.id === id);
      if (rec?.bukti_pembayaran_file_id) {
        await db.query('DELETE type::thing($fileId)', { fileId: rec.bukti_pembayaran_file_id });
      } else {
        // Fallback: delete any site_files linked to this pengajuan
        await db.query('DELETE site_files WHERE pengajuan_id = $id', { id });
      }
      
      const newHistory = [...(rec?.history || []), { action: 'bukti_deleted', by: currentUser?.name || 'Finance', at: new Date().toISOString() }];
      await db.query('UPDATE type::thing($id) UNSET bukti_pembayaran_url, bukti_pembayaran_name, bukti_pembayaran_file_id, paid_at MERGE { status: "approved", history: $history }', {
        id, history: newHistory
      });
      
      await fetchRecords();
      showToastMsg('Bukti pembayaran berhasil dihapus.', 'success');
    } catch (err) {
      console.error(err);
      showToastMsg('Gagal menghapus bukti pembayaran.', 'error');
    }
    setIsSaving(false);
  };

  const handleEditBuktiName = async (id: string, currentName: string) => {
    const newName = window.prompt('Ubah nama file bukti pembayaran:', currentName);
    if (!newName || newName === currentName) return;
    setIsSaving(true);
    try {
      const rec = records.find(r => r.id === id);
      if (rec?.bukti_pembayaran_file_id) {
        await db.query('UPDATE type::thing($fileId) MERGE { filename: $newName }', { fileId: rec.bukti_pembayaran_file_id, newName });
      }
      
      const newHistory = [...(rec?.history || []), { action: 'bukti_renamed', by: currentUser?.name || 'Finance', at: new Date().toISOString() }];
      await db.query('UPDATE type::thing($id) MERGE { bukti_pembayaran_name: $newName, history: $history }', {
        id, newName, history: newHistory
      });
      
      await fetchRecords();
      showToastMsg('Nama file bukti pembayaran berhasil diubah.', 'success');
    } catch (err) {
      console.error(err);
      showToastMsg('Gagal mengubah nama file.', 'error');
    }
    setIsSaving(false);
  };

  const handleDeletePengajuan = async (id: string, status: string) => {
    if (status === 'approved' || status === 'paid') {
      showToastMsg('Tidak bisa menghapus pengajuan yang sudah disetujui atau dibayar.', 'error');
      return;
    }
    if (!window.confirm('Apakah anda yakin ingin menghapus pengajuan ini? Tindakan ini tidak dapat dibatalkan.')) return;
    setIsSaving(true);
    try {
      // Also delete any linked site_files (bukti bayar)
      await db.query('DELETE site_files WHERE pengajuan_id = $id', { id });
      await db.query('DELETE type::thing($id)', { id });
      setRecords(prev => prev.filter(r => String(r.id) !== String(id)));
      showToastMsg('Pengajuan berhasil dihapus.', 'success');
    } catch (err) {
      console.error(err);
      showToastMsg('Gagal menghapus pengajuan.', 'error');
    }
    setIsSaving(false);
  };

  const startEditPengajuan = (rec: any) => {
    setEditingId(String(rec.id));
    setEditForm({
      termin_key:     rec.termin_key ?? rec.termin_ke ?? '',
      nominal:        String(rec.nominal ?? rec.jumlah ?? ''),
      deskripsi:      rec.deskripsi ?? rec.keterangan ?? '',
      bank_name:      rec.bank_name ?? '',
      account_number: rec.account_number ?? '',
      account_holder: rec.account_holder ?? '',
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.nominal || Number(editForm.nominal) <= 0) {
      showToastMsg('Nominal wajib diisi!', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const rec = records.find(r => String(r.id) === String(id));
      const newHistory = [
        ...(rec?.history || []),
        { action: 'edited', by: currentUser?.name || 'Operational', at: new Date().toISOString() }
      ];
      await db.query(
        'UPDATE type::thing($id) MERGE { termin_ke: $tk, termin_key: $tk, jumlah: $jml, nominal: $jml, keterangan: $ket, deskripsi: $ket, bank_name: $bn, account_number: $an, account_holder: $ah, history: $hist }',
        {
          id,
          tk:   editForm.termin_key,
          jml:  Number(editForm.nominal),
          ket:  editForm.deskripsi,
          bn:   editForm.bank_name,
          an:   editForm.account_number,
          ah:   editForm.account_holder,
          hist: newHistory,
        }
      );
      await fetchRecords();
      setEditingId(null);
      showToastMsg('Pengajuan berhasil diperbarui.', 'success');
    } catch (err) {
      console.error(err);
      showToastMsg('Gagal menyimpan perubahan.', 'error');
    }
    setIsSaving(false);
  };

  const hasAnyRecords = records.length > 0;
  const hasMoney = summary.totalDiajukan + summary.totalDisetujui + summary.totalTerbayar > 0;

  return (
    <div className="animate-in fade-in relative space-y-5">
      {/* Toast */}
      {toast.show && (
        <div className={clsx(
          "fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border animate-in slide-in-from-top-4 duration-300",
          toast.type === 'success'
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-red-50 text-red-800 border-red-200"
        )}>
          {toast.type === 'success'
            ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
          <span className="text-sm font-bold tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
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

      {/* Financial Summary Cards — only show when there are transactions */}
      {hasMoney && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Menunggu Persetujuan</p>
              <p className="text-base font-black text-blue-800 mt-0.5">{fmtRp(summary.totalDiajukan)}</p>
              <p className="text-[11px] text-blue-500">{summary.countDiajukan} pengajuan</p>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Disetujui (Menunggu Bayar)</p>
              <p className="text-base font-black text-emerald-800 mt-0.5">{fmtRp(summary.totalDisetujui)}</p>
              <p className="text-[11px] text-emerald-500">{summary.countDisetujui} pengajuan</p>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">Total Terbayar</p>
              <p className="text-base font-black text-purple-800 mt-0.5">{fmtRp(summary.totalTerbayar)}</p>
              <p className="text-[11px] text-purple-500">{summary.countTerbayar} termin lunas</p>
            </div>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && can('financial.submit_pengajuan') && (
        <div className="p-5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-4">
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
              <Landmark className="w-3.5 h-3.5" /> Informasi Rekening Penerima
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
            <button disabled={isSaving} onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold border border-slate-300 rounded-lg hover:bg-slate-50 bg-white disabled:opacity-50">Batal</button>
            <button disabled={isSaving} onClick={handleSubmit} className="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
              <Send className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Submit Pengajuan'}
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
              <th className="px-4 py-3 font-bold border-b border-slate-200">Diajukan</th>
              <th className="px-4 py-3 font-bold border-b border-slate-200 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {!hasAnyRecords && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                  Belum ada pengajuan pembayaran untuk site ini.
                </td>
              </tr>
            )}
            {records.map(t => (
              <>
                <tr key={t.id} className={clsx('hover:bg-slate-50 transition-colors', editingId === String(t.id) && 'bg-blue-50/50')}>
                  <td className="px-4 py-4 font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>{t.termin_key ?? t.termin_ke}</span>
                    </div>
                    {(t.deskripsi || t.keterangan) && <p className="text-xs text-slate-400 font-normal mt-0.5">{t.deskripsi ?? t.keterangan}</p>}
                  </td>
                  <td className="px-4 py-4 font-mono font-bold text-slate-600">
                    {fmtRp(t.nominal ?? t.jumlah ?? 0)}
                  </td>
                  <td className="px-4 py-4 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={clsx('px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider', STATUS_COLORS[t.status] || 'bg-slate-100 text-slate-600')}>
                        {STATUS_LABELS[t.status] || t.status}
                      </span>
                      {t.bukti_pembayaran_name && (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-purple-500" /> Bukti Ada
                        </span>
                      )}
                    </div>
                    {t.bank_name && (
                      <div className="text-[11px] bg-slate-50 border border-slate-200 rounded p-1.5 text-slate-600 flex flex-col max-w-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1">
                          <Landmark className="w-3 h-3 text-slate-400" /> {t.bank_name}
                        </span>
                        {t.account_number && <span>No: <strong className="text-slate-800">{t.account_number}</strong></span>}
                        {t.account_holder && <span>An: <strong className="text-slate-800">{t.account_holder}</strong></span>}
                      </div>
                    )}
                    {t.paid_at && (
                      <p className="text-[11px] text-purple-600">
                        Lunas: {new Date(t.paid_at).toLocaleDateString('id-ID')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-500 text-xs">
                    <div>{t.submitted_at ? new Date(t.submitted_at).toLocaleDateString('id-ID') : '—'}</div>
                    <div className="text-slate-400 mt-0.5">{t.submitted_by}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {/* Director: approve / reject */}
                      {can('financial.approve_pengajuan') && t.status === 'submitted' && (
                        <>
                          <button disabled={isSaving} onClick={() => handleApprove(t.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Setuju
                          </button>
                          <button disabled={isSaving} onClick={() => handleReject(t.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50">
                            <XCircle className="w-3.5 h-3.5" /> Tolak
                          </button>
                        </>
                      )}
                      {/* Finance: upload bukti & bayar */}
                      {can('financial.mark_paid') && t.status === 'approved' && (
                        <label className={clsx(
                          "flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer",
                          isSaving && "opacity-50 pointer-events-none"
                        )}>
                          <input disabled={isSaving} type="file" accept="image/*,application/pdf" className="hidden"
                            onChange={e => handleMarkPaidWithFile(t.id, e.target.files)} />
                          <Upload className="w-3.5 h-3.5" /> Upload Bukti & Bayar
                        </label>
                      )}
                      {/* Lihat Bukti Pembayaran */}
                      {t.bukti_pembayaran_url && (
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-sm">
                          <a href={t.bukti_pembayaran_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 hover:text-blue-600 transition-colors rounded-md"
                            title={t.bukti_pembayaran_name}>
                            <Eye className="w-3.5 h-3.5" /> Lihat Bukti
                          </a>
                          {can('financial.mark_paid') && (
                            <>
                              <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                              <button disabled={isSaving} onClick={() => handleEditBuktiName(t.id, t.bukti_pembayaran_name || '')}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50" title="Edit nama file">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button disabled={isSaving} onClick={() => handleDeleteBukti(t.id)}
                                className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50" title="Hapus bukti">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {t.status === 'paid' && !t.bukti_pembayaran_url && (
                        <span className="text-xs text-purple-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terbayar Lunas
                        </span>
                      )}
                      {t.status === 'rejected' && (
                        <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Ditolak
                        </span>
                      )}
                      {/* Operational: edit & delete (only on editable statuses) */}
                      {can('financial.submit_pengajuan') && ['submitted', 'draft', 'rejected'].includes(t.status) && (
                        <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                          <button
                            disabled={isSaving}
                            onClick={() => editingId === String(t.id) ? setEditingId(null) : startEditPengajuan(t)}
                            className={clsx(
                              'p-1.5 rounded-lg transition-colors disabled:opacity-50 text-xs font-bold flex items-center gap-1',
                              editingId === String(t.id)
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                            )}
                            title="Edit pengajuan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={isSaving}
                            onClick={() => handleDeletePengajuan(String(t.id), t.status)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Hapus pengajuan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                {/* Inline edit row */}
                {editingId === String(t.id) && (
                  <tr key={`edit-${t.id}`} className="bg-blue-50 border-t border-blue-100">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="space-y-3">
                        <p className="text-xs font-black text-blue-800 uppercase tracking-wider">Edit Pengajuan</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Termin</label>
                            <select value={editForm.termin_key} onChange={e => setEditForm(f => ({ ...f, termin_key: e.target.value }))}
                              className="w-full text-sm p-2 border border-slate-200 rounded-lg bg-white">
                              {TERMIN_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Nominal (Rp)</label>
                            <input type="number" value={editForm.nominal} onChange={e => setEditForm(f => ({ ...f, nominal: e.target.value }))}
                              className="w-full text-sm p-2 border border-slate-200 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Deskripsi</label>
                            <input type="text" value={editForm.deskripsi} onChange={e => setEditForm(f => ({ ...f, deskripsi: e.target.value }))}
                              className="w-full text-sm p-2 border border-slate-200 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Nama Bank</label>
                            <input type="text" value={editForm.bank_name} onChange={e => setEditForm(f => ({ ...f, bank_name: e.target.value }))}
                              className="w-full text-sm p-2 border border-slate-200 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">No. Rekening</label>
                            <input type="text" value={editForm.account_number} onChange={e => setEditForm(f => ({ ...f, account_number: e.target.value }))}
                              className="w-full text-sm p-2 border border-slate-200 rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Nama Pemilik Rekening</label>
                            <input type="text" value={editForm.account_holder} onChange={e => setEditForm(f => ({ ...f, account_holder: e.target.value }))}
                              className="w-full text-sm p-2 border border-slate-200 rounded-lg" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg hover:bg-slate-50 bg-white">
                            Batal
                          </button>
                          <button disabled={isSaving} onClick={() => handleSaveEdit(String(t.id))}
                            className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50">
                            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role hint */}
      <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500">
        <Landmark className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
        <span>
          <strong>Operational:</strong> mengajukan termin &amp; info rekening. &nbsp;
          <strong>Director:</strong> menyetujui atau menolak pengajuan. &nbsp;
          <strong>Finance:</strong> upload bukti pembayaran untuk menandai lunas.
        </span>
      </div>
    </div>
  );
};
