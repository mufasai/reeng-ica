import React, { useState } from 'react';
import clsx from 'clsx';

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string; // For wrapper
}

export const Tooltip = ({ children, content, position = 'top', className }: TooltipProps) => {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
    };

    const arrowClasses = {
        top: "top-full left-1/2 -translate-x-1/2 -mt-1 border-t-slate-800 border-x-transparent border-b-transparent",
        bottom: "bottom-full left-1/2 -translate-x-1/2 -mb-1 border-b-slate-800 border-x-transparent border-t-transparent",
        left: "left-full top-1/2 -translate-y-1/2 -ml-1 border-l-slate-800 border-y-transparent border-r-transparent",
        right: "right-full top-1/2 -translate-y-1/2 -mr-1 border-r-slate-800 border-y-transparent border-l-transparent",
    };

    return (
        <div 
            className={clsx("relative inline-flex", className)} 
            onMouseEnter={() => setIsVisible(true)} 
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className={clsx(
                    "absolute px-2.5 py-1.5 text-xs font-medium text-white bg-slate-800 rounded shadow-lg whitespace-nowrap z-[100] animate-in fade-in zoom-in-95 duration-200 pointer-events-none",
                    positionClasses[position]
                )}>
                    {content}
                    {/* Arrow */}
                    <div className={clsx("absolute border-4", arrowClasses[position])} />
                </div>
            )}
        </div>
    );
};
