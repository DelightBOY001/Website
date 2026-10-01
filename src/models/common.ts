import mongoose, { Schema, type Model, type Types } from 'mongoose';

/**
 * Non-inferring schema factory.
 *
 * Mongoose's Schema constructor infers a giant conditional type from the
 * schema literal, which exhausts the TypeScript checker's heap on large
 * schemas. This helper keeps runtime behaviour identical while keeping
 * type-checking cheap — document shapes are declared explicitly in ./types.
 */
export function defineSchema(
  definition: Record<string, unknown>,
  options?: Record<string, unknown>,
): Schema {
  return new Schema(definition as never, options as never);
}

/**
 * Model factory (safe under Next.js hot-reload).
 *
 * Returns `Model<any>` deliberately: instantiating mongoose's `Model<T>`
 * with an unresolved generic parameter explodes the TypeScript checker's
 * memory. Each model file narrows the result with `as unknown as Model<XDoc>`,
 * which instantiates only cheap concrete types.
 */
export function model(name: string, schema: Schema): Model<any> {
  return (mongoose.models[name] as Model<any>) || mongoose.model(name, schema);
}

export type ID = Types.ObjectId;

/** ─────────────────────────── ROLES & ACCESS ─────────────────────────── */
export const USER_ROLES = [
  'player',
  'organizer',
  'moderator',
  'admin',
  'super_admin',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_RANK: Record<UserRole, number> = {
  player: 0,
  organizer: 1,
  moderator: 2,
  admin: 3,
  super_admin: 4,
};

export const USER_STATUSES = ['active', 'suspended', 'banned'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const TOURNAMENT_FORMATS = [
  'single_elimination',
  'double_elimination',
  'round_robin',
  'swiss',
  'group_knockout',
  'custom',
] as const;
export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const TOURNAMENT_STATUSES = [
  'draft',
  'registration',
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
] as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUSES)[number];

export const TOURNAMENT_TYPES = ['solo', 'duo', 'team'] as const;
export type TournamentType = (typeof TOURNAMENT_TYPES)[number];

export const MATCH_STATUSES = [
  'pending',
  'scheduled',
  'live',
  'completed',
  'walkover',
  'cancelled',
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'created',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'partially_refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REGISTRATION_STATUSES = [
  'pending',
  'confirmed',
  'cancelled',
  'disqualified',
  'waitlist',
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'generic',
  'registration_confirmed',
  'registration_cancelled',
  'payment_success',
  'payment_failed',
  'payment_refunded',
  'match_assigned',
  'match_reminder',
  'match_result',
  'tournament_starting',
  'tournament_created',
  'bracket_generated',
  'qualification',
  'elimination',
  'tournament_victory',
  'prize_distributed',
  'team_invite',
  'announcement',
  'admin_action',
  'system',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

