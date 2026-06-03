import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, Calendar } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useData, getBatteryStatus } from '../context/DataContext';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
    const { companies, sourceChannels } = useData();
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [partnerFilter, setPartnerFilter] = useState<string>('All Partners');
    const [fileFormat, setFileFormat] = useState<'xlsx' | 'csv'>('xlsx');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setStartDate('');
            setEndDate('');
            setPartnerFilter('All Partners');
            setFileFormat('xlsx');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePresetRange = (type: 'today' | 'week' | 'month') => {
        const now = new Date();
        const start = new Date();
        now.setHours(23, 59, 59, 999);

        if (type === 'today') {
            start.setHours(0, 0, 0, 0);
        } else if (type === 'week') {
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
        } else if (type === 'month') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(now.toISOString().split('T')[0]);
    };

    const generateExport = async () => {
        setIsGenerating(true);
        try {
            // --- CSV BRANCH ---
            if (fileFormat === 'csv') {
                const headers = ['No', 'Application ID', 'Application Date', 'Serial Number', 'Battery Model', 'Unit Price', 'Contract Date', 'End Date', 'Status', 'Partner'];
                const rows: any[] = [];
                let seq = 1;

                companies.forEach(comp => {
                    comp.units.forEach(unit => {
                        let include = true;
                        const appDateStr = unit.applicationDate;
                        
                        // Strict Application Date filtering
                        if (!appDateStr) {
                            include = false;
                        } else {
                            const unitDate = new Date(appDateStr);
                            if (startDate && unitDate < new Date(startDate)) include = false;
                            if (endDate && unitDate > new Date(endDate)) include = false;
                        }
                        
                        // Partner filtering
                        if (partnerFilter !== 'All Partners' && unit.sourceChannel !== partnerFilter) include = false;

                        if (include) {
                            const sDate = new Date(unit.contractStartDate);
                            const eDate = new Date(sDate);
                            eDate.setMonth(eDate.getMonth() + 24);
                            const status = getBatteryStatus(unit.contractStartDate, unit.claimCount).toUpperCase();
                            const finalPrice = unit.unitPrice * (1 - (unit.discount || 0));

                            rows.push([
                                seq++,
                                unit.id,
                                unit.applicationDate ? new Date(unit.applicationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-',
                                unit.serialNumber || '-',
                                unit.batteryModel,
                                finalPrice,
                                sDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                                eDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                                status,
                                unit.sourceChannel || 'Direct'
                            ]);
                        }
                    });
                });

                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.map((val: any) => `"${val}"`).join(','))
                ].join('\n');

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                saveAs(blob, `Operational_Report_${new Date().toISOString().split('T')[0]}.csv`);
                onClose();
                return;
            }

            // --- XLSX BRANCH ---
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Application Report');

            // Merged header
            worksheet.mergeCells('A1:J1');
            const titleRow = worksheet.getRow(1);
            titleRow.getCell(1).value = 'FIELD REPORT APPLICATION DISTRIBUTOR UNIT';
            titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1A2B4C' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 35;

            // Company row
            worksheet.mergeCells('A2:J2');
            const companyCell = worksheet.getCell('A2');
            companyCell.value = {
                richText: [
                    { text: 'Company: ', font: { bold: true } },
                    { text: 'All Registered Corporate Entities' }
                ]
            };
            companyCell.alignment = { horizontal: 'left', vertical: 'middle' };
            worksheet.getRow(2).height = 20;

            // Period row
            worksheet.mergeCells('A3:J3');
            const periodCell = worksheet.getCell('A3');
            const startStr = startDate ? new Date(startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
            const endStr = endDate ? new Date(endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
            const periodValue = (startStr && endStr) ? `${startStr} - ${endStr}` : 'All Time';
            
            periodCell.value = {
                richText: [
                    { text: 'Period (Application Date): ', font: { bold: true } },
                    { text: periodValue },
                    { text: '  |  Partner: ', font: { bold: true } },
                    { text: partnerFilter }
                ]
            };
            periodCell.alignment = { horizontal: 'left', vertical: 'middle' };
            worksheet.getRow(3).height = 20;

            // Spacer
            worksheet.getRow(4).height = 15;

            const columnDefinitions = [
                { header: 'No', key: 'no', width: 6 },
                { header: 'Application ID', key: 'appId', width: 25 },
                { header: 'Application Date', key: 'appDate', width: 20 },
                { header: 'Serial Number', key: 'sn', width: 22 },
                { header: 'Battery Model', key: 'model', width: 35 },
                { header: 'Unit Price', key: 'price', width: 22 },
                { header: 'Contract Date', key: 'start', width: 18 },
                { header: 'End Date', key: 'end', width: 18 },
                { header: 'Status', key: 'status', width: 15 },
                { header: 'Partner', key: 'partner', width: 18 },
            ];

            worksheet.columns = columnDefinitions.map(col => ({
                key: col.key,
                width: col.width
            }));

            const headerRow = worksheet.getRow(5);
            headerRow.values = columnDefinitions.map(c => c.header);
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF1A2B4C' } 
                };
                cell.font = {
                    bold: true,
                    color: { argb: 'FFFFFFFF' } 
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                };
            });
            headerRow.height = 25;

            let rowCounter = 6;
            let sequenceNo = 1;
            let totalSum = 0;
            companies.forEach(comp => {
                comp.units.forEach(unit => {
                    let include = true;
                    const appDateStr = unit.applicationDate;
                    
                    // Strict Application Date filtering
                    if (!appDateStr) {
                        include = false;
                    } else {
                        const unitDate = new Date(appDateStr);
                        if (startDate && unitDate < new Date(startDate)) include = false;
                        if (endDate && unitDate > new Date(endDate)) include = false;
                    }
                    
                    // Partner filtering
                    if (partnerFilter !== 'All Partners' && unit.sourceChannel !== partnerFilter) include = false;

                    if (include) {
                        const sDate = new Date(unit.contractStartDate);
                        const eDate = new Date(sDate);
                        eDate.setMonth(eDate.getMonth() + 24);
                        const status = getBatteryStatus(unit.contractStartDate, unit.claimCount);
                        const finalPrice = unit.unitPrice * (1 - (unit.discount || 0));
                        totalSum += finalPrice;

                        const rowValues = {
                            no: sequenceNo++,
                            appId: unit.id,
                            appDate: unit.applicationDate ? new Date(unit.applicationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
                            sn: unit.serialNumber || '-',
                            model: unit.batteryModel,
                            price: finalPrice,
                            start: sDate,
                            end: eDate,
                            status: status.toUpperCase(),
                            partner: unit.sourceChannel || 'Direct'
                        };

                        const row = worksheet.addRow(rowValues);

                        row.eachCell((cell, colNumber) => {
                            cell.border = {
                                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                                right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
                            };

                            const key = columnDefinitions[colNumber - 1].key;
                            if (['no', 'appId', 'appDate', 'start', 'end', 'status', 'partner'].includes(key)) {
                                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                            } else if (key === 'price') {
                                cell.alignment = { vertical: 'middle', horizontal: 'right' };
                            } else {
                                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                            }
                        });

                        row.getCell('price').numFmt = '"Rp "#,##0';
                        row.getCell('start').numFmt = 'DD MMM YYYY';
                        row.getCell('end').numFmt = 'DD MMM YYYY';

                        rowCounter++;
                    }
                });
            });

            // Grand Total
            const totalRowIndex = rowCounter;
            worksheet.mergeCells(`A${totalRowIndex}:E${totalRowIndex}`); 
            const grandTotalRow = worksheet.getRow(totalRowIndex);

            const labelCell = grandTotalRow.getCell(1);
            labelCell.value = 'GRAND TOTAL';
            labelCell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
            labelCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF10B981' } 
            };

            const totalSumCell = grandTotalRow.getCell(6); 
            totalSumCell.value = {
                formula: `=SUM(F6:F${totalRowIndex - 1})`,
                result: totalSum
            };
            totalSumCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            totalSumCell.numFmt = '"Rp "#,##0';
            totalSumCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF10B981' } 
            };
            totalSumCell.alignment = { horizontal: 'right', vertical: 'middle' };

            for(let i=7; i<=10; i++) {
                const cell = grandTotalRow.getCell(i);
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF10B981' }
                };
            }

            worksheet.views = [
                { state: 'frozen', xSplit: 0, ySplit: 5 }
            ];

            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `Operational_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            saveAs(new Blob([buffer]), fileName);

            onClose();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please check the console for details.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#1A2B4C] p-2.5 rounded-xl text-white shadow-lg animate-pulse">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg tracking-tight uppercase">Export Operational Report</h3>
                            <p className="text-slate-500 text-xs font-semibold mt-0.5">Generate unit-focused flat reports (.xlsx / .csv)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">

                    {/* Select Application Date Range */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Select Application Date Range
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">Start Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full border-2 border-slate-100 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#1A2B4C] bg-slate-50/50 font-bold text-slate-700 transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 ml-1">End Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full border-2 border-slate-100 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#1A2B4C] bg-slate-50/50 font-bold text-slate-700 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handlePresetRange('today')} className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-[#1A2B4C] hover:text-white transition-all">Today</button>
                            <button onClick={() => handlePresetRange('week')} className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-[#1A2B4C] hover:text-white transition-all">This Week</button>
                            <button onClick={() => handlePresetRange('month')} className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-[#1A2B4C] hover:text-white transition-all">This Month</button>
                        </div>
                    </div>

                    {/* Select Partner Dropdown */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Select Partner
                        </label>
                        <select
                            value={partnerFilter}
                            onChange={(e) => setPartnerFilter(e.target.value)}
                            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#1A2B4C] bg-slate-50/50 font-bold text-slate-700 transition-all"
                        >
                            <option value="All Partners">All Partners</option>
                            {sourceChannels.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* File Format Selection */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            File Format
                        </label>
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 pt-1">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="fileFormat"
                                    value="xlsx"
                                    checked={fileFormat === 'xlsx'}
                                    onChange={() => setFileFormat('xlsx')}
                                    className="w-4.5 h-4.5 accent-[#1A2B4C] cursor-pointer"
                                />
                                <span className={`text-sm font-bold transition-all ${fileFormat === 'xlsx' ? 'text-[#1A2B4C]' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                    .XLSX (Excel Spreadsheet)
                                </span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="fileFormat"
                                    value="csv"
                                    checked={fileFormat === 'csv'}
                                    onChange={() => setFileFormat('csv')}
                                    className="w-4.5 h-4.5 accent-[#1A2B4C] cursor-pointer"
                                />
                                <span className={`text-sm font-bold transition-all ${fileFormat === 'csv' ? 'text-[#1A2B4C]' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                    .CSV (Comma Separated Values)
                                </span>
                            </label>
                        </div>
                    </div>

                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-6 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-black text-sm hover:bg-white transition-all shadow-sm uppercase tracking-widest">Cancel</button>
                    <button
                        onClick={generateExport}
                        disabled={isGenerating}
                        className={`flex-[2] px-6 py-3.5 rounded-xl text-white font-black text-sm transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${isGenerating ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#1A2B4C] hover:bg-[#253e6b] shadow-xl'}`}
                    >
                        {isGenerating ? 'Generating...' : 'Generate & Download'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
