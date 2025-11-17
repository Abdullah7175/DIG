import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration with proper error handling
// Reduced pool size to lower memory usage
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '10'), // Reduced from 20 to 10 to save memory
  min: parseInt(process.env.DB_POOL_MIN || '2'), // Reduced from 5 to 2 to save memory
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '20000'), // Reduced from 30s to 20s
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // Return an error after 10 seconds if connection could not be established
  // Note: maxLifetimeMillis is not available in pg PoolConfig, connections are managed by idleTimeoutMillis
  allowExitOnIdle: false, // Don't allow the pool to exit when idle
};

export const pool = new Pool(poolConfig);

// Handle pool errors gracefully
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  // Don't exit the process, just log the error
});

// Test connection on startup
pool.connect()
  .then((client) => {
    console.log('Database connection established successfully');
    client.release();
  })
  .catch((err) => {
    console.error('Failed to establish database connection:', err);
    // Don't throw here, let the app start and retry on first query
  });

export const db = drizzle(pool, { schema });