import { connectDB } from '@/lib/db';
import { env } from '@/lib/env';
import {
  AIConversationModel,
  MatchModel,
  PaymentModel,
  RegistrationModel,
  TeamModel,
  TournamentModel,
  UserModel,
} from '@/models';
import type { SessionUser } from '@/lib/auth';
import { getUserDashboardStats, getLeaderboard } from './leaderboard.service';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ValidationError } from '@/lib/errors';

/* ───────────────────────────── TOOL LAYER ───────────────────────────── */
/**
 * Every AI answer is grounded in data fetched through these allow-listed
 * tools. The model never touches the database directly and can never run
 * privileged actions — read-only, scoped to the caller.
 */

export interface ToolResult {
  tool: string;
  title: string;
  data: unknown;
  markdown: string;
}

async function toolRecommendTournaments(user: SessionUser): Promise<ToolResult> {
  await connectDB();
  const regs = await RegistrationModel.find({ user: user.id }).select('tournament').lean();
  const playedIds = regs.map((r) => String(r.tournament));
  const [games, open] = await Promise.all([
    TournamentModel.aggregate([
      { $match: { status: 'registration', registrationOpen: true } },
      { $group: { _id: '$game', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    TournamentModel.find({ status: 'registration', registrationOpen: true })
      .sort({ startsAt: 1 })
      .limit(6)
      .populate('game', 'name slug accentColor')
      .lean(),
  ]);
  const items = open
    .filter((t: any) => !playedIds.includes(String(t._id)))
    .map((t: any) => ({
      title: t.title,
      slug: t.slug,
      game: t.game?.name ?? 'Unknown',
      entryFee: t.entryFee,
      prizePool: t.prizePool,
      startsAt: t.startsAt,
      format: t.format,
      type: t.type,
      slots: `${t.participantsCount}/${t.maxParticipants}`,
    }));

  const md =
    items.length === 0
      ? 'No open tournaments match your profile right now — check back soon!'
      : `Based on your history, here are tournaments you can still join:\n\n${items
          .map(
            (t, i) =>
              `${i + 1}. **${t.title}** (${t.game}) — ${formatCurrency(t.prizePool)} prize pool, ${
                t.entryFee === 0 ? 'FREE' : formatCurrency(t.entryFee)
              } entry · starts ${formatDateTime(t.startsAt)} · ${t.slots} registered`,
          )
          .join('\n')}`;

  return { tool: 'recommend_tournaments', title: 'Tournament recommendations', data: items, markdown: md };
}

async function toolTodayTournaments(): Promise<ToolResult> {
  await connectDB();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const items = await TournamentModel.find({
    $or: [{ startsAt: { $gte: start, $lte: end } }, { status: 'ongoing' }],
  })
    .sort({ startsAt: 1 })
    .populate('game', 'name slug')
    .limit(15)
    .lean();

  const rows = items.map((t: any) => ({
    title: t.title,
    game: t.game?.name ?? 'Unknown',
    status: t.status,
    startsAt: t.startsAt,
    prizePool: t.prizePool,
    slug: t.slug,
  }));
  const md = rows.length
    ? `Here's what's live or starting today:\n\n${rows
        .map(
          (t, i) =>
            `${i + 1}. **${t.title}** (${t.game}) — ${t.status.toUpperCase()} · starts ${formatDateTime(
              t.startsAt,
            )} · prize ${formatCurrency(t.prizePool)}`,
        )
        .join('\n')}`
    : 'Nothing is scheduled today. Browse upcoming tournaments for the next events.';
  return { tool: 'today_tournaments', title: 'Tournaments today', data: rows, markdown: md };
}

async function toolExplainRules(slug: string): Promise<ToolResult> {
  await connectDB();
  const t = await TournamentModel.findOne({ slug }).populate('game', 'name').lean();
  if (!t) return { tool: 'explain_rules', title: 'Rules', data: null, markdown: 'I could not find that tournament.' };
  const md = `**${(t as any).title}** — rules & format\n\n- Game: ${(t as any).game?.name ?? '—'}\n- Format: ${(t as any).format
    .replace(/_/g, ' ')}\n- Type: ${(t as any).type}\n- Entry fee: ${(t as any).entryFee === 0 ? 'Free' : formatCurrency((t as any).entryFee)}\n- Best of: ${(t as any).settings?.bestOfDefault ?? 3}\n\n${(t as any).rules || 'No explicit rules published yet.'}`;
  return {
    tool: 'explain_rules',
    title: 'Tournament rules',
    data: { title: (t as any).title, rules: (t as any).rules, format: (t as any).format },
    markdown: md,
  };
}

async function toolMyNextMatch(user: SessionUser): Promise<ToolResult> {
  await connectDB();
  const now = new Date();
  const matches = await MatchModel.find({
    $or: [{ 'participant1.ref': user.id }, { 'participant2.ref': user.id }],
    status: { $in: ['scheduled', 'live', 'pending'] },
  })
    .sort({ scheduledAt: 1, round: 1 })
    .limit(5)
    .populate('tournament', 'title slug')
    .lean();

  const rows = matches.map((m: any) => {
    const opponent =
      String(m.participant1?.ref) === user.id ? m.participant2?.name : m.participant1?.name;
    return {
      tournament: m.tournament?.title ?? '—',
      slug: m.tournament?.slug ?? '',
      opponent,
      round: m.roundName || `Round ${m.round}`,
      when: m.scheduledAt ? formatDateTime(m.scheduledAt) : 'To be scheduled',
      status: m.status,
      matchNumber: m.matchNumber,
    };
  });
  const md = rows.length
    ? `You have ${rows.length} upcoming match${rows.length > 1 ? 'es' : ''}:\n\n${rows
        .map(
          (m, i) =>
            `${i + 1}. vs **${m.opponent}** — ${m.tournament} (${m.round}) · ${m.when} · ${m.status}`,
        )
        .join('\n')}`
    : 'You have no upcoming matches right now. Register for a tournament to get on the board!';
  return { tool: 'my_next_match', title: 'Your upcoming matches', data: rows, markdown: md };
}

async function toolMyStats(user: SessionUser): Promise<ToolResult> {
  const stats = await getUserDashboardStats(user.id);
  const md = stats
    ? `Here's your competitive snapshot:\n\n- Matches: ${stats.matchesPlayed} (${stats.wins}W / ${stats.losses}L) — **${stats.winRate}%** win rate\n- Tournaments played: ${stats.tournamentsPlayed}\n- Earnings: ${formatCurrency(stats.earnings)}\n- Points: ${stats.points}\n- Current win streak: ${stats.winStreak}\n- Global rank: ${stats.rank || 'unranked'}`
    : 'I could not load your stats.';
  return { tool: 'my_stats', title: 'Your statistics', data: stats, markdown: md };
}

async function toolExplainBracket(slug: string): Promise<ToolResult> {
  await connectDB();
  const t = await TournamentModel.findOne({ slug }).lean();
  if (!t) return { tool: 'explain_bracket', title: 'Bracket', data: null, markdown: 'Tournament not found.' };
  const desc: Record<string, string> = {
    single_elimination:
      'Single elimination: lose once and you are out. Winners advance through rounds (R64 → R32 → R16 → Quarters → Semis → Grand Final) until one champion remains.',
    double_elimination:
      'Double elimination: you get a second chance. Lose in the winners bracket and drop to the losers bracket; one more loss eliminates you. The winners-bracket champion faces the losers-bracket champion in the Grand Final.',
    round_robin:
      'Round robin: every player/team plays every other participant once. Standings are ranked by points (3 for a win, 1 for a draw).',
    swiss:
      'Swiss: a fixed number of rounds where you face opponents with a similar record. No elimination — the best record after the final round wins.',
    group_knockout:
      'Group stage + knockout: participants are split into groups that play round robin; the top finishers from each group advance to a single-elimination playoff bracket.',
    custom: 'Custom format — check the tournament rules for details.',
  };
  const md = `**${(t as any).title}** uses *${(t as any).format.replace(/_/g, ' ')}*.\n\n${
    desc[(t as any).format] ?? desc.custom
  }\n\nCurrent status: ${(t as any).status} · ${(t as any).participantsCount}/${
    (t as any).maxParticipants
  } registered.`;
  return {
    tool: 'explain_bracket',
    title: 'How the bracket works',
    data: { format: (t as any).format, status: (t as any).status },
    markdown: md,
  };
}

/* ─────────────────────────── ADMIN TOOLS ─────────────────────────── */

async function toolAdminOverview(): Promise<ToolResult> {
  await connectDB();
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [totalUsers, newUsersToday, totalTournaments, activeTournaments, registrationsToday] =
    await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ createdAt: { $gte: dayStart } }),
      TournamentModel.countDocuments(),
      TournamentModel.countDocuments({ status: { $in: ['registration', 'ongoing', 'upcoming'] } }),
      RegistrationModel.countDocuments({ createdAt: { $gte: dayStart } }),
    ]);
  const revenueAgg = await PaymentModel.aggregate([
    { $match: { status: 'captured' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const revenueTodayAgg = await PaymentModel.aggregate([
    { $match: { status: 'captured', paidAt: { $gte: dayStart } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const data = {
    totalUsers,
    newUsersToday,
    totalTournaments,
    activeTournaments,
    registrationsToday,
    totalRevenue: (revenueAgg[0]?.total ?? 0) / 100,
    revenueToday: (revenueTodayAgg[0]?.total ?? 0) / 100,
  };
  const md = `Platform snapshot:\n\n- Active tournaments: **${activeTournaments}** (${totalTournaments} total)\n- Users: ${totalUsers} (${newUsersToday} new today)\n- Registrations today: ${registrationsToday}\n- Revenue today: **${formatCurrency(data.revenueToday)}** · all-time ${formatCurrency(data.totalRevenue)}`;
  return { tool: 'admin_overview', title: 'Platform overview', data, markdown: md };
}

async function toolAdminRevenue(period: 'today' | 'week' | 'month'): Promise<ToolResult> {
  await connectDB();
  const now = new Date();
  const from =
    period === 'today'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : period === 'week'
        ? new Date(now.getTime() - 7 * 864e5)
        : new Date(now.getTime() - 30 * 864e5);
  const [agg, failed] = await Promise.all([
    PaymentModel.aggregate([
      { $match: { status: { $in: ['captured', 'refunded', 'partially_refunded'] }, paidAt: { $gte: from } } },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    PaymentModel.countDocuments({ status: 'failed', createdAt: { $gte: from } }),
  ]);
  const captured = agg.find((a: any) => a._id === 'captured')?.total ?? 0;
  const refunded = agg.reduce(
    (acc: number, a: any) => acc + (a._id !== 'captured' ? a.total : 0),
    0,
  );
  const data = {
    period,
    grossRevenue: captured / 100,
    refunded: refunded / 100,
    netRevenue: (captured - refunded) / 100,
    failedPayments: failed,
    transactions: agg.reduce((acc: number, a: any) => acc + a.count, 0),
  };
  const md = `Revenue (${period}):\n\n- Gross: **${formatCurrency(data.grossRevenue)}**\n- Refunds: ${formatCurrency(data.refunded)}\n- Net: ${formatCurrency(data.netRevenue)}\n- Transactions: ${data.transactions}\n- Failed payments: ${data.failedPayments}`;
  return { tool: 'admin_revenue', title: `Revenue — ${period}`, data, markdown: md };
}

async function toolAdminTopTournaments(): Promise<ToolResult> {
  await connectDB();
  const items = await TournamentModel.find()
    .sort({ participantsCount: -1 })
    .limit(5)
    .select('title slug participantsCount maxParticipants prizePool entryFee status')
    .lean();
  const md = `Most popular tournaments by registrations:\n\n${items
    .map(
      (t: any, i: number) =>
        `${i + 1}. **${t.title}** — ${t.participantsCount}/${t.maxParticipants} players · ${formatCurrency(
          t.prizePool,
        )} prize · ${t.status}`,
    )
    .join('\n')}`;
  return {
    tool: 'admin_top_tournaments',
    title: 'Top tournaments',
    data: items,
    markdown: md,
  };
}

async function toolAdminFailedPayments(): Promise<ToolResult> {
  await connectDB();
  const items = await PaymentModel.find({ status: 'failed' })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('user', 'name email')
    .populate('tournament', 'title')
    .lean();
  const rows = items.map((p: any) => ({
    user: p.user?.name ?? '—',
    email: p.user?.email ?? '',
    tournament: p.tournament?.title ?? '—',
    amount: p.amount / 100,
    reason: p.failureReason || 'unspecified',
    at: p.createdAt,
  }));
  const md = rows.length
    ? `Recent failed payments (${rows.length}):\n\n${rows
        .map(
          (r, i) =>
            `${i + 1}. ${r.user} — ${formatCurrency(r.amount)} for **${r.tournament}** · ${r.reason} (${formatDateTime(r.at)})`,
        )
        .join('\n')}`
    : 'No failed payments. 🎉';
  return { tool: 'admin_failed_payments', title: 'Failed payments', data: rows, markdown: md };
}

async function toolAdminDailySummary(): Promise<ToolResult> {
  const overview = await toolAdminOverview();
  const top = await toolAdminTopTournaments();
  const md = `📊 **Daily summary**\n\n${overview.markdown}\n\n${top.markdown}`;
  return {
    tool: 'admin_daily_summary',
    title: 'Daily activity summary',
    data: { overview: overview.data, top: top.data },
    markdown: md,
  };
}

/* ────────────────────────── INTENT ROUTING ────────────────────────── */

type PlayerTool =
  | 'recommend_tournaments'
  | 'today_tournaments'
  | 'explain_rules'
  | 'explain_bracket'
  | 'my_next_match'
  | 'my_stats';

function routePlayerIntent(message: string): { tool: PlayerTool; slug?: string } {
  const m = message.toLowerCase();
  const slugMatch = message.match(/\/tournaments\/([a-z0-9-]+)/i) ?? m.match(/tournament[:\s]+["']?([a-z0-9-]{3,})/i);
  const slug = slugMatch?.[1];

  if (/(join|recommend|suggest|which tournament|what should i play)/.test(m))
    return { tool: 'recommend_tournaments' };
  if (/(today|tonight|happening now|live now|what.*today)/.test(m)) return { tool: 'today_tournaments' };
  if (/(next match|who am i playing|my match|upcoming match|what time.*match|match.*time)/.test(m))
    return { tool: 'my_next_match' };
  if (/(my stat|my performance|my win|my record|my rank|my earnings|my history)/.test(m))
    return { tool: 'my_stats' };
  if (/(rule|how does.*work|format|explain)/.test(m) && slug) return { tool: 'explain_rules', slug };
  if (/(bracket|how does.*bracket)/.test(m)) return { tool: 'explain_bracket', slug: slug ?? '' };
  if (/(rule|regulation)/.test(m)) return { tool: 'explain_rules', slug: slug ?? '' };
  return { tool: 'recommend_tournaments' };
}

function routeAdminIntent(message: string): { tool: string; period?: 'today' | 'week' | 'month' } {
  const m = message.toLowerCase();
  if (/(revenue|earnings|income|money|sales)/.test(m)) {
    const period = /month/.test(m) ? 'month' : /week/.test(m) ? 'week' : 'today';
    return { tool: 'admin_revenue', period };
  }
  if (/(failed payment|failed|declined)/.test(m)) return { tool: 'admin_failed_payments' };
  if (/(popular|most registration|top tournament|best tournament)/.test(m))
    return { tool: 'admin_top_tournaments' };
  if (/(summar|daily|activity|report)/.test(m)) return { tool: 'admin_daily_summary' };
  return { tool: 'admin_overview' };
}

/* ───────────────────────── LLM COMPOSITION ───────────────────────── */

export function aiConfigured(): boolean {
  return Boolean(env.AI_API_KEY);
}

async function composeWithLLM(
  systemPrompt: string,
  userMessage: string,
  toolMarkdown: string,
): Promise<string | null> {
  if (!aiConfigured()) return null;
  try {
    const res = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        temperature: 0.4,
        max_tokens: 700,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Question: ${userMessage}\n\nVerified platform data (ground truth, do not invent numbers):\n${toolMarkdown}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error('[ai] LLM error:', res.status, await res.text());
      return null;
    }
    const json = (await res.json()) as any;
    const content = json?.choices?.[0]?.message?.content;
    return typeof content === 'string' && content.trim() ? content.trim() : null;
  } catch (err) {
    console.error('[ai] LLM call failed:', err);
    return null;
  }
}

/* ───────────────────────── PUBLIC ENTRY POINTS ───────────────────────── */

export interface AIAnswer {
  answer: string;
  tool: string;
  data: unknown;
  usedLLM: boolean;
  conversationId: string;
}

export async function askPlayerAssistant(
  user: SessionUser,
  message: string,
  conversationId?: string,
): Promise<AIAnswer> {
  if (!message.trim()) throw new ValidationError('Please type a question.');
  const { tool, slug } = routePlayerIntent(message);

  let result: ToolResult;
  switch (tool) {
    case 'today_tournaments':
      result = await toolTodayTournaments();
      break;
    case 'explain_rules':
      result = await toolExplainRules(slug ?? '');
      break;
    case 'explain_bracket':
      result = await toolExplainBracket(slug ?? '');
      break;
    case 'my_next_match':
      result = await toolMyNextMatch(user);
      break;
    case 'my_stats':
      result = await toolMyStats(user);
      break;
    case 'recommend_tournaments':
    default:
      result = await toolRecommendTournaments(user);
      break;
  }

  const llm = await composeWithLLM(
    `You are the NEXUS ARENA tournament assistant for ${user.name}. Answer concisely (under 150 words),
use the verified platform data provided, never invent statistics. Use markdown lists where helpful.
Esports tone: energetic but professional.`,
    message,
    result.markdown,
  );

  const answer = llm ?? result.markdown;
  const conversation = await saveConversation(user.id, 'player', message, answer, conversationId, result.tool);

  return {
    answer,
    tool: result.tool,
    data: result.data,
    usedLLM: Boolean(llm),
    conversationId: String(conversation._id),
  };
}

export async function askAdminAssistant(
  admin: SessionUser,
  message: string,
  conversationId?: string,
): Promise<AIAnswer> {
  if (!message.trim()) throw new ValidationError('Please type a question.');
  const { tool, period } = routeAdminIntent(message);

  let result: ToolResult;
  switch (tool) {
    case 'admin_revenue':
      result = await toolAdminRevenue(period ?? 'today');
      break;
    case 'admin_failed_payments':
      result = await toolAdminFailedPayments();
      break;
    case 'admin_top_tournaments':
      result = await toolAdminTopTournaments();
      break;
    case 'admin_daily_summary':
      result = await toolAdminDailySummary();
      break;
    case 'admin_overview':
    default:
      result = await toolAdminOverview();
      break;
  }

  const llm = await composeWithLLM(
    `You are the NEXUS ARENA admin intelligence assistant for ${admin.name} (${admin.role}).
Answer with precise numbers from the verified data. Keep answers under 150 words. Use markdown tables/lists.
Never perform actions — you are read-only analytics.`,
    message,
    result.markdown,
  );

  const answer = llm ?? result.markdown;
  const conversation = await saveConversation(admin.id, 'admin', message, answer, conversationId, result.tool);

  return {
    answer,
    tool: result.tool,
    data: result.data,
    usedLLM: Boolean(llm),
    conversationId: String(conversation._id),
  };
}

async function saveConversation(
  userId: string,
  scope: 'player' | 'admin',
  question: string,
  answer: string,
  conversationId: string | undefined,
  tool: string,
) {
  await connectDB();
  let conversation;
  if (conversationId) {
    conversation = await AIConversationModel.findById(conversationId);
  }
  if (!conversation || String(conversation.user) !== userId) {
    conversation = await AIConversationModel.create({
      user: userId,
      scope,
      title: question.slice(0, 60),
      messages: [],
    });
  }
  conversation.messages.push(
    { role: 'user', content: question, tool: '', createdAt: new Date() } as any,
    { role: 'assistant', content: answer, tool, createdAt: new Date() } as any,
  );
  // Keep the last 40 messages.
  if (conversation.messages.length > 40) {
    conversation.messages = conversation.messages.slice(-40);
  }
  conversation.lastMessageAt = new Date();
  await conversation.save();
  return conversation;
}

export async function listConversations(userId: string) {
  await connectDB();
  return AIConversationModel.find({ user: userId })
    .sort({ lastMessageAt: -1 })
    .limit(20)
    .select('title scope lastMessageAt')
    .lean();
}

export async function getConversation(userId: string, conversationId: string) {
  await connectDB();
  const c = await AIConversationModel.findById(conversationId);
  if (!c || String(c.user) !== userId) return null;
  return c;
}

/** Shared AI status shown in the UI. */
export function getAIStatus() {
  return {
    enabled: true,
    llmConfigured: aiConfigured(),
    model: aiConfigured() ? env.AI_MODEL : null,
    note: aiConfigured()
      ? 'LLM-assisted answers enabled.'
      : 'Data-mode answers active. Set AI_API_KEY to enable LLM composition.',
  };
}
