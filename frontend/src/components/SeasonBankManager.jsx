import { useState, useEffect, useMemo } from 'react';
import { bankAccountService, seasonBankService } from '../services/api';
import {
    Building2,
    Landmark,
    Plus,
    Trash2,
    Edit3,
    CheckCircle2,
    AlertCircle,
    X,
    Loader2,
    ArrowUpDown,
    ExternalLink,
    RefreshCw,
    Wallet,
    Info,
    Calendar
} from 'lucide-react';
import { confirmAction, confirmDelete, MySwal } from '../utils/swal';

export default function SeasonBankManager({
    seasons = [],
    activeSeasonId = '',
    onSeasonUpdated = () => {},
    isAdmin = true,
}) {
    // 1. Season selection state
    const [selectedSeasonId, setSelectedSeasonId] = useState(activeSeasonId || (seasons[0]?._id || ''));
    
    // 2. Master Bank Accounts list (stored permanently in bank_accounts table)
    const [masterBanks, setMasterBanks] = useState([]);
    const [loadingBanks, setLoadingBanks] = useState(false);

    // 3. Season-wise bank amounts (stored in season_bank_amounts table)
    const [seasonBanks, setSeasonBanks] = useState([]);
    const [totalBankAmount, setTotalBankAmount] = useState(0);
    const [loadingSeasonBanks, setLoadingSeasonBanks] = useState(false);

    // 4. Add Bank Amount Form state
    const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
    const [inputAmount, setInputAmount] = useState('');
    const [inputNotes, setInputNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 5. Quick Add Bank Account modal / drawer state
    const [showMasterModal, setShowMasterModal] = useState(false);
    const [newBankName, setNewBankName] = useState('');
    const [newAccountNumber, setNewAccountNumber] = useState('');
    const [isCreatingBank, setIsCreatingBank] = useState(false);

    // 6. Inline / Modal Edit Amount state
    const [editingRecord, setEditingRecord] = useState(null);
    const [editAmountVal, setEditAmountVal] = useState('');
    const [editNotesVal, setEditNotesVal] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    // 7. Edit Master Bank Name state
    const [editingMasterBank, setEditingMasterBank] = useState(null);
    const [editMasterName, setEditMasterName] = useState('');
    const [isSavingMasterEdit, setIsSavingMasterEdit] = useState(false);

    // Sync selectedSeasonId when activeSeasonId changes
    useEffect(() => {
        if (activeSeasonId && !selectedSeasonId) {
            setSelectedSeasonId(activeSeasonId);
        } else if (!selectedSeasonId && seasons.length > 0) {
            setSelectedSeasonId(seasons[0]._id);
        }
    }, [activeSeasonId, seasons]);

    // Fetch master bank accounts on mount
    useEffect(() => {
        fetchMasterBanks();
    }, []);

    // Fetch season bank amounts whenever selectedSeasonId changes
    useEffect(() => {
        if (selectedSeasonId) {
            fetchSeasonBanks(selectedSeasonId);
        } else {
            setSeasonBanks([]);
            setTotalBankAmount(0);
        }
    }, [selectedSeasonId]);

    const fetchMasterBanks = async () => {
        setLoadingBanks(true);
        try {
            const res = await bankAccountService.getAll();
            setMasterBanks(res.data || []);
        } catch (err) {
            console.error('Failed to load master bank accounts:', err);
        } finally {
            setLoadingBanks(false);
        }
    };

    const fetchSeasonBanks = async (seasonId) => {
        setLoadingSeasonBanks(true);
        try {
            const res = await seasonBankService.getBySeason(seasonId);
            setSeasonBanks(res.data.bankAmounts || []);
            setTotalBankAmount(res.data.totalBankAmount || 0);
        } catch (err) {
            console.error('Failed to load season bank amounts:', err);
        } finally {
            setLoadingSeasonBanks(false);
        }
    };

    // Currently selected season object
    const currentSeason = useMemo(() => {
        return seasons.find(s => s._id === selectedSeasonId) || null;
    }, [seasons, selectedSeasonId]);

    // IDs of bank accounts already added to this season
    const alreadyAddedBankIds = useMemo(() => {
        return new Set(seasonBanks.map(sb => {
            const bId = sb.bankAccount?._id || sb.bankAccount;
            return String(bId);
        }));
    }, [seasonBanks]);

    // Handle Create New Master Bank Account
    const handleCreateMasterBank = async (e) => {
        if (e) e.preventDefault();
        const trimmed = newBankName.trim();
        if (!trimmed) {
            return MySwal.fire('Required', 'Please enter a valid bank name', 'warning');
        }

        // Client-side quick duplicate check
        const exists = masterBanks.some(b => b.bankName.trim().toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            return MySwal.fire({
                title: 'Duplicate Bank Account',
                text: `A bank account with the name "${trimmed}" is already registered. Duplicate bank accounts are not allowed.`,
                icon: 'warning'
            });
        }

        setIsCreatingBank(true);
        try {
            const res = await bankAccountService.create({
                bankName: trimmed,
                accountNumber: newAccountNumber.trim()
            });

            const createdBank = res.data;
            await fetchMasterBanks();

            // Auto-select the newly created bank account in dropdown
            setSelectedBankAccountId(createdBank._id);
            setNewBankName('');
            setNewAccountNumber('');

            MySwal.fire({
                title: 'Bank Account Registered!',
                text: `"${createdBank.bankName}" is now available in the dropdown for all seasons.`,
                icon: 'success',
                timer: 1800,
                showConfirmButton: false
            });
        } catch (err) {
            console.error('Create bank error:', err);
            MySwal.fire('Error', err.response?.data?.message || 'Failed to create bank account', 'error');
        } finally {
            setIsCreatingBank(false);
        }
    };

    // Handle Adding Bank Amount to Season
    const handleAddSeasonBank = async (e) => {
        e.preventDefault();
        if (!selectedSeasonId) {
            return MySwal.fire('Select Season', 'Please select a season first', 'warning');
        }
        if (!selectedBankAccountId) {
            return MySwal.fire('Select Bank', 'Please select a bank account from the dropdown', 'warning');
        }

        const numAmount = Number(inputAmount);
        if (isNaN(numAmount) || numAmount < 0) {
            return MySwal.fire('Invalid Amount', 'Please enter a valid non-negative amount (₹)', 'warning');
        }

        // Prevent duplicate check on client
        if (alreadyAddedBankIds.has(String(selectedBankAccountId))) {
            return MySwal.fire({
                title: 'Already Added',
                text: 'This bank account is already added to this season. You can edit the existing amount instead.',
                icon: 'info'
            });
        }

        setIsSubmitting(true);
        try {
            const res = await seasonBankService.add(selectedSeasonId, {
                bankAccountId: selectedBankAccountId,
                amount: numAmount,
                notes: inputNotes.trim()
            });

            // Update state
            setInputAmount('');
            setInputNotes('');
            setSelectedBankAccountId('');

            // Reload season banks
            await fetchSeasonBanks(selectedSeasonId);
            onSeasonUpdated();

            MySwal.fire({
                title: 'Bank Amount Added!',
                text: `Successfully added ₹${numAmount.toLocaleString('en-IN')} to ${currentSeason?.name || 'season'}.`,
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (err) {
            console.error('Failed to add season bank amount:', err);
            MySwal.fire('Error', err.response?.data?.message || 'Failed to add bank amount to season', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Editing Season Bank Amount
    const handleOpenEditRecord = (record) => {
        setEditingRecord(record);
        setEditAmountVal(record.amount || 0);
        setEditNotesVal(record.notes || '');
    };

    const handleSaveEditRecord = async (e) => {
        e.preventDefault();
        if (!editingRecord) return;
        const numAmount = Number(editAmountVal);
        if (isNaN(numAmount) || numAmount < 0) {
            return MySwal.fire('Invalid Amount', 'Please enter a valid non-negative amount (₹)', 'warning');
        }

        setIsSavingEdit(true);
        try {
            await seasonBankService.update(selectedSeasonId, editingRecord._id, {
                amount: numAmount,
                notes: editNotesVal.trim()
            });

            setEditingRecord(null);
            await fetchSeasonBanks(selectedSeasonId);
            onSeasonUpdated();

            MySwal.fire({
                title: 'Amount Updated!',
                text: 'The season bank balance has been recalculated.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (err) {
            console.error('Failed to update bank amount:', err);
            MySwal.fire('Error', err.response?.data?.message || 'Failed to update bank amount', 'error');
        } finally {
            setIsSavingEdit(false);
        }
    };

    // Handle Removing Bank Amount from Season
    const handleDeleteSeasonBank = async (record) => {
        const bankTitle = record.bankAccount?.bankName || 'this bank account';
        const confirmed = await confirmDelete({
            title: `Remove ${bankTitle}?`,
            text: `This will remove ₹${Number(record.amount || 0).toLocaleString('en-IN')} from ${currentSeason?.name || 'this season'}'s bank total. The master bank record will remain intact.`,
            confirmText: 'Yes, Remove'
        });

        if (confirmed) {
            try {
                await seasonBankService.delete(selectedSeasonId, record._id);
                await fetchSeasonBanks(selectedSeasonId);
                onSeasonUpdated();
                MySwal.fire('Removed!', 'Bank amount entry removed from season.', 'success');
            } catch (err) {
                console.error('Failed to remove season bank amount:', err);
                MySwal.fire('Error', err.response?.data?.message || 'Failed to remove entry', 'error');
            }
        }
    };

    // Master Bank Edit
    const handleOpenMasterEdit = (bank) => {
        setEditingMasterBank(bank);
        setEditMasterName(bank.bankName || '');
    };

    const handleSaveMasterEdit = async (e) => {
        e.preventDefault();
        const trimmed = editMasterName.trim();
        if (!trimmed) {
            return MySwal.fire('Required', 'Bank name cannot be empty', 'warning');
        }

        setIsSavingMasterEdit(true);
        try {
            await bankAccountService.update(editingMasterBank._id, { bankName: trimmed });
            setEditingMasterBank(null);
            await fetchMasterBanks();
            if (selectedSeasonId) {
                await fetchSeasonBanks(selectedSeasonId);
            }
            MySwal.fire('Updated!', 'Bank name updated across all records.', 'success');
        } catch (err) {
            console.error('Update master bank error:', err);
            MySwal.fire('Error', err.response?.data?.message || 'Failed to update bank name', 'error');
        } finally {
            setIsSavingMasterEdit(false);
        }
    };

    // Master Bank Delete
    const handleDeleteMasterBank = async (bank) => {
        const confirmed = await confirmDelete({
            title: `Delete "${bank.bankName}"?`,
            text: 'This will permanently remove the bank account from the system directory. Linked seasons will be safeguarded.',
            confirmText: 'Delete Permanently'
        });

        if (confirmed) {
            try {
                await bankAccountService.delete(bank._id);
                await fetchMasterBanks();
                MySwal.fire('Deleted!', `Bank account "${bank.bankName}" removed.`, 'success');
            } catch (err) {
                console.error('Delete master bank error:', err);
                MySwal.fire({
                    title: 'Cannot Delete Bank Account',
                    text: err.response?.data?.message || 'Failed to delete bank account',
                    icon: 'error'
                });
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Main Season Banking Card */}
            <div className="glass-card p-4 sm:p-6 lg:p-7 bg-white rounded-3xl border border-slate-200/80 shadow-md">
                
                {/* Header & Season Selector Bar */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 sm:p-3 bg-[#E6F0FA] text-[#1E5FA8] rounded-2xl shadow-xs">
                            <Landmark size={24} className="sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg sm:text-xl font-bold text-[#0F3B66]">
                                    Season Bank Accounts & Balances
                                </h2>
                                {currentSeason?.isActive && (
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        Active Season
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Select or create bank accounts and assign season-specific amounts
                            </p>
                        </div>
                    </div>

                    {/* Season Selector Dropdown & Master Directory Button */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                        <div className="flex-1 md:w-64">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                                Operational Season
                            </label>
                            <select
                                className="w-full h-10 px-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-[#0F3B66] focus:border-[#1E5FA8] focus:bg-white outline-none transition-all cursor-pointer"
                                value={selectedSeasonId}
                                onChange={(e) => setSelectedSeasonId(e.target.value)}
                            >
                                {seasons.map((s) => (
                                    <option key={s._id} value={s._id}>
                                        {s.name} {s.isActive ? '★ (Active)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Master Bank Directory Modal Trigger */}
                        <div className="self-end">
                            <button
                                type="button"
                                onClick={() => setShowMasterModal(true)}
                                className="h-10 px-3.5 bg-slate-100 hover:bg-[#E6F0FA] text-[#1E5FA8] hover:text-[#0F3B66] border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                                title="Manage Master Bank Accounts Directory"
                            >
                                <Building2 size={16} />
                                <span className="hidden sm:inline">Bank Directory</span>
                                <span className="sm:hidden">Banks</span>
                                <span className="text-[10px] bg-white px-1.5 py-0.5 rounded-full text-slate-500 font-bold border border-slate-200">
                                    {masterBanks.length}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section 1: Add Bank Amount to Season Form */}
                {isAdmin && (
                    <div className="mt-5 p-4 sm:p-5 bg-slate-50/70 rounded-2xl border border-slate-200/70">
                        <div className="flex items-center justify-between mb-3.5">
                            <span className="text-xs font-bold text-[#0F3B66] uppercase tracking-wider flex items-center gap-1.5">
                                <Plus size={15} className="text-[#1E5FA8]" />
                                Add Bank Account to {currentSeason?.name || 'Selected Season'}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                                Step 1: Select Bank • Step 2: Enter Amount
                            </span>
                        </div>

                        <form onSubmit={handleAddSeasonBank} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                            {/* Bank Selection Dropdown */}
                            <div className="sm:col-span-5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Select Bank Account *
                                </label>
                                <div className="flex gap-1.5">
                                    <select
                                        required
                                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-[#0F3B66] focus:border-[#1E5FA8] outline-none transition-all cursor-pointer"
                                        value={selectedBankAccountId}
                                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                                        disabled={isSubmitting || loadingBanks}
                                    >
                                        <option value="">-- Choose a Bank Account --</option>
                                        {masterBanks.map((bank) => {
                                            const isAlreadyAdded = alreadyAddedBankIds.has(String(bank._id));
                                            return (
                                                <option
                                                    key={bank._id}
                                                    value={bank._id}
                                                    disabled={isAlreadyAdded}
                                                >
                                                    {bank.bankName} {isAlreadyAdded ? '(Already in this season)' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>

                                    {/* Quick "+ New Bank" button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowMasterModal(true)}
                                        className="h-11 px-3 bg-white hover:bg-[#E6F0FA] text-[#1E5FA8] border border-slate-200 hover:border-[#1E5FA8] rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                                        title="Create a new permanent bank account"
                                    >
                                        <Plus size={15} />
                                        <span className="hidden md:inline">New Bank</span>
                                    </button>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="sm:col-span-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Amount (₹) *
                                </label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    onWheel={(e) => e.target.blur()}
                                    placeholder="e.g. 50000"
                                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-[#1E5FA8] focus:border-[#1E5FA8] outline-none transition-all"
                                    value={inputAmount}
                                    onChange={(e) => setInputAmount(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Optional Reference / Remarks */}
                            <div className="sm:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Remarks / Note
                                </label>
                                <input
                                    type="text"
                                    placeholder="Optional note"
                                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:border-[#1E5FA8] outline-none transition-all"
                                    value={inputNotes}
                                    onChange={(e) => setInputNotes(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Add Bank Amount Submit Button */}
                            <div className="sm:col-span-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !selectedBankAccountId || !inputAmount}
                                    className="w-full h-11 btn-primary flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold shadow-md shadow-[#1E5FA8]/20 disabled:opacity-50 transition-all rounded-xl"
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Plus size={16} />
                                    )}
                                    <span>Add Bank Amount</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Section 2: Added Bank Accounts Table */}
                <div className="mt-6">
                    <div className="flex justify-between items-center mb-3 px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Bank Accounts for {currentSeason?.name || 'Selected Season'}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                                {seasonBanks.length}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => fetchSeasonBanks(selectedSeasonId)}
                            disabled={loadingSeasonBanks}
                            className="text-[11px] text-slate-400 hover:text-[#1E5FA8] flex items-center gap-1 font-semibold transition-colors"
                        >
                            <RefreshCw size={12} className={loadingSeasonBanks ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    {loadingSeasonBanks ? (
                        <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2 bg-slate-50/50 rounded-2xl border border-slate-100">
                            <Loader2 className="animate-spin text-[#1E5FA8]" size={28} />
                            <span className="text-xs font-bold uppercase tracking-wider">Loading bank accounts...</span>
                        </div>
                    ) : seasonBanks.length === 0 ? (
                        <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
                            <Building2 size={32} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-bold text-slate-600">
                                No bank accounts added for {currentSeason?.name || 'this season'} yet
                            </p>
                            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                                Select a bank account from the dropdown above and specify its amount to record season banking.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                                        <th className="py-3 px-4">#</th>
                                        <th className="py-3 px-4">Bank Name</th>
                                        <th className="py-3 px-4">Account / Notes</th>
                                        <th className="py-3 px-4 text-right">Amount (₹)</th>
                                        <th className="py-3 px-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {seasonBanks.map((item, idx) => (
                                        <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3 px-4 text-slate-400 font-bold text-xs">
                                                {idx + 1}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-[#0F3B66]">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-[#E6F0FA] text-[#1E5FA8] rounded-lg shrink-0">
                                                        <Building2 size={14} />
                                                    </div>
                                                    <span>{item.bankAccount?.bankName || 'Unknown Bank'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 text-xs">
                                                {item.notes ? (
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                                                        {item.notes}
                                                    </span>
                                                ) : item.bankAccount?.accountNumber ? (
                                                    <span className="text-slate-400 font-mono text-[11px]">
                                                        A/C: {item.bankAccount.accountNumber}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 italic">—</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right font-black text-[#1E5FA8] text-sm sm:text-base">
                                                ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {isAdmin ? (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditRecord(item)}
                                                            className="p-1.5 text-slate-400 hover:text-[#1E5FA8] hover:bg-[#E6F0FA] rounded-lg transition-colors"
                                                            title="Edit Amount"
                                                        >
                                                            <Edit3 size={15} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteSeasonBank(item)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Remove from Season"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 text-xs">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Section 3: Prominent Total Bank Amount (₹) Display */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                    <div className="bg-gradient-to-r from-[#0F3B66] via-[#164882] to-[#1E5FA8] rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-[#1E5FA8]/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                            <span className="text-[11px] font-black uppercase tracking-widest text-[#A3C4E8] flex items-center gap-1.5">
                                <Wallet size={15} /> Total Bank Amount (₹)
                            </span>
                            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                                ₹{Number(totalBankAmount || 0).toLocaleString('en-IN')}
                            </h3>
                            <p className="text-xs text-white/80 font-medium">
                                Sum of all {seasonBanks.length} bank account(s) allocated to{' '}
                                <strong className="text-white underline decoration-white/40 underline-offset-2">
                                    {currentSeason?.name || 'Selected Season'}
                                </strong>
                            </p>
                        </div>

                        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-xs flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-start">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="font-semibold text-white/90">
                                Live Auto-Sum ({seasonBanks.length} accounts)
                            </span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Modal: Master Bank Accounts Directory */}
            {showMasterModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-6">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-[#E6F0FA] text-[#1E5FA8] rounded-xl">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-[#0F3B66]">
                                        Master Bank Accounts Directory
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Permanent bank accounts available in dropdown across all seasons
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowMasterModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                            {/* Create New Bank Account Form */}
                            {isAdmin && (
                                <form
                                    onSubmit={handleCreateMasterBank}
                                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
                                >
                                    <h4 className="text-xs font-bold text-[#0F3B66] uppercase tracking-wider flex items-center gap-1.5">
                                        <Plus size={14} className="text-[#1E5FA8]" />
                                        Register New Bank Account
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                Bank Name *
                                            </label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="e.g. State Bank of India, Federal Bank"
                                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-[#0F3B66] focus:border-[#1E5FA8] outline-none transition-all"
                                                value={newBankName}
                                                onChange={(e) => setNewBankName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                Account Number (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Optional A/C No"
                                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-600 focus:border-[#1E5FA8] outline-none transition-all"
                                                value={newAccountNumber}
                                                onChange={(e) => setNewAccountNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-1">
                                        <button
                                            type="submit"
                                            disabled={isCreatingBank || !newBankName.trim()}
                                            className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm rounded-xl"
                                        >
                                            {isCreatingBank ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                            <span>Save Bank Account</span>
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Existing Bank Accounts Table */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-wider px-1">
                                    <span>Registered Bank Accounts ({masterBanks.length})</span>
                                    <span>Seasons Linked</span>
                                </div>
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white overflow-hidden">
                                    {masterBanks.map((bank) => (
                                        <div
                                            key={bank._id}
                                            className="p-3 sm:px-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs sm:text-sm"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                                                    <Building2 size={16} />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-[#0F3B66] block">
                                                        {bank.bankName}
                                                    </span>
                                                    {bank.accountNumber && (
                                                        <span className="text-[11px] text-slate-400 font-mono">
                                                            A/C: {bank.accountNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                                    {bank.usageCount || 0} Season(s)
                                                </span>

                                                {isAdmin && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenMasterEdit(bank)}
                                                            className="p-1.5 text-slate-400 hover:text-[#1E5FA8] hover:bg-[#E6F0FA] rounded-lg transition-colors"
                                                            title="Edit Bank Name"
                                                        >
                                                            <Edit3 size={15} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteMasterBank(bank)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title={
                                                                bank.usageCount > 0
                                                                    ? "Cannot delete: linked to seasons"
                                                                    : "Delete Bank Account"
                                                            }
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowMasterModal(false)}
                                className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Edit Season Bank Amount */}
            {editingRecord && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-sm text-[#0F3B66]">
                                Edit Bank Amount for {editingRecord.bankAccount?.bankName}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingRecord(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEditRecord} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Bank Name
                                </label>
                                <input
                                    type="text"
                                    disabled
                                    className="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-not-allowed"
                                    value={editingRecord.bankAccount?.bankName || ''}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Amount (₹) *
                                </label>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    onWheel={(e) => e.target.blur()}
                                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-base font-bold text-[#1E5FA8] focus:border-[#1E5FA8] outline-none transition-all"
                                    value={editAmountVal}
                                    onChange={(e) => setEditAmountVal(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Remarks / Note
                                </label>
                                <input
                                    type="text"
                                    placeholder="Optional note"
                                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:border-[#1E5FA8] outline-none transition-all"
                                    value={editNotesVal}
                                    onChange={(e) => setEditNotesVal(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingRecord(null)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingEdit}
                                    className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 rounded-xl shadow-md"
                                >
                                    {isSavingEdit ? <Loader2 size={14} className="animate-spin" /> : null}
                                    <span>Update Amount</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Master Bank Account Name */}
            {editingMasterBank && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-sm text-[#0F3B66]">
                                Edit Master Bank Account Name
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingMasterBank(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMasterEdit} className="p-6 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Bank Name *
                                </label>
                                <input
                                    required
                                    type="text"
                                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-[#0F3B66] focus:border-[#1E5FA8] outline-none transition-all"
                                    value={editMasterName}
                                    onChange={(e) => setEditMasterName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingMasterBank(null)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingMasterEdit || !editMasterName.trim()}
                                    className="btn-primary px-5 py-2 text-xs font-bold flex items-center gap-1.5 rounded-xl shadow-md"
                                >
                                    {isSavingMasterEdit ? <Loader2 size={14} className="animate-spin" /> : null}
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
