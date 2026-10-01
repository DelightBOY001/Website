'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const oauthError = params.get('error');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/api/auth/login', { body: { email, password } });
      await refresh();
      toast.success('Welcome back!', 'You are now signed in.');
      router.push(params.get('next') ?? '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="glass-strong p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to compete, track matches and climb the ranks.
          </p>
        </div>

        {(error || oauthError) && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {error ||
                (oauthError === 'google_login_failed'
                  ? 'Google sign-in failed. Please try again.'
                  : oauthError === 'oauth_state_mismatch'
                    ? 'Your session expired. Please try signing in again.'
                    : 'Sign-in failed. Please try again.')}
            </span>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
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
                autoComplete="email"
              />
            </div>
          </Field>
          <Field label="Password" htmlFor="password">
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
                autoComplete="current-password"
              />
            </div>
          </Field>

          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2 text-slate-400">
              <input type="checkbox" className="h-4 w-4 rounded accent-cyan-400" />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-neon-cyan hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            <LogIn className="h-4 w-4" /> SIGN IN
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.08]" />
          <span className="text-xs text-slate-500">or continue with</span>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>

        <a href="/api/auth/google" className="btn-secondary w-full">
          <Globe className="h-4 w-4" /> GOOGLE
        </a>

        <p className="mt-6 text-center text-sm text-slate-400">
          New to the arena?{' '}
          <Link href="/register" className="font-semibold text-neon-cyan hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
