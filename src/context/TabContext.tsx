import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface AppTab {
  id: string;        // e.g. 'sites', 'dashboard', 'site-BKS025'
  label: string;     // e.g. 'Sites', 'BKS025 · CIBARUSO'
  icon: string;      // emoji
  path: string;      // '/sites', '/sites/BKS025'
  closeable: boolean;
}

interface TabContextType {
  tabs: AppTab[];
  activeTabId: string;
  openTab: (tab: AppTab) => void;
  closeTab: (id: string) => void;
  activateTab: (id: string) => void;
}

// ─── Default Tabs (always open, not closeable) ────────────────────────────────
const DEFAULT_TABS: AppTab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/', closeable: false },
  { id: 'sites',     label: 'Sites',     icon: '📋', path: '/sites', closeable: false },
];

// ─── Context ──────────────────────────────────────────────────────────────────
const TabContext = createContext<TabContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────
export const TabProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [tabs, setTabs] = useState<AppTab[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState<string>('sites');

  // Sync activeTabId with current URL on location change
  useEffect(() => {
    const pathname = location.pathname;

    // Check if any existing tab path matches the current pathname
    setTabs(prev => {
      const match = prev.find(t => {
        // Exact match or prefix match for site detail pages
        if (t.path === pathname) return true;
        if (pathname.startsWith(t.path + '/') && t.path !== '/') return true;
        return false;
      });

      if (match) {
        setActiveTabId(match.id);
      }

      return prev; // No state change to tabs array
    });
  }, [location.pathname]);

  const openTab = useCallback((tab: AppTab) => {
    setTabs(prev => {
      const exists = prev.find(t => t.id === tab.id);
      if (exists) {
        // Tab already open — just activate it
        setActiveTabId(tab.id);
        navigate(tab.path);
        return prev;
      }
      // Add new tab
      setActiveTabId(tab.id);
      navigate(tab.path);
      return [...prev, tab];
    });
  }, [navigate]);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === id);
      if (idx === -1) return prev;

      const newTabs = prev.filter(t => t.id !== id);

      // If closing the active tab, activate the previous (or next) tab
      setActiveTabId(currentActive => {
        if (currentActive !== id) return currentActive;
        // Prefer the tab to the left, otherwise the one to the right
        const fallback = newTabs[idx - 1] ?? newTabs[idx] ?? newTabs[0];
        if (fallback) {
          navigate(fallback.path);
          return fallback.id;
        }
        return currentActive;
      });

      return newTabs;
    });
  }, [navigate]);

  const activateTab = useCallback((id: string) => {
    setActiveTabId(id);
    const tab = tabs.find(t => t.id === id);
    if (tab) navigate(tab.path);
  }, [tabs, navigate]);

  return (
    <TabContext.Provider value={{ tabs, activeTabId, openTab, closeTab, activateTab }}>
      {children}
    </TabContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export const useTabContext = () => {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error('useTabContext must be used within a TabProvider');
  return ctx;
};
