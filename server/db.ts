import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration with proper error handling
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'), // Increased to 30 seconds for slow connections
  // Note: maxLifetimeMillis is not available in pg PoolConfig, connections are managed by idleTimeoutMillis
  allowExitOnIdle: false, // Don't allow the pool to exit when idle
  // Add statement_timeout to prevent queries from hanging indefinitely
  // This is set at the connection level via connectionString or query_timeout
};

export const pool = new Pool(poolConfig);

// Handle pool errors gracefully
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  // Don't exit the process, just log the error
});

// Handle connection errors
pool.on('connect', (client) => {
  // Set statement timeout for this connection (30 seconds)
  client.query('SET statement_timeout = 30000').catch(err => {
    console.error('Failed to set statement timeout:', err);
  });
});

// Handle connection removal
pool.on('remove', (client) => {
  console.log('Client removed from pool');
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