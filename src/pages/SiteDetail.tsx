import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, DollarSign, 
  FileText, Upload, CheckCircle2,
  Image as ImageIcon, Send, Edit, Plus, X, AlertTriangle, FolderCheck, ChevronRight
} from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import FilterPaymentSection from '../components/sections/FilterPaymentSection';
import PaymentPromptCard, { STAGE_TERMIN_MAP } from '../components/sections/PaymentPromptCard';
import DirectorPaymentSection from '../components/sections/DirectorPaymentSection';
import CombatPaymentSection from '../components/sections/CombatPaymentSection';
import BuatSKPModal from '../components/modals/BuatSKPModal';
import TerimaSKPModal from '../components/modals/TerimaSKPModal';
import UpdateStageModal from '../components/modals/UpdateStageModal';
import AddMaterialModal from '../components/modals/AddMaterialModal';
import PengajuanTerminModal from '../components/modals/PengajuanTerminModal';
import MultiFileUploadModal, { type QueuedFile } from '../components/modals/MultiFileUploadModal';
import {
    sites, projects, teams, people, 
    siteMaterials, siteEvidence, siteCosts, combatTerms, skpRecords,
    siteMasterRecords, siteBoQRecords, siteStageLogs, mockSiteFiles,
    terminPengajuanRecords, atpTasks, siteTechnicalDetails,
    type Site, type Project, type SiteMaterial, type SiteEvidence, type SiteCost, type SKP, type SiteBoQ, type SiteStageLog, type SiteFile, type TerminPengajuan, type ATPTask, type SiteTechnicalDetail
} from '../data/mockData';
import {
    TableContainer,
    FilterBar,
    DataTable,
    TableHeader,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    ActionButton,
    Pagination,
    EmptyState
} from '../components/common/Table';

// --- SUB-COMPONENTS ---

interface EvidenceSectionProps {
    evidences: SiteEvidence[];
    canUploadEvidence: boolean;
    onUpload: () => void;
}

const EvidenceSection = ({ evidences, canUploadEvidence, onUpload }: EvidenceSectionProps) => {
    const [selectedEv, setSelectedEv] = useState<SiteEvidence | null>(null);

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Field Evidence</h3>
                {canUploadEvidence && (
                    <button onClick={onUpload} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm">
                        <Upload className="w-4 h-4" /> Upload Evidence
                    </button>
                )}
             </div>

             <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
                 {evidences.map(ev => (
                     <div key={ev.id} onClick={() => setSelectedEv(ev)} className="cursor-pointer group relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 min-w-[180px] max-w-[220px] shadow-sm hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all">
                         {ev.url ? (
                             <img src={ev.url} alt={ev.filename} className="w-full h-full object-cover" />
                         ) : (
                             <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-50">
                                 <ImageIcon className="w-8 h-8" />
                             </div>
                         )}
                         {/* Mock Image Display */}
                         <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 pointer-events-none">
                             <p className="text-white text-sm font-medium truncate">{ev.progressTag}</p>
                             <p className="text-white/80 text-xs truncate">{ev.uploadedAt} by {ev.uploadedBy}</p>
                         </div>
                         <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full pointer-events-none">
                             {ev.progressTag}
                         </div>
                     </div>
                 ))}
                 {evidences.length === 0 && (
                     <div className="col-span-full py-8 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                         No field evidence or photos uploaded yet.
                     </div>
                 )}
             </div>

             {/* Lightbox Modal */}
             {selectedEv && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedEv(null)}>
                     <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-950 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
                         {/* Header */}
                         <div className="flex justify-between items-start p-4 bg-slate-900/50 absolute top-0 left-0 right-0 z-10 backdrop-blur-md border-b border-white/10">
                             <div>
                                 <h3 className="font-semibold text-white text-lg leading-tight">{selectedEv.filename}</h3>
                                 <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
                                     <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-medium border border-blue-500/30">{selectedEv.progressTag}</span>
                                     <span>Uploaded {selectedEv.uploadedAt} by <span className="text-white">{selectedEv.uploadedBy}</span></span>
                                 </p>
                             </div>
                             <button onClick={() => setSelectedEv(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                                 <X className="w-6 h-6"/>
                             </button>
                         </div>
                         {/* Image Content */}
                         <div className="flex-1 overflow-auto flex items-center justify-center p-4 pt-24 min-h-[50vh]">
                             {selectedEv.url ? (
                                 <img src={selectedEv.url} alt="preview" className="max-w-full max-h-full object-contain rounded drop-shadow-2xl" />
                             ) : (
                                 <div className="flex flex-col items-center justify-center text-slate-500 gap-4 py-20">
                                     <ImageIcon className="w-20 h-20 opacity-30" />
                                     <p className="text-lg">No high-res image available</p>
                                 </div>
                             )}
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
};

interface CostsSectionProps {
    costs: SiteCost[];
    canSubmit: boolean;
    canUploadProof: boolean;
    canApprove: boolean;
    onSubmit: () => void;
    onUploadProof: (id: string) => void;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
}

const CostsSection = ({ costs, canSubmit, canUploadProof, canApprove, onSubmit, onUploadProof, onApprove, onReject }: CostsSectionProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;

    const filtered = useMemo(() => costs.filter(c => {
        const matchesSearch = c.typeTermin.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter ? c.status === statusFilter : true;
        return matchesSearch && matchesStatus;
    }), [costs, searchTerm, statusFilter]);

    const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    return (
        <TableContainer>
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
               <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                   <DollarSign className="w-4 h-4 text-emerald-500" /> Cost & Payments
               </h3>
               {canSubmit && (
                   <button onClick={onSubmit} className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm font-medium">
                       <Send className="w-3 h-3" /> Submit Pengajuan
                   </button>
               )}
           </div>
           
           <FilterBar
                searchValue={searchTerm}
                onSearchChange={(v) => { setSearchTerm(v); setPage(1); }}
                searchPlaceholder="Search termin..."
                statusOptions={[
                    { label: 'Pengajuan', value: 'pengajuan' },
                    { label: 'Approved', value: 'approved' },
                    { label: 'Paid', value: 'paid' },
                    { label: 'Rejected', value: 'rejected' },
                ]}
                statusValue={statusFilter}
                onStatusChange={(v) => { setStatusFilter(v); setPage(1); }}
                onExport={(t) => console.log(t)}
           />

           <DataTable>
               <TableHeader>
                   <TableHead className="min-w-[200px]">Termin</TableHead>
                   <TableHead className="min-w-[120px]">Status</TableHead>
                   <TableHead className="min-w-[160px]">Pengajuan</TableHead>
                   <TableHead className="min-w-[160px]">Dibayar</TableHead>
                   <TableHead className="min-w-[100px] text-right">Actions</TableHead>
               </TableHeader>
               <TableBody>
                   {paginated.length === 0 ? (
                       <tr><td colSpan={5}><EmptyState message="No costs found" /></td></tr>
                   ) : (
                       paginated.map((cost: SiteCost) => {
                           const statusColors: Record<string, string> = {
                                pengajuan: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                paid: 'bg-green-50 text-green-700 border-green-200',
                                rejected: 'bg-red-50 text-red-700 border-red-200'
                           };
                           return (
                               <TableRow key={cost.id}>
                                   <TableCell className="font-medium text-slate-700">{cost.typeTermin}</TableCell>
                                   <TableCell>
                                       <span className={clsx("px-2.5 py-1 rounded-full text-xs font-semibold border", statusColors[cost.status] || 'bg-slate-100')}>
                                           {cost.status.toUpperCase()}
                                       </span>
                                   </TableCell>
                                   <TableCell className="text-slate-600">Rp {cost.jumlahPengajuan.toLocaleString('id-ID')}</TableCell>
                                   <TableCell className="font-semibold text-slate-800">Rp {cost.jumlahPembayaran.toLocaleString('id-ID')}</TableCell>
                                   <TableCell className="text-right">
                                       <div className="flex justify-end gap-2">
                                           {cost.status === 'approved' && canUploadProof && (
                                               <ActionButton type="upload" label="Proof" onClick={() => onUploadProof(cost.id)} />
                                           )}
                                           {cost.status === 'pengajuan' && canApprove && (
                                               <>
                                                   <ActionButton type="approve" onClick={() => onApprove(cost.id)} />
                                                   <ActionButton type="reject" onClick={() => onReject(cost.id)} />
                                               </>
                                           )}
                                       </div>
                                   </TableCell>
                               </TableRow>
                           );
                       })
                   )}
               </TableBody>
           </DataTable>
           <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setPage} />
        </TableContainer>
    );
};

interface MaterialsSectionProps {
    materials: SiteMaterial[];
    skps: SKP[];
    siteBoQs: SiteBoQ[];
    canAddSkp: boolean;
    canMarkReceived: boolean;
    onAddSkp: () => void;
    onMarkReceived: (id: string) => void;
    onAddMaterial: () => void;
}

const MaterialsSection = ({ materials, skps, siteBoQs, canAddSkp, canMarkReceived, onAddSkp, onMarkReceived, onAddMaterial }: MaterialsSectionProps) => {
    const [activeTab, setActiveTab] = useState<'material' | 'skp'>('material');
    const [searchTerm, setSearchTerm] = useState('');
    const [boqSearchTerm, setBoqSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;

    const filteredMaterials = useMemo(() => materials.filter((m: any) => 
        (m.skp || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (m.nama_material || '').toLowerCase().includes(searchTerm.toLowerCase())
    ), [materials, searchTerm]);
    
    // Derived SKP data
    const receivedSkps = skps.filter(s => s.status === 'Received');
    // For Sub Section B we only want materials from received SKPs
    const visibleMaterials = filteredMaterials.filter(m => receivedSkps.some(s => s.id === m.skpId));

    const paginated = visibleMaterials.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(visibleMaterials.length / itemsPerPage);

    const filteredBoQs = useMemo(() => siteBoQs.filter(b => 
        b.itemCode.toLowerCase().includes(boqSearchTerm.toLowerCase()) || 
        b.description.toLowerCase().includes(boqSearchTerm.toLowerCase())
    ), [siteBoQs, boqSearchTerm]);

    return (
      <TableContainer className="overflow-hidden">
          {/* Tabs header */}
          <div className="flex border-b border-slate-200 bg-slate-50/50">
              <button
                  onClick={() => setActiveTab('material')}
                  className={clsx("px-4 py-3 font-medium text-sm focus:outline-none border-b-2 transition-colors", activeTab === 'material' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}
              >
                  Material Item
              </button>
              <button
                  onClick={() => setActiveTab('skp')}
                  className={clsx("px-4 py-3 font-medium text-sm focus:outline-none border-b-2 transition-colors", activeTab === 'skp' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}
              >
                  Surat Perintah Ambil Material (SKP)
              </button>
          </div>

          {activeTab === 'material' && (
              <div className="animate-in fade-in duration-300">
                  {/* Sub-Section A: Material Item (BoQ) */}
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4 bg-white">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" /> Material List
                      </h3>
                      <button 
                          onClick={onAddMaterial}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm font-medium"
                      >
                          <Plus className="w-3 h-3" /> Tambah Material
                      </button>
                  </div>
                  <FilterBar
                      searchValue={boqSearchTerm}
                      onSearchChange={setBoqSearchTerm}
                      searchPlaceholder="Search materials..."
                      onExport={(t) => console.log(t)}
                  />
                  <DataTable>
                      <TableHeader>
                          <TableHead className="min-w-[120px]">Item Code</TableHead>
                          <TableHead className="w-full">Description</TableHead>
                          <TableHead className="min-w-[100px] text-right">Quantity</TableHead>
                          <TableHead className="min-w-[100px]">Unit</TableHead>
                      </TableHeader>
                      <TableBody>
                          {filteredBoQs.length === 0 ? (
                              <tr><td colSpan={4}><EmptyState message="Belum ada material BoQ" /></td></tr>
                          ) : (
                              filteredBoQs.map(b => (
                                  <TableRow key={b.id}>
                                      <TableCell className="font-medium text-slate-700">{b.itemCode}</TableCell>
                                      <TableCell className="text-slate-600">{b.description}</TableCell>
                                      <TableCell className="text-slate-800 font-semibold text-right">{b.quantity}</TableCell>
                                      <TableCell className="text-slate-500">{b.unit}</TableCell>
                                  </TableRow>
                              ))
                          )}
                      </TableBody>
                  </DataTable>
              </div>
          )}

          {activeTab === 'skp' && (
              <div className="animate-in fade-in duration-300">
                  {/* Sub-Section B: Surat Perintah Ambil Material (SPAM/SKP) */}
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4 bg-white">
                      <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" /> Surat Perintah Ambil Material (SKP)
                      </h3>
                      {canAddSkp && (
                          <div className="flex gap-2">
                              <button onClick={onAddSkp} className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 text-sm rounded hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-sm font-medium">
                                  <Upload className="w-3 h-3" /> Upload Permit
                              </button>
                              <button onClick={onAddSkp} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm font-medium">
                                  <FileText className="w-3 h-3" /> Create Permit
                              </button>
                          </div>
                      )}
                  </div>
                  <DataTable>
                      <TableHeader>
                          <TableHead className="min-w-[160px]">SKP Number</TableHead>
                          <TableHead className="min-w-[120px]">Tanggal</TableHead>
                          <TableHead className="w-full">Keterangan</TableHead>
                          <TableHead className="min-w-[110px]">Status</TableHead>
                          <TableHead className="min-w-[140px] text-right">Actions</TableHead>
                      </TableHeader>
                      <TableBody>
                          {skps.length === 0 ? (
                              <tr><td colSpan={5}><EmptyState message="Belum ada SKP" /></td></tr>
                          ) : (
                              skps.map(s => {
                                const statusColors = {
                                    Draft: 'bg-slate-50 text-slate-600 border-slate-200',
                                    Submitted: 'bg-blue-50 text-blue-700 border-blue-200',
                                    Received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                };
                                return (
                                  <TableRow key={s.id}>
                                      <TableCell className="font-medium text-slate-700">{s.skpNumber}</TableCell>
                                      <TableCell className="text-slate-600">{s.tanggal}</TableCell>
                                      <TableCell className="text-slate-500 max-w-[150px] truncate"><span title={s.keterangan}>{s.keterangan}</span></TableCell>
                                      <TableCell>
                                          <span className={clsx("px-2.5 py-1 rounded-full text-xs font-semibold border", statusColors[s.status])}>
                                              {s.status}
                                          </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                         <div className="flex justify-end gap-2">
                                            {/* Action: Mark as received */}
                                            {canMarkReceived && s.status === 'Submitted' && (
                                                <button 
                                                    onClick={() => onMarkReceived(s.id)}
                                                    className="px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 rounded text-xs font-medium transition-colors"
                                                >
                                                    Mark Received
                                                </button>
                                            )}
                                            {s.documentUrl && (
                                                <ActionButton type="download" onClick={() => console.log('Download SKP Doc')} />
                                            )}
                                         </div>
                                      </TableCell>
                                  </TableRow>
                                )
                              })
                          )}
                      </TableBody>
                  </DataTable>

                  {/* Sub-Section C: Berita Acara Terima Material (BATM) */}
                  {receivedSkps.length > 0 && (
                     <div className="mt-8 border-t border-slate-200">
                        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center flex-wrap gap-4">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Berita Acara Terima Material
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                <button className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm font-medium">
                                    <Plus className="w-3 h-3" /> Input Material
                                </button>
                                <button className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 text-sm rounded hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-sm font-medium">
                                    <Upload className="w-3 h-3" /> Upload Material
                                </button>
                                <button className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors flex items-center gap-1 shadow-sm font-medium">
                                    <FileText className="w-3 h-3" /> Create Surat Perintah Ambil Material
                                </button>
                            </div>
                        </div>
                        
                        <FilterBar
                          searchValue={searchTerm}
                          onSearchChange={(v) => { setSearchTerm(v); setPage(1); }}
                          searchPlaceholder="Search materials..."
                          onExport={(t) => console.log(t)}
                        />

                        <DataTable>
                            <TableHeader>
                                <TableHead className="min-w-[140px]">SKP Ref</TableHead>
                                <TableHead className="min-w-[120px]">Take Date</TableHead>
                                <TableHead className="w-full">Material Info</TableHead>
                                <TableHead className="min-w-[100px]">Qty</TableHead>
                                <TableHead className="min-w-[120px]">Source</TableHead>
                            </TableHeader>
                            <TableBody>
                                {paginated.length === 0 ? (
                                    <tr><td colSpan={5}><EmptyState message="No materials found" /></td></tr>
                                ) : (
                                    paginated.map((m: any) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="font-medium text-slate-700">{m.skp || 'N/A'}</TableCell>
                                            <TableCell className="text-slate-600">{m.date || m.added_at?.split('T')[0]}</TableCell>
                                            <TableCell className="text-slate-600">
                                                <p className="font-bold text-slate-800">{m.nama_material}</p>
                                                {m.spesifikasi && <p className="text-xs text-slate-500 mt-0.5">{m.spesifikasi}</p>}
                                                {m.keterangan && <p className="text-xs text-slate-400 italic mt-0.5">Catatan: {m.keterangan}</p>}
                                            </TableCell>
                                            <TableCell className="text-slate-800 font-semibold">
                                                {m.jumlah} <span className="text-xs font-normal text-slate-500">{m.satuan}</span>
                                            </TableCell>
                                            <TableCell>
                                                {m.source_master ? (
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold uppercase tracking-wide">
                                                        Master
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-bold uppercase tracking-wide">
                                                        Ad-hoc / {m.source === 'ocr' ? 'OCR' : 'Manual'}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </DataTable>
                        <Pagination currentPage={page} totalPages={totalPages} totalItems={visibleMaterials.length} itemsPerPage={itemsPerPage} onPageChange={setPage} />
                     </div>
                  )}
              </div>
          )}
      </TableContainer>
    );
};

interface FilesSectionProps {
    files: SiteFile[];
    canUpload: boolean;
    canDelete: boolean;
    onUpload: () => void;
}

const FilesSection = ({ files, canUpload, canDelete, onUpload }: FilesSectionProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;

    const filtered = useMemo(() => files.filter(f => f.filename.toLowerCase().includes(searchTerm.toLowerCase())), [files, searchTerm]);
    const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    const formatContextLabel = (ctx?: string) => {
        if (!ctx) return 'Upload Langsung';
        if (ctx.includes('permit')) return `Permit (${ctx.replace('→', ' → ')})`;
        if (ctx.includes('akses')) return `Akses (${ctx.replace('→', ' → ')})`;
        if (ctx.includes('rfi') || ctx.includes('rfs')) return `Implementasi (${ctx.replace('→', ' → ')})`;
        if (ctx.includes('bast')) return `BAST (${ctx.replace('→', ' → ')})`;
        if (ctx.includes('invoice')) return `Invoice (${ctx.replace('→', ' → ')})`;
        return ctx.replace('→', ' → ');
    };

    return (
        <TableContainer>
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> Site Files
                </h3>
                {canUpload && (
                    <button onClick={onUpload} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 font-medium text-sm rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
                        <Upload className="w-4 h-4" /> Upload File
                    </button>
                )}
            </div>

            <FilterBar
                searchValue={searchTerm}
                onSearchChange={(v) => { setSearchTerm(v); setPage(1); }}
                searchPlaceholder="Search files..."
                onExport={(t) => console.log(t)}
            />

            <DataTable>
                <TableHeader>
                    <TableHead>Filename</TableHead>
                    <TableHead>Context / Source</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableHeader>
                <TableBody>
                    {paginated.length === 0 ? (
                        <tr><td colSpan={5}><EmptyState message="No files found" /></td></tr>
                    ) : (
                        paginated.map((f: SiteFile) => (
                            <TableRow key={f.id}>
                                <TableCell className="font-medium flex items-center gap-2">
                                    {f.mime_type.startsWith('image/') ? (
                                        <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                    ) : (
                                        <FileText className="w-4 h-4 text-red-500 shrink-0" />
                                    )}
                                    <a href="#" className="text-blue-600 hover:underline truncate max-w-[200px]" title={f.filename}>{f.filename}</a>
                                </TableCell>
                                <TableCell className="text-slate-600">
                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600 border border-slate-200 block truncate max-w-[200px]" title={formatContextLabel(f.stage_context)}>
                                        {formatContextLabel(f.stage_context)}
                                    </span>
                                </TableCell>
                                <TableCell className="text-slate-500 text-sm">
                                    <span className="block text-slate-700 font-medium">{f.uploaded_by}</span>
                                    <span className="text-xs text-slate-400">{new Date(f.uploaded_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</span>
                                </TableCell>
                                <TableCell className="text-slate-500">{(f.file_size / (1024 * 1024)).toFixed(1)} MB</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <ActionButton type="download" onClick={() => console.log('dl')} />
                                        {canDelete && <ActionButton type="delete" onClick={() => console.log('del')} />}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </DataTable>
            <Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setPage} />
        </TableContainer>
    );
};


const SiteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { can, currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  const initialTab = searchParams.get('tab') === 'costs' ? 'costs' : (searchParams.get('tab') === 'files' ? 'files' : 'overview');
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'costs'>(initialTab as any);
  
  const initialExpand = searchParams.get('expand') || undefined;

  // SKP Modals State
  const [isSkpModalOpen, setIsSkpModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [selectedSkpId, setSelectedSkpId] = useState<string>('');
  const [localSkps, setLocalSkps] = useState<SKP[]>(skpRecords.filter(s => s.siteId === id));

  let site = sites.find(s => s.id === id);
  let project = projects.find(p => p.id === site?.projectId);

  // Fallback to Site Master records
  let defaultStage = 'imported';
  if (!site) {
      const masterRecord = siteMasterRecords.find(sm => sm.site_id === id || sm.id === id);
      if (masterRecord) {
          defaultStage = masterRecord.stage || 'imported';
          site = {
              id: masterRecord.site_id,
              projectId: `mock-prj-${masterRecord.project_type}`,
              name: masterRecord.site_name,
              location: masterRecord.region,
              budget: 0,
              status: masterRecord.status === 'completed' ? 'completed' : 'in_progress',
              startDate: new Date().toISOString().split('T')[0],
              endDate: '',
              jobName: masterRecord.sow_pekerjaan,
              contractNumber: masterRecord.po_tsel,
              workOrderId: masterRecord.work_order_id || '',
              import_source: masterRecord.import_source || '-'
          } as unknown as Site;
          
          project = projects.find(p => p.type === masterRecord.project_type);
          if (!project) {
              project = { 
                  id: `mock-prj`, 
                  name: `Unassigned ${masterRecord.project_type}`, 
                  type: masterRecord.project_type, 
                  status: 'active', 
                  client: 'Telkomsel', 
                  region: masterRecord.region, 
                  totalBudget: 0, 
                  unassignedPos: 0 
              } as Project;
          }
      }
  }

  // Grab corresponding SiteMaster to check team_id and field_leader_id if not on site
  const masterRecordForTeam = siteMasterRecords.find(sm => sm.site_id === id || sm.id === id);
  const activeTeamId = site?.teamId || masterRecordForTeam?.team_id;
  
  const team = teams.find(t => t.id === activeTeamId);
  const fieldLeader = masterRecordForTeam?.field_leader_id ? people.find(p => p.id === masterRecordForTeam.field_leader_id) || null : null;

  // Filtered Data
  const [localMaterials, setLocalMaterials] = useState<any[]>(siteMaterials.filter((m: any) => m.siteId === id || m.site_id === id));
  const siteBoQsSource = siteBoQRecords.filter(b => b.siteId === id || b.siteId === site?.projectId);
  const [localBoQs] = useState<SiteBoQ[]>(siteBoQsSource);
  const costs = siteCosts.filter(c => c.siteId === id);
  const filteredCombatTerms = combatTerms.filter(c => c.siteId === id);

  // Local State for Mocked File Uploads
  const [localEvidences, setLocalEvidences] = useState<SiteEvidence[]>(siteEvidence.filter(e => e.siteId === id));
  const [localFiles, setLocalFiles] = useState<SiteFile[]>(mockSiteFiles.filter(f => f.site_id === id));

  // Stage Tracking State
  const [localStage, setLocalStage] = useState<string>(defaultStage);
  const [localStageLogs, setLocalStageLogs] = useState<SiteStageLog[]>(siteStageLogs.filter(s => s.site_master_id === id || s.site_master_id === site?.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  const [isUpdateStageModalOpen, setIsUpdateStageModalOpen] = useState(false);
  
  // Pengajuan Modal state
  const [localPengajuan, setLocalPengajuan] = useState<TerminPengajuan[]>(terminPengajuanRecords.filter(t => t.site_id === id || t.site_id === site?.id));
  const [isPengajuanModalOpen, setIsPengajuanModalOpen] = useState(false);
  const [pengajuanData, setPengajuanData] = useState<{terminKey: 'T1'|'T2a'|'T2b'|'T2c'|'T3'|'T4', nominal: number, docs: SiteFile[]}>({
     terminKey: 'T1', nominal: 0, docs: [] 
  });
  
  const [isMultiUploadOpen, setIsMultiUploadOpen] = useState(false);

  // Raw Data State
  const [localRawData, setLocalRawData] = useState<Record<string, any>>(masterRecordForTeam?.raw_data || {});
  const [isEditingRawData, setIsEditingRawData] = useState(false);
  const [tempRawData, setTempRawData] = useState<Record<string, any>>({});

  // Technical RF Data
  const siteTechRecords = siteTechnicalDetails.filter(t => t.site_id === id || t.site_id === site?.id);
  const [techSortCol, setTechSortCol] = useState<keyof SiteTechnicalDetail | null>(null);
  const [techSortDir, setTechSortDir] = useState<'asc' | 'desc'>('asc');
  const sortedTechRecords = [...siteTechRecords].sort((a, b) => {
      if (!techSortCol) return 0;
      const av = String(a[techSortCol] ?? ''), bv = String(b[techSortCol] ?? '');
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return techSortDir === 'asc' ? cmp : -cmp;
  });
  const handleTechSort = (col: keyof SiteTechnicalDetail) => {
      if (techSortCol === col) setTechSortDir(d => d === 'asc' ? 'desc' : 'asc');
      else { setTechSortCol(col); setTechSortDir('asc'); }
  };
  const TechSortIcon = ({ col }: { col: keyof SiteTechnicalDetail }) => {
      if (techSortCol !== col) return <span className="text-slate-300 ml-1">↕</span>;
      return <span className="text-blue-500 ml-1">{techSortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // Section Expansion State
  const STAGE_ORDER_IDX = ['imported','assigned','permit_process','permit_ready','akses_process','akses_ready','implementasi','rfi_done','rfs_done','dokumen_done','bast','invoice','completed'];
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
      try {
          const saved = localStorage.getItem(`site_sections_${id}`);
          if (saved) return JSON.parse(saved);
      } catch (e) {
          console.error('Failed to parse section state', e);
      }
      
      const role = currentUser?.role || '';
      const defaults: Record<string, boolean> = {
          info: false, permit: false, impl: false, atp: false, teknis: false, tambahan: false
      };
      
      if (['admin', 'operational'].includes(role)) {
          defaults.info = true; defaults.permit = true; defaults.impl = true;
      } else if (role === 'director') {
          defaults.info = true; defaults.impl = true; defaults.atp = true;
      } else if (role === 'field') {
          defaults.impl = true;
      } else {
          defaults.info = true; // Fallback
      }
      return defaults;
  });

  const toggleSection = (key: string) => {
      setExpandedSections(prev => {
          const next = { ...prev, [key]: !prev[key] };
          localStorage.setItem(`site_sections_${id}`, JSON.stringify(next));
          return next;
      });
  };

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ATP Document Checklist State (derived from localFiles)
  const [isAtpUploadOpen, setIsAtpUploadOpen] = useState(false);
  const [localAtpTask, setLocalAtpTask] = useState<ATPTask | undefined>(atpTasks.find(a => a.site_id === id));
  const [isEditAtpModalOpen, setIsEditAtpModalOpen] = useState(false);

  // File Input Refs
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);

  if (!site || !project) {
    return <div className="p-8 text-center text-slate-500">Site not found</div>;
  }

  // --- ACTIONS ---
  const handleFileUpload = () => setIsMultiUploadOpen(true);
  const handleEvidenceUpload = () => evidenceInputRef.current?.click();

  // Wire "Submit Pengajuan" button in the legacy CostsSection to the real Pengajuan modal.
  // Finds the first termin that is unlocked (stage reached) but not yet submitted.
  const handleSubmitCost = () => {
    const stageIdx = STAGE_ORDER_IDX.indexOf(localStage);
    const readyDef = STAGE_TERMIN_MAP.find(def => {
      const ti = STAGE_ORDER_IDX.indexOf(def.stage);
      if (stageIdx === -1 || ti === -1 || stageIdx < ti) return false;
      return !localPengajuan.some(
        p => p.termin_key === def.terminKey && ['submitted','approved','paid'].includes(p.status)
      );
    });
    if (!readyDef) {
      showToast('Tidak ada termin yang siap diajukan saat ini.', 'error');
      return;
    }
    const estimated = site.budget > 0 ? Math.round(site.budget * readyDef.pct / 100) : 0;
    handleAjukanTermin(readyDef.terminKey, estimated, readyDef.contextKeys);
  };
  const handleUploadProof = (costId: string) => { proofInputRef.current?.click(); console.log('Uploading proof for cost:', costId); };
  const handleApproveCost = (costId: string) => alert(`Approve cost ${costId}`);
  const handleRejectCost = (costId: string) => alert(`Reject cost ${costId}`);

  const handleMultiUploadSubmit = (queuedFiles: QueuedFile[]) => {
      let filesToUpdate = [...localFiles];
      
      const newFiles: SiteFile[] = queuedFiles.map(q => {
          // If action is 'replace', we need to remove the old file from 'filesToUpdate' first
          if (q.isDuplicate && q.duplicateAction === 'replace') {
              filesToUpdate = filesToUpdate.filter(f => f.filename !== q.file.name);
          }
          
          return {
              id: `f-mock-${Date.now()}-${q.id}`, 
              site_id: site.id, 
              filename: (q.isDuplicate && q.duplicateAction === 'keep') ? `(1) ${q.file.name}` : q.file.name, 
              original_name: q.file.name,
              file_url: '#',
              mime_type: q.file.type || 'application/octet-stream',
              file_size: q.file.size, 
              source: 'direct_upload',
              stage_context: q.tag,
              uploaded_at: new Date().toISOString(), 
              uploaded_by: currentUser?.name || 'Current User' 
          };
      });
      
      setLocalFiles([...newFiles, ...filesToUpdate]);
      alert(`${newFiles.length} file(s) uploaded successfully!`);
  };

  const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const newEv: SiteEvidence = { 
              id: `ev-mock-${Date.now()}`, 
              siteId: site.id, 
              filename: file.name,
              originalName: file.name,
              progressTag: `Latest Upload: ${file.name}`, 
              uploadedAt: new Date().toISOString().split('T')[0], 
              uploadedBy: currentUser?.name || 'Current User' 
          };
          setLocalEvidences([newEv, ...localEvidences]);
          alert(`Evidence ${file.name} uploaded successfully!`);
      }
      e.target.value = ''; // Reset input
  };

  const handleGenericUpload = (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
      const file = e.target.files?.[0];
      if (file) {
          alert(`${type} ${file.name} uploaded successfully!`);
      }
      e.target.value = ''; // Reset input
  };

  // SKP Actions
  const handleCreateSkpSubmit = (newSkp: Partial<SKP>) => {
      setLocalSkps([...localSkps, { ...newSkp, id: `skp-new-${Date.now()}` } as SKP]);
  };

  const handleReceiveSkpSubmit = (receivedData: any) => {
      setLocalSkps(localSkps.map(s => s.id === receivedData.skpId ? { ...s, status: 'Received', receivedEvidenceUrl: receivedData.receivedEvidenceUrl } : s));
  };

  const handleAddMaterialSubmit = (newMaterials: any[]) => {
      const generatedMaterials = newMaterials.map((m, i) => ({
          id: `mat-new-${Date.now()}-${i}`,
          ...m
      }));
      setLocalMaterials([ ...generatedMaterials, ...localMaterials ]);
      setIsAddMaterialModalOpen(false);
  };

  const handleUpdateStage = (newStage: string, notes?: string, payload?: Record<string, unknown>) => {
      const newLogId = `log-mock-${Date.now()}`;
      let evidenceIds: string[] = [];

      // Process uploaded files from modal payload
      if (payload?.files && Array.isArray(payload.files) && payload.files.length > 0) {
          const filesArr = payload.files as File[];
          
          const newSiteFiles: SiteFile[] = [];
          const newEvidences: SiteEvidence[] = [];

          filesArr.forEach((f, i) => {
              const fileId = `f-stage-${Date.now()}-${i}`;
              newSiteFiles.push({
                  id: fileId,
                  site_id: site.id,
                  filename: f.name,
                  original_name: f.name,
                  file_url: '#',
                  mime_type: f.type || 'application/octet-stream',
                  file_size: f.size,
                  source: 'stage_update',
                  stage_context: `${localStage}→${newStage}`,
                  stage_log_id: newLogId,
                  uploaded_at: new Date().toISOString(),
                  uploaded_by: currentUser?.name || 'Current User'
              });

              // Also copy image objects straight to the Evidence gallery
              if (f.type.startsWith('image/')) {
                  const localUrl = URL.createObjectURL(f);
                  newEvidences.push({
                      id: `ev-stage-${Date.now()}-${i}`,
                      siteId: site.id,
                      filename: f.name,
                      originalName: f.name,
                      progressTag: `Update: ${localStage} → ${newStage}`,
                      uploadedAt: new Date().toISOString().split('T')[0],
                      uploadedBy: currentUser?.name || 'Current User',
                      url: localUrl
                  });
              }
          });
          
          evidenceIds = newSiteFiles.map(nf => nf.id);
          setLocalFiles(prev => [...newSiteFiles, ...prev]);

          if (newEvidences.length > 0) {
              setLocalEvidences(prev => [...newEvidences, ...prev]);
          }
      }

      const cleanPayload = { ...payload };
      delete cleanPayload.files; // Remove File objects before stringifying

      if (newStage === 'issue_hold') {
          // Just Log the issue note, don't change stage
          const logEntry: SiteStageLog = {
              id: newLogId,
              site_master_id: site?.id || id || '',
              from_stage: localStage as SiteStageLog['from_stage'],
              to_stage: localStage as SiteStageLog['to_stage'],
              notes: `[ISSUE/HOLD]: ${notes}\nPayload: ${JSON.stringify(cleanPayload || {})}`,
              created_by: currentUser?.name || 'User',
              created_at: new Date().toISOString()
          };
          setLocalStageLogs([logEntry, ...localStageLogs]);
      } else {
          const logEntry: SiteStageLog = {
              id: newLogId,
              site_master_id: site?.id || id || '',
              from_stage: localStage as SiteStageLog['from_stage'],
              to_stage: newStage as SiteStageLog['to_stage'],
              notes: notes + (Object.keys(cleanPayload).length > 0 ? `\nPayload: ${JSON.stringify(cleanPayload)}` : ''),
              created_by: currentUser?.name || 'User',
              created_at: new Date().toISOString(),
              ...(evidenceIds.length > 0 ? { evidence_files: evidenceIds } : {})
          };
          setLocalStage(newStage);
          setLocalStageLogs([logEntry, ...localStageLogs]);
      }
      setIsUpdateStageModalOpen(false);
      alert('Stage berhasil diupdate');
  };

  const handleAjukanTermin = (terminKey: 'T1'|'T2a'|'T2b'|'T2c'|'T3'|'T4', nominal: number, contextKeys: string[]) => {
      // Find relevant docs from localFiles based on context
      const relevantDocs = localFiles.filter(f => contextKeys.some(c => f.stage_context?.includes(c)));
      setPengajuanData({ terminKey, nominal, docs: relevantDocs });
      setIsPengajuanModalOpen(true);
  };

  const handleSubmitPengajuan = (payload: any) => {
      const newPengajuan: TerminPengajuan = {
           id: `tp-new-${Date.now()}`,
           site_id: site.id,
           termin_key: payload.terminKey,
           nominal: payload.nominal,
           catatan: payload.note,
           status: 'submitted',
           submitted_by: currentUser?.id || 'User',
           submitted_at: new Date().toISOString(),
           documents: [...payload.existingDocIds, ...payload.files.map((f: File) => `new-${f.name}`)]
      };
      setLocalPengajuan([...localPengajuan, newPengajuan]);
      setIsPengajuanModalOpen(false);
      showToast(`${payload.terminKey} berhasil diajukan — menunggu approval`);
  };

  const handleApproveTermin = (pengajuanId: string, nominal: number, terminKey: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const confirm = window.confirm(`Setujui pengajuan ${terminKey} sebesar Rp ${nominal.toLocaleString('id-ID')} untuk site ${site.id}?`);
      if (!confirm) return;
      setLocalPengajuan(localPengajuan.map(p => p.id === pengajuanId ? { ...p, status: 'approved', approved_at: new Date().toISOString(), approved_by: currentUser?.id } : p));
  };

  const handleRejectTermin = (pengajuanId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const reason = window.prompt("Alasan penolakan:");
      if (!reason) return;
      setLocalPengajuan(localPengajuan.map(p => p.id === pengajuanId ? { ...p, status: 'rejected', catatan: reason } : p));
  };

  // End ATP Handlers

  // --- STEPPER LOGIC ---
  const STAGE_GROUPS = project.type === 'RESCOPING' 
    ? [
        { label: 'Assigned', keys: ['assigned'] },
        { label: 'Survey', keys: ['survey', 'survey_nok'] },
        { label: 'ERFIN', keys: ['erfin_process', 'erfin_ready'] },
        { label: 'Permit', keys: ['permit_process', 'permit_ready'] },
        { label: 'Akses', keys: ['akses_process', 'akses_ready'] },
        { label: 'Implementasi', keys: ['implementasi', 'rfi_done', 'dokumen_done'] },
        { label: 'BAST', keys: ['bast'] },
        { label: 'Invoice', keys: ['invoice'] },
        { label: 'Selesai', keys: ['completed'] }
      ]
    : [
        { label: 'Assigned', keys: ['assigned'] },
        { label: 'Permit', keys: ['permit_process', 'permit_ready'] },
        { label: 'Akses', keys: ['akses_process', 'akses_ready'] },
        { label: 'Implementasi', keys: ['implementasi', 'rfi_done', 'rfs_done', 'dokumen_done'] },
        { label: 'BAST', keys: ['bast'] },
        { label: 'Invoice', keys: ['invoice'] },
        { label: 'Selesai', keys: ['completed'] }
      ];

  const currentGroupIndex = STAGE_GROUPS.findIndex(g => g.keys.includes(localStage));
  const activeIndex = currentGroupIndex === -1 && localStage === 'imported' ? -1 : currentGroupIndex;

    // (Stage entered logic removed as per design changes)

  // Compute whether any termin is unlocked & not yet submitted → drives tab badge
  // STAGE_ORDER_IDX already defined above
  // Find the first ready-but-not-submitted termin key (e.g. 'T1') for badge display
  const readyTerminKey = (() => {
    const ci = STAGE_ORDER_IDX.indexOf(localStage);
    for (const def of STAGE_TERMIN_MAP) {
      const ti = STAGE_ORDER_IDX.indexOf(def.stage);
      if (ci === -1 || ti === -1 || ci < ti) continue;
      const alreadySubmitted = localPengajuan.some(
        p => p.termin_key === def.terminKey && ['submitted','approved','paid'].includes(p.status)
      );
      if (!alreadySubmitted) return def.terminKey; // first unlocked & unsubmitted
    }
    return null;
  })();
  const hasActionNeeded = readyTerminKey !== null;

  return (
    <div className="break-words space-y-8 animate-in fade-in duration-500 pb-12">
        {/* Toast Notification */}
        {toast && (
            <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border text-sm font-semibold animate-in slide-in-from-top-2 duration-300 ${
                toast.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
            }`}>
                <span>{toast.type === 'success' ? '✓' : '✗'}</span>
                {toast.message}
                <button onClick={() => setToast(null)} className="ml-2 text-current opacity-50 hover:opacity-100">&times;</button>
            </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Detail Site</h1>
                    <p className="text-slate-500 text-sm">{site.name}</p>
                </div>
            </div>
            <div className="flex gap-2">
                 {can('site.update_stage') && (
                    <button 
                        onClick={() => setIsUpdateStageModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded shadow-sm transition-colors"
                    >
                        Update Stage
                    </button>
                )}
                {can('site.edit_data') && (
                    <button className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white text-sm font-medium rounded shadow-sm transition-colors">
                        Edit Site
                    </button>
                )}
            </div>
        </div>

        {/* Stage Stepper */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm border-t-4 border-t-blue-500 p-6">
            <div className="flex items-center justify-between relative">
                {/* Connecting Lines Context */}
                <div className="absolute top-4 left-0 w-full h-0.5 z-0 flex rounded-full overflow-hidden">
                    {STAGE_GROUPS.map((_, idx) => {
                        if (idx === STAGE_GROUPS.length - 1) return null;
                        const isCompletedLine = activeIndex > idx;
                        return (
                            <div key={idx} className="flex-1 h-full flex items-center justify-center">
                                <div className={clsx("w-full h-full", isCompletedLine ? "bg-emerald-500" : "bg-slate-200")} />
                            </div>
                        )
                    })}
                </div>

                {STAGE_GROUPS.map((group, idx) => {
                    const isPast = activeIndex > idx;
                    const isCurrent = activeIndex === idx;
                    const isReached = isPast || isCurrent;

                    const isPermitGroup = group.label === 'Permit';
                    const eData = site.extra_data || {};
                    const permitExpiry = eData.permit_expiry_date;
                    
                    // 1. Find the date this stage group was reached
                    // We look for a log entry where 'to_stage' matches ANY of the keys in this group.
                    // We take the Earliest or Latest? Let's take the Earliest log matching this group's keys
                    // Or if they wanted specifically the exact node's stage, we check against localStageLogs.
                    const groupLogs = localStageLogs.filter(log => group.keys.includes(log.to_stage));
                    // Sort ascending to find when they FIRST entered any stage in this group
                    groupLogs.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                    const reachedDate = groupLogs.length > 0 ? new Date(groupLogs[0].created_at) : null;

                    let permitDaysText = null;
                    let permitDaysColor = 'text-slate-500';
                    let permitNodeColorOverride = null;
                    let permitNodeTextOverride = null;
                    
                    if (isPermitGroup && permitExpiry) {
                        const daysLeft = Math.floor((new Date(permitExpiry).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        if (daysLeft < 0) {
                            permitDaysText = `✗ Kedaluwarsa ${new Date(permitExpiry).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year:'numeric'})}`;
                            permitDaysColor = 'text-red-600 font-bold';
                            permitNodeColorOverride = 'border-red-500 ring-4 ring-red-100 bg-red-50';
                            permitNodeTextOverride = 'text-red-600';
                        } else if (daysLeft <= 14) {
                            permitDaysText = `⚠ Berlaku s/d ${new Date(permitExpiry).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year:'numeric'})}`;
                            permitDaysColor = 'text-amber-600 font-bold';
                            permitNodeColorOverride = 'border-amber-500 ring-4 ring-amber-100 bg-amber-50';
                            permitNodeTextOverride = 'text-amber-600';
                        } else {
                            permitDaysText = `Berlaku s/d ${new Date(permitExpiry).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year:'numeric'})}`;
                            permitDaysColor = 'text-slate-500';
                        }
                    }

                    // Setup enriched Line 2 text
                    let line2Text = null;
                    let line2Color = 'text-slate-500 font-medium';

                    if (isReached) {
                        const highestKey = [...group.keys].reverse().find(k => (STAGE_ORDER_IDX.indexOf(localStage) >= STAGE_ORDER_IDX.indexOf(k))) || group.keys[0];
                        
                        if (isPermitGroup && permitDaysText) {
                            line2Text = permitDaysText;
                            line2Color = permitDaysColor;
                        } else {
                            switch (highestKey) {
                                case 'assigned':
                                    line2Text = `Tim: ${team?.name || '-'} · Leader: ${fieldLeader?.name || '-'}`;
                                    break;
                                case 'permit_process':
                                    line2Text = `Create: ${eData.permit_start_date ? new Date(eData.permit_start_date).toLocaleDateString('id-ID', {day:'numeric',month:'short'}) : '-'}`;
                                    break;
                                case 'akses_process':
                                    line2Text = `${eData.akses_provider || '-'} · ${eData.akses_kunci || '-'}`;
                                    break;
                                case 'akses_ready':
                                    line2Text = `PIC: ${eData.akses_pic || '-'} · OK`;
                                    break;
                                case 'implementasi':
                                    line2Text = `Plan: ${eData.impl_plan ? new Date(eData.impl_plan).toLocaleDateString('id-ID', {day:'numeric',month:'short'}) : '-'}`;
                                    break;
                                case 'rfi_done':
                                case 'rfs_done':
                                    line2Text = `CI ${eData.impl_aktual ? new Date(eData.impl_aktual).toLocaleDateString('id-ID',{day:'numeric',month:'short'}) : '-'} ${eData.impl_ci || ''} → CO ${eData.impl_aktual ? new Date(eData.impl_aktual).toLocaleDateString('id-ID',{day:'numeric',month:'short'}) : '-'} ${eData.impl_co || ''}`;
                                    break;
                                case 'dokumen_done':
                                    const atpFiles = localFiles.filter(f => f.atp_checked);
                                    line2Text = `${atpFiles.length} file ATP siap`;
                                    break;
                                case 'bast':
                                    line2Text = `BAST: ${eData.bast_date ? new Date(eData.bast_date).toLocaleDateString('id-ID', {day:'numeric',month:'short'}) : `${(new Date()).toLocaleDateString('id-ID', {day:'numeric',month:'short'})}`}`;
                                    break;
                                case 'invoice':
                                    line2Text = `Invoice: ${eData.invoice_number || `INV-${site.id}-01`}`;
                                    break;
                                case 'completed':
                                    line2Text = '✓ Selesai';
                                    line2Color = 'text-emerald-600 font-bold';
                                    break;
                            }
                        }
                    }

                    // For non-permit nodes, purely visual without dates
                    let nodeClass = "bg-white text-slate-300 border-slate-200";
                    let textClass = "text-slate-400";
                    if (isPast) {
                        nodeClass = "bg-emerald-500 text-white border-emerald-500";
                        textClass = "text-slate-700";
                    } else if (isCurrent) {
                        nodeClass = permitNodeColorOverride || "bg-white text-blue-600 border-blue-500 ring-4 ring-blue-100 animate-pulse";
                        textClass = permitNodeTextOverride || "text-blue-700 font-bold";
                    }

                    return (
                        <div key={idx} className="relative z-10 flex flex-col items-center">
                            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center border-[3px] shadow-sm mb-2 font-bold text-xs", nodeClass)}>
                                {isPast ? <CheckCircle2 className="w-5 h-5 text-white" /> : (idx + 1)}
                            </div>
                            <span className={clsx("text-xs font-semibold whitespace-nowrap", textClass)}>
                                {group.label}
                            </span>
                            
                            {/* Meta texts beneath */}
                            <div className="absolute top-14 w-48 text-center flex flex-col items-center justify-center">
                                {/* Line 1: Date reached */}
                                {isReached && reachedDate && (
                                    <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap bg-white/80 px-1.5 py-0.5 rounded shadow-sm border border-slate-100">
                                        {reachedDate.toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year:'numeric'})}
                                    </span>
                                )}

                                {/* Line 2: Specific Key Data */}
                                {isReached && line2Text && (
                                    <span className={clsx("text-[10px] mt-1 whitespace-nowrap bg-white/95 px-2 py-0.5 rounded shadow-sm border border-slate-100", line2Color)}>
                                        {line2Text}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* --- SURVEY NOK WARNING BANNER --- */}
        {localStage === 'survey_nok' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm flex items-start gap-4">
                <div className="bg-red-100 p-2 rounded-full shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-red-800 font-bold text-lg mb-1">Site Ditahan: Survey NOK</h3>
                    <p className="text-red-700 text-sm mb-3">
                        Pengerjaan site ini dihentikan sementara karena hasil survey dinyatakan tidak layak (NOK). 
                        Proses selanjutnya seperti ERFIN, Permit, dan Implementasi tidak dapat dilakukan.
                    </p>
                    {/* Retrieve reason from mock logs potentially, or extra data */}
                    {site.survey_nok_reason && (
                         <div className="bg-white/60 p-3 rounded text-sm text-slate-700 mb-4 border border-red-100 italic">
                             <strong>Alasan NOK:</strong> {site.survey_nok_reason}
                         </div>
                    )}
                    {(can('manage_data') || currentUser?.role === 'operational') && (
                        <button 
                            onClick={() => {
                                if(window.confirm('Yakin ingin mereset site ini kembali ke tahap Survey?')) {
                                    handleUpdateStage('survey', 'Reset dari Survey NOK ke Survey ulang');
                                }
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded shadow-sm transition-colors"
                        >
                            Reset ke Survey
                        </button>
                    )}
                </div>
            </div>
        )}

        {/* Payment Prompt Card — for FILTER/RESCOPING, operational & admin only */}
        {(project.type === 'FILTER' || project.type === 'RESCOPING') && can('financial.submit_pengajuan') && (
            <PaymentPromptCard
                site={site}
                localStage={localStage}
                localPengajuan={localPengajuan}
                localFiles={localFiles}
                onAjukan={handleAjukanTermin}
            />
        )}

        {/* --- ATP DOCUMENT PREPARATION SECTION --- */}
        {((localStage === 'rfi_done' || localStage === 'rfs_done') || STAGE_ORDER_IDX.indexOf(localStage) >= STAGE_ORDER_IDX.indexOf('dokumen_done')) && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                {/* Section Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/30">
                    <div className="flex items-center gap-2">
                        <FolderCheck className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-base font-bold text-slate-800">Persiapan Dokumen (ATP)</h3>
                    </div>
                    {/* Count Indicator */}
                    <div className={clsx(
                        "px-3 py-1 rounded-full text-xs font-bold transition-colors shadow-sm",
                        localFiles.filter(f => f.atp_checked).length > 0
                            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                    )}>
                        {localFiles.filter(f => f.atp_checked).length} file siap
                    </div>
                </div>

                {/* File List */}
                <div className="divide-y divide-slate-50">
                    {localFiles.map(file => {
                        const isAtpDone = STAGE_ORDER_IDX.indexOf(localStage) >= STAGE_ORDER_IDX.indexOf('dokumen_done');
                        const isChecked = !!file.atp_checked;
                        
                        // Badge logic
                        const ext = file.filename.split('.').pop()?.toUpperCase();
                        const badgeColors: Record<string, string> = {
                            'PDF': 'bg-red-50 text-red-600 border-red-200',
                            'JPG': 'bg-blue-50 text-blue-600 border-blue-200',
                            'JPEG': 'bg-blue-50 text-blue-600 border-blue-200',
                            'PNG': 'bg-blue-50 text-blue-600 border-blue-200',
                            'XLS': 'bg-emerald-50 text-emerald-600 border-emerald-200',
                            'XLSX': 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        };
                        const badgeColor = badgeColors[ext || ''] || 'bg-slate-100 text-slate-600 border-slate-200';

                        return (
                            <div 
                                key={file.id} 
                                onClick={() => {
                                    if (isAtpDone) return;
                                    setLocalFiles(prev => prev.map(f => f.id === file.id ? { ...f, atp_checked: !f.atp_checked } : f));
                                }}
                                className={clsx(
                                    "px-6 py-4 flex items-center gap-4 transition-all",
                                    !isAtpDone && "cursor-pointer hover:bg-slate-50",
                                    isChecked && "bg-[color-mix(in_srgb,#D1FAE5_30%,transparent)]"
                                )}
                            >
                                {/* Checkbox / Icon */}
                                <div className="shrink-0">
                                    {isAtpDone ? (
                                        isChecked ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <div className="w-5 h-5" /> // Empty space for alignment
                                        )
                                    ) : (
                                        <div className={clsx(
                                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                            isChecked ? "bg-emerald-500 border-emerald-500" : "border-slate-300 bg-white"
                                        )}>
                                            {isChecked && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </div>
                                    )}
                                </div>

                                {/* Type Badge */}
                                <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider shrink-0", badgeColor)}>
                                    {ext || 'FILE'}
                                </span>

                                {/* Filename */}
                                <div className="flex-1 min-w-0">
                                    <p className={clsx("text-sm font-medium truncate", isChecked ? "text-slate-900" : "text-slate-600")}>
                                        {file.filename}
                                    </p>
                                </div>

                                {/* Filesize */}
                                <span className="text-xs text-slate-400 font-mono hidden sm:block">
                                    {(file.file_size / (1024 * 1024)).toFixed(1)}MB
                                </span>

                                {/* Download Link */}
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        alert(`Download: ${file.filename}`);
                                    }}
                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    <Upload className="w-3.5 h-3.5 rotate-180" /> Unduh
                                </button>
                            </div>
                        );
                    })}

                    {localFiles.length === 0 && (
                        <div className="px-6 py-12 text-center">
                            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 text-sm">Belum ada file yang diupload untuk site ini.</p>
                        </div>
                    )}
                </div>

                {/* Upload Zone & Footer Action Bar (Only pre-dokumen_done) */}
                {STAGE_ORDER_IDX.indexOf(localStage) < STAGE_ORDER_IDX.indexOf('dokumen_done') && (
                    <>
                        <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                             <button 
                                onClick={() => setIsAtpUploadOpen(!isAtpUploadOpen)}
                                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-2 group transition-colors"
                             >
                                <div className={clsx("w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center transition-transform", isAtpUploadOpen && "rotate-45")}>
                                    <Plus className="w-3.5 h-3.5" />
                                </div>
                                Upload File ATP
                             </button>
                             
                             {isAtpUploadOpen && (
                                <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                                    <div 
                                        onClick={() => handleFileUpload()}
                                        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-white hover:border-indigo-400 hover:bg-slate-50 cursor-pointer transition-all group"
                                    >
                                        <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3 group-hover:text-indigo-500 transition-colors" />
                                        <p className="text-sm font-bold text-slate-700">Pilih file atau drag & drop</p>
                                        <p className="text-xs text-slate-400 mt-1">Files otomatis akan diberi tag 'atp'</p>
                                    </div>
                                </div>
                             )}
                        </div>

                        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
                            <div className="text-sm font-medium text-slate-600">
                                <span className="font-bold text-slate-900">{localFiles.filter(f => f.atp_checked).length} dari {localFiles.length}</span> file dicentang
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => alert('State ATP berhasil disimpan!')}
                                    className="px-6 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                                >
                                    Simpan
                                </button>
                                <button 
                                    disabled={localFiles.filter(f => f.atp_checked).length === 0}
                                    onClick={() => {
                                        if (window.confirm('Tandai ATP selesai? Stage akan berlanjut ke Dokumen ATP.')) {
                                            handleUpdateStage('dokumen_done', 'ATP Checklist completed');
                                        }
                                    }}
                                    title={localFiles.filter(f => f.atp_checked).length === 0 ? 'Centang minimal 1 file untuk melanjutkan' : ''}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    Tandai ATP Done <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Read-only Done Badge */}
                {STAGE_ORDER_IDX.indexOf(localStage) >= STAGE_ORDER_IDX.indexOf('dokumen_done') && (
                    <div className="px-6 py-3 bg-emerald-50 border-t border-emerald-100 flex items-center gap-2">
                        <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-sm font-bold text-emerald-800">ATP Done ✓</span>
                        <span className="text-xs text-emerald-600 font-medium">{new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year:'numeric'})}</span>
                    </div>
                )}
            </div>
        )}

        {/* --- ATP / INEOM SUBMISSION SECTION MOVED --- */}



        {/* Note Panel: if site is survey_nok, hide the tabs or grey them out logically, but for now we'll just show them */}

                <div className="border-b border-slate-200 flex gap-6 mt-8">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={clsx("pb-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'overview' ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('files')}
                        className={clsx("pb-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'files' ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}
                    >
                        Files & Materials
                    </button>
                    {can('view_financials') && (
                         <button
                            onClick={() => setActiveTab('costs')}
                            className={clsx("pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5", activeTab === 'costs' ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700")}
                        >
                            Costs & Payments
                            {(project.type === 'FILTER' || project.type === 'RESCOPING')
                              && hasActionNeeded
                              && can('financial.submit_pengajuan')
                              && readyTerminKey && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full border border-amber-300 leading-none whitespace-nowrap">
                                    {readyTerminKey} ⚡
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {activeTab === 'overview' && (
                    <div className="space-y-4 mt-6">
                        {/* 1. INFO DASAR */}
                        <details 
                            open={expandedSections['info']} 
                            onToggle={(e) => { if (e.currentTarget.open !== expandedSections['info']) toggleSection('info'); }}
                            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden group"
                        >
                            <summary className="px-6 py-4 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-50 transition-colors flex justify-between items-center list-none border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    <span>Info Dasar</span>
                                </div>
                                <span className="text-slate-400 group-open:rotate-180 transform transition-transform duration-200 block border-t-2 border-r-2 border-slate-400 w-2.5 h-2.5 rotate-[135deg] mr-2" />
                            </summary>
                            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                <div><div className="text-slate-500 font-medium mb-1">Site ID</div><div className="font-bold text-slate-800">{site.id}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Site Name</div><div className="font-bold text-slate-800">{site.name}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Project Type</div><div className="font-bold text-slate-800">{project.type}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Region</div><div className="font-bold text-slate-800">{site.location}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Cluster</div><div className="font-bold text-slate-800">{masterRecordForTeam?.cluster || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Sector</div><div className="font-bold text-slate-800">{masterRecordForTeam?.sector || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">PO Tsel</div><div className="font-bold text-slate-800">{masterRecordForTeam?.po_tsel || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">SOW ID / Pekerjaan</div><div className="font-bold text-slate-800">{site.jobName}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Tower Provider</div><div className="font-bold text-slate-800">{masterRecordForTeam?.tower_provider || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Batch</div><div className="font-bold text-slate-800">{masterRecordForTeam?.batch_ref || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Lat/Long</div><div className="font-bold text-blue-600 hover:underline cursor-pointer">{masterRecordForTeam?.latitude || '-'}, {masterRecordForTeam?.longitude || '-'}</div></div>
                            </div>
                        </details>

                        {/* 2. PERMIT & AKSES */}
                        <details 
                            open={expandedSections['permit']} 
                            onToggle={(e) => { if (e.currentTarget.open !== expandedSections['permit']) toggleSection('permit'); }}
                            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden group"
                        >
                            <summary className="px-6 py-4 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-50 transition-colors flex justify-between items-center list-none border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-amber-600" />
                                    <span>Permit & Akses</span>
                                </div>
                                <span className="text-slate-400 group-open:rotate-180 transform transition-transform duration-200 block border-t-2 border-r-2 border-slate-400 w-2.5 h-2.5 rotate-[135deg] mr-2" />
                            </summary>
                            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                <div><div className="text-slate-500 font-medium mb-1">Permit Status</div><div className="font-bold text-slate-800">{masterRecordForTeam?.raw_data?.permit_status || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Create Date</div><div className="font-bold text-slate-800">{masterRecordForTeam?.raw_data?.permit_start_date || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Expiry Date</div><div className="font-bold text-amber-600">{masterRecordForTeam?.raw_data?.permit_expiry_date || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">TPAS/TP/CAF</div><div className="font-bold text-slate-800">{masterRecordForTeam?.raw_data?.permit_type || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Jenis Kunci</div><div className="font-bold text-slate-800">{masterRecordForTeam?.raw_data?.akses_kunci || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">PIC Nama</div><div className="font-bold text-slate-800">{masterRecordForTeam?.raw_data?.akses_pic || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">PIC Telp</div><div className="font-bold text-slate-800">{masterRecordForTeam?.raw_data?.akses_telp || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Status Akses</div><div className="font-bold text-slate-800">{masterRecordForTeam?.raw_data?.akses_status || '-'}</div></div>
                            </div>
                        </details>

                        {/* 3. IMPLEMENTASI */}
                        <details 
                            open={expandedSections['impl']} 
                            onToggle={(e) => { if (e.currentTarget.open !== expandedSections['impl']) toggleSection('impl'); }}
                            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden group"
                        >
                            <summary className="px-6 py-4 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-50 transition-colors flex justify-between items-center list-none border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-600" />
                                    <span>Implementasi</span>
                                </div>
                                <span className="text-slate-400 group-open:rotate-180 transform transition-transform duration-200 block border-t-2 border-r-2 border-slate-400 w-2.5 h-2.5 rotate-[135deg] mr-2" />
                            </summary>
                            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                <div><div className="text-slate-500 font-medium mb-1">Team</div><div className="font-bold text-slate-800">{team?.name || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Field Leader</div><div className="font-bold text-slate-800">{fieldLeader?.name || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Tanggal Plan</div><div className="font-bold text-slate-800">{masterRecordForTeam?.raw_data?.impl_plan || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">Tanggal Aktual</div><div className="font-bold text-slate-800">{masterRecordForTeam?.raw_data?.impl_aktual || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">CI Date/Time</div><div className="font-bold text-slate-800">{masterRecordForTeam?.raw_data?.impl_ci || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">CO Date/Time</div><div className="font-bold text-slate-800">{masterRecordForTeam?.raw_data?.impl_co || '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">RFI Done</div><div className="font-bold text-slate-800">{masterRecordForTeam?.impl_rfi_done ? 'Selesai' : '-'}</div></div>
                                <div><div className="text-slate-500 font-medium mb-1">RFS Done</div><div className="font-bold text-slate-800">{masterRecordForTeam?.impl_rfs_done ? 'Selesai' : '-'}</div></div>
                            </div>
                        </details>

                        {/* 4. ATP / INEOM */}
                        <details 
                            open={expandedSections['atp']} 
                            onToggle={(e) => { if (e.currentTarget.open !== expandedSections['atp']) toggleSection('atp'); }}
                            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden group"
                        >
                            <summary className="px-6 py-4 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-50 transition-colors flex justify-between items-center list-none border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <Send className="w-5 h-5 text-emerald-600" />
                                    <span>ATP / INEOM</span>
                                </div>
                                <span className="text-slate-400 group-open:rotate-180 transform transition-transform duration-200 block border-t-2 border-r-2 border-slate-400 w-2.5 h-2.5 rotate-[135deg] mr-2" />
                            </summary>
                            <div className="p-6">
                                {!localAtpTask ? (
                                    <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-500 text-sm">
                                        Belum ada task submission ATP/INEOM yang diinisialisasi.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tiket ATP / Number</div>
                                                    <div className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
                                                        {localAtpTask.tiket_atp || '-'}
                                                    </div>
                                            </div>
                                            <div>
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">PDID</div>
                                                    <div className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
                                                        {localAtpTask.pdid || <span className="text-amber-500 italic">REQUEST PDID</span>}
                                                    </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tagging Status</div>
                                                    <div className="text-sm pb-2">
                                                        {localAtpTask.tagging_status === 'done' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold border border-emerald-200">DONE</span>}
                                                        {localAtpTask.tagging_status === 'pending' && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold border border-blue-200">PENDING</span>}
                                                        {localAtpTask.tagging_status === 'na' && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold border border-slate-200">N/A</span>}
                                                    </div>
                                            </div>
                                            <div>
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cell Capture</div>
                                                    <div className="text-sm pb-2 flex items-center gap-2">
                                                        <div className={clsx("w-4 h-4 rounded-sm flex items-center justify-center", localAtpTask.cell_capture_done ? "bg-emerald-500" : "bg-slate-200")}>
                                                            {localAtpTask.cell_capture_done && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <span className="font-semibold text-slate-700">{localAtpTask.cell_capture_done ? 'Selesai' : 'Belum Selesai'}</span>
                                                    </div>
                                            </div>
                                        </div>
                                        <div className="col-span-1 md:col-span-2 mt-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catatan Telkom / INEOM</div>
                                                {can('site.update_stage') && (
                                                    <button 
                                                        onClick={() => setIsEditAtpModalOpen(true)}
                                                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                                    >
                                                        <Edit className="w-3 h-3" /> Edit ATP Data
                                                    </button>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-200 italic">
                                                    {localAtpTask.catatan || 'Tidak ada catatan.'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </details>

                        {/* 5. DATA TEKNIS RF */}
                        <details 
                            open={expandedSections['teknis']} 
                            onToggle={(e) => { if (e.currentTarget.open !== expandedSections['teknis']) toggleSection('teknis'); }}
                            className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden group"
                        >
                            <summary className="px-6 py-4 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-50 transition-colors flex justify-between items-center list-none border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-violet-600" />
                                    <span>Data Teknis RF</span>
                                    {sortedTechRecords.length > 0 && (
                                        <span className="ml-1 px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-xs font-bold border border-violet-200">
                                            {sortedTechRecords.length} records
                                        </span>
                                    )}
                                </div>
                                <span className="text-slate-400 group-open:rotate-180 transform transition-transform duration-200 block border-t-2 border-r-2 border-slate-400 w-2.5 h-2.5 rotate-[135deg] mr-2" />
                            </summary>
                            <div className="p-6">
                                {sortedTechRecords.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-500">Belum ada data teknis.</p>
                                        <p className="text-xs text-slate-400 mt-1">Upload Detail Site-ID sheet untuk menambahkan.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    {([
                                                        { key: 'ne_id', label: 'NE ID' },
                                                        { key: 'layer', label: 'Layer' },
                                                        { key: 'sector', label: 'Sector' },
                                                        { key: 'freq_band', label: 'Freq Band' },
                                                        { key: 'cell_name', label: 'Cell Name' },
                                                        { key: 'ant_type', label: 'Ant Type' },
                                                        { key: 'height', label: 'Height' },
                                                    ] as { key: keyof SiteTechnicalDetail; label: string }[]).map(col => (
                                                        <th
                                                            key={col.key}
                                                            onClick={() => handleTechSort(col.key)}
                                                            className="p-3 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                                                        >
                                                            {col.label}<TechSortIcon col={col.key} />
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {sortedTechRecords.map(row => (
                                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-3 font-mono text-xs text-slate-700">{row.ne_id || '-'}</td>
                                                        <td className="p-3">
                                                            <span className={clsx(
                                                                "px-2 py-0.5 rounded text-xs font-bold",
                                                                row.layer === 'ML' ? 'bg-blue-100 text-blue-700' :
                                                                row.layer === 'MR' ? 'bg-violet-100 text-violet-700' :
                                                                'bg-slate-100 text-slate-600'
                                                            )}>{row.layer || '-'}</span>
                                                        </td>
                                                        <td className="p-3 text-center font-semibold text-slate-700">{String(row.sector ?? '-')}</td>
                                                        <td className="p-3">
                                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-semibold border border-emerald-200">
                                                                {row.freq_band || '-'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 font-mono text-xs text-slate-600">{row.cell_name || '-'}</td>
                                                        <td className="p-3 text-slate-600 max-w-[140px] truncate" title={row.ant_type}>{row.ant_type || '-'}</td>
                                                        <td className="p-3 text-slate-600">{row.height ? `${row.height}m` : '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {sortedTechRecords.length > 0 && (
                                    <p className="mt-2 text-xs text-slate-400 text-right">
                                        Sumber: {sortedTechRecords[0].source_file || 'Import'} — klik header untuk sort
                                    </p>
                                )}
                            </div>
                        </details>

                        {/* 6. DATA TAMBAHAN (Raw Data) */}
                        {['director', 'operational', 'admin'].includes(currentUser?.role || '') && (Object.keys(localRawData).length > 0 || isEditingRawData) && (
                            <details 
                                open={expandedSections['tambahan']} 
                                onToggle={(e) => { if (e.currentTarget.open !== expandedSections['tambahan']) toggleSection('tambahan'); }}
                                className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden group"
                            >
                                <summary className="px-6 py-4 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-50 transition-colors flex justify-between items-center list-none border-b border-slate-100 bg-slate-50/50">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-indigo-600" />
                                        <span>Data Tambahan dari Import — {Object.keys(localRawData).length} fields</span>
                                    </div>
                                    <span className="text-slate-400 group-open:rotate-180 transform transition-transform duration-200 block border-t-2 border-r-2 border-slate-400 w-2.5 h-2.5 rotate-[135deg] mr-2" />
                                </summary>
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-sm text-slate-500">Field kustom yang diekstrak secara otomatis dari Excel.</p>
                                        {!isEditingRawData ? (
                                            <button 
                                                onClick={() => { setTempRawData(localRawData); setIsEditingRawData(true); }}
                                                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 flex items-center gap-2"
                                            >
                                                <Edit className="w-4 h-4" /> Edit Data
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setIsEditingRawData(false)}
                                                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50"
                                                >
                                                    Batal
                                                </button>
                                                <button 
                                                    onClick={() => { setLocalRawData(tempRawData); setIsEditingRawData(false); showToast('Data tambahan berhasil disimpan.'); }}
                                                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                                                >
                                                    Simpan
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="p-3 font-semibold text-slate-600 w-1/3">Field / Kolom</th>
                                                    <th className="p-3 font-semibold text-slate-600">Nilai</th>
                                                    {isEditingRawData && <th className="p-3 w-10"></th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {Object.entries(isEditingRawData ? tempRawData : localRawData).map(([key, val]) => (
                                                    <tr key={key} className="hover:bg-slate-50">
                                                        <td className="p-3 font-medium text-slate-700">
                                                            {isEditingRawData ? (
                                                                <input 
                                                                    type="text" 
                                                                    value={key} 
                                                                    onChange={(e) => {
                                                                        const newKey = e.target.value;
                                                                        const newData = { ...tempRawData };
                                                                        newData[newKey] = newData[key];
                                                                        delete newData[key];
                                                                        setTempRawData(newData);
                                                                    }}
                                                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                                />
                                                            ) : key}
                                                        </td>
                                                        <td className="p-3 text-slate-600">
                                                            {isEditingRawData ? (
                                                                <input 
                                                                    type="text" 
                                                                    value={String(val || '')} 
                                                                    onChange={(e) => setTempRawData({ ...tempRawData, [key]: e.target.value })}
                                                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                                />
                                                            ) : String(val || '-')}
                                                        </td>
                                                        {isEditingRawData && (
                                                            <td className="p-3 text-right">
                                                                <button 
                                                                    onClick={() => {
                                                                        const newData = { ...tempRawData };
                                                                        delete newData[key];
                                                                        setTempRawData(newData);
                                                                    }}
                                                                    className="text-red-500 hover:text-red-700 p-1"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                                {isEditingRawData && (
                                                    <tr>
                                                        <td colSpan={3} className="p-3 bg-slate-50 text-center">
                                                            <button 
                                                                onClick={() => setTempRawData({ ...tempRawData, [`new_field_${Date.now()}`]: '' })}
                                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center justify-center w-full gap-1"
                                                            >
                                                                <Plus className="w-4 h-4" /> Tambah Field
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )}
                                                {Object.keys(localRawData).length === 0 && !isEditingRawData && (
                                                    <tr>
                                                        <td colSpan={2} className="p-4 text-center text-slate-500">Tidak ada data tambahan.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </details>
                        )}
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="space-y-8 mt-6">

                        <EvidenceSection
                            evidences={localEvidences}
                            canUploadEvidence={can('upload_evidence')}
                            onUpload={handleEvidenceUpload}
                        />
                        <MaterialsSection 
                            materials={localMaterials} 
                            skps={localSkps}
                            siteBoQs={localBoQs}
                            canAddSkp={can('manage_data') || (currentUser?.role === 'field')}
                            canMarkReceived={can('manage_data') || (currentUser?.role === 'field')}
                            onAddSkp={() => setIsSkpModalOpen(true)}
                            onMarkReceived={(skpId) => {
                                setSelectedSkpId(skpId);
                                setIsReceiveModalOpen(true);
                            }}
                            onAddMaterial={() => setIsAddMaterialModalOpen(true)}
                        />

                        <FilesSection
                            files={localFiles}
                            canUpload={can('manage_data') || can('upload_docs')}
                            canDelete={can('manage_data')}
                            onUpload={handleFileUpload}
                        />
                    </div>
                )}

                {activeTab === 'costs' && (
                    <div className="space-y-6 mt-6">
                        <div className="w-full">
                            {project.type === 'FILTER' || project.type === 'RESCOPING' ? (
                                ['director', 'finance'].includes(currentUser?.role ?? '') ? (
                                    <DirectorPaymentSection 
                                        site={site}
                                        localStage={localStage}
                                        localPengajuan={localPengajuan}
                                        handleApproveTermin={handleApproveTermin}
                                        handleRejectTermin={handleRejectTermin}
                                        initialExpandedTermin={initialExpand}
                                    />
                                ) : (
                                    <FilterPaymentSection 
                                        site={site}
                                        localStage={localStage}
                                        localPengajuan={localPengajuan}
                                        handleAjukanTermin={handleAjukanTermin}
                                        handleApproveTermin={handleApproveTermin}
                                        handleRejectTermin={handleRejectTermin}
                                        initialExpandedTermin={initialExpand}
                                    />
                                )
                            ) : project.type === 'COMBAT' ? (
                                 <CombatPaymentSection terms={filteredCombatTerms} isTermin1Enabled={localSkps.some(s => s.status === 'Received')} />
                            ) : null}
                        </div>
                        <CostsSection
                            costs={costs}
                            canSubmit={can('submit_request')}
                            canUploadProof={can('process_payment')}
                            canApprove={can('approve_request')}
                            onSubmit={handleSubmitCost}
                            onUploadProof={handleUploadProof}
                            onApprove={handleApproveCost}
                            onReject={handleRejectCost}
                        />
                    </div>
                )}

        {/* Riwayat Stage Section */}
        <details className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden group">
            <summary className="px-6 py-4 font-semibold text-slate-700 cursor-pointer select-none hover:bg-slate-50 transition-colors flex justify-between items-center list-none">
                <span>Riwayat Stage ({localStageLogs.length} perubahan)</span>
                <span className="text-slate-400 group-open:rotate-180 transform transition-transform duration-200 block border-t-2 border-r-2 border-slate-400 w-2.5 h-2.5 rotate-[135deg] mr-2" />
            </summary>
            
            <div className="px-6 pb-6 pt-2 border-t border-slate-100">
                {localStageLogs.length === 0 ? (
                    <div className="text-center text-sm text-slate-500 italic py-4">Belum ada riwayat perubahan stage</div>
                ) : (
                    <div className="space-y-4">
                        {localStageLogs.map(log => (
                            <div key={log.id} className="flex gap-4 text-sm relative">
                                {/* Bullet path */}
                                <div className="flex flex-col items-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 z-10 mt-1.5" />
                                    <div className="w-px h-full bg-slate-200 -mt-1 rounded absolute top-4 bottom-[-16px] left-[5px]" />
                                </div>
                                <div className="flex-1 pb-2">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="text-slate-500 font-mono text-[11px] shrink-0">
                                            {new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                        <span className="font-semibold text-slate-700">{log.created_by}</span>
                                        <span className="text-slate-400 text-xs text-nowrap">merubah stage</span>
                                        {log.from_stage && (
                                            <>
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded font-medium text-xs whitespace-nowrap">
                                                    {log.from_stage}
                                                </span>
                                                <ArrowLeft className="w-3 h-3 text-slate-400 rotate-180" />
                                            </>
                                        )}
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-medium text-xs whitespace-nowrap">
                                            {log.to_stage}
                                        </span>
                                    </div>
                                    {log.notes && (
                                        <div className={clsx("mt-1.5 text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 whitespace-pre-wrap ml-1", log.notes.startsWith('[ISSUE/HOLD]') && "bg-red-50 text-red-700 border-red-100")}>
                                            {log.notes}
                                        </div>
                                    )}
                                    {log.source === 'bulk_import' && (!log.evidence_files || log.evidence_files.length === 0) && (
                                        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 w-fit ml-1">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            Dokumen referensi belum dilampirkan (Bulk Import)
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </details>

        {/* Modals */}
        <BuatSKPModal 
            isOpen={isSkpModalOpen} 
            onClose={() => setIsSkpModalOpen(false)} 
            onSubmit={handleCreateSkpSubmit}
            siteId={id || ''}
        />
        <TerimaSKPModal 
            isOpen={isReceiveModalOpen}
            onClose={() => setIsReceiveModalOpen(false)}
            onSubmit={handleReceiveSkpSubmit}
            skpId={selectedSkpId}
            skpNumber={localSkps.find(s => s.id === selectedSkpId)?.skpNumber || ''}
        />
        <UpdateStageModal
            isOpen={isUpdateStageModalOpen}
            onClose={() => setIsUpdateStageModalOpen(false)}
            siteId={site.id}
            siteName={site.name}
            projectType={project.type}
            currentStage={localStage}
            onUpdateStage={handleUpdateStage}
            pengajuanRecords={localPengajuan}
        />
        <AddMaterialModal
            isOpen={isAddMaterialModalOpen}
            onClose={() => setIsAddMaterialModalOpen(false)}
            siteId={site.id}
            onSubmit={handleAddMaterialSubmit}
        />
        {isPengajuanModalOpen && (
            <PengajuanTerminModal
                isOpen={isPengajuanModalOpen}
                onClose={() => setIsPengajuanModalOpen(false)}
                siteId={site.id}
                siteName={site.name}
                terminKey={pengajuanData.terminKey}
                nominal={pengajuanData.nominal}
                prefillDocs={pengajuanData.terminKey === 'T2c'
                    ? [
                        ...pengajuanData.docs,
                        // Prefill files marked for ATP
                        ...localFiles.filter(f => f.atp_checked)
                      ]
                    : pengajuanData.docs
                }
                onSubmit={handleSubmitPengajuan}
            />
        )}
        
        {isMultiUploadOpen && (
            <MultiFileUploadModal
                isOpen={isMultiUploadOpen}
                onClose={() => setIsMultiUploadOpen(false)}
                existingFiles={localFiles}
                onSubmit={handleMultiUploadSubmit}
            />
        )}
        {isEditAtpModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">Update ATP / INEOM</h2>
                        <button onClick={() => setIsEditAtpModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <form className="p-6 space-y-4" onSubmit={(e) => {
                         e.preventDefault();
                         const formData = new FormData(e.currentTarget);
                         const task: ATPTask = {
                             ...(localAtpTask || { 
                                 id: `atp-${Date.now()}`, 
                                 site_id: site?.id || '', 
                                 updated_at: new Date().toISOString() 
                             }),
                             pdid: formData.get('pdid') as string || null,
                             tiket_atp: formData.get('tiket_atp') as string || null,
                             tagging_status: formData.get('tagging_status') as 'pending'|'done'|'na',
                             cell_capture_done: formData.get('cell_capture') === 'on',
                             catatan: formData.get('catatan') as string || null,
                             updated_by: currentUser?.name || 'User'
                         } as ATPTask;
                         
                         setLocalAtpTask(task);
                         setIsEditAtpModalOpen(false);
                         showToast('Data ATP/INEOM berhasil diperbarui');
                    }}>
                        <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">Tiket ATP</label>
                             <input type="text" name="tiket_atp" defaultValue={localAtpTask?.tiket_atp || ''} className="w-full border rounded p-2 text-sm" placeholder="Contoh: ATP000000282692" />
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">PDID</label>
                             <input type="text" name="pdid" defaultValue={localAtpTask?.pdid || ''} className="w-full border rounded p-2 text-sm" placeholder="Kosongkan jika REQUEST PDID" />
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">Tagging Status</label>
                             <select name="tagging_status" defaultValue={localAtpTask?.tagging_status || 'pending'} className="w-full border rounded p-2 text-sm">
                                  <option value="pending">PENDING</option>
                                  <option value="done">DONE</option>
                                  <option value="na">N/A</option>
                             </select>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                             <input type="checkbox" name="cell_capture" id="cell_capture" defaultChecked={localAtpTask?.cell_capture_done} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                             <label htmlFor="cell_capture" className="text-sm font-bold text-slate-700 cursor-pointer">Cell Capture Selesai</label>
                        </div>
                        <div>
                             <label className="block text-sm font-bold text-slate-700 mb-1">Catatan</label>
                             <textarea name="catatan" defaultValue={localAtpTask?.catatan || ''} className="w-full border rounded p-2 text-sm" rows={3} placeholder="Tambahkan catatan jika ada..."></textarea>
                        </div>
                        <div className="pt-4 flex justify-end gap-2">
                             <button type="button" onClick={() => setIsEditAtpModalOpen(false)} className="px-4 py-2 border rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                             <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm">Simpan</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Hidden File Inputs for Document Uploads */}
        <input type="file" ref={evidenceInputRef} className="hidden" accept="image/*" onChange={handleEvidenceChange} />
        <input type="file" ref={proofInputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => handleGenericUpload(e, 'Payment Proof')} />
        <input type="file" ref={materialInputRef} className="hidden" onChange={(e) => handleGenericUpload(e, 'Material Document')} />
    </div>
  );
};

export default SiteDetail;
