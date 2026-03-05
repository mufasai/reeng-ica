import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, DollarSign, 
  FileText, Upload, CheckCircle2,
  Image as ImageIcon, Send, Edit, Plus
} from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import FilterPaymentSection from '../components/sections/FilterPaymentSection';
import CombatPaymentSection from '../components/sections/CombatPaymentSection';
import BuatSKPModal from '../components/modals/BuatSKPModal';
import TerimaSKPModal from '../components/modals/TerimaSKPModal';
import {
    sites, projects, teams, people, 
    siteMaterials, siteEvidence, siteCosts, files, filterTerms, combatTerms, skpRecords,
    siteMasterRecords, siteBoQRecords,
    type Site, type Project, type Team, type SiteMaterial, type SiteEvidence, type SiteCost, type ProjectFile, type SKP, type SiteBoQ
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

const EvidenceSection = ({ evidences, canUploadEvidence, onUpload }: EvidenceSectionProps) => (
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
                 <div key={ev.id} className="group relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 min-w-[180px] max-w-[220px]">
                     <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-50">
                         <ImageIcon className="w-8 h-8" />
                     </div>
                     {/* Mock Image Display */}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                         <p className="text-white text-sm font-medium truncate">{ev.progressTag}</p>
                         <p className="text-white/80 text-xs truncate">{ev.uploadedAt} by {ev.uploadedBy}</p>
                     </div>
                     <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">
                         {ev.progressTag}
                     </div>
                 </div>
             ))}
             {evidences.length === 0 && (
                 <div className="col-span-full py-8 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                     No evidence uploaded yet.
                 </div>
             )}
         </div>
    </div>
);

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
      <div className="space-y-6">
          {/* Sub-Section A: Material in Project (BoQ) */}
          <TableContainer>
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center flex-wrap gap-4">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" /> Material in Project
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
          </TableContainer>

          {/* Sub-Section B: Surat Perintah Ambil Material (SPAM/SKP) */}
          <TableContainer>
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center flex-wrap gap-4">
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
          </TableContainer>

          {/* Sub-Section C: Berita Acara Terima Material (BATM) */}
          {receivedSkps.length > 0 && (
             <TableContainer>
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
             </TableContainer>
          )}
      </div>
    );
};

interface FilesSectionProps {
    files: ProjectFile[];
    canUpload: boolean;
    canDelete: boolean;
    onUpload: () => void;
}

const FilesSection = ({ files, canUpload, canDelete, onUpload }: FilesSectionProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const itemsPerPage = 5;

    const filtered = useMemo(() => files.filter(f => f.title.toLowerCase().includes(searchTerm.toLowerCase())), [files, searchTerm]);
    const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    return (
        <TableContainer>
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> Site Files
                </h3>
                {canUpload && (
                    <button onClick={onUpload} className="text-xs flex items-center gap-1 text-blue-600 hover:underline font-medium">
                        <Upload className="w-3 h-3" /> Upload
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
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableHeader>
                <TableBody>
                    {paginated.length === 0 ? (
                        <tr><td colSpan={3}><EmptyState message="No files found" /></td></tr>
                    ) : (
                        paginated.map((f: ProjectFile) => (
                            <TableRow key={f.id}>
                                <TableCell className="text-slate-700 font-medium flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    {f.title}
                                </TableCell>
                                <TableCell className="text-slate-500">{f.size}</TableCell>
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
  if (!site) {
      const masterRecord = siteMasterRecords.find(sm => sm.site_id === id || sm.id === id);
      if (masterRecord) {
          site = {
              id: masterRecord.site_id,
              projectId: `mock-prj-${masterRecord.project_type}`,
              name: masterRecord.site_name,
              location: masterRecord.region,
              budget: 0,
              status: masterRecord.status === 'completed' ? 'completed' : 'in_progress',
              startDate: masterRecord.imported_at.split('T')[0],
              endDate: '',
              jobName: masterRecord.sow_pekerjaan,
              contractNumber: masterRecord.po_tsel,
              workOrderId: masterRecord.work_order_id || ''
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
  const [localFiles, setLocalFiles] = useState<ProjectFile[]>(files.filter(f => f.projectId === site?.projectId));

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
      const file = e.target.files?.[0];
      if (file) {
          const newFile: ProjectFile = { 
              id: `f-mock-${Date.now()}`, 
              projectId: site.projectId, 
              title: file.name, 
              originalName: file.name,
              type: file.type || 'application/octet-stream',
              size: `${(file.size / 1024).toFixed(1)} KB`, 
              uploadedAt: new Date().toISOString().split('T')[0], 
              uploadedBy: currentUser?.name || 'Current User' 
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
                {can('manage_data') && (
                    <button className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white text-sm font-medium rounded shadow-sm transition-colors">
                        Edit Site
                    </button>
                )}
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

        {/* Hidden File Inputs for Document Uploads */}
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        <input type="file" ref={evidenceInputRef} className="hidden" accept="image/*" onChange={handleEvidenceChange} />
        <input type="file" ref={proofInputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => handleGenericUpload(e, 'Payment Proof')} />
        <input type="file" ref={materialInputRef} className="hidden" onChange={(e) => handleGenericUpload(e, 'Material Document')} />
    </div>
  );
};

export default SiteDetail;
