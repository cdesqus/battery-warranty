import { useState } from 'react';
import { Search, ArrowRight, CheckCircle, XCircle, Download } from 'lucide-react';
import { useData } from '../context/DataContext';

const WarrantyCenter = () => {
    const { companies, setCompanies, addActivityLog, activityLogs, currentUser } = useData();
    const [searchInput, setSearchInput] = useState('');
    const [validationResult, setValidationResult] = useState<any>(null);
    const [manualReason, setManualReason] = useState('Physical Damage');

    const handleValidate = (e: React.FormEvent) => {
        e.preventDefault();
        const query = searchInput.trim().toUpperCase();
        if (!query) return;

        let foundUnit: any = null;
        let foundCompany: any = null;

        companies.forEach(c => {
            const unit = c.units.find(u => u.id === query || u.serialNumber?.toUpperCase() === query);
            if (unit) {
                foundUnit = unit;
                foundCompany = c;
            }
        });

        if (!foundUnit) {
            setValidationResult({ status: 'REJECTED', reason: 'Asset Record Not Found', details: null });
            addActivityLog({ id: query, serialNumber: 'UNKNOWN', company: 'N/A', processedBy: 'System Bot', action: 'Validation Check', status: 'Rejected (Not Found)', isBot: true });
            return;
        }

        const contractStartDateStr = foundUnit.contractStartDate;
        const sDate = new Date(contractStartDateStr);
        const eDate = new Date(sDate);
        eDate.setMonth(eDate.getMonth() + 24);
        
        const now = new Date();
        const diffTime = now.getTime() - sDate.getTime();
        const monthsAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30));

        if (now > eDate) {
            setValidationResult({ status: 'REJECTED', reason: 'Warranty Expired (>24 Mo)', details: { contractStartDate: foundUnit.contractStartDate, claimCount: foundUnit.claimCount, expiryDate: eDate.toISOString() } });
            addActivityLog({ id: foundUnit.id, serialNumber: foundUnit.serialNumber, company: foundCompany.id, processedBy: 'System Bot', action: 'Validation Check', status: 'Rejected (Expired)', isBot: true });
        } else if (foundUnit.claimCount >= 1) {
            setValidationResult({ status: 'REJECTED', reason: 'Unit Status: Already Claimed', details: { contractStartDate: foundUnit.contractStartDate, claimCount: foundUnit.claimCount } });
            addActivityLog({ id: foundUnit.id, serialNumber: foundUnit.serialNumber, company: foundCompany.id, processedBy: 'System Bot', action: 'Validation Check', status: 'Rejected (Claimed)', isBot: true });
        } else {
            setValidationResult({ status: 'ELIGIBLE', applicationId: foundUnit.id, company: foundCompany.id, unitId: foundUnit.id, serialNumber: foundUnit.serialNumber, details: { contractStartDate: foundUnit.contractStartDate, claimCount: foundUnit.claimCount, monthsAgo, expiryDate: eDate.toISOString() } });
            addActivityLog({ id: foundUnit.id, serialNumber: foundUnit.serialNumber, company: foundCompany.id, processedBy: currentUser.name, action: 'Validation Screen', status: 'Passed', isBot: false });
        }
    };

    const handleManualReject = () => {
        if (!validationResult || validationResult.status !== 'ELIGIBLE') return;

        const rejectStatus = `Rejected (${manualReason})`;

        setValidationResult({ 
            status: 'REJECTED', 
            reason: `Manual Reject: ${manualReason}`, 
            details: validationResult.details 
        });

        // Persist to Master Data
        setCompanies(prev => prev.map(c => ({
            ...c,
            units: c.units.map(u => u.id === validationResult.applicationId ? { 
                ...u, 
                statusOverride: rejectStatus
            } : u)
        })));

        addActivityLog({ 
            id: validationResult.applicationId, 
            serialNumber: validationResult.serialNumber,
            company: validationResult.company, 
            processedBy: currentUser.name, 
            action: 'Manual Rejection', 
            status: rejectStatus, 
            isBot: false 
        });
    };

    const handleProcessReplacement = () => {
        if (validationResult?.status === 'ELIGIBLE') {
            setCompanies(prev => prev.map(c => ({
                ...c,
                units: c.units.map(u => u.id === validationResult.applicationId ? { 
                    ...u, 
                    claimCount: u.claimCount + 1
                } : u)
            })));
            addActivityLog({ id: validationResult.applicationId, serialNumber: validationResult.serialNumber, company: validationResult.company, processedBy: currentUser.name, action: 'Process Claim', status: 'Approved', isBot: false });
            setValidationResult(null);
            setSearchInput('');
        }
    };

    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Warranty Validation Hub</h1>
                <p className="text-slate-500 mt-1 font-medium italic">Automated claim enforcement with manual administrative override capabilities.</p>
            </div>

            {/* Search Input Section */}
            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 relative">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 relative z-10">Validate by Application ID or Serial Number</label>
                <form onSubmit={handleValidate} className="flex flex-col sm:flex-row gap-4 relative z-10">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                        <input
                            type="text"
                            placeholder="e.g. BAT-26-001 or SN-100200"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-6 py-5 text-xl font-black focus:outline-none focus:ring-4 focus:ring-[#1A2B4C]/10 focus:border-[#1A2B4C] transition-all tracking-wide uppercase text-[#1A2B4C]"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!searchInput}
                        className="bg-[#1A2B4C] disabled:bg-slate-200 text-white px-10 rounded-2xl font-black uppercase tracking-widest hover:bg-[#253e6b] transition-all flex items-center justify-center gap-3 text-sm shadow-xl shadow-[#1A2B4C]/20 disabled:shadow-none hover:translate-y-[-2px] active:translate-y-0"
                    >
                        Validate <ArrowRight size={20} />
                    </button>
                </form>
            </div>

            {/* Validation Result Cards */}
            {validationResult && (
                <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
                    {validationResult.status === 'ELIGIBLE' ? (
                        <div className="bg-white border border-emerald-100 rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 p-10 flex flex-col lg:flex-row items-center gap-10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-48 bg-emerald-50 rounded-full blur-3xl opacity-60 -mr-24 -mt-24 pointer-events-none"></div>
                            
                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 flex-1">
                                <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-2xl shadow-emerald-500/40 relative">
                                    <CheckCircle size={48} />
                                </div>
                                <div className="text-center md:text-left">
                                    <h2 className="text-3xl font-black text-emerald-900 tracking-tight uppercase">Validation Passed</h2>
                                    <p className="text-emerald-600 font-black text-xs uppercase tracking-[0.15em] bg-emerald-50 border border-emerald-100 inline-block px-4 py-1.5 rounded-full mt-3">Eligible for replacement</p>
                                    
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 mt-8">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lifespan</p>
                                            <p className="text-lg font-black text-slate-800">{validationResult.details.monthsAgo} / 24 <span className="text-xs text-slate-400 font-medium">Months</span></p>
                                        </div>
                                        <div className="w-px h-8 bg-slate-100 hidden md:block"></div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Claim Quota</p>
                                            <p className="text-lg font-black text-slate-800">{validationResult.details.claimCount} / 1 <span className="text-xs text-slate-400 font-medium">Used</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Manual Override Section */}
                            <div className="bg-slate-50/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 relative z-10 w-full lg:w-72">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Physical Inspection Override</label>
                                <div className="space-y-4">
                                    <select 
                                        value={manualReason} 
                                        onChange={(e) => setManualReason(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/10"
                                    >
                                        <option value="Physical Damage">Physical Damage</option>
                                        <option value="User Error">User Error</option>
                                        <option value="Incomplete Docs">Incomplete Docs</option>
                                        <option value="Unauthorized Repair">Unauthorized Repair</option>
                                    </select>
                                    <button 
                                        onClick={handleManualReject}
                                        className="w-full bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-rose-200"
                                    >
                                        Manual Reject
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleProcessReplacement}
                                className="bg-[#1A2B4C] hover:bg-[#253e6b] text-white px-10 py-6 rounded-[2rem] font-black uppercase tracking-widest shadow-2xl shadow-[#1A2B4C]/20 relative z-10 w-full lg:w-auto transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                            >
                                Process Replacement
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white border border-rose-100 rounded-[2.5rem] shadow-2xl shadow-rose-900/5 p-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-48 bg-rose-50 rounded-full blur-3xl opacity-60 -mr-24 -mt-24 pointer-events-none"></div>
                            
                            <div className="bg-rose-500 rounded-3xl p-6 text-white shadow-2xl shadow-rose-500/40 relative z-10">
                                <XCircle size={48} />
                            </div>
                            <div className="relative z-10 flex-1 text-center md:text-left">
                                <h2 className="text-3xl font-black text-rose-900 tracking-tight uppercase">Automatic Reject</h2>
                                <p className="text-rose-600 font-black text-xs uppercase tracking-[0.15em] bg-rose-50 border border-rose-100 inline-block px-4 py-1.5 rounded-full mt-3">
                                    Reason: {validationResult.reason}
                                </p>

                                {validationResult.details && (
                                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center md:justify-start gap-10">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Coverage</p>
                                            <p className="font-bold text-slate-800 text-sm">{new Date(validationResult.details.contractStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                        {validationResult.details.expiryDate && (
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Policy Expiry</p>
                                                <p className="font-bold text-slate-800 text-sm">{new Date(validationResult.details.expiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* History Table */}
            <div className="mt-6">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h3 className="text-xl font-black text-[#1A2B4C] uppercase tracking-tight">Recent Validations</h3>
                        <p className="text-xs text-slate-500 font-medium italic">Integrated real-time log of recent validation attempts from Master Data.</p>
                    </div>
                    <button className="bg-white border border-slate-200 text-[#1A2B4C] px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
                        <Download size={14} /> Export Log
                    </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/30 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Application ID</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Serial Number</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Validation Date</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activityLogs.filter(log => log.action.includes('Validation') || log.action.includes('Warranty') || log.action.includes('Manual')).map((log) => (
                                <tr key={log.id + log.date} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 font-black text-[#1A2B4C] font-mono text-xs">{log.id}</td>
                                    <td className="px-8 py-5 text-slate-500 font-bold text-xs uppercase">{log.serialNumber || '-'}</td>
                                    <td className="px-8 py-5 text-slate-400 text-[11px] font-black uppercase tracking-tight">
                                        {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${log.status.includes('Passed') || log.status === 'Approved'
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${log.status.includes('Passed') || log.status === 'Approved' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {activityLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-8 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No activity recorded today.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default WarrantyCenter;
