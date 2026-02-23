import { useState } from 'react';
import { X, Calendar, MapPin, Briefcase } from 'lucide-react';
import { teams, type Site } from '../../data/mockData';

interface AddSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (site: Site) => void;
  projectId: string;
}

const AddSiteModal = ({ isOpen, onClose, onAdd, projectId }: AddSiteModalProps) => {
  const [formData, setFormData] = useState<Partial<Site>>({
    name: '',
    jobName: '',
    location: '',
    contractNumber: '',
    startDate: '',
    endDate: '',
    budget: 0,
    teamId: ''
  });

  // Filter teams for this project
  const projectTeams = teams.filter(t => t.projectId === projectId);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSite: Site = {
        id: `s${Date.now()}`, // Simple mock ID
        projectId,
        name: formData.name || '',
        location: formData.location || '',
        budget: Number(formData.budget) || 0,
        teamId: formData.teamId,
        jobName: formData.jobName,
        contractNumber: formData.contractNumber,
        startDate: formData.startDate,
        endDate: formData.endDate
    };
    onAdd(newSite);
    onClose();
    setFormData({
        name: '', 
        jobName: '', 
        location: '', 
        contractNumber: '', 
        startDate: '', 
        endDate: '', 
        budget: 0, 
        teamId: '' 
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="flex justify-between items-center p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg-hover)]">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Add New Site</h2>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Site Name</label>
                    <input 
                        type="text" required
                        className="w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                        placeholder="e.g. Site C - Base Station"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Job Name</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
                        <input 
                            type="text" required
                            className="pl-9 w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                            placeholder="e.g. Installation"
                            value={formData.jobName}
                            onChange={e => setFormData({...formData, jobName: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
                        <input 
                            type="text" required
                            className="pl-9 w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                            placeholder="e.g. Surabaya"
                            value={formData.location}
                            onChange={e => setFormData({...formData, location: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Contract Number</label>
                    <input 
                        type="text"
                        className="w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                        placeholder="e.g. CTR-2024-00X"
                        value={formData.contractNumber}
                        onChange={e => setFormData({...formData, contractNumber: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Max Budget</label>
                    <input 
                        type="number"
                        className="w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                        placeholder="0"
                        value={formData.budget}
                        onChange={e => setFormData({...formData, budget: Number(e.target.value)})}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
                    <div className="relative">
                         <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
                         <input 
                            type="date" required
                            className="pl-9 w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                            value={formData.startDate}
                            onChange={e => setFormData({...formData, startDate: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">End Date</label>
                    <div className="relative">
                         <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
                         <input 
                            type="date"
                            className="pl-9 w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)]"
                            value={formData.endDate}
                            onChange={e => setFormData({...formData, endDate: e.target.value})}
                        />
                    </div>
                </div>

                <div className="col-span-2">
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Assigned Team</label>
                    <select 
                        className="w-full px-3 py-2 border border-[var(--glass-border)] bg-[var(--glass-bg-hover)] rounded focus:outline-none focus:border-[var(--blue-500)] text-[var(--text-primary)] text-sm"
                        value={formData.teamId}
                        onChange={e => setFormData({...formData, teamId: e.target.value})}
                    >
                        <option value="">Select a team...</option>
                        {projectTeams.map(team => (
                            <option key={team.id} value={team.id} className="bg-[var(--glass-bg)]">{team.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-[var(--glass-border)]">
                <button 
                    type="button" 
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-hover)] rounded transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit"
                    className="btn-primary flex items-center justify-center gap-2"
                >
                    Add Site
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AddSiteModal;
