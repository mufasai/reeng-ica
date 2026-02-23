import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, DollarSign, 
  FileText, Upload, CheckCircle2,
  Image as ImageIcon, Send, Edit
} from 'lucide-react';
import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import FilterPaymentSection from '../components/sections/FilterPaymentSection';
import CombatPaymentSection from '../components/sections/CombatPaymentSection';
import BuatSKPModal from '../components/modals/BuatSKPModal';
import TerimaSKPModal from '../components/modals/TerimaSKPModal';
import { 
    sites, projects, teams, people, 
    siteMaterials, siteEvidence, siteCosts, files, filterTerms, combatTerms, skpRecords,
    type Site, type Project, type Team, type SiteMaterial, type SiteEvidence, type SiteCost, type ProjectFile, type SKP
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
    canViewCosts: boolean;
}

const InfoSection = ({ site, project, team, canViewCosts }: InfoSectionProps) => {
    // Scroll function for Team link
    const scrollToTeam = () => {
        const teamElement = document.getElementById('team-members-strip');
        if (teamElement) {
            teamElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
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

            {/* Right: Schedule & Finance */}
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
                    <div className="grid grid-cols-3">
                        <span className="text-slate-500 mt-1">Team</span>
                        <span 
                            className="col-span-2 text-blue-600 font-medium hover:text-blue-700 hover:underline cursor-pointer group flex items-center gap-1"
                            onClick={scrollToTeam}
                        >
                            {team?.name || 'Unassigned'}
                        </span>
                    </div>
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

interface TeamSectionProps {
    teamName: string;
    teamMembers: { id: string; name: string; role: string }[];
    canManageUsers: boolean;
}

const TeamSection = ({ teamName, teamMembers, canManageUsers }: TeamSectionProps) => {
    const displayMembers = teamMembers.slice(0, 6);
    const extraCount = teamMembers.length - 6;

    return (
        <div className="bg-white border border-slate-200 rounded-lg min-h-[48px] px-4 py-2 flex items-center justify-between shadow-sm mb-6 w-full overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-6">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 whitespace-nowrap text-sm">
                    <Users className="w-4 h-4 text-slate-500" /> Team: <span className="text-blue-600 font-bold">{teamName}</span>
                </h3>
                
                <div className="flex items-center gap-4">
                    {displayMembers.map(m => (
                        <div key={m.id} className="flex items-center gap-2 whitespace-nowrap">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold border border-blue-200 shrink-0">
                                {m.name.charAt(0)}
                            </div>
                            <div className="flex flex-row items-center gap-1.5">
                                <span className="text-sm font-medium text-slate-700">{m.name}</span>
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">{m.role.replace('_', ' ')}</span>
                            </div>
                        </div>
                    ))}
                    {extraCount > 0 && (
                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded-full">
                            +{extraCount} more
                        </span>
                    )}
                </div>
            </div>

            {canManageUsers && (
                <button className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 shrink-0 px-2 py-1 hover:bg-slate-50 rounded transition-colors ml-4 border border-transparent hover:border-slate-200">
                    <Edit className="w-3.5 h-3.5" /> Edit
                </button>
            )}
        </div>
    );
};

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
    canAddSkp: boolean;
    canMarkReceived: boolean;
    onAddSkp: () => void;
    onMarkReceived: (id: string) => void;
}

const MaterialsSection = ({ materials, skps, canAddSkp, canMarkReceived, onAddSkp, onMarkReceived }: MaterialsSectionProps) => {
    const [searchTerm, setSearchTerm] = useState('');
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

    return (
      <div className="space-y-6">
          {/* Sub-Section A: SKP List */}
          <TableContainer>
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" /> Surat Keputusan Pengambilan (SKP)
                  </h3>
                  {canAddSkp && (
                      <button onClick={onAddSkp} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-sm font-medium">
                          <Upload className="w-3 h-3" /> Buat SKP
                      </button>
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

          {/* Sub-Section B: Material Log */}
          {receivedSkps.length > 0 && (
             <TableContainer>
                <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Material Received Log
                    </h3>
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
  const [activeTab, setActiveTab] = useState<'details' | 'evidence' | 'costs'>('costs');

  // SKP Modals State
  const [isSkpModalOpen, setIsSkpModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedSkpId, setSelectedSkpId] = useState<string>('');
  const [localSkps, setLocalSkps] = useState<SKP[]>(skpRecords.filter(s => s.siteId === id));

  const site = sites.find(s => s.id === id);
  const project = projects.find(p => p.id === site?.projectId);
  const team = teams.find(t => t.id === site?.teamId);
  const teamMembers = team ? people.filter(p => team.members.some(m => m.personId === p.id)).map(p => {
      const memberRole = team.members.find(m => m.personId === p.id)?.role || 'engineer';
      return { ...p, role: memberRole };
  }) : [];

  // Filtered Data
  const materials = siteMaterials.filter(m => m.siteId === id);
  const skps = localSkps; // Use local state for immediate UI updates
  const evidences = siteEvidence.filter(e => e.siteId === id);
  const costs = siteCosts.filter(c => c.siteId === id);
  const filteredTerms = filterTerms.filter(f => f.siteId === id);
  const filteredCombatTerms = combatTerms.filter(c => c.siteId === id);
  const siteFiles = files.filter(f => f.projectId === site?.projectId);

  if (!site || !project) {
    return <div className="p-8 text-center text-slate-500">Site not found</div>;
  }

  // --- ACTIONS ---
  const handleFileUpload = () => alert("Upload File Modal would open");
  const handleEvidenceUpload = () => alert("Upload Evidence Modal would open");
  const handleSubmitCost = () => alert("Submit Cost Modal would open");
  const handleUploadProof = (costId: string) => alert(`Upload proof for cost ${costId}`);
  const handleApproveCost = (costId: string) => alert(`Approve cost ${costId}`);
  const handleRejectCost = (costId: string) => alert(`Reject cost ${costId}`);

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
            canViewCosts={can('view_financials')}
        />

        <TeamSection 
            teamName={team?.name || 'Unassigned'}
            teamMembers={teamMembers}
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
                            evidences={evidences}
                            canUploadEvidence={can('upload_evidence')}
                            onUpload={handleEvidenceUpload}
                        />
                        <MaterialsSection 
                            materials={materials} 
                            skps={skps}
                            canAddSkp={can('manage_data') || (currentUser?.role === 'team_leader')}
                            canMarkReceived={can('manage_data') || (currentUser?.role === 'team_leader') || (currentUser?.role === 'engineer')}
                            onAddSkp={() => setIsSkpModalOpen(true)}
                            onMarkReceived={(skpId) => {
                                setSelectedSkpId(skpId);
                                setIsReceiveModalOpen(true);
                            }}
                        />

                        <FilesSection
                            files={siteFiles}
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
                                <FilterPaymentSection terms={filteredTerms} isTermin1Enabled={skps.some(s => s.status === 'Received')} />
                            ) : project.type === 'COMBAT' ? (
                                 <CombatPaymentSection terms={filteredCombatTerms} isTermin1Enabled={skps.some(s => s.status === 'Received')} />
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
            skpNumber={skps.find(s => s.id === selectedSkpId)?.skpNumber || ''}
        />
    </div>
  );
};

export default SiteDetail;
