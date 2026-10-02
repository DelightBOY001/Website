import { Schema, type Model } from 'mongoose';
import { defineSchema, model, REGISTRATION_STATUSES } from './common';
import type { TeamDoc, RegistrationDoc } from './types';

const TeamMemberSchema = defineSchema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['captain', 'player', 'substitute'],
      default: 'player',
    },
    inGameName: { type: String, default: '', maxlength: 40 },
    joinedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'left', 'removed'], default: 'active' },
  },
  { _id: false },
);

const TeamSchema = defineSchema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    tag: { type: String, trim: true, uppercase: true, maxlength: 8 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    logo: { type: String, default: '' },
    color: { type: String, default: '#9b8cf3' },
    description: { type: String, default: '', maxlength: 1000 },
    game: { type: Schema.Types.ObjectId, ref: 'Game', index: true },
    captain: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: { type: [TeamMemberSchema], default: [] },
    maxSize: { type: Number, default: 5, min: 2, max: 10 },
    inviteCode: { type: String, unique: true, required: true },
    disbanded: { type: Boolean, default: false },
    lockedAt: { type: Date },
    stats: {
      matchesPlayed: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      tournamentsPlayed: { type: Number, default: 0 },
      tournamentsWon: { type: Number, default: 0 },
      earnings: { type: Number, default: 0 },
      points: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

TeamSchema.index({ name: 'text', tag: 'text' });
TeamSchema.index({ 'stats.points': -1 });

export type { TeamDoc, RegistrationDoc, TeamMember } from './types';
export const TeamModel = model('Team', TeamSchema) as unknown as Model<TeamDoc>;

/** ─────────────────────── TOURNAMENT REGISTRATION ─────────────────────── */
const RegistrationSchema = defineSchema(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    team: { type: Schema.Types.ObjectId, ref: 'Team', default: null },
    type: { type: String, enum: ['solo', 'duo', 'team'], default: 'solo' },
    status: {
      type: String,
      enum: REGISTRATION_STATUSES,
      default: 'pending',
      index: true,
    },
    registrationId: { type: String, required: true, unique: true },
    seed: { type: Number, default: 0 },
    inGameName: { type: String, default: '', maxlength: 40 },
    discordId: { type: String, default: '', maxlength: 60 },
    agreedToRules: { type: Boolean, default: false },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    checkInAt: { type: Date },
    checkedIn: { type: Boolean, default: false },
    confirmedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, default: '' },
    placement: { type: Number, default: 0 },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true },
);

RegistrationSchema.index({ tournament: 1, user: 1 }, { unique: true });
RegistrationSchema.index({ tournament: 1, status: 1, seed: 1 });

export const RegistrationModel = model('TournamentRegistration', RegistrationSchema) as unknown as Model<RegistrationDoc>;
