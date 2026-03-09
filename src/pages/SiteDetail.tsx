import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, DollarSign, 
  FileText, Upload, CheckCircle2,
  Image as ImageIcon, Send, Edit, Plus, X, AlertTriangle
} from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import FilterPaymentSection from '../components/sections/FilterPaymentSection';
import CombatPaymentSection from '../components/sections/CombatPaymentSection';
import BuatSKPModal from '../components/modals/BuatSKPModal';
import TerimaSKPModal from '../components/modals/TerimaSKPModal';
import UpdateStageModal from '../components/modals/UpdateStageModal';
import {
    sites, projects, teams, people, 
    siteMaterials, siteEvidence, siteCosts, filterTerms, combatTerms, skpRecords,
    siteMasterRecords, siteBoQRecords, siteStageLogs, mockSiteFiles,
    type Site, type Project, type Team, type SiteMaterial, type SiteEvidence, type SiteCost, type ProjectFile, type SKP, type SiteBoQ, type SiteStageLog, type SiteFile
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

interface InfoSectionProps {
    site: Site;
    project: Project;
    team?: Team;
    teamMembers: { id: string; name: string; role: string }[];
    canViewCosts: boolean;
    canManageUsers: boolean;
}

const InfoSection = ({ site, project, team, teamMembers, canViewCosts, canManageUsers }: InfoSectionProps) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Left: General Info */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-full">
                <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Informasi Site</h3>
                <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-3"><span className="text-slate-500">ID</span><span className="col-span-2 font-mono text-slate-700">{site.id}</span></div>
                    <div className="grid grid-cols-3"><span className="text-slate-500">Project</span><span className="col-span-2 text-slate-700">{project.name}</span></div>
                    <div className="grid grid-cols-3"><span className="text-slate-500">Site Name</span><span className="col-span-2 font-medium text-slate-800">{site.name}</span></div>
                    <div className="grid grid-cols-3"><span className="text-slate-500">Job Name</span><span className="col-span-2 text-slate-700">{site.jobName || '-'}</span></div>
                    <div className="grid grid-cols-3"><span className="text-slate-500">Location</span><span className="col-span-2 text-slate-700">{site.location}</span></div>
                    <div className="grid grid-cols-3"><span className="text-slate-500">Contract</span><span className="col-span-2 text-slate-700">{site.contractNumber || '-'}</span></div>
                    <div className="grid grid-cols-3"><span className="text-slate-500">Source BoQ</span><span className="col-span-2 text-slate-700 truncate" title={site.import_source || 'Manual/DB'}>{site.import_source || 'Manual/DB'}</span></div>
                </div>
            </div>

            {/* Middle: Schedule & Finance */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-full flex flex-col">
                <h3 className="font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Informasi Lainnya</h3>
                <div className="space-y-3 text-sm flex-1">
                    {canViewCosts && (
                        <>
                        <div className="grid grid-cols-3"><span className="text-slate-500">Max Value</span><span className="col-span-2 font-bold text-slate-800">Rp {site.budget.toLocaleString('id-ID')}</span></div>
                        <div className="grid grid-cols-3"><span className="text-slate-500">Est. Cost</span><span className="col-span-2 text-slate-600">Rp {(site.budget * 0.8).toLocaleString('id-ID')}</span></div>
                        {/* New Cost Dibayar and Sisa Fields */}
                        <CostDibayarField siteId={site.id} budget={site.budget} />
                        </>
                    )}
                    <div className="grid grid-cols-3"><span className="text-slate-500">Start Date</span><span className="col-span-2 text-slate-700">{site.startDate || '-'}</span></div>
                    <div className="grid grid-cols-3"><span className="text-slate-500">End Date</span><span className="col-span-2 text-slate-700">{site.endDate || '-'}</span></div>
                </div>
            </div>

            {/* Right: Team Info */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-full flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                    <h3 className="font-semibold text-slate-800 text-sm">Team: <span className="text-blue-600">{team?.name || 'Unassigned'}</span></h3>
                    {canManageUsers && (
                        <button className="text-xs font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors">
                            <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                    )}
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2 h-[180px]">
                    {teamMembers.map(m => (
                        <div key={m.id} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold border border-blue-200 shrink-0">
                                {m.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-700 leading-tight">{m.name}</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{m.role.replace('_', ' ')}</span>
                            </div>
                        </div>
                    ))}
                    {teamMembers.length === 0 && (
                        <div className="text-sm text-slate-500 italic py-4 text-center">No team members assigned</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper component to calculate and display paid costs
const CostDibayarField = ({ siteId, budget }: { siteId: string, budget: number }) => {
    // Calculate total paid across FILTER/COMBAT depending on project type implicitly via mock terms
    const siteFilterTerms = filterTerms.filter(t => t.siteId === siteId && t.status === 'paid');
    const siteCombatTerms = combatTerms.filter(t => t.siteId === siteId);
    
    let totalPaid = 0;
    
    // Sum filter terms
    totalPaid += siteFilterTerms.reduce((sum, term) => sum + (term.amountPaid || 0), 0);
    
    // Sum combat substeps
    siteCombatTerms.forEach(term => {
        term.subSteps.filter(s => s.status === 'paid').forEach(sub => {
            totalPaid += (sub.amountPaid || 0);
        });
    });

    // Also include general costs if any are paid
    const siteGeneralCosts = siteCosts.filter(c => c.siteId === siteId && c.status === 'paid');
    totalPaid += siteGeneralCosts.reduce((sum, cost) => sum + (cost.jumlahPembayaran || 0), 0);

    const sisa = budget - totalPaid;

    return (
        <>
        <div className="grid grid-cols-3"><span className="text-slate-500">Cost Dibayar</span><span className="col-span-2 font-medium text-emerald-600">Rp {totalPaid.toLocaleString('id-ID')}</span></div>
        <div className="grid grid-cols-3"><span className="text-slate-500">Sisa</span><span className="col-span-2 font-bold text-amber-600">Rp {sisa.toLocaleString('id-ID')}</span></div>
        </>
    );
}



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
}

const MaterialsSection = ({ materials, skps, siteBoQs, canAddSkp, canMarkReceived, onAddSkp, onMarkReceived }: MaterialsSectionProps) => {
    const [activeTab, setActiveTab] = useState<'material' | 'skp'>('material');
    const [searchTerm, setSearchTerm] = useState('');
    const [boqSearchTerm, setBoqSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;

    const filteredMaterials = useMemo(() => materials.filter(m => 
        m.skp.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.items.some(i => i.toLowerCase().includes(searchTerm.toLowerCase()))
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
                                <TableHead className="w-full">Items</TableHead>
                            </TableHeader>
                            <TableBody>
                                {paginated.length === 0 ? (
                                    <tr><td colSpan={3}><EmptyState message="No materials found" /></td></tr>
                                ) : (
                                    paginated.map((m: SiteMaterial) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="font-medium text-slate-700">{m.skp}</TableCell>
                                            <TableCell className="text-slate-600">{m.date}</TableCell>
                                            <TableCell className="text-slate-600">
                                                <div className="flex flex-wrap gap-1">
                                                    {m.items.map((item: string, i: number) => (
                                                        <span key={i} className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600 border border-slate-200">{item}</span>
                                                    ))}
                                                </div>
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
  const [activeTab, setActiveTab] = useState<'details' | 'evidence' | 'costs'>('details');

  // SKP Modals State
  const [isSkpModalOpen, setIsSkpModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
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

  const team = teams.find(t => t.id === site?.teamId);
  const teamMembers = team ? people.filter(p => team.members.some(m => m.personId === p.id)).map(p => {
      const memberRole = team.members.find(m => m.personId === p.id)?.role || 'engineer';
      return { ...p, role: memberRole };
  }) : [];

  // Filtered Data
  const materials = siteMaterials.filter(m => m.siteId === id);
  const siteBoQs = siteBoQRecords.filter(b => b.siteId === id || b.siteId === site?.projectId);
  const costs = siteCosts.filter(c => c.siteId === id);
  const filteredTerms = filterTerms.filter(f => f.siteId === id);
  const filteredCombatTerms = combatTerms.filter(c => c.siteId === id);

  // Local State for Mocked File Uploads
  const [localEvidences, setLocalEvidences] = useState<SiteEvidence[]>(siteEvidence.filter(e => e.siteId === id));
  const [localFiles, setLocalFiles] = useState<SiteFile[]>(mockSiteFiles.filter(f => f.site_id === id));

  // Stage Tracking State
  const [localStage, setLocalStage] = useState<string>(defaultStage);
  const [localStageLogs, setLocalStageLogs] = useState<SiteStageLog[]>(siteStageLogs.filter(s => s.site_master_id === id || s.site_master_id === site?.id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  const [isUpdateStageModalOpen, setIsUpdateStageModalOpen] = useState(false);

  // File Input Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);

  if (!site || !project) {
    return <div className="p-8 text-center text-slate-500">Site not found</div>;
  }

  // --- ACTIONS ---
  const handleFileUpload = () => fileInputRef.current?.click();
  const handleEvidenceUpload = () => evidenceInputRef.current?.click();
  const handleSubmitCost = () => alert("Submit Cost Modal would open");
  const handleUploadProof = (costId: string) => { proofInputRef.current?.click(); console.log('Uploading proof for cost:', costId); };
  const handleApproveCost = (costId: string) => alert(`Approve cost ${costId}`);
  const handleRejectCost = (costId: string) => alert(`Reject cost ${costId}`);

  // Upload Handlers (Mock logic to update local component state)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList && fileList.length > 0) {
          const file = fileList[0];
          const newFile: SiteFile = { 
              id: `f-mock-${Date.now()}`, 
              site_id: site.id, 
              filename: file.name, 
              original_name: file.name,
              file_url: '#',
              mime_type: file.type || 'application/octet-stream',
              file_size: file.size, 
              source: 'direct_upload',
              uploaded_at: new Date().toISOString(), 
              uploaded_by: currentUser?.name || 'Current User' 
          };
          setLocalFiles([newFile, ...localFiles]);
          alert(`File ${file.name} uploaded successfully!`);
      }
      e.target.value = ''; // Reset input
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

  // --- STEPPER LOGIC ---
  const STAGE_GROUPS = [
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

  // Find when current stage was entered
  const latestLogForStage = localStageLogs.find(l => l.to_stage === localStage && l.from_stage !== localStage);
  const daysInStage = latestLogForStage 
    ? Math.floor((new Date().getTime() - new Date(latestLogForStage.created_at).getTime()) / (1000 * 3600 * 24))
    : 0;

  return (
    <div className="break-words space-y-8 animate-in fade-in duration-500 pb-12">
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
                 {['backoffice_admin', 'management'].includes(currentUser?.role || '') && (
                    <button 
                        onClick={() => setIsUpdateStageModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded shadow-sm transition-colors"
                    >
                        Update Stage
                    </button>
                )}
                {can('manage_data') && (
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

                    // Find date achieved (if past)
                    const logAchieved = localStageLogs.find(l => group.keys.includes(l.to_stage) && l.from_stage !== l.to_stage);
                    const dateAchieved = logAchieved ? new Date(logAchieved.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';

                    return (
                        <div key={idx} className="relative z-10 flex flex-col items-center">
                            <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center border-[3px] shadow-sm mb-2 font-bold text-xs",
                                isPast ? "bg-emerald-500 text-white border-emerald-500" :
                                isCurrent ? "bg-white text-blue-600 border-blue-500 ring-4 ring-blue-100 animate-pulse" :
                                "bg-white text-slate-400 border-slate-200"
                            )}>
                                {isPast ? <CheckCircle2 className="w-5 h-5 text-white" /> : (idx + 1)}
                            </div>
                            <span className={clsx(
                                "text-xs font-semibold whitespace-nowrap",
                                isCurrent ? "text-blue-700" : isPast ? "text-slate-700" : "text-slate-400"
                            )}>
                                {group.label}
                            </span>
                            
                            {/* Meta texts beneath */}
                            <div className="absolute top-14 w-32 text-center text-[10px]">
                                {isPast && dateAchieved ? (
                                    <span className="text-emerald-600">{dateAchieved}</span>
                                ) : isCurrent ? (
                                    <span className="text-blue-500 font-medium">{daysInStage} hr di stage ini</span>
                                ) : (
                                    <span className="text-transparent">.</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <InfoSection
            site={site}
            project={project}
            team={team}
            teamMembers={teamMembers}
            canViewCosts={can('view_financials')}
            canManageUsers={can('manage_data')}
        />

        <div className="space-y-8 w-full">
            {/* Tabs */}
                <div className="border-b border-slate-200 flex gap-6">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={clsx("pb-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'details' ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}
                    >
                        Details & Evidence
                    </button>
                    {can('view_financials') && (
                         <button
                            onClick={() => setActiveTab('costs')}
                            className={clsx("pb-3 text-sm font-medium border-b-2 transition-colors", activeTab === 'costs' ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700")}
                        >
                            Costs & Payments
                        </button>
                    )}
                </div>

                {activeTab === 'details' && (
                    <div className="space-y-8">
                        <EvidenceSection
                            evidences={localEvidences}
                            canUploadEvidence={can('upload_evidence')}
                            onUpload={handleEvidenceUpload}
                        />
                        <MaterialsSection 
                            materials={materials} 
                            skps={localSkps}
                            siteBoQs={siteBoQs}
                            canAddSkp={can('manage_data') || (currentUser?.role === 'team_leader')}
                            canMarkReceived={can('manage_data') || (currentUser?.role === 'team_leader') || (currentUser?.role === 'engineer')}
                            onAddSkp={() => setIsSkpModalOpen(true)}
                            onMarkReceived={(skpId) => {
                                setSelectedSkpId(skpId);
                                setIsReceiveModalOpen(true);
                            }}
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
                    <div className="space-y-6">
                        <div className="w-full">
                            {project.type === 'FILTER' ? (
                                <FilterPaymentSection terms={filteredTerms} isTermin1Enabled={localSkps.some(s => s.status === 'Received')} />
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
        </div>

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
            currentStage={localStage}
            onUpdateStage={handleUpdateStage}
        />

        {/* Hidden File Inputs for Document Uploads */}
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        <input type="file" ref={evidenceInputRef} className="hidden" accept="image/*" onChange={handleEvidenceChange} />
        <input type="file" ref={proofInputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => handleGenericUpload(e, 'Payment Proof')} />
        <input type="file" ref={materialInputRef} className="hidden" onChange={(e) => handleGenericUpload(e, 'Material Document')} />
    </div>
  );
};

export default SiteDetail;
