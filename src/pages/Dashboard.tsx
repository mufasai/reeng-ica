
import { 
  Building2, 
  Users, 
  CreditCard, 
  Wallet,
  FileText,
  MoreHorizontal,
} from 'lucide-react';

const Dashboard = () => {
    // Mock Data
    const summaryData = [
        { title: 'Total Sites', value: '2', icon: Building2, color: 'text-[var(--blue-400)]' },
        { title: 'Total Teams', value: '2', icon: Users, color: 'text-[var(--emerald-400)]' },
        { title: 'Total People', value: '3', icon: Users, color: 'text-[var(--blue-400)]' },
        { title: 'Total Value', value: 'Rp 2.000.000.000', icon: Wallet, color: 'text-[var(--amber-400)]' },
        { title: 'Total Cost', value: 'Rp 0', icon: CreditCard, color: 'text-[var(--coral-400)]' },
        { title: 'Proses Terakhir', value: 'Pengajuan cost: termin_1', icon: FileText, color: 'text-[var(--text-muted)]' },
    ];

    const projectFiles = [
        { id: 2, title: 'Gambar Desain Struktur', originalName: 'Gambar Desain Struktur.pdf', size: '5,000.00 KB', type: 'application/pdf', uploadedAt: '15/02/2026 19:03' },
        { id: 1, title: 'Kontrak Gedung Utama', originalName: 'Kontrak Gedung Utama.pdf', size: '2,000.00 KB', type: 'application/pdf', uploadedAt: '17/02/2026 19:03' },
    ];

    const sites = [
        { id: 2, name: 'Site B', job: 'Pekerjaan Struktur', location: 'Jakarta Pusat', contract: 'CONTRACT-002', start: '01/04/2024', end: '31/08/2024', budget: 'Rp 800.000.000' },
        { id: 1, name: 'Site A', job: 'Pekerjaan Pondasi', location: 'Jakarta Pusat', contract: 'CONTRACT-001', start: '01/01/2024', end: '31/03/2024', budget: 'Rp 500.000.000' },
    ];

  return (
    <div className="space-y-8 flex-1 pb-16">
      {/* Page Header */}
      <div className="page-header kpi-glow-bg z-10 relative">
        <h1 className="page-title">Dashboard Project</h1>
        <p className="subtitle">Example Project Filter</p>
      </div>

      <div className="px-6 space-y-8 relative z-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {summaryData.map((item, index) => (
              <div key={index} className="card-kpi flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[var(--glass-bg-hover)] border border-[var(--glass-border)]">
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <div>
                      <p className="kpi-label">{item.title}</p>
                      <h3 className="kpi-value">{item.value}</h3>
                  </div>
              </div>
          ))}
        </div>

        {/* Project Files Table */}
        <div className="table-wrapper">
          <div className="p-5 border-b border-[var(--glass-border)] flex justify-between items-center bg-[var(--glass-bg)]">
              <h3 className="section-header !mb-0 section-header-accent">Project Files</h3>
              <button className="btn-primary">
                  + Add Files
              </button>
          </div>
          
          <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                      <button className="btn-secondary !py-1 !px-3 !text-xs">Copy</button>
                      <button className="btn-secondary !py-1 !px-3 !text-xs">CSV</button>
                      <button className="btn-secondary !py-1 !px-3 !text-xs">Excel</button>
                      <button className="btn-secondary !py-1 !px-3 !text-xs">Print</button>
                  </div>
                  <div className="flex items-center gap-2">
                      <label className="!mb-0">Search:</label>
                      <input type="text" />
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table>
                      <thead>
                          <tr>
                              <th style={{width: '60px'}}>ID <MoreHorizontal className="w-3 h-3 inline ml-1 opacity-50" /></th>
                              <th>Title <MoreHorizontal className="w-3 h-3 inline ml-1 opacity-50" /></th>
                              <th>Original Name <MoreHorizontal className="w-3 h-3 inline ml-1 opacity-50" /></th>
                              <th>Size <MoreHorizontal className="w-3 h-3 inline ml-1 opacity-50" /></th>
                              <th>Type <MoreHorizontal className="w-3 h-3 inline ml-1 opacity-50" /></th>
                              <th>Uploaded At <MoreHorizontal className="w-3 h-3 inline ml-1 opacity-50" /></th>
                              <th className="text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody>
                          {projectFiles.map((file) => (
                              <tr key={file.id}>
                                  <td>{file.id}</td>
                                  <td className="primary-cell">{file.title}</td>
                                  <td>{file.originalName}</td>
                                  <td>{file.size}</td>
                                  <td>{file.type}</td>
                                  <td>{file.uploadedAt}</td>
                                  <td className="text-right">
                                      <div className="flex justify-end gap-2">
                                          <button className="btn-secondary !py-1 !px-3 !text-xs !bg-[var(--blue-glow)] !text-[var(--blue-400)] !border-[var(--blue-500)]">Download</button>
                                          <button className="btn-danger !py-1 !px-3 !text-xs">Delete</button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
              <div className="flex justify-between items-center mt-4 text-xs text-[var(--text-muted)]">
                  <span>Showing 1 to 2 of 2 entries</span>
                  <div className="flex gap-1">
                      <button className="btn-secondary !py-1 !px-3 !text-xs">Previous</button>
                      <button className="btn-primary !py-1 !px-3 !text-xs">1</button>
                      <button className="btn-secondary !py-1 !px-3 !text-xs">Next</button>
                  </div>
              </div>
          </div>
        </div>

        {/* Sites Table */}
        <div className="table-wrapper">
          <div className="p-5 border-b border-[var(--glass-border)] flex justify-between items-center bg-[var(--glass-bg)]">
              <h3 className="section-header !mb-0 section-header-accent">Sites</h3>
              <button className="btn-primary">
                  + Add Sites
              </button>
          </div>
          
          <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                      <button className="btn-secondary !py-1 !px-3 !text-xs">Copy</button>
                      <button className="btn-secondary !py-1 !px-3 !text-xs">CSV</button>
                      <button className="btn-secondary !py-1 !px-3 !text-xs">Excel</button>
                      <button className="btn-secondary !py-1 !px-3 !text-xs">Print</button>
                  </div>
                  <div className="flex items-center gap-2">
                      <label className="!mb-0">Search:</label>
                      <input type="text" />
                  </div>
              </div>

              <div className="overflow-x-auto">
                  <table>
                      <thead>
                          <tr>
                              <th style={{width: '60px'}}>ID</th>
                              <th>Site Name</th>
                              <th>Nama Pekerjaan</th>
                              <th>Lokasi</th>
                              <th>Nomor Kontrak</th>
                              <th>Tgl Start</th>
                              <th>Tgl End</th>
                              <th>Max Budget</th>
                              <th className="text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody>
                          {sites.map((site) => (
                              <tr key={site.id}>
                                  <td>{site.id}</td>
                                  <td className="primary-cell"><a href="#" className="linked-cell">{site.name}</a></td>
                                  <td>{site.job}</td>
                                  <td>{site.location}</td>
                                  <td>{site.contract}</td>
                                  <td>{site.start}</td>
                                  <td>{site.end}</td>
                                  <td>{site.budget}</td>
                                  <td className="text-right">
                                      <div className="flex justify-end gap-2">
                                          <button className="btn-secondary !py-1 !px-3 !text-xs text-[var(--blue-400)]">View</button>
                                          <button className="btn-warning !py-1 !px-3 !text-xs">Edit</button>
                                          <button className="btn-danger !py-1 !px-3 !text-xs">Delete</button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
              <div className="flex justify-between items-center mt-4 text-xs text-[var(--text-muted)]">
                  <span>Showing 1 to 2 of 2 entries</span>
                  <div className="flex gap-1">
                      <button className="btn-secondary !py-1 !px-3 !text-xs">Previous</button>
                      <button className="btn-primary !py-1 !px-3 !text-xs">1</button>
                      <button className="btn-secondary !py-1 !px-3 !text-xs">Next</button>
                  </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
