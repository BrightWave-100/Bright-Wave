import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import { getVerifiedAdminDb } from './store.js';

export const KNOWN_FALLBACK_AUTHORITY_SEED =
  `challenge-arena-firestore-authority-${firebaseConfig.projectId}-v1`;

export const KNOWN_FALLBACK_COOKIE_SECRET =
  'challenge-arena-anon-credential-hmac-secret-v1';

export interface SecurityValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates the security configuration required for production deployment.
 * Fails closed if any production secret or credential is missing or set to insecure defaults.
 */
export async function validateProductionSecurityConfiguration(
  env: NodeJS.ProcessEnv = process.env
): Promise<SecurityValidationResult> {
  const errors: string[] = [];

  // 1. Verify ARENA_SERVER_AUTHORITY_SEED
  const seed = env.ARENA_SERVER_AUTHORITY_SEED;
  if (!seed || typeof seed !== 'string' || seed.trim().length === 0) {
    errors.push('ARENA_SERVER_AUTHORITY_SEED environment variable is required and cannot be empty.');
  } else if (
    seed.trim() === KNOWN_FALLBACK_AUTHORITY_SEED ||
    seed.trim().startsWith('challenge-arena-firestore-authority-')
  ) {
    errors.push('ARENA_SERVER_AUTHORITY_SEED must not use the predictable default or fallback value.');
  } else if (seed.trim().length < 16) {
    errors.push('ARENA_SERVER_AUTHORITY_SEED must be at least 16 characters long for cryptographic security.');
  }

  // 2. Verify ARENA_COOKIE_SECRET
  const cookieSecret = env.ARENA_COOKIE_SECRET;
  if (!cookieSecret || typeof cookieSecret !== 'string' || cookieSecret.trim().length === 0) {
    errors.push('ARENA_COOKIE_SECRET environment variable is required and cannot be empty.');
  } else if (cookieSecret.trim() === KNOWN_FALLBACK_COOKIE_SECRET) {
    errors.push('ARENA_COOKIE_SECRET must not use the hardcoded default fallback value.');
  } else if (cookieSecret.trim().length < 16) {
    errors.push('ARENA_COOKIE_SECRET must be at least 16 characters long for cryptographic security.');
  } else if (env.GEMINI_API_KEY && cookieSecret.trim() === env.GEMINI_API_KEY.trim()) {
    errors.push('ARENA_COOKIE_SECRET must be a dedicated signing secret, not GEMINI_API_KEY.');
  }

  // 3. Verify Firebase Admin SDK availability
  try {
    const adminDb = await getVerifiedAdminDb();
    if (!adminDb) {
      errors.push('Firebase Admin SDK is unavailable. Production requires valid service-account credentials or Cloud Run ADC.');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Firebase Admin SDK probe failed: ${msg}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Enforces production security configuration.
 * Aborts process or throws error if validation fails in production mode.
 */
export async function enforceProductionSecurityOrExit(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const isVitest = process.env.VITEST === 'true';

  if (isVitest) {
    return;
  }

  const result = await validateProductionSecurityConfiguration();

  if (!result.valid) {
    console.error('================================================================');
    console.error('FATAL: Production security configuration validation failed:');
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    console.error('================================================================');

    if (isProd) {
      console.error('Server cannot start in production with insecure or missing credentials. Failing closed.');
      process.exit(1);
    } else {
      console.warn('DEVELOPMENT WARNING: Running with insecure or missing secrets. Production startup will fail.');
    }
  }
}
