import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import {
  AnnouncementModel,
  GameModel,
  MatchModel,
  RegistrationModel,
  TeamModel,
  TournamentModel,
  UserModel,
  type TournamentDoc,
} from '@/models';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { slugify } from '@/lib/utils';
import { hasRole, type SessionUser } from '@/lib/auth';
import { logAdminAction } from './audit.service';
import { realtime } from '@/lib/realtime';
import { notifyMany, notifyUser } from './notification.service';

export interface TournamentQuery {
  search?: string;
  game?: string;
  format?: string;
  type?: string;
  status?: string;
  entryFeeMin?: number;
  entryFeeMax?: number;
  prizePoolMin?: number;
  region?: string;
  featured?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
  organizer?: string;
}

export async function listTournaments(query: TournamentQuery) {
  await connectDB();
  const filter: Record<string, unknown> = {};

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
      { tags: { $regex: query.search, $options: 'i' } },
    ];
  }
  if (query.game) {
    if (Types.ObjectId.isValid(query.game)) filter.game = query.game;
    else {
      const game = await GameModel.findOne({ slug: query.game }).lean();
      filter.game = game?._id ?? null;
    }
  }
  if (query.format) filter.format = query.format;
  if (query.type) filter.type = query.type;
  if (query.status) {
    if (query.status === 'live') filter.status = 'ongoing';
    else if (query.status === 'open') {
      filter.status = 'registration';
      filter.registrationOpen = true;
    } else filter.status = query.status;
  } else {
    // Public listing hides drafts.
    filter.status = { $ne: 'draft' };
  }
  if (query.organizer) filter.organizer = query.organizer;
  if (query.region) filter.region = query.region;
  if (query.featured !== undefined) filter.featured = query.featured;
  if (query.entryFeeMin !== undefined || query.entryFeeMax !== undefined) {
    filter.entryFee = {
      ...(query.entryFeeMin !== undefined ? { $gte: query.entryFeeMin } : {}),
      ...(query.entryFeeMax !== undefined ? { $lte: query.entryFeeMax } : {}),
    };
  }
  if (query.prizePoolMin !== undefined) filter.prizePool = { $gte: query.prizePoolMin };

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    soonest: { startsAt: 1 },
    prize: { prizePool: -1 },
    entryFee: { entryFee: 1 },
    popular: { participantsCount: -1 },
  };
  const sort = sortMap[query.sort ?? 'soonest'] ?? sortMap.soonest!;

  const limit = Math.min(query.limit ?? 12, 50);
  const page = Math.max(query.page ?? 1, 1);

  const [items, total] = await Promise.all([
    TournamentModel.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('game', 'name slug accentColor coverImage')
      .populate('organizer', 'name username avatar')
      .lean(),
    TournamentModel.countDocuments(filter),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getTournamentBySlug(slug: string) {
  await connectDB();
  const tournament = await TournamentModel.findOne({ slug })
    .populate('game', 'name slug accentColor coverImage genre platforms')
    .populate('organizer', 'name username avatar organizerProfile')
    .lean();
  if (!tournament) throw new NotFoundError('Tournament not found');
  return tournament;
}

export async function getTournamentParticipants(tournamentId: string) {
  await connectDB();
  return RegistrationModel.find({ tournament: tournamentId, status: { $in: ['confirmed', 'pending'] } })
    .sort({ seed: 1, createdAt: 1 })
    .populate('user', 'name username avatar playerId stats.points stats.wins stats.losses avatarColor')
    .populate('team', 'name tag logo color')
    .lean();
}

export interface CreateTournamentInput {
  title: string;
  tagline?: string;
  description?: string;
  rules?: string;
  game: string;
  gameMode?: string;
  format: string;
  type: string;
  entryFee: number;
  prizePool?: number;
  prizes?: { position: number; label?: string; amount: number }[];
  maxParticipants: number;
  minParticipants?: number;
  teamSize?: number;
  startsAt: string;
  endsAt?: string;
  registrationDeadline?: string;
  region?: string;
  platform?: string;
  online?: boolean;
  venue?: string;
  bannerUrl?: string;
  featured?: boolean;
  seeding?: 'auto' | 'random' | 'manual';
  rules_ack?: boolean;
  settings?: Record<string, unknown>;
}

export async function createTournament(organizer: SessionUser, input: CreateTournamentInput) {
  await connectDB();
  if (!Types.ObjectId.isValid(input.game)) throw new ValidationError('Invalid game selection.');
  const game = await GameModel.findById(input.game);
  if (!game) throw new ValidationError('Selected game does not exist.');

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime()) || startsAt < new Date(Date.now() - 60_000)) {
    throw new ValidationError('Start date must be in the future.');
  }
  if (input.entryFee < 0) throw new ValidationError('Entry fee cannot be negative.');

  let slug = slugify(input.title);
  if (await TournamentModel.findOne({ slug })) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const tournament = await TournamentModel.create({
    title: input.title.trim(),
    slug,
    tagline: input.tagline ?? '',
    description: input.description ?? '',
    rules:
      input.rules ??
      '1. Be respectful — toxic behaviour results in disqualification.\n2. All matches must be played within the scheduled window.\n3. Results must be reported by both captains within 15 minutes of match completion.\n4. Use of cheats/exploits leads to an immediate ban.\n5. Organizer decisions are final.',
    game: game._id,
    gameMode: input.gameMode ?? '',
    format: input.format,
    type: input.type,
    entryFee: input.entryFee,
    prizePool: input.prizePool ?? input.entryFee * input.maxParticipants * 0.8,
    prizes: input.prizes ?? [
      { position: 1, label: 'Champion', amount: Math.round((input.prizePool ?? 0) * 0.5) },
      { position: 2, label: 'Runner-up', amount: Math.round((input.prizePool ?? 0) * 0.3) },
      { position: 3, label: 'Third place', amount: Math.round((input.prizePool ?? 0) * 0.2) },
    ],
    maxParticipants: input.maxParticipants,
    minParticipants: input.minParticipants ?? Math.min(4, input.maxParticipants),
    teamSize: input.teamSize ?? (input.type === 'team' ? 5 : 1),
    startsAt,
    endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
    registrationDeadline: input.registrationDeadline
      ? new Date(input.registrationDeadline)
      : undefined,
    region: input.region ?? 'IN',
    platform: input.platform ?? 'PC',
    online: input.online ?? true,
    venue: input.venue ?? '',
    bannerUrl: input.bannerUrl ?? '',
    featured: input.featured && hasRole(organizer, 'admin') ? true : false,
    seeding: input.seeding ?? 'auto',
    organizer: new Types.ObjectId(organizer.id),
    status: 'registration',
    registrationOpen: true,
  });

  await GameModel.findByIdAndUpdate(game._id, { $inc: { tournamentCount: 1 } });

  await logAdminAction(organizer, 'tournament:create', 'tournament', String(tournament._id), {
    title: tournament.title,
    format: tournament.format,
    entryFee: tournament.entryFee,
  });

  realtime.admin('tournament:created', { tournamentId: String(tournament._id) });
  return tournament;
}

export async function updateTournament(
  actor: SessionUser,
  tournamentId: string,
  patch: Partial<CreateTournamentInput> & { status?: string; featured?: boolean; registrationOpen?: boolean },
) {
  await connectDB();
  const tournament = await TournamentModel.findById(tournamentId);
  if (!tournament) throw new NotFoundError('Tournament not found');

  const isOrganizer = String(tournament.organizer) === actor.id;
  const isAdmin = hasRole(actor, 'admin');
  if (!isOrganizer && !isAdmin && !hasRole(actor, 'moderator')) {
    throw new ForbiddenError('You cannot edit this tournament.');
  }

  const allowed: Record<string, unknown> = {};
  const fields = [
    'title',
    'tagline',
    'description',
    'rules',
    'gameMode',
    'entryFee',
    'prizePool',
    'maxParticipants',
    'minParticipants',
    'region',
    'platform',
    'online',
    'venue',
    'bannerUrl',
    'seeding',
    'registrationOpen',
    'liveStreamUrl',
    'discordUrl',
  ] as const;
  for (const f of fields) {
    if ((patch as any)[f] !== undefined) (allowed as any)[f] = (patch as any)[f];
  }
  if (patch.startsAt) allowed.startsAt = new Date(patch.startsAt);
  if (patch.endsAt) allowed.endsAt = new Date(patch.endsAt);
  if (patch.registrationDeadline) allowed.registrationDeadline = new Date(patch.registrationDeadline);
  if (patch.prizes) allowed.prizes = patch.prizes;
  if (patch.settings) allowed.settings = { ...tournament.settings, ...patch.settings } as any;

  if (patch.status) {
    const validTransitions: Record<string, string[]> = {
      draft: ['registration', 'cancelled'],
      registration: ['upcoming', 'ongoing', 'cancelled', 'draft'],
      upcoming: ['registration', 'ongoing', 'cancelled'],
      ongoing: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    const from = tournament.status as string;
    if (!(validTransitions[from] ?? []).includes(patch.status)) {
      throw new ConflictError(`Cannot move tournament from "${from}" to "${patch.status}".`);
    }
    allowed.status = patch.status;
  }

  if (patch.featured !== undefined && isAdmin) allowed.featured = patch.featured;

  Object.assign(tournament, allowed);
  await tournament.save();

  await logAdminAction(actor, 'tournament:update', 'tournament', tournamentId, {
    fields: Object.keys(allowed),
  });
  realtime.tournament(tournamentId, 'tournament:updated', { fields: Object.keys(allowed) });
  return tournament;
}

export async function deleteTournament(actor: SessionUser, tournamentId: string) {
  await connectDB();
  const tournament = await TournamentModel.findById(tournamentId);
  if (!tournament) throw new NotFoundError('Tournament not found');
  const isOrganizer = String(tournament.organizer) === actor.id;
  if (!isOrganizer && !hasRole(actor, 'admin')) {
    throw new ForbiddenError('Only the organizer or an admin can delete this tournament.');
  }

  await MatchModel.deleteMany({ tournament: tournamentId });
  await RegistrationModel.deleteMany({ tournament: tournamentId });
  await AnnouncementModel.deleteMany({ tournament: tournamentId });
  await TournamentModel.deleteOne({ _id: tournamentId });

  await logAdminAction(actor, 'tournament:delete', 'tournament', tournamentId, {
    title: tournament.title,
  });
  realtime.admin('tournament:deleted', { tournamentId });
  return true;
}

/** Register the current user for a free tournament (paid flow goes through payment service). */
export async function registerForTournament(
  user: SessionUser,
  tournamentId: string,
  opts: { teamId?: string; inGameName?: string; discordId?: string; agreedToRules: boolean },
) {
  await connectDB();
  const tournament = await TournamentModel.findById(tournamentId);
  if (!tournament) throw new NotFoundError('Tournament not found');
  if (!tournament.registrationOpen || tournament.status !== 'registration') {
    throw new ConflictError('Registration for this tournament is closed.');
  }
  if (tournament.participantsCount >= tournament.maxParticipants) {
    throw new ConflictError('This tournament is full.');
  }
  if (!opts.agreedToRules) throw new ValidationError('You must accept the rules.');

  const existing = await RegistrationModel.findOne({
    tournament: tournamentId,
    user: user.id,
    status: { $in: ['pending', 'confirmed'] },
  });
  if (existing) throw new ConflictError('You are already registered.');

  if (tournament.type === 'team') {
    if (!opts.teamId) throw new ValidationError('Select a team for this tournament.');
    const team = await TeamModel.findById(opts.teamId);
    if (!team) throw new NotFoundError('Team not found.');
    const isMember = team.members?.some(
      (m: any) => String(m.user) === user.id && m.status === 'active',
    );
    if (!isMember && String(team.captain) !== user.id) {
      throw new ForbiddenError('You are not a member of this team.');
    }
  }

  const { confirmRegistration } = await import('./payment.service');
  return confirmRegistration({
    userId: user.id,
    tournamentId,
    teamId: opts.teamId,
    inGameName: opts.inGameName,
    discordId: opts.discordId,
  });
}

/** Platform & tournament announcements. */
export async function createAnnouncement(
  actor: SessionUser,
  input: { title: string; body: string; tournamentId?: string; pinned?: boolean },
) {
  await connectDB();
  if (input.tournamentId) {
    const t = await TournamentModel.findById(input.tournamentId);
    if (!t) throw new NotFoundError('Tournament not found');
    if (String(t.organizer) !== actor.id && !hasRole(actor, 'moderator')) {
      throw new ForbiddenError('Only the organizer or staff can post announcements.');
    }
  } else if (!hasRole(actor, 'moderator')) {
    throw new ForbiddenError('Only staff can post platform announcements.');
  }

  const doc = await AnnouncementModel.create({
    title: input.title,
    body: input.body,
    tournament: input.tournamentId ?? null,
    author: actor.id,
    pinned: input.pinned ?? false,
    published: true,
  });

  if (input.tournamentId) {
    realtime.tournament(input.tournamentId, 'announcement:new', {
      title: input.title,
      announcementId: String(doc._id),
    });
  } else {
    realtime.admin('announcement:new', { title: input.title });
  }
  return doc;
}

export async function endTournament(actor: SessionUser, tournamentId: string) {
  await connectDB();
  const tournament = await TournamentModel.findById(tournamentId);
  if (!tournament) throw new NotFoundError('Tournament not found');
  const isOrganizer = String(tournament.organizer) === actor.id;
  if (!isOrganizer && !hasRole(actor, 'moderator')) {
    throw new ForbiddenError('Only the organizer or staff can end this tournament.');
  }
  tournament.status = 'completed';
  tournament.endsAt = new Date();
  await tournament.save();

  const { recordTournamentCompletion } = await import('./leaderboard.service');
  await recordTournamentCompletion(tournament);

  await notifyMany(
    {
      type: 'tournament_victory',
      title: `${tournament.title} — Final results`,
      body: `The tournament has concluded. View the final standings and bracket.`,
      link: `/tournaments/${tournament.slug}/bracket`,
    },
    { tournament: tournament._id, status: 'confirmed' },
  );

  await logAdminAction(actor, 'tournament:end', 'tournament', tournamentId, {});
  realtime.tournament(tournamentId, 'tournament:completed', {});
  return tournament;
}
