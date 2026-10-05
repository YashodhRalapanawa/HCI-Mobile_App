import { createServer } from 'node:http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

const app = createApp();
const server = createServer(app);

async function start(): Promise<void> {
  if (env.MONGODB_URI) {
    try {
      await connectDatabase(env.MONGODB_URI);
    } catch (error) {
      console.error(
        `[db] Could not connect to MongoDB: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      process.exit(1);
    }
  } else {
    console.warn(
      '[db] MONGODB_URI is not set — starting WITHOUT a database (scaffold/dev mode). ' +
        '/api/ready will return 503 until a database is configured in backend/.env.',
    );
  }

  server.listen(env.PORT, () => {
    console.log(`[server] API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} received, shutting down...`);

  const forceExit = setTimeout(() => {
    console.error('[server] Forced exit after timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    await new Promise<void>((resolve, reject) => {
      if (!server.listening) return resolve();
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeIdleConnections();
    });
    console.log('[server] HTTP server closed');
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('[server] Error during shutdown:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

void start();
