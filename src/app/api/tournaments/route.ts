import type { NextRequest } from 'next/server';
import { handler, jsonCreated, jsonOk, parseBody, parseQuery, serialize } from '@/lib/api';
import { limitFor } from '@/lib/rate-limit';
import { createTournamentSchema, tournamentQuerySchema } from '@/lib/validation';
import { createTournament, listTournaments } from '@/services/tournament.service';
import { requireRole, requireSession } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { TournamentModel, GameModel } from '@/models';

/** GET /api/tournaments — public discovery with search/filter/pagination. */
export const GET = handler(async (req: NextRequest) => {
  limitFor(req, 'api');
  const q = parseQuery(new URL(req.url).searchParams, tournamentQuerySchema);
  const result = await listTournaments(q);
  return jsonOk(serialize(result));
});

/** POST /api/tournaments — organizer/admin creates a tournament. */
export const POST = handler(async (req: NextRequest) => {
  limitFor(req, 'write', 'create-tournament');
  const user = await requireRole('organizer');
  const body = await parseBody(req, createTournamentSchema);
  const tournament = await createTournament(user, body);
  return jsonCreated({ ok: true, tournament: serialize(tournament) });
});

void requireSession;
void connectDB;
void TournamentModel;
void GameModel;
