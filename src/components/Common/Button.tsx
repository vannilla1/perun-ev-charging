'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const variantConfig: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #00D4FF 0%, #0088CC 100%)',
    color: '#080C14',
    boxShadow: '0 4px 20px -2px rgba(0, 212, 255, 0.35)',
    border: 'none',
    fontWeight: 700,
  },
  secondary: {
    background: 'linear-gradient(135deg, #00FF88 0%, #00AA55 100%)',
    color: '#080C14',
    boxShadow: '0 4px 20px -2px rgba(0, 255, 136, 0.35)',
    border: 'none',
    fontWeight: 700,
  },
  outline: {
    background: 'transparent',
    color: '#00D4FF',
    border: '1.5px solid rgba(0, 212, 255, 0.35)',
    fontWeight: 600,
  },
  danger: {
    background: 'linear-gradient(135deg, #FF3D71 0%, #CC1A4A 100%)',
    color: '#fff',
    boxShadow: '0 4px 20px -2px rgba(255, 61, 113, 0.35)',
    border: 'none',
    fontWeight: 700,
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    fontWeight: 500,
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-6 py-3.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const baseStyle = variantConfig[variant];

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-[var(--border-radius-sm)]
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080C14]
        disabled:opacity-40 disabled:cursor-not-allowed
        active:scale-[0.97]
        tracking-[0.01em]
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      style={{
        ...baseStyle,
        ...(disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
        ...style,
      }}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        if (disabled || loading) return;
        const el = e.currentTarget;
        if (variant === 'primary') {
          el.style.boxShadow = '0 8px 32px -4px rgba(0, 212, 255, 0.55)';
          el.style.transform = 'translateY(-1px)';
        } else if (variant === 'secondary') {
          el.style.boxShadow = '0 8px 32px -4px rgba(0, 255, 136, 0.55)';
          el.style.transform = 'translateY(-1px)';
        } else if (variant === 'outline') {
          el.style.background = 'rgba(0, 212, 255, 0.08)';
          el.style.borderColor = 'rgba(0, 212, 255, 0.7)';
        } else if (variant === 'danger') {
          el.style.boxShadow = '0 8px 32px -4px rgba(255, 61, 113, 0.55)';
          el.style.transform = 'translateY(-1px)';
        } else if (variant === 'ghost') {
          el.style.background = 'rgba(0, 212, 255, 0.06)';
          el.style.color = 'var(--text-primary)';
        }
        if (props.onMouseEnter) props.onMouseEnter(e);
      }}
      onMouseLeave={(e) => {
        if (disabled || loading) return;
        const el = e.currentTarget;
        const s = baseStyle;
        el.style.boxShadow = (s.boxShadow as string) || '';
        el.style.transform = '';
        el.style.background = (s.background as string) || 'transparent';
        el.style.borderColor = '';
        el.style.color = (s.color as string) || '';
        if (props.onMouseLeave) props.onMouseLeave(e);
      }}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
