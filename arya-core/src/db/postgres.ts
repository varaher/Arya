import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection pool
let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
      process.exit(-1);
    });

    console.log('✅ PostgreSQL connection pool initialized');
  }

  return pool;
}

// Run migrations
export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const migrationsPath = path.join(__dirname, 'migrations.sql');
  
  try {
    const sql = fs.readFileSync(migrationsPath, 'utf-8');
    await pool.query(sql);
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database health check passed:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ PostgreSQL connection pool closed');
  }
}
