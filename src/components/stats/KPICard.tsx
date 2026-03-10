import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface KPICardProps {
    label: string;
    subLabel?: string;
    value: string;
    icon: LucideIcon;
    accentColor: string; // Hex code — used as icon circle tint + top accent bar
    iconColor: string;   // Hex code for icon stroke color
    progress?: {
        value: number; // 0-100
        color: string; // Hex
    };
    isPulsing?: boolean;
    onClick?: () => void;
    className?: string;
    /** Fixed card width in px. Default 148. Controls portrait aspect ratio. */
    cardWidth?: number;
}

const KPICard = ({
    label,
    subLabel,
    value,
    icon: Icon,
    accentColor,
    iconColor,
    progress,
    isPulsing,
    onClick,
    className,
    cardWidth = 148,
}: KPICardProps) => {
    return (
        <div
            onClick={onClick}
            className={clsx(
                // Portrait compact — fixed narrow width, taller, centered
                "card-kpi relative flex flex-col items-center justify-between gap-3",
                "text-center px-3 py-5 flex-shrink-0",
                onClick && "cursor-pointer",
                className
            )}
            style={{
                width: cardWidth,
                minWidth: cardWidth,
                maxWidth: cardWidth,
                minHeight: Math.round(cardWidth * 1.2), // portrait ~5:6 ratio
                borderTop: `3px solid ${accentColor}`,
                borderLeft: 'none',
            }}
        >
            {/* Pulsing dot — top-right */}
            {isPulsing && (
                <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--amber-400)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--amber-500)]" />
                </span>
            )}

            {/* Icon circle — centered, accentColor tint bg */}
            <div
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-[0_3px_8px_rgba(0,0,0,0.15)]"
                style={{ backgroundColor: `${accentColor}22` }}
            >
                <Icon className="w-5 h-5" strokeWidth={2.5} style={{ color: iconColor }} />
            </div>

            {/* Value + labels */}
            <div className="flex flex-col items-center gap-0.5 flex-1 justify-center relative z-10">
                <h3 className="kpi-value !leading-none">{value}</h3>
                <p className="kpi-label !mb-0 !mt-1">{label}</p>
                {subLabel && (
                    <p className="kpi-sub !mt-0.5">{subLabel}</p>
                )}
            </div>

            {/* Progress bar */}
            {progress && (
                <div className="w-full space-y-1 relative z-10">
                    <div className="h-1 w-full bg-[var(--glass-border)] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${Math.min(100, Math.max(0, progress.value))}%`,
                                backgroundColor: progress.color,
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default KPICard;