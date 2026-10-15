import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const ANON_COOKIE_NAME = 'arena_anon_cred';

const COOKIE_SIGNING_SECRET =
  process.env.ARENA_COOKIE_SECRET ||
  process.env.GEMINI_API_KEY ||
  'challenge-arena-anon-credential-hmac-secret-v1';

export interface AuthenticatedArenaRequest extends Request {
  anonUid?: string;
  isNewAnonCred?: boolean;
  clientIp?: string;
}

export function generateOpaqueAnonUid(): string {
  return `anon_${crypto.randomBytes(12).toString('hex')}`;
}

export function signAnonCredential(anonUid: string): string {
  const hmac = crypto
    .createHmac('sha256', COOKIE_SIGNING_SECRET)
    .update(anonUid)
    .digest('base64url');
  return `${anonUid}.${hmac}`;
}

export function verifyAnonCredential(rawCookieValue: string | undefined): string | null {
  if (!rawCookieValue || typeof rawCookieValue !== 'string') {
    return null;
  }
  const parts = rawCookieValue.trim().split('.');
  if (parts.length !== 2) {
    return null;
  }
  const [anonUid, signature] = parts;
  if (!/^anon_[a-f0-9]{16,64}$/.test(anonUid) || !signature) {
    return null;
  }
  const expectedSig = crypto
    .createHmac('sha256', COOKIE_SIGNING_SECRET)
    .update(anonUid)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  return anonUid;
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}

export function extractClientIp(req: Request): string {
  // The trusted proxy appends the connecting client's address to the END of
  // x-forwarded-for. Entries before it are client-supplied and forgeable, so
  // only the last entry is used. Assumes exactly one trusted proxy in front.
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded.join(',') : forwarded;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

export function anonymousCredentialMiddleware(
  req: AuthenticatedArenaRequest,
  res: Response,
  next: NextFunction
): void {
  req.clientIp = extractClientIp(req);

  const cookies = parseCookies(req.headers.cookie);
  const existingToken = cookies[ANON_COOKIE_NAME];
  const verifiedAnonUid = verifyAnonCredential(existingToken);

  if (verifiedAnonUid) {
    req.anonUid = verifiedAnonUid;
    req.isNewAnonCred = false;
    next();
    return;
  }

  const newAnonUid = generateOpaqueAnonUid();
  const signedToken = signAnonCredential(newAnonUid);
  req.anonUid = newAnonUid;
  req.isNewAnonCred = true;

  const isHttps =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production';

  const sameSiteValue = isHttps ? 'None' : 'Lax';
  const cookieString = [
    `${ANON_COOKIE_NAME}=${encodeURIComponent(signedToken)}`,
    'Path=/',
    'Max-Age=31536000',
    'HttpOnly',
    'Secure',
    `SameSite=${sameSiteValue}`,
  ].join('; ');

  res.setHeader('Set-Cookie', cookieString);
  next();
}
