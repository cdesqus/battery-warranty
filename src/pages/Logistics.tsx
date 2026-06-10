import React, { useState, useMemo } from 'react';
import { Search, Plus, Package, CheckCircle2, Navigation, X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useData } from '../context/DataContext';

const Logistics: React.FC = () => {
    const { 
        companies, 
        logistics, 
        addLogistics, 
        updateLogistics, 
        currentUser,
        isBackendAvailable
    } = useData();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    
    // Form states
    const [selectedAppId, setSelectedAppId] = useState('');
    const [shippingType, setShippingType] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [courierName, setCourierName] = useState('JNE Express');
    const [shippingStatus, setShippingStatus] = useState<'PREPARING' | 'IN_TRANSIT' | 'DELIVERED'>('PREPARING');
    const [currentLocation, setCurrentLocation] = useState('Warranty Kit handed over to courier at Central Warehouse');
    
    // Local state to keep track of location input field edits before blur/save
    const [localLocations, setLocalLocations] = useState<Record<string, string>>({});

    // UX feedback states
    const [toast, setToast] = useState<string | null>(null);

    const showToastMsg = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // Filter units that don't have tracking registered yet
    const untrackedUnits = useMemo(() => {
        const trackedIds = new Set(logistics.map(l => l.applicationId));
        const list: { id: string; serialNumber: string; batteryModel: string }[] = [];
        
        companies.forEach(comp => {
            comp.units.forEach(u => {
                if (!trackedIds.has(u.id)) {
                    list.push({
                        id: u.id,
                        serialNumber: u.serialNumber,
                        batteryModel: u.batteryModel
                    });
                }
            });
        });
        return list;
    }, [companies, logistics]);

    // Filter and search tracking records
    const filteredLogistics = useMemo(() => {
        return logistics.filter(item => {
            const matchesSearch = 
                item.applicationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.batteryModel && item.batteryModel.toLowerCase().includes(searchTerm.toLowerCase())) ||
                item.courierName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = 
                selectedStatusFilter === 'All' || 
                item.shippingStatus === selectedStatusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [logistics, searchTerm, selectedStatusFilter]);

    // Statistics counts
    const stats = useMemo(() => {
        const total = logistics.length;
        const inbound = logistics.filter(l => l.shippingType === 'INBOUND').length;
        const outbound = logistics.filter(l => l.shippingType === 'OUTBOUND').length;
        const delivered = logistics.filter(l => l.shippingStatus === 'DELIVERED').length;
        return { total, inbound, outbound, delivered };
    }, [logistics]);

    const handleGenerateDummyTracking = () => {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        setTrackingNumber(`RESI-DUMMY-${randomNum}`);
    };

    const handleRegisterShipment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAppId || !trackingNumber || !courierName || !shippingStatus || !currentLocation) return;

        try {
            await addLogistics(selectedAppId, shippingType, courierName, trackingNumber, shippingStatus, currentLocation);
            showToastMsg(`Shipment registered successfully for ${selectedAppId}!`);
            setShowRegisterModal(false);
            
            // Reset form
            setSelectedAppId('');
            setShippingType('INBOUND');
            setTrackingNumber('');
            setCourierName('JNE Express');
            setShippingStatus('PREPARING');
            setCurrentLocation('Warranty Kit handed over to courier at Central Warehouse');
        } catch (err) {
            console.error(err);
            showToastMsg('Failed to register shipment');
        }
    };

    const handleStatusChange = async (appId: string, newStatus: 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED', currentLoc: string) => {
        try {
            await updateLogistics(appId, newStatus, currentLoc);
            showToastMsg(`Status updated to ${newStatus}`);
        } catch (err) {
            console.error(err);
            showToastMsg('Failed to update status');
        }
    };

    const handleLocationBlur = async (appId: string, currentStatus: 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED', originalLoc: string) => {
        const editedLoc = localLocations[appId];
        if (editedLoc === undefined) return;
        
        const trimmed = editedLoc.trim();
        if (trimmed === originalLoc) return;

        try {
            await updateLogistics(appId, currentStatus, trimmed);
            showToastMsg('Location updated successfully');
        } catch (err) {
            console.error(err);
            showToastMsg('Failed to update location');
        }
    };

    const courierOptions = ['JNE Express', 'J&T Express', 'Sicepat Express', 'DHL Express', 'FedEx', 'Ninja Van'];

    return (
        <div className="flex flex-col h-full w-full bg-slate-50 p-6 space-y-6 overflow-y-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-[#1A2B4C] tracking-tight uppercase">Manual Logistics Tracking</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Directly update shipment stages, route type destinations, and physical warranty kit delivery states.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Database / Sandbox connection badge indicator */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-black shadow-sm border ${
                         isBackendAvailable 
                             ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                             : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${isBackendAvailable ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`}></span>
                        {isBackendAvailable ? 'Live DB Synced' : 'Sandbox fallback'}
                    </div>

                    {currentUser?.role !== 'Viewer' && (
                        <button
                            onClick={() => setShowRegisterModal(true)}
                            className="flex items-center gap-2 bg-[#1A2B4C] hover:bg-[#253e6b] text-white px-4 py-2.5 rounded-xl font-bold transition-all text-xs uppercase tracking-wider shadow-lg shadow-[#1A2B4C]/25 cursor-pointer"
                        >
                            <Plus size={16} />
                            Register Shipment
                        </button>
                    )}
                </div>
            </div>

            {/* Toast Alert */}
            {toast && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-top-6 duration-200 font-semibold text-sm">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <span>{toast}</span>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-[#1A2B4C] transition-all duration-300">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Tracked</span>
                        <span className="text-3xl font-black text-[#1A2B4C] mt-1 block">{stats.total}</span>
                    </div>
                    <div className="bg-slate-50 text-[#1A2B4C] p-3.5 rounded-2xl group-hover:bg-[#1A2B4C] group-hover:text-white transition-colors duration-300">
                        <Package size={22} />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-indigo-500 transition-all duration-300">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Inbound (To Repair)</span>
                        <span className="text-3xl font-black text-indigo-600 mt-1 block">{stats.inbound}</span>
                    </div>
                    <div className="bg-indigo-50 text-indigo-600 p-3.5 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                        <ArrowUpRight size={22} />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-amber-500 transition-all duration-300">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Outbound (To User)</span>
                        <span className="text-3xl font-black text-amber-600 mt-1 block">{stats.outbound}</span>
                    </div>
                    <div className="bg-amber-50 text-amber-600 p-3.5 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                        <ArrowDownLeft size={22} />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-emerald-500 transition-all duration-300">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Delivered & Closed</span>
                        <span className="text-3xl font-black text-emerald-600 mt-1 block">{stats.delivered}</span>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                        <CheckCircle2 size={22} />
                    </div>
                </div>
            </div>

            {/* Filter and Table Container */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[400px]">
                {/* Table Header / Action Controls */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                    {/* Search Field */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by Tracking, Application ID, SKU..."
                            className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/15 focus:border-[#1A2B4C] text-xs font-semibold bg-white transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Status Selectors */}
                    <div className="flex gap-1.5 shrink-0 overflow-x-auto pb-1 md:pb-0">
                        {['All', 'PREPARING', 'IN_TRANSIT', 'DELIVERED'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setSelectedStatusFilter(filter)}
                                className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider transition-all uppercase border cursor-pointer ${
                                    selectedStatusFilter === filter
                                        ? 'bg-[#1A2B4C] text-white border-[#1A2B4C] shadow-sm'
                                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                            >
                                {filter.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Shipping Table */}
                <div className="flex-1 overflow-auto relative">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="sticky top-0 bg-slate-50 z-20 shadow-sm outline outline-1 outline-slate-100">
                            <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                <th className="px-6 py-3.5">Logistics Asset</th>
                                <th className="px-6 py-3.5">Shipping Type</th>
                                <th className="px-6 py-3.5">Courier Channel</th>
                                <th className="px-6 py-3.5 text-center">Shipping Status</th>
                                <th className="px-6 py-3.5">Current Location (Editable)</th>
                                <th className="px-6 py-3.5 text-right">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogistics.map((item) => (
                                <tr key={item.applicationId} className="hover:bg-slate-50/50 transition-colors group">
                                    {/* Application ID & SKU */}
                                    <td className="px-6 py-4.5">
                                        <div className="flex flex-col">
                                            <span className="font-mono font-black text-xs text-[#1A2B4C]">{item.applicationId}</span>
                                            {item.batteryModel && (
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight mt-0.5">
                                                    {item.batteryModel} • SN: {item.serialNumber || 'N/A'}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Shipping Type Badges */}
                                    <td className="px-6 py-4.5">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                                            item.shippingType === 'INBOUND'
                                                ? 'bg-blue-50 text-blue-600 border-blue-100'
                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                        }`}>
                                            {item.shippingType === 'INBOUND' ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                                            {item.shippingType}
                                        </span>
                                    </td>

                                    {/* Courier Details */}
                                    <td className="px-6 py-4.5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs text-slate-800">{item.courierName}</span>
                                            <span className="font-mono text-[10px] font-bold text-slate-400 mt-0.5 select-all">
                                                {item.trackingNumber}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Shipping Status Dropdown */}
                                    <td className="px-6 py-4.5 text-center">
                                        {currentUser?.role !== 'Viewer' ? (
                                            <select
                                                value={item.shippingStatus}
                                                onChange={(e) => handleStatusChange(
                                                    item.applicationId, 
                                                    e.target.value as any, 
                                                    localLocations[item.applicationId] !== undefined ? localLocations[item.applicationId] : item.currentLocation
                                                )}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 ${
                                                    item.shippingStatus === 'DELIVERED' 
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                                        : item.shippingStatus === 'IN_TRANSIT'
                                                            ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                                            : 'bg-amber-50 text-amber-600 border-amber-200'
                                                }`}
                                            >
                                                <option value="PREPARING">PREPARING</option>
                                                <option value="IN_TRANSIT">IN TRANSIT</option>
                                                <option value="DELIVERED">DELIVERED</option>
                                            </select>
                                        ) : (
                                            <span className={`inline-flex items-center justify-center w-[100px] py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                                                item.shippingStatus === 'DELIVERED' 
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                    : item.shippingStatus === 'IN_TRANSIT'
                                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                        : 'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                                {item.shippingStatus.replace('_', ' ')}
                                            </span>
                                        )}
                                    </td>

                                    {/* Editable Current Location */}
                                    <td className="px-6 py-4.5 min-w-[280px]">
                                        {currentUser?.role !== 'Viewer' ? (
                                            <input
                                                type="text"
                                                className="w-full border border-slate-200 focus:border-[#1A2B4C] focus:ring-1 focus:ring-[#1A2B4C] rounded-xl px-3 py-1.5 text-xs font-semibold bg-slate-50/50 hover:bg-white transition-all focus:bg-white"
                                                value={localLocations[item.applicationId] !== undefined ? localLocations[item.applicationId] : item.currentLocation}
                                                onChange={(e) => setLocalLocations({
                                                    ...localLocations,
                                                    [item.applicationId]: e.target.value
                                                })}
                                                onBlur={() => handleLocationBlur(item.applicationId, item.shippingStatus, item.currentLocation)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        (e.target as HTMLInputElement).blur();
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <span className="text-xs font-semibold text-slate-600 block">
                                                {item.currentLocation}
                                            </span>
                                        )}
                                    </td>

                                    {/* Last Updated Timestamp */}
                                    <td className="px-6 py-4.5 text-right font-medium text-xs text-slate-500">
                                        {new Date(item.lastUpdated).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric'
                                        })}
                                        <span className="block text-[10px] font-bold text-slate-400 mt-0.5">
                                            {new Date(item.lastUpdated).toLocaleTimeString('en-GB', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {filteredLogistics.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 bg-slate-50/20 text-slate-400 font-medium">
                                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                                            <Navigation size={32} className="text-slate-300 animate-bounce" />
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-2">No shipments matched</p>
                                            <p className="text-[11px] text-slate-400">Search by courier name, custom tracking, or specific application references.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Registration Modal Dialog */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-black text-slate-800 text-lg tracking-tight uppercase">Logistics Registration</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Link a manual courier tracking record to a claim</p>
                            </div>
                            <button 
                                onClick={() => setShowRegisterModal(false)}
                                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Submission */}
                        <form onSubmit={handleRegisterShipment} className="p-8 space-y-5">
                            {/* Claim Selection */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Application reference ID <span className="text-rose-500">*</span></label>
                                <select
                                    required
                                    value={selectedAppId}
                                    onChange={(e) => setSelectedAppId(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/15 focus:border-[#1A2B4C] appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>Select unregistered asset...</option>
                                    {untrackedUnits.map(unit => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.id} ({unit.batteryModel} - SN: {unit.serialNumber})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Shipping Type */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shipping Direction Type <span className="text-rose-500">*</span></label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShippingType('INBOUND')}
                                        className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wide border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                            shippingType === 'INBOUND'
                                                ? 'bg-[#1A2B4C] text-white border-[#1A2B4C] shadow-md shadow-[#1A2B4C]/10'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <ArrowUpRight size={14} />
                                        INBOUND (To Repair)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShippingType('OUTBOUND')}
                                        className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wide border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                            shippingType === 'OUTBOUND'
                                                ? 'bg-[#1A2B4C] text-white border-[#1A2B4C] shadow-md shadow-[#1A2B4C]/10'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <ArrowDownLeft size={14} />
                                        OUTBOUND (To User)
                                    </button>
                                </div>
                            </div>

                            {/* Courier choice */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Courier Channel Service <span className="text-rose-500">*</span></label>
                                <select
                                    required
                                    value={courierName}
                                    onChange={(e) => setCourierName(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/15 focus:border-[#1A2B4C] cursor-pointer"
                                >
                                    {courierOptions.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Tracking ID field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                    <span>Courier Tracking Airway Bill (AWB) <span className="text-rose-500">*</span></span>
                                    <button
                                        type="button"
                                        onClick={handleGenerateDummyTracking}
                                        className="text-[9px] text-indigo-600 hover:text-indigo-800 font-black tracking-widest uppercase hover:underline cursor-pointer"
                                    >
                                        + Auto dummy
                                    </button>
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Enter Airway Bill (e.g. RESI-9988223)"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/15 focus:border-[#1A2B4C]"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                />
                            </div>

                            {/* Status and Initial Location */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Status <span className="text-rose-500">*</span></label>
                                    <select
                                        required
                                        value={shippingStatus}
                                        onChange={(e) => setShippingStatus(e.target.value as any)}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/15 focus:border-[#1A2B4C] cursor-pointer"
                                    >
                                        <option value="PREPARING">PREPARING</option>
                                        <option value="IN_TRANSIT">IN TRANSIT</option>
                                        <option value="DELIVERED">DELIVERED</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Location <span className="text-rose-500">*</span></label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Location (e.g. Sorting Center)"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/15 focus:border-[#1A2B4C]"
                                        value={currentLocation}
                                        onChange={(e) => setCurrentLocation(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <button
                                type="submit"
                                disabled={!selectedAppId || !trackingNumber || !currentLocation}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg cursor-pointer ${
                                    !selectedAppId || !trackingNumber || !currentLocation
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-[#1A2B4C] text-white hover:bg-[#253e6b] hover:translate-y-[-2px] hover:shadow-[#1A2B4C]/20'
                                }`}
                            >
                                Confirm & Register Shipment
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Logistics;
