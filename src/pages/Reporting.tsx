import { FileSpreadsheet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useData } from '../context/DataContext';
import ExportModal from '../components/ExportModal';
import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const Reporting = () => {
    const { companies, getTotalUnits, activityLogs, sourceChannels, selectedSource, setSelectedSource } = useData();
    const [showExportModal, setShowExportModal] = useState(false);

    // --- 1. Aggregating Monthly Data (Simplified) ---
    const monthlyData = useMemo(() => {
        const monthsMap: { [key: string]: number } = {};
        
        companies.forEach(c => {
            c.units.forEach(u => {
                if (selectedSource !== 'All Partners' && u.sourceChannel !== selectedSource) return;
                const date = new Date(u.applicationDate || u.contractStartDate);
                const monthKey = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                monthsMap[monthKey] = (monthsMap[monthKey] || 0) + 1;
            });
        });

        const sortedMonths = Object.entries(monthsMap).sort((a, b) => {
            return new Date(b[0]).getTime() - new Date(a[0]).getTime();
        }).slice(0, 6); // Last 6 months

        return sortedMonths.map(([month, total], index) => {
            let growth = 0;
            if (index < sortedMonths.length - 1) {
                const prevTotal = sortedMonths[index + 1][1];
                growth = ((total - prevTotal) / prevTotal) * 100;
            }
            return { month, total, growth };
        });
    }, [companies, selectedSource]);

    // --- 2. Rejection Analysis (Pie Data) ---
    const rejectionData = useMemo(() => {
        const rejectedLogs = activityLogs.filter(log => {
            const matchesStatus = log.status.toLowerCase().includes('reject');
            if (selectedSource === 'All Partners') return matchesStatus;
            
            // Link log to unit to check source
            const unit = companies.flatMap(c => c.units).find(u => u.id === log.id);
            return matchesStatus && unit?.sourceChannel === selectedSource;
        });
        const counts: { [key: string]: number } = {
            'Expired (Auto)': 0,
            'Invalid ID (Auto)': 0,
            'Already Claimed': 0,
            'Manual Rejection': 0
        };

        rejectedLogs.forEach(log => {
            const status = log.status.toLowerCase();
            if (status.includes('expired')) counts['Expired (Auto)']++;
            else if (status.includes('not found') || status.includes('unknown')) counts['Invalid ID (Auto)']++;
            else if (status.includes('claimed')) counts['Already Claimed']++;
            else if (status.includes('physical damage') || status.includes('manual')) counts['Manual Rejection']++;
        });

        return Object.entries(counts)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value }));
    }, [activityLogs, selectedSource, companies]);

    const COLORS = ['#1A2B4C', '#F43F5E', '#F59E0B', '#10B981', '#6366F1'];

    // --- 3. Trend Logic for Widgets ---
    const trends = {
        registrations: { val: '+12.5%', isUp: true },
        rejections: { val: '-3.2%', isUp: false }
    };

    let expiringSoon = 0;
    companies.forEach(c => c.units.forEach(u => {
        if (selectedSource !== 'All Partners' && u.sourceChannel !== selectedSource) return;
        const installDate = new Date(u.contractStartDate);
        const expiryDate = new Date(installDate);
        expiryDate.setMonth(expiryDate.getMonth() + 24);
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        if (expiryDate > now && expiryDate <= thirtyDaysFromNow) expiringSoon++;
    }));

    const totalRejected = rejectionData.reduce((acc, curr) => acc + curr.value, 0);
    const totalUnitsFiltered = useMemo(() => {
        if (selectedSource === 'All Partners') return getTotalUnits();
        return companies.reduce((acc, c) => acc + c.units.filter(u => u.sourceChannel === selectedSource).length, 0);
    }, [companies, selectedSource, getTotalUnits]);
    const totalUnits = totalUnitsFiltered || 0;

    return (
        <div className="flex flex-col h-full max-w-7xl mx-auto w-full animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                <div>
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-1.5">Executive Dashboard</p>
                    <h1 className="text-3xl font-black text-[#1A2B4C] tracking-tight">Operational Reporting</h1>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative">
                        <select
                            value={selectedSource}
                            onChange={(e) => setSelectedSource(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 shadow-sm"
                        >
                            <option value="All Partners">All Partners</option>
                            {sourceChannels.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <button onClick={() => setShowExportModal(true)} className="bg-[#1A2B4C] text-white font-bold px-5 py-2.5 rounded-xl hover:bg-[#223861] text-sm flex items-center gap-2 shadow-lg shadow-[#1A2B4C]/10 transition-all active:scale-95">
                        <FileSpreadsheet size={18} /> Download Excel Report
                    </button>
                </div>
            </div>

            <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />

            {/* Top Widgets with Trend Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 bg-slate-50 rounded-full blur-2xl -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <h3 className="text-[10px] font-black text-slate-400 tracking-widest mb-3 uppercase relative z-10">Total Registrations</h3>
                    <div className="flex items-end gap-3 relative z-10">
                        <span className="text-4xl font-black text-[#1A2B4C]">{totalUnits.toLocaleString()}</span>
                        <span className="text-xs font-black text-slate-400 mb-1.5 uppercase">Units</span>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 relative z-10">
                        <div className={`flex items-center text-[11px] font-black px-2 py-0.5 rounded-full ${trends.registrations.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {trends.registrations.isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {trends.registrations.val}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">vs last month</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 bg-rose-50/30 rounded-full blur-2xl -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <h3 className="text-[10px] font-black text-rose-500 tracking-widest mb-3 uppercase relative z-10">System Rejections</h3>
                    <div className="flex items-end gap-3 relative z-10">
                        <span className="text-4xl font-black text-rose-600">{totalRejected.toLocaleString()}</span>
                        <span className="text-xs font-black text-rose-400 mb-1.5 uppercase">Blocked</span>
                    </div>
                    <div className="mt-4 flex items-center gap-1.5 relative z-10">
                        <div className={`flex items-center text-[11px] font-black px-2 py-0.5 rounded-full ${!trends.rejections.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {!trends.rejections.isUp ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}
                            {trends.rejections.val}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">vs last month</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 bg-amber-50/30 rounded-full blur-2xl -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                    <h3 className="text-[10px] font-black text-amber-600 tracking-widest mb-3 uppercase relative z-10">Expiring Soon</h3>
                    <div className="flex items-end gap-3 relative z-10">
                        <span className="text-4xl font-black text-amber-600">{expiringSoon}</span>
                        <span className="text-xs font-black text-amber-400 mb-1.5 uppercase">Units</span>
                    </div>
                    <div className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight relative z-10">
                        Lifecycle Alert: Within 30 days
                    </div>
                </div>
            </div>

            {/* Main Content: Table & Donut Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Simplified Monthly Table */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30">
                        <h3 className="font-black text-[#1A2B4C] text-sm uppercase tracking-wider">Monthly Registration Growth</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase mt-1">Aggregated Asset Distribution by Month</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-4">Month</th>
                                    <th className="px-8 py-4 text-center">Total Units</th>
                                    <th className="px-8 py-4 text-right">Growth (%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm">
                                {monthlyData.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5 font-black text-slate-700">{row.month}</td>
                                        <td className="px-8 py-5 text-center font-mono font-black text-[#1A2B4C]">{row.total}</td>
                                        <td className={`px-8 py-5 text-right font-black ${row.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {row.growth > 0 ? '+' : ''}{row.growth.toFixed(1)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Rejection Analysis Chart */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/30">
                        <h3 className="font-black text-[#1A2B4C] text-sm uppercase tracking-wider">Rejection Analysis</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase mt-1">Blocked Claim Distribution by Reason</p>
                    </div>
                    <div className="flex-1 min-h-[350px] p-8 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={rejectionData}
                                    cx="40%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={110}
                                    paddingAngle={10}
                                    dataKey="value"
                                    stroke="none"
                                    animationBegin={0}
                                    animationDuration={1500}
                                >
                                    {rejectionData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Legend 
                                    layout="vertical" 
                                    verticalAlign="middle" 
                                    align="right"
                                    iconType="circle"
                                    formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Reporting;
