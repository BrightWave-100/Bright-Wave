import { SimulationResult } from '../engine/types';
import { trackArenaEvent } from './player';

export interface ShareLinkPayload {
  shareToken: string;
  url: string;
  shortPath: string;
  title: string;
  text: string;
}

/**
 * Generates a unique client-side fallback token if needed, though server-issued
 * shareTokens are always preferred for authoritative outcome comparison.
 */
export function createUniqueClientToken(): string {
  const randomBytes = new Uint8Array(5);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < 5; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Builds the canonical unique challenge share URL and comparison message for a simulation result.
 */
export function generateChallengeShareLink(
  result: Pick<
    SimulationResult,
    'challengeId' | 'challengeTitle' | 'score' | 'archetype' | 'shareToken'
  > & { playerName?: string },
  customOrigin?: string
): ShareLinkPayload {
  const origin =
    customOrigin ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  const token = result.shareToken || createUniqueClientToken();
  const cleanChallengeId = encodeURIComponent(result.challengeId);
  const cleanToken = encodeURIComponent(token);

  const shortPath = `/challenge/${cleanChallengeId}/beat/${cleanToken}`;
  const url = `${origin.replace(/\/$/, '')}${shortPath}`;
  const title = `Beat my ${result.score}/100 on ${result.challengeTitle} — Challenge Arena`;
  const text = `I scored ${result.score}/100 (${result.archetype}) on "${result.challengeTitle}" in Challenge Arena. Make your choices and compare our outcomes: ${url}`;

  return {
    shareToken: token,
    url,
    shortPath,
    title,
    text,
  };
}

/**
 * Copies text to the clipboard with a resilient DOM fallback for iframe environments.
 */
export async function copyToClipboardResilient(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to textarea copy fallback
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Generates (or verifies with the server) a unique challenge share link for a simulation outcome,
 * copies it to the user's clipboard, and logs viral loop telemetry.
 */
export async function generateAndCopyChallengeShareLink(
  result: Pick<
    SimulationResult,
    'id' | 'sessionId' | 'challengeId' | 'challengeTitle' | 'score' | 'archetype' | 'shareToken'
  > & { playerName?: string },
  options?: {
    mintFreshToken?: boolean;
    copyFullText?: boolean;
  }
): Promise<{
  copied: boolean;
  payload: ShareLinkPayload;
}> {
  let activeShareToken = result.shareToken;

  if (options?.mintFreshToken && result.id) {
    try {
      const res = await fetch('/api/friend-challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId: result.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.invite?.shareToken) {
          activeShareToken = data.invite.shareToken;
        }
      }
    } catch {
      // Fall back to existing result.shareToken if offline
    }
  }

  const payload = generateChallengeShareLink({
    ...result,
    shareToken: activeShareToken,
  });

  const contentToCopy = options?.copyFullText ? payload.text : payload.url;
  const copied = await copyToClipboardResilient(contentToCopy);

  trackArenaEvent('challenge_invite_created', {
    challengeId: result.challengeId,
    sessionId: result.sessionId,
    shareToken: payload.shareToken,
  });

  trackArenaEvent('result_shared', {
    challengeId: result.challengeId,
    sessionId: result.sessionId,
    shareToken: payload.shareToken,
  });

  return {
    copied,
    payload,
  };
}
