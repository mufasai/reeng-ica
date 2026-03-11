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
    /** Compact mode — smaller padding, text, and icon. Use for Sites/Filter/Combat pages. */
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

    // ── COMPACT: horizontal crypto-style card (icon left | value+label right) ──
    if (compact) {
        return (
            <div
                onClick={onClick}
                title={titleTooltip}
                style={{ minWidth: minWidth ?? 180 }}
                className={clsx(
                    "flex items-center gap-3.5 bg-white rounded-2xl px-4 py-3.5",
                    "shadow-[0_2px_8px_rgba(0,0,0,0.07),0_0_1px_rgba(0,0,0,0.04)]",
                    "transition-all duration-200",
                    isActive && "ring-2 ring-blue-500/40 bg-blue-50/30",
                    onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]" : "cursor-default",
                    className
                )}
            >
                {/* Coin-style icon circle */}
                <div className={clsx(
                    "w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center",
                    "ring-[2.5px] ring-white shadow-[0_4px_14px_rgba(0,0,0,0.22)]",
                    iconClass
                )}>
                    <Icon className="w-5 h-5" strokeWidth={2.2} />
                </div>

                {/* Right side: value → trend+label */}
                <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="text-[22px] font-extrabold leading-none tracking-tight text-[#111827]">
                        {value}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {trend && (
                            <span className={clsx(
                                "inline-flex items-center gap-0.5 text-[11px] font-bold",
                                trend.colorClass ? trend.colorClass :
                                    trend.direction === 'up' ? "text-emerald-500" :
                                    trend.direction === 'down' ? "text-rose-500" :
                                    "text-slate-400"
                            )}>
                                {trend.direction === 'up' && (
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 9L6 3.5L10 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                                {trend.direction === 'down' && (
                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                        <path d="M2 3.5L6 9L10 3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
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

    // ── DEFAULT: tall dashboard card (unchanged) ──────────────────────────────
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