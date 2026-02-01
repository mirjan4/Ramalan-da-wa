import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Lock, Save, AlertCircle, CheckCircle, Users, Trash2, Plus, Edit } from 'lucide-react';
import api, { userService, teamService } from '../services/api';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Current User Context
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role === 'admin';

    // Profile form state
    const [profileData, setProfileData] = useState({
        username: currentUser.username || '',
        displayName: currentUser.displayName || ''
    });

    // Password form state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // User Management State
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [newUser, setNewUser] = useState({ username: '', password: '', displayName: '' });
    const [editingUserId, setEditingUserId] = useState(null);

    useEffect(() => {
        if (activeTab === 'users' && isAdmin) {
            fetchUsers();
            fetchTeams();
        }
    }, [activeTab, isAdmin]);

    const fetchUsers = async () => {
        try {
            const res = await userService.getAll();
            setUsers(res.data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const fetchTeams = async () => {
        try {
            const res = await teamService.getAll();
            setTeams(res.data);
        } catch (err) {
            console.error("Failed to fetch teams", err);
        }
    };

    const handleTeamSelect = (teamId) => {
        setSelectedTeam(teamId);
        const team = teams.find(t => t._id === teamId);
        if (team) {
            // Auto generate username: first 4 chars of team name (first capital) + "123"
            const name = team.placeName.replace(/[^a-zA-Z]/g, ''); // Remove non-letters
            const prefix = name.substring(0, 4).toLowerCase();
            const formattedPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);
            const autoUsername = `${formattedPrefix}123`;

            setNewUser(prev => ({
                ...prev,
                displayName: team.placeName,
                username: autoUsername
            }));
        } else {
            setNewUser(prev => ({ ...prev, displayName: '', username: '' }));
        }
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingUserId) {
                // Update existing user
                await userService.update(editingUserId, newUser);
                setMessage({ type: 'success', text: 'User updated successfully!' });
                setEditingUserId(null);
            } else {
                // Create new user
                await userService.create(newUser);
                setMessage({ type: 'success', text: 'Team user created successfully!' });
            }

            setNewUser({ username: '', password: '', displayName: '' });
            setSelectedTeam('');
            fetchUsers();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save user' });
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user) => {
        setEditingUserId(user._id);
        // Try to match team based on display name
        const team = teams.find(t => t.placeName === user.displayName);
        if (team) setSelectedTeam(team._id);

        setNewUser({
            username: user.username,
            displayName: user.displayName,
            password: '' // Don't show existing password
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingUserId(null);
        setSelectedTeam('');
        setNewUser({ username: '', password: '', displayName: '' });
    };

    const handleDeleteUser = async (id) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await userService.delete(id);
            setMessage({ type: 'success', text: 'User deleted successfully' });
            fetchUsers();
            if (editingUserId === id) handleCancelEdit();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete user' });
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await api.put('/auth/update-profile', profileData);

            if (response.data) {
                localStorage.setItem('user', JSON.stringify({ ...currentUser, ...response.data.admin }));
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to update profile'
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        // Validation
        if (passwordData.newPassword.length < 4) {
            setMessage({ type: 'error', text: 'New password must be at least 4 characters' });
            setLoading(false);
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'New password and confirm password do not match' });
            setLoading(false);
            return;
        }

        try {
            const response = await api.put('/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            if (response.data) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to change password'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-10">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                    <SettingsIcon size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
                    <p className="text-slate-500 mt-1">Manage account preferences, security, and team access.</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'profile'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <User size={16} className="inline mr-2" />
                    Profile
                </button>
                <button
                    onClick={() => setActiveTab('security')}
                    className={`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'security'
                        ? 'text-indigo-600 border-b-2 border-indigo-600'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <Lock size={16} className="inline mr-2" />
                    Security
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 font-bold text-sm uppercase tracking-widest transition-all ${activeTab === 'users'
                            ? 'text-indigo-600 border-b-2 border-indigo-600'
                            : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Users size={16} className="inline mr-2" />
                        Team Accounts
                    </button>
                )}
            </div>

            {/* Message Alert */}
            {message.text && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border border-rose-200 text-rose-700'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span className="font-semibold text-sm">{message.text}</span>
                </div>
            )}

            {/* Profile Settings Tab */}
            {activeTab === 'profile' && (
                <div className="glass-card p-8 border-none bg-white max-w-2xl">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">Profile Settings</h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                        <div>
                            <label className="label">Username</label>
                            <input
                                type="text"
                                required
                                className="input-field text-lg font-bold"
                                value={profileData.username}
                                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                            />
                            <p className="text-xs text-slate-500 mt-1">This will be used for login</p>
                        </div>

                        <div>
                            <label className="label">Display Name (Optional)</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="e.g., Administrator"
                                value={profileData.displayName}
                                onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                            />
                            <p className="text-xs text-slate-500 mt-1">Friendly name shown in the interface</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Profile'}
                        </button>
                    </form>
                </div>
            )}

            {/* Security Settings Tab */}
            {activeTab === 'security' && (
                <div className="glass-card p-8 border-none bg-white max-w-2xl">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">Change Password</h2>
                    <form onSubmit={handlePasswordUpdate} className="space-y-6">
                        <div>
                            <label className="label">Current Password</label>
                            <input
                                type="password"
                                required
                                className="input-field"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="label">New Password</label>
                            <input
                                type="password"
                                required
                                minLength={4}
                                className="input-field"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            />
                            <p className="text-xs text-slate-500 mt-1">Minimum 4 characters</p>
                        </div>

                        <div>
                            <label className="label">Confirm New Password</label>
                            <input
                                type="password"
                                required
                                className="input-field"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Lock size={18} />
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            )}

            {/* User Management Tab (Admin Only) */}
            {activeTab === 'users' && isAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Create/Edit User Form */}
                    <div className="glass-card p-6 border-none bg-white h-fit">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                {editingUserId ? <Edit size={20} /> : <Plus size={20} />}
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">
                                {editingUserId ? 'Edit Team Account' : 'Create Team Account'}
                            </h2>
                        </div>

                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <div>
                                <label className="label">Select Team</label>
                                <select
                                    required
                                    className="input-field"
                                    value={selectedTeam}
                                    onChange={(e) => handleTeamSelect(e.target.value)}
                                >
                                    <option value="">-- Select a Team --</option>
                                    {teams.map(team => (
                                        <option key={team._id} value={team._id}>{team.placeName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Username (Auto-generated)</label>
                                <input
                                    type="text"
                                    readOnly
                                    disabled
                                    className="input-field font-bold bg-slate-100 text-slate-500 cursor-not-allowed"
                                    value={newUser.username}
                                />
                            </div>

                            <div>
                                <label className="label">Password {editingUserId && '(Leave blank to keep current)'}</label>
                                <input
                                    type="password"
                                    required={!editingUserId}
                                    className="input-field"
                                    placeholder="******"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                />
                                <p className="text-xs text-slate-500 mt-1">Minimum 4 characters</p>
                            </div>

                            <div className="pt-2 flex gap-2">
                                {editingUserId && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="flex-1 btn-secondary py-3 text-slate-500 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] btn-primary bg-indigo-600 hover:bg-indigo-700 py-3"
                                >
                                    {loading ? 'Saving...' : (editingUserId ? 'Update Account' : 'Create Account')}
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 text-center mt-2">
                                Role will be automatically set to <span className="font-bold text-slate-600">Data Collector</span>
                            </p>
                        </form>
                    </div>

                    {/* Users List */}
                    <div className="glass-card p-6 border-none bg-white">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Users size={20} className="text-slate-400" />
                            Existing Accounts
                        </h2>

                        <div className="space-y-3">
                            {users.length === 0 ? (
                                <p className="text-slate-400 italic text-center py-8">No users found.</p>
                            ) : (
                                users.map(user => (
                                    <div key={user._id} className={`p-4 border rounded-xl flex justify-between items-center group transition-colors ${editingUserId === user._id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'
                                        }`}>
                                        <div>
                                            <div className="font-bold text-slate-800">{user.displayName || user.username}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">@{user.username}</div>
                                            <div className={`text-[10px] uppercase font-bold tracking-wider mt-2 px-2 py-0.5 rounded-full inline-block ${user.role === 'admin'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                {user.role}
                                            </div>
                                        </div>

                                        {user._id !== currentUser._id && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEditUser(user)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="Edit User"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user._id)}
                                                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
