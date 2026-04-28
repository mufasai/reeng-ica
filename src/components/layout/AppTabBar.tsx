import { useRef } from 'react';
import { X } from 'lucide-react';
import { useTabContext } from '../../context/TabContext';
import { useSidebar } from '../../context/SidebarContext';
import clsx from 'clsx';

const AppTabBar = () => {
  const { tabs, activeTabId, activateTab, closeTab } = useTabContext();
  const { collapsed } = useSidebar();
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={clsx(
        'sticky top-16 z-30 bg-white border-b border-slate-200 shadow-sm transition-[margin] duration-300 ease-in-out',
        collapsed ? 'ml-0' : 'ml-0'
      )}
    >
      <div
        ref={scrollRef}
        className="flex items-end overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              onClick={() => activateTab(tab.id)}
              className={clsx(
                'group flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150 shrink-0 select-none',
                isActive
                  ? 'border-blue-600 text-blue-700 bg-blue-50/60'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className={clsx('text-[13px]', isActive ? 'font-semibold' : 'font-medium')}>
                {tab.label}
              </span>
              {tab.closeable && (
                <span
                  role="button"
                  aria-label={`Close ${tab.label}`}
                  onClick={e => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={clsx(
                    'ml-0.5 w-4 h-4 rounded flex items-center justify-center transition-colors',
                    isActive
                      ? 'text-blue-400 hover:bg-blue-200 hover:text-blue-700'
                      : 'text-slate-300 group-hover:text-slate-500 hover:bg-slate-200'
                  )}
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AppTabBar;
