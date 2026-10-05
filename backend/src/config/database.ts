import mongoose from 'mongoose';

/**
 * Connects to MongoDB. The connection string is never logged.
 */
export async function connectDatabase(uri: string): Promise<void> {
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('[db] MongoDB reconnected');
  });
  mongoose.connection.on('error', (error: Error) => {
    console.error(`[db] MongoDB error: ${error.message}`);
  });

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  console.log(`[db] Connected to MongoDB (database: ${mongoose.connection.name})`);
}

/** True only when Mongoose reports an open connection (readyState 1). */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) {
    await mongoose.disconnect();
    console.log('[db] MongoDB connection closed');
  }
}
