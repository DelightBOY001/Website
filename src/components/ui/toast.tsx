'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
}

interface ToastCtx {
  toast: (kind: ToastKind, title: string, body?: string) => void;
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
  info: (title: string, body?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, title: string, body?: string) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-4), { id, kind, title, body }]);
      setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4500);
    },
    [dismiss],
  );

  const value = useMemo<ToastCtx>(
    () => ({
      toast,
      success: (title, body) => toast('success', title, body),
      error: (title, body) => toast('error', title, body),
      info: (title, body) => toast('info', title, body),
    }),
    [toast],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'glass-strong pointer-events-auto flex items-start gap-3 p-4 animate-slide-in',
              t.kind === 'success' && 'border-emerald-500/30',
              t.kind === 'error' && 'border-rose-500/30',
              t.kind === 'info' && 'border-sky-500/30',
            )}
          >
            {t.kind === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />}
            {t.kind === 'error' && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />}
            {t.kind === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />}
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{t.title}</p>
              {t.body && <p className="mt-0.5 text-xs text-slate-400">{t.body}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-500 transition hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
