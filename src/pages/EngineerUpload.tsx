import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Image as ImageIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { atpWorkOrders, siteMasterRecords, siteEvidence } from '../data/mockData';

const QUICK_TAGS = ['RRU', 'Tower', 'Kabel', 'Antena', 'Sebelum', 'Sesudah', 'Site'];

const EngineerUpload = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const wo = atpWorkOrders.find(w => w.id === id);
  const site = siteMasterRecords.find(s => s.site_id === wo?.site_id);

  const [photos, setPhotos] = useState<{ id: string, url: string, caption: string }[]>([]);

  if (!wo || !site) {
    return <div className="p-4">Work order not found.</div>;
  }

  // MOCK: Add some dummy photos when clicking upload buttons
  const handleAddPhotos = () => {
    const newPhotos = [
      { id: Date.now().toString() + '1', url: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=500&h=500&fit=crop', caption: '' },
      { id: Date.now().toString() + '2', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&h=500&fit=crop', caption: '' }
    ];
    setPhotos([...photos, ...newPhotos]);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  const handleCaptionChange = (id: string, caption: string) => {
    setPhotos(photos.map(p => p.id === id ? { ...p, caption } : p));
  };

  const handleQuickTag = (id: string, tag: string) => {
    setPhotos(photos.map(p => {
      if (p.id === id) {
        const newCaption = p.caption ? `${p.caption} ${tag}` : tag;
        return { ...p, caption: newCaption };
      }
      return p;
    }));
  };

  const handleSubmit = () => {
    if (photos.length === 0) return;

    photos.forEach((p, idx) => {
      siteEvidence.unshift({
        id: `ev-new-${Date.now()}-${idx}`,
        siteId: site.site_id,
        work_order_id: wo.id,
        filename: `upload_${Date.now()}_${idx}.jpg`,
        originalName: `image_${idx}.jpg`,
        uploadedBy: currentUser?.id || '',
        uploadedAt: new Date().toISOString(),
        progressTag: 'Instalasi',
        url: p.url,
        tag: 'implementasi_foto',
        engineer_caption: p.caption,
        admin_caption: null,
        atp_checked: false
      });
    });

    navigate('/'); // Back to home
  };

  return (
    <div className="bg-white min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-3 bg-white sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-slate-800 text-lg leading-tight">Upload Foto Implementasi</h1>
          <p className="text-slate-500 text-xs mt-0.5">{site.site_id} · {wo.atp_number}</p>
        </div>
      </div>

      <div className="p-4 space-y-6">

        {/* Upload Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleAddPhotos} className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl hover:bg-blue-50 transition-colors">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <span className="font-bold text-blue-700 text-sm">Ambil Foto</span>
          </button>

          <button onClick={handleAddPhotos} className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
            <div className="w-12 h-12 bg-white border border-slate-200 text-slate-600 rounded-full flex items-center justify-center shadow-sm">
              <ImageIcon className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-700 text-sm">Pilih dari Galeri</span>
          </button>
        </div>

        {/* Selected Photos Grid */}
        <div className="space-y-6">
          {photos.map(photo => (
            <div key={photo.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 relative">
              <button
                onClick={() => handleRemovePhoto(photo.id)}
                className="absolute -top-2 -right-2 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 shadow-sm z-10 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex gap-4">
                <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white">
                  <img src={photo.url} alt="upload" className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={photo.caption}
                    onChange={e => handleCaptionChange(photo.id, e.target.value)}
                    placeholder="Nama foto (opsional)..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                  />

                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleQuickTag(photo.id, tag)}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 active:bg-slate-100"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Bar */}
      {photos.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-20">
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-sm hover:bg-blue-700 transition-colors active:scale-[0.98]"
          >
            Upload {photos.length} Foto &rarr;
          </button>
        </div>
      )}

    </div>
  );
};

export default EngineerUpload;
