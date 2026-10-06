const PLAYER_ID_KEY = 'challenge_arena_player_id';
const PLAYER_NAME_KEY = 'challenge_arena_player_name';

const ADJECTIVES = [
  'Swift',
  'Tactical',
  'Bold',
  'Sharp',
  'Steady',
  'Vanguard',
  'Apex',
  'Prime',
  'Silent',
  'Vector',
];

const NOUNS = [
  'Strategist',
  'Navigator',
  'Architect',
  'Challenger',
  'Operator',
  'Catalyst',
  'Voyager',
  'Solver',
  'Falcon',
  'Sentinel',
];

export function getOrCreatePlayerIdentity(): {
  playerId: string;
  playerName: string;
} {
  if (typeof window === 'undefined') {
    return { playerId: 'anon_server', playerName: 'Anonymous Player' };
  }

  let playerId = localStorage.getItem(PLAYER_ID_KEY);
  if (!playerId || !/^[a-zA-Z0-9_-]+$/.test(playerId)) {
    const rand = Math.random().toString(36).slice(2, 10);
    playerId = `plr_${Date.now().toString(36)}_${rand}`;
    localStorage.setItem(PLAYER_ID_KEY, playerId);
  }

  let playerName = localStorage.getItem(PLAYER_NAME_KEY);
  if (!playerName) {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(10 + Math.random() * 89);
    playerName = `${adj} ${noun} ${num}`;
    localStorage.setItem(PLAYER_NAME_KEY, playerName);
  }

  return { playerId, playerName };
}

export function setLocalPlayerName(newName: string): string {
  const clean = newName.trim().slice(0, 40) || 'Anonymous Player';
  if (typeof window !== 'undefined') {
    localStorage.setItem(PLAYER_NAME_KEY, clean);
  }
  return clean;
}

export type ArenaAnalyticsEvent =
  | 'landing_view'
  | 'challenge_view'
  | 'challenge_started'
  | 'decision_made'
  | 'challenge_completed'
  | 'result_shared'
  | 'challenge_invite_created'
  | 'challenge_invite_opened'
  | 'friend_challenge_started'
  | 'friend_score_beaten'
  | 'signup_started'
  | 'signup_completed';

export async function trackArenaEvent(
  eventType: ArenaAnalyticsEvent,
  params?: {
    challengeId?: string;
    sessionId?: string;
    shareToken?: string;
    metadata?: Record<string, string | number | boolean>;
  }
): Promise<void> {
  try {
    const { playerId } = getOrCreatePlayerIdentity();
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        playerId,
        ...params,
      }),
    });
  } catch {
    // Non-blocking analytics
  }
}
