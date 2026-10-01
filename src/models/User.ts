import { Schema, type Model } from 'mongoose';
import { defineSchema, model, USER_ROLES, USER_STATUSES } from './common';
import type { UserDoc } from './types';

const GameProfileSchema = defineSchema(
  {
    game: { type: Schema.Types.ObjectId, ref: 'Game' },
    ign: { type: String, trim: true },
    rank: { type: String, trim: true },
  },
  { _id: false },
);

const UserStatsSchema = defineSchema(
  {
    matchesPlayed: { type: Number, default: 0, min: 0 },
    wins: { type: Number, default: 0, min: 0 },
    losses: { type: Number, default: 0, min: 0 },
    draws: { type: Number, default: 0, min: 0 },
    tournamentsPlayed: { type: Number, default: 0, min: 0 },
    tournamentsWon: { type: Number, default: 0, min: 0 },
    earnings: { type: Number, default: 0, min: 0 },
    points: { type: Number, default: 0, min: 0 },
    winStreak: { type: Number, default: 0, min: 0 },
    bestWinStreak: { type: Number, default: 0, min: 0 },
    mvpAwards: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const NotificationPrefsSchema = defineSchema(
  {
    email: { type: Boolean, default: true },
    matchAlerts: { type: Boolean, default: true },
    tournamentAlerts: { type: Boolean, default: true },
    marketing: { type: Boolean, default: false },
  },
  { _id: false },
);

const UserSchema = defineSchema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
      match: /^[a-z0-9_]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    passwordHash: { type: String, select: false },
    avatar: { type: String, default: '' },
    avatarColor: { type: String, default: '#00f0ff' },
    bio: { type: String, default: '', maxlength: 500 },
    region: { type: String, default: 'IN', maxlength: 32 },
    country: { type: String, default: 'India', maxlength: 64 },
    role: { type: String, enum: USER_ROLES, default: 'player', index: true },
    status: { type: String, enum: USER_STATUSES, default: 'active', index: true },
    playerId: { type: String, unique: true, required: true },
    googleId: { type: String, index: true, sparse: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String, select: false },
    banReason: { type: String, default: '' },
    bannedUntil: { type: Date },
    suspensionReason: { type: String, default: '' },
    stats: { type: UserStatsSchema, default: () => ({}) },
    gameProfiles: { type: [GameProfileSchema], default: [] },
    achievements: [{ type: Schema.Types.ObjectId, ref: 'Achievement' }],
    notificationPrefs: { type: NotificationPrefsSchema, default: () => ({}) },
    favoriteGames: [{ type: Schema.Types.ObjectId, ref: 'Game' }],
    socials: {
      discord: { type: String, default: '' },
      twitter: { type: String, default: '' },
      twitch: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },
    organizerProfile: {
      organizationName: { type: String, default: '' },
      verified: { type: Boolean, default: false },
      bio: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc: unknown, ret: Record<string, unknown>) {
        delete (ret as Record<string, unknown>).passwordHash;
        delete (ret as Record<string, unknown>).emailVerificationToken;
        delete (ret as Record<string, unknown>).passwordResetToken;
        delete (ret as Record<string, unknown>).passwordResetExpires;
        delete (ret as Record<string, unknown>).lastLoginIp;
        return ret;
      },
    },
  },
);

UserSchema.index({ 'stats.points': -1 });
UserSchema.index({ 'stats.earnings': -1 });
UserSchema.index({ name: 'text', username: 'text', email: 'text' });

export type { UserDoc } from './types';
export const UserModel = model('User', UserSchema) as unknown as Model<UserDoc>;
