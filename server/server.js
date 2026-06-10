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
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date() });
  } catch (err) {
    console.error('Healthcheck database connection failed:', err.message);
    res.status(500).json({ status: 'degraded', error: 'Database connection failed', timestamp: new Date() });
  }
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
  const { id, name, email, role, status, lastLogin, password } = req.body;
  try {
    const result = await query(
      `INSERT INTO system_users (id, name, email, role, status, last_login, password)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, status, last_login as "lastLogin"`,
      [id, name, email, role, status, lastLogin || 'Never', password || 'password123']
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
              processed_by as "processedBy", action, status, timestamp, date, is_bot as "isBot"
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

// 13b. GET APP SETTINGS (Partners list)
app.get('/api/settings/partners', async (req, res) => {
  try {
    const result = await query("SELECT value FROM settings WHERE key = 'partners'");
    if (result.rowCount === 0) {
      const defaultPartners = ["Source 1", "Source 2", "Source 3", "Source 4"];
      return res.json(defaultPartners);
    }
    res.json(result.rows[0].value);
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
});

// 13c. UPDATE/ADD PARTNERS
app.post('/api/settings/partners', async (req, res) => {
  const { partners } = req.body; // Expects full array of partners
  if (!Array.isArray(partners)) {
    return res.status(400).json({ error: 'Invalid partners array format' });
  }
  try {
    await query(
      `INSERT INTO settings (key, value)
       VALUES ('partners', $1)
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value
       RETURNING value`,
      [JSON.stringify(partners)]
    );
    res.json({ message: 'Partners updated successfully', partners });
  } catch (error) {
    console.error('Error saving partners settings:', error);
    res.status(500).json({ error: 'Failed to save partners settings' });
  }
});

// 13d. RESET SYSTEM DATA (Truncate units and activity logs for fresh imports)
app.post('/api/settings/reset', async (req, res) => {
  try {
    await query('TRUNCATE TABLE units, activity_logs CASCADE');
    res.json({ message: 'Database reset successfully' });
  } catch (error) {
    console.error('Error resetting database:', error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// --- 13e. LOGISTICS TRACKING MODULE ---

// Fetch all logistics records
app.get('/api/logistics', async (req, res) => {
  try {
    const result = await query(`
      SELECT lt.application_id as "applicationId", lt.shipping_type as "shippingType",
             lt.courier_name as "courierName", lt.tracking_number as "trackingNumber",
             lt.shipping_status as "shippingStatus", lt.current_location as "currentLocation",
             lt.last_updated as "lastUpdated",
             u.serial_number as "serialNumber", u.battery_model as "batteryModel"
      FROM logistics_tracking lt
      LEFT JOIN units u ON lt.application_id = u.id
      ORDER BY lt.last_updated DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching logistics:', error);
    res.status(500).json({ error: 'Failed to fetch logistics data' });
  }
});

// Create/Register a new tracking record for a unit
app.post('/api/logistics', async (req, res) => {
  const { applicationId, shippingType, courierName, trackingNumber, shippingStatus, currentLocation } = req.body;
  if (!applicationId || !shippingType || !courierName || !trackingNumber || !shippingStatus || !currentLocation) {
    return res.status(400).json({ error: 'Missing required tracking details' });
  }
  
  try {
    await query('BEGIN');

    await query(`
      INSERT INTO logistics_tracking (application_id, shipping_type, courier_name, tracking_number, shipping_status, current_location)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (application_id) 
      DO UPDATE SET shipping_type = EXCLUDED.shipping_type, 
                    courier_name = EXCLUDED.courier_name,
                    tracking_number = EXCLUDED.tracking_number,
                    shipping_status = EXCLUDED.shipping_status,
                    current_location = EXCLUDED.current_location,
                    last_updated = NOW()
    `, [applicationId, shippingType, courierName, trackingNumber, shippingStatus, currentLocation]);

    // Handle status triggers on initial creation if status is DELIVERED
    let statusOverrideToSet = null;
    if (shippingStatus === 'DELIVERED') {
      if (shippingType === 'INBOUND') {
        statusOverrideToSet = 'In Repair';
      } else if (shippingType === 'OUTBOUND') {
        statusOverrideToSet = 'Closed';
      }
    }

    if (statusOverrideToSet) {
      await query("UPDATE units SET status_override = $1 WHERE id = $2", [statusOverrideToSet, applicationId]);
      
      const unitResult = await query("SELECT serial_number, company_id FROM units WHERE id = $1", [applicationId]);
      if (unitResult.rowCount > 0) {
        const u = unitResult.rows[0];
        await query(`
          INSERT INTO activity_logs (unit_id, serial_number, company_id, processed_by, action, status, timestamp, date, is_bot)
          VALUES ($1, $2, $3, $4, 'Delivery Active Sync', $5, 'Just now', NOW(), TRUE)
        `, [applicationId, u.serial_number, u.company_id, 'System Bot', statusOverrideToSet]);
      }
    }

    await query('COMMIT');
    
    const joinedResult = await query(`
      SELECT lt.application_id as "applicationId", lt.shipping_type as "shippingType",
             lt.courier_name as "courierName", lt.tracking_number as "trackingNumber",
             lt.shipping_status as "shippingStatus", lt.current_location as "currentLocation",
             lt.last_updated as "lastUpdated",
             u.serial_number as "serialNumber", u.battery_model as "batteryModel"
      FROM logistics_tracking lt
      LEFT JOIN units u ON lt.application_id = u.id
      WHERE lt.application_id = $1
    `, [applicationId]);
    
    res.status(201).json(joinedResult.rows[0]);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error creating tracking:', error);
    res.status(500).json({ error: 'Failed to create tracking record' });
  }
});

// Update an existing logistics tracking record manually
app.put('/api/logistics/:applicationId', async (req, res) => {
  const { applicationId } = req.params;
  const { shippingStatus, currentLocation } = req.body;

  if (!shippingStatus || !currentLocation) {
    return res.status(400).json({ error: 'Missing required status or location' });
  }
  
  try {
    await query('BEGIN');
    
    const checkRes = await query("SELECT shipping_type FROM logistics_tracking WHERE application_id = $1", [applicationId]);
    if (checkRes.rowCount === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Tracking record not found' });
    }
    
    const { shipping_type } = checkRes.rows[0];
    
    await query(`
      UPDATE logistics_tracking
      SET shipping_status = $1, current_location = $2, last_updated = NOW()
      WHERE application_id = $3
    `, [shippingStatus, currentLocation, applicationId]);
    
    let statusOverrideToSet = null;
    if (shippingStatus === 'DELIVERED') {
      if (shipping_type === 'INBOUND') {
        statusOverrideToSet = 'In Repair';
      } else if (shipping_type === 'OUTBOUND') {
        statusOverrideToSet = 'Closed';
      }
    }
    
    if (statusOverrideToSet) {
      await query("UPDATE units SET status_override = $1 WHERE id = $2", [statusOverrideToSet, applicationId]);
      
      const unitResult = await query("SELECT serial_number, company_id FROM units WHERE id = $1", [applicationId]);
      if (unitResult.rowCount > 0) {
        const u = unitResult.rows[0];
        await query(`
          INSERT INTO activity_logs (unit_id, serial_number, company_id, processed_by, action, status, timestamp, date, is_bot)
          VALUES ($1, $2, $3, $4, 'Delivery Active Sync', $5, 'Just now', NOW(), TRUE)
        `, [applicationId, u.serial_number, u.company_id, 'System Bot', statusOverrideToSet]);
      }
    }
    
    await query('COMMIT');
    
    const joinedResult = await query(`
      SELECT lt.application_id as "applicationId", lt.shipping_type as "shippingType",
             lt.courier_name as "courierName", lt.tracking_number as "trackingNumber",
             lt.shipping_status as "shippingStatus", lt.current_location as "currentLocation",
             lt.last_updated as "lastUpdated",
             u.serial_number as "serialNumber", u.battery_model as "batteryModel"
      FROM logistics_tracking lt
      LEFT JOIN units u ON lt.application_id = u.id
      WHERE lt.application_id = $1
    `, [applicationId]);
    
    res.json(joinedResult.rows[0]);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error updating logistics:', error);
    res.status(500).json({ error: 'Failed to update tracking record' });
  }
});

// 14. AUTH LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await query(
      `SELECT id, name, email, role, status, last_login as "lastLogin", password
       FROM system_users
       WHERE email = $1`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Your account is inactive. Please contact your Super Admin.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    const nowStr = new Date().toLocaleString();
    await query(
      `UPDATE system_users
       SET last_login = $1
       WHERE id = $2`,
      [nowStr, user.id]
    );

    // Remove password from response
    delete user.password;
    user.lastLogin = nowStr;

    res.json({ message: 'Login successful', user });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Self-migration check before starting
const runMigrations = async () => {
  try {
    console.log('Running backend database self-migrations...');
    
    // Ensure ENUM types exist (non-destructive)
    await query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipping_type_enum') THEN
          CREATE TYPE shipping_type_enum AS ENUM ('INBOUND', 'OUTBOUND');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipping_status_enum') THEN
          CREATE TYPE shipping_status_enum AS ENUM ('PREPARING', 'IN_TRANSIT', 'DELIVERED');
        END IF;
      END$$;
    `);

    // Ensure logistics_tracking table exists (non-destructive - preserves existing data)
    await query(`
      CREATE TABLE IF NOT EXISTS logistics_tracking (
        application_id VARCHAR(50) PRIMARY KEY REFERENCES units(id) ON DELETE CASCADE,
        shipping_type shipping_type_enum NOT NULL,
        courier_name TEXT NOT NULL,
        tracking_number TEXT NOT NULL,
        shipping_status shipping_status_enum NOT NULL,
        current_location TEXT NOT NULL,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed only if table is empty (first-time only, never overwrites existing data)
    const trackingCheck = await query("SELECT COUNT(*) FROM logistics_tracking");
    if (parseInt(trackingCheck.rows[0].count, 10) === 0) {
      console.log('logistics_tracking is empty, seeding initial demo records...');
      const unitCheck = await query("SELECT id FROM units WHERE id IN ('NGY-26-071', 'NGY-26-072')");
      if (unitCheck.rowCount >= 2) {
        await query(`
          INSERT INTO logistics_tracking (application_id, shipping_type, courier_name, tracking_number, shipping_status, current_location) VALUES
          ('NGY-26-071', 'INBOUND', 'JNE Express', 'RESI-DUMMY-01', 'PREPARING', 'Warranty Kit handed over to courier at Central Warehouse'),
          ('NGY-26-072', 'OUTBOUND', 'J&T Express', 'RESI-DUMMY-02', 'IN_TRANSIT', 'Warranty Kit in transit to Sortation Center Jakarta')
          ON CONFLICT (application_id) DO NOTHING;
        `);
      }
    }

    // Ensure table structure has password column
    await query(`
      ALTER TABLE system_users ADD COLUMN IF NOT EXISTS password VARCHAR(255) NOT NULL DEFAULT 'password123';
    `);
    
    // Auto-Heal & Seed default users if they are missing or table is empty
    const userCheck = await query("SELECT COUNT(*) FROM system_users");
    const userCount = parseInt(userCheck.rows[0].count, 10);
    
    if (userCount === 0) {
      console.log('Database system_users table is empty! Seeding default administrative accounts...');
      await query(`
        INSERT INTO system_users (id, name, email, password, role, status, last_login) VALUES
        ('USR-001', 'Nur Rahma Atika', 'rahma@presales.com', 'rahma123', 'Super Admin', 'Active', 'Just now'),
        ('USR-002', 'Alex Rivera', 'alex@admin.com', 'alex123', 'Admin', 'Active', '2 hours ago'),
        ('USR-003', 'Siti Sarah', 'sarah@viewer.com', 'sarah123', 'Viewer', 'Active', '1 day ago'),
        ('USR-004', 'Rudi Hartono', 'rudi.h@admin.com', 'rudi123', 'Admin', 'Inactive', '3 days ago');
      `);
    } else {
      // Ensure rahma@presales.com specifically exists as Super Admin
      const rahmaCheck = await query("SELECT * FROM system_users WHERE email = 'rahma@presales.com'");
      if (rahmaCheck.rowCount === 0) {
        console.log('Super Admin rahma@presales.com is missing. Seeding Super Admin account...');
        await query(`
          INSERT INTO system_users (id, name, email, password, role, status, last_login) VALUES
          ('USR-001', 'Nur Rahma Atika', 'rahma@presales.com', 'rahma123', 'Super Admin', 'Active', 'Just now');
        `);
      } else {
        // Guarantee password sync
        await query(`
          UPDATE system_users SET password = 'rahma123' WHERE email = 'rahma@presales.com';
          UPDATE system_users SET password = 'alex123' WHERE email = 'alex@admin.com';
          UPDATE system_users SET password = 'sarah123' WHERE email = 'sarah@viewer.com';
          UPDATE system_users SET password = 'rudi123' WHERE email = 'rudi.h@admin.com';
        `);
      }
    }

    // Seed correct unit type list in settings (always upsert to ensure correct values)
    await query(`
      INSERT INTO settings (key, value)
      VALUES ('battery_models', '["iPhone 15 Pro", "iPhone 15", "iPhone 14"]'::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

      INSERT INTO settings (key, value)
      VALUES ('partners', '["Partner 01", "Partner 02", "Partner 03", "Partner 04"]'::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `);

    // Auto-heal: fix any units with wrong/old battery_model values
    const validModels = ['iPhone 15 Pro', 'iPhone 15', 'iPhone 14', 'iPhone 14 Pro', 'iPhone 13', 'iPhone 13 Pro'];
    const badUnitsCheck = await query(
      `SELECT COUNT(*) FROM units WHERE battery_model NOT IN (${validModels.map((_, i) => `$${i + 1}`).join(',')})`,
      validModels
    );
    const badCount = parseInt(badUnitsCheck.rows[0].count, 10);

    if (badCount > 0) {
      console.log(`[Auto-Heal] Found ${badCount} units with incorrect Unit Type. Fixing now...`);

      // Fix each unit by ID to the correct iPhone model
      await query(`
        UPDATE units SET battery_model = 'iPhone 15 Pro'
        WHERE id IN ('NGY-26-001','NGY-26-002','NGY-26-003','NGY-26-007','NGY-26-008',
                     'NGY-26-011','NGY-26-012','NGY-26-013','NGY-26-016','NGY-26-019',
                     'NGY-26-022','NGY-26-025','NGY-26-028','NGY-26-031','NGY-26-065',
                     'NGY-26-068','NGY-26-071','NGY-26-072');
        UPDATE units SET battery_model = 'iPhone 15'
        WHERE id IN ('NGY-26-004','NGY-26-005','NGY-26-009','NGY-26-014','NGY-26-015',
                     'NGY-26-017','NGY-26-020','NGY-26-023','NGY-26-026','NGY-26-029',
                     'NGY-26-032','NGY-26-066','NGY-26-069');
        UPDATE units SET battery_model = 'iPhone 14'
        WHERE id IN ('NGY-26-006','NGY-26-010','NGY-26-018','NGY-26-021','NGY-26-024',
                     'NGY-26-027','NGY-26-030','NGY-26-067','NGY-26-070');
      `);

      // Fix any remaining unknown units to default model
      await query(
        `UPDATE units SET battery_model = 'iPhone 15 Pro'
         WHERE battery_model NOT IN (${validModels.map((_, i) => `$${i + 1}`).join(',')})`,
        validModels
      );

      console.log('[Auto-Heal] Unit Type fix completed successfully.');
    }

    // Also fix source_channel values to use anonymized Partner names
    await query(`
      UPDATE units SET source_channel = 'Partner 01' WHERE source_channel NOT LIKE 'Partner %' AND source_channel IS NOT NULL;
    `);

    console.log('Database self-migrations and seeding completed successfully.');
  } catch (err) {
    console.error('Database self-migration failed/skipped:', err.message);
  }
};

// Run migrations and then start listening
runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend API server running in production mode on port ${PORT}`);
  });
});
