import { ChallengeDefinitionServer } from '../../engine/types.js';
import { business1000Challenge } from './business1000.js';
import { survive30daysChallenge } from './survive30days.js';
import { startupcrisisChallenge } from './startupcrisis.js';
import { strangecityChallenge } from './strangecity.js';
import { negotiationChallenge } from './negotiation.js';
import { hours24Challenge } from './24hours.js';
import { careerChallenge } from './career.js';
import { ethicaldilemmaChallenge } from './ethicaldilemma.js';
import { perfecttripChallenge } from './perfecttrip.js';
import { mysteryChallenge } from './mystery.js';

export const CHALLENGE_REGISTRY: ChallengeDefinitionServer[] = [
  business1000Challenge,
  survive30daysChallenge,
  startupcrisisChallenge,
  strangecityChallenge,
  negotiationChallenge,
  hours24Challenge,
  careerChallenge,
  ethicaldilemmaChallenge,
  perfecttripChallenge,
  mysteryChallenge,
];

const CHALLENGE_MAP = new Map<string, ChallengeDefinitionServer>(
  CHALLENGE_REGISTRY.map((c) => [c.id, c])
);

const CHALLENGE_SLUG_MAP = new Map<string, ChallengeDefinitionServer>(
  CHALLENGE_REGISTRY.map((c) => [c.slug, c])
);

export function getAllChallenges(): ChallengeDefinitionServer[] {
  return CHALLENGE_REGISTRY.filter((c) => c.published);
}

export function getAllChallengeTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const challenge of getAllChallenges()) {
    for (const rawTag of challenge.tags) {
      const tag = rawTag.trim();
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag);
    });
}

export function getChallengesByTag(tag: string): ChallengeDefinitionServer[] {
  const normalized = tag.trim().toLowerCase();
  if (!normalized || normalized === 'all') {
    return getAllChallenges();
  }
  return getAllChallenges().filter((c) =>
    c.tags.some((t) => t.toLowerCase() === normalized)
  );
}

export function getChallengeByIdOrSlug(
  idOrSlug: string
): ChallengeDefinitionServer | undefined {
  return CHALLENGE_MAP.get(idOrSlug) || CHALLENGE_SLUG_MAP.get(idOrSlug);
}

export function getDailyChallengeForDate(dateKey: string): {
  dateKey: string;
  challenge: ChallengeDefinitionServer;
  seed: string;
} {
  const published = getAllChallenges();
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const index = hash % published.length;
  const challenge = published[index] || published[0];
  return {
    dateKey,
    challenge,
    seed: `daily-${dateKey}-v${challenge.version}`,
  };
}
