import { describe, expect, it } from 'vitest';
import {
  applyScoringEffects,
  applyStateChanges,
  calculateDimensionBreakdowns,
  calculateFinalScore,
  createInitialSession,
  determineArchetype,
  generateShareToken,
  getScoreTier,
  toChallengeSummaryClient,
  toSessionClient,
  validateDecisionSubmission,
} from '../engine/engine.js';
import {
  CHALLENGE_REGISTRY,
  getAllChallenges,
  getChallengeByIdOrSlug,
} from '../data/challenges/index.js';
import {
  checkNarrativeRateLimit,
  generateDecisionNarrative,
  MAX_IP_CALLS_PER_MINUTE,
  MAX_PLAYER_CALLS_PER_MINUTE,
  MAX_SESSION_CALLS_PER_MINUTE,
  resetNarrativeRateLimits,
  validateAndSanitizeGeminiResponse,
} from '../server/gemini.js';

describe('Challenge Arena — Game Engine & Unit Tests', () => {
  it('1. Challenge loading: loads all 10 published challenges with valid weights and strips hidden fields for client', () => {
    const challenges = getAllChallenges();
    expect(challenges.length).toBe(10);

    for (const ch of challenges) {
      const weightSum = ch.scoringRules.reduce((acc, r) => acc + r.weight, 0);
      expect(weightSum).toBe(100);
      expect(ch.decisions.length).toBeGreaterThanOrEqual(5);

      const clientSummary = toChallengeSummaryClient(ch);
      expect(clientSummary.id).toBe(ch.id);
      expect((clientSummary as unknown as Record<string, unknown>).decisions).toBeUndefined();
    }
  });

  it('2. State transitions: deterministically applies state deltas and respects min/max bounds', () => {
    const biz = getChallengeByIdOrSlug('business1000')!;
    const initial = { ...biz.startingState };
    expect(initial.money).toBe(1000);

    const updated = applyStateChanges(
      initial,
      { money: -150, customers: 12, reputation: 60, energy: -120 },
      biz
    );

    expect(updated.money).toBe(850);
    expect(updated.customers).toBe(12);
    expect(updated.reputation).toBe(100); // Clamped at max 100
    expect(updated.energy).toBe(0); // Clamped at min 0
  });

  it('3. Scoring & Final Result Calculation: computes weighted integer score 0-100 and tier', () => {
    const biz = getChallengeByIdOrSlug('business1000')!;
    let dims: Record<string, number> = {
      strategy: 50,
      resourceManagement: 50,
      riskManagement: 50,
      adaptability: 50,
    };

    dims = applyScoringEffects(
      dims,
      { strategy: 40, resourceManagement: 35, riskManagement: 30, adaptability: 25 },
      biz
    );

    const breakdowns = calculateDimensionBreakdowns(dims, biz);
    const finalScore = calculateFinalScore(breakdowns);

    // 90*0.3 + 85*0.3 + 80*0.2 + 75*0.2 = 27 + 25.5 + 16 + 15 = 83.5 -> 84
    expect(finalScore).toBe(84);
    expect(getScoreTier(finalScore).tier).toBe('strong');

    const { archetype } = determineArchetype(breakdowns, finalScore, biz.startingState);
    expect(archetype).toBe('THE STRATEGIST');
  });

  it('4. Invalid decisions: rejects mismatched challengeId, invalid decisionId, or invalid optionId', () => {
    const biz = getChallengeByIdOrSlug('business1000')!;
    const session = createInitialSession({
      playerId: 'plr_test1',
      playerName: 'Tester',
      challenge: biz,
    });

    const badChallenge = validateDecisionSubmission({
      session,
      challenge: biz,
      challengeId: 'wrong_challenge',
      decisionIndex: 0,
      decisionId: 'b1_d1',
      optionId: 'b1_d1_o1',
    });
    expect(badChallenge.valid).toBe(false);
    expect(badChallenge.code).toBe('CHALLENGE_MISMATCH');

    const badOption = validateDecisionSubmission({
      session,
      challenge: biz,
      challengeId: 'business1000',
      decisionIndex: 0,
      decisionId: 'b1_d1',
      optionId: 'non_existent_option',
    });
    expect(badOption.valid).toBe(false);
    expect(badOption.code).toBe('INVALID_OPTION_ID');
  });

  it('5. Duplicate & out-of-order decisions: rejects skipping ahead or re-submitting a past decision', () => {
    const biz = getChallengeByIdOrSlug('business1000')!;
    const session = createInitialSession({
      playerId: 'plr_test2',
      playerName: 'Tester',
      challenge: biz,
    });

    // Out-of-order skip attempt
    const skipAttempt = validateDecisionSubmission({
      session,
      challenge: biz,
      challengeId: 'business1000',
      decisionIndex: 2,
      decisionId: 'b1_d3',
      optionId: 'b1_d3_o1',
    });
    expect(skipAttempt.valid).toBe(false);
    expect(skipAttempt.code).toBe('OUT_OF_ORDER_DECISION');

    // Simulate recording decision 0
    session.decisionHistory.push({
      decisionIndex: 0,
      decisionId: 'b1_d1',
      optionId: 'b1_d1_o1',
      optionTitle: 'Option 1',
      stateBefore: {},
      stateChanges: {},
      stateAfter: {},
      consequence: {
        eventTitle: 'Title',
        narrative: 'Narrative',
        feedback: 'Feedback',
        tone: 'strategic',
        aiEnhanced: false,
      },
      timestamp: new Date().toISOString(),
    });
    session.currentDecisionIndex = 1;

    // Duplicate submission of decision 0
    const dupAttempt = validateDecisionSubmission({
      session,
      challenge: biz,
      challengeId: 'business1000',
      decisionIndex: 0,
      decisionId: 'b1_d1',
      optionId: 'b1_d1_o2',
    });
    expect(dupAttempt.valid).toBe(false);
    expect(dupAttempt.code).toBe('DUPLICATE_DECISION');
  });

  it('6. Session validation & Client sanitization: hides future decisions and hidden consequences from client', () => {
    const biz = getChallengeByIdOrSlug('business1000')!;
    const session = createInitialSession({
      playerId: 'plr_test3',
      playerName: 'Tester',
      challenge: biz,
    });

    const clientSession = toSessionClient(session, biz);
    expect(clientSession.currentDecision?.id).toBe('b1_d1');
    const firstOpt = clientSession.currentDecision?.options[0] as unknown as Record<string, unknown>;
    expect(firstOpt.stateChanges).toBeUndefined();
    expect(firstOpt.hiddenConsequences).toBeUndefined();
    expect(firstOpt.scoringEffects).toBeUndefined();
  });

  it('7. Share token generation: creates unique alphanumeric tokens', () => {
    const t1 = generateShareToken();
    const t2 = generateShareToken();
    expect(t1).toMatch(/^[a-f0-9]{10}$/);
    expect(t1).not.toBe(t2);
  });

  it('8. Malformed Gemini response: rejects invalid JSON and strips XSS/HTML tags', () => {
    expect(validateAndSanitizeGeminiResponse('not json')).toBeNull();
    expect(validateAndSanitizeGeminiResponse('{"eventTitle":"hi"}')).toBeNull();

    const sanitized = validateAndSanitizeGeminiResponse(
      JSON.stringify({
        eventTitle: '<script>alert(1)</script>Early customers arrive',
        narrative: '<b>The decision</b> pays off faster than expected in week one.',
        tone: 'INVALID_TONE',
        feedback: 'You prioritized customer acquisition early.',
      })
    );

    expect(sanitized).not.toBeNull();
    expect(sanitized?.eventTitle).toBe('alert(1)Early customers arrive');
    expect(sanitized?.narrative).not.toContain('<b>');
    expect(sanitized?.tone).toBe('strategic');
  });

  it('9. Gemini unavailable fallback: gracefully falls back to deterministic narrative when Gemini throws', async () => {
    const failingMockClient = {
      generateContent: async () => {
        throw new Error('503 Service Unavailable');
      },
    };

    const output = await generateDecisionNarrative(
      {
        challengeTitle: 'BUILD A $1,000 BUSINESS',
        roundLabel: 'Day 1',
        decisionPrompt: 'How do you deploy capital?',
        selectedOptionTitle: 'Pre-sell B2B service',
        selectedOptionDescription: 'Validate first',
        stateBefore: { money: 1000 },
        stateAfter: { money: 1380 },
        fallback: {
          eventTitle: 'Deterministic Title',
          deterministicNarrative: 'Deterministic narrative body text for fallback.',
          feedback: 'Deterministic feedback text.',
          tone: 'strategic',
        },
      },
      'test_player_fallback',
      failingMockClient
    );

    expect(output.aiEnhanced).toBe(false);
    expect(output.eventTitle).toBe('Deterministic Title');
    expect(output.narrative).toBe('Deterministic narrative body text for fallback.');
    expect(output.turbulenceNotice).toContain('The simulation hit a turbulence patch');
  });

  it('10. All 10 challenges have complete 5-decision trees with valid options', () => {
    expect(CHALLENGE_REGISTRY.length).toBe(10);
    for (const c of CHALLENGE_REGISTRY) {
      expect(c.decisions.length).toBe(5);
      for (const d of c.decisions) {
        expect(d.options.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('11. Gemini rate limiter hardening: enforces per-session, per-player, and per-IP rate limits even when rotating playerId', () => {
    resetNarrativeRateLimits();

    // 1. Per-session limit (MAX_SESSION_CALLS_PER_MINUTE = 10)
    for (let i = 0; i < MAX_SESSION_CALLS_PER_MINUTE; i++) {
      expect(
        checkNarrativeRateLimit({
          playerId: 'plr_sess_test',
          sessionId: 'sess_fixed_1',
          clientIp: '10.0.0.1',
        })
      ).toBe(true);
    }
    expect(
      checkNarrativeRateLimit({
        playerId: 'plr_sess_test',
        sessionId: 'sess_fixed_1',
        clientIp: '10.0.0.1',
      })
    ).toBe(false);

    // 2. Per-player limit across multiple sessions (MAX_PLAYER_CALLS_PER_MINUTE = 20)
    resetNarrativeRateLimits();
    for (let i = 0; i < MAX_PLAYER_CALLS_PER_MINUTE; i++) {
      expect(
        checkNarrativeRateLimit({
          playerId: 'plr_fixed_user',
          sessionId: `sess_rot_${i}`,
          clientIp: `10.0.1.${i}`,
        })
      ).toBe(true);
    }
    expect(
      checkNarrativeRateLimit({
        playerId: 'plr_fixed_user',
        sessionId: 'sess_rot_extra',
        clientIp: '10.0.1.250',
      })
    ).toBe(false);

    // 3. Per-IP limit when malicious client rotates both playerId and sessionId (MAX_IP_CALLS_PER_MINUTE = 45)
    resetNarrativeRateLimits();
    const attackerIp = '203.0.113.99';
    for (let i = 0; i < MAX_IP_CALLS_PER_MINUTE; i++) {
      expect(
        checkNarrativeRateLimit({
          playerId: `plr_rotated_${i}`,
          sessionId: `sess_rotated_${i}`,
          clientIp: attackerIp,
        })
      ).toBe(true);
    }
    // 46th call from same IP with brand-new playerId and sessionId must be blocked
    expect(
      checkNarrativeRateLimit({
        playerId: 'plr_rotated_999',
        sessionId: 'sess_rotated_999',
        clientIp: attackerIp,
      })
    ).toBe(false);

    // Legitimate player on a different IP is unaffected
    expect(
      checkNarrativeRateLimit({
        playerId: 'plr_legit_other_ip',
        sessionId: 'sess_legit_other_ip',
        clientIp: '198.51.100.7',
      })
    ).toBe(true);
  });
});
