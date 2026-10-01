'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Bot, User2, Info, History } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { api, useFetch } from '@/hooks/useData';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Which tournament should I join?',
  'What tournaments are happening today?',
  'Who am I playing next?',
  'Show my tournament statistics.',
  'How does this bracket work?',
  'Recommend tournaments based on my history.',
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tool?: string;
}

export default function AIAssistantPage() {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: status } = useFetch<any>('/api/ai/status');

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
      const res = await api<any>('/api/ai/chat', { body: { message } });
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: res.answer, tool: res.tool },
      ]);
    } catch (err) {
      toast.error('Assistant error', err instanceof Error ? err.message : undefined);
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'Sorry, I hit a snag processing that. Please try again.',
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell
      title="AI Tournament Assistant"
      subtitle="Data-backed answers about tournaments, your schedule and stats."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Chat */}
        <div className="glass flex h-[calc(100vh-16rem)] min-h-[520px] flex-col">
          <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
            <div className="rounded-xl bg-gradient-to-br from-neon-cyan/25 to-neon-purple/25 p-2.5">
              <Bot className="h-5 w-5 text-neon-cyan" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">NEXUS Assistant</p>
              <p className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {status?.llmConfigured
                  ? `Online · ${status.model}`
                  : 'Online · data mode (set AI_API_KEY for LLM answers)'}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Sparkles className="h-10 w-10 text-neon-purple/60" />
                <h3 className="mt-4 text-lg font-semibold text-white">How can I help you compete?</h3>
                <p className="mt-2 max-w-sm text-sm text-slate-400">
                  I know your registrations, matches and the full tournament catalogue. Ask me
                  anything.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-2 text-xs text-slate-300 transition hover:border-neon-cyan/40 hover:text-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                {m.role === 'assistant' && (
                  <div className="mt-1 rounded-lg bg-neon-purple/15 p-1.5">
                    <Bot className="h-3.5 w-3.5 text-neon-purple" />
                  </div>
                )}
                <div className={m.role === 'user' ? 'chat-user' : 'chat-bot'}>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  {m.tool && (
                    <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                      <Info className="h-3 w-3" /> via {m.tool.replace(/_/g, ' ')}
                    </p>
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
                <Bot className="h-4 w-4 text-neon-purple" />
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
                placeholder="Ask about tournaments, your matches, brackets…"
                className="input flex-1"
                maxLength={2000}
              />
              <Button type="submit" disabled={busy || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Suggestions sidebar */}
        <aside className="space-y-4">
          <div className="glass p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-neon-purple" /> Try asking
            </p>
            <div className="mt-4 space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-left text-xs text-slate-300 transition hover:border-neon-cyan/30 hover:bg-white/[0.05]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="glass p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <History className="h-3.5 w-3.5" /> Privacy note
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              The assistant only reads <strong className="text-slate-400">your</strong> data and
              public platform information. It can never perform admin actions or access other
              players&apos; private data.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
