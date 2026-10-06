/**
 * Core deterministic scenario simulation schema and types for Challenge Arena.
 * Hidden scoring rules and future consequences are strictly kept on the server.
 */

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export type ChallengeCategory =
  | 'Strategy'
  | 'Money'
  | 'Business'
  | 'Survival'
  | 'Career'
  | 'Logic'
  | 'Social'
  | 'Ethics'
  | 'Adventure'
  | 'Mystery'
  | 'Planning'
  | 'Productivity';

export interface StateMetricDefinition {
  key: string;
  label: string;
  unit?: 'currency' | 'percent' | 'number' | 'day' | 'hours';
  min?: number;
  max?: number;
}

export interface DecisionOptionServer {
  id: string;
  title: string;
  description: string;
  stateChanges: Record<string, number>;
  hiddenConsequences: {
    eventTitle: string;
    deterministicNarrative: string;
    feedback: string;
    tone: 'exciting' | 'tense' | 'strategic' | 'cautious' | 'analytical';
  };
  scoringEffects: Record<string, number>;
}

export interface DecisionNodeServer {
  id: string;
  roundLabel: string;
  prompt: string;
  context: string;
  options: DecisionOptionServer[];
}

export interface ScoringDimensionRule {
  key: string;
  label: string;
  weight: number; // Percentage weight, sum of weights = 100
  baseline: number; // Starting dimension score (e.g. 50)
}

export interface ChallengeDefinitionServer {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  primaryCategory: ChallengeCategory;
  difficulty: DifficultyLevel;
  estimatedMinutes: string;
  tags: string[];
  disclaimer?: string;
  scenarioIntro: string;
  stateMetrics: StateMetricDefinition[];
  startingState: Record<string, number>;
  decisions: DecisionNodeServer[];
  scoringRules: ScoringDimensionRule[];
  version: number;
  published: boolean;
}

/**
 * Sanitized client-facing types (NO hiddenConsequences, NO scoringEffects, NO future decisions).
 */
export interface DecisionOptionClient {
  id: string;
  title: string;
  description: string;
}

export interface DecisionNodeClient {
  id: string;
  roundLabel: string;
  prompt: string;
  context: string;
  options: DecisionOptionClient[];
}

export interface ChallengeSummaryClient {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  primaryCategory: ChallengeCategory;
  difficulty: DifficultyLevel;
  estimatedMinutes: string;
  tags: string[];
  disclaimer?: string;
  scenarioIntro: string;
  stateMetrics: StateMetricDefinition[];
  startingState: Record<string, number>;
  totalDecisions: number;
  scoringDimensions: { key: string; label: string; weight: number }[];
  version: number;
}

export interface DecisionHistoryItem {
  decisionIndex: number;
  decisionId: string;
  optionId: string;
  optionTitle: string;
  stateBefore: Record<string, number>;
  stateChanges: Record<string, number>;
  stateAfter: Record<string, number>;
  consequence: {
    eventTitle: string;
    narrative: string;
    feedback: string;
    tone: string;
    aiEnhanced: boolean;
    turbulenceNotice?: string;
  };
  timestamp: string;
}

export interface ChallengeSessionServer {
  id: string;
  playerId: string;
  ownerAnonUid?: string;
  playerName: string;
  challengeId: string;
  challengeVersion: number;
  isDaily?: boolean;
  dailyDateKey?: string;
  friendShareToken?: string;
  status: 'active' | 'completed';
  currentDecisionIndex: number;
  state: Record<string, number>;
  dimensionScores: Record<string, number>;
  decisionHistory: DecisionHistoryItem[];
  resultId?: string;
  startedAt: string;
  updatedAt: string;
}

export interface ChallengeSessionClient {
  id: string;
  playerId: string;
  playerName: string;
  challengeId: string;
  challengeTitle: string;
  challengeVersion: number;
  isDaily?: boolean;
  friendShareToken?: string;
  status: 'active' | 'completed';
  currentDecisionIndex: number;
  totalDecisions: number;
  state: Record<string, number>;
  stateMetrics: StateMetricDefinition[];
  currentDecision: DecisionNodeClient | null;
  decisionHistory: DecisionHistoryItem[];
  resultId?: string;
  startedAt: string;
  updatedAt: string;
}

export type ScoreTier = 'exceptional' | 'strong' | 'solid' | 'mixed' | 'difficult run';

export type ResultArchetype =
  | 'THE STRATEGIST'
  | 'THE RISK TAKER'
  | 'THE ADAPTER'
  | 'THE OPTIMIZER'
  | 'THE OPPORTUNIST'
  | 'THE BALANCER'
  | 'THE SURVIVOR'
  | 'THE CALCULATOR';

export interface DimensionBreakdown {
  key: string;
  label: string;
  weight: number;
  score: number; // 0-100
}

export interface SimulationResult {
  id: string;
  sessionId: string;
  playerId: string;
  ownerAnonUid?: string;
  playerName: string;
  challengeId: string;
  challengeSlug: string;
  challengeTitle: string;
  challengeCategory: string;
  challengeVersion: number;
  isDaily?: boolean;
  dailyDateKey?: string;
  score: number; // 0-100 integer
  tier: ScoreTier;
  tierLabel: string;
  archetype: ResultArchetype;
  archetypeDescription: string;
  summaryCommentary: string;
  dimensions: DimensionBreakdown[];
  finalState: Record<string, number>;
  stateMetrics: StateMetricDefinition[];
  decisionHistory: DecisionHistoryItem[];
  shareToken: string;
  friendTargetBeaten?: {
    shareToken: string;
    challengerName: string;
    challengerScore: number;
    challengerArchetype?: ResultArchetype;
    challengerDimensions?: DimensionBreakdown[];
    beaten: boolean;
  };
  completedAt: string;
}

export interface FriendChallengeInvite {
  shareToken: string;
  resultId?: string;
  challengeId: string;
  challengeTitle: string;
  challengeCategory: string;
  challengeDescription: string;
  challengerId?: string;
  challengerName: string;
  score: number;
  tier: ScoreTier;
  archetype: ResultArchetype;
  dimensions?: DimensionBreakdown[];
  createdAt: string;
  updatedAt?: string;
  attemptsCount: number;
  beatenCount: number;
}
