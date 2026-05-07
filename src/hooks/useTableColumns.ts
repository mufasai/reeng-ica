import { useState, useEffect, useCallback } from 'react';

export interface ColDef {
    key: string;
    label: string;
    defaultVisible: boolean;
}

export const ALL_COLS: ColDef[] = [
    { key: 'no', label: 'No', defaultVisible: true },
    { key: 'project_type', label: 'Project Type', defaultVisible: true },
    { key: 'site_id', label: 'Site ID', defaultVisible: true },
    { key: 'site_moving_status', label: 'Site Moving Status', defaultVisible: true },
    { key: 'final_site_id', label: 'Final Site ID', defaultVisible: true },
    { key: 'site_sector_final', label: 'Site Sector Final', defaultVisible: true },
    { key: 'sector', label: 'Sector', defaultVisible: true },
    { key: 'filter_per_sector', label: 'Filter Per Sector', defaultVisible: true },
    { key: 'region', label: 'Region', defaultVisible: true },
    { key: 'ne_id', label: 'NE ID', defaultVisible: true },
    { key: 'site_name', label: 'Site Name', defaultVisible: true },
    { key: 'tp_name', label: 'TP Name', defaultVisible: true },
    { key: 'ioms_registered', label: 'IOMS Registered', defaultVisible: true },
    { key: 'permit_status', label: 'Permit Status', defaultVisible: true },
    { key: 'issue_problem', label: 'Issue Problem', defaultVisible: true },
    { key: 'note_problem', label: 'Note Problem', defaultVisible: true },
    { key: 'send_permit_format', label: 'Send Permit Format', defaultVisible: true },
    { key: 'implementasi_status', label: 'Implementasi Status', defaultVisible: true },
    { key: 'tanggal_rfs', label: 'Tanggal RFS', defaultVisible: true },
    { key: 'team', label: 'Team', defaultVisible: true },
    { key: 'team_onsite_status', label: 'Team Onsite Status', defaultVisible: true },
    { key: 'issue_implementasi', label: 'Issue Implementasi', defaultVisible: true },
    { key: 'note_implementasi', label: 'Note Implementasi', defaultVisible: true },
    { key: 'status_atp', label: 'Status ATP', defaultVisible: true },
    { key: 'note_foto_evidence', label: 'Note Foto Evidence', defaultVisible: true },
    { key: 'ppid', label: 'PPID', defaultVisible: true },
    { key: 'sow_id', label: 'SOW ID', defaultVisible: true },
    { key: 'po_id', label: 'PO ID', defaultVisible: true },
    { key: 'tiket_number', label: 'Tiket Number', defaultVisible: true },
    { key: 'prio_capex_final', label: 'Prio Capex Final', defaultVisible: true },
    { key: 'new_status_implementation', label: 'New Status Implementation', defaultVisible: true },
    { key: 'prio', label: 'Prio', defaultVisible: true },
    { key: 'latitude', label: 'Latitude', defaultVisible: true },
    { key: 'longitude', label: 'Longitude', defaultVisible: true },
    { key: 'file_date', label: 'File Date', defaultVisible: true },
    { key: 'actions', label: 'Actions', defaultVisible: true },
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
        // Unknown keys (e.g. stale localStorage entries) are treated as hidden,
        // preventing phantom columns when column definitions are renamed/removed.
        if (!ALL_COLS.some(c => c.key === key)) return false;
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
