import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handler, jsonCreated, jsonOk, parseBody, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import {
  announcementSchema,
  manualSeedingSchema,
  registerTournamentSchema,
} from '@/lib/validation';
import { requireSession, getSession, hasRole } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { AnnouncementModel, RegistrationModel, TournamentModel, MatchModel } from '@/models';
import {
  generateTournamentBracket,
  getBracketView,
  collectParticipants,
} from '@/services/bracket.service';
import {
  createAnnouncement,
  endTournament,
  getTournamentParticipants,
  registerForTournament,
} from '@/services/tournament.service';
import { createRegistrationOrder } from '@/services/payment.service';
import { startTournament } from '@/services/match.service';
import { cancelRegistration } from '@/services/match.service';
import { NotFoundError, ForbiddenError } from '@/lib/errors';

const cancelSchema = z.object({ registrationId: z.string().optional(), reason: z.string().max(500).optional() });

async function loadTournament(idOrSlug: string) {
  await connectDB();
  const byId = /^[0-9a-f]{24}$/i.test(idOrSlug)
    ? await TournamentModel.findById(idOrSlug)
    : await TournamentModel.findOne({ slug: idOrSlug });
  return byId;
}

/**
 * GET/POST /api/tournaments/[id]/[action]
 * actions: participants | bracket | register | unregister | start | end |
 *          generate-bracket | announcements | standings
 */
export const GET = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string; action: string }> }) => {
  limitFor(req, 'api');
  const { id, action } = await ctx.params;
  const tournament = await loadTournament(id);
  if (!tournament) throw new NotFoundError('Tournament not found');

  switch (action) {
    case 'participants': {
      const items = await getTournamentParticipants(String(tournament._id));
      return jsonOk(serialize({ items }));
    }
    case 'bracket': {
      const view = await getBracketView(String(tournament._id));
      return jsonOk(serialize({ bracket: view }));
    }
    case 'announcements': {
      const items = await AnnouncementModel.find({
        $or: [{ tournament: tournament._id }, { tournament: null }],
        published: true,
      })
        .sort({ pinned: -1, createdAt: -1 })
        .limit(50)
        .populate('author', 'name username avatar role')
        .lean();
      return jsonOk(serialize({ items }));
    }
    case 'standings': {
      const matches = await MatchModel.find({ tournament: tournament._id, stage: { $in: ['group', 'placement', 'swiss'] } }).lean();
      const { computeStandings } = await import('@/services/bracket.service');
      return jsonOk(serialize({ standings: computeStandings(matches as any) }));
    }
    default:
      return jsonOk({ error: { code: 'NOT_FOUND', message: 'Unknown action' } }, { status: 404 });
  }
});

export const POST = handler(async (req: NextRequest, ctx: { params: Promise<{ id: string; action: string }> }) => {
  const { id, action } = await ctx.params;
  const tournament = await loadTournament(id);
  if (!tournament) throw new NotFoundError('Tournament not found');
  const tid = String(tournament._id);

  switch (action) {
    case 'register': {
      limitFor(req, 'payment', 'register');
      const user = await requireSession();
      const body = await parseBody(req, registerTournamentSchema);
      // Paid tournaments route through the payment service (order → checkout → verify).
      if (tournament.entryFee > 0) {
        const order = await createRegistrationOrder(user.user, tid, body);
        return jsonCreated(serialize(order));
      }
      const reg = await registerForTournament(user.user, tid, body);
      return jsonCreated(serialize({ free: true, registration: reg }));
    }
    case 'unregister': {
      limitFor(req, 'write');
      const user = await requireSession();
      const body = await parseBody(req, cancelSchema);
      const reg =
        body.registrationId != null
          ? await cancelRegistration(body.registrationId, user.user, body.reason ?? '')
          : await (async () => {
              const found = await RegistrationModel.findOne({
                tournament: tid,
                user: user.user.id,
              });
              if (!found) throw new NotFoundError('Registration not found');
              return cancelRegistration(String(found._id), user.user, body.reason ?? '');
            })();
      return jsonOk(serialize({ ok: true, registration: reg }));
    }
    case 'generate-bracket': {
      limitFor(req, 'write');
      const user = await requireSession();
      const isOrganizer = String(tournament.organizer) === user.user.id;
      if (!isOrganizer && !hasRole(user.user, 'moderator')) {
        throw new ForbiddenError('Only the organizer or staff can generate the bracket.');
      }
      const body = await parseBody(req, manualSeedingSchema);
      const bracket = await generateTournamentBracket(tid, {
        seeding: body.seeding ?? (tournament.seeding as any),
        manualOrder: body.manualOrder,
        generatedBy: user.user.id,
      });
      return jsonOk(serialize({ ok: true, bracketId: String(bracket._id) }));
    }
    case 'start': {
      limitFor(req, 'write');
      const user = await requireSession();
      const t = await startTournament(tid, user.user);
      return jsonOk(serialize({ ok: true, status: t.status }));
    }
    case 'end': {
      limitFor(req, 'write');
      const user = await requireSession();
      const t = await endTournament(user.user, tid);
      return jsonOk(serialize({ ok: true, status: t.status }));
    }
    case 'announcements': {
      limitFor(req, 'write');
      const user = await requireSession();
      const body = await parseBody(req, announcementSchema);
      const doc = await createAnnouncement(user.user, { ...body, tournamentId: tid });
      return jsonCreated(serialize({ ok: true, announcement: doc }));
    }
    default:
      return jsonOk({ error: { code: 'NOT_FOUND', message: 'Unknown action' } }, { status: 404 });
  }
});

void collectParticipants;
