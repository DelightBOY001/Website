'use client';

import { useState } from 'react';
import { Mail, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';
import { StaticPage, Section } from '@/components/static-page';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea, Select } from '@/components/ui/input';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', topic: 'support', message: '' });

  return (
    <StaticPage eyebrow="We're here to help" title="Contact Us">
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          {sent ? (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <h2 className="mt-4 text-xl font-semibold text-white">Message sent!</h2>
              <p className="mt-2 text-sm text-slate-400">
                Our team typically responds within 24 hours. Check your inbox for a confirmation.
              </p>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" htmlFor="cname">
                  <Input
                    id="cname"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </Field>
                <Field label="Email address" htmlFor="cemail">
                  <Input
                    id="cemail"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Topic" htmlFor="ctopic">
                <Select
                  id="ctopic"
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                >
                  <option value="support">Player support</option>
                  <option value="payment">Payment / refunds</option>
                  <option value="organizer">Tournament organizer</option>
                  <option value="partnership">Partnerships</option>
                  <option value="report">Report a player</option>
                </Select>
              </Field>
              <Field label="Message" htmlFor="cmsg">
                <Textarea
                  id="cmsg"
                  required
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us how we can help…"
                  rows={6}
                />
              </Field>
              <Button type="submit" className="w-full sm:w-auto">
                <Send className="h-4 w-4" /> SEND MESSAGE
              </Button>
            </form>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <Mail className="h-5 w-5 text-neon-cyan" />
            <p className="mt-3 font-semibold text-white">Email</p>
            <p className="mt-1 text-sm text-slate-400">support@nexusarena.gg</p>
            <p className="text-xs text-slate-500">For account & payment issues</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <MapPin className="h-5 w-5 text-neon-purple" />
            <p className="mt-3 font-semibold text-white">Headquarters</p>
            <p className="mt-1 text-sm text-slate-400">Bengaluru, Karnataka, India</p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <Clock className="h-5 w-5 text-emerald-400" />
            <p className="mt-3 font-semibold text-white">Support Hours</p>
            <p className="mt-1 text-sm text-slate-400">Mon – Sun · 9 AM – 11 PM IST</p>
            <p className="text-xs text-slate-500">Tournament days: extended coverage</p>
          </div>
        </aside>
      </div>
    </StaticPage>
  );
}
