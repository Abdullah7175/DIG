import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration with proper error handling
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of clients in the pool
  min: parseInt(process.env.DB_POOL_MIN || '5'), // Minimum number of clients in the pool
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // Close idle clients after 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // Return an error after 10 seconds if connection could not be established
  maxLifetimeMillis: parseInt(process.env.DB_MAX_LIFETIME || '1800000'), // Close (and replace) a connection after it has been open for 30 minutes
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