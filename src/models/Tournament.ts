import { Schema, type Model } from 'mongoose';
import {
  defineSchema,
  model,
  TOURNAMENT_FORMATS,
  TOURNAMENT_STATUSES,
  TOURNAMENT_TYPES,
} from './common';
import type { TournamentDoc } from './types';

const PrizeSchema = defineSchema(
  {
    position: { type: Number, required: true, min: 1 },
    label: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    extra: { type: String, default: '' },
  },
  { _id: false },
);

const SettingsSchema = defineSchema(
  {
    allowCancel: { type: Boolean, default: true },
    cancelDeadlineHours: { type: Number, default: 24 },
    autoProgress: { type: Boolean, default: true },
    requireCheckIn: { type: Boolean, default: true },
    bestOfDefault: { type: Number, default: 3, min: 1, max: 9 },
    thirdPlaceMatch: { type: Boolean, default: true },
    publicBracket: { type: Boolean, default: true },
    allowDispute: { type: Boolean, default: true },
  },
  { _id: false },
);

const TournamentSchema = defineSchema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    tagline: { type: String, default: '', maxlength: 160 },
    description: { type: String, default: '', maxlength: 8000 },
    rules: { type: String, default: '', maxlength: 12000 },
    game: { type: Schema.Types.ObjectId, ref: 'Game', required: true, index: true },
    gameMode: { type: String, default: '', maxlength: 60 },
    format: {
      type: String,
      enum: TOURNAMENT_FORMATS,
      default: 'single_elimination',
      index: true,
    },
    type: { type: String, enum: TOURNAMENT_TYPES, default: 'solo', index: true },
    status: {
      type: String,
      enum: TOURNAMENT_STATUSES,
      default: 'draft',
      index: true,
    },
    entryFee: { type: Number, default: 0, min: 0, index: true },
    prizePool: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    prizes: { type: [PrizeSchema], default: [] },
    maxParticipants: { type: Number, required: true, min: 2, max: 4096 },
    minParticipants: { type: Number, default: 2, min: 2 },
    participantsCount: { type: Number, default: 0, min: 0 },
    teamSize: { type: Number, default: 1, min: 1, max: 10 },
    registrationOpen: { type: Boolean, default: true },
    registrationDeadline: { type: Date },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date },
    timezone: { type: String, default: 'Asia/Kolkata' },
    region: { type: String, default: 'IN', maxlength: 32, index: true },
    platform: { type: String, default: 'PC', maxlength: 32 },
    online: { type: Boolean, default: true },
    venue: { type: String, default: '', maxlength: 200 },
    bannerUrl: { type: String, default: '' },
    coverGradient: { type: String, default: 'from-cyan-500/20 via-violet-600/10 to-rose-500/20' },
    featured: { type: Boolean, default: false, index: true },
    seeding: {
      type: String,
      enum: ['auto', 'random', 'manual'],
      default: 'auto',
    },
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    moderators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    winner: {
      kind: { type: String, enum: ['user', 'team', 'none'], default: 'none' },
      ref: { type: Schema.Types.ObjectId, default: null },
      name: { type: String, default: '' },
    },
    runnerUp: {
      kind: { type: String, enum: ['user', 'team', 'none'], default: 'none' },
      ref: { type: Schema.Types.ObjectId, default: null },
      name: { type: String, default: '' },
    },
    currentRound: { type: Number, default: 0 },
    totalRounds: { type: Number, default: 0 },
    checkInOpensAt: { type: Date },
    settings: { type: SettingsSchema, default: () => ({}) },
    liveStreamUrl: { type: String, default: '' },
    discordUrl: { type: String, default: '' },
    tags: [{ type: String, maxlength: 24 }],
    stats: {
      totalMatches: { type: Number, default: 0 },
      completedMatches: { type: Number, default: 0 },
      totalViews: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
);

TournamentSchema.index({ status: 1, startsAt: 1 });
TournamentSchema.index({ featured: -1, startsAt: 1 });
TournamentSchema.index({ entryFee: 1, prizePool: -1 });
TournamentSchema.index({ title: 'text', description: 'text', tags: 'text' });

export type { TournamentDoc, PrizeEntry, TournamentSettings } from './types';
export const TournamentModel = model('Tournament', TournamentSchema) as unknown as Model<TournamentDoc>;
