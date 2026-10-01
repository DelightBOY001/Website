import mongoose from 'mongoose';
import { env } from './env';

/**
 * Mongoose global connection cache.
 *
 * In production set MONGODB_URI to a MongoDB Atlas / self-hosted connection string.
 * For local development/testing without a MongoDB daemon set MONGODB_URI=memory —
 * an in-memory MongoDB (mongodb-memory-server) is booted automatically.
 */

interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryUri: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __nexusMongoose: Cached | undefined;
}

const cached: Cached = globalThis.__nexusMongoose ?? {
  conn: null,
  promise: null,
  memoryUri: null,
};
globalThis.__nexusMongoose = cached;

async function startMemoryServer(): Promise<string> {
  if (cached.memoryUri) return cached.memoryUri;
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const server = await MongoMemoryServer.create({
    instance: { dbName: 'nexus-arena' },
  });
  cached.memoryUri = server.getUri('nexus-arena');
  console.log('[db] Started in-memory MongoDB at', cached.memoryUri);
  return cached.memoryUri;
}

/** Serverless platforms (Vercel) can't run a persistent in-memory database. */
function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
}

/**
 * Resolve the MongoDB URI with development-friendly defaults:
 *  - unset MONGODB_URI in local/dev  → auto-managed in-memory DB (with a warning)
 *  - unset on Vercel/serverless      → clear configuration error (points to README)
 */
async function resolveUri(): Promise<string> {
  let uri = env.MONGODB_URI;
  if (!uri) {
    if (isServerless()) {
      throw new Error(
        'MONGODB_URI is not set. On Vercel you must add a MongoDB Atlas connection string in Project Settings → Environment Variables. See README.md → "Deploy on Vercel (free)".',
      );
    }
    uri = 'memory';
    console.warn(
      '[db] MONGODB_URI is not set — using an auto-managed in-memory database. Data resets when the server restarts. Set MONGODB_URI in .env.local for persistent storage (see README.md).',
    );
  }
  if (uri === 'memory' || uri.startsWith('memory://')) {
    if (isServerless()) {
      throw new Error(
        'MONGODB_URI=memory is not supported on serverless hosting (data would vanish between requests). Use a MongoDB Atlas connection string instead — see README.md.',
      );
    }
    uri = await startMemoryServer();
  }
  return uri;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = (async () => {
      const uri = await resolveUri();
      const opts: mongoose.ConnectOptions = {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 12000,
        socketTimeoutMS: 45000,
        family: 4,
      };
      const conn = await mongoose.connect(uri, opts);
      mongoose.connection.on('error', (err) => console.error('[db] connection error:', err));
      console.log('[db] Connected to MongoDB');
      return conn;
    })();
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
