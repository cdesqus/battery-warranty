import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Shield, Users, Save, Trash2, Key, Mail, Building2, ToggleLeft, ToggleRight, UserPlus, X, Edit2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { SystemUser, UserRole } from '../context/DataContext';

const Settings = () => {
    const { currentUser, setCurrentUser, systemUsers, setSystemUsers } = useData();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'maintenance'>('users');

    useEffect(() => {
        const tab = (location.state as any)?.activeTab;
        if (tab === 'profile' || tab === 'users' || tab === 'maintenance') {
            setActiveTab(tab);
        } else {
            setActiveTab('users');
        }
    }, [location]);
    const [toast, setToast] = useState<string | null>(null);

    const handleResetDatabase = async () => {
        if (!window.confirm("WARNING: Are you sure you want to WIPE all unit serial numbers and claim logs from the PostgreSQL database? This is necessary so you can import your Excel file cleanly without database unique-key conflicts. This operation is irreversible!")) {
            return;
        }

        try {
            const API_BASE = '/api';
            const response = await fetch(`${API_BASE}/settings/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                showToast('Database wiped clean successfully!');
                setTimeout(() => {
                    window.location.href = '/master-data';
                }, 1000);
            } else {
                alert('Failed to reset database.');
            }
        } catch (err) {
            console.error('Reset database failed:', err);
            alert('An error occurred while resetting the database.');
        }
    };

    // Profile Form State
    const [profileForm, setProfileForm] = useState({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        department: currentUser?.department || '',
        password: '',
        confirmPassword: ''
    });

    // User Management Modal State
    const [showUserModal, setShowUserModal] = useState<SystemUser | 'NEW' | null>(null);
    const [userForm, setUserForm] = useState<Partial<SystemUser> & { password?: string }>({
        name: '',
        email: '',
        role: 'Viewer',
        status: 'Active',
        password: ''
    });

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    if (!currentUser) return null;

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        setCurrentUser({
            ...currentUser,
            name: profileForm.name,
            email: profileForm.email,
            department: profileForm.department
        } as SystemUser);
        showToast('Profile updated successfully!');
    };

    const handleToggleUserStatus = (id: string) => {
        setSystemUsers(prev => prev.map(u => 
            u.id === id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u
        ));
    };

    const handleDeleteUser = (id: string) => {
        if (id === 'USR-001') {
            alert("Cannot delete primary Super Admin!");
            return;
        }
        if (window.confirm('Are you sure you want to remove this user?')) {
            setSystemUsers(prev => prev.filter(u => u.id !== id));
            showToast('User removed successfully.');
        }
    };

    const handleSaveUser = () => {
        if (!userForm.name || !userForm.email) return;

        if (showUserModal === 'NEW') {
            const newUser: SystemUser & { password?: string } = {
                id: `USR-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
                name: userForm.name!,
                email: userForm.email!,
                role: userForm.role as UserRole,
                status: userForm.status as 'Active' | 'Inactive',
                lastLogin: 'Never',
                password: userForm.password || 'password123'
            };
            setSystemUsers([...systemUsers, newUser]);
            showToast('User created successfully!');
        } else if (showUserModal) {
            const { password, ...updateData } = userForm;
            setSystemUsers(prev => prev.map(u => 
                u.id === (showUserModal as SystemUser).id ? { ...u, ...updateData } : u
            ));
            showToast('User updated successfully!');
        }
        setShowUserModal(null);
    };

    return (
        <div className="flex flex-col min-h-full max-w-6xl mx-auto w-full pb-12">
            {/* Toast */}
            {toast && (
                <div className="fixed top-24 right-1/2 translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-top-4">
                    <Save size={18} className="text-emerald-400" />
                    <span className="font-semibold text-sm">{toast}</span>
                </div>
            )}

            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">System Configuration</h1>
                <p className="text-slate-500 mt-1">Manage your identity and administrative access control.</p>
            </div>

            <div className="flex gap-2 bg-slate-200/50 p-1.5 rounded-2xl mb-8 w-fit border border-slate-200 shadow-sm relative z-30 flex-wrap">
                <button 
                    type="button"
                    onClick={() => {
                        console.log('Switching to Profile');
                        setActiveTab('profile');
                    }}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all duration-200 cursor-pointer select-none ${
                        activeTab === 'profile' 
                        ? 'bg-white text-[#1A2B4C] shadow-md ring-1 ring-slate-200' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                >
                    <User size={18} className={activeTab === 'profile' ? 'text-[#1A2B4C]' : 'text-slate-400'} /> 
                    My Profile
                </button>
                <button 
                    type="button"
                    onClick={() => {
                        console.log('Switching to Users');
                        setActiveTab('users');
                    }}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all duration-200 cursor-pointer select-none ${
                        activeTab === 'users' 
                        ? 'bg-white text-[#1A2B4C] shadow-md ring-1 ring-slate-200' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                >
                    <Users size={18} className={activeTab === 'users' ? 'text-[#1A2B4C]' : 'text-slate-400'} /> 
                    User Management
                </button>
                {currentUser.role === 'Super Admin' && (
                    <button 
                        type="button"
                        onClick={() => setActiveTab('maintenance')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all duration-200 cursor-pointer select-none ${
                            activeTab === 'maintenance' 
                            ? 'bg-red-600 text-white shadow-md shadow-red-500/20' 
                            : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                        }`}
                    >
                        <Trash2 size={18} className={activeTab === 'maintenance' ? 'text-white' : 'text-red-400'} /> 
                        Reset Database
                    </button>
                )}
            </div>

            {activeTab === 'profile' ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-8">
                        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-slate-100">
                            <div className="w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center text-[#1A2B4C] text-4xl font-black shadow-inner border-4 border-white">
                                {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800">{currentUser.name}</h3>
                                <p className="text-slate-500 font-medium">{currentUser.role} &bull; {currentUser.department}</p>
                                <span className="inline-block mt-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-200">System Authorized</span>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <User size={14} /> Full Name
                                    </label>
                                    <input 
                                        type="text" 
                                        value={profileForm.name}
                                        onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C] transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <Mail size={14} /> Email Address
                                    </label>
                                    <input 
                                        type="email" 
                                        value={profileForm.email}
                                        onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C] transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <Building2 size={14} /> Department
                                    </label>
                                    <input 
                                        type="text" 
                                        value={profileForm.department}
                                        onChange={e => setProfileForm({...profileForm, department: e.target.value})}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C] transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <Shield size={14} /> Account Role
                                    </label>
                                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 cursor-not-allowed">
                                        {currentUser.role}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100">
                                <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <Key size={16} /> Update Security Credentials
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                                        <input 
                                            type="password" 
                                            placeholder="Leave blank to keep current"
                                            value={profileForm.password}
                                            onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C] transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
                                        <input 
                                            type="password" 
                                            value={profileForm.confirmPassword}
                                            onChange={e => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C] transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button type="submit" className="bg-[#1A2B4C] text-white px-10 py-3 rounded-xl font-bold shadow-lg hover:bg-[#253e6b] transition-all flex items-center gap-2">
                                    <Save size={18} /> Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : activeTab === 'maintenance' ? (
                <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
                    <div className="p-8">
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                            <div className="bg-red-100 p-3 rounded-xl text-red-600 shadow-inner">
                                <Trash2 size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Database Reset & Clean Utility</h3>
                                <p className="text-slate-500 text-xs font-semibold mt-0.5">Wipe clean mock/seeded records to prepare system for production excel data imports.</p>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-sm text-red-800 space-y-3 mb-8">
                            <h4 className="font-black uppercase tracking-wider flex items-center gap-2">⚠️ Warning: Crucial Operation</h4>
                            <p className="font-semibold leading-relaxed">
                                Resetting the database will permanently delete all units, claim activity logs, and custom master data. 
                                Default corporate partners and models will be preserved, and the default system users (Super Admin accounts) will NOT be deleted. 
                                This operation is irreversible.
                            </p>
                        </div>

                        <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-2xl flex-wrap gap-4">
                            <div>
                                <p className="font-black text-slate-800 text-sm">WIPE ALL ASSETS & LOGS</p>
                                <p className="text-xs text-slate-500 font-semibold mt-1">Deletes all claims, unit serial numbers, and logs from PostgreSQL.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleResetDatabase}
                                className="bg-red-600 hover:bg-red-700 text-white font-black text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-red-500/20 transition-all uppercase tracking-wider flex items-center gap-2 cursor-pointer select-none"
                            >
                                <Trash2 size={16} />
                                Wipe Database Clean
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">Platform Users</h3>
                            <p className="text-xs text-slate-500 font-medium">Define access levels for team members.</p>
                        </div>
                        <button 
                            onClick={() => { setUserForm({ role: 'Viewer', status: 'Active' }); setShowUserModal('NEW'); }}
                            className="bg-[#1A2B4C] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-[#253e6b] transition-all"
                        >
                            <UserPlus size={16} /> Add User
                        </button>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-4">User</th>
                                <th className="px-8 py-4">Role</th>
                                <th className="px-8 py-4">Status</th>
                                <th className="px-8 py-4">Last Login</th>
                                <th className="px-8 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {systemUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border border-slate-200">
                                                {user.name?.charAt(0) || '?'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                            user.role === 'Super Admin' ? 'bg-indigo-100 text-indigo-700' :
                                            user.role === 'Admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4">
                                        <button 
                                            onClick={() => handleToggleUserStatus(user.id)}
                                            className="transition-colors focus:outline-none"
                                        >
                                            {user.status === 'Active' ? (
                                                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                                                    <ToggleRight size={24} /> <span>Active</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
                                                    <ToggleLeft size={24} /> <span>Disabled</span>
                                                </div>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-8 py-4">
                                        <p className="text-xs font-medium text-slate-500">{user.lastLogin}</p>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => { setUserForm(user); setShowUserModal(user); }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-slate-800 text-xl">{showUserModal === 'NEW' ? 'Create New User' : 'Edit System User'}</h3>
                            <button onClick={() => setShowUserModal(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Identity Name</label>
                                <input 
                                    type="text" 
                                    value={userForm.name}
                                    onChange={e => setUserForm({...userForm, name: e.target.value})}
                                    placeholder="Enter full name"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Access</label>
                                <input 
                                    type="email" 
                                    value={userForm.email}
                                    onChange={e => setUserForm({...userForm, email: e.target.value})}
                                    placeholder="user@organization.com"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
                                />
                            </div>
                            {showUserModal === 'NEW' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password Credentials</label>
                                    <input 
                                        type="password" 
                                        value={userForm.password || ''}
                                        onChange={e => setUserForm({...userForm, password: e.target.value})}
                                        placeholder="Enter password (default: password123)"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
                                    />
                                    <p className="text-[9px] text-slate-400 mt-1 font-semibold italic">ℹ️ If left blank, password defaults to password123</p>
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Authorization Role</label>
                                <select 
                                    value={userForm.role}
                                    onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1A2B4C]/20 focus:border-[#1A2B4C]"
                                >
                                    <option value="Super Admin">Super Admin (Full Access)</option>
                                    <option value="Admin">Admin (Maintenance Mode)</option>
                                    <option value="Viewer">Viewer (ReadOnly Mode)</option>
                                </select>
                            </div>
                            <div className="pt-6">
                                <button 
                                    onClick={handleSaveUser}
                                    className="w-full bg-[#1A2B4C] text-white py-4 rounded-2xl font-black shadow-lg hover:bg-[#253e6b] transition-all flex items-center justify-center gap-2"
                                >
                                    {showUserModal === 'NEW' ? 'Deploy User Credentials' : 'Push Authorization Updates'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
