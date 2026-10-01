'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Mail, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { api } from '@/hooks/useData';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/api/auth/forgot-password', { body: { email } });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="glass-strong p-8">
        <h1 className="text-center text-2xl font-bold text-white">Reset your password</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Enter your email and we&apos;ll send you a secure reset link.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="mt-3 text-sm text-emerald-200">
              If an account exists for <strong>{email}</strong>, a reset link is on its way.
              The link expires in 60 minutes. Check spam/promotions too. If you are running locally without an email API key, look for the reset link in the dev server terminal.
            </p>
            <Link href="/login" className="btn-secondary mt-5 inline-flex">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Field label="Email address" htmlFor="email">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                />
              </div>
            </Field>
            <Button type="submit" className="w-full" loading={loading}>
              <Send className="h-4 w-4" /> SEND RESET LINK
            </Button>
            <p className="text-center text-sm text-slate-400">
              Remembered it?{' '}
              <Link href="/login" className="text-neon-cyan hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
