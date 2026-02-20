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
        bg-[var(--surface)] rounded-[var(--border-radius)]
        ${paddingStyles[padding]}
        ${shadow ? 'shadow-[var(--shadow)]' : ''}
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${className}
      `}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
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
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        {subtitle && (
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
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
    <div className={`mt-4 pt-4 border-t border-[var(--border)] ${className}`}>
      {children}
    </div>
  );
}
