import crypto from 'crypto';
import {
  cert,
  getApps as getAdminApps,
  initializeApp as initializeAdminApp,
} from 'firebase-admin/app';
import {
  Firestore as AdminFirestore,
  getFirestore as getAdminFirestore,
} from 'firebase-admin/firestore';
import {
  getApps as getClientApps,
  initializeApp as initializeClientApp,
} from 'firebase/app';
import {
  collection,
  doc,
  Firestore as ClientFirestore,
  getDoc,
  getDocs,
  getFirestore as getClientFirestore,
  limit as firestoreLimit,
  orderBy,
  query,
  runTransaction,
  Transaction as ClientTransaction,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import {
  ChallengeSessionServer,
  FriendChallengeInvite,
  SimulationResult,
} from '../engine/types.js';

export interface LeaderboardRecord {
  id: string;
  challengeId: string;
  challengeTitle: string;
  displayName: string;
  score: number;
  archetype: string;
  tier: string;
  shareToken?: string;
  isDaily: boolean;
  dailyDateKey?: string;
  completedAt: string;
}

export interface AnalyticsRecord {
  id: string;
  eventType: string;
  playerId: string;
  challengeId?: string;
  sessionId?: string;
  shareToken?: string;
  metadata?: Record<string, string | number | boolean>;
  timestamp: string;
}

export interface ArenaPlayerRecord {
  playerId: string;
  ownerAnonUid: string;
  displayName: string;
  activeSessions?: Record<string, string>;
  resultIds?: string[];
  updatedAt: string;
}

export interface DailyStatRecord {
  dateKey: string;
  challengeId: string;
  totalRuns: number;
  sumScore: number;
  topScore: number;
  updatedAt: string;
}

const SERVER_AUTHORITY_SEED =
  process.env.ARENA_SERVER_AUTHORITY_SEED ||
  `challenge-arena-firestore-authority-${firebaseConfig.projectId}-v1`;
const SERVER_SECRET_HASH = crypto
  .createHash('sha256')
  .update(SERVER_AUTHORITY_SEED)
  .digest('hex');

export function sanitizeFirestoreId(raw: string): string {
  const clean = String(raw || '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
  return clean || 'id_default';
}

/**
 * Computes an unguessable 128-bit server-HMAC capability document key for private
 * authoritative collections (arenaPlayers, arenaSessions, arenaResults).
 */
export function toServerDocKey(
  domain: 'player' | 'session' | 'result',
  logicalId: string
): string {
  const cleanId = sanitizeFirestoreId(logicalId).slice(0, 80);
  const mac = crypto
    .createHmac('sha256', SERVER_SECRET_HASH)
    .update(`${domain}:${cleanId}`)
    .digest('hex')
    .slice(0, 32);
  return `srv_${mac}_${cleanId}`;
}

/**
 * Computes an anonymized deterministic leaderboard entry ID so public leaderboard
 * documents never expose raw playerId strings.
 */
export function toLeaderboardEntryId(
  playerId: string,
  challengeId: string
): string {
  const cleanPlayerId = sanitizeFirestoreId(playerId);
  const cleanChallengeId = sanitizeFirestoreId(challengeId).slice(0, 40);
  const mac = crypto
    .createHmac('sha256', SERVER_SECRET_HASH)
    .update(`lb:${cleanPlayerId}:${cleanChallengeId}`)
    .digest('hex')
    .slice(0, 24);
  return `lb_${mac}_${cleanChallengeId}`;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return value;
}

let sharedClientDb: ClientFirestore | null = null;
let sharedAdminDb: AdminFirestore | null = null;
let adminSdkAvailable: boolean | null = null;
let testAdminDbInstance: AdminFirestore | null = null;

export function getClientDb(): ClientFirestore {
  if (!sharedClientDb) {
    const existing = getClientApps().find((a) => a.name === 'arena-server-client');
    const app = existing || initializeClientApp(firebaseConfig, 'arena-server-client');
    sharedClientDb = getClientFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
  return sharedClientDb;
}

/**
 * Injects a test AdminFirestore double for test environments.
 */
export function setAdminDbForTesting(mockDb: AdminFirestore | null): void {
  testAdminDbInstance = mockDb;
  sharedAdminDb = mockDb;
  adminSdkAvailable = mockDb !== null;
}

/**
 * Resets the cached Admin SDK state.
 */
export function resetAdminDbState(): void {
  testAdminDbInstance = null;
  sharedAdminDb = null;
  adminSdkAvailable = null;
}

/**
 * Initializes and verifies the Firebase Admin SDK connection.
 * Supports:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON (direct JSON credentials)
 *   2. GOOGLE_APPLICATION_CREDENTIALS / Cloud Run Application Default Credentials
 *   3. Injected test instances
 * Fails closed if Admin credentials are unavailable. Never logs secrets.
 */
export async function getVerifiedAdminDb(): Promise<AdminFirestore | null> {
  if (testAdminDbInstance) {
    return testAdminDbInstance;
  }
  if (adminSdkAvailable === false) {
    return null;
  }
  if (sharedAdminDb && adminSdkAvailable === true) {
    return sharedAdminDb;
  }

  // 1. Service account JSON injected via environment variable
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawServiceAccount && rawServiceAccount.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawServiceAccount.trim());
      if (!parsed || typeof parsed !== 'object' || !parsed.project_id) {
        console.error('FIREBASE_SERVICE_ACCOUNT_JSON is malformed or missing project_id.');
        adminSdkAvailable = false;
        return null;
      }

      const existing = getAdminApps().find((a) => a?.name === 'arena-server-admin');
      const app =
        existing ||
        initializeAdminApp(
          {
            credential: cert(parsed),
            projectId: parsed.project_id || firebaseConfig.projectId,
          },
          'arena-server-admin'
        );

      const db = getAdminFirestore(app, firebaseConfig.firestoreDatabaseId);
      await db.collection('serverConfig').doc('probe').get();
      sharedAdminDb = db;
      adminSdkAvailable = true;
      return db;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to initialize Firebase Admin SDK from FIREBASE_SERVICE_ACCOUNT_JSON: ${msg}`);
      adminSdkAvailable = false;
      return null;
    }
  }

  // 2. Google Application Default Credentials or Cloud Run IAM binding
  const hasGoogleAppCreds =
    typeof process.env.GOOGLE_APPLICATION_CREDENTIALS === 'string' &&
    process.env.GOOGLE_APPLICATION_CREDENTIALS.trim().length > 0;
  const isCloudRun = Boolean(process.env.K_SERVICE);

  if (hasGoogleAppCreds || isCloudRun) {
    try {
      const existing = getAdminApps().find((a) => a?.name === 'arena-server-admin');
      const app =
        existing ||
        initializeAdminApp(
          { projectId: firebaseConfig.projectId },
          'arena-server-admin'
        );

      const db = getAdminFirestore(app, firebaseConfig.firestoreDatabaseId);
      await db.collection('serverConfig').doc('probe').get();
      sharedAdminDb = db;
      adminSdkAvailable = true;
      return db;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to initialize Firebase Admin SDK from Application Default Credentials: ${msg}`);
      adminSdkAvailable = false;
      return null;
    }
  }

  adminSdkAvailable = false;
  return null;
}

export type StoreDatabase =
  | { type: 'admin'; db: AdminFirestore }
  | { type: 'client'; db: ClientFirestore };

/**
 * Returns the authoritative database instance.
 * Prefers AdminFirestore when available.
 * If REQUIRE_ADMIN_SDK is true and Admin SDK is unavailable, throws an explicit error.
 * Otherwise, falls back to ClientFirestore with HMAC server capability keys and commit proofs.
 */
export async function getStoreDb(): Promise<StoreDatabase> {
  const adminDb = await getVerifiedAdminDb();
  if (adminDb) {
    return { type: 'admin', db: adminDb };
  }
  if (process.env.REQUIRE_ADMIN_SDK === 'true') {
    throw new Error(
      'Firebase Admin SDK is unavailable; authoritative Firestore operations are disabled.'
    );
  }
  return { type: 'client', db: getClientDb() };
}

function makeCommitProof(commitId: string): {
  commitId: string;
  secretHash: string;
  updatedAt: string;
} {
  const cleanId = sanitizeFirestoreId(commitId);
  const uniqueStamp = `${new Date().toISOString()}_${crypto.randomBytes(6).toString('hex')}`;
  return {
    commitId: cleanId,
    secretHash: SERVER_SECRET_HASH,
    updatedAt: uniqueStamp,
  };
}

function addCommitProofToTransaction(
  tx: ClientTransaction,
  db: ClientFirestore,
  commitId: string
): void {
  const proof = makeCommitProof(commitId);
  tx.set(doc(db, 'serverCommits', proof.commitId), proof);
}

function sanitizePublicLeaderboardRecord(raw: Record<string, unknown>): LeaderboardRecord {
  return stripUndefined({
    id: String(raw.id || ''),
    challengeId: String(raw.challengeId || ''),
    challengeTitle: String(raw.challengeTitle || ''),
    displayName: String(raw.displayName || 'Anonymous Player'),
    score: Number(raw.score || 0),
    archetype: String(raw.archetype || ''),
    tier: String(raw.tier || ''),
    shareToken: typeof raw.shareToken === 'string' && raw.shareToken ? raw.shareToken : undefined,
    isDaily: Boolean(raw.isDaily),
    dailyDateKey:
      typeof raw.dailyDateKey === 'string' && raw.dailyDateKey
        ? raw.dailyDateKey
        : undefined,
    completedAt: String(raw.completedAt || ''),
  });
}

function sanitizePublicFriendInvite(raw: Record<string, unknown>): FriendChallengeInvite {
  return stripUndefined({
    shareToken: String(raw.shareToken || ''),
    challengeId: String(raw.challengeId || ''),
    challengeTitle: String(raw.challengeTitle || ''),
    challengeCategory: String(raw.challengeCategory || ''),
    challengeDescription: String(raw.challengeDescription || ''),
    challengerName: String(raw.challengerName || 'Anonymous Player'),
    score: Number(raw.score || 0),
    tier: (raw.tier as FriendChallengeInvite['tier']) || 'solid',
    archetype: (raw.archetype as FriendChallengeInvite['archetype']) || 'THE STRATEGIST',
    dimensions: Array.isArray(raw.dimensions) ? raw.dimensions : [],
    createdAt: String(raw.createdAt || ''),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : String(raw.createdAt || ''),
    attemptsCount: Number(raw.attemptsCount || 0),
    beatenCount: Number(raw.beatenCount || 0),
  });
}

export class ArenaStore {
  private async getDb(): Promise<StoreDatabase> {
    return getStoreDb();
  }

  /**
   * Atomically claims a playerId for an anonymous credential (if unclaimed)
   * or verifies that the caller's anonUid matches the existing ownerAnonUid.
   */
  public async claimOrVerifyPlayerOwnership(
    playerId: string,
    anonUid: string,
    displayName = 'Anonymous Player'
  ): Promise<{ allowed: boolean; player?: ArenaPlayerRecord }> {
    const cleanPlayerId = sanitizeFirestoreId(playerId);
    const cleanAnonUid = sanitizeFirestoreId(anonUid);
    const cleanName = (displayName || 'Anonymous Player').trim().slice(0, 60) || 'Anonymous Player';
    const playerDocKey = toServerDocKey('player', cleanPlayerId);

    const storeDb = await this.getDb();
    if (storeDb.type === 'admin') {
      const db = storeDb.db;
      return db.runTransaction(async (tx) => {
        const ref = db.collection('arenaPlayers').doc(playerDocKey);
        const snap = await tx.get(ref);
        if (snap.exists) {
          const data = snap.data() as ArenaPlayerRecord;
          if (data.ownerAnonUid !== cleanAnonUid) {
            return { allowed: false };
          }
          return { allowed: true, player: data };
        }

        const now = new Date().toISOString();
        const record: ArenaPlayerRecord = {
          playerId: cleanPlayerId,
          ownerAnonUid: cleanAnonUid,
          displayName: cleanName,
          activeSessions: {},
          resultIds: [],
          updatedAt: now,
        };
        tx.set(ref, record);
        const proof = makeCommitProof(playerDocKey);
        tx.set(db.collection('serverCommits').doc(proof.commitId), proof);
        return { allowed: true, player: record };
      });
    }

    const db = storeDb.db;
    return runTransaction(db, async (tx) => {
      const ref = doc(db, 'arenaPlayers', playerDocKey);
      const snap = await tx.get(ref);
      if (snap.exists()) {
        const data = snap.data() as ArenaPlayerRecord;
        if (data.ownerAnonUid !== cleanAnonUid) {
          return { allowed: false };
        }
        return { allowed: true, player: data };
      }

      const now = new Date().toISOString();
      const record: ArenaPlayerRecord = {
        playerId: cleanPlayerId,
        ownerAnonUid: cleanAnonUid,
        displayName: cleanName,
        activeSessions: {},
        resultIds: [],
        updatedAt: now,
      };
      tx.set(ref, record);
      addCommitProofToTransaction(tx, db, playerDocKey);
      return { allowed: true, player: record };
    });
  }

  public async getPlayerRecord(playerId: string): Promise<ArenaPlayerRecord | undefined> {
    const cleanPlayerId = sanitizeFirestoreId(playerId);
    const playerDocKey = toServerDocKey('player', cleanPlayerId);
    const storeDb = await this.getDb();
    if (storeDb.type === 'admin') {
      const snap = await storeDb.db.collection('arenaPlayers').doc(playerDocKey).get();
      if (!snap.exists) return undefined;
      return snap.data() as ArenaPlayerRecord;
    }
    const snap = await getDoc(doc(storeDb.db, 'arenaPlayers', playerDocKey));
    if (!snap.exists()) return undefined;
    return snap.data() as ArenaPlayerRecord;
  }

  public async saveSession(session: ChallengeSessionServer): Promise<void> {
    const cleanSessionId = sanitizeFirestoreId(session.id);
    const cleanPlayerId = sanitizeFirestoreId(session.playerId);
    const cleanAnonUid = sanitizeFirestoreId(session.ownerAnonUid || `anon_${cleanPlayerId}`);
    const sessionDocKey = toServerDocKey('session', cleanSessionId);
    const playerDocKey = toServerDocKey('player', cleanPlayerId);
    const now = new Date().toISOString();

    const normalizedSession: ChallengeSessionServer = stripUndefined({
      ...session,
      id: cleanSessionId,
      playerId: cleanPlayerId,
      ownerAnonUid: cleanAnonUid,
      playerName: (session.playerName || 'Anonymous Player').trim().slice(0, 60) || 'Anonymous Player',
      isDaily: Boolean(session.isDaily),
      dailyDateKey: session.dailyDateKey ? sanitizeFirestoreId(session.dailyDateKey) : undefined,
      friendShareToken: session.friendShareToken ? sanitizeFirestoreId(session.friendShareToken) : undefined,
      resultId: session.resultId ? sanitizeFirestoreId(session.resultId) : undefined,
      updatedAt: now,
    });

    session.updatedAt = now;
    session.ownerAnonUid = cleanAnonUid;

    const storeDb = await this.getDb();
    if (storeDb.type === 'admin') {
      const db = storeDb.db;
      await db.runTransaction(async (tx) => {
        const playerRef = db.collection('arenaPlayers').doc(playerDocKey);
        const playerSnap = await tx.get(playerRef);

        const sessionRef = db.collection('arenaSessions').doc(sessionDocKey);
        tx.set(sessionRef, normalizedSession);
        const sessionProof = makeCommitProof(sessionDocKey);
        tx.set(db.collection('serverCommits').doc(sessionProof.commitId), sessionProof);

        const existingPlayer = playerSnap.exists
          ? (playerSnap.data() as ArenaPlayerRecord)
          : null;

        const activeSessions: Record<string, string> = {
          ...(existingPlayer?.activeSessions || {}),
        };
        if (normalizedSession.status === 'active') {
          activeSessions[normalizedSession.challengeId] = cleanSessionId;
        } else if (activeSessions[normalizedSession.challengeId] === cleanSessionId) {
          delete activeSessions[normalizedSession.challengeId];
        }

        const playerRecord: ArenaPlayerRecord = {
          playerId: cleanPlayerId,
          ownerAnonUid: existingPlayer?.ownerAnonUid || cleanAnonUid,
          displayName: normalizedSession.playerName,
          activeSessions,
          resultIds: existingPlayer?.resultIds || [],
          updatedAt: now,
        };
        tx.set(playerRef, playerRecord);
        const playerProof = makeCommitProof(playerDocKey);
        tx.set(db.collection('serverCommits').doc(playerProof.commitId), playerProof);
      });
      return;
    }

    const db = storeDb.db;
    await runTransaction(db, async (tx) => {
      const playerRef = doc(db, 'arenaPlayers', playerDocKey);
      const playerSnap = await tx.get(playerRef);

      const sessionRef = doc(db, 'arenaSessions', sessionDocKey);
      tx.set(sessionRef, normalizedSession);
      addCommitProofToTransaction(tx, db, sessionDocKey);

      const existingPlayer = playerSnap.exists()
        ? (playerSnap.data() as ArenaPlayerRecord)
        : null;

      const activeSessions: Record<string, string> = {
        ...(existingPlayer?.activeSessions || {}),
      };
      if (normalizedSession.status === 'active') {
        activeSessions[normalizedSession.challengeId] = cleanSessionId;
      } else if (activeSessions[normalizedSession.challengeId] === cleanSessionId) {
        delete activeSessions[normalizedSession.challengeId];
      }

      const playerRecord: ArenaPlayerRecord = {
        playerId: cleanPlayerId,
        ownerAnonUid: existingPlayer?.ownerAnonUid || cleanAnonUid,
        displayName: normalizedSession.playerName,
        activeSessions,
        resultIds: existingPlayer?.resultIds || [],
        updatedAt: now,
      };
      tx.set(playerRef, playerRecord);
      addCommitProofToTransaction(tx, db, playerDocKey);
    });
  }

  public async getSession(sessionId: string): Promise<ChallengeSessionServer | undefined> {
    const cleanSessionId = sanitizeFirestoreId(sessionId);
    const sessionDocKey = toServerDocKey('session', cleanSessionId);
    const storeDb = await this.getDb();
    if (storeDb.type === 'admin') {
      const snap = await storeDb.db.collection('arenaSessions').doc(sessionDocKey).get();
      if (!snap.exists) return undefined;
      return snap.data() as ChallengeSessionServer;
    }
    const snap = await getDoc(doc(storeDb.db, 'arenaSessions', sessionDocKey));
    if (!snap.exists()) return undefined;
    return snap.data() as ChallengeSessionServer;
  }

  public async getActiveSessionForPlayer(
    playerId: string,
    challengeId: string
  ): Promise<ChallengeSessionServer | undefined> {
    const cleanPlayerId = sanitizeFirestoreId(playerId);
    const playerDocKey = toServerDocKey('player', cleanPlayerId);
    const storeDb = await this.getDb();

    if (storeDb.type === 'admin') {
      const db = storeDb.db;
      const playerSnap = await db.collection('arenaPlayers').doc(playerDocKey).get();
      if (!playerSnap.exists) return undefined;

      const player = playerSnap.data() as ArenaPlayerRecord;
      const activeSessionId = player.activeSessions?.[challengeId];
      if (!activeSessionId) return undefined;

      const sessionDocKey = toServerDocKey('session', activeSessionId);
      const sessionSnap = await db.collection('arenaSessions').doc(sessionDocKey).get();
      if (!sessionSnap.exists) return undefined;

      const session = sessionSnap.data() as ChallengeSessionServer;
      if (
        session.playerId === cleanPlayerId &&
        session.challengeId === challengeId &&
        session.status === 'active'
      ) {
        return session;
      }
      return undefined;
    }

    const db = storeDb.db;
    const playerSnap = await getDoc(doc(db, 'arenaPlayers', playerDocKey));
    if (!playerSnap.exists()) return undefined;

    const player = playerSnap.data() as ArenaPlayerRecord;
    const activeSessionId = player.activeSessions?.[challengeId];
    if (!activeSessionId) return undefined;

    const sessionDocKey = toServerDocKey('session', activeSessionId);
    const sessionSnap = await getDoc(doc(db, 'arenaSessions', sessionDocKey));
    if (!sessionSnap.exists()) return undefined;

    const session = sessionSnap.data() as ChallengeSessionServer;
    if (
      session.playerId === cleanPlayerId &&
      session.challengeId === challengeId &&
      session.status === 'active'
    ) {
      return session;
    }
    return undefined;
  }

  /**
   * Atomically completes a gameplay session (or saves a completed result),
   * creates the private result document, creates the public friend challenge invite,
   * updates target friend challenge counters, updates public leaderboard entry,
   * and updates daily challenge statistics (ONLY if isDaily === true).
   */
  public async completeSessionAndSaveResult(params: {
    session: ChallengeSessionServer;
    result: SimulationResult;
    challengeDescription: string;
  }): Promise<SimulationResult> {
    const { session, result, challengeDescription } = params;

    const cleanSessionId = sanitizeFirestoreId(session.id);
    const cleanResultId = sanitizeFirestoreId(result.id);
    const cleanPlayerId = sanitizeFirestoreId(result.playerId);
    const cleanAnonUid = sanitizeFirestoreId(
      session.ownerAnonUid || result.ownerAnonUid || `anon_${cleanPlayerId}`
    );
    const sessionDocKey = toServerDocKey('session', cleanSessionId);
    const resultDocKey = toServerDocKey('result', cleanResultId);
    const playerDocKey = toServerDocKey('player', cleanPlayerId);
    const cleanShareToken = sanitizeFirestoreId(result.shareToken);
    const leaderboardId = toLeaderboardEntryId(cleanPlayerId, result.challengeId);
    const targetFriendToken = session.friendShareToken
      ? sanitizeFirestoreId(session.friendShareToken)
      : undefined;
    const isGenuineDailyRun =
      Boolean(result.isDaily) === true &&
      typeof result.dailyDateKey === 'string' &&
      result.dailyDateKey.length > 0;
    const dailyDateKey = isGenuineDailyRun
      ? sanitizeFirestoreId(result.dailyDateKey!)
      : undefined;

    const storeDb = await this.getDb();
    if (storeDb.type === 'admin') {
      const db = storeDb.db;
      return db.runTransaction(async (tx) => {
        const playerRef = db.collection('arenaPlayers').doc(playerDocKey);
        const lbRef = db.collection('leaderboards').doc(leaderboardId);
        const targetFriendRef = targetFriendToken
          ? db.collection('friendChallenges').doc(targetFriendToken)
          : null;
        const dailyStatRef = dailyDateKey
          ? db.collection('dailyStats').doc(dailyDateKey)
          : null;

        const [playerSnap, lbSnap, targetFriendSnap, dailyStatSnap] = await Promise.all([
          tx.get(playerRef),
          tx.get(lbRef),
          targetFriendRef ? tx.get(targetFriendRef) : Promise.resolve(null),
          dailyStatRef ? tx.get(dailyStatRef) : Promise.resolve(null),
        ]);

        const now = result.completedAt || new Date().toISOString();

        let friendTargetBeaten: SimulationResult['friendTargetBeaten'] =
          result.friendTargetBeaten;

        if (targetFriendRef && targetFriendSnap && targetFriendSnap.exists) {
          const friendInvite = sanitizePublicFriendInvite(
            targetFriendSnap.data() as Record<string, unknown>
          );
          const beaten = result.score > friendInvite.score;
          friendTargetBeaten = {
            shareToken: friendInvite.shareToken,
            challengerName: friendInvite.challengerName,
            challengerScore: friendInvite.score,
            challengerArchetype: friendInvite.archetype,
            challengerDimensions: friendInvite.dimensions,
            beaten,
          };

          const updatedFriendInvite: FriendChallengeInvite = stripUndefined({
            shareToken: friendInvite.shareToken,
            challengeId: friendInvite.challengeId,
            challengeTitle: friendInvite.challengeTitle,
            challengeCategory: friendInvite.challengeCategory,
            challengeDescription: friendInvite.challengeDescription,
            challengerName: friendInvite.challengerName,
            score: friendInvite.score,
            tier: friendInvite.tier,
            archetype: friendInvite.archetype,
            dimensions: friendInvite.dimensions || [],
            createdAt: friendInvite.createdAt,
            updatedAt: now,
            attemptsCount: (friendInvite.attemptsCount || 0) + 1,
            beatenCount: (friendInvite.beatenCount || 0) + (beaten ? 1 : 0),
          });

          tx.set(targetFriendRef, updatedFriendInvite);
          const targetProof = makeCommitProof(targetFriendToken!);
          tx.set(db.collection('serverCommits').doc(targetProof.commitId), targetProof);
        }

        const completedSession: ChallengeSessionServer = stripUndefined({
          ...session,
          id: cleanSessionId,
          playerId: cleanPlayerId,
          ownerAnonUid: cleanAnonUid,
          playerName: (session.playerName || 'Anonymous Player').trim().slice(0, 60) || 'Anonymous Player',
          isDaily: Boolean(session.isDaily),
          dailyDateKey: session.dailyDateKey ? sanitizeFirestoreId(session.dailyDateKey) : undefined,
          friendShareToken: session.friendShareToken ? sanitizeFirestoreId(session.friendShareToken) : undefined,
          status: 'completed',
          resultId: cleanResultId,
          updatedAt: now,
        });

        tx.set(db.collection('arenaSessions').doc(sessionDocKey), completedSession);
        const sessionProof = makeCommitProof(sessionDocKey);
        tx.set(db.collection('serverCommits').doc(sessionProof.commitId), sessionProof);

        const finalizedResult: SimulationResult = stripUndefined({
          ...result,
          id: cleanResultId,
          sessionId: cleanSessionId,
          playerId: cleanPlayerId,
          ownerAnonUid: cleanAnonUid,
          playerName: (result.playerName || 'Anonymous Player').trim().slice(0, 60) || 'Anonymous Player',
          isDaily: Boolean(result.isDaily),
          dailyDateKey: result.dailyDateKey ? sanitizeFirestoreId(result.dailyDateKey) : undefined,
          shareToken: cleanShareToken,
          friendTargetBeaten,
          completedAt: now,
        });

        tx.set(db.collection('arenaResults').doc(resultDocKey), finalizedResult);
        const resultProof = makeCommitProof(resultDocKey);
        tx.set(db.collection('serverCommits').doc(resultProof.commitId), resultProof);

        const newInvite: FriendChallengeInvite = stripUndefined({
          shareToken: cleanShareToken,
          challengeId: finalizedResult.challengeId,
          challengeTitle: finalizedResult.challengeTitle.slice(0, 120),
          challengeCategory: finalizedResult.challengeCategory.slice(0, 80),
          challengeDescription: (challengeDescription || finalizedResult.summaryCommentary)
            .trim()
            .slice(0, 500),
          challengerName: finalizedResult.playerName,
          score: finalizedResult.score,
          tier: finalizedResult.tier,
          archetype: finalizedResult.archetype,
          dimensions: finalizedResult.dimensions.map((d) => ({ ...d })),
          createdAt: now,
          updatedAt: now,
          attemptsCount: 0,
          beatenCount: 0,
        });

        tx.set(db.collection('friendChallenges').doc(cleanShareToken), newInvite);
        const inviteProof = makeCommitProof(cleanShareToken);
        tx.set(db.collection('serverCommits').doc(inviteProof.commitId), inviteProof);

        const existingLb = lbSnap.exists
          ? (lbSnap.data() as LeaderboardRecord)
          : null;
        if (!existingLb || finalizedResult.score >= existingLb.score) {
          const lbEntry: LeaderboardRecord = stripUndefined({
            id: leaderboardId,
            challengeId: finalizedResult.challengeId,
            challengeTitle: finalizedResult.challengeTitle.slice(0, 120),
            displayName: finalizedResult.playerName,
            score: finalizedResult.score,
            archetype: finalizedResult.archetype,
            tier: finalizedResult.tier,
            shareToken: cleanShareToken,
            isDaily: Boolean(finalizedResult.isDaily),
            dailyDateKey: finalizedResult.dailyDateKey,
            completedAt: now,
          });
          tx.set(lbRef, lbEntry);
          const lbProof = makeCommitProof(leaderboardId);
          tx.set(db.collection('serverCommits').doc(lbProof.commitId), lbProof);
        }

        if (dailyStatRef && dailyDateKey) {
          const existingDaily =
            dailyStatSnap && dailyStatSnap.exists
              ? (dailyStatSnap.data() as DailyStatRecord)
              : null;
          const nextDaily: DailyStatRecord = {
            dateKey: dailyDateKey,
            challengeId: finalizedResult.challengeId,
            totalRuns: (existingDaily?.totalRuns || 0) + 1,
            sumScore: (existingDaily?.sumScore || 0) + finalizedResult.score,
            topScore: existingDaily
              ? Math.max(existingDaily.topScore, finalizedResult.score)
              : finalizedResult.score,
            updatedAt: now,
          };
          tx.set(dailyStatRef, nextDaily);
          const dailyProof = makeCommitProof(dailyDateKey);
          tx.set(db.collection('serverCommits').doc(dailyProof.commitId), dailyProof);
        }

        const existingPlayer = playerSnap.exists
          ? (playerSnap.data() as ArenaPlayerRecord)
          : null;
        const activeSessions: Record<string, string> = {
          ...(existingPlayer?.activeSessions || {}),
        };
        if (activeSessions[finalizedResult.challengeId] === cleanSessionId) {
          delete activeSessions[finalizedResult.challengeId];
        }
        const prevResultIds = existingPlayer?.resultIds || [];
        const nextResultIds = [
          cleanResultId,
          ...prevResultIds.filter((id) => id !== cleanResultId),
        ].slice(0, 100);

        const updatedPlayer: ArenaPlayerRecord = {
          playerId: cleanPlayerId,
          ownerAnonUid: existingPlayer?.ownerAnonUid || cleanAnonUid,
          displayName: finalizedResult.playerName,
          activeSessions,
          resultIds: nextResultIds,
          updatedAt: now,
        };
        tx.set(playerRef, updatedPlayer);
        const playerProof = makeCommitProof(playerDocKey);
        tx.set(db.collection('serverCommits').doc(playerProof.commitId), playerProof);

        return finalizedResult;
      });
    }

    const db = storeDb.db;
    return runTransaction(db, async (tx) => {
      const playerRef = doc(db, 'arenaPlayers', playerDocKey);
      const lbRef = doc(db, 'leaderboards', leaderboardId);
      const targetFriendRef = targetFriendToken
        ? doc(db, 'friendChallenges', targetFriendToken)
        : null;
      const dailyStatRef = dailyDateKey
        ? doc(db, 'dailyStats', dailyDateKey)
        : null;

      const [playerSnap, lbSnap, targetFriendSnap, dailyStatSnap] = await Promise.all([
        tx.get(playerRef),
        tx.get(lbRef),
        targetFriendRef ? tx.get(targetFriendRef) : Promise.resolve(null),
        dailyStatRef ? tx.get(dailyStatRef) : Promise.resolve(null),
      ]);

      const now = result.completedAt || new Date().toISOString();

      let friendTargetBeaten: SimulationResult['friendTargetBeaten'] =
        result.friendTargetBeaten;

      if (targetFriendRef && targetFriendSnap && targetFriendSnap.exists()) {
        const friendInvite = sanitizePublicFriendInvite(
          targetFriendSnap.data() as Record<string, unknown>
        );
        const beaten = result.score > friendInvite.score;
        friendTargetBeaten = {
          shareToken: friendInvite.shareToken,
          challengerName: friendInvite.challengerName,
          challengerScore: friendInvite.score,
          challengerArchetype: friendInvite.archetype,
          challengerDimensions: friendInvite.dimensions,
          beaten,
        };

        const updatedFriendInvite: FriendChallengeInvite = stripUndefined({
          shareToken: friendInvite.shareToken,
          challengeId: friendInvite.challengeId,
          challengeTitle: friendInvite.challengeTitle,
          challengeCategory: friendInvite.challengeCategory,
          challengeDescription: friendInvite.challengeDescription,
          challengerName: friendInvite.challengerName,
          score: friendInvite.score,
          tier: friendInvite.tier,
          archetype: friendInvite.archetype,
          dimensions: friendInvite.dimensions || [],
          createdAt: friendInvite.createdAt,
          updatedAt: now,
          attemptsCount: (friendInvite.attemptsCount || 0) + 1,
          beatenCount: (friendInvite.beatenCount || 0) + (beaten ? 1 : 0),
        });

        tx.set(targetFriendRef, updatedFriendInvite);
        addCommitProofToTransaction(tx, db, targetFriendToken!);
      }

      const completedSession: ChallengeSessionServer = stripUndefined({
        ...session,
        id: cleanSessionId,
        playerId: cleanPlayerId,
        ownerAnonUid: cleanAnonUid,
        playerName: (session.playerName || 'Anonymous Player').trim().slice(0, 60) || 'Anonymous Player',
        isDaily: Boolean(session.isDaily),
        dailyDateKey: session.dailyDateKey ? sanitizeFirestoreId(session.dailyDateKey) : undefined,
        friendShareToken: session.friendShareToken ? sanitizeFirestoreId(session.friendShareToken) : undefined,
        status: 'completed',
        resultId: cleanResultId,
        updatedAt: now,
      });

      tx.set(doc(db, 'arenaSessions', sessionDocKey), completedSession);
      addCommitProofToTransaction(tx, db, sessionDocKey);

      const finalizedResult: SimulationResult = stripUndefined({
        ...result,
        id: cleanResultId,
        sessionId: cleanSessionId,
        playerId: cleanPlayerId,
        ownerAnonUid: cleanAnonUid,
        playerName: (result.playerName || 'Anonymous Player').trim().slice(0, 60) || 'Anonymous Player',
        isDaily: Boolean(result.isDaily),
        dailyDateKey: result.dailyDateKey ? sanitizeFirestoreId(result.dailyDateKey) : undefined,
        shareToken: cleanShareToken,
        friendTargetBeaten,
        completedAt: now,
      });

      tx.set(doc(db, 'arenaResults', resultDocKey), finalizedResult);
      addCommitProofToTransaction(tx, db, resultDocKey);

      const newInvite: FriendChallengeInvite = stripUndefined({
        shareToken: cleanShareToken,
        challengeId: finalizedResult.challengeId,
        challengeTitle: finalizedResult.challengeTitle.slice(0, 120),
        challengeCategory: finalizedResult.challengeCategory.slice(0, 80),
        challengeDescription: (challengeDescription || finalizedResult.summaryCommentary)
          .trim()
          .slice(0, 500),
        challengerName: finalizedResult.playerName,
        score: finalizedResult.score,
        tier: finalizedResult.tier,
        archetype: finalizedResult.archetype,
        dimensions: finalizedResult.dimensions.map((d) => ({ ...d })),
        createdAt: now,
        updatedAt: now,
        attemptsCount: 0,
        beatenCount: 0,
      });

      tx.set(doc(db, 'friendChallenges', cleanShareToken), newInvite);
      addCommitProofToTransaction(tx, db, cleanShareToken);

      const existingLb = lbSnap.exists()
        ? (lbSnap.data() as LeaderboardRecord)
        : null;
      if (!existingLb || finalizedResult.score >= existingLb.score) {
        const lbEntry: LeaderboardRecord = stripUndefined({
          id: leaderboardId,
          challengeId: finalizedResult.challengeId,
          challengeTitle: finalizedResult.challengeTitle.slice(0, 120),
          displayName: finalizedResult.playerName,
          score: finalizedResult.score,
          archetype: finalizedResult.archetype,
          tier: finalizedResult.tier,
          shareToken: cleanShareToken,
          isDaily: Boolean(finalizedResult.isDaily),
          dailyDateKey: finalizedResult.dailyDateKey,
          completedAt: now,
        });
        tx.set(lbRef, lbEntry);
        addCommitProofToTransaction(tx, db, leaderboardId);
      }

      if (dailyStatRef && dailyDateKey) {
        const existingDaily =
          dailyStatSnap && dailyStatSnap.exists()
            ? (dailyStatSnap.data() as DailyStatRecord)
            : null;
        const nextDaily: DailyStatRecord = {
          dateKey: dailyDateKey,
          challengeId: finalizedResult.challengeId,
          totalRuns: (existingDaily?.totalRuns || 0) + 1,
          sumScore: (existingDaily?.sumScore || 0) + finalizedResult.score,
          topScore: existingDaily
            ? Math.max(existingDaily.topScore, finalizedResult.score)
            : finalizedResult.score,
          updatedAt: now,
        };
        tx.set(dailyStatRef, nextDaily);
        addCommitProofToTransaction(tx, db, dailyDateKey);
      }

      const existingPlayer = playerSnap.exists()
        ? (playerSnap.data() as ArenaPlayerRecord)
        : null;
      const activeSessions: Record<string, string> = {
        ...(existingPlayer?.activeSessions || {}),
      };
      if (activeSessions[finalizedResult.challengeId] === cleanSessionId) {
        delete activeSessions[finalizedResult.challengeId];
      }
      const prevResultIds = existingPlayer?.resultIds || [];
      const nextResultIds = [
        cleanResultId,
        ...prevResultIds.filter((id) => id !== cleanResultId),
      ].slice(0, 100);

      const updatedPlayer: ArenaPlayerRecord = {
        playerId: cleanPlayerId,
        ownerAnonUid: existingPlayer?.ownerAnonUid || cleanAnonUid,
        displayName: finalizedResult.playerName,
        activeSessions,
        resultIds: nextResultIds,
        updatedAt: now,
      };
      tx.set(playerRef, updatedPlayer);
      addCommitProofToTransaction(tx, db, playerDocKey);

      return finalizedResult;
    });
  }

  public async saveResult(
    result: SimulationResult,
    challengeDescription: string
  ): Promise<SimulationResult> {
    const existingSession = await this.getSession(result.sessionId);
    const stubSession: ChallengeSessionServer = existingSession || {
      id: sanitizeFirestoreId(result.sessionId),
      playerId: sanitizeFirestoreId(result.playerId),
      ownerAnonUid: sanitizeFirestoreId(
        result.ownerAnonUid || `anon_${sanitizeFirestoreId(result.playerId)}`
      ),
      playerName: result.playerName,
      challengeId: result.challengeId,
      challengeVersion: result.challengeVersion || 1,
      isDaily: Boolean(result.isDaily),
      dailyDateKey: result.dailyDateKey,
      status: 'completed',
      currentDecisionIndex: result.decisionHistory?.length || 5,
      state: result.finalState || {},
      dimensionScores: {},
      decisionHistory: result.decisionHistory || [],
      resultId: result.id,
      startedAt: result.completedAt,
      updatedAt: result.completedAt,
    };

    return this.completeSessionAndSaveResult({
      session: stubSession,
      result,
      challengeDescription,
    });
  }

  public async getResult(resultId: string): Promise<SimulationResult | undefined> {
    const cleanId = sanitizeFirestoreId(resultId);
    const resultDocKey = toServerDocKey('result', cleanId);
    const storeDb = await this.getDb();
    if (storeDb.type === 'admin') {
      const snap = await storeDb.db.collection('arenaResults').doc(resultDocKey).get();
      if (!snap.exists) return undefined;
      return snap.data() as SimulationResult;
    }
    const snap = await getDoc(doc(storeDb.db, 'arenaResults', resultDocKey));
    if (!snap.exists()) return undefined;
    return snap.data() as SimulationResult;
  }

  public async getResultsByPlayer(playerId: string): Promise<SimulationResult[]> {
    const cleanPlayerId = sanitizeFirestoreId(playerId);
    const playerDocKey = toServerDocKey('player', cleanPlayerId);
    const storeDb = await this.getDb();

    if (storeDb.type === 'admin') {
      const db = storeDb.db;
      const playerSnap = await db.collection('arenaPlayers').doc(playerDocKey).get();
      if (!playerSnap.exists) return [];

      const player = playerSnap.data() as ArenaPlayerRecord;
      const resultIds = player.resultIds || [];
      if (resultIds.length === 0) return [];

      const snaps = await Promise.all(
        resultIds
          .slice(0, 50)
          .map((id) => db.collection('arenaResults').doc(toServerDocKey('result', id)).get())
      );

      const results: SimulationResult[] = [];
      for (const s of snaps) {
        if (s.exists) {
          const r = s.data() as SimulationResult;
          if (r.playerId === cleanPlayerId) {
            results.push(r);
          }
        }
      }
      return results.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    }

    const db = storeDb.db;
    const playerSnap = await getDoc(doc(db, 'arenaPlayers', playerDocKey));
    if (!playerSnap.exists()) return [];

    const player = playerSnap.data() as ArenaPlayerRecord;
    const resultIds = player.resultIds || [];
    if (resultIds.length === 0) return [];

    const snaps = await Promise.all(
      resultIds
        .slice(0, 50)
        .map((id) => getDoc(doc(db, 'arenaResults', toServerDocKey('result', id))))
    );

    const results: SimulationResult[] = [];
    for (const s of snaps) {
      if (s.exists()) {
        const r = s.data() as SimulationResult;
        if (r.playerId === cleanPlayerId) {
          results.push(r);
        }
      }
    }

    return results.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }

  public async getRecentResults(limitCount = 8): Promise<
    Array<{
      id: string;
      playerName: string;
      challengeId: string;
      challengeTitle: string;
      score: number;
      tier: string;
      archetype: string;
      shareToken: string;
      completedAt: string;
    }>
  > {
    const entries = await this.getLeaderboard(undefined, Math.max(limitCount * 3, 24));
    return entries
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, limitCount)
      .map((entry) => ({
        id: entry.id,
        playerName: entry.displayName,
        challengeId: entry.challengeId,
        challengeTitle: entry.challengeTitle,
        score: entry.score,
        tier: entry.tier,
        archetype: entry.archetype,
        shareToken: entry.shareToken || '',
        completedAt: entry.completedAt,
      }));
  }

  public async updatePlayerDisplayName(
    playerId: string,
    newName: string
  ): Promise<void> {
    const cleanPlayerId = sanitizeFirestoreId(playerId);
    const playerDocKey = toServerDocKey('player', cleanPlayerId);
    const clean = newName.trim().slice(0, 40) || 'Anonymous Player';
    const now = new Date().toISOString();

    const storeDb = await this.getDb();
    if (storeDb.type === 'admin') {
      const db = storeDb.db;
      const playerRef = db.collection('arenaPlayers').doc(playerDocKey);
      const playerSnap = await playerRef.get();
      if (!playerSnap.exists) return;

      const player = playerSnap.data() as ArenaPlayerRecord;
      const batch = db.batch();

      const updatedPlayer: ArenaPlayerRecord = {
        ...player,
        displayName: clean,
        updatedAt: now,
      };
      batch.set(playerRef, updatedPlayer);
      const playerProof = makeCommitProof(playerDocKey);
      batch.set(db.collection('serverCommits').doc(playerProof.commitId), playerProof);

      for (const sessionId of Object.values(player.activeSessions || {})) {
        const sessionDocKey = toServerDocKey('session', sessionId);
        const sRef = db.collection('arenaSessions').doc(sessionDocKey);
        const sSnap = await sRef.get();
        if (sSnap.exists) {
          const sData = sSnap.data() as ChallengeSessionServer;
          batch.set(
            sRef,
            stripUndefined({
              ...sData,
              playerName: clean,
              updatedAt: now,
            })
          );
          const sProof = makeCommitProof(sessionDocKey);
          batch.set(db.collection('serverCommits').doc(sProof.commitId), sProof);
        }
      }

      const updatedLbIds = new Set<string>();
      for (const resId of (player.resultIds || []).slice(0, 20)) {
        const resultDocKey = toServerDocKey('result', resId);
        const rRef = db.collection('arenaResults').doc(resultDocKey);
        const rSnap = await rRef.get();
        if (rSnap.exists) {
          const rData = rSnap.data() as SimulationResult;
          batch.set(
            rRef,
            stripUndefined({
              ...rData,
              playerName: clean,
            })
          );
          const rProof = makeCommitProof(resultDocKey);
          batch.set(db.collection('serverCommits').doc(rProof.commitId), rProof);

          const lbId = toLeaderboardEntryId(cleanPlayerId, rData.challengeId);
          if (!updatedLbIds.has(lbId)) {
            updatedLbIds.add(lbId);
            const lbRef = db.collection('leaderboards').doc(lbId);
            const lbSnap = await lbRef.get();
            if (lbSnap.exists) {
              const lbData = sanitizePublicLeaderboardRecord(
                lbSnap.data() as Record<string, unknown>
              );
              batch.set(
                lbRef,
                stripUndefined({
                  ...lbData,
                  displayName: clean,
                })
              );
              const lbProof = makeCommitProof(lbId);
              batch.set(db.collection('serverCommits').doc(lbProof.commitId), lbProof);
            }
          }

          if (rData.shareToken) {
            const fcRef = db.collection('friendChallenges').doc(rData.shareToken);
            const fcSnap = await fcRef.get();
            if (fcSnap.exists) {
              const fcData = sanitizePublicFriendInvite(
                fcSnap.data() as Record<string, unknown>
              );
              batch.set(
                fcRef,
                stripUndefined({
                  ...fcData,
                  challengerName: clean,
                  updatedAt: now,
                })
              );
              const fcProof = makeCommitProof(rData.shareToken);
              batch.set(db.collection('serverCommits').doc(fcProof.commitId), fcProof);
            }
          }
        }
      }

      await batch.commit();
      return;
    }

    const db = storeDb.db;
    const playerRef = doc(db, 'arenaPlayers', playerDocKey);
    const playerSnap = await getDoc(playerRef);
    if (!playerSnap.exists()) return;

    const player = playerSnap.data() as ArenaPlayerRecord;
    const batch = writeBatch(db);

    const updatedPlayer: ArenaPlayerRecord = {
      ...player,
      displayName: clean,
      updatedAt: now,
    };
    batch.set(playerRef, updatedPlayer);
    const playerProof = makeCommitProof(playerDocKey);
    batch.set(doc(db, 'serverCommits', playerProof.commitId), playerProof);

    for (const sessionId of Object.values(player.activeSessions || {})) {
      const sessionDocKey = toServerDocKey('session', sessionId);
      const sRef = doc(db, 'arenaSessions', sessionDocKey);
      const sSnap = await getDoc(sRef);
      if (sSnap.exists()) {
        const sData = sSnap.data() as ChallengeSessionServer;
        batch.set(
          sRef,
          stripUndefined({
            ...sData,
            playerName: clean,
            updatedAt: now,
          })
        );
        const sProof = makeCommitProof(sessionDocKey);
        batch.set(doc(db, 'serverCommits', sProof.commitId), sProof);
      }
    }

    const updatedLbIds = new Set<string>();
    for (const resId of (player.resultIds || []).slice(0, 20)) {
      const resultDocKey = toServerDocKey('result', resId);
      const rRef = doc(db, 'arenaResults', resultDocKey);
      const rSnap = await getDoc(rRef);
      if (rSnap.exists()) {
        const rData = rSnap.data() as SimulationResult;
        batch.set(
          rRef,
          stripUndefined({
            ...rData,
            playerName: clean,
          })
        );
        const rProof = makeCommitProof(resultDocKey);
        batch.set(doc(db, 'serverCommits', rProof.commitId), rProof);

        const lbId = toLeaderboardEntryId(cleanPlayerId, rData.challengeId);
        if (!updatedLbIds.has(lbId)) {
          updatedLbIds.add(lbId);
          const lbRef = doc(db, 'leaderboards', lbId);
          const lbSnap = await getDoc(lbRef);
          if (lbSnap.exists()) {
            const lbData = sanitizePublicLeaderboardRecord(
              lbSnap.data() as Record<string, unknown>
            );
            batch.set(
              lbRef,
              stripUndefined({
                ...lbData,
                displayName: clean,
              })
            );
            const lbProof = makeCommitProof(lbId);
            batch.set(doc(db, 'serverCommits', lbProof.commitId), lbProof);
          }
        }

        if (rData.shareToken) {
          const fcRef = doc(db, 'friendChallenges', rData.shareToken);
          const fcSnap = await getDoc(fcRef);
          if (fcSnap.exists()) {
            const fcData = sanitizePublicFriendInvite(
              fcSnap.data() as Record<string, unknown>
            );
            batch.set(
              fcRef,
              stripUndefined({
                ...fcData,
                challengerName: clean,
                updatedAt: now,
              })
            );
            const fcProof = makeCommitProof(rData.shareToken);
            batch.set(doc(db, 'serverCommits', fcProof.commitId), fcProof);
          }
        }
      }
    }

    await batch.commit();
  }

  public async getFriendChallenge(
    shareToken: string
  ): Promise<FriendChallengeInvite | undefined> {
    const cleanToken = sanitizeFirestoreId(shareToken);
    const storeDb = await this.getDb();
    if (storeDb.type === 'admin') {
      const snap = await storeDb.db.collection('friendChallenges').doc(cleanToken).get();
      if (!snap.exists) return undefined;
      return sanitizePublicFriendInvite(snap.data() as Record<string, unknown>);
    }
    const snap = await getDoc(doc(storeDb.db, 'friendChallenges', cleanToken));
    if (!snap.exists()) return undefined;
    return sanitizePublicFriendInvite(snap.data() as Record<string, unknown>);
  }

  public async mintFriendChallengeInvite(
    resultId: string,
    newShareToken: string,
    challengeDescription: string
  ): Promise<FriendChallengeInvite | undefined> {
    const result = await this.getResult(resultId);
    if (!result) return undefined;

    const cleanToken = sanitizeFirestoreId(newShareToken);
    const now = new Date().toISOString();
    const invite: FriendChallengeInvite = stripUndefined({
      shareToken: cleanToken,
      challengeId: result.challengeId,
      challengeTitle: result.challengeTitle.slice(0, 120),
      challengeCategory: result.challengeCategory.slice(0, 80),
      challengeDescription: (challengeDescription || result.summaryCommentary)
        .trim()
        .slice(0, 500),
      challengerName: result.playerName,
      score: result.score,
      tier: result.tier,
      archetype: result.archetype,
      dimensions: result.dimensions.map((d) => ({ ...d })),
      createdAt: now,
      updatedAt: now,
      attemptsCount: 0,
      beatenCount: 0,
    });

    const storeDb = await this.getDb();
    if (storeDb.type === 'admin') {
      await storeDb.db.runTransaction(async (tx) => {
        tx.set(storeDb.db.collection('friendChallenges').doc(cleanToken), invite);
        const proof = makeCommitProof(cleanToken);
        tx.set(storeDb.db.collection('serverCommits').doc(proof.commitId), proof);
      });
      return invite;
    }

    const db = storeDb.db;
    await runTransaction(db, async (tx) => {
      tx.set(doc(db, 'friendChallenges', cleanToken), invite);
      addCommitProofToTransaction(tx, db, cleanToken);
    });

    return invite;
  }

  public async recordFriendChallengeAttempt(
    shareToken: string,
    beaten: boolean
  ): Promise<FriendChallengeInvite | undefined> {
    const cleanToken = sanitizeFirestoreId(shareToken);
    const storeDb = await this.getDb();

    if (storeDb.type === 'admin') {
      return storeDb.db.runTransaction(async (tx) => {
        const ref = storeDb.db.collection('friendChallenges').doc(cleanToken);
        const snap = await tx.get(ref);
        if (!snap.exists) return undefined;

        const invite = sanitizePublicFriendInvite(
          snap.data() as Record<string, unknown>
        );
        const now = new Date().toISOString();
        const updated: FriendChallengeInvite = stripUndefined({
          ...invite,
          dimensions: invite.dimensions || [],
          attemptsCount: (invite.attemptsCount || 0) + 1,
          beatenCount: (invite.beatenCount || 0) + (beaten ? 1 : 0),
          updatedAt: now,
        });

        tx.set(ref, updated);
        const proof = makeCommitProof(cleanToken);
        tx.set(storeDb.db.collection('serverCommits').doc(proof.commitId), proof);
        return updated;
      });
    }

    const db = storeDb.db;
    return runTransaction(db, async (tx) => {
      const ref = doc(db, 'friendChallenges', cleanToken);
      const snap = await tx.get(ref);
      if (!snap.exists()) return undefined;

      const invite = sanitizePublicFriendInvite(
        snap.data() as Record<string, unknown>
      );
      const now = new Date().toISOString();
      const updated: FriendChallengeInvite = stripUndefined({
        ...invite,
        dimensions: invite.dimensions || [],
        attemptsCount: (invite.attemptsCount || 0) + 1,
        beatenCount: (invite.beatenCount || 0) + (beaten ? 1 : 0),
        updatedAt: now,
      });

      tx.set(ref, updated);
      addCommitProofToTransaction(tx, db, cleanToken);
      return updated;
    });
  }

  public async getLeaderboard(
    challengeId?: string,
    limitCount = 50
  ): Promise<LeaderboardRecord[]> {
    const storeDb = await this.getDb();

    if (storeDb.type === 'admin') {
      const snap = await storeDb.db
        .collection('leaderboards')
        .where('score', '>=', 0)
        .where('score', '<=', 100)
        .orderBy('score', 'desc')
        .limit(200)
        .get();

      const allEntries = snap.docs.map((d) =>
        sanitizePublicLeaderboardRecord(d.data() as Record<string, unknown>)
      );

      const filtered = challengeId
        ? allEntries.filter((e) => e.challengeId === challengeId)
        : allEntries;

      return filtered
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.completedAt.localeCompare(b.completedAt);
        })
        .slice(0, limitCount);
    }

    const db = storeDb.db;
    const q = query(
      collection(db, 'leaderboards'),
      where('score', '>=', 0),
      where('score', '<=', 100),
      orderBy('score', 'desc'),
      firestoreLimit(200)
    );
    const snap = await getDocs(q);
    const allEntries = snap.docs.map((d) =>
      sanitizePublicLeaderboardRecord(d.data() as Record<string, unknown>)
    );

    const filtered = challengeId
      ? allEntries.filter((e) => e.challengeId === challengeId)
      : allEntries;

    return filtered
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.completedAt.localeCompare(b.completedAt);
      })
      .slice(0, limitCount);
  }

  public async getDailyStats(
    dateKey: string,
    _challengeId?: string
  ): Promise<{
    totalRuns: number;
    hasSufficientData: boolean;
    averageScore: number | null;
    topScore: number | null;
  }> {
    const cleanDateKey = sanitizeFirestoreId(dateKey);
    const storeDb = await this.getDb();

    if (storeDb.type === 'admin') {
      const snap = await storeDb.db.collection('dailyStats').doc(cleanDateKey).get();
      if (!snap.exists) {
        return { totalRuns: 0, hasSufficientData: false, averageScore: null, topScore: null };
      }
      const data = snap.data() as DailyStatRecord;
      const totalRuns = data.totalRuns || 0;
      if (totalRuns < 3) {
        return {
          totalRuns,
          hasSufficientData: false,
          averageScore: null,
          topScore: totalRuns > 0 ? data.topScore : null,
        };
      }
      return {
        totalRuns,
        hasSufficientData: true,
        averageScore: Math.round(data.sumScore / totalRuns),
        topScore: data.topScore,
      };
    }

    const db = storeDb.db;
    const snap = await getDoc(doc(db, 'dailyStats', cleanDateKey));
    if (!snap.exists()) {
      return {
        totalRuns: 0,
        hasSufficientData: false,
        averageScore: null,
        topScore: null,
      };
    }

    const data = snap.data() as DailyStatRecord;
    const totalRuns = data.totalRuns || 0;
    if (totalRuns < 3) {
      return {
        totalRuns,
        hasSufficientData: false,
        averageScore: null,
        topScore: totalRuns > 0 ? data.topScore : null,
      };
    }

    return {
      totalRuns,
      hasSufficientData: true,
      averageScore: Math.round(data.sumScore / totalRuns),
      topScore: data.topScore,
    };
  }

  public async recordAnalyticsEvent(event: AnalyticsRecord): Promise<void> {
    const cleanId = sanitizeFirestoreId(event.id);
    const cleanPlayerId = sanitizeFirestoreId(event.playerId || 'anon');
    const now = event.timestamp || new Date().toISOString();

    const record: AnalyticsRecord = stripUndefined({
      id: cleanId,
      eventType: event.eventType.slice(0, 64),
      playerId: cleanPlayerId,
      challengeId: event.challengeId
        ? sanitizeFirestoreId(event.challengeId)
        : undefined,
      sessionId: event.sessionId
        ? sanitizeFirestoreId(event.sessionId)
        : undefined,
      shareToken: event.shareToken
        ? sanitizeFirestoreId(event.shareToken)
        : undefined,
      metadata: event.metadata,
      timestamp: now,
    });

    const storeDb = await this.getDb();
    if (storeDb.type === 'admin') {
      const db = storeDb.db;
      const batch = db.batch();
      batch.set(db.collection('analytics').doc(cleanId), record);
      const proof = makeCommitProof(cleanId);
      batch.set(db.collection('serverCommits').doc(proof.commitId), proof);
      await batch.commit();
      return;
    }

    const db = storeDb.db;
    const batch = writeBatch(db);
    batch.set(doc(db, 'analytics', cleanId), record);
    const proof = makeCommitProof(cleanId);
    batch.set(doc(db, 'serverCommits', proof.commitId), proof);
    await batch.commit();
  }
}

export const arenaStore = new ArenaStore();
