'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base =
      variant === 'primary'
        ? 'btn-primary'
        : variant === 'secondary'
          ? 'btn-secondary'
          : variant === 'danger'
            ? 'btn-danger'
            : variant === 'ghost'
              ? 'btn-ghost'
              : 'btn-secondary';
    return (
      <button
        ref={ref}
        className={cn(base, size === 'sm' && 'btn-sm', size === 'lg' && 'btn-lg', className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
