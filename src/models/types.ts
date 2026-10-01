/**
 * Explicit document interfaces.
 *
 * These replace Mongoose's `InferSchemaType`, which is extremely memory-hungry
 * for the TypeScript checker on large schema graphs. The runtime schemas in
 * this folder remain the source of truth for validation; these interfaces
 * describe the hydrated documents the application code works with.
 */
import type { Types } from 'mongoose';
import type {
  NotificationType,
  PaymentStatus,
  RegistrationStatus,
  TournamentFormat,
  TournamentStatus,
  TournamentType,
  UserRole,
  UserStatus,
  MatchStatus,
} from './common';

interface BaseDoc {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/* ──────────────────────────────── USER ──────────────────────────────── */
export interface UserStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  earnings: number;
  points: number;
  winStreak: number;
  bestWinStreak: number;
  mvpAwards: number;
}

export interface UserDoc extends BaseDoc {
  name: string;
  username: string;
  email: string;
  passwordHash?: string;
  avatar: string;
  avatarColor: string;
  bio: string;
  region: string;
  country: string;
  role: UserRole;
  status: UserStatus;
  playerId: string;
  googleId?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  banReason: string;
  bannedUntil?: Date;
  suspensionReason: string;
  stats: UserStats;
  gameProfiles: { game?: Types.ObjectId; ign?: string; rank?: string }[];
  achievements: Types.ObjectId[];
  notificationPrefs: {
    email: boolean;
    matchAlerts: boolean;
    tournamentAlerts: boolean;
    marketing: boolean;
  };
  favoriteGames: Types.ObjectId[];
  socials: Record<string, string>;
  organizerProfile: {
    organizationName: string;
    verified: boolean;
    bio: string;
  };
  save(): Promise<UserDoc>;
}

/* ──────────────────────────────── GAME ──────────────────────────────── */
export interface GameDoc extends BaseDoc {
  name: string;
  slug: string;
  shortName: string;
  description: string;
  publisher: string;
  genre: string;
  platforms: string[];
  coverImage: string;
  accentColor: string;
  active: boolean;
  featured: boolean;
  playerCount: number;
  tournamentCount: number;
  save(): Promise<GameDoc>;
}

/* ───────────────────────────── TOURNAMENT ───────────────────────────── */
export interface PrizeEntry {
  position: number;
  label: string;
  amount: number;
  extra: string;
}

export interface TournamentSettings {
  allowCancel: boolean;
  cancelDeadlineHours: number;
  autoProgress: boolean;
  requireCheckIn: boolean;
  bestOfDefault: number;
  thirdPlaceMatch: boolean;
  publicBracket: boolean;
  allowDispute: boolean;
}

export interface TournamentDoc extends BaseDoc {
  title: string;
  slug: string;
  tagline: string;
  description: string;
  rules: string;
  game: Types.ObjectId;
  gameMode: string;
  format: TournamentFormat;
  type: TournamentType;
  status: TournamentStatus;
  entryFee: number;
  prizePool: number;
  currency: string;
  prizes: PrizeEntry[];
  maxParticipants: number;
  minParticipants: number;
  participantsCount: number;
  teamSize: number;
  registrationOpen: boolean;
  registrationDeadline?: Date;
  startsAt: Date;
  endsAt?: Date;
  timezone: string;
  region: string;
  platform: string;
  online: boolean;
  venue: string;
  bannerUrl: string;
  coverGradient: string;
  featured: boolean;
  seeding: 'auto' | 'random' | 'manual';
  organizer: Types.ObjectId;
  moderators: Types.ObjectId[];
  winner: { kind: 'user' | 'team' | 'none'; ref: Types.ObjectId | null; name: string };
  runnerUp: { kind: 'user' | 'team' | 'none'; ref: Types.ObjectId | null; name: string };
  currentRound: number;
  totalRounds: number;
  checkInOpensAt?: Date;
  settings: TournamentSettings;
  liveStreamUrl: string;
  discordUrl: string;
  tags: string[];
  stats: {
    totalMatches: number;
    completedMatches: number;
    totalViews: number;
  };
  save(): Promise<TournamentDoc>;
}

/* ───────────────────────── TEAM + REGISTRATION ──────────────────────── */
export interface TeamMember {
  user: Types.ObjectId;
  role: 'captain' | 'player' | 'substitute';
  inGameName: string;
  joinedAt: Date;
  status: 'active' | 'left' | 'removed';
}

export interface TeamDoc extends BaseDoc {
  name: string;
  tag: string;
  slug: string;
  logo: string;
  color: string;
  description: string;
  game: Types.ObjectId | null;
  captain: Types.ObjectId;
  members: TeamMember[];
  maxSize: number;
  inviteCode: string;
  disbanded: boolean;
  lockedAt?: Date;
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
    earnings: number;
    points: number;
  };
  save(): Promise<TeamDoc>;
}

export interface RegistrationDoc extends BaseDoc {
  tournament: Types.ObjectId;
  user: Types.ObjectId;
  team: Types.ObjectId | null;
  type: TournamentType;
  status: RegistrationStatus;
  registrationId: string;
  seed: number;
  inGameName: string;
  discordId: string;
  agreedToRules: boolean;
  payment: Types.ObjectId | null;
  checkInAt?: Date;
  checkedIn: boolean;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancelReason: string;
  placement: number;
  notes: string;
  save(): Promise<RegistrationDoc>;
}

/* ─────────────────────────────── MATCH ─────────────────────────────── */
export interface ParticipantRef {
  kind: 'user' | 'team' | 'bye' | 'tbd';
  ref: Types.ObjectId | null;
  name: string;
  seed: number;
  score: number;
  logo: string;
}

export interface MatchScoreEntry {
  participant: 1 | 2;
  score: number;
  gameNumber: number;
}

export interface MatchDoc extends BaseDoc {
  tournament: Types.ObjectId;
  bracket: Types.ObjectId | null;
  matchNumber: number;
  round: number;
  roundName: string;
  position: number;
  stage: string;
  groupId: string;
  format: 'bo1' | 'bo3' | 'bo5' | 'bo7';
  participant1: ParticipantRef;
  participant2: ParticipantRef;
  winner: { kind: 'user' | 'team' | 'none'; ref: Types.ObjectId | null; name: string };
  loser: { kind: 'user' | 'team' | 'none'; ref: Types.ObjectId | null; name: string };
  status: MatchStatus;
  scores: MatchScoreEntry[];
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  durationSeconds: number;
  nextMatchNumber: number;
  nextMatchSlot: number;
  loserNextMatchNumber: number;
  loserNextMatchSlot: number;
  reportedBy: Types.ObjectId | null;
  confirmedBy: Types.ObjectId | null;
  disputeOpen: boolean;
  disputeReason: string;
  streamUrl: string;
  lobbyCode: string;
  notes: string;
  isBye: boolean;
  isThirdPlace: boolean;
  save(): Promise<MatchDoc>;
}

export interface BracketRoundRef {
  number: number;
  name: string;
  stage: string;
  matches: Types.ObjectId[];
}

export interface BracketDoc extends BaseDoc {
  tournament: Types.ObjectId;
  type: string;
  bracketSize: number;
  hasByes: boolean;
  seedingMethod: 'auto' | 'random' | 'manual';
  rounds: BracketRoundRef[];
  losersRounds: BracketRoundRef[];
  groups: { id: string; name: string; rounds: BracketRoundRef[] }[];
  generatedAt: Date;
  generatedBy?: Types.ObjectId;
  version: number;
  seeds: {
    seed: number;
    name: string;
    ref: Types.ObjectId | null;
    kind: string;
  }[];
  save(): Promise<BracketDoc>;
}

/* ────────────────────────────── PAYMENT ────────────────────────────── */
export interface PaymentDoc extends BaseDoc {
  user: Types.ObjectId;
  tournament: Types.ObjectId;
  registration: Types.ObjectId | null;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  idempotencyKey?: string;
  refund: {
    amount: number;
    refundId: string;
    status: string;
    at?: Date;
    reason: string;
  };
  failureReason: string;
  webhookEvents: string[];
  metadata: Record<string, unknown>;
  paidAt?: Date;
  refundedAt?: Date;
  capturedAt?: Date;
  ip?: string;
  save(): Promise<PaymentDoc>;
}

/* ─────────────────────────── NOTIFICATION ──────────────────────────── */
export interface NotificationDoc extends BaseDoc {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  data: Record<string, unknown>;
  read: boolean;
  readAt?: Date;
  channel: 'in-app' | 'email' | 'both';
  emailed: boolean;
  save(): Promise<NotificationDoc>;
}

export interface AnnouncementDoc extends BaseDoc {
  title: string;
  body: string;
  tournament: Types.ObjectId | null;
  author: Types.ObjectId;
  pinned: boolean;
  published: boolean;
  audience: 'everyone' | 'participants' | 'staff';
  save(): Promise<AnnouncementDoc>;
}

export interface AchievementDoc extends BaseDoc {
  user: Types.ObjectId;
  key: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: Date;
  save(): Promise<AchievementDoc>;
}

export interface AdminLogDoc extends BaseDoc {
  actor: Types.ObjectId;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown>;
  ip: string;
  save(): Promise<AdminLogDoc>;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool: string;
  createdAt: Date;
}

export interface AIConversationDoc extends BaseDoc {
  user: Types.ObjectId;
  scope: 'player' | 'admin';
  title: string;
  messages: AIMessage[];
  lastMessageAt: Date;
  save(): Promise<AIConversationDoc>;
}

export interface LeaderboardEntryDoc extends BaseDoc {
  user: Types.ObjectId;
  game: Types.ObjectId | null;
  season: string;
  points: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  winRate: number;
  earnings: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  form: string[];
  save(): Promise<LeaderboardEntryDoc>;
}

export interface SettingsDoc extends BaseDoc {
  key: string;
  siteName: string;
  tagline: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  paymentsEnabled: boolean;
  platformFeePercent: number;
  taxPercent: number;
  aiEnabled: boolean;
  aiModel: string;
  aiDailyLimit: number;
  notificationEmailEnabled: boolean;
  supportEmail: string;
  defaultCurrency: string;
  socials: Record<string, string>;
  save(): Promise<SettingsDoc>;
}

export interface TokenDoc extends BaseDoc {
  user: Types.ObjectId;
  type: 'password-reset' | 'email-verify';
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  save(): Promise<TokenDoc>;
}
