import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle2, FileText, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useData } from '../context/DataContext';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose }) => {
    const { sourceChannels, setCompanies, companies, currentUser, addActivityLog } = useData();
    
    if (!currentUser) return null;

    const [selectedChannel, setSelectedChannel] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;
 
    const parseExcelDate = (val: any) => {
        if (!val) return new Date().toISOString().split('T')[0];
        
        // If it's a number (Excel serial date)
        if (typeof val === 'number') {
            const date = XLSX.SSF.parse_date_code(val);
            return `${date.y}-${date.m.toString().padStart(2, '0')}-${date.d.toString().padStart(2, '0')}`;
        }
 
        // If it's a string, try to parse common formats
        const str = val.toString();
        if (str.includes('/')) {
            const parts = str.split('/');
            // Check if DD/MM/YYYY
            if (parts[0].length <= 2 && parts[2]?.length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        
        try {
            const d = new Date(val);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        } catch (e) {}
 
        return new Date().toISOString().split('T')[0];
    };
 
    const downloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Import Template');

        worksheet.columns = [
            { header: 'Application ID', key: 'id', width: 20 },
            { header: 'Serial Number', key: 'sn', width: 20 },
            { header: 'Battery Model', key: 'model', width: 25 },
            { header: 'Application Date', key: 'appDate', width: 15 },
            { header: 'Contract Start Date', key: 'startDate', width: 15 },
            { header: 'Unit Price', key: 'price', width: 15 },
            { header: 'Discount (%)', key: 'discount', width: 15 },
        ];

        // Add sample row
        worksheet.addRow({
            id: 'NGY-26-XXXX (EXAMPLE)',
            sn: 'SN-XXXXXX (EXAMPLE)',
            model: 'BAT-Z500 (Enterprise)',
            appDate: '2024-05-15',
            startDate: '2024-05-15',
            price: 200000,
            discount: 10
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), 'Presales_Import_Template.xlsx');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedChannel) {
            setError('Please select a Partner before uploading.');
            return;
        }

        setError(null);
        setSuccess(null);

        if (!selectedChannel) {
            setError('CRITICAL: Please select a Source Channel first.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsProcessing(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    throw new Error('The file is empty.');
                }

                if (data.length > 5000) {
                    throw new Error('Maximum 5,000 rows allowed per import.');
                }

                processImportedData(data);
            } catch (err: any) {
                setError(err.message || 'Failed to read file.');
                setIsProcessing(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const processImportedData = (data: any[]) => {
        // Collect all existing serial numbers for duplicate check
        const existingSNs = new Set<string>();
        companies.forEach(c => c.units.forEach(u => existingSNs.add(u.serialNumber.toUpperCase())));

        const newUnits: any[] = [];
        const duplicates: string[] = [];

        data.forEach((row: any) => {
            // Support extensive English and Indonesian column name variations
            const appId = (
                row['Application ID'] || row['ApplicationId'] || row['application_id'] || 
                row['ID'] || row['id'] || row['App ID'] || row['appId'] || ''
            ).toString().trim();
            
            const sn = (
                row['Serial Number'] || row['SerialNumber'] || row['serial_number'] || 
                row['SN'] || row['sn'] || row['No. Serial'] || row['No Serial'] || 
                row['Serial No'] || row['SerialNo'] || ''
            ).toString().trim().toUpperCase();
            
            // SKIP EMPTY OR BLANK ROWS
            if (!sn && !appId) {
                return;
            }

            // SKIP RECORD IF SERIAL NUMBER IS COMPLETELY MISSING
            if (!sn) {
                return;
            }
            
            // SKIP EXAMPLE ROWS
            if (appId.includes('XXXX') || sn.includes('XXXX')) {
                return;
            }

            if (existingSNs.has(sn)) {
                duplicates.push(sn);
                return;
            }

            // Map other columns with robust fallbacks
            const rawModel = row['Battery Model'] || row['BatteryModel'] || row['battery_model'] || row['Model'] || row['model'] || row['Tipe'] || row['Tipe Baterai'] || 'Unknown';
            const rawAppDate = row['Application Date'] || row['ApplicationDate'] || row['application_date'] || row['App Date'] || row['appDate'] || row['Tanggal'];
            const rawStartDate = row['Contract Start Date'] || row['ContractStartDate'] || row['contract_start_date'] || row['Start Date'] || row['startDate'] || row['Mulai Kontrak'];
            const rawPrice = row['Unit Price'] || row['UnitPrice'] || row['unit_price'] || row['Price'] || row['price'] || row['Harga'] || '0';
            const rawDiscount = row['Discount (%)'] || row['Discount'] || row['discount'] || row['DiscountPercent'] || row['Diskon'] || '0';

            const parsedPrice = parseFloat(rawPrice.toString().replace(/[^0-9.-]/g, ''));
            const parsedDiscount = parseFloat(rawDiscount.toString().replace(/[^0-9.-]/g, ''));

            const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
            const unit = {
                id: appId || `IMP-${shortId}`,
                serialNumber: sn,
                batteryModel: rawModel.toString().trim(),
                applicationDate: parseExcelDate(rawAppDate),
                contractStartDate: parseExcelDate(rawStartDate),
                unitPrice: isNaN(parsedPrice) ? 0 : parsedPrice,
                discount: (isNaN(parsedDiscount) ? 0 : parsedDiscount) / 100,
                claimCount: 0,
                sourceChannel: selectedChannel
            };

            newUnits.push(unit);
            existingSNs.add(sn); // Prevent duplicates within the same file
        });

        if (newUnits.length === 0) {
            setError('Import failed: No valid assets found. Please make sure the column headers in your file match the required template.');
            setIsProcessing(false);
            return;
        }

        if (duplicates.length > 0) {
            setError(`Import failed: ${duplicates.length} duplicate Serial Number(s) found. Examples: ${duplicates.slice(0, 3).join(', ')}`);
            setIsProcessing(false);
            return;
        }

        // Create a special company/batch for the import
        const newBatch = {
            id: `IMPORT-${selectedChannel}-${Date.now()}`,
            companyName: `BULK IMPORT: ${selectedChannel}`,
            picName: currentUser.name,
            department: 'IMPORT ENGINE',
            email: currentUser.email,
            units: newUnits
        };

        setCompanies(prev => [newBatch, ...prev]);
        addActivityLog({
            id: 'BULK-IMPORT',
            serialNumber: `CH: ${selectedChannel}`,
            company: newBatch.id,
            processedBy: currentUser.name,
            action: 'Bulk Data Import',
            status: 'Approved',
            isBot: false
        });

        setSuccess(`Successfully imported ${newUnits.length} units from ${selectedChannel}.`);
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg">
                            <Database size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-xl tracking-tight uppercase">Bulk Import Engine</h3>
                            <p className="text-slate-500 text-xs font-medium mt-0.5">Upload assets from credit providers & channels.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Step 1: Select Partner */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            1. Select Partner
                        </label>
                        <select
                            value={selectedChannel}
                            onChange={(e) => {
                                setSelectedChannel(e.target.value);
                                setError(null);
                            }}
                            className={`w-full border-2 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none transition-all ${!selectedChannel ? 'border-rose-100 bg-rose-50/30' : 'border-slate-100 bg-slate-50/50 focus:border-indigo-600'}`}
                        >
                            <option value="">-- Choose Partner --</option>
                            {sourceChannels.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {/* Step 2: Upload */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            2. Upload Flat File (.xlsx / .csv)
                        </label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${isProcessing ? 'bg-slate-50 border-slate-200' : 'hover:bg-indigo-50/50 hover:border-indigo-300 border-slate-200'}`}
                        >
                            {isProcessing ? (
                                <div className="animate-spin text-indigo-600">
                                    <Database size={40} />
                                </div>
                            ) : (
                                <Upload size={40} className="text-slate-300" />
                            )}
                            <div className="text-center">
                                <p className="font-bold text-slate-700">{isProcessing ? 'Processing Data...' : 'Drop file here or click to browse'}</p>
                                <p className="text-xs text-slate-400 mt-1">Support for Excel and CSV up to 5,000 rows</p>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileUpload}
                                disabled={isProcessing || !selectedChannel}
                            />
                        </div>
                        {!selectedChannel && (
                            <p className="text-[10px] text-rose-500 font-bold animate-pulse text-center">
                                * Selection of Source Channel is mandatory before upload.
                            </p>
                        )}
                    </div>

                    {/* Template Link */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <FileText className="text-slate-400" size={20} />
                            <div>
                                <p className="text-[10px] font-bold text-slate-700">Don't have the format?</p>
                                <p className="text-[9px] text-slate-500">Download our pre-mapped import template.</p>
                            </div>
                        </div>
                        <button 
                            onClick={downloadTemplate}
                            className="flex items-center gap-1.5 text-indigo-600 font-bold text-[10px] uppercase tracking-wider hover:underline"
                        >
                            <Download size={14} /> Download Template
                        </button>
                    </div>

                    {/* Feedback */}
                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="text-rose-500 shrink-0" size={20} />
                            <p className="text-xs font-bold text-rose-700 leading-relaxed">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                            <p className="text-xs font-bold text-emerald-700 leading-relaxed">{success}</p>
                        </div>
                    )}
                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100">
                    <button 
                        onClick={onClose}
                        className="w-full py-3.5 rounded-xl border border-slate-200 text-slate-600 font-black text-sm hover:bg-white transition-all shadow-sm uppercase tracking-widest"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkImportModal;
