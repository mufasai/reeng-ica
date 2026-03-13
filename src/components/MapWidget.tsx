import React, { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
    MapPin, ChevronDown, Layers, X, ArrowRight
} from 'lucide-react';
import type { ProjectType, SiteStage } from '../data/mockData';
import { siteMasterRecords } from '../data/mockData';
import { useNavigate } from 'react-router-dom';

// -----------------------------------------------------------------------------
// 0. DEFINITIONS & HELPERS
// -----------------------------------------------------------------------------
const STAGE_COLORS: Record<string, string> = {
    'imported': '#9CA3AF',
    'assigned': '#6B7280',
    'permit_process': '#F59E0B',
    'permit_ready': '#10B981',
    'akses_process': '#3B82F6',
    'akses_ready': '#3B82F6',
    'implementasi': '#8B5CF6',
    'rfi_done': '#8B5CF6',
    'rfs_done': '#8B5CF6',
    'dokumen_done': '#F97316',
    'bast': '#F97316',
    'invoice': '#F97316',
    'completed': '#065F46',
    'issue_hold': '#EF4444',
};

const STAGE_LABELS: Record<string, string> = {
    'imported': 'Imported',
    'assigned': 'Assigned',
    'permit_process': 'Permit Process',
    'permit_ready': 'Permit Ready',
    'akses_process': 'Akses Process',
    'akses_ready': 'Akses Ready',
    'implementasi': 'Implementasi / RFI / RFS',
    'rfi_done': 'Implementasi / RFI / RFS',
    'rfs_done': 'Implementasi / RFI / RFS',
    'dokumen_done': 'Dokumen / BAST / Invoice',
    'bast': 'Dokumen / BAST / Invoice',
    'invoice': 'Dokumen / BAST / Invoice',
    'completed': 'Completed',
    'issue_hold': 'Issue / Hold',
};

const PROJECT_TYPES: { id: ProjectType; label: string }[] = [
    { id: 'FILTER', label: 'Filter' },
    { id: 'COMBAT', label: 'Combat' },
    { id: 'BLACKSITE', label: 'Blacksite' },
    { id: 'L2H', label: 'L2H' },
    { id: 'RESCOPING', label: 'Rescoping' }
];

// Helper to determine color based on stage (handles issue notes mock logic)
const getPinColor = (stage: SiteStage | 'issue_hold', notes?: string) => {
    if (stage === 'issue_hold' || notes?.toLowerCase().includes('issue')) {
        return STAGE_COLORS['issue_hold'];
    }
    return STAGE_COLORS[stage] || STAGE_COLORS['imported'];
};

const getPinLabel = (stage: SiteStage | 'issue_hold', notes?: string) => {
     if (stage === 'issue_hold' || notes?.toLowerCase().includes('issue')) {
        return STAGE_LABELS['issue_hold'];
    }
    return STAGE_LABELS[stage] || STAGE_LABELS['imported'];
};

// SVG Shape generation based on project_type
const generateIconHtml = (type: string, color: string) => {
    const stroke = '#ffffff';
    const strokeW = 2;
    // Base shadow to make pins pop
    const filter = `drop-shadow(0px 2px 3px rgba(0,0,0,0.3))`;

    if (type === 'FILTER') {
        const size = 12;
        return `<svg width="${size}" height="${size}" viewBox="0 0 12 12" style="filter: ${filter}; transform: translate(-50%, -50%); overflow: visible;">
                  <circle cx="6" cy="6" r="5" fill="${color}" stroke="${stroke}" stroke-width="${strokeW}" />
                </svg>`;
    } else if (type === 'COMBAT') {
        const size = 10;
        return `<svg width="${size}" height="${size}" viewBox="0 0 10 10" style="filter: ${filter}; transform: translate(-50%, -50%); overflow: visible;">
                  <rect x="1" y="1" width="8" height="8" fill="${color}" stroke="${stroke}" stroke-width="${strokeW}" rx="1" />
                </svg>`;
    } else if (type === 'BLACKSITE') {
        const size = 12;
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="filter: ${filter}; transform: translate(-50%, -50%); overflow: visible;">
                   <path d="M12 2L22 12L12 22L2 12Z" fill="${color}" stroke="${stroke}" stroke-width="${strokeW}" />
                </svg>`;
    } else if (type === 'L2H') {
        const size = 12;
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="filter: ${filter}; transform: translate(-50%, -50%); overflow: visible;">
                   <path d="M12 3L22 20H2L12 3Z" fill="${color}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round" />
                </svg>`;
    } else {
        const size = 12; // Hexagon
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="filter: ${filter}; transform: translate(-50%, -50%); overflow: visible;">
                   <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" fill="${color}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round" />
                </svg>`;
    }
};

const createCustomIcon = (type: string, stage: string, notes?: string) => {
    const color = getPinColor(stage as SiteStage, notes);
    const html = generateIconHtml(type, color);
    
    return L.divIcon({
        className: 'custom-map-pin',
        html: html,
        iconSize: [0, 0], // CSS handles positioning via svg transform translate
        iconAnchor: [0, 0],
        popupAnchor: [0, -10]
    });
};

// Custom Cluster Icon Logic
const createClusterCustomIcon = function (cluster: any) {
    const markers = cluster.getAllChildMarkers();
    let hasIssue = false;
    let hasPermitProcess = false;

    markers.forEach((marker: any) => {
        // We stored color-determining properties in the marker's options if possible,
        // or we just re-evaluate if we can pass data. A simpler way is to read the data attached.
        // Let's assume the worst case if we just parse the html color briefly, or we attach data to options.
        const siteData = marker.options.siteData;
        if (siteData) {
            if (siteData.stage === 'issue_hold' || siteData.stage_notes?.toLowerCase().includes('issue')) {
                hasIssue = true;
            } else if (siteData.stage === 'permit_process') {
                hasPermitProcess = true;
            }
        }
    });

    let bgColor = 'rgba(156, 163, 175, 0.9)'; // gray
    let shadowColor = 'rgba(156, 163, 175, 0.5)';
    if (hasIssue) {
        bgColor = 'rgba(239, 68, 68, 0.9)'; // red
        shadowColor = 'rgba(239, 68, 68, 0.5)';
    } else if (hasPermitProcess) {
        bgColor = 'rgba(245, 158, 11, 0.9)'; // amber
        shadowColor = 'rgba(245, 158, 11, 0.5)';
    }

    return L.divIcon({
        html: `<div style="background-color: ${bgColor}; box-shadow: 0 0 8px ${shadowColor}; color: white; border: 2px solid white; border-radius: 50%; font-weight: bold; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;">${cluster.getChildCount()}</div>`,
        className: 'custom-cluster-icon',
        iconSize: L.point(30, 30, true),
    });
};

// -----------------------------------------------------------------------------
// Component: MapViewUpdater (Auto-fits bounds when data changes)
// -----------------------------------------------------------------------------
const MapViewUpdater = ({ sites, activeSiteCoords }: { sites: any[], activeSiteCoords?: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        if (activeSiteCoords) {
            // Pan nicely to the selected point but offset slightly left to account for right panel
            const point = map.project(activeSiteCoords, map.getZoom());
            point.x -= 150; // shift 150px left
            const latlng = map.unproject(point, map.getZoom());
            map.flyTo(latlng, Math.max(map.getZoom(), 12), { duration: 0.5 });
        } else if (sites.length > 0) {
            const bounds = L.latLngBounds(sites.map(s => [s.latitude, s.longitude]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
        }
    }, [sites, map, activeSiteCoords]);
    return null;
};

// -----------------------------------------------------------------------------
// Component: MapWidget (Main)
// -----------------------------------------------------------------------------
interface MapWidgetProps {
    className?: string;
    height?: string;
    presetType?: ProjectType; 
    presetStage?: string;
}

const MapWidget: React.FC<MapWidgetProps> = ({ className = '', height = '100%', presetType, presetStage }) => {
    const navigate = useNavigate();

    // 1. Filter States
    const [filterType, setFilterType] = useState<ProjectType | 'All'>(presetType || 'All');
    const [filterStage, setFilterStage] = useState<string>(presetStage || 'All');
    const [filterCluster, setFilterCluster] = useState<string>('All');
    
    const [activeSiteId, setActiveSiteId] = useState<string | null>(null);

    // 2. Data Processing
    // First, find sites that match filters (regardless of coordinates)
    const filteredSitesBase = useMemo(() => {
        return siteMasterRecords.filter(site => {
            if (filterType !== 'All' && site.project_type !== filterType) return false;
            if (filterStage !== 'All' && site.stage !== filterStage) return false;
            if (filterCluster !== 'All' && site.cluster !== filterCluster) return false;
            return true;
        });
    }, [filterType, filterStage, filterCluster]);

    // Sites valid for the map
    const validMapSites = useMemo(() => {
        return filteredSitesBase.filter(site => site.latitude != null && site.longitude != null);
    }, [filteredSitesBase]);

    const missingCoordsCount = filteredSitesBase.length - validMapSites.length;

    // Derived unique choices for dropdowns
    const availableStages = useMemo(() => {
        const stages = new Set<string>();
        siteMasterRecords.forEach(s => stages.add(s.stage));
        return Array.from(stages);
    }, []);

    const availableClusters = useMemo(() => {
        const clusters = new Set<string>();
        siteMasterRecords.forEach(s => { if (s.cluster) clusters.add(s.cluster); });
        return Array.from(clusters).sort();
    }, []);

    // Active Site Object
    const activeSite = useMemo(() => {
        return validMapSites.find(s => s.id === activeSiteId) || null;
    }, [activeSiteId, validMapSites]);

    // 3. Handlers
    const resetFilters = () => {
        setFilterType(presetType || 'All');
        setFilterStage('All');
        setFilterCluster('All');
        setActiveSiteId(null);
    };

    // Default center to Jakarta if no sites to bound
    const defaultCenter: [number, number] = [-6.2, 106.8];

    return (
        <div className={`flex flex-col w-full bg-slate-50 ${className}`} style={{ height }}>
            
            {/* TOP BAR / COMPACT FILTER ROW */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm z-[1010] shrink-0">
                <div className="flex items-center gap-2 overflow-x-auto">
                    <select 
                        value={filterType} 
                        onChange={(e) => setFilterType(e.target.value as any)}
                        disabled={!!presetType}
                        className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 outline-none hover:border-blue-300 transition-colors disabled:opacity-50"
                    >
                        <option value="All">All Types</option>
                        {PROJECT_TYPES.map(pt => <option key={pt.id} value={pt.id}>{pt.label}</option>)}
                    </select>

                    <select 
                        value={filterStage} 
                        onChange={(e) => setFilterStage(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 outline-none hover:border-blue-300 transition-colors capitalize"
                    >
                        <option value="All">All Stages</option>
                        {availableStages.map(s => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                        ))}
                    </select>

                    <select 
                        value={filterCluster} 
                        onChange={(e) => setFilterCluster(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 outline-none hover:border-blue-300 transition-colors"
                    >
                        <option value="All">All Clusters</option>
                        {availableClusters.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    <button 
                        onClick={resetFilters} 
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md transition-colors"
                    >
                        Reset
                    </button>
                </div>

                <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-slate-700">{validMapSites.length} sites ditampilkan</span>
                    {missingCoordsCount > 0 && (
                        <>
                            <span className="text-slate-300">•</span>
                            <span 
                                onClick={() => navigate('/all-sites')} 
                                className="text-amber-600 hover:text-amber-700 font-bold cursor-pointer underline decoration-amber-300 hover:decoration-amber-500 underline-offset-2 transition-colors"
                            >
                                {missingCoordsCount} tanpa koordinat
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* MAP RENDERER & OVERLAYS */}
            <div className="flex-1 w-full relative z-0">
                
                {/* FLOATING RIGHT PANEL FOR SITE DETAILS */}
                {activeSite && (
                    <div className="absolute top-4 right-4 bottom-4 w-80 bg-white/95 backdrop-blur shadow-2xl rounded-xl z-[1000] border border-slate-200 animate-in slide-in-from-right-8 fade-in overflow-hidden flex flex-col pointer-events-auto">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                            <div>
                                <div className="font-mono text-sm font-bold text-slate-600 mb-1 leading-none">{activeSite.site_id} <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] bg-slate-200 text-slate-700 ml-1 leading-none align-middle">{activeSite.project_type}</span></div>
                                <div className="font-bold text-slate-800 text-base leading-tight">{activeSite.site_name}</div>
                            </div>
                            <button onClick={() => setActiveSiteId(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                            <div className="grid grid-cols-3 gap-1">
                                <span className="text-xs text-slate-500">Stage:</span>
                                <span className="col-span-2 text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{backgroundColor: getPinColor(activeSite.stage as SiteStage, activeSite.stage_notes)}}></span>
                                    {getPinLabel(activeSite.stage as SiteStage, activeSite.stage_notes)}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                                <span className="text-xs text-slate-500">Cluster:</span>
                                <span className="col-span-2 text-xs font-semibold text-slate-800">{activeSite.cluster || '—'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                                <span className="text-xs text-slate-500">Region:</span>
                                <span className="col-span-2 text-xs font-semibold text-slate-800">{activeSite.region || '—'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                                <span className="text-xs text-slate-500">Sector:</span>
                                <span className="col-span-2 text-xs font-semibold text-slate-800">{activeSite.sector || '—'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                                <span className="text-xs text-slate-500">Team:</span>
                                <span className="col-span-2 text-xs font-semibold text-slate-800">{(activeSite as any).team_assigned || '— Belum ditugaskan'}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                                <span className="text-xs text-slate-500">Updated:</span>
                                <span className="col-span-2 text-xs font-semibold text-slate-800">
                                     {activeSite.stage_updated_at ? new Date(activeSite.stage_updated_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : '—'}
                                </span>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                             <button 
                                onClick={() => navigate(`/sites/${activeSite.site_id}`)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2 rounded-lg text-center transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <ArrowRight className="w-4 h-4" /> Lihat Detail Site
                            </button>
                        </div>
                    </div>
                )}

                {/* LEGEND (Bottom Left) */}
                <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto flex flex-col gap-2">
                    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-md overflow-hidden">
                        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer" onClick={(e) => {
                            const content = e.currentTarget.nextElementSibling as HTMLElement;
                            content.classList.toggle('hidden');
                        }}>
                            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                                <Layers className="w-3 h-3 text-slate-400" />
                                Legenda
                            </span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                        </div>
                        
                        <div className="p-3 text-xs space-y-3">
                            {/* Shapes Legend */}
                            <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Shapes (Type)</div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 min-w-[200px]">
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600"><div style={{width: 12, height: 12, borderRadius: '50%', backgroundColor: '#CBD5E1', border: '1px solid #94A3B8'}}></div> FILTER</div>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600"><div style={{width: 10, height: 10, backgroundColor: '#CBD5E1', border: '1px solid #94A3B8'}}></div> COMBAT</div>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600"><div style={{width: 12, height: 12, backgroundColor: '#CBD5E1', border: '1px solid #94A3B8', transform: 'rotate(45deg) scale(0.8)'}}></div> BLACKSITE</div>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600">
                                        <div style={{width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '12px solid #CBD5E1'}}></div> L2H
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600"><div style={{width: 12, height: 12, backgroundColor: '#0891B2', border: '1px solid #0E7490'}}></div> RESCOPING</div>
                                </div>
                            </div>
                            {/* Colors Legend */}
                            <div className="pt-2 border-t border-slate-100">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Colors (Stage)</div>
                                <div className="grid grid-cols-1 gap-1.5">
                                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: STAGE_COLORS['imported']}}></div> <span className="text-[10px] text-slate-600">Imported / Assigned</span></div>
                                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: STAGE_COLORS['permit_process']}}></div> <span className="text-[10px] text-slate-600">Permit Process</span></div>
                                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: STAGE_COLORS['permit_ready']}}></div> <span className="text-[10px] text-slate-600">Permit Ready</span></div>
                                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: STAGE_COLORS['akses_process']}}></div> <span className="text-[10px] text-slate-600">Akses Process/Ready</span></div>
                                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: STAGE_COLORS['implementasi']}}></div> <span className="text-[10px] text-slate-600">Implementasi</span></div>
                                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: STAGE_COLORS['bast']}}></div> <span className="text-[10px] text-slate-600">BAST / Invoice</span></div>
                                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: STAGE_COLORS['issue_hold']}}></div> <span className="text-[10px] text-slate-600">Issue / Hold</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAP */}
                <MapContainer 
                    center={defaultCenter} 
                    zoom={9} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        className="map-tiles-custom"
                    />

                    {/* Use react-leaflet-cluster to handle density */}
                    <MarkerClusterGroup
                        chunkedLoading
                        maxClusterRadius={50}
                        showCoverageOnHover={false}
                        spiderfyOnMaxZoom={true}
                        iconCreateFunction={createClusterCustomIcon}
                    >
                        {validMapSites.map(site => (
                            <Marker 
                                key={site.id} 
                                position={[site.latitude!, site.longitude!]}
                                icon={createCustomIcon(site.project_type, site.stage, site.stage_notes)}
                                // Passing siteData to options to be parsed by custom cluster logic
                                // Note: leaflet typings for Marker don't strictly define extra arbitrary props without extending, 
                                // but we can pass it into the generic options via ts-ignore or wrapping.
                                // @ts-ignore
                                siteData={site}
                                eventHandlers={{
                                    click: () => setActiveSiteId(site.id)
                                }}
                            >
                                <Tooltip className="custom-map-tooltip" direction="top" offset={[0, -10]} opacity={1}>
                                    <div className="font-mono text-[10px] font-bold text-slate-500 leading-none">{site.site_id} <span className="bg-slate-100 text-[8px] px-1 rounded ml-1">{site.project_type}</span></div>
                                    <div className="font-bold text-slate-800 text-[11px] leading-tight my-1">{site.site_name}</div>
                                    <div className="text-slate-500 text-[10px] flex items-center gap-1 mb-1 leading-none"><MapPin className="w-2.5 h-2.5" /> {site.cluster || '—'}</div>
                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-700 leading-none mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: getPinColor(site.stage as SiteStage, site.stage_notes)}}></div>
                                        {getPinLabel(site.stage as SiteStage, site.stage_notes)}
                                    </div>
                                    <div className="text-[10px] text-slate-500 leading-none mt-1.5 pt-1.5 border-t border-slate-100">Team: {(site as any).team_assigned || '—'}</div>
                                </Tooltip>
                            </Marker>
                        ))}
                    </MarkerClusterGroup>
                    
                    <MapViewUpdater sites={validMapSites} activeSiteCoords={activeSite ? [activeSite.latitude!, activeSite.longitude!] : undefined} />
                </MapContainer>
            </div>
            
            <style>{`
                /* Styling overrides for Leaflet elements */
                .custom-map-tooltip {
                    background: rgba(255, 255, 255, 0.95);
                    border: 1px solid #E2E8F0;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
                    border-radius: 8px;
                    padding: 8px 10px;
                }
                .custom-map-tooltip::before {
                    border-top-color: #E2E8F0 !important;
                }
                /* Desaturate tiles slightly for better pin visibility */
                .map-tiles-custom {
                    filter: saturate(0.8) contrast(1.1) brightness(1.05);
                }
                /* Let React Leaflet Clusters fade in/out smoothly */
                .leaflet-cluster-anim .leaflet-marker-icon, .leaflet-cluster-anim .leaflet-marker-shadow {
                    -webkit-transition: -webkit-transform 0.3s ease-out, opacity 0.3s ease-in;
                    -moz-transition: -moz-transform 0.3s ease-out, opacity 0.3s ease-in;
                    -o-transition: -o-transform 0.3s ease-out, opacity 0.3s ease-in;
                    transition: transform 0.3s ease-out, opacity 0.3s ease-in;
                }
                .leaflet-cluster-spider-leg {
                    -webkit-transition: -webkit-stroke-dashoffset 0.3s ease-out, -webkit-stroke-opacity 0.3s ease-in;
                    -moz-transition: -moz-stroke-dashoffset 0.3s ease-out, -moz-stroke-opacity 0.3s ease-in;
                    -o-transition: -o-stroke-dashoffset 0.3s ease-out, -o-stroke-opacity 0.3s ease-in;
                    transition: stroke-dashoffset 0.3s ease-out, stroke-opacity 0.3s ease-in;
                }
            `}</style>
        </div>
    );
};

export default MapWidget;
