'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { api } from '@/hooks/useData';

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api('/api/auth/reset-password', { body: { token, password } });
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="glass-strong p-8">
        <h1 className="text-center text-2xl font-bold text-white">Choose a new password</h1>

        {!token && (
          <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
            This reset link is invalid. Request a new one from the{' '}
            <Link href="/forgot-password" className="underline">
              forgot password page
            </Link>
            .
          </div>
        )}

        {done ? (
          <div className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="mt-3 text-sm text-emerald-200">
              Password updated! Redirecting you to sign in…
            </p>
          </div>
        ) : (
          token && (
            <form onSubmit={submit} className="mt-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Field label="New password" htmlFor="password">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New strong password"
                    className="pl-10"
                    minLength={8}
                  />
                </div>
              </Field>
              <Field label="Confirm password" htmlFor="confirm">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat the password"
                    className="pl-10"
                    minLength={8}
                  />
                </div>
              </Field>
              <Button type="submit" className="w-full" loading={loading}>
                UPDATE PASSWORD
              </Button>
            </form>
          )
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
