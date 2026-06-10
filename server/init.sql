-- PostgreSQL Production Schema for Presales Monitoring System

-- Drop tables if they exist (for easy deployment re-runs)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS logistics_tracking CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS system_users CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- 1. Create Companies Table
CREATE TABLE companies (
    id VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    pic_name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
);

-- 2. Create Units Table
CREATE TABLE units (
    id VARCHAR(50) PRIMARY KEY,
    serial_number VARCHAR(50) NOT NULL UNIQUE,
    battery_model VARCHAR(100) NOT NULL,
    contract_start_date DATE NOT NULL,
    claim_count INTEGER NOT NULL DEFAULT 0,
    application_date DATE,
    unit_price NUMERIC(15, 2) NOT NULL,
    discount NUMERIC(5, 4) NOT NULL DEFAULT 0.0000,
    status_override VARCHAR(100),
    source_channel VARCHAR(100),
    company_id VARCHAR(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

-- 3. Create System Users Table
CREATE TABLE system_users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL DEFAULT 'password123',
    role VARCHAR(50) NOT NULL CHECK (role IN ('Super Admin', 'Admin', 'Viewer')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Inactive')),
    last_login VARCHAR(100) NOT NULL DEFAULT 'Never'
);

-- 4. Create Activity Logs Table
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    unit_id VARCHAR(50),
    serial_number VARCHAR(50),
    company_id VARCHAR(50),
    processed_by VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(100) NOT NULL,
    timestamp VARCHAR(100) NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_bot BOOLEAN NOT NULL DEFAULT FALSE
);

-- 5. Create Settings Table
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL
);

-- 6. Create Logistics Tracking Table
DROP TYPE IF EXISTS shipping_type_enum CASCADE;
DROP TYPE IF EXISTS shipping_status_enum CASCADE;

CREATE TYPE shipping_type_enum AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE shipping_status_enum AS ENUM ('PREPARING', 'IN_TRANSIT', 'DELIVERED');

CREATE TABLE logistics_tracking (
    application_id VARCHAR(50) PRIMARY KEY REFERENCES units(id) ON DELETE CASCADE,
    shipping_type shipping_type_enum NOT NULL,
    courier_name TEXT NOT NULL,
    tracking_number TEXT NOT NULL,
    shipping_status shipping_status_enum NOT NULL,
    current_location TEXT NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- --- SEED DATA ---

-- Seed Companies
INSERT INTO companies (id, company_name, pic_name, department, email) VALUES
('COMP-01', 'PT. Logistik Maju', 'Nur Rahma Atika', 'Logistics', 'nur.rahma@logistikmaju.com'),
('COMP-02', 'Mega Konstruksi Tbk', 'Budi Santoso', 'Manufacturing', 'budi@megakonstruksi.com'),
('COMP-03', 'Healthy Care Hospital', 'Siti Aminah', 'Healthcare', 'siti@healthycare.com'),
('COMP-04', 'Global Manufacturing Solutions', 'Andi Wijaya', 'Manufacturing', 'andi@globalmfg.com'),
('COMP-05', 'Apex Analytics', 'Dewi Lestari', 'Data Centers', 'dewi@apex.com'),
('COMP-06', 'CV. Sinar Tekno', 'Rian Putra', 'IT Services', 'rian@sinartekno.com'),
('COMP-07', 'PT. Tech Jaya', 'Eka Sari', 'Data Centers', 'eka@techjaya.com'),
('COMP-08', 'Zenith Ventures', 'Ferry Salim', 'Finance', 'ferry@zenith.com'),
('COMP-09', 'Trans Portindo', 'Gita Permata', 'Logistics', 'gita@transport.com'),
('COMP-10', 'Titik Terang PT', 'Hadi Mulyo', 'Manufacturing', 'hadi@titikterang.com'),
('COMP-11', 'Sinergy Group', 'Indah Sari', 'Data Centers', 'indah@sinergy.com'),
('COMP-12', 'Panca Niaga', 'Jaka Pratama', 'Logistics', 'jaka@pancaniaga.com'),
('COMP-13', 'Prima Agro', 'Kurnia Wahyudi', 'Manufacturing', 'kurnia@primaagro.com'),
('COMP-14', 'Duta Solusi', 'Linda Wati', 'Healthcare', 'linda@dutasolusi.com'),
('COMP-15', 'Karya Mandiri', 'Mulyadi', 'Data Centers', 'mulyadi@karya.com'),
('COMP-16', 'Nusa Gemilang', 'Nina Sari', 'Logistics', 'nina@nusagemilang.com'),
('COMP-17', 'Ocean Blue', 'Oscar Wijaya', 'Manufacturing', 'oscar@oceanblue.com'),
('COMP-18', 'Perkasa Indah', 'Putri Rahayu', 'Healthcare', 'putri@perkasa.com'),
('COMP-19', 'Quick Silver', 'Qori Adilla', 'Data Centers', 'qori@quicksilver.com'),
('COMP-20', 'Royal Garden', 'Rizki Pratama', 'Logistics', 'rizki@royalgarden.com'),
('COMP-21', 'Surya Abadi', 'Siska Lestari', 'Manufacturing', 'siska@suryaabadi.com'),
('COMP-22', 'Tunas Baru', 'Tono Wijaya', 'Healthcare', 'tono@tunasbaru.com'),
('COMP-23', 'Unicorp', 'Umar Dani', 'Data Centers', 'umar@unicorp.com'),
('COMP-24', 'Visi Global', 'Vina Pandu', 'Manufacturing', 'vina@visiglobal.com'),
('COMP-25', 'Celebes Shipping', 'Rudi Saputra', 'Logistics', 'rudi@celebes.com'),
('COMP-26', 'Chemical Indutries', 'Ayu Pratama', 'Manufacturing', 'ayu@chemical.com'),
('COMP-27', 'Care Plus Medical', 'Hendra Wijaya', 'Healthcare', 'hendra@careplus.com'),
('COMP-28', 'Nexus Data System', 'Lestari Pratama', 'Data Centers', 'lestari@nexus.com'),
('COMP-29', 'Papua Trans', 'Eko Wijaya', 'Logistics', 'eko@papuatrans.com'),
('COMP-30', 'Electronics Indo', 'Santi Kusuma', 'Manufacturing', 'santi@electronics.com'),
('COMP-31', 'Bina Nusantara PT', 'Andika Pratama', 'Logistics', 'andika@binanusantara.id');

-- Seed Units
INSERT INTO units (id, serial_number, battery_model, contract_start_date, claim_count, application_date, unit_price, discount, status_override, source_channel, company_id) VALUES
('NGY-26-001', 'SN-100200', 'iPhone 15 Pro', '2024-05-15', 0, '2024-05-15', 200000, 0.10, NULL, 'Partner 01', 'COMP-01'),
('NGY-26-002', 'SN-100201', 'iPhone 15 Pro', '2024-05-15', 0, '2024-05-15', 200000, 0.10, NULL, 'Partner 01', 'COMP-01'),
('NGY-26-003', 'SN-100202', 'iPhone 15 Pro', '2024-05-15', 1, '2024-05-16', 200000, 0.10, NULL, 'Partner 01', 'COMP-01'),
('NGY-26-004', 'SN-200300', 'iPhone 15', '2025-01-10', 0, '2025-01-10', 100000, 0.05, NULL, 'Partner 01', 'COMP-02'),
('NGY-26-005', 'SN-200301', 'iPhone 15', '2025-01-10', 0, '2025-01-11', 100000, 0.05, NULL, 'Partner 01', 'COMP-02'),
('NGY-26-006', 'SN-300400', 'iPhone 14', '2024-11-20', 0, '2024-11-20', 150000, 0.10, NULL, 'Partner 01', 'COMP-03'),
('NGY-26-007', 'SN-400500', 'iPhone 15 Pro', '2025-03-05', 0, '2025-03-05', 200000, 0.15, 'Rejected (Physical Damage)', 'Partner 01', 'COMP-04'),
('NGY-26-008', 'SN-400501', 'iPhone 15 Pro', '2025-03-05', 0, '2025-03-06', 200000, 0.15, 'Rejected (User Error)', 'Partner 01', 'COMP-04'),
('NGY-26-009', 'SN-500600', 'iPhone 15', '2024-08-22', 0, '2024-08-22', 100000, 0.05, NULL, 'Partner 02', 'COMP-05'),
('NGY-26-010', 'SN-600700', 'iPhone 14', '2025-06-12', 0, '2025-06-12', 150000, 0.10, NULL, 'Partner 02', 'COMP-06'),
('NGY-26-011', 'SN-700801', 'iPhone 15 Pro', '2024-10-01', 0, '2024-10-01', 200000, 0.10, NULL, 'Partner 02', 'COMP-07'),
('NGY-26-012', 'SN-700802', 'iPhone 15 Pro', '2024-10-01', 0, '2024-10-01', 200000, 0.10, NULL, 'Partner 02', 'COMP-07'),
('NGY-26-013', 'SN-700803', 'iPhone 15 Pro', '2024-10-01', 0, '2024-10-02', 200000, 0.10, NULL, 'Partner 02', 'COMP-07'),
('NGY-26-014', 'SN-700804', 'iPhone 15', '2024-10-01', 1, '2024-10-15', 100000, 0.10, NULL, 'Partner 02', 'COMP-07'),
('NGY-26-015', 'SN-700805', 'iPhone 15', '2023-01-01', 0, '2023-01-01', 100000, 0.10, NULL, 'Partner 02', 'COMP-07'),
('NGY-26-016', 'SN-800900', 'iPhone 15 Pro', '2026-02-14', 0, '2026-02-14', 200000, 0.10, NULL, 'Partner 02', 'COMP-08'),
('NGY-26-017', 'SN-900011', 'iPhone 15', '2025-11-22', 0, '2025-11-22', 100000, 0.05, NULL, 'Partner 03', 'COMP-09'),
('NGY-26-018', 'SN-011122', 'iPhone 14', '2024-04-30', 1, '2024-04-30', 150000, 0.10, NULL, 'Partner 03', 'COMP-10'),
('NGY-26-019', 'SN-122233', 'iPhone 15 Pro', '2025-12-05', 0, '2025-12-05', 200000, 0.10, NULL, 'Partner 03', 'COMP-11'),
('NGY-26-020', 'SN-233344', 'iPhone 15', '2024-07-18', 0, '2024-07-18', 100000, 0.05, NULL, 'Partner 03', 'COMP-12'),
('NGY-26-021', 'SN-344455', 'iPhone 14', '2025-05-10', 0, '2025-05-10', 150000, 0.10, NULL, 'Partner 03', 'COMP-13'),
('NGY-26-022', 'SN-455566', 'iPhone 15 Pro', '2024-03-25', 0, '2024-03-25', 200000, 0.10, NULL, 'Partner 03', 'COMP-14'),
('NGY-26-023', 'SN-566677', 'iPhone 15', '2026-01-30', 0, '2026-01-30', 100000, 0.15, NULL, 'Partner 03', 'COMP-15'),
('NGY-26-024', 'SN-677788', 'iPhone 14', '2025-08-12', 0, '2025-08-12', 150000, 0.05, NULL, 'Partner 03', 'COMP-16'),
('NGY-26-025', 'SN-788899', 'iPhone 15 Pro', '2024-09-18', 0, '2024-09-18', 200000, 0.10, NULL, 'Partner 04', 'COMP-17'),
('NGY-26-026', 'SN-899900', 'iPhone 15', '2025-02-22', 0, '2025-02-22', 100000, 0.10, NULL, 'Partner 04', 'COMP-18'),
('NGY-26-027', 'SN-900027', 'iPhone 14', '2024-12-05', 0, '2024-12-05', 150000, 0.05, NULL, 'Partner 04', 'COMP-19'),
('NGY-26-028', 'SN-011128', 'iPhone 15 Pro', '2025-04-18', 1, '2025-04-18', 200000, 0.10, NULL, 'Partner 04', 'COMP-20'),
('NGY-26-029', 'SN-122239', 'iPhone 15', '2024-06-10', 0, '2024-06-10', 100000, 0.10, NULL, 'Partner 04', 'COMP-21'),
('NGY-26-030', 'SN-233349', 'iPhone 14', '2025-09-01', 0, '2025-09-01', 150000, 0.10, NULL, 'Partner 04', 'COMP-22'),
('NGY-26-031', 'SN-344459', 'iPhone 15 Pro', '2024-11-20', 0, '2024-11-20', 200000, 0.15, NULL, 'Partner 04', 'COMP-23'),
('NGY-26-032', 'SN-455569', 'iPhone 15', '2025-03-05', 0, '2025-03-05', 100000, 0.05, NULL, 'Partner 04', 'COMP-24'),
('NGY-26-065', 'SN-326556', 'iPhone 15 Pro', '2026-04-12', 0, '2026-04-12', 200000, 0.10, 'Rejected (Physical Damage)', 'Partner 04', 'COMP-25'),
('NGY-26-066', 'SN-437667', 'iPhone 15', '2025-09-18', 1, '2025-09-18', 100000, 0.05, NULL, 'Partner 04', 'COMP-26'),
('NGY-26-067', 'SN-548778', 'iPhone 14', '2024-01-25', 0, '2024-01-25', 150000, 0.10, NULL, 'Partner 04', 'COMP-27'),
('NGY-26-068', 'SN-659889', 'iPhone 15 Pro', '2026-07-30', 0, '2026-07-30', 200000, 0.15, NULL, 'Partner 04', 'COMP-28'),
('NGY-26-069', 'SN-760990', 'iPhone 15', '2025-05-12', 0, '2025-05-12', 100000, 0.05, NULL, 'Partner 04', 'COMP-29'),
('NGY-26-070', 'SN-871001', 'iPhone 14', '2024-12-18', 0, '2024-12-18', 150000, 0.10, NULL, 'Partner 04', 'COMP-30'),
('NGY-26-071', 'SN-982112', 'iPhone 15 Pro', '2026-04-10', 0, '2026-04-10', 200000, 0.10, NULL, 'Partner 04', 'COMP-31'),
('NGY-26-072', 'SN-982113', 'iPhone 15 Pro', '2026-04-15', 0, '2026-04-15', 200000, 0.10, NULL, 'Partner 04', 'COMP-31');

-- Seed System Users
INSERT INTO system_users (id, name, email, password, role, status, last_login) VALUES
('USR-001', 'Nur Rahma Atika', 'rahma@presales.com', 'rahma123', 'Super Admin', 'Active', 'Just now'),
('USR-002', 'Alex Rivera', 'alex@admin.com', 'alex123', 'Admin', 'Active', '2 hours ago'),
('USR-003', 'Siti Sarah', 'sarah@viewer.com', 'sarah123', 'Viewer', 'Active', '1 day ago'),
('USR-004', 'Rudi Hartono', 'rudi.h@admin.com', 'rudi123', 'Admin', 'Inactive', '3 days ago');

-- Seed Activity Logs (mapped from mock data)
INSERT INTO activity_logs (unit_id, serial_number, company_id, processed_by, action, status, timestamp, date, is_bot) VALUES
('NGY-26-001', 'SN-100200', 'COMP-01', 'Nur Rahma Atika', 'Validation Check', 'Approved', 'Today', NOW(), FALSE),
('NGY-26-003', 'SN-100202', 'COMP-01', 'System Bot', 'Validation Check', 'Rejected (Claimed)', 'Today', NOW(), TRUE),
('NGY-26-004', 'SN-200300', 'COMP-02', 'Nur Rahma Atika', 'Validation Check', 'Approved', 'Today', NOW(), FALSE),
('NGY-26-007', 'SN-400500', 'COMP-04', 'Nur Rahma Atika', 'Manual Rejection', 'Rejected (Physical Damage)', 'Yesterday', NOW() - INTERVAL '1 day', FALSE),
('NGY-26-008', 'SN-400501', 'COMP-04', 'Nur Rahma Atika', 'Manual Rejection', 'Rejected (User Error)', 'Yesterday', NOW() - INTERVAL '1 day', FALSE),
('NGY-26-015', 'SN-700805', 'COMP-07', 'System Bot', 'Policy Check', 'Rejected (Expired)', 'Yesterday', NOW() - INTERVAL '1 day', TRUE),
('NGY-26-018', 'SN-011122', 'COMP-10', 'System Bot', 'Policy Check', 'Rejected (Claimed)', '2 days ago', NOW() - INTERVAL '2 days', TRUE),
('NGY-26-020', 'SN-233344', 'COMP-12', 'System Bot', 'Validation Check', 'Approved', '2 days ago', NOW() - INTERVAL '2 days', TRUE),
('NGY-26-032', 'SN-455569', 'COMP-24', 'System Bot', 'Validation Check', 'Approved', '3 days ago', NOW() - INTERVAL '3 days', TRUE);

-- Seed Settings
INSERT INTO settings (key, value) VALUES
('battery_models', '["iPhone 15 Pro", "iPhone 15", "iPhone 14"]'::jsonb),
('partners', '["Partner 01", "Partner 02", "Partner 03", "Partner 04"]'::jsonb);

-- Seed Logistics Tracking
INSERT INTO logistics_tracking (application_id, shipping_type, courier_name, tracking_number, shipping_status, current_location) VALUES
('NGY-26-071', 'INBOUND', 'JNE Express', 'RESI-DUMMY-01', 'PREPARING', 'Warranty Kit handed over to courier at Central Warehouse'),
('NGY-26-072', 'OUTBOUND', 'J&T Express', 'RESI-DUMMY-02', 'IN_TRANSIT', 'Warranty Kit in transit to Sortation Center Jakarta');
