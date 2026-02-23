import { useState } from 'react';
import { X } from 'lucide-react';
import { projects, type Project, type ProjectType } from '../../data/mockData';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: Project) => void;
}

const NewProjectModal = ({ isOpen, onClose, onCreate }: NewProjectModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'FILTER' as ProjectType,
    location: '',
    description: '',
    budget: '',
    startDate: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Create new project object (mock id)
    const newProject = {
        id: `p${projects.length + 1}`,
        name: formData.name,
        type: formData.type,
        status: 'active' as const, // Default to active
        description: formData.description,
        // In a real app, location/budget would be stored. Mock only has partial fields on Project type.
        // We'll just pass it back to the parent to handle "adding" to the list state.
    };
    
    onCreate(newProject);
    onClose();
    // Reset form
    setFormData({
        name: '',
        type: 'FILTER',
        location: '',
        description: '',
        budget: '',
        startDate: ''
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-hover)]">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">New Project</h2>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Project Name</label>
                <input 
                    type="text" 
                    required
                    className="w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                    placeholder="e.g. Filter Deployment Phase 2"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Type</label>
                    <select 
                        className="w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value as ProjectType})}
                    >
                        <option value="FILTER" className="bg-[var(--glass-bg)]">FILTER</option>
                        <option value="COMBAT" className="bg-[var(--glass-bg)]">COMBAT</option>
                        <option value="BLACKSITE" className="bg-[var(--glass-bg)]">BLACKSITE</option>
                        <option value="L2H" className="bg-[var(--glass-bg)]">L2H</option>
                        <option value="REFINEN" className="bg-[var(--glass-bg)]">REFINEN</option>
                    </select>
                </div>
                <div>
                     <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location</label>
                     <input 
                        type="text" 
                        required
                        className="w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                        placeholder="e.g. Jakarta"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                    />
                </div>
            </div>

             <div className="grid grid-cols-2 gap-4">
                <div>
                     <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
                     <input 
                        type="date" 
                        required
                        className="w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    />
                </div>
                <div>
                     <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Budget (Est)</label>
                     <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                        placeholder="Rp 0"
                        value={formData.budget}
                        onChange={(e) => setFormData({...formData, budget: e.target.value})}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
                <textarea 
                    rows={3}
                    className="w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm resize-none placeholder-[var(--text-muted)]"
                    placeholder="Project details..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                ></textarea>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-[var(--glass-border)] mt-4">
                <button 
                    type="button" 
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] rounded transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    className="btn-primary"
                >
                    Create Project
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default NewProjectModal;
