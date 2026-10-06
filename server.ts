import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/api.js';
import { enforceProductionSecurityOrExit } from './src/server/config-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  // Mount authoritative API routes
  app.use('/api', apiRouter);

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd && process.env.VITEST !== 'true' && process.env.VERCEL !== '1') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (isProd && process.env.VERCEL !== '1') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

if (process.env.VITEST !== 'true' && process.env.VERCEL !== '1') {
  const PORT = Number(process.env.PORT) || 3000;
  enforceProductionSecurityOrExit()
    .then(() => createApp())
    .then((app) => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Challenge Arena server running on http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start Challenge Arena server:', err);
      process.exit(1);
    });
}

