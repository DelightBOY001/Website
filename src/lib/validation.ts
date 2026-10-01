import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(24)
    .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers and underscores'),
  email: z.string().email('Enter a valid email address').max(120),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  region: z.string().max(32).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid reset token'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Invalid verification token'),
});

export const tournamentQuerySchema = z.object({
  search: z.string().max(120).optional(),
  game: z.string().max(60).optional(),
  format: z.string().max(40).optional(),
  type: z.string().max(20).optional(),
  status: z.string().max(20).optional(),
  entryFeeMin: z.coerce.number().min(0).optional(),
  entryFeeMax: z.coerce.number().min(0).optional(),
  prizePoolMin: z.coerce.number().min(0).optional(),
  region: z.string().max(32).optional(),
  featured: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
  sort: z.enum(['newest', 'soonest', 'prize', 'entryFee', 'popular']).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

export const createTournamentSchema = z.object({
  title: z.string().min(4, 'Title must be at least 4 characters').max(120),
  tagline: z.string().max(160).optional(),
  description: z.string().max(8000).optional(),
  rules: z.string().max(12000).optional(),
  game: z.string().min(1, 'Select a game'),
  gameMode: z.string().max(60).optional(),
  format: z.enum([
    'single_elimination',
    'double_elimination',
    'round_robin',
    'swiss',
    'group_knockout',
    'custom',
  ]),
  type: z.enum(['solo', 'duo', 'team']),
  entryFee: z.number().min(0).max(100000),
  prizePool: z.number().min(0).optional(),
  prizes: z
    .array(
      z.object({
        position: z.number().min(1),
        label: z.string().max(60).optional(),
        amount: z.number().min(0),
        extra: z.string().max(120).optional(),
      }),
    )
    .max(16)
    .optional(),
  maxParticipants: z.number().min(2).max(4096),
  minParticipants: z.number().min(2).max(4096).optional(),
  teamSize: z.number().min(1).max(10).optional(),
  startsAt: z.string().min(4),
  endsAt: z.string().optional(),
  registrationDeadline: z.string().optional(),
  region: z.string().max(32).optional(),
  platform: z.string().max(32).optional(),
  online: z.boolean().optional(),
  venue: z.string().max(200).optional(),
  bannerUrl: z.string().max(500).optional(),
  seeding: z.enum(['auto', 'random', 'manual']).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const registerTournamentSchema = z.object({
  teamId: z.string().optional(),
  inGameName: z.string().max(40).optional(),
  discordId: z.string().max(60).optional(),
  agreedToRules: z.boolean(),
});

export const reportScoreSchema = z.object({
  score1: z.number().int().min(0).max(99),
  score2: z.number().int().min(0).max(99),
  games: z
    .array(
      z.object({
        participant: z.union([z.literal(1), z.literal(2)]),
        score: z.number().int().min(0).max(99),
        gameNumber: z.number().int().min(1).max(20),
      }),
    )
    .optional(),
  notes: z.string().max(1000).optional(),
});

export const paymentVerifySchema = z.object({
  razorpay_order_id: z.string().min(4),
  razorpay_payment_id: z.string().min(4),
  razorpay_signature: z.string().min(4),
});

export const createTeamSchema = z.object({
  name: z.string().min(3).max(50),
  tag: z.string().max(8).optional(),
  description: z.string().max(1000).optional(),
  game: z.string().optional(),
  maxSize: z.number().min(2).max(10).optional(),
  color: z.string().max(20).optional(),
  logo: z.string().max(500).optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().max(500).optional(),
  region: z.string().max(32).optional(),
  country: z.string().max(64).optional(),
  socials: z.record(z.string().max(200)).optional(),
  notificationPrefs: z
    .object({
      email: z.boolean().optional(),
      matchAlerts: z.boolean().optional(),
      tournamentAlerts: z.boolean().optional(),
      marketing: z.boolean().optional(),
    })
    .optional(),
});

export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(['player', 'organizer', 'moderator', 'admin', 'super_admin']).optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  banReason: z.string().max(500).optional(),
  suspensionReason: z.string().max(500).optional(),
  emailVerified: z.boolean().optional(),
});

export const announcementSchema = z.object({
  title: z.string().min(3).max(160),
  body: z.string().min(3).max(8000),
  tournamentId: z.string().optional(),
  pinned: z.boolean().optional(),
});

export const manualSeedingSchema = z.object({
  seeding: z.enum(['auto', 'random', 'manual']).optional(),
  manualOrder: z.array(z.string()).max(4096).optional(),
});
