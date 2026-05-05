import { useState, useEffect, useRef } from 'react';
import { Bell, Menu, Mail, Search, MapPin, Copy, Check, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { siteMasterRecords, atpWorkOrders, activityFeed } from '../../data/mockData';
import { useTabContext } from '../../context/TabContext';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const Header = () => {
  const navigate = useNavigate();
  const { openTab } = useTabContext();
  const { currentUser, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const notifContainerRef = useRef<HTMLDivElement>(null);
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
      if (notifContainerRef.current && !notifContainerRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
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

      openTab({
        id: `site-${smRecord.site_id}`,
        label: `${smRecord.site_id} · ${smRecord.site_name.substring(0, 12)}`,
        icon: '🏗',
        path: `/sites/${smRecord.site_id}`,
        closeable: true,
      });
      
      setIsFocused(false);
      setSearchQuery('');
  };


  const handleCopyNotification = (e: React.MouseEvent, text: string, id: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const waNotifications = activityFeed.filter(log => !!log.wa_formatted_text);

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
                                {searchResults.map((site) => {
                                    const activeCount = atpWorkOrders.filter(wo => wo.site_id === site.site_id && wo.status === 'active').length;
                                    return (
                                    <li key={site.id}>
                                        <button 
                                            onClick={() => handleResultClick(site.id)}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start justify-between group border-b border-slate-50 last:border-0"
                                        >
                                            <div className="min-w-0 pr-4 w-full">
                                                <div className="flex items-center gap-2 flex-wrap mb-1 transition-colors">
                                                    <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                                                        <Search className="w-3 h-3 inline-block mr-1.5 text-slate-400 group-hover:text-blue-500" />
                                                        {site.site_id}
                                                    </span>
                                                    <span className="text-sm font-medium text-slate-600 truncate">{site.site_name}</span>
                                                    
                                                    <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                        {activeCount} pekerjaan aktif
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate mt-1">
                                                     <MapPin className="w-3 h-3" />
                                                     <span>{site.cluster || 'No Cluster'} <span className="text-slate-300 mx-1">·</span> {site.region}</span>
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                    );
                                })}
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
             <div className="relative" ref={notifContainerRef}>
                 <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={clsx(
                        "relative p-2 transition-colors rounded-full",
                        showNotifications ? "bg-blue-50 text-blue-600" : "text-[var(--text-muted)] hover:bg-slate-100 hover:text-[var(--blue-400)]"
                    )}
                 >
                    <Bell className="w-5 h-5" />
                    {waNotifications.length > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                            {waNotifications.length}
                        </span>
                    )}
                 </button>

                 {/* Notifications Dropdown */}
                 {showNotifications && (
                     <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                         <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                             <h4 className="font-bold text-slate-800 text-sm">Notifikasi</h4>
                             <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{waNotifications.length} Baru</span>
                         </div>
                         <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                             {waNotifications.map(notif => (
                                 <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors">
                                     <div className="flex gap-3">
                                         <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                             <Bell className="w-4 h-4" />
                                         </div>
                                         <div className="flex-1 min-w-0">
                                             <p className="text-sm font-semibold text-slate-800 leading-tight mb-1">{notif.action} • {notif.target}</p>
                                             <p className="text-xs text-slate-500 mb-3">{notif.timestamp}</p>
                                             
                                             <button 
                                                 onClick={(e) => handleCopyNotification(e, notif.wa_formatted_text!, notif.id)}
                                                 className={clsx(
                                                     "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all w-fit",
                                                     copiedId === notif.id 
                                                         ? "bg-emerald-50 text-emerald-600" 
                                                         : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-sm"
                                                 )}
                                             >
                                                 {copiedId === notif.id ? (
                                                     <><Check className="w-3.5 h-3.5" /> Disalin</>
                                                 ) : (
                                                     <><Copy className="w-3.5 h-3.5" /> Salin WA Notif</>
                                                 )}
                                             </button>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                             {waNotifications.length === 0 && (
                                 <div className="p-6 text-center text-slate-500 text-sm">
                                     Tidak ada notifikasi baru.
                                 </div>
                             )}
                         </div>
                     </div>
                 )}
             </div>
            <button className="relative p-2 text-[var(--text-muted)] hover:bg-slate-100 rounded-full hover:text-[var(--blue-400)] transition-colors">
                <Mail className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--coral-500)] rounded-full border-2 border-[var(--glass-bg)]"></span>
            </button>
        </div>
       
        <div className="h-8 w-px bg-[var(--glass-border)] mx-2"></div>

        <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{currentUser?.name || 'Guest'}</p>
                <p className="text-xs text-[var(--text-secondary)]">{currentUser?.email || ''}</p>
            </div>
            <div className="w-9 h-9 bg-[var(--glass-bg)] rounded-full overflow-hidden border border-[var(--glass-border)]">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'U')}&background=2563eb&color=fff`} alt="Profile" />
            </div>
            <button
                onClick={() => { logout(); navigate('/'); }}
                title="Keluar"
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
                <LogOut className="w-4 h-4" />
            </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
