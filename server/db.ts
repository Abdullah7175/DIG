import { Pool, PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// One Node process. Postgres max_connections stays at 100, so this pool
// must stay well under that. Keepalives stop idle local connections from
// being treated as dead. statement_timeout is 2 minutes so a tracking
// insert into a large table is not cancelled at 30 seconds.
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '15'),
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '120000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
  allowExitOnIdle: false,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '120000'),
  idle_in_transaction_session_timeout: parseInt(process.env.DB_IDLE_TX_TIMEOUT || '60000'),
};

export const pool = new Pool(poolConfig);

// Handle pool errors gracefully
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  // Don't exit the process, just log the error
});

// Timeouts are set on the pool itself. A SET here used to override them
// back to 30 seconds after every new connection.

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