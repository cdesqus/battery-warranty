import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// --- Interfaces ---

export type UserRole = 'Super Admin' | 'Admin' | 'Viewer';

export interface Unit {
    id: string;
    serialNumber: string;
    batteryModel: string;
    contractStartDate: string;
    claimCount: number;
    applicationDate?: string;
    unitPrice: number;
    discount: number;
    statusOverride?: string;
    sourceChannel?: string;
}

export interface CompanyAsset {
    id: string;
    companyName: string;
    picName: string;
    department: string;
    email: string;
    units: Unit[];
}

export interface SystemUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: 'Active' | 'Inactive';
    lastLogin: string;
    department?: string; // profile update support
}

export interface ActivityLog {
    id: string;
    serialNumber?: string;
    company: string;
    processedBy: string;
    action: string;
    status: string;
    timestamp: string;
    date: string;
    isBot: boolean;
}

export interface DataContextType {
    companies: CompanyAsset[];
    systemUsers: SystemUser[];
    currentUser: SystemUser | null;
    activityLogs: ActivityLog[];
    setCompanies: React.Dispatch<React.SetStateAction<CompanyAsset[]>>;
    setSystemUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
    setCurrentUser: React.Dispatch<React.SetStateAction<SystemUser | null>>;
    addActivityLog: (log: Omit<ActivityLog, 'timestamp' | 'date'>) => void;
    getTotalUnits: () => number;
    models: string[];
    setModels: React.Dispatch<React.SetStateAction<string[]>>;
    sourceChannels: string[];
    setSourceChannels: React.Dispatch<React.SetStateAction<string[]>>;
    selectedSource: string;
    setSelectedSource: (source: string) => void;
    isBackendAvailable: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
}

// --- Utilities ---

export const getBatteryStatus = (installDate: string, claimCount: number, statusOverride?: string) => {
    if (statusOverride) return statusOverride;
    
    const install = new Date(installDate);
    const expiryDate = new Date(install);
    expiryDate.setMonth(expiryDate.getMonth() + 24);
    
    if (new Date() > expiryDate) return 'Expired';
    if (claimCount >= 1) return 'Claimed';
    return 'Active';
};

// --- Mock Data ---

const initialCompanies: CompanyAsset[] = [
    { id: 'COMP-01', companyName: 'PT. Logistik Maju', picName: 'Nur Rahma Atika', department: 'Logistics', email: 'nur.rahma@logistikmaju.com', units: [
        { id: 'NGY-26-001', serialNumber: 'SN-100200', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2024-05-15', applicationDate: '2024-05-15', claimCount: 0, unitPrice: 200000, discount: 0.1 },
        { id: 'NGY-26-002', serialNumber: 'SN-100201', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2024-05-15', applicationDate: '2024-05-15', claimCount: 0, unitPrice: 200000, discount: 0.1 },
        { id: 'NGY-26-003', serialNumber: 'SN-100202', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2024-05-15', applicationDate: '2024-05-16', claimCount: 1, unitPrice: 200000, discount: 0.1 },
    ]},
    { id: 'COMP-02', companyName: 'Mega Konstruksi Tbk', picName: 'Budi Santoso', department: 'Manufacturing', email: 'budi@megakonstruksi.com', units: [
        { id: 'NGY-26-004', serialNumber: 'SN-200300', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2025-01-10', applicationDate: '2025-01-10', claimCount: 0, unitPrice: 100000, discount: 0.05 },
        { id: 'NGY-26-005', serialNumber: 'SN-200301', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2025-01-10', applicationDate: '2025-01-11', claimCount: 0, unitPrice: 100000, discount: 0.05 },
    ]},
    { id: 'COMP-03', companyName: 'Healthy Care Hospital', picName: 'Siti Aminah', department: 'Healthcare', email: 'siti@healthycare.com', units: [
        { id: 'NGY-26-006', serialNumber: 'SN-300400', batteryModel: 'BAT-V200 (Industrial)', contractStartDate: '2024-11-20', applicationDate: '2024-11-20', claimCount: 0, unitPrice: 150000, discount: 0.1 },
    ]},
    { id: 'COMP-04', companyName: 'Global Manufacturing Solutions', picName: 'Andi Wijaya', department: 'Manufacturing', email: 'andi@globalmfg.com', units: [
        { id: 'NGY-26-007', serialNumber: 'SN-400500', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2025-03-05', applicationDate: '2025-03-05', claimCount: 0, unitPrice: 200000, discount: 0.15, statusOverride: 'Rejected (Physical Damage)' },
        { id: 'NGY-26-008', serialNumber: 'SN-400501', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2025-03-05', applicationDate: '2025-03-06', claimCount: 0, unitPrice: 200000, discount: 0.15, statusOverride: 'Rejected (User Error)' },
    ]},
    { id: 'COMP-05', companyName: 'Apex Analytics', picName: 'Dewi Lestari', department: 'Data Centers', email: 'dewi@apex.com', units: [
        { id: 'NGY-26-009', serialNumber: 'SN-500600', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2024-08-22', applicationDate: '2024-08-22', claimCount: 0, unitPrice: 100000, discount: 0.05 },
    ]},
    { id: 'COMP-06', companyName: 'CV. Sinar Tekno', picName: 'Rian Putra', department: 'IT Services', email: 'rian@sinartekno.com', units: [
        { id: 'NGY-26-010', serialNumber: 'SN-600700', batteryModel: 'BAT-V200 (Industrial)', contractStartDate: '2025-06-12', applicationDate: '2025-06-12', claimCount: 0, unitPrice: 150000, discount: 0.1 },
    ]},
    { id: 'COMP-07', companyName: 'PT. Tech Jaya', picName: 'Eka Sari', department: 'Data Centers', email: 'eka@techjaya.com', units: [
        { id: 'NGY-26-011', serialNumber: 'SN-700801', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2024-10-01', applicationDate: '2024-10-01', claimCount: 0, unitPrice: 200000, discount: 0.1 },
        { id: 'NGY-26-012', serialNumber: 'SN-700802', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2024-10-01', applicationDate: '2024-10-01', claimCount: 0, unitPrice: 200000, discount: 0.1 },
        { id: 'NGY-26-013', serialNumber: 'SN-700803', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2024-10-01', applicationDate: '2024-10-02', claimCount: 0, unitPrice: 200000, discount: 0.1 },
        { id: 'NGY-26-014', serialNumber: 'SN-700804', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2024-10-01', applicationDate: '2024-10-15', claimCount: 1, unitPrice: 100000, discount: 0.1 },
        { id: 'NGY-26-015', serialNumber: 'SN-700805', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2023-01-01', applicationDate: '2023-01-01', claimCount: 0, unitPrice: 100000, discount: 0.1 },
    ]},
    { id: 'COMP-08', companyName: 'Zenith Ventures', picName: 'Ferry Salim', department: 'Finance', email: 'ferry@zenith.com', units: [{ id: 'NGY-26-016', serialNumber: 'SN-800900', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2026-02-14', applicationDate: '2026-02-14', claimCount: 0, unitPrice: 200000, discount: 0.1 }] },
    { id: 'COMP-09', companyName: 'Trans Portindo', picName: 'Gita Permata', department: 'Logistics', email: 'gita@transport.com', units: [{ id: 'NGY-26-017', serialNumber: 'SN-900011', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2025-11-22', applicationDate: '2025-11-22', claimCount: 0, unitPrice: 100000, discount: 0.05 }] },
    { id: 'COMP-10', companyName: 'Titik Terang PT', picName: 'Hadi Mulyo', department: 'Manufacturing', email: 'hadi@titikterang.com', units: [{ id: 'NGY-26-018', serialNumber: 'SN-011122', batteryModel: 'BAT-V200 (Industrial)', contractStartDate: '2024-04-30', applicationDate: '2024-04-30', claimCount: 1, unitPrice: 150000, discount: 0.1 }] },
    { id: 'COMP-11', companyName: 'Sinergy Group', picName: 'Indah Sari', department: 'Data Centers', email: 'indah@sinergy.com', units: [{ id: 'NGY-26-019', serialNumber: 'SN-122233', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2025-12-05', applicationDate: '2025-12-05', claimCount: 0, unitPrice: 200000, discount: 0.1 }] },
    { id: 'COMP-12', companyName: 'Panca Niaga', picName: 'Jaka Pratama', department: 'Logistics', email: 'jaka@pancaniaga.com', units: [{ id: 'NGY-26-020', serialNumber: 'SN-233344', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2024-07-18', applicationDate: '2024-07-18', claimCount: 0, unitPrice: 100000, discount: 0.05 }] },
    { id: 'COMP-13', companyName: 'Prima Agro', picName: 'Kurnia Wahyudi', department: 'Manufacturing', email: 'kurnia@primaagro.com', units: [{ id: 'NGY-26-021', serialNumber: 'SN-344455', batteryModel: 'BAT-V200 (Industrial)', contractStartDate: '2025-05-10', applicationDate: '2025-05-10', claimCount: 0, unitPrice: 150000, discount: 0.1 }] },
    { id: 'COMP-14', companyName: 'Duta Solusi', picName: 'Linda Wati', department: 'Healthcare', email: 'linda@dutasolusi.com', units: [{ id: 'NGY-26-022', serialNumber: 'SN-455566', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2024-03-25', applicationDate: '2024-03-25', claimCount: 0, unitPrice: 200000, discount: 0.1 }] },
    { id: 'COMP-15', companyName: 'Karya Mandiri', picName: 'Mulyadi', department: 'Data Centers', email: 'mulyadi@karya.com', units: [{ id: 'NGY-26-023', serialNumber: 'SN-566677', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2026-01-30', applicationDate: '2026-01-30', claimCount: 0, unitPrice: 100000, discount: 0.15 }] },
    { id: 'COMP-16', companyName: 'Nusa Gemilang', picName: 'Nina Sari', department: 'Logistics', email: 'nina@nusagemilang.com', units: [{ id: 'NGY-26-024', serialNumber: 'SN-677788', batteryModel: 'BAT-V200 (Industrial)', contractStartDate: '2025-08-12', applicationDate: '2025-08-12', claimCount: 0, unitPrice: 150000, discount: 0.05 }] },
    { id: 'COMP-17', companyName: 'Ocean Blue', picName: 'Oscar Wijaya', department: 'Manufacturing', email: 'oscar@oceanblue.com', units: [{ id: 'NGY-26-025', serialNumber: 'SN-788899', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2024-09-18', applicationDate: '2024-09-18', claimCount: 0, unitPrice: 200000, discount: 0.1 }] },
    { id: 'COMP-18', companyName: 'Perkasa Indah', picName: 'Putri Rahayu', department: 'Healthcare', email: 'putri@perkasa.com', units: [{ id: 'NGY-26-026', serialNumber: 'SN-899900', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2025-02-22', applicationDate: '2025-02-22', claimCount: 0, unitPrice: 100000, discount: 0.1 }] },
    { id: 'COMP-19', companyName: 'Quick Silver', picName: 'Qori Adilla', department: 'Data Centers', email: 'qori@quicksilver.com', units: [{ id: 'NGY-26-027', serialNumber: 'SN-900011', batteryModel: 'BAT-V200 (Industrial)', contractStartDate: '2024-12-05', applicationDate: '2024-12-05', claimCount: 0, unitPrice: 150000, discount: 0.05 }] },
    { id: 'COMP-20', companyName: 'Royal Garden', picName: 'Rizki Pratama', department: 'Logistics', email: 'rizki@royalgarden.com', units: [{ id: 'NGY-26-028', serialNumber: 'SN-011122', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2025-04-18', applicationDate: '2025-04-18', claimCount: 1, unitPrice: 200000, discount: 0.1 }] },
    { id: 'COMP-21', companyName: 'Surya Abadi', picName: 'Siska Lestari', department: 'Manufacturing', email: 'siska@suryaabadi.com', units: [{ id: 'NGY-26-029', serialNumber: 'SN-122233', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2024-06-10', applicationDate: '2024-06-10', claimCount: 0, unitPrice: 100000, discount: 0.1 }] },
    { id: 'COMP-22', companyName: 'Tunas Baru', picName: 'Tono Wijaya', department: 'Healthcare', email: 'tono@tunasbaru.com', units: [{ id: 'NGY-26-030', serialNumber: 'SN-233344', batteryModel: 'BAT-V200 (Industrial)', contractStartDate: '2025-09-01', applicationDate: '2025-09-01', claimCount: 0, unitPrice: 150000, discount: 0.1 }] },
    { id: 'COMP-23', companyName: 'Unicorp', picName: 'Umar Dani', department: 'Data Centers', email: 'umar@unicorp.com', units: [{ id: 'NGY-26-031', serialNumber: 'SN-344455', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2024-11-20', applicationDate: '2024-11-20', claimCount: 0, unitPrice: 200000, discount: 0.15 }] },
    { id: 'COMP-24', companyName: 'Visi Global', picName: 'Vina Pandu', department: 'Manufacturing', email: 'vina@visiglobal.com', units: [{ id: 'NGY-26-032', serialNumber: 'SN-455566', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2025-03-05', applicationDate: '2025-03-05', claimCount: 0, unitPrice: 100000, discount: 0.05 }] },
    { id: 'COMP-25', companyName: 'Celebes Shipping', picName: 'Rudi Saputra', department: 'Logistics', email: 'rudi@celebes.com', units: [{ id: 'NGY-26-065', serialNumber: 'SN-326556', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2026-04-12', applicationDate: '2026-04-12', claimCount: 0, unitPrice: 200000, discount: 0.1, statusOverride: 'Rejected (Physical Damage)' }] },
    { id: 'COMP-26', companyName: 'Chemical Indutries', picName: 'Ayu Pratama', department: 'Manufacturing', email: 'ayu@chemical.com', units: [{ id: 'NGY-26-066', serialNumber: 'SN-437667', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2025-09-18', applicationDate: '2025-09-18', claimCount: 1, unitPrice: 100000, discount: 0.05 }] },
    { id: 'COMP-27', companyName: 'Care Plus Medical', picName: 'Hendra Wijaya', department: 'Healthcare', email: 'hendra@careplus.com', units: [{ id: 'NGY-26-067', serialNumber: 'SN-548778', batteryModel: 'BAT-V200 (Industrial)', contractStartDate: '2024-01-25', applicationDate: '2024-01-25', claimCount: 0, unitPrice: 150000, discount: 0.1 }] },
    { id: 'COMP-28', companyName: 'Nexus Data System', picName: 'Lestari Pratama', department: 'Data Centers', email: 'lestari@nexus.com', units: [{ id: 'NGY-26-068', serialNumber: 'SN-659889', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2026-07-30', applicationDate: '2026-07-30', claimCount: 0, unitPrice: 200000, discount: 0.15 }] },
    { id: 'COMP-29', companyName: 'Papua Trans', picName: 'Eko Wijaya', department: 'Logistics', email: 'eko@papuatrans.com', units: [{ id: 'NGY-26-069', serialNumber: 'SN-760990', batteryModel: 'BAT-X100 (Commercial)', contractStartDate: '2025-05-12', applicationDate: '2025-05-12', claimCount: 0, unitPrice: 100000, discount: 0.05 }] },
    { id: 'COMP-30', companyName: 'Electronics Indo', picName: 'Santi Kusuma', department: 'Manufacturing', email: 'santi@electronics.com', units: [{ id: 'NGY-26-070', serialNumber: 'SN-871001', batteryModel: 'BAT-V200 (Industrial)', contractStartDate: '2024-12-18', applicationDate: '2024-12-18', claimCount: 0, unitPrice: 150000, discount: 0.1 }] },
    { id: 'COMP-31', companyName: 'Bina Nusantara PT', picName: 'Andika Pratama', department: 'Logistics', email: 'andika@binanusantara.id', units: [
        { id: 'NGY-26-071', serialNumber: 'SN-982112', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2026-04-10', applicationDate: '2026-04-10', claimCount: 0, unitPrice: 200000, discount: 0.1, sourceChannel: 'Source 1' },
        { id: 'NGY-26-072', serialNumber: 'SN-982113', batteryModel: 'BAT-Z500 (Enterprise)', contractStartDate: '2026-04-15', applicationDate: '2026-04-15', claimCount: 0, unitPrice: 200000, discount: 0.1, sourceChannel: 'Source 1' }
    ]}
];



const initialLogs: ActivityLog[] = [
    { id: 'NGY-26-001', serialNumber: 'SN-100200', company: 'COMP-01', processedBy: 'Nur Rahma Atika', action: 'Validation Check', status: 'Approved', timestamp: 'Today', date: new Date().toISOString(), isBot: false },
    { id: 'NGY-26-003', serialNumber: 'SN-100202', company: 'COMP-01', processedBy: 'System Bot', action: 'Validation Check', status: 'Rejected (Claimed)', timestamp: 'Today', date: new Date().toISOString(), isBot: true },
    { id: 'NGY-26-004', serialNumber: 'SN-200300', company: 'COMP-02', processedBy: 'Nur Rahma Atika', action: 'Validation Check', status: 'Approved', timestamp: 'Today', date: new Date().toISOString(), isBot: false },
    { id: 'NGY-26-007', serialNumber: 'SN-400500', company: 'COMP-04', processedBy: 'Nur Rahma Atika', action: 'Manual Rejection', status: 'Rejected (Physical Damage)', timestamp: 'Yesterday', date: new Date(Date.now() - 86400000).toISOString(), isBot: false },
    { id: 'NGY-26-008', serialNumber: 'SN-400501', company: 'COMP-04', processedBy: 'Nur Rahma Atika', action: 'Manual Rejection', status: 'Rejected (User Error)', timestamp: 'Yesterday', date: new Date(Date.now() - 86400000).toISOString(), isBot: false },
    { id: 'NGY-26-015', serialNumber: 'SN-700805', company: 'COMP-07', processedBy: 'System Bot', action: 'Policy Check', status: 'Rejected (Expired)', timestamp: 'Yesterday', date: new Date(Date.now() - 86400000).toISOString(), isBot: true },
    { id: 'NGY-26-018', serialNumber: 'SN-011122', company: 'COMP-10', processedBy: 'System Bot', action: 'Policy Check', status: 'Rejected (Claimed)', timestamp: '2 days ago', date: new Date(Date.now() - 172800000).toISOString(), isBot: true },
    { id: 'NGY-26-020', serialNumber: 'SN-233344', company: 'COMP-12', processedBy: 'System Bot', action: 'Validation Check', status: 'Approved', timestamp: '2 days ago', date: new Date(Date.now() - 172800000).toISOString(), isBot: true },
    { id: 'NGY-26-032', serialNumber: 'SN-455566', company: 'COMP-24', processedBy: 'System Bot', action: 'Validation Check', status: 'Approved', timestamp: '3 days ago', date: new Date(Date.now() - 259200000).toISOString(), isBot: true },
];

export const DataContext = createContext<DataContextType | undefined>(undefined);

const API_BASE = '/api';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [companies, setCompaniesState] = useState<CompanyAsset[]>(initialCompanies);
    const [systemUsers, setSystemUsersState] = useState<SystemUser[]>([
        { id: 'USR-001', name: 'Nur Rahma Atika', email: 'rahma@presales.com', role: 'Super Admin', status: 'Active', lastLogin: 'Just now', department: 'Super Admin' },
        { id: 'USR-002', name: 'Alex Rivera', email: 'alex@admin.com', role: 'Admin', status: 'Active', lastLogin: '2 hours ago', department: 'Admin' },
        { id: 'USR-003', name: 'Siti Sarah', email: 'sarah@viewer.com', role: 'Viewer', status: 'Active', lastLogin: '1 day ago', department: 'Viewer' },
        { id: 'USR-004', name: 'Rudi Hartono', email: 'rudi.h@admin.com', role: 'Admin', status: 'Inactive', lastLogin: '3 days ago', department: 'Admin' },
    ]);

    const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
        const stored = localStorage.getItem('presales_user');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return null;
            }
        }
        return null;
    });
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(initialLogs);
    const [models, setModelsState] = useState<string[]>(['BAT-Z500 (Enterprise)', 'BAT-X100 (Commercial)', 'BAT-V200 (Industrial)']);
    const [sourceChannels, setSourceChannelsState] = useState<string[]>(['Source 1', 'Source 2', 'Source 3', 'Source 4']);
    const [selectedSource, setSelectedSource] = useState<string>('All Partners');
    const [isBackendAvailable, setIsBackendAvailable] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Initial mount hook: Try to connect to backend health check and establish background polling
    useEffect(() => {
        let isMounted = true;

        const initData = async () => {
            try {
                const healthRes = await fetch(`${API_BASE}/health`);
                if (healthRes.ok) {
                    if (isMounted) setIsBackendAvailable(true);

                    const [companiesRes, usersRes, logsRes, modelsRes, partnersRes] = await Promise.all([
                        fetch(`${API_BASE}/companies`),
                        fetch(`${API_BASE}/system-users`),
                        fetch(`${API_BASE}/activity-logs`),
                        fetch(`${API_BASE}/settings/models`),
                        fetch(`${API_BASE}/settings/partners`)
                    ]);

                    if (!isMounted) return;

                    if (companiesRes.ok) {
                        const companiesData = await companiesRes.json();
                        setCompaniesState(companiesData);
                    }
                    if (usersRes.ok) {
                        const usersData = await usersRes.json();
                        setSystemUsersState(usersData);
                        // Make sure current user references database profile
                        const stored = localStorage.getItem('presales_user');
                        if (stored) {
                            try {
                                const storedUser = JSON.parse(stored);
                                const currentInDb = usersData.find((u: SystemUser) => u.id === storedUser.id);
                                if (currentInDb) {
                                    setCurrentUser(currentInDb);
                                    localStorage.setItem('presales_user', JSON.stringify(currentInDb));
                                }
                            } catch (e) {
                                // Ignore
                            }
                        }
                    }
                    if (logsRes.ok) {
                        const logsData = await logsRes.json();
                        setActivityLogs(logsData);
                    }
                    if (modelsRes.ok) {
                        const modelsData = await modelsRes.json();
                        setModelsState(modelsData);
                    }
                    if (partnersRes && partnersRes.ok) {
                        const partnersData = await partnersRes.json();
                        setSourceChannelsState(partnersData);
                    }
                } else {
                    console.log('Backend API failed status check. Operating in sandboxed client mock state.');
                }
            } catch (e) {
                console.log('Backend API not reachable. Operating in standalone sandboxed client mock state.');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        initData();

        // Check and sync database changes every 7 seconds for multi-device real-time consistency
        const pollInterval = setInterval(() => {
            initData();
        }, 7000);

        return () => {
            isMounted = false;
            clearInterval(pollInterval);
        };
    }, []);

    // --- State Synchronization Handlers ---

    const syncCompaniesToDb = async (prev: CompanyAsset[], next: CompanyAsset[]) => {
        if (!isBackendAvailable) return;
        try {
            // Flatten units for mapping comparisons
            const prevUnitsMap = new Map<string, { unit: Unit, companyId: string }>();
            prev.forEach(c => c.units.forEach(u => prevUnitsMap.set(u.id, { unit: u, companyId: c.id })));
            
            const nextUnitsMap = new Map<string, { unit: Unit, companyId: string }>();
            next.forEach(c => c.units.forEach(u => nextUnitsMap.set(u.id, { unit: u, companyId: c.id })));

            // 1. Detect deleted units
            for (const [id] of prevUnitsMap.entries()) {
                if (!nextUnitsMap.has(id)) {
                    console.log('Syncing delete of unit:', id);
                    await fetch(`${API_BASE}/units/${id}`, { method: 'DELETE' });
                }
            }

            const prevCompaniesMap = new Map<string, CompanyAsset>(prev.map(c => [c.id, c]));

            // 2. Detect added or updated items
            for (const nextComp of next) {
                if (!prevCompaniesMap.has(nextComp.id)) {
                    // This company is entirely new
                    console.log('Syncing new company registration:', nextComp.id);
                    await fetch(`${API_BASE}/companies`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: nextComp.id,
                            companyName: nextComp.companyName,
                            picName: nextComp.picName || '',
                            department: nextComp.department || 'N/A',
                            email: nextComp.email || 'private@compliance.local'
                        })
                    });

                    // Add company units
                    if (nextComp.units.length > 0) {
                        await fetch(`${API_BASE}/units/bulk`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                units: nextComp.units.map(u => ({ ...u, companyId: nextComp.id }))
                            })
                        });
                    }
                } else {
                    // Company already existed, check if new units were imported or details were modified
                    const addedUnits = nextComp.units.filter(u => !prevUnitsMap.has(u.id));
                    if (addedUnits.length > 0) {
                        console.log('Syncing newly added units to existing company:', nextComp.id, addedUnits.length);
                        await fetch(`${API_BASE}/units/bulk`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                units: addedUnits.map(u => ({ ...u, companyId: nextComp.id }))
                            })
                        });
                    }

                    // Check for unit property edits (e.g. claim count, manual rejection, SN edit)
                    for (const nextUnit of nextComp.units) {
                        const prevUnitInfo = prevUnitsMap.get(nextUnit.id);
                        if (prevUnitInfo) {
                            const prevUnit = prevUnitInfo.unit;
                            if (
                                nextUnit.serialNumber !== prevUnit.serialNumber ||
                                nextUnit.batteryModel !== prevUnit.batteryModel ||
                                nextUnit.contractStartDate !== prevUnit.contractStartDate ||
                                nextUnit.claimCount !== prevUnit.claimCount ||
                                nextUnit.statusOverride !== prevUnit.statusOverride ||
                                nextUnit.sourceChannel !== prevUnit.sourceChannel
                            ) {
                                console.log('Syncing unit updates:', nextUnit.id);
                                await fetch(`${API_BASE}/units/${nextUnit.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        serialNumber: nextUnit.serialNumber,
                                        batteryModel: nextUnit.batteryModel,
                                        contractStartDate: nextUnit.contractStartDate,
                                        claimCount: nextUnit.claimCount,
                                        statusOverride: nextUnit.statusOverride || null,
                                        sourceChannel: nextUnit.sourceChannel || null
                                    })
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('State Synchronization Failure (Companies):', error);
        }
    };

    const syncSystemUsersToDb = async (prev: SystemUser[], next: SystemUser[]) => {
        if (!isBackendAvailable) return;
        try {
            const prevMap = new Map(prev.map(u => [u.id, u]));
            const nextMap = new Map(next.map(u => [u.id, u]));

            // Detect deleted users
            for (const prevUser of prev) {
                if (!nextMap.has(prevUser.id)) {
                    console.log('Syncing delete of user:', prevUser.id);
                    await fetch(`${API_BASE}/system-users/${prevUser.id}`, { method: 'DELETE' });
                }
            }

            // Detect added or updated users
            for (const nextUser of next) {
                if (!prevMap.has(nextUser.id)) {
                    console.log('Syncing new user registration:', nextUser.id);
                    await fetch(`${API_BASE}/system-users`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(nextUser)
                    });
                } else {
                    const prevUser = prevMap.get(nextUser.id);
                    if (prevUser && (
                        nextUser.name !== prevUser.name ||
                        nextUser.email !== prevUser.email ||
                        nextUser.role !== prevUser.role ||
                        nextUser.status !== prevUser.status ||
                        nextUser.lastLogin !== prevUser.lastLogin
                    )) {
                        console.log('Syncing user details updates:', nextUser.id);
                        await fetch(`${API_BASE}/system-users/${nextUser.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(nextUser)
                        });
                    }
                }
            }
        } catch (error) {
            console.error('State Synchronization Failure (Users):', error);
        }
    };

    // --- State Modifier Interceptors ---

    const setCompanies = (value: React.SetStateAction<CompanyAsset[]>) => {
        setCompaniesState(prev => {
            const resolved = typeof value === 'function' ? (value as Function)(prev) : value;
            syncCompaniesToDb(prev, resolved);
            return resolved;
        });
    };

    const setSystemUsers = (value: React.SetStateAction<SystemUser[]>) => {
        setSystemUsersState(prev => {
            const resolved = typeof value === 'function' ? (value as Function)(prev) : value;
            syncSystemUsersToDb(prev, resolved);
            return resolved;
        });
    };

    const addActivityLog = async (log: Omit<ActivityLog, 'timestamp' | 'date'>) => {
        const newLog: ActivityLog = { 
            ...log, 
            timestamp: 'Just now',
            date: new Date().toISOString()
        };
        
        // Update local client state immediately
        setActivityLogs(prev => [newLog, ...prev].slice(0, 30));

        // Push to DB async if active
        if (isBackendAvailable) {
            try {
                await fetch(`${API_BASE}/activity-logs`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(log)
                });
            } catch (error) {
                console.error('State Synchronization Failure (Activity Logs):', error);
            }
        }
    };

    const setModels = (value: React.SetStateAction<string[]>) => {
        setModelsState(prev => {
            const resolved = typeof value === 'function' ? (value as Function)(prev) : value;
            
            // Push settings update to DB
            if (isBackendAvailable) {
                fetch(`${API_BASE}/settings/models`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ models: resolved })
                }).catch(err => console.error('State Synchronization Failure (Models):', err));
            }
            
            return resolved;
        });
    };

    const setSourceChannels = (value: React.SetStateAction<string[]>) => {
        setSourceChannelsState(prev => {
            const resolved = typeof value === 'function' ? (value as Function)(prev) : value;
            
            // Push settings update to DB
            if (isBackendAvailable) {
                fetch(`${API_BASE}/settings/partners`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ partners: resolved })
                }).catch(err => console.error('State Synchronization Failure (Partners):', err));
            }
            
            return resolved;
        });
    };

    const getTotalUnits = () => {
        return companies.reduce((total, company) => total + company.units.length, 0);
    };

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        if (isBackendAvailable) {
            try {
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (!response.ok) {
                    return { success: false, error: data.error || 'Authentication failed' };
                }
                setCurrentUser(data.user);
                localStorage.setItem('presales_user', JSON.stringify(data.user));
                // Update systemUsers last login if matches in UI list
                setSystemUsersState(prev => prev.map(u => u.id === data.user.id ? { ...u, lastLogin: data.user.lastLogin } : u));
                return { success: true };
            } catch (err) {
                console.error('Backend auth failed, attempting sandbox fallback:', err);
            }
        }

        // Sandbox/offline fallback
        const mockPasswords: Record<string, string> = {
            'rahma@presales.com': 'rahma123',
            'alex@admin.com': 'alex123',
            'sarah@viewer.com': 'sarah123',
            'rudi.h@admin.com': 'rudi123'
        };

        const user = systemUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
            return { success: false, error: 'Invalid email or password' };
        }

        if (user.status !== 'Active') {
            return { success: false, error: 'Your account is inactive. Please contact your Super Admin.' };
        }

        const expectedPass = mockPasswords[user.email.toLowerCase()] || 'password123';
        if (password !== expectedPass) {
            return { success: false, error: 'Invalid email or password' };
        }

        const nowStr = 'Just now';
        const updatedUser = { ...user, lastLogin: nowStr };
        
        setCurrentUser(updatedUser);
        localStorage.setItem('presales_user', JSON.stringify(updatedUser));
        setSystemUsersState(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));

        return { success: true };
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('presales_user');
    };

    return (
        <DataContext.Provider value={{
            companies,
            systemUsers,
            currentUser,
            activityLogs,
            setCompanies,
            setSystemUsers,
            setCurrentUser,
            addActivityLog,
            getTotalUnits,
            models,
            setModels,
            sourceChannels,
            setSourceChannels,
            selectedSource,
            setSelectedSource,
            isBackendAvailable,
            isLoading,
            login,
            logout
        }}>
            {isLoading ? (
                <div className="fixed inset-0 bg-[#0F172A] flex flex-col items-center justify-center text-white z-[9999] gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-sm font-semibold tracking-wider uppercase text-indigo-400">Loading Presales Monitor Console...</div>
                    <div className="text-xs text-slate-500 italic">Connecting and syncing data streams...</div>
                </div>
            ) : (
                children
            )}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
};
