import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, ImageIcon, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface PendingFile {
  file: File;
  preview?: string;
}

interface Props {
  accept?: string;
  multiple?: boolean;
  label: string;
  hint?: string;
  icon?: 'image' | 'document';
  onUpload: (files: File[]) => Promise<void>;
  className?: string;
  compact?: boolean;
}

export const FileUploadZone = ({
  accept,
  multiple = true,
  label,
  hint,
  icon = 'document',
  onUpload,
  className,
  compact = false,
}: Props) => {
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const next: PendingFile[] = Array.from(fileList).map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setPending(prev => [...prev, ...next]);
  }, []);

  const removeFile = (idx: number) => {
    setPending(prev => {
      const next = [...prev];
      if (next[idx].preview) URL.revokeObjectURL(next[idx].preview!);
      next.splice(idx, 1);
      return next;
    });
  };

  const cancelAll = () => {
    pending.forEach(pf => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
    setPending([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (pending.length === 0 || uploading) return;
    setUploading(true);
    try {
      await onUpload(pending.map(p => p.file));
      pending.forEach(pf => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
      setPending([]);
      if (inputRef.current) inputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  };

  const isImage = icon === 'image';
  const imagePending = pending.filter(p => p.preview);
  const docPending = pending.filter(p => !p.preview);

  return (
    <div className={className}>
      {/* Drop zone / click trigger */}
      <label
        className={clsx(
          'border-2 border-dashed rounded-xl cursor-pointer group transition-colors flex items-center gap-4',
          compact ? 'px-4 py-3' : 'p-5',
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
        )}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
        <div className={clsx(
          'rounded-full shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform',
          compact ? 'w-8 h-8' : 'w-10 h-10',
          dragging ? 'bg-blue-100' : 'bg-white'
        )}>
          {isImage
            ? <ImageIcon className={clsx(isImage ? 'text-blue-500' : 'text-purple-500', compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
            : <FileText className="w-4 h-4 text-purple-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className={clsx('font-bold text-slate-700', compact ? 'text-xs' : 'text-sm')}>{label}</p>
          {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
        </div>
        <Upload className={clsx('text-slate-300 group-hover:text-blue-400 transition-colors shrink-0', compact ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
      </label>

      {/* Preview panel — shown before upload */}
      {pending.length > 0 && (
        <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm animate-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <span className="text-xs font-bold text-slate-700">
              {pending.length} file dipilih — cek sebelum upload
            </span>
            <button onClick={cancelAll} className="text-[11px] text-slate-400 hover:text-red-500 transition-colors font-medium">
              Batalkan semua
            </button>
          </div>

          {/* Image thumbnails */}
          {imagePending.length > 0 && (
            <div className="p-3 grid grid-cols-4 gap-2">
              {imagePending.map((pf) => {
                const idx = pending.indexOf(pf);
                return (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={pf.preview}
                      alt={pf.file.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeFile(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1.5 py-0.5">
                      <p className="text-[9px] font-bold text-white truncate">{pf.file.name}</p>
                      <p className="text-[8px] text-white/70">{(pf.file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Document list */}
          {docPending.length > 0 && (
            <div className={clsx(imagePending.length > 0 && 'border-t border-slate-100')}>
              {docPending.map((pf) => {
                const idx = pending.indexOf(pf);
                const ext = pf.file.name.split('.').pop()?.toUpperCase() || 'FILE';
                return (
                  <div key={idx} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{pf.file.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {ext} · {(pf.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      className="p-1 text-slate-300 hover:text-red-400 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Confirm row */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <p className="text-[11px] text-slate-400">
              {pending.length} file · {(pending.reduce((s, p) => s + p.file.size, 0) / 1024).toFixed(0)} KB total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelAll}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {uploading
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Mengupload...</>
                  : <><Upload className="w-3 h-3" /> Upload {pending.length} File</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
