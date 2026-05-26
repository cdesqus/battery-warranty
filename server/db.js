import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL;
// Enable SSL if explicitly configured, or if we have a DATABASE_URL in production (common for cloud DBs)
const useSSL = process.env.DB_SSL === 'true' || (!!connectionString && isProduction);

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: useSSL ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'presales_db',
        ssl: useSSL ? { rejectUnauthorized: false } : false,
      }
);

// Graceful connection check
pool.on('connect', () => {
  console.log('Successfully connected to the PostgreSQL database.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
