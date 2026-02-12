'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { NavigationTab } from '@/types';

interface NavItem {
  id: NavigationTab;
  href: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

const MapIcon = ({ filled = false }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={filled ? 0 : 2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const ChargingIcon = ({ filled = false }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={filled ? 0 : 2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const HistoryIcon = ({ filled = false }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={filled ? 0 : 2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ProfileIcon = ({ filled = false }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={filled ? 0 : 2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const navItems: NavItem[] = [
  { id: 'map', href: '/', icon: <MapIcon />, activeIcon: <MapIcon filled /> },
  { id: 'charging', href: '/charging', icon: <ChargingIcon />, activeIcon: <ChargingIcon filled /> },
  { id: 'history', href: '/history', icon: <HistoryIcon />, activeIcon: <HistoryIcon filled /> },
  { id: 'profile', href: '/profile', icon: <ProfileIcon />, activeIcon: <ProfileIcon filled /> },
];

export function Navigation() {
  const pathname = usePathname();
  const t = useTranslations('navigation');

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-xl border-t border-white/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" />

      <div className="relative flex items-center justify-around h-[64px] sm:h-[72px] max-w-lg mx-auto px-1 sm:px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                relative flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-2 sm:px-4 py-1.5 sm:py-2
                transition-all duration-300 rounded-xl sm:rounded-2xl min-w-[56px] sm:min-w-[64px]
                ${active
                  ? 'text-[var(--perun-blue)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }
                active:scale-95
              `}
            >
              {/* Active background pill */}
              {active && (
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--perun-blue)]/10 to-[var(--perun-green)]/10 rounded-xl sm:rounded-2xl" />
              )}

              <div className={`
                relative z-10
                transition-all duration-300
                ${active ? 'transform scale-110' : ''}
              `}>
                {active ? item.activeIcon : item.icon}
              </div>

              <span className={`
                relative z-10 text-[10px] sm:text-[11px] font-medium
                transition-all duration-300
                ${active ? 'font-bold text-[var(--perun-blue)]' : ''}
              `}>
                {t(item.id)}
              </span>

              {/* Active indicator dot */}
              {active && (
                <span className="absolute -bottom-0.5 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gradient-to-r from-[var(--perun-blue)] to-[var(--perun-green)] rounded-full shadow-sm" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
