import { useState, useMemo } from 'react';
import { FileText, File, FileCode, FileImage } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { type ProjectFile } from '../../data/mockData';
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
} from '../common/Table';

interface ProjectFilesTableProps {
  files: ProjectFile[];
  onDelete: (id: string) => void;
}

const ProjectFilesTable = ({ files, onDelete }: ProjectFilesTableProps) => {
  const { currentUser, can } = useAuth();
  if (!currentUser) return null;
  
  // Local State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Filter Logic
  const filteredFiles = useMemo(() => {
      return files.filter(f => 
          f.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
          f.originalName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [files, searchTerm]);

  // RBAC: Engineer cannot see this section
  if (currentUser.role === 'engineer') return null;

  // Pagination
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
  const paginatedFiles = filteredFiles.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const getFileIcon = (type: string) => {
      switch (type.toUpperCase()) {
          case 'PDF': return <FileText className="w-5 h-5 text-[var(--coral-500)]" />;
          case 'DWG': return <FileCode className="w-5 h-5 text-[var(--blue-500)]" />;
          case 'JPG': 
          case 'PNG': return <FileImage className="w-5 h-5 text-[var(--purple-400)]" />;
          default: return <File className="w-5 h-5 text-[var(--text-muted)]" />;
      }
  };

  return (
    <TableContainer>
        <div className="p-4 border-b border-[var(--glass-border)] flex justify-between items-center bg-[var(--glass-bg)]">
            <h3 className="section-header !mb-0 !text-[14px]">Project Files</h3>
            {can('edit_project') && (
                <button className="text-[13px] text-[var(--blue-400)] hover:text-[var(--blue-500)] font-medium transition-colors">+ Add Files</button>
            )}
        </div>

        <FilterBar 
            searchValue={searchTerm}
            onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
            searchPlaceholder="Search files..."
            onExport={(type) => console.log('Exporting Files', type)}
        />

        <DataTable>
            <TableHeader>
                <TableHead sortable>Name</TableHead>
                <TableHead>Original Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Type</TableHead>
                <TableHead sortable>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableHeader>
            <TableBody>
                {paginatedFiles.length === 0 ? (
                    <tr>
                        <td colSpan={6}>
                            <EmptyState 
                                message={searchTerm ? "No files found" : "No files uploaded"}
                                subMessage={searchTerm ? "Try different keywords." : "Upload files to see them here."}
                                onReset={() => setSearchTerm('')}
                            />
                        </td>
                    </tr>
                ) : (
                    paginatedFiles.map(file => (
                        <TableRow key={file.id}>
                            <TableCell className="font-medium text-[var(--text-primary)]">
                                <div className="flex items-center gap-2">
                                    {getFileIcon(file.type)}
                                    {file.title}
                                </div>
                            </TableCell>
                            <TableCell className="text-[var(--text-secondary)]">{file.originalName}</TableCell>
                            <TableCell className="text-[var(--text-secondary)]">{file.size}</TableCell>
                            <TableCell>
                                <span className="bg-[var(--glass-bg-active)] border border-[var(--glass-border-active)] text-[var(--text-primary)] px-2 py-0.5 rounded text-xs font-bold uppercase">{file.type}</span>
                            </TableCell>
                            <TableCell className="text-[var(--text-secondary)] text-xs">{file.uploadedAt}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <ActionButton type="download" onClick={() => console.log('Download', file.id)} />
                                    {can('delete_data') && (
                                        <ActionButton type="delete" onClick={() => onDelete(file.id)} />
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </DataTable>

        <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredFiles.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
        />
    </TableContainer>
  );
};

export default ProjectFilesTable;
