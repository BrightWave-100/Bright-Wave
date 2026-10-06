import crypto from 'crypto';
import {
  ChallengeDefinitionServer,
  ChallengeSessionClient,
  ChallengeSessionServer,
  ChallengeSummaryClient,
  DecisionNodeClient,
  DecisionNodeServer,
  DimensionBreakdown,
  ResultArchetype,
  ScoreTier,
} from './types.js';

export function generateId(prefix: string): string {
  const randomPart = crypto.randomBytes(6).toString('hex');
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}

export function generateShareToken(): string {
  return crypto.randomBytes(5).toString('hex');
}

export function toChallengeSummaryClient(
  challenge: ChallengeDefinitionServer
): ChallengeSummaryClient {
  return {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    subtitle: challenge.subtitle,
    description: challenge.description,
    category: challenge.category,
    primaryCategory: challenge.primaryCategory,
    difficulty: challenge.difficulty,
    estimatedMinutes: challenge.estimatedMinutes,
    tags: [...challenge.tags],
    disclaimer: challenge.disclaimer,
    scenarioIntro: challenge.scenarioIntro,
    stateMetrics: challenge.stateMetrics.map((m) => ({ ...m })),
    startingState: { ...challenge.startingState },
    totalDecisions: challenge.decisions.length,
    scoringDimensions: challenge.scoringRules.map((r) => ({
      key: r.key,
      label: r.label,
      weight: r.weight,
    })),
    version: challenge.version,
  };
}

export function toDecisionNodeClient(
  node: DecisionNodeServer
): DecisionNodeClient {
  return {
    id: node.id,
    roundLabel: node.roundLabel,
    prompt: node.prompt,
    context: node.context,
    options: node.options.map((opt) => ({
      id: opt.id,
      title: opt.title,
      description: opt.description,
      // Explicitly omit stateChanges, hiddenConsequences, and scoringEffects
    })),
  };
}

export function toSessionClient(
  session: ChallengeSessionServer,
  challenge: ChallengeDefinitionServer
): ChallengeSessionClient {
  const currentDecisionNode =
    session.status === 'active' &&
    session.currentDecisionIndex < challenge.decisions.length
      ? toDecisionNodeClient(challenge.decisions[session.currentDecisionIndex])
      : null;

  return {
    id: session.id,
    playerId: session.playerId,
    playerName: session.playerName,
    challengeId: session.challengeId,
    challengeTitle: challenge.title,
    challengeVersion: session.challengeVersion,
    isDaily: session.isDaily,
    friendShareToken: session.friendShareToken,
    status: session.status,
    currentDecisionIndex: session.currentDecisionIndex,
    totalDecisions: challenge.decisions.length,
    state: { ...session.state },
    stateMetrics: challenge.stateMetrics.map((m) => ({ ...m })),
    currentDecision: currentDecisionNode,
    decisionHistory: session.decisionHistory.map((h) => ({ ...h })),
    resultId: session.resultId,
    startedAt: session.startedAt,
    updatedAt: session.updatedAt,
  };
}

export function createInitialSession(params: {
  playerId: string;
  ownerAnonUid?: string;
  playerName: string;
  challenge: ChallengeDefinitionServer;
  isDaily?: boolean;
  dailyDateKey?: string;
  friendShareToken?: string;
}): ChallengeSessionServer {
  const {
    playerId,
    ownerAnonUid,
    playerName,
    challenge,
    isDaily,
    dailyDateKey,
    friendShareToken,
  } = params;

  const dimensionScores: Record<string, number> = {};
  for (const rule of challenge.scoringRules) {
    dimensionScores[rule.key] = rule.baseline;
  }

  const now = new Date().toISOString();
  return {
    id: generateId('sess'),
    playerId,
    ownerAnonUid,
    playerName: playerName.trim() || 'Anonymous Player',
    challengeId: challenge.id,
    challengeVersion: challenge.version,
    isDaily,
    dailyDateKey,
    friendShareToken,
    status: 'active',
    currentDecisionIndex: 0,
    state: { ...challenge.startingState },
    dimensionScores,
    decisionHistory: [],
    startedAt: now,
    updatedAt: now,
  };
}

export function applyStateChanges(
  currentState: Record<string, number>,
  stateChanges: Record<string, number>,
  challenge: ChallengeDefinitionServer
): Record<string, number> {
  const nextState: Record<string, number> = { ...currentState };
  const metricBounds = new Map(
    challenge.stateMetrics.map((m) => [m.key, { min: m.min, max: m.max }])
  );

  for (const [key, delta] of Object.entries(stateChanges)) {
    const currentVal = typeof nextState[key] === 'number' ? nextState[key] : 0;
    let updatedVal = currentVal + delta;
    const bounds = metricBounds.get(key);
    if (bounds) {
      if (typeof bounds.min === 'number') {
        updatedVal = Math.max(bounds.min, updatedVal);
      }
      if (typeof bounds.max === 'number') {
        updatedVal = Math.min(bounds.max, updatedVal);
      }
    }
    nextState[key] = Math.round(updatedVal);
  }

  return nextState;
}

export function applyScoringEffects(
  currentDimensions: Record<string, number>,
  scoringEffects: Record<string, number>,
  challenge: ChallengeDefinitionServer
): Record<string, number> {
  const nextDimensions: Record<string, number> = { ...currentDimensions };
  for (const rule of challenge.scoringRules) {
    const current =
      typeof nextDimensions[rule.key] === 'number'
        ? nextDimensions[rule.key]
        : rule.baseline;
    const delta =
      typeof scoringEffects[rule.key] === 'number'
        ? scoringEffects[rule.key]
        : 0;
    nextDimensions[rule.key] = Math.max(0, Math.min(100, Math.round(current + delta)));
  }
  return nextDimensions;
}

export function calculateDimensionBreakdowns(
  dimensionScores: Record<string, number>,
  challenge: ChallengeDefinitionServer
): DimensionBreakdown[] {
  return challenge.scoringRules.map((rule) => {
    const raw =
      typeof dimensionScores[rule.key] === 'number'
        ? dimensionScores[rule.key]
        : rule.baseline;
    return {
      key: rule.key,
      label: rule.label,
      weight: rule.weight,
      score: Math.max(0, Math.min(100, Math.round(raw))),
    };
  });
}

export function calculateFinalScore(
  dimensions: DimensionBreakdown[]
): number {
  if (dimensions.length === 0) return 0;
  let totalWeight = 0;
  let weightedSum = 0;
  for (const dim of dimensions) {
    totalWeight += dim.weight;
    weightedSum += dim.score * dim.weight;
  }
  if (totalWeight <= 0) return 0;
  const finalScore = Math.round(weightedSum / totalWeight);
  return Math.max(0, Math.min(100, finalScore));
}

export function getScoreTier(score: number): {
  tier: ScoreTier;
  label: string;
} {
  if (score >= 90) {
    return { tier: 'exceptional', label: 'Exceptional Simulation Run' };
  }
  if (score >= 75) {
    return { tier: 'strong', label: 'Strong Simulation Run' };
  }
  if (score >= 60) {
    return { tier: 'solid', label: 'Solid Simulation Run' };
  }
  if (score >= 40) {
    return { tier: 'mixed', label: 'Mixed Simulation Run' };
  }
  return { tier: 'difficult run', label: 'Difficult Simulation Run' };
}

const ARCHETYPE_DESCRIPTIONS: Record<ResultArchetype, string> = {
  'THE STRATEGIST':
    'You sequence decisions with long-horizon clarity, trading short-term comfort for durable structural advantage.',
  'THE CALCULATOR':
    'You treat every dilemma as an equation, minimizing variance and extracting high-probability outcomes from incomplete data.',
  'THE OPTIMIZER':
    'You squeeze maximum output from constrained resources, eliminating waste while maintaining momentum.',
  'THE RISK TAKER':
    'You lean into asymmetric bets when others hesitate, accepting volatility in pursuit of breakout upside.',
  'THE ADAPTER':
    'You pivot fluidly as conditions shift, refusing to stay anchored to a failing plan when new signals emerge.',
  'THE OPPORTUNIST':
    'You spot leverage in unexpected openings and move decisively before the window closes.',
  'THE BALANCER':
    'You maintain equilibrium across competing pressures, ensuring no single vulnerability derails the mission.',
  'THE SURVIVOR':
    'You weather compounding shocks through grit and defensive discipline, staying in the game when margins vanish.',
};

export function determineArchetype(
  dimensions: DimensionBreakdown[],
  finalScore: number,
  finalState: Record<string, number>
): { archetype: ResultArchetype; description: string } {
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const lowest = sorted[sorted.length - 1];
  const spread = top && lowest ? top.score - lowest.score : 0;

  const riskValue = typeof finalState.risk === 'number' ? finalState.risk : 30;
  const topKey = (top?.key || '').toLowerCase();
  const topLabel = (top?.label || '').toLowerCase();

  let archetype: ResultArchetype = 'THE BALANCER';

  if (finalScore < 52) {
    archetype = 'THE SURVIVOR';
  } else if (riskValue >= 65) {
    archetype = 'THE RISK TAKER';
  } else if (spread <= 8 && finalScore >= 65) {
    archetype = 'THE BALANCER';
  } else if (
    topKey.includes('logic') ||
    topKey.includes('reason') ||
    topKey.includes('info') ||
    topLabel.includes('logic') ||
    topLabel.includes('reasoning')
  ) {
    archetype = 'THE CALCULATOR';
  } else if (
    topKey.includes('adapt') ||
    topKey.includes('flex') ||
    topLabel.includes('adapt') ||
    topLabel.includes('flexibility')
  ) {
    archetype = 'THE ADAPTER';
  } else if (
    topKey.includes('resource') ||
    topKey.includes('budget') ||
    topKey.includes('efficien') ||
    topKey.includes('priorit') ||
    topLabel.includes('resource') ||
    topLabel.includes('efficiency')
  ) {
    archetype = 'THE OPTIMIZER';
  } else if (
    topKey.includes('negotiat') ||
    topKey.includes('risk') ||
    topLabel.includes('negotiation')
  ) {
    archetype = 'THE OPPORTUNIST';
  } else if (
    topKey.includes('strateg') ||
    topKey.includes('plan') ||
    topKey.includes('leader') ||
    topKey.includes('integrit')
  ) {
    archetype = 'THE STRATEGIST';
  }

  return {
    archetype,
    description: ARCHETYPE_DESCRIPTIONS[archetype],
  };
}

export interface DecisionValidationResult {
  valid: boolean;
  error?: string;
  code?:
    | 'SESSION_COMPLETED'
    | 'CHALLENGE_MISMATCH'
    | 'VERSION_MISMATCH'
    | 'OUT_OF_ORDER_DECISION'
    | 'DUPLICATE_DECISION'
    | 'INVALID_DECISION_ID'
    | 'INVALID_OPTION_ID';
}

export function validateDecisionSubmission(params: {
  session: ChallengeSessionServer;
  challenge: ChallengeDefinitionServer;
  challengeId: string;
  decisionIndex: number;
  decisionId: string;
  optionId: string;
}): DecisionValidationResult {
  const {
    session,
    challenge,
    challengeId,
    decisionIndex,
    decisionId,
    optionId,
  } = params;

  if (session.status === 'completed') {
    return {
      valid: false,
      error: 'This simulation session has already been completed.',
      code: 'SESSION_COMPLETED',
    };
  }

  if (session.challengeId !== challenge.id || session.challengeId !== challengeId) {
    return {
      valid: false,
      error: 'Challenge ID mismatch for active session.',
      code: 'CHALLENGE_MISMATCH',
    };
  }

  if (session.challengeVersion !== challenge.version) {
    return {
      valid: false,
      error: 'Challenge version mismatch.',
      code: 'VERSION_MISMATCH',
    };
  }

  // Check duplicate submission for an already-recorded decision index or ID
  const alreadySubmitted = session.decisionHistory.some(
    (d) => d.decisionIndex === decisionIndex || d.decisionId === decisionId
  );
  if (alreadySubmitted) {
    return {
      valid: false,
      error: 'This decision has already been recorded for this session.',
      code: 'DUPLICATE_DECISION',
    };
  }

  if (decisionIndex !== session.currentDecisionIndex) {
    return {
      valid: false,
      error: `Expected decision index ${session.currentDecisionIndex}, received ${decisionIndex}.`,
      code: 'OUT_OF_ORDER_DECISION',
    };
  }

  const expectedNode = challenge.decisions[session.currentDecisionIndex];
  if (!expectedNode || expectedNode.id !== decisionId) {
    return {
      valid: false,
      error: 'Invalid decision identifier for current simulation stage.',
      code: 'INVALID_DECISION_ID',
    };
  }

  const validOption = expectedNode.options.some((o) => o.id === optionId);
  if (!validOption) {
    return {
      valid: false,
      error: 'Selected option does not exist for this decision.',
      code: 'INVALID_OPTION_ID',
    };
  }

  return { valid: true };
}
