
import { Bell, Menu, Mail } from 'lucide-react';

const Header = () => {
  return (
    <header className="h-16 bg-[var(--glass-bg)] border-b border-[var(--glass-border)] backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
        {/* Left: Hamburger (Mobile) */}
        <button className="lg:hidden p-2 text-[var(--text-muted)] hover:bg-[var(--glass-bg-hover)] rounded">
            <Menu className="w-5 h-5" />
        </button>

      <div className="hidden lg:flex items-center gap-4 flex-1">
         {/* Breadcrumbs or empty */}
      </div>

      <div className="flex items-center gap-4">
        
         <div className="flex items-center gap-1">
             <button className="relative p-2 text-[var(--text-muted)] hover:text-[var(--blue-400)] transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--blue-500)] rounded-full border-2 border-[var(--glass-bg)]"></span>
            </button>
            <button className="relative p-2 text-[var(--text-muted)] hover:text-[var(--blue-400)] transition-colors">
                <Mail className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--coral-500)] rounded-full border-2 border-[var(--glass-bg)]"></span>
            </button>
        </div>
       
        <div className="h-8 w-px bg-[var(--glass-border)] mx-2"></div>

        <div className="flex items-center gap-3 cursor-pointer">
            <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">Administrator</p>
                <p className="text-xs text-[var(--text-secondary)]">admin@appwork.com</p>
            </div>
            <div className="w-9 h-9 bg-[var(--glass-bg)] rounded-full overflow-hidden border border-[var(--glass-border)]">
                <img src="https://ui-avatars.com/api/?name=Administrator&background=1E2D45&color=fff" alt="Profile" />
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
