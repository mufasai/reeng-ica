import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { siteMasterRecords, atpWorkOrders } from '../data/mockData';

interface SidebarContextType {
    collapsed: boolean;
    toggle: () => void;
    counts: Record<string, number>;
    workOrderCount: number;
    triggerCountRefresh: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
    collapsed: false,
    toggle: () => {},
    counts: {},
    workOrderCount: 0,
    triggerCountRefresh: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
    const [collapsed, setCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });

    const toggle = () => {
        setCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebar_collapsed', String(next));
            return next;
        });
    };

    const [counts, setCounts] = useState<Record<string, number>>({});
    const [workOrderCount, setWorkOrderCount] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);

    const triggerCountRefresh = useCallback(() => {
        setRefreshKey(k => k + 1);
    }, []);

    useEffect(() => {
        const fetchCounts = () => {
            const counts: Record<string, number> = {};
            siteMasterRecords.forEach(site => {
                const t = String(site.project_type || '').toUpperCase();
                if (t) counts[t] = (counts[t] || 0) + 1;
            });
            setCounts(counts);
            setWorkOrderCount(siteMasterRecords.length);
        };

        fetchCounts();
    }, [refreshKey]);

    return (
        <SidebarContext.Provider value={{ collapsed, toggle, counts, workOrderCount, triggerCountRefresh }}>
            {children}
        </SidebarContext.Provider>
    );
};
