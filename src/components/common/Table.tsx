import React from 'react';
import { 
    Search, ChevronLeft, ChevronRight, 
    Download, Printer, FileSpreadsheet, Copy, 
    ArrowUpDown, ArrowUp, ArrowDown,
    Eye, Edit, Trash2, Check, X, Upload, Calendar
} from 'lucide-react';
import clsx from 'clsx';

// --- TABLE CONTAINER ---
export const TableContainer = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={clsx("bg-white border border-slate-200 rounded-lg shadow-sm", className)}>
        {children}
    </div>
);

// --- FILTER BAR ---
interface FilterBarProps {
    searchValue: string;
    onSearchChange: (val: string) => void;
    searchPlaceholder?: string;
    
    // Status Filter
    statusOptions?: { label: string; value: string }[];
    statusValue?: string;
    onStatusChange?: (val: string) => void;
    
    // Date Range (Mock UI)
    showDateRange?: boolean;
    
    // Exports
    onExport?: (type: 'csv' | 'excel' | 'print' | 'copy') => void;
    
    // Extra custom actions
    extraActions?: React.ReactNode;
}

export const FilterBar = ({
    searchValue,
    onSearchChange,
    searchPlaceholder = "Cari...",
    statusOptions,
    statusValue,
    onStatusChange,
    showDateRange,
    onExport,
    extraActions
}: FilterBarProps) => {
    return (
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* LEFT: Search & Filter */}
            <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                </div>
                
                {statusOptions && onStatusChange && (
                    <select
                        value={statusValue}
                        onChange={(e) => onStatusChange(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500 cursor-pointer hover:border-slate-400 transition-colors"
                    >
                        <option value="">All Status</option>
                        {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* MIDDLE: Date Range (Optional) */}
            {showDateRange && (
                <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600 text-sm">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>Tgl Start</span>
                    <span className="text-slate-400">—</span>
                    <span>Tgl End</span>
                </div>
            )}

            {/* RIGHT: Export Buttons & Extra Actions */}
            <div className="flex items-center gap-2">
                {extraActions}
                {[
                    { type: 'copy', icon: Copy, label: 'Copy' },
                    { type: 'csv', icon: FileSpreadsheet, label: 'CSV' },
                    { type: 'excel', icon: Download, label: 'Excel' },
                    { type: 'print', icon: Printer, label: 'Print' },
                ].map((btn) => (
                    <button
                        key={btn.type}
                        onClick={() => onExport?.(btn.type as any)}
                        className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
                        title={btn.label}
                    >
                        <btn.icon className="w-4 h-4" />
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- TABLE COMPONENTS ---
export const DataTable = ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            {children}
        </table>
    </div>
);

export const TableHeader = ({ children }: { children: React.ReactNode }) => (
    <thead className="bg-[#f8fafc] border-b border-slate-200">
        <tr>{children}</tr>
    </thead>
);

export const TableHead = ({ 
    children, 
    className, 
    sortable, 
    sortDirection, 
    onSort 
}: { 
    children: React.ReactNode, 
    className?: string,
    sortable?: boolean,
    sortDirection?: 'asc' | 'desc',
    onSort?: () => void
}) => (
    <th 
        className={clsx(
            "px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap",
            sortable && "cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors select-none",
            className
        )}
        onClick={sortable ? onSort : undefined}
    >
        <div className="flex items-center gap-1.5">
            {children}
            {sortable && (
                <span className="text-slate-400">
                    {sortDirection === 'asc' && <ArrowUp className="w-3 h-3 text-blue-500" />}
                    {sortDirection === 'desc' && <ArrowDown className="w-3 h-3 text-blue-500" />}
                    {!sortDirection && <ArrowUpDown className="w-3 h-3 opacity-50" />}
                </span>
            )}
        </div>
    </th>
);

export const TableBody = ({ children }: { children: React.ReactNode }) => (
    <tbody className="divide-y divide-slate-100">
        {children}
    </tbody>
);

export const TableRow = ({ 
    children, 
    className, 
    onClick 
}: { 
    children: React.ReactNode, 
    className?: string,
    onClick?: () => void
}) => (
    <tr 
        onClick={onClick}
        className={clsx(
            "group transition-colors border-b border-slate-50 last:border-b-0",
            "bg-white even:bg-[#fafafa] hover:bg-[#eff6ff]", // Zebra + Hover
             onClick && "cursor-pointer",
            className
        )}
    >
        {children}
    </tr>
);

export const TableCell = ({ children, className, colSpan, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className={clsx("px-4 py-3.5 text-sm text-gray-700", className)} colSpan={colSpan} {...props}>
        {children}
    </td>
);


// --- ACTION BUTTON ---
type ActionType = 'view' | 'edit' | 'delete' | 'download' | 'approve' | 'reject' | 'upload';

interface ActionButtonProps {
    type: ActionType;
    onClick?: (e: React.MouseEvent) => void;
    label?: string; // Optional override
    className?: string;
    disabled?: boolean;
}

import { Tooltip } from './Tooltip';

export const ActionButton = ({ type, onClick, label, className, disabled, tooltip }: ActionButtonProps & { tooltip?: string }) => {
    const configs = {
        view: {
            icon: Eye,
            text: 'View',
            style: "border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:border-blue-300",
            defaultTooltip: "View details"
        },
        edit: {
            icon: Edit,
            text: 'Edit',
            style: "border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300",
            defaultTooltip: "Edit this item"
        },
        delete: {
            icon: Trash2,
            text: 'Delete',
            style: "border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300",
            defaultTooltip: "Delete this item permanently"
        },
        download: {
            icon: Download,
            text: 'Download',
            style: "border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300",
            defaultTooltip: "Download file"
        },
        approve: {
            icon: Check,
            text: 'Approve',
            style: "bg-emerald-500 text-white hover:bg-emerald-600 border border-transparent shadow-sm",
            defaultTooltip: "Approve request"
        },
        reject: {
            icon: X,
            text: 'Reject',
            style: "bg-red-500 text-white hover:bg-red-600 border border-transparent shadow-sm",
            defaultTooltip: "Reject request"
        },
        upload: {
            icon: Upload,
            text: 'Upload',
            style: "bg-blue-600 text-white hover:bg-blue-700 border border-transparent shadow-sm",
            defaultTooltip: "Upload proof/document"
        }
    };

    const config = configs[type];
    const Icon = config.icon;
    const finalTooltip = tooltip || config.defaultTooltip;

    return (
        <Tooltip content={finalTooltip}>
            <button
                onClick={onClick}
                disabled={disabled}
                className={clsx(
                    "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                    config.style,
                    className
                )}
            >
                <Icon className="w-3.5 h-3.5" />
                <span>{label || config.text}</span>
            </button>
        </Tooltip>
    );
};


// --- PAGINATION ---
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export const Pagination = ({ 
    currentPage, 
    totalPages, 
    totalItems, 
    itemsPerPage, 
    onPageChange 
}: PaginationProps) => {
    const startItem = Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1);
    const endItem = Math.min(totalItems, currentPage * itemsPerPage);

    return (
        <div className="bg-white border-t border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-700">{startItem}</span> to <span className="font-semibold text-slate-700">{endItem}</span> of <span className="font-semibold text-slate-700">{totalItems}</span> entries
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Prev</span>
                </button>

                <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                         // Simple pagination logic for mock: show first 5 or relevant window
                         // For now, just show first 5 pages max to keep it simple as requested
                         let pageNum = i + 1;
                         if (totalPages > 5 && currentPage > 3) {
                             pageNum = currentPage - 2 + i;
                             if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                         }
                         
                         return (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum)}
                                className={clsx(
                                    "w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-all",
                                    currentPage === pageNum
                                        ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                        : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                                )}
                            >
                                {pageNum}
                            </button>
                         );
                    })}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};


// --- EMPTY STATE ---
export const EmptyState = ({ message = "Belum ada data", subMessage, onReset }: { message?: string, subMessage?: string, onReset?: () => void }) => (
    <div className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">{message}</h3>
        {subMessage && <p className="text-slate-500 text-sm max-w-sm mx-auto mb-4">{subMessage}</p>}
        
        {onReset && (
            <button 
                onClick={onReset}
                className="text-blue-600 text-sm font-medium hover:underline hover:text-blue-700"
            >
                Reset Filter
            </button>
        )}
    </div>
);
