import { useState } from 'react';
import { X, Upload, CheckCircle2, Circle, FileText, RefreshCw, AlertTriangle, ChevronRight, FolderCheck } from 'lucide-react';
import clsx from 'clsx';
import { type BastDocumentChecklistItem } from '../../data/mockData';

interface BastDocumentChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  siteName?: string;
  currentStage: string; // 'rfi_done' | 'rfs_done'
  checklistItems: BastDocumentChecklistItem[];
  onSaveOnly: (updatedItems: BastDocumentChecklistItem[], catatan: string) => void;
  onMarkDone: (updatedItems: BastDocumentChecklistItem[], catatan: string) => void;
}

export default function BastDocumentChecklistModal({
  isOpen,
  onClose,
  siteId,
  siteName,
  currentStage,
  checklistItems,
  onSaveOnly,
  onMarkDone,
}: BastDocumentChecklistModalProps) {
  const [items, setItems] = useState<BastDocumentChecklistItem[]>(checklistItems);
  const [catatan, setCatatan] = useState('');
  const [isDragTarget, setIsDragTarget] = useState<string | null>(null);

  if (!isOpen) return null;

  const uploadedRequired = items.filter(i => i.is_required && i.is_uploaded).length;
  const totalRequired   = items.filter(i => i.is_required).length;
  const allRequiredDone = uploadedRequired === totalRequired;
  const anyUploaded     = items.some(i => i.is_uploaded);

  const handleFilePick = (docId: string, file: File) => {
    setItems(prev => prev.map(item =>
      item.id === docId
        ? { ...item, is_uploaded: true, file_name: file.name, file_size: file.size, uploaded_at: new Date().toISOString() }
        : item
    ));
  };

  const handleRemove = (docId: string) => {
    setItems(prev => prev.map(item =>
      item.id === docId
        ? { ...item, is_uploaded: false, file_name: undefined, file_size: undefined, uploaded_at: undefined }
        : item
    ));
  };

  const handleDrop = (docId: string, e: React.DragEvent) => {
    e.preventDefault();
    setIsDragTarget(null);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFilePick(docId, file);
  };

  const fmtSize = (bytes: number) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-gradient-to-r from-indigo-50 to-white">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FolderCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-800">Persiapan Dokumen BAST</h2>
            </div>
            <p className="text-sm text-slate-500">
              {siteId}{siteName ? ` — ${siteName}` : ''} &nbsp;·&nbsp;
              <span className="text-xs font-medium text-slate-400 uppercase">
                {currentStage === 'rfi_done' ? 'Setelah RFI' : 'Setelah RFS'}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Progress bar ── */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Progress Dokumen Wajib</span>
            <span className={clsx("text-xs font-bold", allRequiredDone ? "text-emerald-600" : "text-amber-600")}>
              {uploadedRequired}/{totalRequired} dokumen wajib terlampir
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={clsx("h-full rounded-full transition-all duration-500", allRequiredDone ? "bg-emerald-500" : "bg-amber-500")}
              style={{ width: `${totalRequired > 0 ? (uploadedRequired / totalRequired) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* ── Helper text ── */}
        <div className="px-6 pt-4 pb-2">
          <p className="text-sm text-slate-600 leading-relaxed">
            Upload semua dokumen yang dibutuhkan untuk BAST sebelum melanjutkan. Dokumen ini akan otomatis terlampir pada pengajuan T2c.
          </p>
        </div>

        {/* ── Checklist ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className={clsx(
                "border rounded-xl transition-all duration-200 overflow-hidden",
                item.is_uploaded
                  ? "border-emerald-200 bg-emerald-50/40"
                  : isDragTarget === item.id
                    ? "border-indigo-400 bg-indigo-50 border-dashed"
                    : "border-slate-200 bg-white hover:border-slate-300"
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragTarget(item.id); }}
              onDragLeave={() => setIsDragTarget(null)}
              onDrop={(e) => handleDrop(item.id, e)}
            >
              {/* Row */}
              <div className="p-3.5 flex items-start gap-3">
                {/* Status icon */}
                <div className="mt-0.5 shrink-0">
                  {item.is_uploaded
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : <Circle className="w-5 h-5 text-slate-300" />
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx("text-sm font-semibold", item.is_uploaded ? "text-emerald-800" : "text-slate-800")}>
                      {item.doc_label}
                    </span>
                    <span className={clsx(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                      item.is_required
                        ? "bg-red-100 text-red-600"
                        : "bg-slate-100 text-slate-500"
                    )}>
                      {item.is_required ? 'Wajib' : 'Opsional'}
                    </span>
                  </div>

                  {/* Uploaded state */}
                  {item.is_uploaded && item.file_name ? (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-white border border-emerald-200 rounded-lg px-2.5 py-1">
                        <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-medium text-slate-700 max-w-[200px] truncate">
                          {item.file_name}
                        </span>
                        {item.file_size && (
                          <span className="text-[10px] text-slate-400">{fmtSize(item.file_size)}</span>
                        )}
                      </div>
                      {/* Replace button */}
                      <label className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                        <RefreshCw className="w-3 h-3" /> Ganti
                        <input
                          type="file"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleFilePick(item.id, f); e.target.value = ''; }}
                        />
                      </label>
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="text-xs font-medium text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Hapus
                      </button>
                    </div>
                  ) : (
                    /* Upload zone */
                    <label className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer group">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 group-hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        {item.doc_type === 'foto_instalasi' || item.doc_type === 'foto_label_perangkat'
                          ? '+ Upload Foto'
                          : '+ Upload File'
                        }
                      </div>
                      <span className="text-slate-400 font-normal">atau drag & drop ke sini</span>
                      <input
                        type="file"
                        className="hidden"
                        accept={
                          item.doc_type === 'foto_instalasi' || item.doc_type === 'foto_label_perangkat'
                            ? 'image/*'
                            : '*/*'
                        }
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFilePick(item.id, f); e.target.value = ''; }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Catatan */}
          <div className="pt-2 space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Catatan Tambahan (Opsional)</label>
            <textarea
              rows={3}
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Catatan khusus untuk persiapan BAST ini..."
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-3 justify-between items-center">
          {/* Left: validation hint */}
          {!allRequiredDone && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>{totalRequired - uploadedRequired} dokumen wajib belum diupload</span>
            </div>
          )}
          {allRequiredDone && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Semua dokumen wajib sudah lengkap!</span>
            </div>
          )}

          {/* Right: buttons */}
          <div className="flex gap-3 items-center shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={!anyUploaded}
              onClick={() => onSaveOnly(items, catatan)}
              className="px-4 py-2 text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              Simpan Dokumen Saja
            </button>
            <button
              type="button"
              disabled={!allRequiredDone}
              onClick={() => onMarkDone(items, catatan)}
              className={clsx(
                "px-5 py-2 text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2",
                allRequiredDone
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-indigo-200 text-indigo-100 cursor-not-allowed"
              )}
            >
              Tandai Dokumen Done <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
