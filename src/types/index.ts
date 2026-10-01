import type { UserRole, UserStatus } from '@/models/common';

/** Serializable session payload stored inside the JWT. */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  avatar: string;
  playerId: string;
  emailVerified: boolean;
}

export interface AuthSession {
  user: SessionUser;
  issuedAt: number;
  expiresAt: number;
}

/** Public API shapes (JSON-safe). */
export interface PublicUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  avatarColor: string;
  bio: string;
  region: string;
  country: string;
  role: UserRole;
  status: UserStatus;
  playerId: string;
  emailVerified: boolean;
  stats: {
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
  };
  socials?: Record<string, string>;
  achievements?: string[];
  notificationPrefs?: {
    email: boolean;
    matchAlerts: boolean;
    tournamentAlerts: boolean;
    marketing: boolean;
  };
  createdAt?: string;
  lastLoginAt?: string;
}

export interface LeaderboardRow {
  rank: number;
  user: {
    _id: string;
    name: string;
    username: string;
    avatar: string;
    playerId: string;
    avatarColor: string;
  };
  points: number;
  wins: number;
  losses: number;
  matchesPlayed: number;
  winRate: number;
  earnings: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  form: string[];
}

export interface BracketMatchNode {
  matchNumber: number;
  round: number;
  roundName: string;
  position: number;
  stage: string;
  format: string;
  status: string;
  scheduledAt?: string | null;
  participant1: { kind: string; name: string; score: number; seed?: number; logo?: string };
  participant2: { kind: string; name: string; score: number; seed?: number; logo?: string };
  winner: { kind: string; name: string };
  nextMatchNumber: number;
  nextMatchSlot: number;
  loserNextMatchNumber: number;
  loserNextMatchSlot: number;
  isBye: boolean;
  isThirdPlace: boolean;
  lobbyCode?: string;
  streamUrl?: string;
}

export interface BracketRoundView {
  number: number;
  name: string;
  stage: string;
  matches: BracketMatchNode[];
}

export interface BracketView {
  tournament: string;
  type: string;
  bracketSize: number;
  hasByes: boolean;
  rounds: BracketRoundView[];
  losersRounds?: BracketRoundView[];
  groups?: { id: string; name: string; rounds: BracketRoundView[] }[];
  seeds?: { seed: number; name: string }[];
  generatedAt?: string;
}

export interface DashboardStats {
  tournamentsPlayed: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  earnings: number;
  points: number;
  rank: number;
  winStreak: number;
  recentForm: string[];
  earningsHistory: { month: string; amount: number }[];
  winLossHistory: { label: string; wins: number; losses: number }[];
}

export interface AdminOverview {
  totalUsers: number;
  newUsersToday: number;
  totalTournaments: number;
  activeTournaments: number;
  totalRevenue: number;
  revenueToday: number;
  totalRegistrations: number;
  registrationsToday: number;
  failedPayments: number;
  refundsTotal: number;
  liveMatches: number;
  completedMatches: number;
  revenueByDay: { date: string; amount: number }[];
  topTournaments: {
    _id: string;
    title: string;
    slug: string;
    participantsCount: number;
    prizePool: number;
    entryFee: number;
  }[];
  recentPayments: unknown[];
}
