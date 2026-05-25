import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Log incoming requests in dev/prod
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- API ROUTES ---

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// 1. GET ALL COMPANIES (including nested Units)
app.get('/api/companies', async (req, res) => {
  try {
    const result = await query(`
      SELECT c.id, c.company_name as "companyName", c.pic_name as "picName", 
             c.department, c.email,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', u.id,
                   'serialNumber', u.serial_number,
                   'batteryModel', u.battery_model,
                   'contractStartDate', u.contract_start_date::text,
                   'claimCount', u.claim_count,
                   'applicationDate', u.application_date::text,
                   'unitPrice', u.unit_price,
                   'discount', u.discount,
                   'statusOverride', u.status_override,
                   'sourceChannel', u.source_channel
                 )
               ) FILTER (WHERE u.id IS NOT NULL), '[]'
             ) as units
      FROM companies c
      LEFT JOIN units u ON c.id = u.company_id
      GROUP BY c.id
      ORDER BY c.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// 2. CREATE COMPANY
app.post('/api/companies', async (req, res) => {
  const { id, companyName, picName, department, email } = req.body;
  try {
    const result = await query(
      `INSERT INTO companies (id, company_name, pic_name, department, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company_name as "companyName", pic_name as "picName", department, email`,
      [id, companyName || 'PRIVATE_RECORD', picName || '', department || 'N/A', email || 'private@compliance.local']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// 3. CREATE UNITS IN BULK
app.post('/api/units/bulk', async (req, res) => {
  const { units } = req.body; // Expects array of units
  if (!Array.isArray(units) || units.length === 0) {
    return res.status(400).json({ error: 'No units provided' });
  }
  
  try {
    // Start transaction
    await query('BEGIN');
    const insertedUnits = [];

    for (const unit of units) {
      const { id, serialNumber, batteryModel, contractStartDate, applicationDate, claimCount, unitPrice, discount, statusOverride, sourceChannel, companyId } = unit;
      
      const result = await query(
        `INSERT INTO units (id, serial_number, battery_model, contract_start_date, application_date, claim_count, unit_price, discount, status_override, source_channel, company_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, serial_number as "serialNumber", battery_model as "batteryModel", 
                   contract_start_date::text as "contractStartDate", claim_count as "claimCount", 
                   application_date::text as "applicationDate", unit_price as "unitPrice", 
                   discount, status_override as "statusOverride", source_channel as "sourceChannel", 
                   company_id as "companyId"`,
        [
          id, 
          serialNumber, 
          batteryModel, 
          contractStartDate, 
          applicationDate || null, 
          claimCount || 0, 
          unitPrice || 0, 
          discount || 0, 
          statusOverride || null, 
          sourceChannel || null, 
          companyId
        ]
      );
      insertedUnits.push(result.rows[0]);
    }
    
    await query('COMMIT');
    res.status(201).json({ count: insertedUnits.length, units: insertedUnits });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error inserting units bulk:', error);
    res.status(500).json({ error: 'Failed to insert units in bulk', details: error.message });
  }
});

// 4. UPDATE UNIT DETAILS
app.put('/api/units/:id', async (req, res) => {
  const { id } = req.params;
  const { serialNumber, batteryModel, contractStartDate, applicationDate, claimCount, statusOverride, sourceChannel } = req.body;
  
  try {
    const result = await query(
      `UPDATE units
       SET serial_number = COALESCE($1, serial_number),
           battery_model = COALESCE($2, battery_model),
           contract_start_date = COALESCE($3, contract_start_date::date),
           application_date = CASE WHEN $4::text IS NOT NULL THEN $4::date ELSE application_date END,
           claim_count = COALESCE($5, claim_count),
           status_override = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE status_override END,
           source_channel = CASE WHEN $7::text IS NOT NULL THEN $7 ELSE source_channel END
       WHERE id = $8
       RETURNING id, serial_number as "serialNumber", battery_model as "batteryModel", 
                 contract_start_date::text as "contractStartDate", claim_count as "claimCount", 
                 application_date::text as "applicationDate", status_override as "statusOverride", 
                 source_channel as "sourceChannel"`,
      [serialNumber, batteryModel, contractStartDate, applicationDate, claimCount, statusOverride, sourceChannel, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating unit:', error);
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

// 5. DELETE UNIT
app.delete('/api/units/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM units WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }
    res.json({ message: 'Unit deleted successfully', id });
  } catch (error) {
    console.error('Error deleting unit:', error);
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

// 6. GET SYSTEM USERS
app.get('/api/system-users', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, status, last_login as "lastLogin"
       FROM system_users
       ORDER BY id ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching system users:', error);
    res.status(500).json({ error: 'Failed to fetch system users' });
  }
});

// 7. CREATE SYSTEM USER
app.post('/api/system-users', async (req, res) => {
  const { id, name, email, role, status, lastLogin } = req.body;
  try {
    const result = await query(
      `INSERT INTO system_users (id, name, email, role, status, last_login)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, status, last_login as "lastLogin"`,
      [id, name, email, role, status, lastLogin || 'Never']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating system user:', error);
    res.status(500).json({ error: 'Failed to create system user' });
  }
});

// 8. UPDATE SYSTEM USER
app.put('/api/system-users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role, status, lastLogin } = req.body;
  try {
    const result = await query(
      `UPDATE system_users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           role = COALESCE($3, role),
           status = COALESCE($4, status),
           last_login = COALESCE($5, last_login)
       WHERE id = $6
       RETURNING id, name, email, role, status, last_login as "lastLogin"`,
      [name, email, role, status, lastLogin, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'System user not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating system user:', error);
    res.status(500).json({ error: 'Failed to update system user' });
  }
});

// 9. DELETE SYSTEM USER
app.delete('/api/system-users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('DELETE FROM system_users WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'System user not found' });
    }
    res.json({ message: 'System user deleted successfully', id });
  } catch (error) {
    console.error('Error deleting system user:', error);
    res.status(500).json({ error: 'Failed to delete system user' });
  }
});

// 10. GET ACTIVITY LOGS
app.get('/api/activity-logs', async (req, res) => {
  try {
    const result = await query(
      `SELECT unit_id as "id", serial_number as "serialNumber", company_id as "company", 
              processed_by as "processedBy", action, status, timestamp, date::text as "date", is_bot as "isBot"
       FROM activity_logs
       ORDER BY date DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// 11. CREATE ACTIVITY LOG
app.post('/api/activity-logs', async (req, res) => {
  const { id, serialNumber, company, processedBy, action, status, isBot } = req.body;
  try {
    const result = await query(
      `INSERT INTO activity_logs (unit_id, serial_number, company_id, processed_by, action, status, timestamp, date, is_bot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
       RETURNING unit_id as "id", serial_number as "serialNumber", company_id as "company", 
                 processed_by as "processedBy", action, status, timestamp, date::text as "date", is_bot as "isBot"`,
      [id, serialNumber || null, company || null, processedBy, action, status, 'Just now', isBot || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({ error: 'Failed to create activity log' });
  }
});

// 12. GET APP SETTINGS (Models list)
app.get('/api/settings/models', async (req, res) => {
  try {
    const result = await query("SELECT value FROM settings WHERE key = 'battery_models'");
    if (result.rowCount === 0) {
      // Return defaults if not set in DB
      const defaultModels = ['BAT-Z500 (Enterprise)', 'BAT-X100 (Commercial)', 'BAT-V200 (Industrial)'];
      return res.json(defaultModels);
    }
    res.json(result.rows[0].value);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

// 13. UPDATE/ADD MODEL SKU
app.post('/api/settings/models', async (req, res) => {
  const { models } = req.body; // Expects full array of models
  if (!Array.isArray(models)) {
    return res.status(400).json({ error: 'Invalid models array format' });
  }
  try {
    await query(
      `INSERT INTO settings (key, value)
       VALUES ('battery_models', $1)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value
       RETURNING value`,
      [JSON.stringify(models)]
    );
    res.json({ message: 'Models updated successfully', models });
  } catch (error) {
    console.error('Error saving models settings:', error);
    res.status(500).json({ error: 'Failed to save models settings' });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`Backend API server running in production mode on port ${PORT}`);
});
