import { Schema, type Model } from 'mongoose';
import { defineSchema, model } from './common';
import type { GameDoc } from './types';

const GameSchema = defineSchema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    shortName: { type: String, default: '', maxlength: 12 },
    description: { type: String, default: '', maxlength: 2000 },
    publisher: { type: String, default: '', maxlength: 80 },
    genre: { type: String, default: '', maxlength: 40 },
    platforms: [{ type: String }],
    coverImage: { type: String, default: '' },
    accentColor: { type: String, default: '#62dce7' },
    active: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    playerCount: { type: Number, default: 0 },
    tournamentCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

GameSchema.index({ active: 1, featured: -1 });
GameSchema.index({ name: 'text' });

export type { GameDoc } from './types';
export const GameModel = model('Game', GameSchema) as unknown as Model<GameDoc>;
