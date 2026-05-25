import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

// Use DATABASE_URL if available (standard in production environments like Heroku/Render)
// Otherwise, construct from individual DB configuration variables
const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'presales_db',
        ssl: isProduction ? { rejectUnauthorized: false } : false,
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
