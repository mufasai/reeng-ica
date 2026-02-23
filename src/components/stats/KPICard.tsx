import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface KPICardProps {
    label: string;
    subLabel?: string;
    value: string;
    icon: LucideIcon;
    accentColor: string; // Hex code for left border
    iconColor: string; // Hex code or Tailwind text color class
    progress?: {
        value: number; // 0-100
        color: string; // Hex or Class
    };
    isPulsing?: boolean;
    onClick?: () => void;
    className?: string; // Additional classes
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
    className
}: KPICardProps) => {
    return (
        <div 
            onClick={onClick}
            className={clsx(
                "card-kpi",
                onClick && "cursor-pointer",
                className
            )}
            style={{ borderLeftColor: accentColor }}
        >
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="p-2 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                    <Icon className="w-6 h-6" style={{ color: iconColor }} />
                </div>
                {isPulsing && (
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--amber-400)] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--amber-500)]"></span>
                    </span>
                )}
            </div>

            <div className="space-y-1 relative z-10">
                <p className="kpi-label !mb-0">{label}</p>
                <h3 className="kpi-value">{value}</h3>
                {subLabel && (
                    <p className="kpi-sub !mt-0">{subLabel}</p>
                )}
            </div>

            {progress && (
                <div className="mt-4 space-y-1.5 relative z-10">
                    <div className="h-1.5 w-full bg-[var(--glass-border)] rounded-full overflow-hidden">
                        <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                                width: `${Math.min(100, Math.max(0, progress.value))}%`,
                                backgroundColor: progress.color 
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default KPICard;
