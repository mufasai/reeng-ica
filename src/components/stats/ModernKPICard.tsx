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
    return (
        <div
            onClick={onClick}
            title={titleTooltip}
            style={{ minWidth: minWidth ?? (compact ? 160 : 220) }}
            className={clsx(
                "group relative bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-200",
                compact ? "p-3.5" : "p-5",
                isActive && "ring-1 ring-blue-500 bg-blue-50/20",
                onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : "cursor-default",
                className
            )}
        >
            {/* Icon + title row */}
            <div className={clsx("flex items-center gap-2.5", compact ? "mb-3" : "mb-4")}>
                <div className={clsx(
                    "rounded-full flex flex-shrink-0 items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.18)]",
                    compact ? "w-8 h-8" : "w-11 h-11",
                    iconClass
                )}>
                    <Icon
                        className={compact ? "w-3.5 h-3.5" : "w-5 h-5"}
                        strokeWidth={2.5}
                    />
                </div>
                <span className={clsx(
                    "font-semibold text-slate-400 tracking-[0.08em] uppercase truncate",
                    compact ? "text-[10px]" : "text-[11px]"
                )}>
                    {title}
                </span>
            </div>

            {/* Value */}
            <div className={compact ? "mb-3" : "mb-4"}>
                <span className={clsx(
                    "font-bold leading-none",
                    compact
                        ? (typeof value === 'string' && value === '—' ? "text-[18px] text-slate-400" : "text-[22px] text-[#111827]")
                        : (typeof value === 'string' && value === '—' ? "text-[24px] text-slate-400" : "text-[28px] text-[#111827]")
                )}>
                    {value}
                </span>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-2.5">
                {(subtitle || trend) && (
                    <div className="flex items-center gap-1.5 min-w-0">
                        {trend && (
                            <span className={clsx(
                                "flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded",
                                compact ? "text-[10px]" : "text-xs",
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
                            <span className={clsx(
                                "text-slate-500 truncate",
                                compact ? "text-[10px]" : "text-[12px]"
                            )}>
                                {subtitle}
                            </span>
                        )}
                        {subtitle && typeof subtitle !== 'string' && subtitle}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModernKPICard;