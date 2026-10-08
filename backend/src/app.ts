import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { isDatabaseConnected } from './config/database.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { campaignRouter } from './modules/campaigns/campaign.routes.js';
import { communityRouter } from './modules/community/community.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Liveness: the API process is running.
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness: succeeds only when MongoDB is actually connected.
  app.get('/api/ready', (_req: Request, res: Response) => {
    const connected = isDatabaseConnected();
    res.status(connected ? 200 : 503).json({
      status: connected ? 'ready' : 'unavailable',
      database: connected ? 'connected' : 'disconnected',
    });
  });

  // Member 1 Feature Routes
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/campaigns', campaignRouter);
  app.use('/api/community', communityRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Error handler (4 args required by Express). Avoid leaking internals.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;
    const status =
      typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
        ? error.status
        : 500;
    if (status >= 500) {
      console.error('[app] Unhandled error:', error instanceof Error ? error.message : error);
    }
    res.status(status).json({ error: status >= 500 ? 'Internal Server Error' : 'Bad Request' });
  });

  return app;
}
