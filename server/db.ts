import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

const { Pool: PgPool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use standard pg for local development (localhost), Neon for production
const isLocalDb = process.env.DATABASE_URL.includes('localhost');

let pool: any;
let db: any;

if (isLocalDb) {
  // PERFORMANCE FIX: Increased connection pool size for concurrent load
  // Local PostgreSQL connection
  pool = new PgPool({
    connectionString: process.env.DATABASE_URL,
    min: 10,
    max: 50, // Increased from default 10 to handle concurrent requests
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  db = drizzlePg(pool, { schema });
} else {
  // PERFORMANCE FIX: Increased connection pool size for Neon serverless
  // Neon serverless connection
  neonConfig.webSocketConstructor = ws;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    min: 10,
    max: 50, // Increased from default to handle concurrent requests
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  db = drizzle({ client: pool, schema });
}

export { pool, db };
