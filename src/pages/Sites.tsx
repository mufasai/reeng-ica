import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import React from 'react';

export interface ModernKPICardProps {
    title: string;
    value: React.ReactNode;
    subtitle?: React.ReactNode;
    icon: LucideIcon;
    iconClass: string; // Tailwind classes for icon background/color e.g. "bg-orange-500 text-white"
    trend?: {
        direction: 'up' | 'down' | 'neutral';
        label: string;
        colorClass?: string;
    };
    onClick?: () => void;
    isActive?: boolean;
    className?: string;
    minWidth?: number;
    titleTooltip?: string;
    /**
     * Compact mode — horizontal layout (icon left, value+label right), short height.
     * Use for Sites / Filter / Combat pages. Dashboard stays with default tall layout.
     */
    compact?: boolean;
}

const ModernKPICard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    iconClass,
    trend,
    onClick,
    isActive,
    className,
    minWidth,
    titleTooltip,
    compact = false,
}: ModernKPICardProps) => {

    // ── COMPACT: short horizontal card like crypto-style reference ────────────
    if (compact) {
        return (
            <div
                onClick={onClick}
                title={titleTooltip}
                style={{ minWidth: minWidth ?? 180 }}
                className={clsx(
                    "flex items-center gap-3 bg-white rounded-xl px-4 py-3",
                    "shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]",
                    "transition-all duration-200",
                    isActive && "ring-1 ring-blue-500 bg-blue-50/20",
                    onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : "cursor-default",
                    className
                )}
            >
                {/* Bold solid icon circle */}
                <div className={clsx(
                    "w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center",
                    "shadow-[0_4px_10px_rgba(0,0,0,0.20)]",
                    iconClass
                )}>
                    <Icon className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </div>

                {/* Right: value on top, trend+label below */}
                <div className="min-w-0">
                    <div className="text-[20px] font-bold leading-none text-[#111827]">
                        {value}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {trend && (
                            <span className={clsx(
                                "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                                trend.colorClass ? trend.colorClass :
                                    trend.direction === 'up' ? "text-emerald-500" :
                                    trend.direction === 'down' ? "text-rose-500" :
                                    "text-slate-400"
                            )}>
                                {trend.direction === 'up' && (
                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 9L6 3.5L10 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                                {trend.direction === 'down' && (
                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 3.5L6 9L10 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                                {trend.label}
                            </span>
                        )}
                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide truncate">
                            {title}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // ── DEFAULT: tall dashboard card ──────────────────────────────────────────
    return (
        <div
            onClick={onClick}
            title={titleTooltip}
            style={{ minWidth: minWidth ?? 220 }}
            className={clsx(
                "group relative bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-200",
                isActive && "ring-1 ring-blue-500 bg-blue-50/20",
                onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : "cursor-default",
                className
            )}
        >
            <div className="flex items-center gap-3 mb-4">
                <div className={clsx(
                    "w-11 h-11 rounded-full flex flex-shrink-0 items-center justify-center",
                    "shadow-[0_4px_10px_rgba(0,0,0,0.18)]",
                    iconClass
                )}>
                    <Icon className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 tracking-[0.08em] uppercase truncate">
                    {title}
                </span>
            </div>

            <div className="mb-4">
                <span className={clsx(
                    "font-bold leading-none",
                    typeof value === 'string' && value === '—'
                        ? "text-[24px] text-slate-400"
                        : "text-[28px] text-[#111827]"
                )}>
                    {value}
                </span>
            </div>

            <div className="border-t border-slate-100 pt-3">
                {(subtitle || trend) && (
                    <div className="flex items-center gap-1.5 min-w-0">
                        {trend && (
                            <span className={clsx(
                                "flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded",
                                trend.colorClass || (
                                    trend.direction === 'up' ? "bg-emerald-100 text-emerald-700" :
                                    trend.direction === 'down' ? "bg-rose-100 text-rose-700" :
                                    "bg-slate-100 text-slate-700"
                                )
                            )}>
                                {trend.direction === 'up' && <span className="text-[10px] leading-none mb-0.5">↗</span>}
                                {trend.direction === 'down' && <span className="text-[10px] leading-none mb-0.5">↘</span>}
                                {trend.label}
                            </span>
                        )}
                        {subtitle && typeof subtitle === 'string' && (
                            <span className="text-[12px] text-slate-500 truncate">{subtitle}</span>
                        )}
                        {subtitle && typeof subtitle !== 'string' && subtitle}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModernKPICard;