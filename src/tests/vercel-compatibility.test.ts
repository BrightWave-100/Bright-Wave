import { describe, expect, it, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import supertest from 'supertest';
import { createApp } from '../../server.js';
import vercelHandler from '../../api/index.js';
import { setAdminDbForTesting } from '../server/store.js';
import { createInMemoryAdminDb } from '../server/test-admin-db.js';

describe('Vercel Compatibility & Architecture Verification Suite', () => {
  beforeEach(() => {
    const memoryDb = createInMemoryAdminDb();
    setAdminDbForTesting(memoryDb as any);
  });

  it('1. vercel.json exists and contains correct Vite build and rewrite configuration', () => {
    const vercelConfigPath = path.resolve(process.cwd(), 'vercel.json');
    expect(fs.existsSync(vercelConfigPath)).toBe(true);

    const raw = fs.readFileSync(vercelConfigPath, 'utf-8');
    const config = JSON.parse(raw);

    expect(config.version).toBe(2);
    expect(config.framework).toBe('vite');
    expect(config.buildCommand).toBe('npm run build');
    expect(config.outputDirectory).toBe('dist');
    expect(Array.isArray(config.rewrites)).toBe(true);

    const apiRewrite = config.rewrites.find((r: any) => r.source === '/api/(.*)');
    expect(apiRewrite).toBeDefined();
    expect(apiRewrite.destination).toBe('/api/index.ts');

    const spaRewrite = config.rewrites.find((r: any) => r.source === '/(.*)');
    expect(spaRewrite).toBeDefined();
    expect(spaRewrite.destination).toBe('/index.html');
  });

  it('2. /api/index.ts exports a callable serverless request handler', () => {
    expect(typeof vercelHandler).toBe('function');
  });

  it('3. server.ts guards app.listen() with process.env.VERCEL !== "1"', () => {
    const serverPath = path.resolve(process.cwd(), 'server.ts');
    const content = fs.readFileSync(serverPath, 'utf-8');
    expect(content).toContain("process.env.VERCEL !== '1'");
  });

  it('4. Express app created by createApp() mounts all authoritative /api routes', async () => {
    const app = await createApp();
    const client = supertest(app);

    // GET /api/challenges
    const challengesRes = await client.get('/api/challenges');
    expect(challengesRes.status).toBe(200);
    expect(challengesRes.body).toHaveProperty('challenges');
    expect(challengesRes.body).toHaveProperty('availableTags');
    expect(challengesRes.body).toHaveProperty('recentResults');

    // POST /api/analytics
    const analyticsRes = await client
      .post('/api/analytics')
      .send({ eventType: 'page_view', playerId: 'test-player' });
    expect(analyticsRes.status).toBe(201);
    expect(analyticsRes.body).toEqual({ recorded: true });

    // Anonymous cookie is set
    expect(analyticsRes.headers['set-cookie']).toBeDefined();
    const cookieHeader = analyticsRes.headers['set-cookie'][0];
    expect(cookieHeader).toContain('arena_anon_cred');
  });

  it('5. Static security audit: No server secrets have VITE_ prefix or leak to client', () => {
    const frontendDir = path.resolve(process.cwd(), 'src');
    const filesToAudit = ['pages', 'components', 'lib', 'App.tsx', 'main.tsx'];

    for (const sub of filesToAudit) {
      const fullPath = path.join(frontendDir, sub);
      if (!fs.existsSync(fullPath)) continue;

      const walk = (dir: string): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat && stat.isDirectory()) {
            results = results.concat(walk(filePath));
          } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
            results.push(filePath);
          }
        });
        return results;
      };

      const files = fs.statSync(fullPath).isDirectory() ? walk(fullPath) : [fullPath];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for leaked server secrets
        expect(content).not.toContain('ARENA_SERVER_AUTHORITY_SEED');
        expect(content).not.toContain('ARENA_COOKIE_SECRET');
        expect(content).not.toContain('FIREBASE_SERVICE_ACCOUNT_JSON');
        expect(content).not.toContain('VITE_ARENA_SERVER_AUTHORITY_SEED');
        expect(content).not.toContain('VITE_ARENA_COOKIE_SECRET');
        expect(content).not.toContain('VITE_FIREBASE_SERVICE_ACCOUNT_JSON');
        expect(content).not.toContain('VITE_GEMINI_API_KEY');

        // Check that client never accesses authoritative server collections directly
        expect(content).not.toMatch(/collection\(\s*db\s*,\s*['"]arenaPlayers['"]\s*\)/);
        expect(content).not.toMatch(/collection\(\s*db\s*,\s*['"]arenaSessions['"]\s*\)/);
        expect(content).not.toMatch(/collection\(\s*db\s*,\s*['"]arenaResults['"]\s*\)/);
        expect(content).not.toMatch(/collection\(\s*db\s*,\s*['"]serverCommits['"]\s*\)/);
        expect(content).not.toMatch(/collection\(\s*db\s*,\s*['"]serverConfig['"]\s*\)/);
      }
    }
  });
});
