import { useState, useEffect, useRef } from 'react';
import { Bell, Menu, Mail, Search, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { siteMasterRecords, sites } from '../../data/mockData';
import clsx from 'clsx';

const Header = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Perform search
  const searchResults = (() => {
    if (debouncedQuery.trim().length === 0) return [];
    
    const query = debouncedQuery.toLowerCase();
    
    // Exact match first, then partials
    const results = siteMasterRecords.filter(site => {
        return site.site_id.toLowerCase().includes(query) ||
               site.site_name.toLowerCase().includes(query) ||
               site.cluster?.toLowerCase().includes(query) ||
               site.region.toLowerCase().includes(query) ||
               site.ne_id.toLowerCase().includes(query);
    });

    // Sort exact ID matches to top
    results.sort((a, b) => {
        const aExact = a.site_id.toLowerCase() === query;
        const bExact = b.site_id.toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
    });

    return results.slice(0, 8); // Max 8 results
  })();

  const handleResultClick = (siteMasterId: string) => {
      const smRecord = siteMasterRecords.find(sm => sm.id === siteMasterId);
      if (!smRecord) return;

      // Check if execution site exists for this master record
      const executionSite = sites.find(s => s.id === smRecord.site_id);
      
      if (executionSite) {
          navigate(`/sites/${executionSite.id}`);
      } else {
          navigate(`/sites/${smRecord.id}`);
      }
      
      setIsFocused(false);
      setSearchQuery('');
  };

  const getBadgeColor = (type?: string) => {
      switch (type) {
          case 'BLACKSITE': return 'bg-red-50 text-red-600 border-red-200';
          case 'COMBAT': return 'bg-orange-50 text-orange-600 border-orange-200';
          case 'FILTER': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
          case 'L2H': return 'bg-blue-50 text-blue-600 border-blue-200';
          case 'REFINEN': return 'bg-purple-50 text-purple-600 border-purple-200';
          default: return 'bg-slate-50 text-slate-600 border-slate-200';
      }
  };

  return (
    <header className="h-16 bg-[var(--glass-bg)] border-b border-[var(--glass-border)] backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
        {/* Left: Hamburger (Mobile) */}
        <button className="lg:hidden p-2 text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)] rounded">
            <Menu className="w-5 h-5" />
        </button>

      <div className="hidden lg:flex items-center gap-4 flex-1">
         {/* Search Bar */}
         <div ref={searchContainerRef} className="relative group ml-8 z-50">
            <div className={clsx(
                "flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 transition-all duration-300",
                isFocused ? "w-[400px] bg-white ring-2 ring-blue-100 border-blue-300 shadow-sm" : "w-[280px] hover:bg-slate-100/50"
            )}>
                <Search className={clsx("w-4 h-4 transition-colors", isFocused ? "text-blue-500" : "text-slate-400")} />
                <input 
                    ref={searchInputRef}
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    placeholder="Cari site, SITE_ID, cluster..." 
                    className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 text-slate-700"
                />
                {!isFocused && !searchQuery && (
                    <div className="flex items-center gap-1 opacity-60">
                         <kbd className="hidden md:inline-flex items-center justify-center px-1.5 h-5 text-[10px] font-sans font-medium bg-white border border-slate-200 rounded text-slate-500">⌘K</kbd>
                    </div>
                )}
            </div>

            {/* Dropdown Results */}
            {isFocused && debouncedQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hasil Pencarian</span>
                        <span className="text-[10px] text-slate-400">{searchResults.length} ditemukan</span>
                    </div>
                    <div className="max-h-[380px] overflow-y-auto">
                        {searchResults.length > 0 ? (
                            <ul className="py-1">
                                {searchResults.map((site) => (
                                    <li key={site.id}>
                                        <button 
                                            onClick={() => handleResultClick(site.id)}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start justify-between group border-b border-slate-50 last:border-0"
                                        >
                                            <div className="min-w-0 pr-4">
                                                <div className="flex items-center gap-2 flex-wrap mb-1 transition-colors">
                                                    <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                                                        <Search className="w-3 h-3 inline-block mr-1.5 text-slate-400 group-hover:text-blue-500" />
                                                        {site.site_id}
                                                    </span>
                                                    <span className="text-sm font-medium text-slate-600 truncate">{site.site_name}</span>
                                                    
                                                    {site.project_type && (
                                                        <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border whitespace-nowrap", getBadgeColor(site.project_type))}>
                                                            {site.project_type}
                                                        </span>
                                                    )}
                                                    
                                                    {site.stage && (
                                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase whitespace-nowrap">
                                                            {site.stage.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate mt-1">
                                                     <MapPin className="w-3 h-3" />
                                                     <span>{site.cluster || 'No Cluster'} <span className="text-slate-300 mx-1">·</span> {site.region}</span>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-6 text-center text-sm text-slate-500">
                                Tidak ditemukan. Coba SITE_ID lengkap.
                            </div>
                        )}
                    </div>
                </div>
            )}
         </div>
      </div>

      <div className="flex items-center gap-4">
        
         <div className="flex items-center gap-1">
             <button className="relative p-2 text-[var(--text-muted)] hover:text-[var(--blue-400)] transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--blue-500)] rounded-full border-2 border-[var(--glass-bg)]"></span>
            </button>
            <button className="relative p-2 text-[var(--text-muted)] hover:text-[var(--blue-400)] transition-colors">
                <Mail className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--coral-500)] rounded-full border-2 border-[var(--glass-bg)]"></span>
            </button>
        </div>
       
        <div className="h-8 w-px bg-[var(--glass-border)] mx-2"></div>

        <div className="flex items-center gap-3 cursor-pointer">
            <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">Administrator</p>
                <p className="text-xs text-[var(--text-secondary)]">admin@appwork.com</p>
            </div>
            <div className="w-9 h-9 bg-[var(--glass-bg)] rounded-full overflow-hidden border border-[var(--glass-border)]">
                <img src="https://ui-avatars.com/api/?name=Administrator&background=1E2D45&color=fff" alt="Profile" />
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
