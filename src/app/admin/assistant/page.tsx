'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Bot, User2, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { api } from '@/hooks/useData';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ADMIN_SUGGESTIONS = [
  'How many tournaments are active?',
  "What was today's revenue?",
  'Which tournament has the most registrations?',
  'Show failed payments.',
  'Which tournament is most popular?',
  "Summarize today's tournament activity.",
  'Show me revenue this week.',
  'How many users registered today?',
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tool?: string;
  data?: unknown;
}

export default function AdminAssistantPage() {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const res = await api<any>('/api/ai/admin', { body: { message } });
      setMessages((m) => [...m, { role: 'assistant', content: res.answer, tool: res.tool, data: res.data }]);
    } catch (err) {
      toast.error('Assistant error', err instanceof Error ? err.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell section="admin" title="Admin AI Assistant" subtitle="Read-only analytics, grounded in live platform data.">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="glass flex h-[calc(100vh-16rem)] min-h-[520px] flex-col">
          <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
            <div className="rounded-xl bg-gradient-to-br from-neon-pink/25 to-neon-purple/25 p-2.5">
              <Bot className="h-5 w-5 text-neon-pink" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">NEXUS Admin Intelligence</p>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                Read-only · role-gated · audit-safe
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Sparkles className="h-10 w-10 text-neon-pink/60" />
                <h3 className="mt-4 text-lg font-semibold text-white">Ask about platform operations</h3>
                <p className="mt-2 max-w-sm text-sm text-slate-400">
                  Revenue, registrations, failed payments, popular tournaments — instant structured
                  answers.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'assistant' && (
                  <div className="mt-1 rounded-lg bg-neon-pink/15 p-1.5">
                    <Bot className="h-3.5 w-3.5 text-neon-pink" />
                  </div>
                )}
                <div className={m.role === 'user' ? 'chat-user' : 'chat-bot'}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  {m.tool && (
                    <p className="mt-2 text-[10px] text-slate-500">via {m.tool.replace(/_/g, ' ')}</p>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="mt-1 rounded-lg bg-neon-cyan/15 p-1.5">
                    <User2 className="h-3.5 w-3.5 text-neon-cyan" />
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-slate-500">
                <Bot className="h-4 w-4 text-neon-pink" />
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-white/[0.07] p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about revenue, users, tournaments…"
                className="input flex-1"
                maxLength={2000}
              />
              <Button type="submit" disabled={busy || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        <aside className="glass h-fit p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quick queries</p>
          <div className="mt-4 space-y-2">
            {ADMIN_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-left text-xs text-slate-300 transition hover:border-neon-pink/30 hover:bg-white/[0.05]"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-slate-500">
            The assistant is <strong className="text-slate-400">read-only</strong>: it can never
            modify users, payments or tournaments. All numbers come from live database queries.
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
