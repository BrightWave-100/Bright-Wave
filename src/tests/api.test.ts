import { describe, expect, it, beforeAll } from 'vitest';
import request, { Response as SupertestResponse } from 'supertest';
import { Express } from 'express';
import { createApp } from '../../server.js';
import { generateChallengeShareLink } from '../lib/share.js';
import { ArenaStore, setAdminDbForTesting } from '../server/store.js';
import { createInMemoryAdminDb } from '../server/test-admin-db.js';
import { getChallengeByIdOrSlug } from '../data/challenges/index.js';
import { createInitialSession, generateId, generateShareToken } from '../engine/engine.js';

function extractCookieHeader(res: SupertestResponse): string {
  const raw = res.headers['set-cookie'];
  if (!raw) return '';
  const first = Array.isArray(raw) ? raw[0] : String(raw);
  return first.split(';')[0] || '';
}

describe('Challenge Arena — End-to-End Firestore Persistence, Ownership & Viral Loop Tests', () => {
  let app: Express;
  const runSuffix = Date.now().toString(36);

  beforeAll(async () => {
    process.env.VITEST = 'true';
    process.env.ARENA_SERVER_AUTHORITY_SEED = 'vitest-authority-seed-for-unit-tests-12345';
    process.env.ARENA_COOKIE_SECRET = 'vitest-cookie-secret-for-unit-tests-12345';
    setAdminDbForTesting(createInMemoryAdminDb());
    app = await createApp();
  });

  it(
    '1. Completes Challenge 1 end-to-end in Firestore, rejects client tampering, creates friend challenge, and allows friend to beat score',
    async () => {
      // 1. Fetch all challenges and verify tagging taxonomy
      const listRes = await request(app).get('/api/challenges');
      expect(listRes.status).toBe(200);
      expect(listRes.body.challenges.length).toBe(10);
      expect(Array.isArray(listRes.body.availableTags)).toBe(true);
      const tagNames = listRes.body.availableTags.map(
        (t: { tag: string }) => t.tag
      );
      expect(tagNames).toContain('Corporate Strategy');
      expect(tagNames).toContain('Survival');
      expect(tagNames).toContain('Ethical Dilemma');

      // Verify filtering by interest tag via query parameter
      const tagFilterRes = await request(app).get(
        '/api/challenges?tag=Corporate%20Strategy'
      );
      expect(tagFilterRes.status).toBe(200);
      expect(tagFilterRes.body.challenges.length).toBeGreaterThanOrEqual(3);
      expect(
        tagFilterRes.body.challenges.every((c: { tags: string[] }) =>
          c.tags.includes('Corporate Strategy')
        )
      ).toBe(true);

      // Verify searching challenges by title or keyword via ?q=
      const searchRes = await request(app).get('/api/challenges?q=runway');
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.challenges.length).toBeGreaterThanOrEqual(1);
      expect(
        searchRes.body.challenges.some(
          (c: { id: string }) => c.id === 'startupcrisis'
        )
      ).toBe(true);

      // 2. Start BUILD A $1,000 BUSINESS for Player A
      const alicePlayerId = `plr_alice_${runSuffix}`;
      const startRes = await request(app)
        .post('/api/sessions/start')
        .send({
          challengeId: 'business1000',
          playerId: alicePlayerId,
          playerName: 'Alice',
          forceNew: true,
        });
      expect(startRes.status).toBe(201);
      const aliceCookie = extractCookieHeader(startRes);
      expect(aliceCookie).toContain('arena_anon_cred=');

      const sessionA = startRes.body.session;
      expect(sessionA.id).toMatch(/^sess_/);
      expect(sessionA.currentDecisionIndex).toBe(0);
      expect(sessionA.state.money).toBe(1000);

      // 3. Anti-Cheat Check: Reject client attempting to submit score: 99
      const cheatRes = await request(app)
        .post(`/api/sessions/${sessionA.id}/decide`)
        .set('Cookie', aliceCookie)
        .send({
          challengeId: 'business1000',
          decisionIndex: 0,
          decisionId: 'b1_d1',
          optionId: 'b1_d1_o2',
          score: 99,
        });
      expect(cheatRes.status).toBe(400);
      expect(cheatRes.body.code).toBe('CLIENT_TAMPERING_REJECTED');

      // 4. Play through all 5 decisions for Player A (choosing moderate options so Friend B can beat it)
      const aliceOptions = [
        { decisionId: 'b1_d1', optionId: 'b1_d1_o2' },
        { decisionId: 'b1_d2', optionId: 'b1_d2_o3' },
        { decisionId: 'b1_d3', optionId: 'b1_d3_o3' },
        { decisionId: 'b1_d4', optionId: 'b1_d4_o3' },
        { decisionId: 'b1_d5', optionId: 'b1_d5_o2' },
      ];

      let aliceFinalResult: {
        id: string;
        score: number;
        archetype: string;
        shareToken: string;
      } | null = null;

      for (let i = 0; i < aliceOptions.length; i++) {
        const stepRes = await request(app)
          .post(`/api/sessions/${sessionA.id}/decide`)
          .set('Cookie', aliceCookie)
          .send({
            challengeId: 'business1000',
            decisionIndex: i,
            decisionId: aliceOptions[i].decisionId,
            optionId: aliceOptions[i].optionId,
          });
        expect(stepRes.status).toBe(200);
        expect(stepRes.body.consequence).toBeDefined();

        if (i === aliceOptions.length - 1) {
          expect(stepRes.body.completed).toBe(true);
          expect(stepRes.body.result).toBeDefined();
          aliceFinalResult = stepRes.body.result;
        }
      }

      expect(aliceFinalResult).not.toBeNull();
      expect(typeof aliceFinalResult!.score).toBe('number');
      expect(aliceFinalResult!.shareToken).toMatch(/^[a-f0-9]{10}$/);

      // Verify share link generator produces canonical URL and invite copy
      const sharePayload = generateChallengeShareLink(
        {
          challengeId: 'business1000',
          challengeTitle: 'BUILD A $1,000 BUSINESS',
          score: aliceFinalResult!.score,
          archetype: aliceFinalResult!.archetype as any,
          shareToken: aliceFinalResult!.shareToken,
        },
        'https://arena.example.com'
      );
      expect(sharePayload.url).toBe(
        `https://arena.example.com/challenge/business1000/beat/${aliceFinalResult!.shareToken}`
      );
      expect(sharePayload.text).toContain(sharePayload.url);

      // Verify POST /api/friend-challenges can mint a fresh unique shareToken for owner
      const mintRes = await request(app)
        .post('/api/friend-challenges')
        .set('Cookie', aliceCookie)
        .send({ resultId: aliceFinalResult!.id });
      expect(mintRes.status).toBe(201);
      expect(mintRes.body.invite.shareToken).toMatch(/^[a-f0-9]{10}$/);
      expect(mintRes.body.invite.shareToken).not.toBe(
        aliceFinalResult!.shareToken
      );

      // 5. Friend opens the share link (/api/friend-challenges/:shareToken) publicly without Alice's cookie
      const inviteRes = await request(app).get(
        `/api/friend-challenges/${aliceFinalResult!.shareToken}`
      );
      expect(inviteRes.status).toBe(200);
      expect(inviteRes.body.invite.challengerName).toBe('Alice');
      expect(inviteRes.body.invite.score).toBe(aliceFinalResult!.score);
      expect(Array.isArray(inviteRes.body.invite.dimensions)).toBe(true);

      // 6. Friend (Bob) starts the same challenge with friendShareToken
      const bobPlayerId = `plr_bob_${runSuffix}`;
      const bobStartRes = await request(app)
        .post('/api/sessions/start')
        .send({
          challengeId: 'business1000',
          playerId: bobPlayerId,
          playerName: 'Bob',
          friendShareToken: aliceFinalResult!.shareToken,
          forceNew: true,
        });
      expect(bobStartRes.status).toBe(201);
      const bobCookie = extractCookieHeader(bobStartRes);
      const sessionB = bobStartRes.body.session;

      // 7. Bob selects optimal choices across all 5 decisions to beat Alice's score
      const bobOptions = [
        { decisionId: 'b1_d1', optionId: 'b1_d1_o1' },
        { decisionId: 'b1_d2', optionId: 'b1_d2_o1' },
        { decisionId: 'b1_d3', optionId: 'b1_d3_o1' },
        { decisionId: 'b1_d4', optionId: 'b1_d4_o1' },
        { decisionId: 'b1_d5', optionId: 'b1_d5_o3' },
      ];

      let bobFinalResult: {
        id: string;
        score: number;
        friendTargetBeaten?: { beaten: boolean; challengerScore: number };
      } | null = null;

      for (let i = 0; i < bobOptions.length; i++) {
        const stepRes = await request(app)
          .post(`/api/sessions/${sessionB.id}/decide`)
          .set('Cookie', bobCookie)
          .send({
            challengeId: 'business1000',
            decisionIndex: i,
            decisionId: bobOptions[i].decisionId,
            optionId: bobOptions[i].optionId,
          });
        expect(stepRes.status).toBe(200);
        if (i === bobOptions.length - 1) {
          bobFinalResult = stepRes.body.result;
        }
      }

      expect(bobFinalResult).not.toBeNull();
      expect(bobFinalResult!.score).toBeGreaterThan(aliceFinalResult!.score);
      expect(bobFinalResult!.friendTargetBeaten?.beaten).toBe(true);
      expect((aliceFinalResult as any).ownerAnonUid).toBeUndefined();
      expect((bobFinalResult as any).ownerAnonUid).toBeUndefined();

      // Verify Bob cannot directly read Alice's private result endpoint
      const bobReadAliceResult = await request(app)
        .get(`/api/results/${aliceFinalResult!.id}`)
        .set('Cookie', bobCookie);
      expect(bobReadAliceResult.status).toBe(403);
      expect(bobReadAliceResult.body.code).toBe('SESSION_OWNERSHIP_FORBIDDEN');

      // Verify Alice's original result and score remain completely unchanged and independent when read by Alice
      const aliceResultVerify = await request(app)
        .get(`/api/results/${aliceFinalResult!.id}`)
        .set('Cookie', aliceCookie);
      expect(aliceResultVerify.status).toBe(200);
      expect(aliceResultVerify.body.result.score).toBe(aliceFinalResult!.score);
      expect(aliceResultVerify.body.result.id).not.toBe(bobFinalResult!.id);
      expect(aliceResultVerify.body.result.ownerAnonUid).toBeUndefined();

      // 8. Verify Leaderboard contains both Bob and Alice sorted by score and exposes only public fields
      const lbRes = await request(app).get(
        '/api/leaderboards?challengeId=business1000'
      );
      expect(lbRes.status).toBe(200);
      expect(lbRes.body.entries.length).toBeGreaterThanOrEqual(2);
      expect(lbRes.body.entries[0].score).toBeGreaterThanOrEqual(
        lbRes.body.entries[1].score
      );
      expect(lbRes.body.entries[0].playerId).toBeUndefined();
      expect(lbRes.body.entries[0].resultId).toBeUndefined();
      expect(lbRes.body.entries[0].ownerAnonUid).toBeUndefined();
    },
    30000
  );

  it(
    '2. Enforces Game Integrity: rejects tampering with money, customers, resources, decisionIndex, finalResult, leaderboardPosition, old/future/duplicate/invalid IDs',
    async () => {
      const auditorPlayerId = `plr_auditor_${runSuffix}`;
      const startRes = await request(app)
        .post('/api/sessions/start')
        .send({
          challengeId: 'business1000',
          playerId: auditorPlayerId,
          playerName: 'Auditor',
          forceNew: true,
        });
      expect(startRes.status).toBe(201);
      const auditorCookie = extractCookieHeader(startRes);
      const session = startRes.body.session;

      // Tampering attempts on /decide
      const tamperedPayloads = [
        { money: 999999 },
        { customers: 5000 },
        { resources: 1000 },
        { state: { money: 50000 } },
        { score: 100 },
        { finalResult: { score: 100 } },
        { leaderboardPosition: 1 },
      ];

      for (const extraField of tamperedPayloads) {
        const res = await request(app)
          .post(`/api/sessions/${session.id}/decide`)
          .set('Cookie', auditorCookie)
          .send({
            challengeId: 'business1000',
            decisionIndex: 0,
            decisionId: 'b1_d1',
            optionId: 'b1_d1_o1',
            ...extraField,
          });
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('CLIENT_TAMPERING_REJECTED');
      }

      // Future decision ID / index skip attempt
      const futureRes = await request(app)
        .post(`/api/sessions/${session.id}/decide`)
        .set('Cookie', auditorCookie)
        .send({
          challengeId: 'business1000',
          decisionIndex: 3,
          decisionId: 'b1_d4',
          optionId: 'b1_d4_o1',
        });
      expect(futureRes.status).toBe(400);
      expect(futureRes.body.code).toBe('OUT_OF_ORDER_DECISION');

      // Invalid decision ID for current step
      const badDecisionIdRes = await request(app)
        .post(`/api/sessions/${session.id}/decide`)
        .set('Cookie', auditorCookie)
        .send({
          challengeId: 'business1000',
          decisionIndex: 0,
          decisionId: 'non_existent_decision',
          optionId: 'b1_d1_o1',
        });
      expect(badDecisionIdRes.status).toBe(400);
      expect(badDecisionIdRes.body.code).toBe('INVALID_DECISION_ID');

      // Invalid challenge ID for session
      const badChallengeRes = await request(app)
        .post(`/api/sessions/${session.id}/decide`)
        .set('Cookie', auditorCookie)
        .send({
          challengeId: 'survive30days',
          decisionIndex: 0,
          decisionId: 'b1_d1',
          optionId: 'b1_d1_o1',
        });
      expect(badChallengeRes.status).toBe(400);
      expect(badChallengeRes.body.code).toBe('CHALLENGE_MISMATCH');

      // Invalid session ID
      const badSessionRes = await request(app)
        .post('/api/sessions/sess_nonexistent_123/decide')
        .set('Cookie', auditorCookie)
        .send({
          challengeId: 'business1000',
          decisionIndex: 0,
          decisionId: 'b1_d1',
          optionId: 'b1_d1_o1',
        });
      expect(badSessionRes.status).toBe(404);

      // Valid decision 0 -> then test duplicate / old decision submission + refresh resume
      const validStep0 = await request(app)
        .post(`/api/sessions/${session.id}/decide`)
        .set('Cookie', auditorCookie)
        .send({
          challengeId: 'business1000',
          decisionIndex: 0,
          decisionId: 'b1_d1',
          optionId: 'b1_d1_o1',
        });
      expect(validStep0.status).toBe(200);
      expect(validStep0.body.session.currentDecisionIndex).toBe(1);

      // Old / duplicate decision ID submission
      const oldDecisionRes = await request(app)
        .post(`/api/sessions/${session.id}/decide`)
        .set('Cookie', auditorCookie)
        .send({
          challengeId: 'business1000',
          decisionIndex: 0,
          decisionId: 'b1_d1',
          optionId: 'b1_d1_o2',
        });
      expect(oldDecisionRes.status).toBe(400);
      expect(oldDecisionRes.body.code).toBe('DUPLICATE_DECISION');

      // Refresh during gameplay: /api/sessions/start with forceNew: false resumes at index 1
      const resumeRes = await request(app)
        .post('/api/sessions/start')
        .set('Cookie', auditorCookie)
        .send({
          challengeId: 'business1000',
          playerId: auditorPlayerId,
          playerName: 'Auditor',
          forceNew: false,
        });
      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.resumed).toBe(true);
      expect(resumeRes.body.session.id).toBe(session.id);
      expect(resumeRes.body.session.currentDecisionIndex).toBe(1);
    },
    30000
  );

  it(
    '3. Priority 1 & 5: Multi-Instance Cloud Run Session Consistency & Atomic Concurrency in Cloud Firestore',
    async () => {
      // Simulate two distinct Cloud Run instances (appInstanceA and appInstanceB) + two independent ArenaStore instances
      const appInstanceA = await createApp();
      const appInstanceB = await createApp();
      const storeInstanceA = new ArenaStore();
      const storeInstanceB = new ArenaStore();

      const playerId = `plr_multi_inst_${runSuffix}`;

      // Step 1: Cloud Run Instance A starts session and receives Decision 1
      const startRes = await request(appInstanceA)
        .post('/api/sessions/start')
        .send({
          challengeId: 'business1000',
          playerId,
          playerName: 'CloudRunner',
          forceNew: true,
        });
      expect(startRes.status).toBe(201);
      const playerCookie = extractCookieHeader(startRes);
      const sessionId = startRes.body.session.id;

      const dec1Res = await request(appInstanceA)
        .post(`/api/sessions/${sessionId}/decide`)
        .set('Cookie', playerCookie)
        .send({
          challengeId: 'business1000',
          decisionIndex: 0,
          decisionId: 'b1_d1',
          optionId: 'b1_d1_o1',
        });
      expect(dec1Res.status).toBe(200);
      expect(dec1Res.body.session.currentDecisionIndex).toBe(1);

      // Verify independent storeInstanceB reads the persisted session state directly from Cloud Firestore
      const persistedAfterD1 = await storeInstanceB.getSession(sessionId);
      expect(persistedAfterD1).toBeDefined();
      expect(persistedAfterD1!.currentDecisionIndex).toBe(1);
      expect(persistedAfterD1!.decisionHistory.length).toBe(1);

      // Step 2: Cloud Run Instance A disappears; Cloud Run Instance B handles Decision 2 through completion
      const remainingSteps = [
        { index: 1, decisionId: 'b1_d2', optionId: 'b1_d2_o1' },
        { index: 2, decisionId: 'b1_d3', optionId: 'b1_d3_o1' },
        { index: 3, decisionId: 'b1_d4', optionId: 'b1_d4_o1' },
        { index: 4, decisionId: 'b1_d5', optionId: 'b1_d5_o1' },
      ];

      let completedResultId = '';
      let shareToken = '';

      for (const step of remainingSteps) {
        const res = await request(appInstanceB)
          .post(`/api/sessions/${sessionId}/decide`)
          .set('Cookie', playerCookie)
          .send({
            challengeId: 'business1000',
            decisionIndex: step.index,
            decisionId: step.decisionId,
            optionId: step.optionId,
          });
        expect(res.status).toBe(200);
        if (step.index === 4) {
          expect(res.body.completed).toBe(true);
          completedResultId = res.body.result.id;
          shareToken = res.body.result.shareToken;
        }
      }

      // Verify storeInstanceA can read the completed result & invite created by Instance B
      const verifyResult = await storeInstanceA.getResult(completedResultId);
      expect(verifyResult).toBeDefined();
      expect(verifyResult!.id).toBe(completedResultId);

      // Step 3: Test atomic concurrency on FriendChallenge attempt/beaten counters across simultaneous requests
      await Promise.all([
        storeInstanceA.recordFriendChallengeAttempt(shareToken, true),
        storeInstanceB.recordFriendChallengeAttempt(shareToken, false),
        storeInstanceA.recordFriendChallengeAttempt(shareToken, true),
      ]);

      const updatedInvite = await storeInstanceB.getFriendChallenge(shareToken);
      expect(updatedInvite).toBeDefined();
      expect(updatedInvite!.attemptsCount).toBe(3);
      expect(updatedInvite!.beatenCount).toBe(2);
    },
    30000
  );

  it(
    '4. Priority 2 & 5: Enforces Anonymous Session Ownership via HttpOnly signed cookie and blocks cross-player hijacking',
    async () => {
      const victimPlayerId = `plr_victim_${runSuffix}`;
      const attackerPlayerId = `plr_attacker_${runSuffix}`;

      // Victim starts a session
      const victimStart = await request(app)
        .post('/api/sessions/start')
        .send({
          challengeId: 'startupcrisis',
          playerId: victimPlayerId,
          playerName: 'VictimPlayer',
          forceNew: true,
        });
      expect(victimStart.status).toBe(201);

      const rawSetCookie = String(victimStart.headers['set-cookie'] || '');
      expect(rawSetCookie).toContain('arena_anon_cred=');
      expect(rawSetCookie).toContain('HttpOnly');
      expect(rawSetCookie).toContain('Secure');
      expect(rawSetCookie).toContain('SameSite=');

      const victimCookie = extractCookieHeader(victimStart);
      const victimSessionId = victimStart.body.session.id;

      // Attacker obtains their own cookie
      const attackerStart = await request(app)
        .post('/api/sessions/start')
        .send({
          challengeId: 'startupcrisis',
          playerId: attackerPlayerId,
          playerName: 'AttackerPlayer',
          forceNew: true,
        });
      expect(attackerStart.status).toBe(201);
      const attackerCookie = extractCookieHeader(attackerStart);

      // 1. Attacker knows victimPlayerId and tries to resume Victim's session -> 403
      const hijackResume = await request(app)
        .post('/api/sessions/start')
        .set('Cookie', attackerCookie)
        .send({
          challengeId: 'startupcrisis',
          playerId: victimPlayerId,
          playerName: 'Attacker',
          forceNew: false,
        });
      expect(hijackResume.status).toBe(403);
      expect(hijackResume.body.code).toBe('SESSION_OWNERSHIP_FORBIDDEN');

      // 2. Attacker tries to read Victim's private session state -> 403
      const hijackRead = await request(app)
        .get(`/api/sessions/${victimSessionId}`)
        .set('Cookie', attackerCookie);
      expect(hijackRead.status).toBe(403);
      expect(hijackRead.body.code).toBe('SESSION_OWNERSHIP_FORBIDDEN');

      // 3. Unauthenticated request with forged cookie signature tries to read Victim's session -> 403
      const forgedRead = await request(app)
        .get(`/api/sessions/${victimSessionId}`)
        .set('Cookie', 'arena_anon_cred=anon_1234567890abcdef12345678.forged_sig');
      expect(forgedRead.status).toBe(403);
      expect(forgedRead.body.code).toBe('SESSION_OWNERSHIP_FORBIDDEN');

      // 4. Attacker tries to submit a decision on Victim's session -> 403
      const hijackDecide = await request(app)
        .post(`/api/sessions/${victimSessionId}/decide`)
        .set('Cookie', attackerCookie)
        .send({
          challengeId: 'startupcrisis',
          decisionIndex: 0,
          decisionId: victimStart.body.session.currentDecision.id,
          optionId: victimStart.body.session.currentDecision.options[0].id,
        });
      expect(hijackDecide.status).toBe(403);
      expect(hijackDecide.body.code).toBe('SESSION_OWNERSHIP_FORBIDDEN');

      // 5. Attacker tries to modify Victim's profile -> 403
      const hijackProfile = await request(app)
        .post('/api/player/profile')
        .set('Cookie', attackerCookie)
        .send({
          playerId: victimPlayerId,
          displayName: 'DefacedName',
        });
      expect(hijackProfile.status).toBe(403);
      expect(hijackProfile.body.code).toBe('SESSION_OWNERSHIP_FORBIDDEN');

      // 6. Attacker tries to read Victim's player results endpoint -> 403
      const hijackResults = await request(app)
        .get(`/api/player/${victimPlayerId}/results`)
        .set('Cookie', attackerCookie);
      expect(hijackResults.status).toBe(403);
      expect(hijackResults.body.code).toBe('SESSION_OWNERSHIP_FORBIDDEN');

      // 7. Victim WITH valid cookie can still update their own profile and read their session -> 200
      const legitProfile = await request(app)
        .post('/api/player/profile')
        .set('Cookie', victimCookie)
        .send({
          playerId: victimPlayerId,
          displayName: 'VerifiedVictim',
        });
      expect(legitProfile.status).toBe(200);
    },
    25000
  );

  it(
    '5. Priority 4 & 5: Daily Statistics Regression Test — counts ONLY runs with isDaily === true and dailyDateKey === requestedDate',
    async () => {
      const store = new ArenaStore();
      const testDateKey = `2099-11-${Math.floor(10 + Math.random() * 19)}_${runSuffix}`;
      const challenge = getChallengeByIdOrSlug('business1000')!;

      // 1. Save an ordinary (non-daily) run on the same challengeId (isDaily: false)
      const nonDailySession = createInitialSession({
        playerId: `plr_nondaily_${runSuffix}`,
        ownerAnonUid: `anon_nondaily_${runSuffix}`,
        playerName: 'OrdinaryRunner',
        challenge,
        isDaily: false,
      });

      await store.completeSessionAndSaveResult({
        session: nonDailySession,
        result: {
          id: generateId('res'),
          sessionId: nonDailySession.id,
          playerId: nonDailySession.playerId,
          ownerAnonUid: nonDailySession.ownerAnonUid,
          playerName: nonDailySession.playerName,
          challengeId: challenge.id,
          challengeSlug: challenge.slug,
          challengeTitle: challenge.title,
          challengeCategory: challenge.category,
          challengeVersion: challenge.version,
          isDaily: false,
          score: 88,
          tier: 'strong',
          tierLabel: 'Strong Run',
          archetype: 'THE STRATEGIST',
          archetypeDescription: 'Strategic execution.',
          summaryCommentary: 'Completed non-daily run.',
          dimensions: [],
          finalState: { ...challenge.startingState },
          stateMetrics: challenge.stateMetrics,
          decisionHistory: [],
          shareToken: generateShareToken(),
          completedAt: new Date().toISOString(),
        },
        challengeDescription: challenge.description,
      });

      // Verify non-daily run did NOT pollute dailyStats for testDateKey even though challengeId matches
      const statsAfterNonDaily = await store.getDailyStats(
        testDateKey,
        challenge.id
      );
      expect(statsAfterNonDaily.totalRuns).toBe(0);
      expect(statsAfterNonDaily.topScore).toBeNull();

      // 2. Save a genuine daily run (isDaily: true, dailyDateKey: testDateKey)
      const dailySession = createInitialSession({
        playerId: `plr_daily_${runSuffix}`,
        ownerAnonUid: `anon_daily_${runSuffix}`,
        playerName: 'DailyRunner',
        challenge,
        isDaily: true,
        dailyDateKey: testDateKey,
      });

      await store.completeSessionAndSaveResult({
        session: dailySession,
        result: {
          id: generateId('res'),
          sessionId: dailySession.id,
          playerId: dailySession.playerId,
          ownerAnonUid: dailySession.ownerAnonUid,
          playerName: dailySession.playerName,
          challengeId: challenge.id,
          challengeSlug: challenge.slug,
          challengeTitle: challenge.title,
          challengeCategory: challenge.category,
          challengeVersion: challenge.version,
          isDaily: true,
          dailyDateKey: testDateKey,
          score: 92,
          tier: 'exceptional',
          tierLabel: 'Exceptional Run',
          archetype: 'THE STRATEGIST',
          archetypeDescription: 'Strategic execution.',
          summaryCommentary: 'Completed daily run.',
          dimensions: [],
          finalState: { ...challenge.startingState },
          stateMetrics: challenge.stateMetrics,
          decisionHistory: [],
          shareToken: generateShareToken(),
          completedAt: new Date().toISOString(),
        },
        challengeDescription: challenge.description,
      });

      const statsAfterDaily = await store.getDailyStats(
        testDateKey,
        challenge.id
      );
      expect(statsAfterDaily.totalRuns).toBe(1);
      expect(statsAfterDaily.topScore).toBe(92);
    },
    25000
  );

  it(
    '6. Executes all 10 initial challenges end-to-end from start through 5 decisions to completion, score, and result retrieval',
    async () => {
      const listRes = await request(app).get('/api/challenges');
      expect(listRes.status).toBe(200);
      const challenges = listRes.body.challenges as Array<{
        id: string;
        title: string;
        totalDecisions: number;
      }>;
      expect(challenges.length).toBe(10);

      for (const ch of challenges) {
        const detailRes = await request(app).get(`/api/challenges/${ch.id}`);
        expect(detailRes.status).toBe(200);
        expect(detailRes.body.challenge.id).toBe(ch.id);

        const startRes = await request(app)
          .post('/api/sessions/start')
          .send({
            challengeId: ch.id,
            playerId: `plr_audit_${ch.id}_${runSuffix}`,
            playerName: `Auditor ${ch.id}`,
            forceNew: true,
          });
        expect(startRes.status).toBe(201);
        const cookie = extractCookieHeader(startRes);
        let currentSession = startRes.body.session;
        expect(currentSession.totalDecisions).toBe(5);

        let completedResult: {
          id: string;
          score: number;
          archetype: string;
          shareToken: string;
        } | null = null;

        for (let step = 0; step < 5; step++) {
          expect(currentSession.currentDecisionIndex).toBe(step);
          expect(currentSession.currentDecision).not.toBeNull();
          const decisionId = currentSession.currentDecision.id;
          const firstOptionId = currentSession.currentDecision.options[0].id;

          const decideRes = await request(app)
            .post(`/api/sessions/${currentSession.id}/decide`)
            .set('Cookie', cookie)
            .send({
              challengeId: ch.id,
              decisionIndex: step,
              decisionId,
              optionId: firstOptionId,
            });

          expect(decideRes.status).toBe(200);
          expect(decideRes.body.consequence).toBeDefined();
          currentSession = decideRes.body.session;

          if (step === 4) {
            expect(decideRes.body.completed).toBe(true);
            expect(decideRes.body.result).toBeDefined();
            completedResult = decideRes.body.result;
          } else {
            expect(decideRes.body.completed).toBe(false);
          }
        }

        expect(completedResult).not.toBeNull();
        expect(completedResult!.score).toBeGreaterThanOrEqual(0);
        expect(completedResult!.score).toBeLessThanOrEqual(100);

        const resFetch = await request(app)
          .get(`/api/results/${completedResult!.id}`)
          .set('Cookie', cookie);
        expect(resFetch.status).toBe(200);
        expect(resFetch.body.result.id).toBe(completedResult!.id);
        expect(resFetch.body.result.challengeId).toBe(ch.id);
        expect(resFetch.body.result.ownerAnonUid).toBeUndefined();
      }
    },
    90000
  );
});
