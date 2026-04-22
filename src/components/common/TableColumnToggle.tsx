import { useState, useRef, useEffect, useCallback } from 'react';
import { Columns, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import type { ColDef } from '../../hooks/useTableColumns';

interface TableColumnToggleProps {
    visibilityMap: Record<string, boolean>;
    onChange: (key: string, val: boolean) => void;
    currentCols: ColDef[];
    onReset: () => void;
}

/**
 * Column visibility picker for the sites table.
 *
 * The dropdown is rendered via a fixed-position portal approach:
 * coordinates are computed from the button's getBoundingClientRect() so the
 * dropdown escapes any ancestor overflow:hidden / overflow-x-auto containers.
 */
const TableColumnToggle = ({ visibilityMap, onChange, currentCols, onReset }: TableColumnToggleProps) => {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Recalculate dropdown position whenever it opens
    const openDropdown = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        setCoords({
            top: rect.bottom + window.scrollY + 6,
            // align right edge of dropdown with right edge of button
            right: window.innerWidth - rect.right,
        });
        setOpen(true);
    }, []);

    const closeDropdown = useCallback(() => setOpen(false), []);

    const toggle = useCallback(() => {
        if (open) closeDropdown();
        else openDropdown();
    }, [open, openDropdown, closeDropdown]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                dropdownRef.current && !dropdownRef.current.contains(target) &&
                buttonRef.current && !buttonRef.current.contains(target)
            ) {
                closeDropdown();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, closeDropdown]);

    // Close on scroll / resize (position becomes stale)
    useEffect(() => {
        if (!open) return;
        const close = () => closeDropdown();
        window.addEventListener('scroll', close, { passive: true });
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close);
            window.removeEventListener('resize', close);
        };
    }, [open, closeDropdown]);

    // site_id and actions are not toggleable (fundamental to layout)
    const toggleable = currentCols.filter(c => c.key !== 'site_id' && c.key !== 'actions');

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={toggle}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 shrink-0"
                title="Toggle columns"
            >
                <Columns className="w-4 h-4 text-slate-500" />
                Kolom
                {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {/* Fixed-position dropdown — escapes all overflow containers */}
            {open && coords && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'fixed',
                        top: coords.top,
                        right: coords.right,
                        zIndex: 9999,
                    }}
                    className="w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col"
                >
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tampilkan Kolom</span>
                    </div>

                    <div className="p-2 max-h-[320px] overflow-y-auto column-picker-scroll flex flex-col gap-0.5">
                        {toggleable.map(col => (
                            <label
                                key={col.key}
                                className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-slate-50 transition-colors group"
                            >
                                <div className="relative flex items-center justify-center shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={!!visibilityMap[col.key]}
                                        onChange={e => onChange(col.key, e.target.checked)}
                                        className="peer appearance-none w-4 h-4 border border-slate-300 rounded checked:bg-blue-500 checked:border-blue-500 transition-all cursor-pointer"
                                    />
                                    <svg
                                        className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                                        viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 select-none">
                                    {col.label}
                                </span>
                            </label>
                        ))}
                    </div>

                    <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                        <button
                            onClick={() => {
                                onReset();
                                closeDropdown();
                            }}
                            className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Reset ke Default
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .column-picker-scroll::-webkit-scrollbar { width: 4px; }
                .column-picker-scroll::-webkit-scrollbar-track { background: transparent; }
                .column-picker-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                .column-picker-scroll:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
            `}</style>
        </>
    );
};

export default TableColumnToggle;
