import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  ArenaStore,
  getStoreDb,
  resetAdminDbState,
  setAdminDbForTesting,
} from '../server/store.js';
import {
  KNOWN_FALLBACK_AUTHORITY_SEED,
  KNOWN_FALLBACK_COOKIE_SECRET,
  validateProductionSecurityConfiguration,
} from '../server/config-validator.js';
import { createInMemoryAdminDb } from '../server/test-admin-db.js';
import { getChallengeByIdOrSlug } from '../data/challenges/index.js';
import { createInitialSession, generateId, generateShareToken } from '../engine/engine.js';

describe('Admin SDK & Production Security Fail-Closed Test Suite', () => {
  const origRequireAdminSdk = process.env.REQUIRE_ADMIN_SDK;

  beforeEach(() => {
    resetAdminDbState();
    delete process.env.REQUIRE_ADMIN_SDK;
  });

  afterEach(() => {
    if (origRequireAdminSdk !== undefined) {
      process.env.REQUIRE_ADMIN_SDK = origRequireAdminSdk;
    } else {
      delete process.env.REQUIRE_ADMIN_SDK;
    }
  });

  it('1. Admin SDK unavailable -> authoritative operation fails closed', async () => {
    process.env.REQUIRE_ADMIN_SDK = 'true';
    setAdminDbForTesting(null);
    const store = new ArenaStore();

    await expect(getStoreDb()).rejects.toThrow(
      'Firebase Admin SDK is unavailable; authoritative Firestore operations are disabled.'
    );

    await expect(
      store.claimOrVerifyPlayerOwnership('plr_fail', 'anon_fail', 'FailPlayer')
    ).rejects.toThrow(
      'Firebase Admin SDK is unavailable; authoritative Firestore operations are disabled.'
    );

    await expect(store.getPlayerRecord('plr_fail')).rejects.toThrow(
      'Firebase Admin SDK is unavailable; authoritative Firestore operations are disabled.'
    );

    await expect(store.getSession('sess_fail')).rejects.toThrow(
      'Firebase Admin SDK is unavailable; authoritative Firestore operations are disabled.'
    );

    await expect(store.getResult('res_fail')).rejects.toThrow(
      'Firebase Admin SDK is unavailable; authoritative Firestore operations are disabled.'
    );
  });

  it('2. Client SDK cannot be used as an authoritative fallback', async () => {
    process.env.REQUIRE_ADMIN_SDK = 'true';
    setAdminDbForTesting(null);
    const store = new ArenaStore();

    // Verify store throws rather than silently using any client SDK
    let threw = false;
    try {
      await store.getLeaderboard();
    } catch (err: unknown) {
      threw = true;
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toContain('Firebase Admin SDK is unavailable');
    }
    expect(threw).toBe(true);
  });

  it('3. Missing ARENA_SERVER_AUTHORITY_SEED -> production startup fails', async () => {
    const mockEnv = {
      ARENA_COOKIE_SECRET: 'super-secure-cookie-secret-32-chars-long!',
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"test"}',
    };
    const result = await validateProductionSecurityConfiguration(mockEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('ARENA_SERVER_AUTHORITY_SEED'))).toBe(true);
  });

  it('4. Missing ARENA_COOKIE_SECRET -> production startup fails', async () => {
    const mockEnv = {
      ARENA_SERVER_AUTHORITY_SEED: 'super-secure-authority-seed-32-chars-long!',
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"test"}',
    };
    const result = await validateProductionSecurityConfiguration(mockEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('ARENA_COOKIE_SECRET'))).toBe(true);
  });

  it('5. Known fallback authority seed -> production startup fails', async () => {
    const mockEnv = {
      ARENA_SERVER_AUTHORITY_SEED: KNOWN_FALLBACK_AUTHORITY_SEED,
      ARENA_COOKIE_SECRET: 'super-secure-cookie-secret-32-chars-long!',
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"test"}',
    };
    const result = await validateProductionSecurityConfiguration(mockEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('predictable default or fallback'))).toBe(true);
  });

  it('6. Known fallback cookie secret -> production startup fails', async () => {
    const mockEnv = {
      ARENA_SERVER_AUTHORITY_SEED: 'super-secure-authority-seed-32-chars-long!',
      ARENA_COOKIE_SECRET: KNOWN_FALLBACK_COOKIE_SECRET,
      FIREBASE_SERVICE_ACCOUNT_JSON: '{"project_id":"test"}',
    };
    const result = await validateProductionSecurityConfiguration(mockEnv);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('hardcoded default fallback'))).toBe(true);
  });

  it('7. Admin SDK successfully initializes -> ArenaStore uses AdminFirestore', async () => {
    const mockDb = createInMemoryAdminDb();
    setAdminDbForTesting(mockDb);

    const store = new ArenaStore();
    const challenge = getChallengeByIdOrSlug('business1000')!;

    const ownership = await store.claimOrVerifyPlayerOwnership(
      'plr_adm_1',
      'anon_adm_1',
      'AdminTester'
    );
    expect(ownership.allowed).toBe(true);
    expect(ownership.player?.displayName).toBe('AdminTester');

    const session = createInitialSession({
      playerId: 'plr_adm_1',
      ownerAnonUid: 'anon_adm_1',
      playerName: 'AdminTester',
      challenge,
      isDaily: true,
      dailyDateKey: '2026-10-03',
    });

    await store.saveSession(session);
    const retrieved = await store.getSession(session.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(session.id);
    expect(retrieved?.playerName).toBe('AdminTester');
  });

  it('8. All authoritative transactions use AdminFirestore', async () => {
    const mockDb = createInMemoryAdminDb();
    setAdminDbForTesting(mockDb);

    const store = new ArenaStore();
    const challenge = getChallengeByIdOrSlug('business1000')!;

    const session = createInitialSession({
      playerId: 'plr_tx_1',
      ownerAnonUid: 'anon_tx_1',
      playerName: 'TxTester',
      challenge,
      isDaily: true,
      dailyDateKey: '2026-10-03',
    });
    await store.saveSession(session);

    const resultId = generateId('res');
    const shareToken = generateShareToken();

    const finalized = await store.completeSessionAndSaveResult({
      session,
      result: {
        id: resultId,
        sessionId: session.id,
        playerId: 'plr_tx_1',
        ownerAnonUid: 'anon_tx_1',
        playerName: 'TxTester',
        challengeId: challenge.id,
        challengeSlug: challenge.slug,
        challengeTitle: challenge.title,
        challengeCategory: challenge.category,
        challengeVersion: challenge.version,
        isDaily: true,
        dailyDateKey: '2026-10-03',
        score: 88,
        tier: 'strong',
        tierLabel: 'Strong Run',
        archetype: 'THE STRATEGIST',
        archetypeDescription: 'Long horizon',
        summaryCommentary: 'Strong completion',
        dimensions: [{ key: 'strategy', label: 'Strategy', weight: 1, score: 88 }],
        finalState: { ...challenge.startingState },
        stateMetrics: challenge.stateMetrics,
        decisionHistory: [],
        shareToken,
        completedAt: new Date().toISOString(),
      },
      challengeDescription: challenge.description,
    });

    expect(finalized.id).toBe(resultId);
    expect(finalized.score).toBe(88);

    // Verify result was stored in AdminFirestore
    const storedResult = await store.getResult(resultId);
    expect(storedResult).toBeDefined();
    expect(storedResult?.id).toBe(resultId);

    // Verify leaderboard was updated in AdminFirestore
    const lb = await store.getLeaderboard(challenge.id);
    expect(lb.length).toBeGreaterThanOrEqual(1);
    expect(lb[0].displayName).toBe('TxTester');
    expect(lb[0].score).toBe(88);

    // Verify friend challenge was minted in AdminFirestore
    const fc = await store.getFriendChallenge(shareToken);
    expect(fc).toBeDefined();
    expect(fc?.challengerName).toBe('TxTester');
    expect(fc?.score).toBe(88);
  });
});
