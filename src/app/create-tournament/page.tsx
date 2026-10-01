'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Trophy, Sparkles, Wand2, Info } from 'lucide-react';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { api, useFetch } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/states';

const DEFAULT_RULES = `1. Be respectful — toxic behaviour results in disqualification.
2. All matches must be played within the scheduled window.
3. Results must be reported by both captains within 15 minutes of match completion.
4. Use of cheats/exploits leads to an immediate ban.
5. Organizer decisions are final.`;

function CreateTournamentForm() {
  const router = useRouter();
  const toast = useToast();
  const { user, loading: authLoading, isOrganizer } = useAuth();
  const { data: gamesRes } = useFetch<any>('/api/games');
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [form, setForm] = useState({
    title: '',
    tagline: '',
    description: '',
    rules: DEFAULT_RULES,
    game: '',
    gameMode: '',
    format: 'single_elimination',
    type: 'solo',
    entryFee: 0,
    prizePool: 5000,
    maxParticipants: 16,
    teamSize: 5,
    startsAt: '',
    registrationDeadline: '',
    region: 'IN',
    platform: 'PC',
    online: true,
    seeding: 'auto',
  });
  const [prizes, setPrizes] = useState([
    { position: 1, label: 'Champion', amount: 2500 },
    { position: 2, label: 'Runner-up', amount: 1500 },
    { position: 3, label: 'Third place', amount: 1000 },
  ]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login?next=/create-tournament');
  }, [user, authLoading, router]);

  if (authLoading || !user) return <PageLoader />;
  if (!isOrganizer) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-white">Organizer access required</h1>
        <p className="mt-3 text-slate-400">
          Tournament creation is available to organizers and staff. Contact support to upgrade
          your account.
        </p>
      </div>
    );
  }

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  /** AI-assisted description generation via the platform AI service. */
  const generateDescription = async () => {
    if (!form.title) {
      toast.info('Enter a tournament title first');
      return;
    }
    setAiBusy(true);
    try {
      const res = await api<any>('/api/ai/chat', {
        body: {
          message: `Write a compelling 3-sentence tournament description for "${form.title}" (game: ${form.game || 'esports'}, format: ${form.format}, prize pool: ₹${form.prizePool}, entry fee: ₹${form.entryFee}). Return only the description text.`,
        },
      });
      const text = (res.answer ?? '')
        .replace(/^["'*#>\-\s]+/gm, '')
        .trim()
        .slice(0, 1200);
      if (text) {
        set('description', text);
        toast.success('Description generated!', 'Review and edit it before publishing.');
      }
    } catch {
      toast.error('AI generation unavailable', 'Set AI_API_KEY to enable this feature.');
    } finally {
      setAiBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      const payload = {
        ...form,
        entryFee: Number(form.entryFee),
        prizePool: Number(form.prizePool),
        maxParticipants: Number(form.maxParticipants),
        teamSize: Number(form.teamSize),
        prizes: prizes.filter((p) => p.amount > 0),
      };
      const res = await api<any>('/api/tournaments', { body: payload });
      toast.success('Tournament created!', 'Share it with your community.');
      router.push(res?.tournament?.slug ? `/tournaments/${res.tournament.slug}` : '/tournaments');
    } catch (err) {
      toast.error('Could not create tournament', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-24 sm:px-6">
        <div className="text-center">
          <div className="badge-neon mx-auto inline-flex">
            <Trophy className="h-3.5 w-3.5" /> ORGANIZER STUDIO
          </div>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Create a <span className="text-gradient">Tournament</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-slate-400">
            Set the format, schedule and prizes — our engine handles seeding, brackets and live
            updates automatically.
          </p>
        </div>

        <div className="mt-10 space-y-6">
          {/* Basics */}
          <Card>
            <CardHeader title="Basics" subtitle="What is your event about?" />
            <CardBody className="space-y-4">
              <Field label="Tournament title" htmlFor="title">
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Valorant Pro Cup 2026"
                  maxLength={120}
                />
              </Field>
              <Field label="Tagline" htmlFor="tagline" hint="shown on cards">
                <Input
                  id="tagline"
                  value={form.tagline}
                  onChange={(e) => set('tagline', e.target.value)}
                  placeholder="The ultimate showdown for supremacy"
                  maxLength={160}
                />
              </Field>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="desc" className="label">
                    Description
                  </label>
                  <Button variant="ghost" size="sm" onClick={generateDescription} loading={aiBusy}>
                    <Wand2 className="h-3.5 w-3.5" /> Generate with AI
                  </Button>
                </div>
                <Textarea
                  id="desc"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Describe your tournament, eligibility, highlights…"
                  rows={5}
                  maxLength={8000}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Game" htmlFor="game">
                  <Select id="game" value={form.game} onChange={(e) => set('game', e.target.value)}>
                    <option value="">Select a game…</option>
                    {(gamesRes?.items ?? []).map((g: any) => (
                      <option key={g._id} value={g._id}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Game mode" htmlFor="mode">
                  <Input
                    id="mode"
                    value={form.gameMode}
                    onChange={(e) => set('gameMode', e.target.value)}
                    placeholder="e.g. 5v5 Search & Destroy"
                    maxLength={60}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* Format */}
          <Card>
            <CardHeader title="Format & Structure" subtitle="How will matches be played?" />
            <CardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Tournament format" htmlFor="format">
                  <Select id="format" value={form.format} onChange={(e) => set('format', e.target.value)}>
                    <option value="single_elimination">Single Elimination</option>
                    <option value="double_elimination">Double Elimination</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="swiss">Swiss</option>
                    <option value="group_knockout">Group Stage + Playoffs</option>
                  </Select>
                </Field>
                <Field label="Participation" htmlFor="type">
                  <Select id="type" value={form.type} onChange={(e) => set('type', e.target.value)}>
                    <option value="solo">Solo</option>
                    <option value="duo">Duo</option>
                    <option value="team">Team</option>
                  </Select>
                </Field>
                <Field label="Seeding" htmlFor="seeding">
                  <Select id="seeding" value={form.seeding} onChange={(e) => set('seeding', e.target.value)}>
                    <option value="auto">Auto (by ranking)</option>
                    <option value="random">Random</option>
                    <option value="manual">Manual</option>
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Max participants" htmlFor="maxp">
                  <Input
                    id="maxp"
                    type="number"
                    min={2}
                    max={4096}
                    value={form.maxParticipants}
                    onChange={(e) => set('maxParticipants', e.target.value)}
                  />
                </Field>
                {form.type === 'team' && (
                  <Field label="Team size" htmlFor="tsize">
                    <Input
                      id="tsize"
                      type="number"
                      min={2}
                      max={10}
                      value={form.teamSize}
                      onChange={(e) => set('teamSize', e.target.value)}
                    />
                  </Field>
                )}
                <Field label="Region" htmlFor="region">
                  <Select id="region" value={form.region} onChange={(e) => set('region', e.target.value)}>
                    <option value="IN">India</option>
                    <option value="APAC">APAC</option>
                    <option value="EU">Europe</option>
                    <option value="NA">North America</option>
                    <option value="GLOBAL">Global</option>
                  </Select>
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader title="Schedule" subtitle="When does the action happen?" />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Starts at" htmlFor="starts">
                  <Input
                    id="starts"
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => set('startsAt', e.target.value)}
                  />
                </Field>
                <Field label="Registration deadline" htmlFor="deadline" hint="optional">
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={form.registrationDeadline}
                    onChange={(e) => set('registrationDeadline', e.target.value)}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* Entry fee & prizes */}
          <Card>
            <CardHeader title="Entry Fee & Prizes" subtitle="Set the stakes" />
            <CardBody className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Entry fee (₹)" htmlFor="fee" hint="0 = free">
                  <Input
                    id="fee"
                    type="number"
                    min={0}
                    value={form.entryFee}
                    onChange={(e) => set('entryFee', e.target.value)}
                  />
                </Field>
                <Field label="Prize pool (₹)" htmlFor="pool">
                  <Input
                    id="pool"
                    type="number"
                    min={0}
                    value={form.prizePool}
                    onChange={(e) => set('prizePool', e.target.value)}
                  />
                </Field>
                <Field label="Platform" htmlFor="platform">
                  <Select id="platform" value={form.platform} onChange={(e) => set('platform', e.target.value)}>
                    <option value="PC">PC</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Console">Console</option>
                  </Select>
                </Field>
              </div>

              <div>
                <p className="label">Prize distribution</p>
                <div className="space-y-2">
                  {prizes.map((p, i) => (
                    <div key={p.position} className="flex items-center gap-3">
                      <span className="w-10 text-center text-sm text-slate-500">#{p.position}</span>
                      <Input
                        value={p.label}
                        onChange={(e) =>
                          setPrizes((ps) => ps.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                        }
                        placeholder="Label"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={p.amount}
                        onChange={(e) =>
                          setPrizes((ps) =>
                            ps.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)),
                          )
                        }
                        className="w-32"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-neon-cyan/15 bg-neon-cyan/[0.04] p-4 text-xs text-slate-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-cyan" />
                Payments are collected securely via Razorpay (UPI, cards, netbanking). Entry fees
                are verified server-side before registrations are confirmed. Paid tournaments
                require RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in your environment.
              </div>
            </CardBody>
          </Card>

          {/* Rules */}
          <Card>
            <CardHeader title="Rules" subtitle="The law of your arena" />
            <CardBody>
              <Textarea
                value={form.rules}
                onChange={(e) => set('rules', e.target.value)}
                rows={7}
                maxLength={12000}
              />
            </CardBody>
          </Card>

          <Button
            className="w-full btn-lg"
            onClick={submit}
            loading={busy}
            disabled={!form.title || !form.game || !form.startsAt}
          >
            <Trophy className="h-5 w-5" /> PUBLISH TOURNAMENT
          </Button>
        </div>
      </div>
    </>
  );
}

export default function CreateTournamentPage() {
  return (
    <Providers>
      <CreateTournamentForm />
    </Providers>
  );
}
