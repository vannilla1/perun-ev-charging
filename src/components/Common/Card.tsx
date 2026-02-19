'use client';

import React from 'react';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: React.ReactNode;
  padding?: CardPadding;
  shadow?: boolean;
  hover?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  children,
  padding = 'md',
  shadow = true,
  hover = false,
  className = '',
  style,
  onClick,
}: CardProps) {
  return (
    <div
      className={`
        rounded-[var(--border-radius)]
        ${paddingStyles[padding]}
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${className}
      `}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border)',
        boxShadow: shadow ? '0 2px 12px rgba(0,0,0,0.4)' : 'none',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Subtle gradient shimmer top-left corner */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, rgba(0,212,255,0.15) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-3 ${className}`}>
      <div>
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{title}</h3>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div
      className={`mt-4 pt-4 ${className}`}
      style={{ borderTop: '1px solid var(--border)' }}
    >
      {children}
    </div>
  );
}
