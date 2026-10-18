import { useState, useEffect, useMemo } from 'react';
import { seasonService } from '../services/api';
import {
    Plus,
    CheckCircle,
    Circle,
    Calendar,
    Edit3,
    Lock,
    Unlock,
    Trash2,
    X,
    Users,
    FileText,
    Settings2,
    Loader2,
    ShieldAlert,
    AlertCircle,
    Sparkles
} from 'lucide-react';
import { confirmAction, confirmDelete, MySwal } from '../utils/swal';

export default function Season() {
    const [seasons, setSeasons] = useState([]);
    const [name, setName] = useState('');
    const [isLockedNew, setIsLockedNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingSeason, setEditingSeason] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', isLocked: false, isActive: false });
    const [savingEdit, setSavingEdit] = useState(false);
    const [togglingLockId, setTogglingLockId] = useState(null);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role === 'admin';

    useEffect(() => {
        fetchSeasons();
    }, []);

    const fetchSeasons = async () => {
        setLoading(true);
        try {
            const res = await seasonService.getAll();
            setSeasons(res.data || []);
        } catch (err) {
            console.error('Failed to fetch seasons:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            const res = await seasonService.create({ name: name.trim(), isLocked: isLockedNew });
            setName('');
            setIsLockedNew(false);
            MySwal.fire({
                title: 'Season Created!',
                text: `Season "${name}" registered successfully.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            fetchSeasons();
        } catch (err) {
            console.error(err);
            if (err.response?.status === 401 || err.response?.data?.message?.toLowerCase().includes('token')) {
                MySwal.fire({
                    title: 'Session Expired',
                    text: 'Your login session has expired. Please log in again to continue.',
                    icon: 'warning',
                    confirmButtonText: 'Go to Login'
                }).then(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                });
                return;
            }
            MySwal.fire('Error', err.response?.data?.message || 'Failed to create season', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (id, seasonName) => {
        const confirmed = await confirmAction({
            title: "Activate Season?",
            text: `Are you sure you want to activate "${seasonName}"? This will make it the default active season for all field collections and operations.`,
            confirmText: "Activate Now",
            variant: "info"
        });

        if (confirmed) {
            try {
                await seasonService.activate(id);
                MySwal.fire({
                    title: 'Season Activated!',
                    text: `"${seasonName}" is now the active operational season.`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                fetchSeasons();
            } catch (err) {
                console.error(err);
                MySwal.fire('Error', err.response?.data?.message || 'Failed to activate season', 'error');
            }
        }
    };

    const openEditModal = (season) => {
        setEditingSeason(season);
        setEditForm({
            name: season.name,
            isLocked: !!season.isLocked,
            isActive: !!season.isActive
        });
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingSeason || !editForm.name.trim()) return;
        setSavingEdit(true);
        try {
            await seasonService.update(editingSeason._id, {
                name: editForm.name.trim(),
                isLocked: editForm.isLocked,
                isActive: editForm.isActive
            });
            MySwal.fire({
                title: 'Season Updated!',
                text: 'Season details and operational rules have been saved successfully.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            setEditingSeason(null);
            fetchSeasons();
        } catch (err) {
            console.error('Failed to update season:', err);
            if (err.response?.status === 401 || err.response?.data?.message?.toLowerCase().includes('token')) {
                MySwal.fire({
                    title: 'Session Expired',
                    text: 'Your login session has expired. Please log in again to continue.',
                    icon: 'warning',
                    confirmButtonText: 'Go to Login'
                }).then(() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                });
                return;
            }
            MySwal.fire('Update Failed', err.response?.data?.message || 'Could not update season rules', 'error');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleToggleLock = async (season) => {
        const willLock = !season.isLocked;
        const confirmed = await confirmAction({
            title: willLock ? "Lock Season Data?" : "Unlock Season Data?",
            text: willLock
                ? `Locking "${season.name}" will freeze field data entries and prevent collectors from modifying records.`
                : `Unlocking "${season.name}" will allow field data records to be created and edited.`,
            confirmText: willLock ? "Yes, Lock Season" : "Yes, Unlock Season",
            variant: willLock ? "warning" : "info"
        });

        if (confirmed) {
            setTogglingLockId(season._id);
            try {
                await seasonService.update(season._id, { isLocked: willLock });
                MySwal.fire({
                    title: willLock ? 'Season Locked' : 'Season Unlocked',
                    text: `Field entry rule for "${season.name}" is now ${willLock ? 'locked (read-only)' : 'unlocked (active)'}.`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
                fetchSeasons();
            } catch (err) {
                console.error(err);
                MySwal.fire('Error', err.response?.data?.message || 'Failed to update lock rule', 'error');
            } finally {
                setTogglingLockId(null);
            }
        }
    };

    const handleDelete = async (season) => {
        const confirmed = await confirmDelete(
            `Delete Season: ${season.name}?`,
            "This season can only be deleted if it has no registered teams or field collection entries."
        );

        if (confirmed) {
            try {
                await seasonService.delete(season._id);
                MySwal.fire('Deleted!', 'Season removed successfully.', 'success');
                fetchSeasons();
            } catch (err) {
                console.error(err);
                MySwal.fire({
                    title: 'Cannot Delete Season',
                    text: err.response?.data?.message || 'Failed to delete season',
                    icon: 'error'
                });
            }
        }
    };

    const activeSeason = seasons.find(s => s.isActive);
    const lockedCount = seasons.filter(s => s.isLocked).length;
    const totalAllSeasonsBank = useMemo(() => {
        return seasons.reduce((sum, s) => sum + (Number(s.totalBankAmount) || 0), 0);
    }, [seasons]);

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-5xl mx-auto print:p-0">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3.5 bg-[#1E5FA8] text-white rounded-2xl shadow-lg shadow-[#1E5FA8]/20 shrink-0">
                        <Calendar size={24} className="sm:w-7 sm:h-7" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                            <h1 className="text-xl sm:text-2xl font-bold text-[#0F3B66] tracking-tight">Season Management</h1>
                            {activeSeason && (
                                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    {activeSeason.name} Active
                                </span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 sm:mt-1">
                            Configure operational collection years, active states, and field data lock rules
                        </p>
                    </div>
                </div>

                {/* Summary Badges */}
                <div className="flex items-center justify-around md:justify-start gap-2 bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl border border-slate-100 shadow-sm text-xs w-full md:w-auto">
                    <div className="text-center px-2">
                        <span className="block font-black text-sm text-[#0F3B66]">{seasons.length}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                    </div>
                    <div className="h-6 w-[1px] bg-slate-100"></div>
                    <div className="text-center px-2">
                        <span className="block font-black text-sm text-emerald-600">{activeSeason ? 1 : 0}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</span>
                    </div>
                    <div className="h-6 w-[1px] bg-slate-100"></div>
                    <div className="text-center px-2">
                        <span className="block font-black text-sm text-amber-600">{lockedCount}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Locked</span>
                    </div>
                    <div className="h-6 w-[1px] bg-slate-100"></div>
                    <div className="text-center px-2">
                        <span className="block font-black text-sm text-[#1E5FA8]">₹{totalAllSeasonsBank.toLocaleString('en-IN')}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bank Total</span>
                    </div>
                </div>
            </div>

            {/* Register New Season Form */}
            {isAdmin && (
                <div className="glass-card p-4 sm:p-6 mb-6 sm:mb-8 border-none bg-white shadow-sm rounded-2xl sm:rounded-3xl">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={18} className="text-[#1E5FA8]" />
                        <h2 className="text-base font-bold text-[#0F3B66]">Register New Operational Season</h2>
                    </div>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                className="input-field flex-1 h-12 text-sm"
                                placeholder="e.g. Ramalan Da'wah 2027"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={loading}
                                required
                            />
                            <button
                                type="submit"
                                disabled={loading || !name.trim()}
                                className="btn-primary flex items-center justify-center gap-2 px-6 h-12 text-sm font-bold shadow-md shadow-[#1E5FA8]/20 whitespace-nowrap disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                <span>Create Season</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 pl-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={isLockedNew}
                                    onChange={(e) => setIsLockedNew(e.target.checked)}
                                    className="rounded border-slate-300 text-[#1E5FA8] focus:ring-[#1E5FA8]"
                                />
                                <span className="font-medium">Create with data entries locked (freeze collection records upon creation)</span>
                            </label>
                        </div>
                    </form>
                </div>
            )}


            {/* Seasons List with Rule Badges & Edit Options */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Configured Seasons & Operating Rules ({seasons.length})
                    </h3>
                </div>

                {loading && seasons.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-3 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <Loader2 className="animate-spin text-[#1E5FA8]" size={36} />
                        <span className="text-xs font-bold uppercase tracking-wider">Loading seasons registry...</span>
                    </div>
                ) : seasons.length === 0 ? (
                    <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <Calendar size={36} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-bold text-slate-600">No operational seasons registered yet</p>
                        <p className="text-xs text-slate-400 mt-1">Use the form above to initialize your first season.</p>
                    </div>
                ) : (
                    seasons.map((season) => (
                        <div
                            key={season._id}
                            className={`glass-card p-4 sm:p-6 border transition-all duration-300 rounded-2xl sm:rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-5 ${
                                season.isActive
                                    ? 'bg-[#E6F0FA]/40 border-[#1E5FA8]/40 shadow-md ring-1 ring-[#1E5FA8]/20'
                                    : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                            }`}
                        >
                            {/* Left: Season Info and Rule Badges */}
                            <div className="flex-1 space-y-2.5">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h3 className={`text-xl font-bold tracking-tight ${season.isActive ? 'text-[#0F3B66]' : 'text-slate-800'}`}>
                                        {season.name}
                                    </h3>

                                    {/* Operational Active Status Rule */}
                                    {season.isActive ? (
                                        <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Active Season
                                        </span>
                                    ) : (
                                        <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                            Archived
                                        </span>
                                    )}

                                    {/* Field Data Lock Rule */}
                                    {season.isLocked ? (
                                        <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1" title="Data entry is locked for this season">
                                            <Lock size={11} className="text-amber-600" />
                                            Data Locked
                                        </span>
                                    ) : (
                                        <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1" title="Data entry is open">
                                            <Unlock size={11} className="text-blue-600" />
                                            Entry Open
                                        </span>
                                    )}
                                </div>

                                {/* Metadata Chips */}
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <Users size={14} className="text-[#1E5FA8]" />
                                        <strong className="text-slate-700">{season.teamCount || 0}</strong> Teams
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <FileText size={14} className="text-[#1E5FA8]" />
                                        <strong className="text-slate-700">{season.recordCount || 0}</strong> Records
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-[11px] font-medium text-slate-400">
                                        Registered: {new Date(season.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>

                            {/* Right: Actions (Edit option, Lock toggle, Activate, Delete) */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-start sm:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                                {/* Edit Button */}
                                {isAdmin && (
                                    <button
                                        onClick={() => openEditModal(season)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-50 hover:bg-[#E6F0FA] text-[#1E5FA8] border border-slate-200 hover:border-[#A3C4E8] rounded-xl text-xs font-bold transition-all shadow-sm"
                                        title="Edit Season Name & Rules"
                                    >
                                        <Edit3 size={15} />
                                        <span>Edit Rule</span>
                                    </button>
                                )}

                                {/* Lock / Unlock Rule Quick Toggle */}
                                {isAdmin && (
                                    <button
                                        onClick={() => handleToggleLock(season)}
                                        disabled={togglingLockId === season._id}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                                            season.isLocked
                                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                        title={season.isLocked ? "Click to unlock field entries" : "Click to lock field entries"}
                                    >
                                        {togglingLockId === season._id ? (
                                            <Loader2 size={15} className="animate-spin text-slate-500" />
                                        ) : season.isLocked ? (
                                            <>
                                                <Unlock size={14} className="text-amber-700" />
                                                <span>Unlock</span>
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={14} className="text-slate-500" />
                                                <span>Lock</span>
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Activate Button */}
                                {!season.isActive ? (
                                    <button
                                        onClick={() => handleActivate(season._id, season.name)}
                                        className="btn-secondary flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold text-[#1E5FA8] hover:bg-[#E6F0FA] rounded-xl"
                                        title="Make this the active season"
                                    >
                                        <Circle size={15} />
                                        <span>Activate</span>
                                    </button>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs border border-emerald-200">
                                        <CheckCircle size={15} />
                                        <span>Active</span>
                                    </span>
                                )}

                                {/* Delete Button (Safeguarded) */}
                                {isAdmin && !season.isActive && (
                                    <button
                                        onClick={() => handleDelete(season)}
                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-100"
                                        title={
                                            (season.teamCount > 0 || season.recordCount > 0)
                                                ? `Cannot delete (${season.teamCount || 0} teams, ${season.recordCount || 0} records)`
                                                : "Delete Season"
                                        }
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit Season & Operational Rules Modal */}
            {editingSeason && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className="p-2 sm:p-2.5 bg-[#1E5FA8] text-white rounded-xl shadow-md shrink-0">
                                    <Settings2 size={18} className="sm:w-5 sm:h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-[#0F3B66]">Edit Season & Operating Rules</h2>
                                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                                        Modify name, operational state, and access permissions
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingSeason(null)}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body / Form */}
                        <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar">
                            {/* Season Name */}
                            <div>
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                                    Season Name
                                </label>
                                <input
                                    type="text"
                                    className="input-field h-12 text-sm font-bold text-[#0F3B66]"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Ramadan 2027"
                                    required
                                />
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                    This label is shown in reporting headers, drop-downs, and official issue sheets.
                                </p>
                            </div>

                            {/* Operational Rules Section */}
                            <div className="space-y-4 pt-2 border-t border-slate-100">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Season Rules Configuration
                                </h4>

                                {/* Rule 1: Active Season Rule */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-[#0F3B66]">Rule 1: Global Active Season</span>
                                            {editForm.isActive && (
                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                                    Active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            When enabled, this season becomes the default working period across all dashboards, field operations, and reports.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                                        <input
                                            type="checkbox"
                                            checked={editForm.isActive}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, isActive: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E5FA8]"></div>
                                    </label>
                                </div>

                                {/* Rule 2: Field Data Lock Rule */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-[#0F3B66]">Rule 2: Freeze & Lock Data Entry</span>
                                            {editForm.isLocked ? (
                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                                    Locked
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                                    Open
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Locks all field collection entries and prevents non-admin staff from modifying records in this season.
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                                        <input
                                            type="checkbox"
                                            checked={editForm.isLocked}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, isLocked: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Summary Stats in Modal */}
                            <div className="px-3 py-2 bg-blue-50/60 rounded-xl text-xs text-[#1E5FA8] flex items-center justify-between">
                                <span>Attached: <strong>{editingSeason.teamCount || 0}</strong> teams</span>
                                <span><strong>{editingSeason.recordCount || 0}</strong> field collection records</span>
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingSeason(null)}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
                                    disabled={savingEdit}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit || !editForm.name.trim()}
                                    className="btn-primary flex items-center gap-2 px-6 py-2.5 text-xs font-bold shadow-md shadow-[#1E5FA8]/20"
                                >
                                    {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                    <span>Save Rules</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
