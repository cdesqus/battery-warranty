import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Database, ShieldCheck, BarChart3, Settings, Bell, CircleUser, X, AlertTriangle, ShieldAlert, History, LogOut } from 'lucide-react';
import { useData } from '../context/DataContext';

const Layout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, companies, activityLogs, logout } = useData();

    if (!currentUser) return null;

    const getInitials = (name: string) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getBreadcrumbs = () => {
        switch (location.pathname) {
            case '/':
                return 'Pages / Executive Overview';
            case '/master-data':
                return 'Management / Master Data Repository';
            case '/warranty':
                return 'Tools / Warranty Validation';
            case '/reporting':
                return 'Analytics / Claims Reporting';
            case '/settings':
                return 'Configuration / System Settings';
            default:
                return 'Presales Monitoring System';
        }
    };

    const [showNotifications, setShowNotifications] = useState(false);

    // Derived Notifications Logic
    const notifications = [
        // 1. Expiry Alerts (Derived from Companies)
        ...companies.flatMap(c => c.units.map(u => {
            if (u.claimCount > 0) return null; // Already claimed
            const install = new Date(u.contractStartDate);
            const expiry = new Date(install);
            expiry.setMonth(expiry.getMonth() + 24);
            const diff = expiry.getTime() - new Date().getTime();
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
            
            if (days > 0 && days <= 30) {
                return {
                    id: `exp-${u.id}`,
                    title: 'Contract Expiring Soon',
                    description: `Unit ${u.id} (SN: ${u.serialNumber}) is expiring in ${days} days.`,
                    type: 'EXPIRY',
                    timestamp: 'Priority'
                };
            }
            return null;
        })).filter(Boolean),
        // 2. Activity Alerts (Filtered from Logs)
        ...activityLogs.filter(log => 
            log.action.includes('Claim') || 
            log.status.includes('Rejected') || 
            log.status.includes('Expired')
        ).map(log => {
            const sourceId = log.company.startsWith('COMP-') ? `Source ${log.company.replace('COMP-', '')}` : log.company;
            return {
                id: `log-${log.id}-${log.timestamp}`,
                title: log.action.includes('Claim') ? 'Asset Claim Processed' : 'Policy Violation Blocked',
                description: `Unit ${log.id} (SN: ${log.serialNumber || 'N/A'}) from ${sourceId} is marked as ${log.status}.`,
                type: log.status.includes('Rejected') ? 'REJECT' : 'CLAIM',
                timestamp: log.timestamp
            };
        })
    ].slice(0, 10); // Limit to latest 10

    return (
        <div className="flex h-screen bg-[#F8FAFC] font-inter overflow-hidden">
            {/* Notification Drawer Overlay */}
            {showNotifications && (
                <div 
                    className="fixed inset-0 bg-slate-900/20 z-[100] transition-all"
                    onClick={() => setShowNotifications(false)}
                >
                    <div 
                        className="absolute top-0 right-0 h-full w-[400px] bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Asset Monitoring Alerts</h3>
                                <p className="text-xs text-slate-500 font-medium">Critical warranty & claim updates</p>
                            </div>
                            <button 
                                onClick={() => setShowNotifications(false)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-auto">
                            {notifications.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {notifications.map((n: any) => (
                                        <div key={n.id} className="p-5 hover:bg-slate-50 transition-colors group cursor-default">
                                            <div className="flex gap-4">
                                                <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                    n.type === 'EXPIRY' ? 'bg-amber-100 text-amber-600' :
                                                    n.type === 'REJECT' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'
                                                }`}>
                                                    {n.type === 'EXPIRY' ? <AlertTriangle size={20} /> :
                                                     n.type === 'REJECT' ? <ShieldAlert size={20} /> : <History size={20} />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className="font-bold text-slate-800 text-sm">{n.title}</p>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{n.timestamp}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                                        {n.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                                    <Bell size={48} className="text-slate-200 mb-4" />
                                    <p className="text-slate-500 font-bold">No Critical Alerts</p>
                                    <p className="text-xs text-slate-400 mt-1">Your assets are currently healthy and within warranty terms.</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                            <button 
                                onClick={() => {
                                    setShowNotifications(false);
                                    navigate('/');
                                }}
                                className="w-full py-3 text-xs font-black text-[#1A2B4C] hover:bg-white rounded-xl border border-slate-200 transition-all uppercase tracking-widest shadow-sm"
                            >
                                View All Logs
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className="w-64 bg-[#1A2B4C] text-white flex flex-col hidden md:flex">
                <div className="p-6 border-b border-slate-700">
                    <h1 className="text-xl font-bold tracking-wider">PRESALES PRO</h1>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Enterprise System</p>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-2">
                    <NavLink to="/" end className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 font-semibold' : 'hover:bg-white/5 text-slate-300'}`}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/master-data" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 font-semibold' : 'hover:bg-white/5 text-slate-300'}`}>
                        <Database size={20} />
                        <span>Master Data</span>
                    </NavLink>
                    {currentUser.role !== 'Viewer' && (
                        <NavLink to="/warranty" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 font-semibold' : 'hover:bg-white/5 text-slate-300'}`}>
                            <ShieldCheck size={20} />
                            <span>Warranty Center</span>
                        </NavLink>
                    )}
                    <NavLink to="/reporting" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 font-semibold' : 'hover:bg-white/5 text-slate-300'}`}>
                        <BarChart3 size={20} />
                        <span>Reports</span>
                    </NavLink>
                    {currentUser.role === 'Super Admin' && (
                        <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 font-semibold' : 'hover:bg-white/5 text-slate-300'}`}>
                            <Settings size={20} />
                            <span>Settings</span>
                        </NavLink>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-700 bg-[#14223d]">
                    <div className="flex items-center justify-between px-2 py-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden">
                                <CircleUser size={24} className="text-slate-300" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">{currentUser.name}</p>
                                <p className="text-xs text-slate-400">{currentUser.role}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                logout();
                                navigate('/login');
                            }}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                            title="Log Out"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content View */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 w-full shadow-sm">
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-sm tracking-wide text-slate-500 uppercase">{getBreadcrumbs()}</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 hover:bg-slate-100 rounded-full transition-all group"
                            >
                                <Bell size={20} className="text-slate-500 group-hover:text-[#1A2B4C]" />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 border-l pl-6 border-slate-200">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                {getInitials(currentUser.name)}
                            </div>
                            <span className="text-sm font-medium text-slate-700">{currentUser.name}</span>
                        </div>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-auto p-8 relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
