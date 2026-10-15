import { GoogleGenAI, Type } from '@google/genai';

export interface NarrativeGenerationInput {
  challengeTitle: string;
  roundLabel: string;
  decisionPrompt: string;
  selectedOptionTitle: string;
  selectedOptionDescription: string;
  stateBefore: Record<string, number>;
  stateAfter: Record<string, number>;
  fallback: {
    eventTitle: string;
    deterministicNarrative: string;
    feedback: string;
    tone: 'exciting' | 'tense' | 'strategic' | 'cautious' | 'analytical';
  };
}

export interface NarrativeGenerationOutput {
  eventTitle: string;
  narrative: string;
  tone: 'exciting' | 'tense' | 'strategic' | 'cautious' | 'analytical';
  feedback: string;
  aiEnhanced: boolean;
  turbulenceNotice?: string;
}

export interface NarrativeRateLimitContext {
  playerId?: string;
  sessionId?: string;
  clientIp?: string;
}

const ALLOWED_TONES = new Set([
  'exciting',
  'tense',
  'strategic',
  'cautious',
  'analytical',
]);

const rateLimitBuckets = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;

export const MAX_PLAYER_CALLS_PER_MINUTE = 20;
export const MAX_SESSION_CALLS_PER_MINUTE = 10;
export const MAX_IP_CALLS_PER_MINUTE = 45;

function consumeBucket(key: string, maxCalls: number): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= maxCalls) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function pruneExpiredBuckets(now: number): void {
  if (rateLimitBuckets.size < 1000) return;
  for (const [key, bucket] of rateLimitBuckets) {
    if (now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitBuckets.delete(key);
    }
  }
}

export function resetNarrativeRateLimits(): void {
  rateLimitBuckets.clear();
}

export function checkNarrativeRateLimit(
  keyOrContext: string | NarrativeRateLimitContext
): boolean {
  if (typeof keyOrContext === 'string') {
    return consumeBucket(`player:${keyOrContext}`, MAX_PLAYER_CALLS_PER_MINUTE);
  }

  const { playerId, sessionId, clientIp } = keyOrContext;

  // Check all applicable buckets before incrementing so a rejected request on one layer does not unfairly drain another layer
  const now = Date.now();
  pruneExpiredBuckets(now);
  const checks: Array<{ key: string; limit: number }> = [];

  if (clientIp) {
    checks.push({ key: `ip:${clientIp}`, limit: MAX_IP_CALLS_PER_MINUTE });
  }
  if (sessionId) {
    checks.push({ key: `session:${sessionId}`, limit: MAX_SESSION_CALLS_PER_MINUTE });
  }
  if (playerId) {
    checks.push({ key: `player:${playerId}`, limit: MAX_PLAYER_CALLS_PER_MINUTE });
  }

  if (checks.length === 0) {
    checks.push({ key: 'player:global', limit: MAX_PLAYER_CALLS_PER_MINUTE });
  }

  for (const { key, limit } of checks) {
    const existing = rateLimitBuckets.get(key);
    if (existing && now - existing.windowStart <= RATE_LIMIT_WINDOW_MS) {
      if (existing.count >= limit) {
        return false;
      }
    }
  }

  for (const { key, limit } of checks) {
    consumeBucket(key, limit);
  }

  return true;
}

export function sanitizePlainText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function validateAndSanitizeGeminiResponse(
  rawText: string | undefined
): Omit<NarrativeGenerationOutput, 'aiEnhanced' | 'turbulenceNotice'> | null {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(rawText.trim());
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const eventTitle = sanitizePlainText(parsed.eventTitle, 90);
    const narrative = sanitizePlainText(parsed.narrative, 360);
    const feedback = sanitizePlainText(parsed.feedback, 220);
    const rawTone = sanitizePlainText(parsed.tone, 20).toLowerCase();

    if (eventTitle.length < 4 || narrative.length < 15 || feedback.length < 8) {
      return null;
    }

    const tone = (ALLOWED_TONES.has(rawTone)
      ? rawTone
      : 'strategic') as NarrativeGenerationOutput['tone'];

    return {
      eventTitle,
      narrative,
      tone,
      feedback,
    };
  } catch {
    return null;
  }
}

let cachedAiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (process.env.VITEST === 'true') {
    return null;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAiClient;
}

export async function generateDecisionNarrative(
  input: NarrativeGenerationInput,
  rateLimitKeyOrContext: string | NarrativeRateLimitContext = 'global',
  customClient?: { generateContent: (params: unknown) => Promise<{ text?: string }> }
): Promise<NarrativeGenerationOutput> {
  const fallbackResult = (withTurbulenceNotice: boolean): NarrativeGenerationOutput => ({
    eventTitle: input.fallback.eventTitle,
    narrative: input.fallback.deterministicNarrative,
    tone: input.fallback.tone,
    feedback: input.fallback.feedback,
    aiEnhanced: false,
    ...(withTurbulenceNotice
      ? {
          turbulenceNotice:
            'The simulation hit a turbulence patch. Your progress is safe.',
        }
      : {}),
  });

  if (!checkNarrativeRateLimit(rateLimitKeyOrContext)) {
    return fallbackResult(false);
  }

  const ai = customClient ? { models: customClient } : getAiClient();
  if (!ai) {
    return fallbackResult(false);
  }

  const promptPayload = JSON.stringify({
    challengeTitle: sanitizePlainText(input.challengeTitle, 80),
    stage: sanitizePlainText(input.roundLabel, 60),
    dilemma: sanitizePlainText(input.decisionPrompt, 200),
    playerDecision: sanitizePlainText(input.selectedOptionTitle, 140),
    decisionRationale: sanitizePlainText(input.selectedOptionDescription, 200),
    stateBefore: input.stateBefore,
    stateAfter: input.stateAfter,
    coreOutcomeAnchor: input.fallback.deterministicNarrative,
  });

  const executeCall = async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate a concise, vivid scenario simulation consequence for this player decision. Stay strictly anchored to the deterministic outcome and state numbers provided:\n${promptPayload}`,
      config: {
        systemInstruction:
          'You are the narrative chronicler for Challenge Arena, a high-stakes decision-simulation game. Never invent numbers, rules, or outcomes that contradict stateAfter or coreOutcomeAnchor. Keep eventTitle under 60 chars, narrative to 2 crisp sentences (max 260 chars), and feedback to 1 analytical sentence (max 160 chars). Never output HTML or markdown.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            eventTitle: {
              type: Type.STRING,
              description: 'Short headline for the immediate consequence.',
            },
            narrative: {
              type: Type.STRING,
              description: '2 concise sentences describing what happens next.',
            },
            tone: {
              type: Type.STRING,
              description: 'One of: exciting, tense, strategic, cautious, analytical',
            },
            feedback: {
              type: Type.STRING,
              description: '1 sentence explaining the strategic trade-off of this choice.',
            },
          },
          required: ['eventTitle', 'narrative', 'tone', 'feedback'],
        },
      },
    });
    return validateAndSanitizeGeminiResponse(response.text);
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const validated = await executeCall();
      if (validated) {
        return {
          ...validated,
          aiEnhanced: true,
        };
      }
    } catch (err) {
      if (attempt === 1) {
        console.warn(
          'Gemini narrative fallback activated after retry:',
          err instanceof Error ? err.message : String(err)
        );
      }
    }
  }

  return fallbackResult(true);
}
