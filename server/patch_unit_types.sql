-- =============================================================
-- PATCH: Fix battery_model (Unit Type) values to correct iPhone models
-- Run this on production DB to fix existing wrong unit type data
-- Safe to run multiple times (idempotent)
-- =============================================================

-- Step 1: Fix any obviously wrong / old battery model names
UPDATE units SET battery_model = 'iPhone 15 Pro'
WHERE battery_model NOT IN ('iPhone 15 Pro', 'iPhone 15', 'iPhone 14', 'iPhone 14 Pro', 'iPhone 13', 'iPhone 13 Pro');

-- Step 2: Ensure every unit has a valid unit type based on ID ranges
-- (fallback in case Step 1 set everything to iPhone 15 Pro incorrectly)
-- Override specific units that we know the correct model for:
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

-- Step 3: Fix the settings table to have correct unit type list
INSERT INTO settings (key, value)
VALUES ('battery_models', '["iPhone 15 Pro", "iPhone 15", "iPhone 14"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Step 4: Fix source_channel (partner) values if any are wrong
UPDATE units SET source_channel = 'Partner 01'
WHERE source_channel NOT IN ('Partner 01', 'Partner 02', 'Partner 03', 'Partner 04')
  AND id IN ('NGY-26-001','NGY-26-002','NGY-26-003','NGY-26-004','NGY-26-005',
             'NGY-26-006','NGY-26-007','NGY-26-008');

-- Verify the fix
SELECT id, battery_model, source_channel FROM units ORDER BY id LIMIT 20;
