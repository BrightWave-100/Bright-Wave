import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server.js';
import { enforceProductionSecurityOrExit } from '../src/server/config-validator.js';

let cachedAppPromise: ReturnType<typeof createApp> | null = null;
let securityValidated = false;

/**
 * Vercel Serverless Function entry point for Challenge Arena.
 * Lazily initializes and caches the authoritative Express application,
 * enforces production security validation, and delegates incoming HTTP
 * requests without calling app.listen().
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    if (!securityValidated) {
      await enforceProductionSecurityOrExit();
      securityValidated = true;
    }

    if (!cachedAppPromise) {
      cachedAppPromise = createApp();
    }

    const app = await cachedAppPromise;
    app(req, res);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Fatal error in Vercel serverless API handler (/api/index):', errorMsg);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'Authoritative server unavailable.',
          details: process.env.NODE_ENV === 'production' ? undefined : errorMsg,
        })
      );
    }
  }
}
