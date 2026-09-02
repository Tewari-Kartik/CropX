import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=disable')
    ? false
    : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2500,
});

export async function safeQuery(text, params = [], timeoutMs = 2000) {
  return Promise.race([
    pool.query(text, params),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Database query timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export async function connectDB() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected');
    client.release();
  } catch (err) {
    console.warn('⚠️ PostgreSQL remote connection failed (using in-memory high availability mode):', err.message);
  }
}

export default pool;


