export interface CustomerAsset {
    id: string;
    companyName: string;
    picName: string;
    batteryModel: string;
    contractStartDate: string;
    installDate?: string;
    claimCount: number;
}

export const mockAssets: CustomerAsset[] = [
    { id: 'BAT-23-999', companyName: 'PT. Global Logistik', picName: 'Budi Santoso', batteryModel: 'BAT-X100', contractStartDate: '2023-01-15', claimCount: 0 },
    { id: 'BAT-26-001', companyName: 'CV. Sinar Tekno', picName: 'Ayu Lestari', batteryModel: 'BAT-V200', contractStartDate: '2025-01-10', claimCount: 0 },
    { id: 'BAT-26-005', companyName: 'Laju Trans Corp', picName: 'Rudi Hartono', batteryModel: 'BAT-X100', contractStartDate: '2025-02-20', claimCount: 1 },
    { id: 'BAT-24-112', companyName: 'Maju Jaya Sejahtera', picName: 'Siti Aminah', batteryModel: 'BAT-Z500', contractStartDate: '2024-06-05', claimCount: 0 },
    { id: 'BAT-25-045', companyName: 'PT. Angkasa Raya', picName: 'Dedi Kurniawan', batteryModel: 'BAT-V200', contractStartDate: '2025-08-11', claimCount: 0 },
    { id: 'BAT-24-201', companyName: 'Sumber Rejeki', picName: 'Dewi Rahmawati', batteryModel: 'BAT-X100', contractStartDate: '2024-03-30', claimCount: 0 },
    { id: 'BAT-23-888', companyName: 'Karya Bersama', picName: 'Hendro Siswanto', batteryModel: 'BAT-Z500', contractStartDate: '2023-11-12', claimCount: 1 },
    { id: 'BAT-26-022', companyName: 'PT. Teknologi Maju', picName: 'Indra Wijaya', batteryModel: 'BAT-V200', contractStartDate: '2026-01-05', claimCount: 0 },
    { id: 'BAT-25-102', companyName: 'CV. Sentosa Abadi', picName: 'Rina Marlina', batteryModel: 'BAT-X100', contractStartDate: '2025-10-22', claimCount: 0 },
    { id: 'BAT-24-305', companyName: 'Lintas Nusantara', picName: 'Joko Widodo', batteryModel: 'BAT-Z500', contractStartDate: '2024-09-18', claimCount: 1 },
];

export interface ValidationLog {
    id: string;
    applicationId: string;
    companyName: string;
    status: 'ELIGIBLE' | 'REJECTED';
    reason?: string;
    date: string;
}

export const mockValidationHistory: ValidationLog[] = [
    { id: 'VAL-001', applicationId: 'BAT-26-001', companyName: 'CV. Sinar Tekno', status: 'ELIGIBLE', date: '2026-04-13T10:00:00Z' },
    { id: 'VAL-002', applicationId: 'BAT-23-999', companyName: 'PT. Global Logistik', status: 'REJECTED', reason: 'Warranty Period Expired (> 24 Months)', date: '2026-04-13T09:30:00Z' },
    { id: 'VAL-003', applicationId: 'BAT-26-005', companyName: 'Laju Trans Corp', status: 'REJECTED', reason: 'Claim Quota Exceeded (1/1 Already Claimed)', date: '2026-04-12T14:20:00Z' },
    { id: 'VAL-004', applicationId: 'BAT-25-102', companyName: 'CV. Sentosa Abadi', status: 'ELIGIBLE', date: '2026-04-12T11:15:00Z' },
    { id: 'VAL-005', applicationId: 'BAT-23-888', companyName: 'Karya Bersama', status: 'REJECTED', reason: 'Warranty Period Expired (> 24 Months)', date: '2026-04-11T16:45:00Z' },
];

export const checkWarranty = (applicationId: string) => {
    const asset = mockAssets.find(a => a.id === applicationId);
    if (!asset) return { status: 'NOT_FOUND', message: 'Application ID not found.' };

    const contractStartDate = new Date(asset.contractStartDate);
    // Current date defined in prompt context: ~April 2026
    const currentDate = new Date('2026-04-13');

    const diffTime = Math.abs(currentDate.getTime() - contractStartDate.getTime());
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Approx months

    if (diffMonths > 24) {
        return {
            status: 'REJECTED',
            reason: 'Warranty Period Expired (> 24 Months)',
            details: {
                contractStartDate: asset.contractStartDate,
                monthsAgo: Math.round(diffMonths)
            }
        };
    }

    if (asset.claimCount >= 1) {
        return {
            status: 'REJECTED',
            reason: 'Claim Quota Exceeded (1/1 Already Claimed)',
            details: {
                contractStartDate: asset.contractStartDate,
                claimCount: asset.claimCount
            }
        };
    }

    return {
        status: 'ELIGIBLE',
        details: {
            contractStartDate: asset.contractStartDate,
            monthsAgo: Math.round(diffMonths),
            claimCount: asset.claimCount
        }
    };
};
