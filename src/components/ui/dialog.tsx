'use client';

import { useEffect, type ReactNode } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={cn('modal-panel', wide ? 'max-w-3xl' : 'max-w-lg')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-start gap-3">
        {danger && (
          <div className="rounded-full bg-rose-500/15 p-2">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
          </div>
        )}
        <div className="text-sm text-slate-300">{message}</div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
