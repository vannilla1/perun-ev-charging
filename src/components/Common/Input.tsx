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
            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-2.5
              bg-[var(--surface)] border rounded-[var(--border-radius-sm)]
              text-[var(--text-primary)] placeholder-[var(--text-muted)]
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--surface-secondary)]
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon ? 'pr-10' : ''}
              ${error ? 'border-[var(--error)] focus:ring-[var(--error)]' : 'border-[var(--border)]'}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-[var(--error)]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{helperText}</p>
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
            className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`
            w-full px-4 py-2.5
            bg-[var(--surface)] border rounded-[var(--border-radius-sm)]
            text-[var(--text-primary)] placeholder-[var(--text-muted)]
            transition-all duration-200 resize-none
            focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--surface-secondary)]
            ${error ? 'border-[var(--error)] focus:ring-[var(--error)]' : 'border-[var(--border)]'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-[var(--error)]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{helperText}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
