'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/hooks/useData';

function VerifyForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'loading' | 'ok' | 'fail'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('fail');
      setMessage('Missing verification token.');
      return;
    }
    api('/api/auth/verify-email', { body: { token } })
      .then(() => {
        setState('ok');
        setMessage('Your email has been verified. Your account is fully active!');
      })
      .catch((err) => {
        setState('fail');
        setMessage(err instanceof Error ? err.message : 'Verification failed.');
      });
  }, [token]);

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="glass-strong p-10 text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-neon-cyan" />
            <p className="mt-4 text-slate-400">Verifying your email…</p>
          </>
        )}
        {state === 'ok' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <h1 className="mt-4 text-2xl font-bold text-white">Email verified!</h1>
            <p className="mt-2 text-sm text-slate-400">{message}</p>
            <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
              GO TO DASHBOARD
            </Link>
          </>
        )}
        {state === 'fail' && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-rose-400" />
            <h1 className="mt-4 text-2xl font-bold text-white">Verification failed</h1>
            <p className="mt-2 text-sm text-slate-400">{message}</p>
            <Link href="/login" className="btn-secondary mt-6 inline-flex">
              BACK TO SIGN IN
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
