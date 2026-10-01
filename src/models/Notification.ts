import { Schema, type Model } from 'mongoose';
import { defineSchema, model, NOTIFICATION_TYPES } from './common';
import type {
  NotificationDoc,
  AnnouncementDoc,
  AchievementDoc,
  AdminLogDoc,
  AIConversationDoc,
  LeaderboardEntryDoc,
  SettingsDoc,
  TokenDoc,
} from './types';

const NotificationSchema = defineSchema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'generic' },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, default: '', maxlength: 1000 },
    link: { type: String, default: '', maxlength: 300 },
    data: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    channel: { type: String, enum: ['in-app', 'email', 'both'], default: 'in-app' },
    emailed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export type { NotificationDoc } from './types';
export const NotificationModel = model('Notification', NotificationSchema) as unknown as Model<NotificationDoc>;

/** ──────────────────────────── ANNOUNCEMENTS ──────────────────────────── */
const AnnouncementSchema = defineSchema(
  {
    title: { type: String, required: true, maxlength: 160 },
    body: { type: String, required: true, maxlength: 8000 },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', default: null, index: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pinned: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
    audience: {
      type: String,
      enum: ['everyone', 'participants', 'staff'],
      default: 'everyone',
    },
  },
  { timestamps: true },
);

AnnouncementSchema.index({ published: 1, pinned: -1, createdAt: -1 });

export type { AnnouncementDoc } from './types';
export const AnnouncementModel = model('Announcement', AnnouncementSchema) as unknown as Model<AnnouncementDoc>;

/** ────────────────────────────── ACHIEVEMENTS ─────────────────────────── */
const AchievementSchema = defineSchema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    key: { type: String, required: true, maxlength: 60 },
    title: { type: String, required: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 300 },
    icon: { type: String, default: 'trophy' },
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

AchievementSchema.index({ user: 1, key: 1 }, { unique: true });

export type { AchievementDoc } from './types';
export const AchievementModel = model('Achievement', AchievementSchema) as unknown as Model<AchievementDoc>;

/** ────────────────────────────── AUDIT LOGS ───────────────────────────── */
const AdminLogSchema = defineSchema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorRole: { type: String, default: '' },
    action: { type: String, required: true, maxlength: 80, index: true },
    targetType: { type: String, default: '', maxlength: 40 },
    targetId: { type: String, default: '', maxlength: 60 },
    details: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '', maxlength: 64 },
  },
  { timestamps: true },
);

AdminLogSchema.index({ createdAt: -1 });

export type { AdminLogDoc } from './types';
export const AdminLogModel = model('AdminLog', AdminLogSchema) as unknown as Model<AdminLogDoc>;

/** ───────────────────────────── AI CONVERSATIONS ──────────────────────── */
const AIMessageSchema = defineSchema(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true, maxlength: 8000 },
    tool: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const AIConversationSchema = defineSchema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scope: { type: String, enum: ['player', 'admin'], default: 'player' },
    title: { type: String, default: 'New conversation', maxlength: 120 },
    messages: { type: [AIMessageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

AIConversationSchema.index({ user: 1, lastMessageAt: -1 });

export type { AIConversationDoc } from './types';
export const AIConversationModel = model('AIConversation', AIConversationSchema) as unknown as Model<AIConversationDoc>;

/** ──────────────────────────── LEADERBOARD ────────────────────────────── */
const LeaderboardEntrySchema = defineSchema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    game: { type: Schema.Types.ObjectId, ref: 'Game', default: null },
    season: { type: String, default: 'global', maxlength: 20, index: true },
    points: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    earnings: { type: Number, default: 0 },
    tournamentsPlayed: { type: Number, default: 0 },
    tournamentsWon: { type: Number, default: 0 },
    form: { type: [String], default: [] }, // recent W/L
  },
  { timestamps: true },
);

LeaderboardEntrySchema.index({ user: 1, game: 1, season: 1 }, { unique: true });
LeaderboardEntrySchema.index({ season: 1, points: -1, earnings: -1 });

export type { LeaderboardEntryDoc } from './types';
export const LeaderboardEntryModel = model('LeaderboardEntry', LeaderboardEntrySchema) as unknown as Model<LeaderboardEntryDoc>;

/** ──────────────────────────── PLATFORM SETTINGS ─────────────────────── */
const SettingsSchema = defineSchema(
  {
    key: { type: String, default: 'platform', unique: true },
    siteName: { type: String, default: 'NEXUS ARENA' },
    tagline: { type: String, default: 'Compete. Conquer. Dominate.' },
    maintenanceMode: { type: Boolean, default: false },
    allowRegistration: { type: Boolean, default: true },
    paymentsEnabled: { type: Boolean, default: true },
    platformFeePercent: { type: Number, default: 5, min: 0, max: 50 },
    taxPercent: { type: Number, default: 18, min: 0, max: 50 },
    aiEnabled: { type: Boolean, default: true },
    aiModel: { type: String, default: '' },
    aiDailyLimit: { type: Number, default: 100 },
    notificationEmailEnabled: { type: Boolean, default: true },
    supportEmail: { type: String, default: 'support@nexusarena.gg' },
    defaultCurrency: { type: String, default: 'INR' },
    socials: {
      discord: { type: String, default: '' },
      twitter: { type: String, default: '' },
      youtube: { type: String, default: '' },
      instagram: { type: String, default: '' },
    },
  },
  { timestamps: true },
);

export type { SettingsDoc } from './types';
export const SettingsModel = model('PlatformSettings', SettingsSchema) as unknown as Model<SettingsDoc>;

/** ──────────────────────────────── TOKENS ─────────────────────────────── */
const TokenSchema = defineSchema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['password-reset', 'email-verify'],
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

TokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type { TokenDoc } from './types';
export const TokenModel = model('Token', TokenSchema) as unknown as Model<TokenDoc>;
