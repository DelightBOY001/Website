/**
 * Grant super-admin access to an existing account in the configured database.
 * Run only from a trusted machine with the production MONGODB_URI.
 *
 * Usage (PowerShell):
 *   $env:MONGODB_URI = "mongodb+srv://.../nexus-arena"
 *   $env:ADMIN_EMAIL = "you@example.com"
 *   npm run make-admin
 */
import { loadEnvConfig } from '@next/env';
import { connectDB, disconnectDB } from '../src/lib/db';
import { UserModel } from '../src/models';

loadEnvConfig(process.cwd());

async function main() {
  const uri = process.env.MONGODB_URI?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (!uri || uri === 'memory' || uri.startsWith('memory://')) {
    throw new Error('Set MONGODB_URI to the persistent Atlas database used by the live site.');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set ADMIN_EMAIL to the email address of an account already registered on the live site.');
  }

  await connectDB();
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new Error(
        `No account found for ${email}. Register that email on the live site first, and verify MONGODB_URI points to the same Atlas database.`,
      );
    }
    if (user.status !== 'active') {
      throw new Error(`Account ${email} is ${user.status}; activate it before granting admin access.`);
    }

    user.role = 'super_admin';
    await user.save();
    console.log(`Granted super_admin to ${email}. Sign out of the website and sign back in.`);
  } finally {
    await disconnectDB();
  }
}

main().catch((err: unknown) => {
  console.error('Admin promotion failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
