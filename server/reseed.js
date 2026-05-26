import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const reseed = async () => {
  const sqlPath = path.join(__dirname, 'init.sql');
  console.log('Reading database seed file:', sqlPath);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = await pool.connect();
  try {
    console.log('Starting database reseed transaction...');
    await client.query('BEGIN');
    
    // Explicitly drop tables with cascade to clean slate
    await client.query('DROP TABLE IF EXISTS activity_logs CASCADE;');
    await client.query('DROP TABLE IF EXISTS system_users CASCADE;');
    await client.query('DROP TABLE IF EXISTS units CASCADE;');
    await client.query('DROP TABLE IF EXISTS companies CASCADE;');
    await client.query('DROP TABLE IF EXISTS settings CASCADE;');
    
    console.log('Executing init.sql database script...');
    await client.query(sql);
    
    await client.query('COMMIT');
    console.log('Database successfully reseeded!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database reseed failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

reseed();
