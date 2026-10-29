import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { apiRouter } from './routes.js';
import { getDb, seedDbIfEmpty } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Basic CORS & JSON parser
  app.use(cors());
  app.use(express.json());

  // Initialize DB & Seed realistic demo data if empty
  const db = getDb();
  seedDbIfEmpty(db);

  // Mount API router
  app.use('/api', apiRouter);

  // Serve static assets if built dist exists
  const distPath = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // Central error handling middleware (Never leak DB stack traces to client)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled server error:', err.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected operational error occurred. Please contact system support.',
    });
  });

  return app;
}
