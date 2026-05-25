-- PostgreSQL Production Schema for Presales Monitoring System

-- Drop tables if they exist (for easy deployment re-runs)
DROP TABLE IF EXISTS activity_logs CASCADE;
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
('NGY-26-001', 'SN-100200', 'BAT-Z500 (Enterprise)', '2024-05-15', 0, '2024-05-15', 200000, 0.10, NULL, NULL, 'COMP-01'),
('NGY-26-002', 'SN-100201', 'BAT-Z500 (Enterprise)', '2024-05-15', 0, '2024-05-15', 200000, 0.10, NULL, NULL, 'COMP-01'),
('NGY-26-003', 'SN-100202', 'BAT-Z500 (Enterprise)', '2024-05-15', 1, '2024-05-16', 200000, 0.10, NULL, NULL, 'COMP-01'),
('NGY-26-004', 'SN-200300', 'BAT-X100 (Commercial)', '2025-01-10', 0, '2025-01-10', 100000, 0.05, NULL, NULL, 'COMP-02'),
('NGY-26-005', 'SN-200301', 'BAT-X100 (Commercial)', '2025-01-10', 0, '2025-01-11', 100000, 0.05, NULL, NULL, 'COMP-02'),
('NGY-26-006', 'SN-300400', 'BAT-V200 (Industrial)', '2024-11-20', 0, '2024-11-20', 150000, 0.10, NULL, NULL, 'COMP-03'),
('NGY-26-007', 'SN-400500', 'BAT-Z500 (Enterprise)', '2025-03-05', 0, '2025-03-05', 200000, 0.15, 'Rejected (Physical Damage)', NULL, 'COMP-04'),
('NGY-26-008', 'SN-400501', 'BAT-Z500 (Enterprise)', '2025-03-05', 0, '2025-03-06', 200000, 0.15, 'Rejected (User Error)', NULL, 'COMP-04'),
('NGY-26-009', 'SN-500600', 'BAT-X100 (Commercial)', '2024-08-22', 0, '2024-08-22', 100000, 0.05, NULL, NULL, 'COMP-05'),
('NGY-26-010', 'SN-600700', 'BAT-V200 (Industrial)', '2025-06-12', 0, '2025-06-12', 150000, 0.10, NULL, NULL, 'COMP-06'),
('NGY-26-011', 'SN-700801', 'BAT-Z500 (Enterprise)', '2024-10-01', 0, '2024-10-01', 200000, 0.10, NULL, NULL, 'COMP-07'),
('NGY-26-012', 'SN-700802', 'BAT-Z500 (Enterprise)', '2024-10-01', 0, '2024-10-01', 200000, 0.10, NULL, NULL, 'COMP-07'),
('NGY-26-013', 'SN-700803', 'BAT-Z500 (Enterprise)', '2024-10-01', 0, '2024-10-02', 200000, 0.10, NULL, NULL, 'COMP-07'),
('NGY-26-014', 'SN-700804', 'BAT-X100 (Commercial)', '2024-10-01', 1, '2024-10-15', 100000, 0.10, NULL, NULL, 'COMP-07'),
('NGY-26-015', 'SN-700805', 'BAT-X100 (Commercial)', '2023-01-01', 0, '2023-01-01', 100000, 0.10, NULL, NULL, 'COMP-07'),
('NGY-26-016', 'SN-800900', 'BAT-Z500 (Enterprise)', '2026-02-14', 0, '2026-02-14', 200000, 0.10, NULL, NULL, 'COMP-08'),
('NGY-26-017', 'SN-900011', 'BAT-X100 (Commercial)', '2025-11-22', 0, '2025-11-22', 100000, 0.05, NULL, NULL, 'COMP-09'),
('NGY-26-018', 'SN-011122', 'BAT-V200 (Industrial)', '2024-04-30', 1, '2024-04-30', 150000, 0.10, NULL, NULL, 'COMP-10'),
('NGY-26-019', 'SN-122233', 'BAT-Z500 (Enterprise)', '2025-12-05', 0, '2025-12-05', 200000, 0.10, NULL, NULL, 'COMP-11'),
('NGY-26-020', 'SN-233344', 'BAT-X100 (Commercial)', '2024-07-18', 0, '2024-07-18', 100000, 0.05, NULL, NULL, 'COMP-12'),
('NGY-26-021', 'SN-344455', 'BAT-V200 (Industrial)', '2025-05-10', 0, '2025-05-10', 150000, 0.10, NULL, NULL, 'COMP-13'),
('NGY-26-022', 'SN-455566', 'BAT-Z500 (Enterprise)', '2024-03-25', 0, '2024-03-25', 200000, 0.10, NULL, NULL, 'COMP-14'),
('NGY-26-023', 'SN-566677', 'BAT-X100 (Commercial)', '2026-01-30', 0, '2026-01-30', 100000, 0.15, NULL, NULL, 'COMP-15'),
('NGY-26-024', 'SN-677788', 'BAT-V200 (Industrial)', '2025-08-12', 0, '2025-08-12', 150000, 0.05, NULL, NULL, 'COMP-16'),
('NGY-26-025', 'SN-788899', 'BAT-Z500 (Enterprise)', '2024-09-18', 0, '2024-09-18', 200000, 0.10, NULL, NULL, 'COMP-17'),
('NGY-26-026', 'SN-899900', 'BAT-X100 (Commercial)', '2025-02-22', 0, '2025-02-22', 100000, 0.10, NULL, NULL, 'COMP-18'),
('NGY-26-027', 'SN-900011', 'BAT-V200 (Industrial)', '2024-12-05', 0, '2024-12-05', 150000, 0.05, NULL, NULL, 'COMP-19'),
('NGY-26-028', 'SN-011122', 'BAT-Z500 (Enterprise)', '2025-04-18', 1, '2025-04-18', 200000, 0.10, NULL, NULL, 'COMP-20'),
('NGY-26-029', 'SN-122233', 'BAT-X100 (Commercial)', '2024-06-10', 0, '2024-06-10', 100000, 0.10, NULL, NULL, 'COMP-21'),
('NGY-26-030', 'SN-233344', 'BAT-V200 (Industrial)', '2025-09-01', 0, '2025-09-01', 150000, 0.10, NULL, NULL, 'COMP-22'),
('NGY-26-031', 'SN-344455', 'BAT-Z500 (Enterprise)', '2024-11-20', 0, '2024-11-20', 200000, 0.15, NULL, NULL, 'COMP-23'),
('NGY-26-032', 'SN-455566', 'BAT-X100 (Commercial)', '2025-03-05', 0, '2025-03-05', 100000, 0.05, NULL, NULL, 'COMP-24'),
('NGY-26-065', 'SN-326556', 'BAT-Z500 (Enterprise)', '2026-04-12', 0, '2026-04-12', 200000, 0.10, 'Rejected (Physical Damage)', NULL, 'COMP-25'),
('NGY-26-066', 'SN-437667', 'BAT-X100 (Commercial)', '2025-09-18', 1, '2025-09-18', 100000, 0.05, NULL, NULL, 'COMP-26'),
('NGY-26-067', 'SN-548778', 'BAT-V200 (Industrial)', '2024-01-25', 0, '2024-01-25', 150000, 0.10, NULL, NULL, 'COMP-27'),
('NGY-26-068', 'SN-659889', 'BAT-Z500 (Enterprise)', '2026-07-30', 0, '2026-07-30', 200000, 0.15, NULL, NULL, 'COMP-28'),
('NGY-26-069', 'SN-760990', 'BAT-X100 (Commercial)', '2025-05-12', 0, '2025-05-12', 100000, 0.05, NULL, NULL, 'COMP-29'),
('NGY-26-070', 'SN-871001', 'BAT-V200 (Industrial)', '2024-12-18', 0, '2024-12-18', 150000, 0.10, NULL, NULL, 'COMP-30'),
('NGY-26-071', 'SN-982112', 'BAT-Z500 (Enterprise)', '2026-04-10', 0, '2026-04-10', 200000, 0.10, NULL, 'Source 1', 'COMP-31'),
('NGY-26-072', 'SN-982113', 'BAT-Z500 (Enterprise)', '2026-04-15', 0, '2026-04-15', 200000, 0.10, NULL, 'Source 1', 'COMP-31');

-- Seed System Users
INSERT INTO system_users (id, name, email, role, status, last_login) VALUES
('USR-001', 'Nur Rahma Atika', 'rahma@presales.com', 'Super Admin', 'Active', 'Just now'),
('USR-002', 'Alex Rivera', 'alex@admin.com', 'Admin', 'Active', '2 hours ago'),
('USR-003', 'Siti Sarah', 'sarah@viewer.com', 'Viewer', 'Active', '1 day ago'),
('USR-004', 'Rudi Hartono', 'rudi.h@admin.com', 'Admin', 'Inactive', '3 days ago');

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
('NGY-26-032', 'SN-455566', 'COMP-24', 'System Bot', 'Validation Check', 'Approved', '3 days ago', NOW() - INTERVAL '3 days', TRUE);

-- Seed Settings
INSERT INTO settings (key, value) VALUES
('battery_models', '["BAT-Z500 (Enterprise)", "BAT-X100 (Commercial)", "BAT-V200 (Industrial)"]'::jsonb);
