'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn('input', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn('input min-h-[110px] resize-y', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn('input appearance-none bg-void-800 cursor-pointer', className)}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="label">
      {children}
      {hint && <span className="ml-2 normal-case tracking-normal text-slate-500">{hint}</span>}
    </label>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} hint={hint}>
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  id?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-slate-300">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-cyan-400"
      />
      <span>{label}</span>
    </label>
  );
}
