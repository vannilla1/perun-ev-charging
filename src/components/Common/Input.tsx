'use client';

import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-3
              rounded-[var(--border-radius-sm)]
              text-sm
              transition-all duration-200
              focus:outline-none
              disabled:opacity-40 disabled:cursor-not-allowed
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${className}
            `}
            style={{
              background: 'rgba(0, 212, 255, 0.04)',
              border: error
                ? '1.5px solid rgba(255, 61, 113, 0.5)'
                : '1.5px solid rgba(0, 212, 255, 0.12)',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = error
                ? '1.5px solid rgba(255, 61, 113, 0.7)'
                : '1.5px solid rgba(0, 212, 255, 0.5)';
              e.currentTarget.style.boxShadow = error
                ? '0 0 0 3px rgba(255, 61, 113, 0.1)'
                : '0 0 0 3px rgba(0, 212, 255, 0.08)';
              e.currentTarget.style.background = 'rgba(0, 212, 255, 0.06)';
              if (props.onFocus) props.onFocus(e);
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = error
                ? '1.5px solid rgba(255, 61, 113, 0.5)'
                : '1.5px solid rgba(0, 212, 255, 0.12)';
              e.currentTarget.style.boxShadow = '';
              e.currentTarget.style.background = 'rgba(0, 212, 255, 0.04)';
              if (props.onBlur) props.onBlur(e);
            }}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs" style={{ color: 'var(--error)' }}>{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = true,
      className = '',
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-medium mb-1.5 uppercase tracking-wide"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`
            w-full px-4 py-3
            rounded-[var(--border-radius-sm)]
            text-sm
            transition-all duration-200 resize-none
            focus:outline-none
            disabled:opacity-40 disabled:cursor-not-allowed
            ${error ? 'border-[var(--error)]' : ''}
            ${className}
          `}
          style={{
            background: 'rgba(0, 212, 255, 0.04)',
            border: error
              ? '1.5px solid rgba(255, 61, 113, 0.5)'
              : '1.5px solid rgba(0, 212, 255, 0.12)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = error
              ? '1.5px solid rgba(255, 61, 113, 0.7)'
              : '1.5px solid rgba(0, 212, 255, 0.5)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 212, 255, 0.08)';
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.06)';
            if (props.onFocus) props.onFocus(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = error
              ? '1.5px solid rgba(255, 61, 113, 0.5)'
              : '1.5px solid rgba(0, 212, 255, 0.12)';
            e.currentTarget.style.boxShadow = '';
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.04)';
            if (props.onBlur) props.onBlur(e);
          }}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs" style={{ color: 'var(--error)' }}>{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{helperText}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
