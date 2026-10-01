import { Schema, type Model } from 'mongoose';
import { defineSchema, model, MATCH_STATUSES } from './common';
import type { MatchDoc, BracketDoc } from './types';

const ParticipantSchema = defineSchema(
  {
    kind: { type: String, enum: ['user', 'team', 'bye', 'tbd'], default: 'tbd' },
    ref: { type: Schema.Types.ObjectId, default: null },
    name: { type: String, default: 'TBD', maxlength: 80 },
    seed: { type: Number, default: 0 },
    score: { type: Number, default: 0, min: 0 },
    logo: { type: String, default: '' },
  },
  { _id: false },
);

const ScoreEntrySchema = defineSchema(
  {
    participant: { type: Number, enum: [1, 2], required: true },
    score: { type: Number, required: true, min: 0 },
    gameNumber: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const MatchSchema = defineSchema(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    bracket: { type: Schema.Types.ObjectId, ref: 'Bracket', default: null, index: true },
    matchNumber: { type: Number, required: true },
    round: { type: Number, required: true, index: true },
    roundName: { type: String, default: '', maxlength: 40 },
    position: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: [
        'group',
        'swiss',
        'winners',
        'losers',
        'grand_final',
        'grand_final_reset',
        'upper',
        'lower',
        'knockout',
        'placement',
      ],
      default: 'knockout',
      index: true,
    },
    groupId: { type: String, default: '', maxlength: 12 },
    format: { type: String, enum: ['bo1', 'bo3', 'bo5', 'bo7'], default: 'bo3' },
    participant1: { type: ParticipantSchema, default: () => ({}) },
    participant2: { type: ParticipantSchema, default: () => ({}) },
    winner: {
      kind: { type: String, enum: ['user', 'team', 'none'], default: 'none' },
      ref: { type: Schema.Types.ObjectId, default: null },
      name: { type: String, default: '' },
    },
    loser: {
      kind: { type: String, enum: ['user', 'team', 'none'], default: 'none' },
      ref: { type: Schema.Types.ObjectId, default: null },
      name: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: MATCH_STATUSES,
      default: 'pending',
      index: true,
    },
    scores: { type: [ScoreEntrySchema], default: [] },
    scheduledAt: { type: Date, index: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    durationSeconds: { type: Number, default: 0, min: 0 },
    nextMatchNumber: { type: Number, default: 0 },
    nextMatchSlot: { type: Number, default: 0, min: 0, max: 2 },
    loserNextMatchNumber: { type: Number, default: 0 },
    loserNextMatchSlot: { type: Number, default: 0, min: 0, max: 2 },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    disputeOpen: { type: Boolean, default: false },
    disputeReason: { type: String, default: '', maxlength: 500 },
    streamUrl: { type: String, default: '' },
    lobbyCode: { type: String, default: '', maxlength: 30 },
    notes: { type: String, default: '', maxlength: 1000 },
    isBye: { type: Boolean, default: false },
    isThirdPlace: { type: Boolean, default: false },
  },
  { timestamps: true },
);

MatchSchema.index({ tournament: 1, round: 1, position: 1 });
MatchSchema.index({ tournament: 1, status: 1, scheduledAt: 1 });
MatchSchema.index({ 'participant1.ref': 1, status: 1 });
MatchSchema.index({ 'participant2.ref': 1, status: 1 });

export type { MatchDoc, BracketDoc, ParticipantRef, MatchScoreEntry } from './types';
export const MatchModel = model('Match', MatchSchema) as unknown as Model<MatchDoc>;

/** ───────────────────────────── BRACKET ───────────────────────────── */
const BracketRoundSchema = defineSchema(
  {
    number: { type: Number, required: true },
    name: { type: String, default: '' },
    stage: { type: String, default: 'knockout' },
    matches: [{ type: Schema.Types.ObjectId, ref: 'Match' }],
  },
  { _id: false },
);

const BracketSchema = defineSchema(
  {
    tournament: {
      type: Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      unique: true,
    },
    type: { type: String, default: 'single_elimination' },
    bracketSize: { type: Number, default: 0 },
    hasByes: { type: Boolean, default: false },
    seedingMethod: { type: String, enum: ['auto', 'random', 'manual'], default: 'auto' },
    rounds: { type: [BracketRoundSchema], default: [] },
    losersRounds: { type: [BracketRoundSchema], default: [] },
    groups: [
      {
        id: String,
        name: String,
        rounds: [BracketRoundSchema],
      },
    ],
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    version: { type: Number, default: 1 },
    seeds: [
      {
        seed: Number,
        name: String,
        ref: { type: Schema.Types.ObjectId, default: null },
        kind: { type: String, default: 'user' },
      },
    ],
  },
  { timestamps: true },
);

export const BracketModel = model('Bracket', BracketSchema) as unknown as Model<BracketDoc>;
