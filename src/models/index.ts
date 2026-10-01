/**
 * Central model registry — importing this module registers every schema
 * exactly once, which keeps populate() and ref lookups reliable.
 */
export * from './common';
export type * from './types';
export { UserModel } from './User';
export { GameModel } from './Game';
export { TournamentModel } from './Tournament';
export { TeamModel, RegistrationModel } from './Team';
export { MatchModel, BracketModel } from './Match';
export { PaymentModel } from './Payment';
export {
  NotificationModel,
  AnnouncementModel,
  AchievementModel,
  AdminLogModel,
  AIConversationModel,
  LeaderboardEntryModel,
  SettingsModel,
  TokenModel,
} from './Notification';
