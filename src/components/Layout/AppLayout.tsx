'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from './Navigation';

interface AppLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  header?: React.ReactNode;
  className?: string;
}

export function AppLayout({
  children,
  showNavigation = true,
  header,
  className = '',
}: AppLayoutProps) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      {header && (
        <header
          className="sticky top-0 z-40 safe-area-top"
          style={{
            background: 'rgba(8, 12, 20, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0, 212, 255, 0.08)',
          }}
        >
          {header}
        </header>
      )}

      <main
        className={`
          ${showNavigation ? 'pb-20' : ''}
          ${header ? '' : 'pt-0'}
          ${className}
        `}
      >
        {children}
      </main>

      {showNavigation && <Navigation />}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  showBack?: boolean;
}

const BackButton = () => {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="p-2 -ml-1 rounded-xl transition-all duration-200 active:scale-95"
      style={{
        color: 'var(--text-secondary)',
        background: 'transparent',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 212, 255, 0.08)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
};

export function PageHeader({ title, subtitle, leftAction, rightAction, showBack }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 h-14">
      <div className="flex items-center gap-2">
        {showBack && <BackButton />}
        {leftAction}
        <div>
          <h1
            className="text-base font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
          )}
        </div>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
}
