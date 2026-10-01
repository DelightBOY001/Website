'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Loader2,
  AlertCircle,
  PartyPopper,
  Copy,
} from 'lucide-react';
import { useFetch, api } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select } from '@/components/ui/input';
import { PageLoader, ErrorState, ProgressBar } from '@/components/ui/states';
import { formatCurrency, cn } from '@/lib/utils';

/** Load Razorpay's checkout.js exactly once; resolves false when unavailable. */
let razorpayScriptPromise: Promise<boolean> | null = null;
function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

type Step = 1 | 2 | 3 | 4;

export default function TournamentRegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading } = useAuth();
  const { data, loading, error, refetch } = useFetch<any>(slug ? `/api/tournaments/${slug}` : null);

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<'solo' | 'team'>('solo');
  const [teamId, setTeamId] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [ign, setIgn] = useState('');
  const [discord, setDiscord] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [registrationId, setRegistrationId] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [manualOrder, setManualOrder] = useState<{ orderId: string; amount: number } | null>(null);

  const t = data?.tournament;
  const isTeamTournament = t?.type === 'team';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=/tournaments/${slug}/register`);
    }
  }, [user, authLoading, router, slug]);

  useEffect(() => {
    if (!user || !isTeamTournament) return;
    fetch('/api/teams?mine=true')
      .then((r) => r.json())
      .then((j) => setTeams(j?.items ?? []))
      .catch(() => undefined);
  }, [user, isTeamTournament]);

  useEffect(() => {
    if (isTeamTournament) setMode('team');
  }, [isTeamTournament]);

  if (loading || authLoading || !user) return <PageLoader label="Preparing registration…" />;
  if (error || !t)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState onRetry={refetch} body={error ?? 'Tournament not found.'} />
      </div>
    );

  const fee = t.entryFee ?? 0;
  const isFree = fee === 0;

  async function confirmFreeRegistration() {
    setBusy(true);
    setPaymentError('');
    try {
      const res = await api<any>(`/api/tournaments/${t._id}/register`, {
        body: {
          teamId: mode === 'team' ? teamId : undefined,
          inGameName: ign,
          discordId: discord,
          agreedToRules: true,
        },
      });
      setRegistrationId(res?.registration?.registrationId ?? res?.registrationId ?? 'REG-OK');
      setStep(4);
      toast.success('Registration confirmed!', 'See you on the battlefield.');
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  async function payAndRegister() {
    setBusy(true);
    setPaymentError('');
    try {
      const orderRes = await api<any>('/api/payments/order', {
        body: {
          tournamentId: t._id,
          teamId: mode === 'team' ? teamId : undefined,
          inGameName: ign,
          discordId: discord,
          agreedToRules: true,
        },
      });

      // Free tournament edge-case (server may skip payment).
      if (orderRes?.free) {
        setRegistrationId(orderRes?.registration?.registrationId ?? 'REG-OK');
        setStep(4);
        return;
      }

      const order = orderRes?.payment;
      if (!order?.orderId) throw new Error('Could not create a payment order.');

      const ok = await loadRazorpayScript();
      if (!ok || !(window as any).Razorpay) {
        // Graceful degradation: show manual order info instead of failing silently.
        setManualOrder({ orderId: order.orderId, amount: order.amount });
        setBusy(false);
        return;
      }

      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.orderId,
        prefill: order.prefill,
        theme: order.theme,
        handler: async (response: any) => {
          try {
            const verify = await api<any>('/api/payments/verify', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
            setRegistrationId(verify?.registration?.registrationId ?? 'REG-OK');
            setStep(4);
            toast.success('Payment successful!', 'Your slot is locked in.');
          } catch (err) {
            setPaymentError(
              err instanceof Error ? err.message : 'Payment verification failed. Contact support.',
            );
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setPaymentError('Payment was cancelled. You can retry anytime.');
          },
        },
      });
      rzp.on('payment.failed', (resp: any) => {
        setPaymentError(
          resp?.error?.description ?? 'Payment failed at the gateway. Please try again.',
        );
        setBusy(false);
      });
      rzp.open();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Could not start payment.');
      setBusy(false);
    }
  }

  const canContinueStep1 = mode === 'solo' || Boolean(teamId);
  const canContinueStep2 = ign.trim().length >= 2;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={`/tournaments/${t.slug}`}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-neon-cyan"
      >
        <ChevronLeft className="h-4 w-4" /> {t.title}
      </Link>

      <h1 className="text-2xl font-bold text-white sm:text-3xl">Tournament Registration</h1>
      <p className="mt-2 text-sm text-slate-400">
        {isFree ? 'Free entry' : `${formatCurrency(fee)} entry fee`} · {t.format.replace(/_/g, ' ')} ·{' '}
        {t.maxParticipants - t.participantsCount} slots left
      </p>

      {/* Stepper */}
      <div className="mt-8">
        <div className="flex items-center gap-2">
          {[
            { n: 1, label: 'Participation' },
            { n: 2, label: 'Player Info' },
            { n: 3, label: 'Rules & Payment' },
            { n: 4, label: 'Confirmed' },
          ].map((s, i) => (
            <div key={s.n} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition',
                  step >= s.n
                    ? 'bg-gradient-to-r from-neon-cyan to-neon-blue text-void-950'
                    : 'bg-white/[0.06] text-slate-500',
                )}
              >
                {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium sm:block',
                  step >= s.n ? 'text-white' : 'text-slate-600',
                )}
              >
                {s.label}
              </span>
              {i < 3 && (
                <div className={cn('h-px flex-1', step > s.n ? 'bg-neon-cyan/50' : 'bg-white/[0.08]')} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-3">
          <ProgressBar value={step} max={4} />
        </div>
      </div>

      {/* Steps */}
      <div className="glass mt-8 p-6 sm:p-8">
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-white">How do you want to compete?</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(!isTeamTournament || true) && (
                <button
                  onClick={() => setMode('solo')}
                  disabled={isTeamTournament}
                  className={cn(
                    'rounded-2xl border p-5 text-left transition',
                    mode === 'solo'
                      ? 'border-neon-cyan/60 bg-neon-cyan/[0.07]'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20',
                    isTeamTournament && 'opacity-40',
                  )}
                >
                  <User className="h-6 w-6 text-neon-cyan" />
                  <p className="mt-3 font-semibold text-white">Solo Entry</p>
                  <p className="mt-1 text-xs text-slate-400">Compete as an individual player.</p>
                </button>
              )}
              <button
                onClick={() => setMode('team')}
                className={cn(
                  'rounded-2xl border p-5 text-left transition',
                  mode === 'team'
                    ? 'border-neon-cyan/60 bg-neon-cyan/[0.07]'
                    : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20',
                )}
              >
                <Users className="h-6 w-6 text-neon-purple" />
                <p className="mt-3 font-semibold text-white">Team Entry</p>
                <p className="mt-1 text-xs text-slate-400">
                  Register with your roster (captain pays).
                </p>
              </button>
            </div>

            {mode === 'team' && (
              <div className="mt-6">
                <Field label="Select your team" htmlFor="team">
                  <Select id="team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                    <option value="">Choose a team…</option>
                    {teams.map((tm: any) => (
                      <option key={tm._id} value={tm._id}>
                        {tm.name} ({tm.tag})
                      </option>
                    ))}
                  </Select>
                </Field>
                {teams.length === 0 && (
                  <p className="mt-3 text-xs text-slate-500">
                    No teams yet?{' '}
                    <Link href="/dashboard/my-teams" className="text-neon-cyan underline">
                      Create one in your dashboard
                    </Link>{' '}
                    first.
                  </p>
                )}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <Button disabled={!canContinueStep1} onClick={() => setStep(2)}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-white">Player information</h2>
            <p className="mt-1 text-sm text-slate-400">
              This appears in brackets and match notifications.
            </p>
            <div className="mt-6 space-y-4">
              <Field label="In-game name" htmlFor="ign" hint="required">
                <Input
                  id="ign"
                  value={ign}
                  onChange={(e) => setIgn(e.target.value)}
                  placeholder="e.g. ShadowStrike"
                  maxLength={40}
                />
              </Field>
              <Field label="Discord ID" htmlFor="discord" hint="optional — for match coordination">
                <Input
                  id="discord"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="username#0001"
                  maxLength={60}
                />
              </Field>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button disabled={!canContinueStep2} onClick={() => setStep(3)}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-white">Rules & {isFree ? 'Confirmation' : 'Payment'}</h2>

            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <div className="max-h-40 overflow-y-auto text-xs leading-relaxed text-slate-400">
                  {t.rules || 'Standard NEXUS ARENA competitive rules apply.'}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <Checkbox
                checked={agreed}
                onChange={setAgreed}
                label="I have read and agree to the tournament rules, platform terms and refund policy. I understand that rule violations can lead to disqualification."
              />
            </div>

            {/* Order summary */}
            <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Entry fee</span>
                <span className="font-display text-lg font-bold text-white">
                  {isFree ? 'FREE' : formatCurrency(fee)}
                </span>
              </div>
              {t.prizes?.[0] && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-400">Champion prize</span>
                  <span className="font-semibold text-neon-cyan">
                    {formatCurrency(t.prizes[0].amount)}
                  </span>
                </div>
              )}
              {!isFree && (
                <div className="mt-3 flex items-center gap-2 border-t border-white/[0.07] pt-3 text-xs text-slate-500">
                  <CreditCard className="h-3.5 w-3.5" />
                  Secure checkout powered by Razorpay — UPI, Cards, Netbanking & Wallets
                </div>
              )}
            </div>

            {paymentError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {manualOrder && (
              <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
                <p className="font-semibold">Checkout could not load in this environment.</p>
                <p className="mt-1 text-xs">
                  Your order is reserved for 30 minutes. Order ID:{' '}
                  <button
                    className="inline-flex items-center gap-1 font-mono underline"
                    onClick={() => navigator.clipboard?.writeText(manualOrder.orderId)}
                  >
                    {manualOrder.orderId} <Copy className="h-3 w-3" />
                  </button>
                  {' '}— complete the payment from the tournament page on a normal network, or retry below.
                </p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => { setManualOrder(null); payAndRegister(); }}>
                  Retry payment
                </Button>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                disabled={!agreed || busy}
                loading={busy}
                onClick={isFree ? confirmFreeRegistration : payAndRegister}
              >
                {isFree ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> CONFIRM REGISTRATION
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" /> PAY {formatCurrency(fee)} & REGISTER
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
              <PartyPopper className="h-10 w-10 text-emerald-400" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-white">You&apos;re in!</h2>
            <p className="mt-2 text-slate-400">
              Your registration for <strong className="text-white">{t.title}</strong> is confirmed.
            </p>
            <div className="mx-auto mt-6 max-w-xs rounded-2xl border border-neon-cyan/25 bg-neon-cyan/[0.06] p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">Registration ID</p>
              <p className="mt-2 font-mono text-xl font-bold text-neon-cyan">{registrationId}</p>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href={`/tournaments/${t.slug}`} className="btn-primary">
                VIEW TOURNAMENT
              </Link>
              <Link href="/dashboard/my-tournaments" className="btn-secondary">
                MY TOURNAMENTS
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
        <Loader2 className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
        Payments verified server-side · Your data is protected
      </div>
    </div>
  );
}
