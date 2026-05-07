import { useState, useEffect, useCallback } from 'react';

export interface ColDef {
    key: string;
    label: string;
    defaultVisible: boolean;
}

export const ALL_COLS: ColDef[] = [
    { key: 'site_id', label: 'SITE_ID', defaultVisible: true },
    { key: 'site_name', label: 'Site Name', defaultVisible: true },
    { key: 'atp_number', label: 'ATP Number', defaultVisible: true },
    { key: 'sector', label: 'Sektor', defaultVisible: true },
    { key: 'region', label: 'Region', defaultVisible: true },
    { key: 'tp_name', label: 'TP', defaultVisible: true },
    { key: 'permit_status', label: 'Permit Status', defaultVisible: true },
    { key: 'impl_status', label: 'Impl Status', defaultVisible: true },
    { key: 'atp_status', label: 'ATP Status', defaultVisible: true },
    { key: 'team', label: 'Team', defaultVisible: true },
    { key: 'stage', label: 'Stage', defaultVisible: true },
    { key: 'days', label: 'Last Updated', defaultVisible: true },
    { key: 'termin', label: 'Termin', defaultVisible: true },
    { key: 'actions', label: 'Actions', defaultVisible: true },
    { key: 'priority', label: 'Priority', defaultVisible: true },
    { key: 'ioms', label: 'IOMS', defaultVisible: true },
    // Optional (Hidden by default)
    { key: 'type', label: 'Type', defaultVisible: false },
    { key: 'sow_id', label: 'SOW ID', defaultVisible: false },
    { key: 'po_number', label: 'PO Number', defaultVisible: false },
    { key: 'field_leader', label: 'Field Leader', defaultVisible: false },
    { key: 'cluster', label: 'Cluster', defaultVisible: false },
    { key: 'batch', label: 'Batch', defaultVisible: false },
    { key: 'lat_long', label: 'Lat/Long', defaultVisible: false },
    { key: 'permit_expiry', label: 'Permit Expiry', defaultVisible: false },
    { key: 'po_tsel', label: 'PO Tsel', defaultVisible: false },
];

const MOBILE_COLS = ['site_id', 'site_name', 'stage', 'actions'];

export const useTableColumns = (userId: string) => {
    const LS_KEY = `user_preferences_${userId}_sites_table_columns`;
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>(() => {
        try {
            const stored = localStorage.getItem(LS_KEY);
            if (stored) {
                const parsedList = JSON.parse(stored);
                if (Array.isArray(parsedList)) {
                    const map: Record<string, boolean> = {};
                    ALL_COLS.forEach(c => map[c.key] = parsedList.includes(c.key));
                    map['actions'] = true;
                    map['site_id'] = true;
                    return map;
                }
            }
        } catch { /* ignore */ }
        
        // Default
        return Object.fromEntries(ALL_COLS.map(c => [c.key, c.defaultVisible]));
    });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Whenever userId changes, reload preferences
    useEffect(() => {
        try {
            const stored = localStorage.getItem(LS_KEY);
            if (stored) {
                const parsedList = JSON.parse(stored);
                if (Array.isArray(parsedList)) {
                    const map: Record<string, boolean> = {};
                    ALL_COLS.forEach(c => map[c.key] = parsedList.includes(c.key));
                    map['actions'] = true;
                    map['site_id'] = true;
                    setVisibilityMap(map);
                } else {
                    setVisibilityMap(Object.fromEntries(ALL_COLS.map(c => [c.key, c.defaultVisible])));
                }
            } else {
                setVisibilityMap(Object.fromEntries(ALL_COLS.map(c => [c.key, c.defaultVisible])));
            }
        } catch { 
            setVisibilityMap(Object.fromEntries(ALL_COLS.map(c => [c.key, c.defaultVisible])));
        }
    }, [LS_KEY, userId]);

    const handleVisibilityChange = useCallback((key: string, val: boolean) => {
        setVisibilityMap(prev => {
            const next = { ...prev, [key]: val };
            // Save as array of active column keys
            const activeKeys = Object.keys(next).filter(k => next[k]);
            try {
                localStorage.setItem(LS_KEY, JSON.stringify(activeKeys));
            } catch { }
            return next;
        });
    }, [LS_KEY]);

    const resetToDefault = useCallback(() => {
        const def = Object.fromEntries(ALL_COLS.map(c => [c.key, c.defaultVisible]));
        setVisibilityMap(def);
        try {
            const activeKeys = Object.keys(def).filter(k => def[k]);
            localStorage.setItem(LS_KEY, JSON.stringify(activeKeys));
        } catch { }
    }, [LS_KEY]);

    // Check if column is effectively visible (accounts for mobile override)
    const col = useCallback((key: string) => {
        if (isMobile) {
            return MOBILE_COLS.includes(key);
        }
        return visibilityMap[key] !== false;
    }, [isMobile, visibilityMap]);

    return {
        visibilityMap,
        handleVisibilityChange,
        resetToDefault,
        col,
        currentCols: ALL_COLS
    };
};
