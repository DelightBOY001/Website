'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Mail, Lock, User, AtSign, UserPlus, AlertCircle, Globe, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const passwordChecks = [
    { label: '8+ characters', ok: form.password.length >= 8 },
    { label: 'Contains a number', ok: /[0-9]/.test(form.password) },
    { label: 'Contains a letter', ok: /[a-zA-Z]/.test(form.password) },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agreed) {
      setError('Please accept the Terms & Conditions to continue.');
      return;
    }
    setLoading(true);
    try {
      await api('/api/auth/register', { body: form });
      await refresh();
      toast.success('Account created!', 'Welcome to NEXUS ARENA. Check your email to verify.');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-up">
      <div className="glass-strong p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your competitive journey starts with a single step.
          </p>
        </div>

        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Full name" htmlFor="name">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="name"
                required
                value={form.name}
                onChange={set('name')}
                placeholder="Arjun Gaming"
                className="pl-10"
                autoComplete="name"
              />
            </div>
          </Field>
          <Field label="Username" htmlFor="username" hint="lowercase, no spaces">
            <div className="relative">
              <AtSign className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="username"
                required
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
                placeholder="arjun_gaming"
                className="pl-10"
                minLength={3}
                maxLength={24}
                pattern="[a-z0-9_]+"
              />
            </div>
          </Field>
          <Field label="Email address" htmlFor="email">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={set('email')}
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
                value={form.password}
                onChange={set('password')}
                placeholder="Create a strong password"
                className="pl-10"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
          </Field>

          <div className="flex flex-wrap gap-3">
            {passwordChecks.map((c) => (
              <span
                key={c.label}
                className={`flex items-center gap-1 text-xs ${c.ok ? 'text-emerald-400' : 'text-slate-500'}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {c.label}
              </span>
            ))}
          </div>

          <Checkbox
            checked={agreed}
            onChange={setAgreed}
            label={
              <span className="text-xs text-slate-400">
                I agree to the{' '}
                <Link href="/terms" className="text-neon-cyan hover:underline">
                  Terms & Conditions
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-neon-cyan hover:underline">
                  Privacy Policy
                </Link>
              </span>
            }
          />

          <Button type="submit" className="w-full" loading={loading}>
            <UserPlus className="h-4 w-4" /> CREATE ACCOUNT
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.08]" />
          <span className="text-xs text-slate-500">or</span>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>

        <a href="/api/auth/google" className="btn-secondary w-full">
          <Globe className="h-4 w-4" /> SIGN UP WITH GOOGLE
        </a>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already competing?{' '}
          <Link href="/login" className="font-semibold text-neon-cyan hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
