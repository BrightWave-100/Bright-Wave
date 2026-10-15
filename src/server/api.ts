import express, { Response } from 'express';
import {
  getAllChallenges,
  getAllChallengeTags,
  getChallengeByIdOrSlug,
  getChallengesByTag,
  getDailyChallengeForDate,
} from '../data/challenges/index.js';
import {
  applyScoringEffects,
  applyStateChanges,
  calculateDimensionBreakdowns,
  calculateFinalScore,
  createInitialSession,
  determineArchetype,
  generateId,
  generateShareToken,
  getScoreTier,
  toChallengeSummaryClient,
  toSessionClient,
  validateDecisionSubmission,
} from '../engine/engine.js';
import { DecisionHistoryItem, SimulationResult } from '../engine/types.js';
import {
  anonymousCredentialMiddleware,
  AuthenticatedArenaRequest,
} from './auth.js';
import { generateDecisionNarrative, sanitizePlainText } from './gemini.js';
import { arenaStore, sanitizeFirestoreId } from './store.js';
import { createRateLimiter } from './rate-limit.js';

export const apiRouter = express.Router();

const startSessionLimiter = createRateLimiter({
  name: 'sessions-start',
  windowMs: 60_000,
  max: 30,
});

const analyticsLimiter = createRateLimiter({
  name: 'analytics',
  windowMs: 60_000,
  max: 60,
});

// Attach server-issued HttpOnly anonymous credential & client IP to all API requests
apiRouter.use(anonymousCredentialMiddleware);

function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Strips server-only ownership metadata (ownerAnonUid) before returning
 * a SimulationResult to an authorized client.
 */
function toResultClient(result: SimulationResult): Omit<SimulationResult, 'ownerAnonUid'> {
  const { ownerAnonUid: _omit, ...clientResult } = result;
  return clientResult;
}

// GET /api/challenges
apiRouter.get(
  '/challenges',
  async (req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const tagParam =
        typeof req.query.tag === 'string' ? req.query.tag.trim() : '';
      const queryParam =
        typeof req.query.q === 'string'
          ? req.query.q.trim().toLowerCase()
          : '';

      let sourceChallenges = tagParam
        ? getChallengesByTag(tagParam)
        : getAllChallenges();

      if (queryParam) {
        const keywords = queryParam.split(/\s+/).filter(Boolean);
        sourceChallenges = sourceChallenges.filter((c) => {
          const searchable = [
            c.title,
            c.subtitle,
            c.description,
            c.scenarioIntro,
            c.category,
            c.primaryCategory,
            c.difficulty,
            ...c.tags,
          ]
            .join(' ')
            .toLowerCase();
          return keywords.every((kw) => searchable.includes(kw));
        });
      }

      const challenges = sourceChallenges.map(toChallengeSummaryClient);
      const availableTags = getAllChallengeTags();
      const recentResults = await arenaStore.getRecentResults(6);

      res.json({
        challenges,
        availableTags,
        recentResults,
      });
    } catch (err) {
      console.error('GET /api/challenges error:', err);
      res.status(500).json({ error: 'Failed to load challenges.' });
    }
  }
);

// GET /api/challenges/:id
apiRouter.get(
  '/challenges/:id',
  async (req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const challenge = getChallengeByIdOrSlug(String(req.params.id));
      if (!challenge || !challenge.published) {
        res.status(404).json({ error: 'Challenge not found.' });
        return;
      }
      const leaderboard = await arenaStore.getLeaderboard(challenge.id, 10);
      res.json({
        challenge: toChallengeSummaryClient(challenge),
        leaderboard,
      });
    } catch (err) {
      console.error('GET /api/challenges/:id error:', err);
      res.status(500).json({ error: 'Failed to load challenge details.' });
    }
  }
);

// GET /api/daily
apiRouter.get(
  '/daily',
  async (_req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const dateKey = getTodayDateKey();
      const { challenge, seed } = getDailyChallengeForDate(dateKey);
      const [stats, leaderboard] = await Promise.all([
        arenaStore.getDailyStats(dateKey, challenge.id),
        arenaStore.getLeaderboard(challenge.id, 10),
      ]);

      res.json({
        dateKey,
        seed,
        challenge: toChallengeSummaryClient(challenge),
        stats,
        leaderboard,
      });
    } catch (err) {
      console.error('GET /api/daily error:', err);
      res.status(500).json({ error: 'Failed to load daily challenge.' });
    }
  }
);

// POST /api/sessions/start
const ALLOWED_START_KEYS = new Set([
  'challengeId',
  'playerId',
  'playerName',
  'isDaily',
  'friendShareToken',
  'forceNew',
]);

const ALLOWED_DECIDE_KEYS = new Set([
  'challengeId',
  'decisionIndex',
  'decisionId',
  'optionId',
]);

apiRouter.post(
  '/sessions/start',
  startSessionLimiter,
  async (req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const unexpectedStartKeys = Object.keys(body).filter(
        (k) => !ALLOWED_START_KEYS.has(k)
      );
      if (unexpectedStartKeys.length > 0) {
        res.status(400).json({
          error: `Unauthorized client fields rejected: ${unexpectedStartKeys.join(', ')}.`,
          code: 'CLIENT_TAMPERING_REJECTED',
        });
        return;
      }

      const {
        challengeId,
        playerId,
        playerName,
        isDaily,
        friendShareToken,
        forceNew,
      } = body;

      if (!challengeId || typeof challengeId !== 'string') {
        res.status(400).json({ error: 'Valid challengeId is required.' });
        return;
      }

      if (
        !playerId ||
        typeof playerId !== 'string' ||
        playerId.length > 128 ||
        !/^[a-zA-Z0-9_-]+$/.test(playerId)
      ) {
        res.status(400).json({ error: 'Valid playerId is required.' });
        return;
      }

      const challenge = getChallengeByIdOrSlug(challengeId);
      if (!challenge || !challenge.published) {
        res.status(404).json({ error: 'Requested challenge does not exist.' });
        return;
      }

      const cleanName =
        sanitizePlainText(playerName, 40) || 'Anonymous Player';
      const anonUid = req.anonUid!;

      // Verify or claim playerId ownership using server-issued HttpOnly credential
      const ownership = await arenaStore.claimOrVerifyPlayerOwnership(
        playerId,
        anonUid,
        cleanName
      );
      if (!ownership.allowed) {
        res.status(403).json({
          error:
            'Unauthorized player identity or session ownership. You cannot access or resume another player’s session.',
          code: 'SESSION_OWNERSHIP_FORBIDDEN',
        });
        return;
      }

      // Resume active session on refresh unless forceNew is true
      if (!forceNew) {
        const existing = await arenaStore.getActiveSessionForPlayer(
          playerId,
          challenge.id
        );
        if (existing && existing.challengeVersion === challenge.version) {
          if (existing.ownerAnonUid && existing.ownerAnonUid !== anonUid) {
            res.status(403).json({
              error: 'Unauthorized session ownership.',
              code: 'SESSION_OWNERSHIP_FORBIDDEN',
            });
            return;
          }
          res.json({
            session: toSessionClient(existing, challenge),
            resumed: true,
          });
          return;
        }
      }

      const dailyDateKey = isDaily ? getTodayDateKey() : undefined;
      const cleanShareToken =
        typeof friendShareToken === 'string' &&
        friendShareToken.length > 0 &&
        friendShareToken.length <= 64
          ? sanitizeFirestoreId(friendShareToken)
          : undefined;

      const session = createInitialSession({
        playerId: sanitizeFirestoreId(playerId),
        ownerAnonUid: anonUid,
        playerName: cleanName,
        challenge,
        isDaily: Boolean(isDaily),
        dailyDateKey,
        friendShareToken: cleanShareToken,
      });

      await arenaStore.saveSession(session);

      res.status(201).json({
        session: toSessionClient(session, challenge),
        resumed: false,
      });
    } catch (err) {
      console.error('POST /api/sessions/start error:', err);
      res.status(500).json({ error: 'Failed to start simulation session.' });
    }
  }
);

// GET /api/sessions/:sessionId
apiRouter.get(
  '/sessions/:sessionId',
  async (req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const session = await arenaStore.getSession(String(req.params.sessionId));
      if (!session) {
        res.status(404).json({ error: 'Session not found.' });
        return;
      }

      if (session.ownerAnonUid && session.ownerAnonUid !== req.anonUid) {
        res.status(403).json({
          error: 'Unauthorized session access.',
          code: 'SESSION_OWNERSHIP_FORBIDDEN',
        });
        return;
      }

      const challenge = getChallengeByIdOrSlug(session.challengeId);
      if (!challenge) {
        res.status(404).json({ error: 'Associated challenge not found.' });
        return;
      }

      const result = session.resultId
        ? await arenaStore.getResult(session.resultId)
        : undefined;

      res.json({
        session: toSessionClient(session, challenge),
        result: result ? toResultClient(result) : undefined,
      });
    } catch (err) {
      console.error('GET /api/sessions/:sessionId error:', err);
      res.status(500).json({ error: 'Failed to retrieve session.' });
    }
  }
);

// POST /api/sessions/:sessionId/decide
apiRouter.post(
  '/sessions/:sessionId/decide',
  async (req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const sessionId = String(req.params.sessionId);
      const session = await arenaStore.getSession(sessionId);

      if (!session) {
        res.status(404).json({ error: 'Simulation session not found.' });
        return;
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const unexpectedDecideKeys = Object.keys(body).filter(
        (k) => !ALLOWED_DECIDE_KEYS.has(k)
      );

      // Reject any attempt to inject score, state, money, customers, resources, finalResult, leaderboardPosition, etc.
      if (unexpectedDecideKeys.length > 0) {
        res.status(400).json({
          error:
            'Client-supplied score, state, or resource payloads are forbidden. State and scores are computed server-side.',
          code: 'CLIENT_TAMPERING_REJECTED',
        });
        return;
      }

      // Enforce anonymous session ownership
      if (session.ownerAnonUid && session.ownerAnonUid !== req.anonUid) {
        res.status(403).json({
          error:
            'Unauthorized session ownership. You cannot submit decisions for another player’s session.',
          code: 'SESSION_OWNERSHIP_FORBIDDEN',
        });
        return;
      }

      const { challengeId, decisionIndex, decisionId, optionId } = body;

      if (
        typeof decisionIndex !== 'number' ||
        !Number.isInteger(decisionIndex) ||
        decisionIndex < 0
      ) {
        const challengeForErr = getChallengeByIdOrSlug(session.challengeId);
        res.status(400).json({
          error: 'Valid integer decisionIndex is required.',
          code: 'OUT_OF_ORDER_DECISION',
          session: challengeForErr
            ? toSessionClient(session, challengeForErr)
            : undefined,
        });
        return;
      }

      const challenge = getChallengeByIdOrSlug(session.challengeId);
      if (!challenge) {
        res.status(404).json({ error: 'Challenge definition not found.' });
        return;
      }

      const validation = validateDecisionSubmission({
        session,
        challenge,
        challengeId: String(challengeId || ''),
        decisionIndex: Number(decisionIndex),
        decisionId: String(decisionId || ''),
        optionId: String(optionId || ''),
      });

      if (!validation.valid) {
        res.status(400).json({
          error: validation.error,
          code: validation.code,
          session: toSessionClient(session, challenge),
        });
        return;
      }

      const decisionNode = challenge.decisions[session.currentDecisionIndex];
      const selectedOption = decisionNode.options.find(
        (o) => o.id === optionId
      )!;

      const stateBefore = { ...session.state };
      const stateAfter = applyStateChanges(
        stateBefore,
        selectedOption.stateChanges,
        challenge
      );
      const nextDimensionScores = applyScoringEffects(
        session.dimensionScores,
        selectedOption.scoringEffects,
        challenge
      );

      const narrativeResult = await generateDecisionNarrative(
        {
          challengeTitle: challenge.title,
          roundLabel: decisionNode.roundLabel,
          decisionPrompt: decisionNode.prompt,
          selectedOptionTitle: selectedOption.title,
          selectedOptionDescription: selectedOption.description,
          stateBefore,
          stateAfter,
          fallback: selectedOption.hiddenConsequences,
        },
        {
          playerId: session.playerId,
          sessionId: session.id,
          clientIp: req.clientIp,
        }
      );

      const now = new Date().toISOString();
      const historyItem: DecisionHistoryItem = {
        decisionIndex: session.currentDecisionIndex,
        decisionId: decisionNode.id,
        optionId: selectedOption.id,
        optionTitle: selectedOption.title,
        stateBefore,
        stateChanges: { ...selectedOption.stateChanges },
        stateAfter,
        consequence: {
          eventTitle: narrativeResult.eventTitle,
          narrative: narrativeResult.narrative,
          feedback: narrativeResult.feedback,
          tone: narrativeResult.tone,
          aiEnhanced: narrativeResult.aiEnhanced,
          turbulenceNotice: narrativeResult.turbulenceNotice,
        },
        timestamp: now,
      };

      session.state = stateAfter;
      session.dimensionScores = nextDimensionScores;
      session.decisionHistory.push(historyItem);
      session.currentDecisionIndex += 1;
      session.updatedAt = now;

      let finalResult: SimulationResult | undefined;

      if (session.currentDecisionIndex >= challenge.decisions.length) {
        session.status = 'completed';
        const dimensions = calculateDimensionBreakdowns(
          session.dimensionScores,
          challenge
        );
        const finalScore = calculateFinalScore(dimensions);
        const { tier, label: tierLabel } = getScoreTier(finalScore);
        const { archetype, description: archetypeDescription } =
          determineArchetype(dimensions, finalScore, session.state);

        const topDimension = [...dimensions].sort(
          (a, b) => b.score - a.score
        )[0];
        const summaryCommentary = `Simulation complete. Your strongest dimension was ${
          topDimension?.label || 'Strategy'
        } (${
          topDimension?.score || finalScore
        }/100), earning the ${archetype} classification with an overall score of ${finalScore}/100.`;

        const candidateResult: SimulationResult = {
          id: generateId('res'),
          sessionId: session.id,
          playerId: session.playerId,
          ownerAnonUid: session.ownerAnonUid || req.anonUid,
          playerName: session.playerName,
          challengeId: challenge.id,
          challengeSlug: challenge.slug,
          challengeTitle: challenge.title,
          challengeCategory: challenge.category,
          challengeVersion: challenge.version,
          isDaily: Boolean(session.isDaily),
          dailyDateKey: session.dailyDateKey,
          score: finalScore,
          tier,
          tierLabel,
          archetype,
          archetypeDescription,
          summaryCommentary,
          dimensions,
          finalState: { ...session.state },
          stateMetrics: challenge.stateMetrics.map((m) => ({ ...m })),
          decisionHistory: [...session.decisionHistory],
          shareToken: generateShareToken(),
          completedAt: now,
        };

        session.resultId = candidateResult.id;
        finalResult = await arenaStore.completeSessionAndSaveResult({
          session,
          result: candidateResult,
          challengeDescription: challenge.description,
        });
      } else {
        await arenaStore.saveSession(session);
      }

      res.json({
        session: toSessionClient(session, challenge),
        consequence: historyItem,
        completed: session.status === 'completed',
        result: finalResult ? toResultClient(finalResult) : undefined,
      });
    } catch (err) {
      console.error('POST /api/sessions/:sessionId/decide error:', err);
      res.status(500).json({ error: 'Failed to process decision.' });
    }
  }
);

// GET /api/results/:resultId
apiRouter.get(
  '/results/:resultId',
  async (req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const resultId = String(req.params.resultId);
      const result = await arenaStore.getResult(resultId);

      if (!result) {
        res.status(404).json({ error: 'Result not found.' });
        return;
      }

      if (result.ownerAnonUid && result.ownerAnonUid !== req.anonUid) {
        res.status(403).json({
          error: 'Unauthorized access to another player’s private result.',
          code: 'SESSION_OWNERSHIP_FORBIDDEN',
        });
        return;
      }

      res.json({ result: toResultClient(result) });
    } catch (err) {
      console.error('GET /api/results/:resultId error:', err);
      res.status(500).json({ error: 'Failed to load result.' });
    }
  }
);

// GET /api/player/:playerId/results
apiRouter.get(
  '/player/:playerId/results',
  async (req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const playerId = String(req.params.playerId);
      const ownership = await arenaStore.claimOrVerifyPlayerOwnership(
        playerId,
        req.anonUid!
      );
      if (!ownership.allowed) {
        res.status(403).json({
          error: 'Unauthorized access to another player’s results.',
          code: 'SESSION_OWNERSHIP_FORBIDDEN',
        });
        return;
      }

      const results = await arenaStore.getResultsByPlayer(playerId);
      res.json({ results: results.map(toResultClient) });
    } catch (err) {
      console.error('GET /api/player/:playerId/results error:', err);
      res.status(500).json({ error: 'Failed to load player results.' });
    }
  }
);

// POST /api/player/profile
apiRouter.post(
  '/player/profile',
  async (req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const { playerId, displayName } = req.body || {};
      if (!playerId || typeof playerId !== 'string') {
        res.status(400).json({ error: 'playerId is required.' });
        return;
      }
      const cleanName = sanitizePlainText(displayName, 40);
      if (!cleanName) {
        res.status(400).json({ error: 'Valid displayName is required.' });
        return;
      }

      const ownership = await arenaStore.claimOrVerifyPlayerOwnership(
        playerId,
        req.anonUid!,
        cleanName
      );
      if (!ownership.allowed) {
        res.status(403).json({
          error:
            'Unauthorized profile modification. You cannot modify another player’s profile.',
          code: 'SESSION_OWNERSHIP_FORBIDDEN',
        });
        return;
      }

      await arenaStore.updatePlayerDisplayName(playerId, cleanName);
      res.json({ playerId, displayName: cleanName });
    } catch (err) {
      console.error('POST /api/player/profile error:', err);
      res.status(500).json({ error: 'Failed to update profile.' });
    }
  }
);

// POST /api/friend-challenges
apiRouter.post(
  '/friend-challenges',
  async (req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const { resultId } = req.body || {};
      if (!resultId || typeof resultId !== 'string') {
        res.status(400).json({ error: 'Valid resultId is required.' });
        return;
      }

      const result = await arenaStore.getResult(resultId);
      if (!result) {
        res.status(404).json({ error: 'Simulation result not found.' });
        return;
      }

      if (result.ownerAnonUid && result.ownerAnonUid !== req.anonUid) {
        res.status(403).json({
          error: 'Unauthorized result access.',
          code: 'SESSION_OWNERSHIP_FORBIDDEN',
        });
        return;
      }

      const challenge = getChallengeByIdOrSlug(result.challengeId);
      const newToken = generateShareToken();
      const invite = await arenaStore.mintFriendChallengeInvite(
        result.id,
        newToken,
        challenge?.description || result.summaryCommentary
      );

      res.status(201).json({
        invite,
      });
    } catch (err) {
      console.error('POST /api/friend-challenges error:', err);
      res.status(500).json({ error: 'Failed to create friend challenge invite.' });
    }
  }
);

// GET /api/friend-challenges/:shareToken
apiRouter.get(
  '/friend-challenges/:shareToken',
  async (req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const shareToken = String(req.params.shareToken);
      const invite = await arenaStore.getFriendChallenge(shareToken);
      if (!invite) {
        res.status(404).json({ error: 'Friend challenge invite not found.' });
        return;
      }
      const challenge = getChallengeByIdOrSlug(invite.challengeId);
      res.json({
        invite,
        challenge: challenge ? toChallengeSummaryClient(challenge) : null,
      });
    } catch (err) {
      console.error('GET /api/friend-challenges/:shareToken error:', err);
      res.status(500).json({ error: 'Failed to load friend challenge invite.' });
    }
  }
);

// GET /api/leaderboards
apiRouter.get(
  '/leaderboards',
  async (req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const challengeId =
        typeof req.query.challengeId === 'string' &&
        req.query.challengeId !== 'all'
          ? req.query.challengeId
          : undefined;
      const entries = await arenaStore.getLeaderboard(challengeId, 50);
      res.json({ entries });
    } catch (err) {
      console.error('GET /api/leaderboards error:', err);
      res.status(500).json({ error: 'Failed to load leaderboards.' });
    }
  }
);

// POST /api/analytics
apiRouter.post(
  '/analytics',
  analyticsLimiter,
  async (req: AuthenticatedArenaRequest, res: Response) => {
    try {
      const {
        eventType,
        playerId,
        challengeId,
        sessionId,
        shareToken,
        metadata,
      } = req.body || {};

      const cleanEvent = sanitizePlainText(eventType, 64);
      const cleanPlayer = sanitizePlainText(playerId, 128) || 'anon';
      if (!cleanEvent) {
        res.status(400).json({ error: 'eventType is required.' });
        return;
      }

      await arenaStore.recordAnalyticsEvent({
        id: generateId('evt'),
        eventType: cleanEvent,
        playerId: cleanPlayer,
        challengeId: challengeId
          ? sanitizePlainText(challengeId, 64)
          : undefined,
        sessionId: sessionId ? sanitizePlainText(sessionId, 64) : undefined,
        shareToken: shareToken ? sanitizePlainText(shareToken, 64) : undefined,
        metadata:
          metadata && typeof metadata === 'object' ? metadata : undefined,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({ recorded: true });
    } catch (err) {
      console.error('POST /api/analytics error:', err);
      res.status(500).json({ error: 'Failed to record analytics event.' });
    }
  }
);
