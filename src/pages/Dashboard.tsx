import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Activity, ShieldCheck, Database, Zap, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useData, getBatteryStatus, type ActivityLog } from '../context/DataContext';
import { getRelativeTime } from '../utils/time';

// Trend data is now calculated dynamically inside the component

const Dashboard = () => {
    const { activityLogs, getTotalUnits, companies, selectedSource, setSelectedSource, sourceChannels } = useData();
    const location = useLocation();

    useEffect(() => {
        if (location.state && (location.state as any).scrollToLogs) {
            setTimeout(() => {
                const element = document.getElementById('activity-logs-section');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    window.history.replaceState({}, document.title);
                }
            }, 100);
        }
    }, [location]);

    // Calculate Asset Status Distribution
    let act = 0, exp = 0, clm = 0;

    // Calculate Expiring Soon
    const expiringSoon: { id: string, model: string, serialNumber: string, daysLeft: number, expiryDateStr: string }[] = [];

    // Model stats
    const modelCounts: Record<string, number> = {};
    const claimCounts: Record<string, number> = {};

    let underWarranty = 0;
    let allTimeClaims = 0;

    companies.forEach(c => c.units.forEach(u => {
        if (selectedSource !== 'All Partners' && u.sourceChannel !== selectedSource) return;

        const s = getBatteryStatus(u.contractStartDate, u.claimCount);
        if (s === 'Active') act++;
        else if (s === 'Expired') exp++;
        else if (s === 'Claimed') clm++;

        // All-Time Claims Logic (even if expired)
        if (u.claimCount > 0) allTimeClaims++;

        // Warranty Coverage Logic
        const install = new Date(u.contractStartDate);
        const expiryDate = new Date(install);
        expiryDate.setMonth(expiryDate.getMonth() + 24);
        if (new Date() < expiryDate) underWarranty++;

        const model = u.batteryModel;
        modelCounts[model] = (modelCounts[model] || 0) + 1;
        if (s === 'Claimed') {
            claimCounts[model] = (claimCounts[model] || 0) + 1;
        }

        // Expiring Soon Logic
        if (u.claimCount === 0) {
            const expiryDateStr = expiryDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            const diffTime = expiryDate.getTime() - new Date().getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 0 && diffDays <= 30) {
                expiringSoon.push({ id: u.id, model: u.batteryModel, serialNumber: u.serialNumber, daysLeft: diffDays, expiryDateStr });
            }
        }
    }));

    const topExpiring = expiringSoon.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);

    const totalFilteredUnits = useMemo(() => {
        if (selectedSource === 'All Partners') return getTotalUnits();
        return companies.reduce((acc, c) => acc + c.units.filter(u => u.sourceChannel === selectedSource).length, 0);
    }, [companies, selectedSource, getTotalUnits]);

    const tot = useMemo(() => {
        return totalFilteredUnits === 0 ? 1 : totalFilteredUnits;
    }, [totalFilteredUnits]);
    
    // Claim Ratio: Total All-Time Claimed Units / Total Assets
    const claimRatio = ((allTimeClaims / tot) * 100).toFixed(1);

    // Recent Claims (Current Calendar Month Only)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyClaimsCount = useMemo(() => {
        return activityLogs.filter(log => {
            if (selectedSource !== 'All Partners') {
                const unit = companies.flatMap(c => c.units).find(u => u.id === log.id || u.serialNumber === log.serialNumber);
                if (!unit || unit.sourceChannel !== selectedSource) return false;
            }
            const logDate = new Date(log.date);
            return (log.action.includes('Claim') || log.status === 'Approved') && 
                   logDate.getMonth() === currentMonth && 
                   logDate.getFullYear() === currentYear;
        }).length;
    }, [activityLogs, selectedSource, companies, currentMonth, currentYear]);

    const coveragePercent = ((underWarranty / tot) * 100).toFixed(1);

    // Dynamic Monthly Trend Logic (Last 6 Months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const dynamicTrendData = useMemo(() => {
        return Array.from({ length: 6 }).map((_, i) => {
            const targetDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            const m = targetDate.getMonth();
            const y = targetDate.getFullYear();
            
            const logsInMonth = activityLogs.filter(log => {
                if (selectedSource !== 'All Partners') {
                    const unit = companies.flatMap(c => c.units).find(u => u.id === log.id || u.serialNumber === log.serialNumber);
                    if (!unit || unit.sourceChannel !== selectedSource) return false;
                }
                const logDate = new Date(log.date);
                return logDate.getMonth() === m && logDate.getFullYear() === y;
            });

            return {
                time: monthNames[m],
                processed: logsInMonth.filter(l => l.status === 'Approved' || l.status === 'Validated' || l.action.includes('Claim')).length,
                rejected: logsInMonth.filter(l => l.status.includes('Rejected')).length
            };
        });
    }, [activityLogs, selectedSource, companies, now, monthNames]);

    const dynamicDonut = [
        { name: 'Active', value: totalFilteredUnits === 0 ? 0 : Math.round((act / totalFilteredUnits) * 100), color: '#22c55e' },
        { name: 'Expired', value: totalFilteredUnits === 0 ? 0 : Math.round((exp / totalFilteredUnits) * 100), color: '#f59e0b' },
        { name: 'Claimed', value: totalFilteredUnits === 0 ? 0 : Math.round((clm / totalFilteredUnits) * 100), color: '#ef4444' },
    ];

    // Regroup models after cleaning names (remove text in parentheses)
    const cleanAndGroup = (counts: Record<string, number>) => {
        const grouped: Record<string, number> = {};
        Object.entries(counts).forEach(([fullName, count]) => {
            // Remove text in parentheses and fallback to 'Unknown' if empty
            const cleanName = (fullName || 'Unknown').replace(/\s*\(.*\)/, '').trim() || 'Unknown';
            grouped[cleanName] = (grouped[cleanName] || 0) + count;
        });
        return grouped;
    };

    const groupedModels = cleanAndGroup(modelCounts);
    const groupedClaims = cleanAndGroup(claimCounts);

    const topModels = Object.entries(groupedModels)
        .map(([name, units]) => ({ name, units }))
        .sort((a, b) => b.units - a.units)
        .slice(0, 5);

    const topClaimedModels = Object.entries(groupedClaims)
        .map(([name, claims]) => ({ name, claims }))
        .sort((a, b) => b.claims - a.claims)
        .slice(0, 5);

    const filteredActivityLogs = useMemo(() => {
        if (selectedSource === 'All Partners') return activityLogs;
        return activityLogs.filter(log => {
            const unit = companies.flatMap(c => c.units).find(u => u.id === log.id || u.serialNumber === log.serialNumber);
            return unit?.sourceChannel === selectedSource;
        });
    }, [activityLogs, selectedSource, companies]);

    return (
        <div className="max-w-7xl mx-auto w-full pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Executive Dashboard</h1>
                    <p className="text-slate-500 mt-1">High-level overview of system activity and active warranties.</p>
                </div>
                <div className="relative">
                    <select
                        value={selectedSource}
                        onChange={(e) => setSelectedSource(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 shadow-sm cursor-pointer"
                    >
                        <option value="All Partners">All Partners</option>
                        {sourceChannels.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            {/* KPI Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Total Assets</p>
                        <p className="text-3xl font-black text-slate-800">{totalFilteredUnits.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                        <Database size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Claim Ratio</p>
                        <p className="text-3xl font-black text-[#1A2B4C]">{claimRatio}%</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-[#1A2B4C]">
                        <ShieldCheck size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Monthly Claims</p>
                        <p className="text-3xl font-black text-rose-600">{monthlyClaimsCount}</p>
                    </div>
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-600">
                        <Activity size={24} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Warranty Coverage</p>
                        <p className="text-3xl font-black text-blue-600">{coveragePercent}%</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                        <Zap size={24} />
                    </div>
                </div>
            </div>

            {/* Middle Section: Row 1 Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Left: 2/3 Area Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 text-lg">Real-Time Warranty Claims Trend</h3>
                        <div className="flex gap-4 text-xs font-bold">
                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500"></span> Processed</div>
                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-500"></span> Rejected</div>
                        </div>
                    </div>
                    <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dynamicTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorProcessed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="processed" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorProcessed)" />
                                <Area type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorRejected)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right: 1/3 Donut Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 text-lg mb-2">Asset Status Distribution</h3>
                    <div className="flex-1 flex justify-center items-center relative min-h-[180px]">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-slate-800">{totalFilteredUnits}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">UNITS</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={dynamicDonut}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={85}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {dynamicDonut.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-2 space-y-2.5">
                        {dynamicDonut.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-slate-600 font-medium">{item.name}</span>
                                </div>
                                <span className="font-bold text-slate-800">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Middle Section: Row 2 Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Left: Top Battery Models */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 text-sm mb-4">Top Battery Models in Circulation</h3>
                    <div className="h-48 w-full flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={topModels} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    interval={0}
                                    tick={{ fontSize: 10, fill: '#1e293b', fontWeight: 800 }} 
                                    width={100} 
                                />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="units" fill="#1A2B4C" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Middle: Highest Claim Rate by Model */}
                <div className="bg-white p-6 rounded-xl border border-rose-100 shadow-sm flex flex-col">
                    <h3 className="font-bold text-rose-800 text-sm mb-4 flex items-center gap-2">Highest Claim Rate by Model</h3>
                    <div className="h-48 w-full flex-1">
                        {topClaimedModels.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={topClaimedModels} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        interval={0}
                                        tick={{ fontSize: 10, fill: '#9f1239', fontWeight: 800 }} 
                                        width={100} 
                                    />
                                    <Tooltip cursor={{ fill: '#fff1f2' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="claims" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                                <ShieldCheck size={28} className="text-emerald-200 mb-2" />
                                <p className="text-xs font-semibold text-emerald-600/70">No Claims Detected</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Warranty Expiring Soon */}
                <div className="bg-white rounded-xl border border-rose-200 shadow-sm flex flex-col overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/30">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-amber-500" />
                            Expiring Soon (&lt; 30 Days)
                        </h3>
                    </div>
                    <div className="flex-1 p-5 overflow-auto">
                        {topExpiring.length ? (
                            <div className="space-y-4">
                                {topExpiring.map((unit, i) => (
                                    <div key={i} className="flex items-start justify-between border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                                        <div>
                                            <p className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded w-fit mb-1">{unit.id}</p>
                                            <p className="text-sm font-bold text-[#1A2B4C] truncate max-w-[120px] sm:max-w-xs">{unit.model}</p>
                                            <p className="text-[10px] font-mono text-slate-500 mt-0.5">SN: {unit.serialNumber}</p>
                                        </div>
                                        <div className="text-right flex flex-col justify-end items-end">
                                            <span className="inline-block bg-amber-100 text-amber-800 font-black text-[10px] px-2 py-0.5 rounded shadow-sm mb-1">
                                                {unit.daysLeft} Days Left
                                            </span>
                                            <p className="text-[9px] font-bold text-slate-400 tracking-wider">EXP: {unit.expiryDateStr.toUpperCase()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-6">
                                <ShieldCheck size={32} className="text-emerald-100 mb-2" />
                                <p className="text-sm font-medium">All warranties are healthy.</p>
                                <p className="text-xs mt-0.5">No units expiring in the next 30 days.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Activity Log Table */}
            <div id="activity-logs-section" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6 scroll-mt-6">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-bold text-slate-800">Recent System Activity Log</h3>
                    <p className="text-xs text-slate-500 mt-1">Real-time trace of automated enforcement responses.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                        <thead className="bg-white border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-3 text-[10px] font-semibold uppercase text-slate-500 tracking-wider">Application ID</th>
                                <th className="px-3 py-3 text-[10px] font-semibold uppercase text-slate-500 tracking-wider">Serial Number</th>
                                <th className="px-3 py-3 text-[10px] font-semibold uppercase text-slate-500 tracking-wider">Model</th>
                                <th className="px-3 py-3 text-[10px] font-semibold uppercase text-slate-500 tracking-wider">Action</th>
                                <th className="px-3 py-3 text-[10px] font-semibold uppercase text-slate-500 tracking-wider">Operator</th>
                                <th className="px-3 py-3 text-[10px] font-semibold uppercase text-slate-500 tracking-wider">Timestamp</th>
                                <th className="px-3 py-3 text-[10px] font-semibold uppercase text-slate-500 tracking-wider text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredActivityLogs.map((log: ActivityLog, i: number) => {
                                // Find unit details from companies list
                                let unitDetails = null;
                                for (const c of companies) {
                                    const u = c.units.find(unit => unit.id === log.id);
                                    if (u) { unitDetails = u; break; }
                                }

                                return (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-3 font-bold text-[#1A2B4C] font-mono text-xs">{log.id}</td>
                                        <td className="px-3 py-3 text-slate-600 font-mono text-[10px]">{unitDetails?.serialNumber || log.serialNumber || '-'}</td>
                                        <td className="px-3 py-3 text-slate-700 font-bold text-[10px] max-w-[140px] truncate">{unitDetails?.batteryModel || 'Unknown Model'}</td>
                                        <td className="px-3 py-3 font-medium text-slate-600 text-xs">{log.action}</td>
                                        <td className="px-3 py-3 text-slate-600 text-xs">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                                log.processedBy === 'System Bot'
                                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                            }`}>
                                                {log.processedBy}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-slate-500 text-xs">{getRelativeTime(log.date)}</td>
                                        <td className="px-3 py-3 flex justify-end">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold ${log.status === 'Validated' || log.status === 'Approved'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'Validated' || log.status === 'Approved' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                {log.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
