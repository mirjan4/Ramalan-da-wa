import { useState } from 'react';
import { Settings as SettingsIcon, User, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Profile form state
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
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

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await api.put('/auth/update-profile', profileData);

            if (response.data) {
                localStorage.setItem('user', JSON.stringify(response.data.admin));
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
        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
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
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                    <SettingsIcon size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
                    <p className="text-slate-500 mt-1">Manage your account preferences and security</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8 border-b border-slate-200">
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
                <div className="glass-card p-8 border-none bg-white">
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
                <div className="glass-card p-8 border-none bg-white">
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
                                minLength={6}
                                className="input-field"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            />
                            <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
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
        </div>
    );
}
