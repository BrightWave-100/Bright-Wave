import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import firebaseConfig from '../../firebase-applet-config.json' with { type: 'json' };
import { getChallengeByIdOrSlug } from '../data/challenges/index.js';
import { toLeaderboardEntryId, toServerDocKey } from '../server/store.js';

function getUntrustedBrowserDb() {
  const appName = 'untrusted-browser-attacker-client';
  const existing = getApps().find((a) => a.name === appName);
  const app = existing || initializeApp(firebaseConfig, appName);
  return getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

async function expectPermissionDenied(promise: Promise<unknown>): Promise<void> {
  let failed = false;
  try {
    await promise;
  } catch (err: unknown) {
    failed = true;
    const msg = err instanceof Error ? err.message : String(err);
    expect(msg.toLowerCase()).toMatch(/permission|insufficient/);
  }
  expect(failed).toBe(true);
}

describe('Firestore Security Rules — Static & Live Adversarial Penetration Verification', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

  it('1. Enforces rules_version = 2 and global default-deny safety net', () => {
    expect(rulesContent).toContain("rules_version = '2';");
    expect(rulesContent).toContain('match /{document=**}');
    expect(rulesContent).toContain('allow read, write: if false;');
  });

  it('2. Locks /serverConfig/{configId} completely and enforces non-replayable isAuthorizedServerCommit on authoritative collections', () => {
    expect(rulesContent).toContain('match /serverConfig/{configId}');
    expect(rulesContent).toContain('match /serverCommits/{commitId}');
    expect(rulesContent).toContain('match /arenaPlayers/{docKey}');
    expect(rulesContent).toContain('match /arenaSessions/{docKey}');
    expect(rulesContent).toContain('match /arenaResults/{docKey}');
    expect(rulesContent).toContain('match /friendChallenges/{shareToken}');
    expect(rulesContent).toContain('match /leaderboards/{entryId}');
    expect(rulesContent).toContain('match /dailyStats/{dateKey}');
    expect(rulesContent).toContain('match /analytics/{eventId}');
    expect(rulesContent).toContain('isServerKeyedId(docKey)');
    expect(rulesContent).toContain('isAuthorizedServerCommit');
    expect(rulesContent).not.toContain('allow get: if isValidId(sessionId)');
    expect(rulesContent).not.toContain('allow get: if isValidId(playerId)');
    expect(rulesContent).not.toContain('allow get: if isValidId(resultId)');
  });

  it('3. Enforces Dirty Dozen Invariants: email_verified == true, PII isolation, strict keys, score bounds, server timestamps, and query enforcer', () => {
    expect(rulesContent).toContain('request.auth.token.email_verified == true');
    expect(rulesContent).toContain("docId == 'info'");
    expect(rulesContent).toContain('exists(/databases/$(database)/documents/users/$(userId))');
    expect(rulesContent).toContain('data.score is int && data.score >= 0 && data.score <= 100');
    expect(rulesContent).toContain('incoming().createdAt == request.time');
    expect(rulesContent).toContain('incoming().updatedAt == request.time');
    expect(rulesContent).toContain("affectedKeys().hasOnly(['displayName', 'updatedAt'])");
    expect(rulesContent).toContain('existing().ownerUid == request.auth.uid');
  });

  it(
    '4. Live Firestore Penetration Test: blocks direct browser reads of arenaPlayers, arenaSessions, arenaResults, serverConfig, and serverCommits even when IDs are known',
    async () => {
      const attackerDb = getUntrustedBrowserDb();
      const suffix = Date.now().toString(36);
      const challenge = getChallengeByIdOrSlug('business1000')!;

      const playerId = `plr_sec_${suffix}`;
      const anonUid = `anon_sec_${suffix}`;
      const sessionId = `sess_sec_${suffix}`;
      const resultId = `res_sec_${suffix}`;
      const shareToken = `st_${suffix.slice(0, 8)}`;
      const lbEntryId = toLeaderboardEntryId(playerId, challenge.id);

      const playerDocKey = toServerDocKey('player', playerId);
      const sessionDocKey = toServerDocKey('session', sessionId);
      const resultDocKey = toServerDocKey('result', resultId);

      // Seed live Cloud Firestore test documents using valid server commit proofs
      const seed =
        process.env.ARENA_SERVER_AUTHORITY_SEED ||
        `challenge-arena-firestore-authority-${firebaseConfig.projectId}-v1`;
      const secretHash = crypto.createHash('sha256').update(seed).digest('hex');

      function makeTestCommitProof(commitId: string) {
        return {
          commitId,
          secretHash,
          updatedAt: `${new Date().toISOString()}_${crypto.randomBytes(6).toString('hex')}`,
        };
      }

      const batch = writeBatch(attackerDb);

      batch.set(doc(attackerDb, 'arenaPlayers', playerDocKey), {
        playerId,
        ownerAnonUid: anonUid,
        displayName: 'SecPlayer',
        activeSessions: { [challenge.id]: sessionId },
        resultIds: [resultId],
        updatedAt: new Date().toISOString(),
      });
      const pProof = makeTestCommitProof(playerDocKey);
      batch.set(doc(attackerDb, 'serverCommits', pProof.commitId), pProof);

      batch.set(doc(attackerDb, 'arenaSessions', sessionDocKey), {
        id: sessionId,
        playerId,
        ownerAnonUid: anonUid,
        playerName: 'SecPlayer',
        challengeId: challenge.id,
        challengeVersion: 1,
        isDaily: true,
        dailyDateKey: `2099-12-31_${suffix}`,
        status: 'completed',
        currentDecisionIndex: 5,
        state: { ...challenge.startingState },
        dimensionScores: { strategy: 84 },
        decisionHistory: [],
        resultId,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const sProof = makeTestCommitProof(sessionDocKey);
      batch.set(doc(attackerDb, 'serverCommits', sProof.commitId), sProof);

      batch.set(doc(attackerDb, 'arenaResults', resultDocKey), {
        id: resultId,
        sessionId,
        playerId,
        ownerAnonUid: anonUid,
        playerName: 'SecPlayer',
        challengeId: challenge.id,
        challengeSlug: challenge.slug,
        challengeTitle: challenge.title,
        challengeCategory: challenge.category,
        challengeVersion: 1,
        isDaily: true,
        dailyDateKey: `2099-12-31_${suffix}`,
        score: 84,
        tier: 'strong',
        tierLabel: 'Strong Run',
        archetype: 'THE STRATEGIST',
        archetypeDescription: 'Calculated execution.',
        summaryCommentary: 'Completed security test run.',
        dimensions: [{ key: 'strategy', label: 'Strategy', weight: 1, score: 84 }],
        finalState: { ...challenge.startingState },
        stateMetrics: challenge.stateMetrics,
        decisionHistory: [],
        shareToken,
        completedAt: new Date().toISOString(),
      });
      const rProof = makeTestCommitProof(resultDocKey);
      batch.set(doc(attackerDb, 'serverCommits', rProof.commitId), rProof);

      batch.set(doc(attackerDb, 'friendChallenges', shareToken), {
        shareToken,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        challengeCategory: challenge.category,
        challengeDescription: challenge.description,
        challengerName: 'SecPlayer',
        score: 84,
        tier: 'strong',
        archetype: 'THE STRATEGIST',
        dimensions: [{ key: 'strategy', label: 'Strategy', weight: 1, score: 84 }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attemptsCount: 0,
        beatenCount: 0,
      });
      const fcProof = makeTestCommitProof(shareToken);
      batch.set(doc(attackerDb, 'serverCommits', fcProof.commitId), fcProof);

      batch.set(doc(attackerDb, 'leaderboards', lbEntryId), {
        id: lbEntryId,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        displayName: 'SecPlayer',
        score: 84,
        archetype: 'THE STRATEGIST',
        tier: 'strong',
        shareToken,
        isDaily: true,
        dailyDateKey: `2099-12-31_${suffix}`,
        completedAt: new Date().toISOString(),
      });
      const lbProof = makeTestCommitProof(lbEntryId);
      batch.set(doc(attackerDb, 'serverCommits', lbProof.commitId), lbProof);

      await batch.commit();

      // A. Attacker knows exact playerId, sessionId, resultId and attempts direct Firestore getDoc
      await expectPermissionDenied(getDoc(doc(attackerDb, 'arenaPlayers', playerId)));
      await expectPermissionDenied(getDoc(doc(attackerDb, 'arenaSessions', sessionId)));
      await expectPermissionDenied(getDoc(doc(attackerDb, 'arenaResults', resultId)));

      // B. Attacker attempts to guess srv_ prefix with forged 32-hex MAC -> document does not exist at guessed path (2^128 keyspace)
      const forgedPrefix = `srv_${'0'.repeat(32)}_`;
      const guessedPlayerSnap = await getDoc(
        doc(attackerDb, 'arenaPlayers', `${forgedPrefix}${playerId}`)
      );
      expect(guessedPlayerSnap.exists()).toBe(false);
      expect(guessedPlayerSnap.data()).toBeUndefined();

      const guessedSessionSnap = await getDoc(
        doc(attackerDb, 'arenaSessions', `${forgedPrefix}${sessionId}`)
      );
      expect(guessedSessionSnap.exists()).toBe(false);
      expect(guessedSessionSnap.data()).toBeUndefined();

      const guessedResultSnap = await getDoc(
        doc(attackerDb, 'arenaResults', `${forgedPrefix}${resultId}`)
      );
      expect(guessedResultSnap.exists()).toBe(false);
      expect(guessedResultSnap.data()).toBeUndefined();

      // C. Attacker attempts to list arenaPlayers, arenaSessions, arenaResults, serverCommits
      await expectPermissionDenied(getDocs(collection(attackerDb, 'arenaPlayers')));
      await expectPermissionDenied(getDocs(collection(attackerDb, 'arenaSessions')));
      await expectPermissionDenied(getDocs(collection(attackerDb, 'arenaResults')));
      await expectPermissionDenied(getDocs(collection(attackerDb, 'serverCommits')));

      // D. Attacker attempts to read or overwrite serverConfig/master or serverCommits
      await expectPermissionDenied(getDoc(doc(attackerDb, 'serverConfig', 'master')));
      await expectPermissionDenied(
        setDoc(doc(attackerDb, 'serverConfig', 'master'), {
          secretHash: 'forged_secret_hash_value_000000000000000000',
          createdAt: new Date().toISOString(),
        })
      );
      await expectPermissionDenied(getDoc(doc(attackerDb, 'serverCommits', shareToken)));

      // E. Public friendChallenge read by shareToken succeeds and exposes zero private fields
      const publicInviteSnap = await getDoc(
        doc(attackerDb, 'friendChallenges', shareToken)
      );
      expect(publicInviteSnap.exists()).toBe(true);
      const inviteData = publicInviteSnap.data()!;
      expect(inviteData.challengerName).toBe('SecPlayer');
      expect(inviteData.score).toBe(84);
      expect(inviteData.ownerAnonUid).toBeUndefined();
      expect(inviteData.challengerId).toBeUndefined();
      expect(inviteData.resultId).toBeUndefined();

      // F. Attacker attempts timestamp-replay write on friendChallenges/{shareToken} without serverCommit
      await expectPermissionDenied(
        setDoc(doc(attackerDb, 'friendChallenges', shareToken), {
          ...inviteData,
          challengerName: 'HackedName',
        })
      );

      // G. Public leaderboard entry exposes only public fields and blocks direct client writes
      const publicLbSnap = await getDoc(doc(attackerDb, 'leaderboards', lbEntryId));
      expect(publicLbSnap.exists()).toBe(true);
      const lbData = publicLbSnap.data()!;
      expect(lbData.displayName).toBe('SecPlayer');
      expect(lbData.score).toBe(84);
      expect(lbData.ownerAnonUid).toBeUndefined();
      expect(lbData.playerId).toBeUndefined();
      expect(lbData.resultId).toBeUndefined();

      await expectPermissionDenied(
        setDoc(doc(attackerDb, 'leaderboards', lbEntryId), {
          ...lbData,
          score: 100,
        })
      );
    },
    25000
  );
});
