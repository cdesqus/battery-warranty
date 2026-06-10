import { useState, useMemo } from 'react';
import { Search, Plus, Edit2, X, CheckCircle2, FileSpreadsheet, Trash2, Database, Settings } from 'lucide-react';
import { useData, getBatteryStatus } from '../context/DataContext';
import ExportModal from '../components/ExportModal';
import BulkImportModal from '../components/BulkImportModal';

const MasterData = () => {
    const { companies, setCompanies, models, setModels, addActivityLog, currentUser, sourceChannels, setSourceChannels, selectedSource, setSelectedSource } = useData();
    
    if (!currentUser) return null;

    const [searchTerm, setSearchTerm] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);

    // Feedback
    const [toast, setToast] = useState<string | null>(null);

    // Modal Controls
    const [showCustModal, setShowCustModal] = useState(false);
    const [showEditUnitModal, setShowEditUnitModal] = useState<{ compId: string, unit: any } | null>(null);

    // Export Modal
    const [showExportModal, setShowExportModal] = useState(false);

    // Partners CRUD States
    const [showPartnersModal, setShowPartnersModal] = useState(false);
    const [newPartnerName, setNewPartnerName] = useState('');
    const [editingPartner, setEditingPartner] = useState<{ oldName: string, currentVal: string } | null>(null);

    const handleAddPartner = () => {
        if (!newPartnerName.trim()) return;
        if (sourceChannels.includes(newPartnerName.trim())) {
            showToast('Partner name already exists!');
            return;
        }
        setSourceChannels([...sourceChannels, newPartnerName.trim()]);
        setNewPartnerName('');
        showToast('Partner registered successfully!');
    };

    const handleRenamePartner = (oldName: string, newName: string) => {
        if (!newName || newName.trim() === '') return;
        const trimmed = newName.trim();
        if (sourceChannels.includes(trimmed) && trimmed !== oldName) {
            showToast('Partner name already exists!');
            return;
        }
        
        // Update in sourceChannels
        setSourceChannels(prev => prev.map(p => p === oldName ? trimmed : p));
        
        // Also cascade update any units matching oldName
        setCompanies(prev => prev.map(c => ({
            ...c,
            units: c.units.map(u => u.sourceChannel === oldName ? { ...u, sourceChannel: trimmed } : u)
        })));
        
        showToast('Partner renamed successfully!');
    };

    const handleDeletePartner = (partnerName: string) => {
        setSourceChannels(prev => prev.filter(p => p !== partnerName));
        
        // Also clean up matching units
        setCompanies(prev => prev.map(c => ({
            ...c,
            units: c.units.map(u => u.sourceChannel === partnerName ? { ...u, sourceChannel: undefined } : u)
        })));
        
        showToast('Partner deleted successfully!');
    };

    // Form States
    interface PresalesFormData {
        companyName: string;
        email: string;
        batteryModel: string;
        contractStartDate: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        serialNumbers: string[];
        serialNumber: string;
        picName: string;
    }

    const defaultForm: PresalesFormData = {
        companyName: 'PRIVATE_RECORD',
        email: 'private@compliance.local',
        batteryModel: '',
        contractStartDate: new Date().toISOString().split('T')[0],
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        serialNumbers: [''] as string[],
        serialNumber: '', // used for single unit edits
        picName: ''
    };
    const [formData, setFormData] = useState<PresalesFormData>(defaultForm);
    const [isAddingModel, setIsAddingModel] = useState(false);
    const [newModel, setNewModel] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const generateApplicationId = (model: string, indexOffset: number) => {
        let modelPrefix = 'BAT';
        if (model) {
            modelPrefix = model.split(/[- ]/)[0].toUpperCase().substring(0, 3);
        }
        const year = new Date().getFullYear().toString().substring(2);
        const totalExisting = companies.reduce((acc, c) => acc + c.units.length, 0);
        const seq = (totalExisting + indexOffset + 1).toString().padStart(3, '0');
        return `${modelPrefix}-${year}-${seq}`;
    };

    const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (e.target.value === 'ADD_NEW') {
            setIsAddingModel(true);
            setFormData({ ...formData, batteryModel: '' });
        } else {
            setIsAddingModel(false);
            setFormData({ ...formData, batteryModel: e.target.value });
        }
    };

    const saveNewModel = () => {
        if (!newModel.trim()) return;
        setModels(prev => [...prev, newModel.trim()]);
        setFormData({ ...formData, batteryModel: newModel.trim() });
        setIsAddingModel(false);
        setNewModel('');
    };

    const handleSaveCustomer = () => {
        if (!formData.batteryModel || !formData.contractStartDate) return;

        const newUnits = Array.from({ length: formData.quantity || 1 }).map((_, i) => {
            const unitSerial = formData.serialNumbers[i] || `SN-${Date.now()}-${i}`;
            return {
                id: generateApplicationId(formData.batteryModel, i),
                serialNumber: unitSerial,
                batteryModel: formData.batteryModel,
                contractStartDate: formData.contractStartDate,
                applicationDate: new Date().toISOString().split('T')[0],
                claimCount: 0,
                unitPrice: formData.unitPrice,
                discount: formData.discount / 100
            };
        });

        const newCompany = {
            id: `ASSET-BATCH-${Date.now()}`,
            companyName: 'PRIVATE_RECORD',
            picName: '',
            department: 'N/A',
            email: 'private@compliance.local',
            units: newUnits
        };

        setCompanies([newCompany, ...companies]);
        addActivityLog({ id: newUnits[0].id, company: newCompany.id, processedBy: currentUser.name, action: 'New Asset Registration', status: 'Approved', isBot: false });

        setShowCustModal(false);
        setFormData(defaultForm);
        showToast(`Registered ${formData.quantity} unit(s) successfully.`);
    };

    const handleUpdateUnitEdit = () => {
        if (!showEditUnitModal) return;
        const { compId, unit } = showEditUnitModal;

        setCompanies(prev => prev.map(c => {
            if (c.id === compId) {
                return {
                    ...c,
                    units: c.units.map(u => {
                        if (u.id === unit.id) {
                            return {
                                ...u,
                                serialNumber: formData.serialNumber,
                                batteryModel: formData.batteryModel,
                                contractStartDate: formData.contractStartDate
                            };
                        }
                        return u;
                    })
                };
            }
            return c;
        }));

        addActivityLog({ id: unit.id, company: compId, processedBy: currentUser.name, action: 'Unit Details Updated', status: 'Validated', isBot: false });

        setShowEditUnitModal(null);
        setFormData(defaultForm);
        showToast('Unit details updated successfully!');
    };

    const handleDeleteUnit = (compId: string, unitId: string) => {
        if (currentUser.role !== 'Super Admin') return;
        if (window.confirm('Are you sure you want to delete this unit?')) {
            setCompanies(prev => prev.map(c => {
                if (c.id === compId) {
                    addActivityLog({ 
                        id: unitId, 
                        company: c.id, 
                        processedBy: currentUser.name, 
                        action: 'Unit Deleted', 
                        status: 'Removed', 
                        isBot: false 
                    });
                    return { ...c, units: c.units.filter(u => u.id !== unitId) };
                }
                return c;
            }));
            showToast('Unit record deleted successfully.');
        }
    };

    const openCustModal = () => { setFormData({ ...defaultForm }); setShowCustModal(true); setIsAddingModel(false); };

    const openEditUnitModal = (compId: string, unit: any) => {
        setFormData({
            ...defaultForm,
            batteryModel: unit.batteryModel,
            serialNumber: unit.serialNumber || '',
            contractStartDate: unit.contractStartDate,
        });
        setShowEditUnitModal({ compId, unit });
        setIsAddingModel(false);
    };

    // Flatten data for the Unit-Focused List
    const flatUnits = useMemo(() => {
        const list: any[] = [];
        companies.forEach(comp => {
            comp.units.forEach(unit => {
                list.push({ ...unit, parentId: comp.id });
            });
        });
        return list.filter(u => {
            const matchesSearch = u.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 u.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 u.batteryModel.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSource = selectedSource === 'All Partners' || u.sourceChannel === selectedSource;
            return matchesSearch && matchesSource;
        }).sort((a, b) => new Date(b.applicationDate || b.contractStartDate).getTime() - new Date(a.applicationDate || a.contractStartDate).getTime());
    }, [companies, searchTerm, selectedSource]);

    return (
        <div className="flex flex-col h-full w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">

            {/* Toast */}
            {toast && (
                <div className="absolute top-4 right-1/2 translate-x-1/2 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-top-4 fade-in">
                    <CheckCircle2 size={20} />
                    <span className="font-semibold text-sm">{toast}</span>
                </div>
            )}

            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="flex items-center gap-4 w-full">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search Application ID, SN, or Model..."
                            className="pl-9 pr-4 py-1.5 w-72 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C] text-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <select
                            value={selectedSource}
                            onChange={(e) => setSelectedSource(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 w-44"
                        >
                            <option value="All Partners">All Partners</option>
                            {sourceChannels.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {currentUser.role !== 'Viewer' && (
                            <button
                                type="button"
                                onClick={() => setShowPartnersModal(true)}
                                className="p-2 border border-slate-300 rounded-lg bg-white text-slate-500 hover:text-[#1A2B4C] hover:bg-slate-50 transition-all shadow-sm"
                                title="Manage Partners"
                            >
                                <Settings size={15} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium transition-colors text-sm shadow-sm ml-auto"
                    >
                        <FileSpreadsheet size={16} className="text-emerald-600" />
                        Export
                    </button>
                    {currentUser.role !== 'Viewer' && (
                        <>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100 px-4 py-2 rounded-lg hover:bg-indigo-100 font-medium transition-colors text-sm shadow-sm"
                            >
                                <Database size={16} />
                                Import Data
                            </button>
                            <button
                                onClick={openCustModal}
                                className="flex items-center gap-2 bg-[#1A2B4C] text-white px-4 py-2 rounded-lg hover:bg-[#253e6b] font-medium transition-colors text-sm shadow-sm"
                            >
                                <Plus size={16} />
                                Register Units
                            </button>
                        </>
                    )}
                </div>
            </div>

            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
            />

            {/* Flat Data Table */}
            <div className="flex-1 overflow-auto bg-white relative w-full">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-50 z-20 shadow-sm outline outline-1 outline-slate-200">
                        <tr className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                            <th className="px-4 py-3 border-r border-slate-100 w-[50px] text-center">No</th>
                            <th className="px-4 py-3 border-r border-slate-100">Application ID</th>
                            <th className="px-4 py-3 border-r border-slate-100">Application Date</th>
                            <th className="px-4 py-3 border-r border-slate-100">Serial Number</th>
                            <th className="px-4 py-3 border-r border-slate-100">Unit Type</th>
                            <th className="px-4 py-3 border-r border-slate-100 text-right">Price (IDR)</th>
                            <th className="px-4 py-3 border-r border-slate-100 text-center">Contract</th>
                            <th className="px-4 py-3 border-r border-slate-100 text-center">End Date</th>
                            <th className="px-4 py-3 border-r border-slate-100 text-center w-[120px] bg-slate-50">Status</th>
                            <th className="px-4 py-3 text-right sticky right-0 bg-slate-50 z-20 shadow-[-4px_0_12px_rgba(0,0,0,0.03)] border-l border-slate-200">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {flatUnits.map((unit, index) => {
                            const sDate = new Date(unit.contractStartDate);
                            const eDate = new Date(sDate);
                            eDate.setMonth(eDate.getMonth() + 24);
                            const status = getBatteryStatus(unit.contractStartDate, unit.claimCount, unit.statusOverride);

                            return (
                                <tr key={unit.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50">
                                    <td className="px-4 py-3 text-slate-400 font-medium text-[10px] text-center">{index + 1}</td>
                                    <td className="px-4 py-3 font-bold text-[#1A2B4C] font-mono text-[10px]">{unit.id}</td>
                                    <td className="px-4 py-3 text-slate-600 text-[10px] font-semibold">
                                        {unit.applicationDate ? new Date(unit.applicationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[10px] text-slate-700 font-medium">{unit.serialNumber}</td>
                                    <td className="px-4 py-3 text-[10px] font-bold text-slate-800">{unit.batteryModel}</td>
                                    <td className="px-4 py-3 text-right font-bold text-[10px] text-slate-700">
                                        {(unit.unitPrice * (1 - unit.discount)).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-[10px] font-medium text-center">
                                        {sDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-[10px] font-medium text-center">
                                        {eDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center items-center w-full">
                                            <span className={`inline-flex items-center justify-center w-[100px] py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm opacity-100 ${
                                                status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                status === 'Claimed' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                status === 'Expired' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                                {status.includes('Rejected') ? 'REJECTED' : status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-slate-50 transition-colors z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.03)] border-l border-slate-200">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {currentUser.role !== 'Viewer' && (
                                                <button onClick={() => openEditUnitModal(unit.parentId, unit)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Edit Unit">
                                                    <Edit2 size={14} />
                                                </button>
                                            )}
                                            {currentUser.role === 'Super Admin' && (
                                                <button onClick={() => handleDeleteUnit(unit.parentId, unit.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Delete Unit">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {flatUnits.length === 0 && (
                            <tr>
                                <td colSpan={11} className="text-center py-20 text-slate-500 font-medium bg-slate-50/50">
                                    No records found matching your search criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- MODALS --- */}

            {/* Registration Modal */}
            {showCustModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
                        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-black text-[#1A2B4C] text-lg tracking-tight uppercase">Asset Registration</h3>
                                <p className="text-xs text-slate-500 font-medium">Register multiple units securely under a single record.</p>
                            </div>
                            <button onClick={() => setShowCustModal(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Asset Model SKU <span className="text-rose-500">*</span></label>
                                    {!isAddingModel ? (
                                        <select value={formData.batteryModel} onChange={handleModelSelect} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/10 focus:border-[#1A2B4C] appearance-none bg-slate-50/50 cursor-pointer">
                                            <option value="" disabled>Select Model...</option>
                                            {models.map(m => <option key={m} value={m}>{m}</option>)}
                                            <option value="ADD_NEW" className="font-bold text-indigo-600 bg-indigo-50">+ Add New Model SKU...</option>
                                        </select>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input type="text" autoFocus value={newModel} onChange={e => setNewModel(e.target.value)} placeholder="New model name..." className="flex-1 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                                            <button onClick={saveNewModel} className="bg-[#1A2B4C] text-white px-4 rounded-lg font-bold text-xs uppercase">Save</button>
                                            <button onClick={() => setIsAddingModel(false)} className="bg-slate-100 text-slate-400 px-3 rounded-lg"><X size={18} /></button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Contract Start Date <span className="text-rose-500">*</span></label>
                                    <input type="date" value={formData.contractStartDate} onChange={e => setFormData({ ...formData, contractStartDate: e.target.value })} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/10 focus:border-[#1A2B4C] bg-slate-50/50" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Total Quantity <span className="text-rose-500">*</span></label>
                                    <input type="number" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/10 focus:border-[#1A2B4C] bg-slate-50/50" />
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Unit Serial Numbers</label>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                    {Array.from({ length: formData.quantity || 1 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-300 w-4">{i + 1}</span>
                                            <input type="text" value={formData.serialNumbers[i] || ''} onChange={e => {
                                                const newArr = [...formData.serialNumbers];
                                                newArr[i] = e.target.value;
                                                setFormData({ ...formData, serialNumbers: newArr });
                                            }} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500" placeholder={`Serial Number Unit ${i + 1}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Unit Price (IDR)</label>
                                    <input type="number" value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/10 focus:border-[#1A2B4C] bg-slate-50/50" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Discount (%)</label>
                                    <input type="number" value={formData.discount} onChange={e => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/10 focus:border-[#1A2B4C] bg-slate-50/50" />
                                </div>
                            </div>

                            <div className="bg-indigo-600 rounded-xl p-4 text-white shadow-xl shadow-indigo-900/10">
                                <label className="block text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Total Registration Value</label>
                                <p className="text-xl font-black">IDR {((formData.unitPrice - (formData.unitPrice * formData.discount / 100)) * formData.quantity).toLocaleString()}</p>
                            </div>

                            <button
                                onClick={handleSaveCustomer}
                                disabled={!formData.batteryModel}
                                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${!formData.batteryModel ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#1A2B4C] text-white hover:bg-[#253e6b] hover:translate-y-[-2px] active:translate-y-0'}`}
                            >
                                Confirm Registration
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Unit Modal */}
            {showEditUnitModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-[#1A2B4C] uppercase tracking-tight">Edit Unit Record</h3>
                            <button onClick={() => setShowEditUnitModal(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Unit Type</label>
                                <select value={formData.batteryModel} onChange={handleModelSelect} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm font-semibold focus:outline-none focus:border-[#1A2B4C] bg-slate-50/50">
                                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Serial Number</label>
                                <input type="text" value={formData.serialNumber} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#1A2B4C] bg-slate-50/50" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Contract Start Date</label>
                                <input type="date" value={formData.contractStartDate} onChange={e => setFormData({ ...formData, contractStartDate: e.target.value })} className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm font-semibold focus:outline-none focus:border-[#1A2B4C] bg-slate-50/50" />
                            </div>
                            <button onClick={handleUpdateUnitEdit} className="w-full bg-[#1A2B4C] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#253e6b] transition-all shadow-lg mt-4">
                                Update Unit Record
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BulkImportModal 
                isOpen={showImportModal} 
                onClose={() => setShowImportModal(false)} 
            />

            {/* Partners CRUD Modal */}
            {showPartnersModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-black text-slate-800 text-xl">Manage Partners</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Register & maintain corporate partners</p>
                            </div>
                            <button onClick={() => { setShowPartnersModal(false); setEditingPartner(null); }} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            {/* Add New Partner Form */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Register New Partner</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newPartnerName}
                                        onChange={e => setNewPartnerName(e.target.value)}
                                        placeholder="Partner Name (e.g. Partner A)"
                                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
                                    />
                                    <button 
                                        onClick={handleAddPartner}
                                        className="bg-[#1A2B4C] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#253e6b] transition-all text-sm"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Partners List */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered Partners</label>
                                <div className="border border-slate-100 rounded-2xl max-h-[220px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                                    {sourceChannels.length === 0 ? (
                                        <div className="p-6 text-center text-xs text-slate-400 italic">No partners registered yet.</div>
                                    ) : (
                                        sourceChannels.map(partner => (
                                            <div key={partner} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                {editingPartner?.oldName === partner ? (
                                                    <div className="flex gap-2 w-full">
                                                        <input 
                                                            type="text"
                                                            value={editingPartner.currentVal}
                                                            onChange={e => setEditingPartner({ ...editingPartner, currentVal: e.target.value })}
                                                            className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none"
                                                        />
                                                        <button 
                                                            onClick={() => {
                                                                handleRenamePartner(partner, editingPartner.currentVal);
                                                                setEditingPartner(null);
                                                            }}
                                                            className="text-xs bg-emerald-600 text-white px-2 py-1 rounded font-bold"
                                                        >
                                                            Save
                                                        </button>
                                                        <button 
                                                            onClick={() => setEditingPartner(null)}
                                                            className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="text-xs font-bold text-slate-700">{partner}</span>
                                                        <div className="flex items-center gap-1">
                                                            <button 
                                                                onClick={() => setEditingPartner({ oldName: partner, currentVal: partner })}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition-all"
                                                                title="Rename Partner"
                                                            >
                                                                <Edit2 size={13} />
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    if (confirm(`Are you sure you want to delete partner "${partner}"? Any units assigned to this partner will be set to unassigned.`)) {
                                                                        handleDeletePartner(partner);
                                                                    }
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded transition-all"
                                                                title="Delete Partner"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterData;
