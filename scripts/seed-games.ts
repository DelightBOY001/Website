/**
 * Add the built-in game catalogue only; safe to run against a live database.
 * It does not create demo users, tournaments, payments or registrations.
 *
 * Usage (PowerShell):
 *   $env:MONGODB_URI = "mongodb+srv://.../your-database"
 *   npm run seed:games
 */
import { loadEnvConfig } from '@next/env';
import { connectDB, disconnectDB } from '../src/lib/db';
import { GameModel } from '../src/models';

loadEnvConfig(process.cwd());

const GAMES = [
  { name: 'Valorant', slug: 'valorant', shortName: 'VAL', genre: 'FPS', platforms: ['PC'], description: '5v5 tactical shooter', publisher: 'Riot Games', accentColor: '#ff4655', active: true, featured: true },
  { name: 'BGMI', slug: 'bgmi', shortName: 'BGMI', genre: 'Battle Royale', platforms: ['Mobile'], description: 'Battlegrounds Mobile India', publisher: 'Krafton', accentColor: '#fbbf24', active: true, featured: true },
  { name: 'Free Fire MAX', slug: 'free-fire-max', shortName: 'FF MAX', genre: 'Battle Royale', platforms: ['Mobile'], description: 'Fast-paced mobile battle royale', publisher: 'Garena', accentColor: '#f97316', active: true, featured: false },
  { name: 'Call of Duty Mobile', slug: 'cod-mobile', shortName: 'CODM', genre: 'FPS', platforms: ['Mobile'], description: 'COD Mobile multiplayer and battle royale', publisher: 'Activision', accentColor: '#22c55e', active: true, featured: false },
  { name: 'CS2', slug: 'cs2', shortName: 'CS2', genre: 'FPS', platforms: ['PC'], description: 'Counter-Strike 2', publisher: 'Valve', accentColor: '#f59e0b', active: true, featured: true },
  { name: 'League of Legends', slug: 'league-of-legends', shortName: 'LoL', genre: 'MOBA', platforms: ['PC'], description: 'Competitive 5v5 MOBA', publisher: 'Riot Games', accentColor: '#0ea5e9', active: true, featured: true },
  { name: 'Apex Legends', slug: 'apex-legends', shortName: 'Apex', genre: 'Battle Royale', platforms: ['PC', 'Console'], description: 'Hero-based battle royale', publisher: 'Electronic Arts', accentColor: '#ef4444', active: true, featured: false },
  { name: 'Clash Royale', slug: 'clash-royale', shortName: 'CR', genre: 'Strategy', platforms: ['Mobile'], description: 'Real-time strategy duels', publisher: 'Supercell', accentColor: '#8b5cf6', active: true, featured: false },
];

async function main() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri || uri === 'memory' || uri.startsWith('memory://')) {
    throw new Error('Set MONGODB_URI to the persistent Atlas database used by the live site.');
  }

  await connectDB();
  try {
    let inserted = 0;
    for (const game of GAMES) {
      const result = await GameModel.updateOne(
        { slug: game.slug },
        { $setOnInsert: game },
        { upsert: true },
      );
      if (result.upsertedCount) inserted += 1;
    }
    const activeCount = await GameModel.countDocuments({ active: true });
    console.log(`Game catalogue ready: ${activeCount} active games; inserted ${inserted} missing defaults.`);
  } finally {
    await disconnectDB();
  }
}

main().catch((err: unknown) => {
  console.error('Game seeding failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
