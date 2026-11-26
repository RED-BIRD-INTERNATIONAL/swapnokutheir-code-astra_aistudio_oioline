import React from 'react';
import { Lock } from 'lucide-react';

export type AppRoute = 'studio' | 'music' | 'admin' | 'home';

interface NavbarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onLockVault: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  onLockVault,
}) => {
  const navItems: { id: AppRoute; label: string; href: string }[] = [
    { id: 'studio', label: 'Studio', href: '#studio' },
    { id: 'music', label: 'Music Lab', href: '#music' },
    { id: 'admin', label: 'Operations', href: '#admin' },
    { id: 'home', label: 'Overview', href: '#home' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#1A2233] bg-[#07090F]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3 sm:px-6">
        {/* Zone 1: Single-line Wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('studio');
          }}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Astra-Gravity
        </a>

        {/* Zone 2: Concise Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          {navItems.map((item) => {
            const active = currentRoute === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.id);
                }}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  active
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent hover:text-white'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onLockVault}
            className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Lock Studio</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Row (< md) */}
      <nav className="flex md:hidden items-center justify-around border-t border-[#1A2233] bg-[#090C14] px-2 py-1.5 text-xs font-medium text-slate-400">
        {navItems.map((item) => {
          const active = currentRoute === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 transition-colors ${
                active ? 'bg-[#111623] text-cyan-300 font-semibold' : 'hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
