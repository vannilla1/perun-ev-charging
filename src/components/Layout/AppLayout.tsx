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
    <div className="min-h-screen bg-[var(--background)]">
      {header && (
        <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)] safe-area-top">
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
      className="p-2 -ml-2 rounded-full hover:bg-[var(--surface-secondary)] transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-[var(--text-primary)]"
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
      <div className="flex items-center gap-3">
        {showBack && <BackButton />}
        {leftAction}
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
}
