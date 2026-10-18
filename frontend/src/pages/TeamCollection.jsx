import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
    BookOpen, CheckCircle2, Clock, AlertTriangle, Lock, Unlock, 
    Save, Send, ArrowLeft, RefreshCw, ChevronRight, History, 
    User, Calendar, Info, Search, Filter, ShieldCheck, Check,
    AlertCircle, FileSpreadsheet, Eye, Edit3, LayoutGrid, List
} from 'lucide-react';
import { teamCollectionService, teamService, seasonService } from '../services/api';
import { MySwal, confirmAction } from '../utils/swal';

export default function TeamCollection() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role === 'admin';

    // State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // Team & Season Context
    const [team, setTeam] = useState(null);
    const [season, setSeason] = useState(null);
    const [allTeams, setAllTeams] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState(searchParams.get('teamId') || '');
    
    // Books & Selected Book
    const [books, setBooks] = useState([]);
    const [selectedBookNumber, setSelectedBookNumber] = useState(searchParams.get('book') || '');
    
    // Collection Data for Selected Book
    const [collectionData, setCollectionData] = useState(null);
    const [receipts, setReceipts] = useState([]);
    const [showAuditHistory, setShowAuditHistory] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');
    const [filterCancelledOnly, setFilterCancelledOnly] = useState(false);
    const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'));

    // Track unsaved changes
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Input refs for fast keyboard navigation
    const inputRefs = useRef({});

    // 1. Initial Load: Fetch Team & Books
    useEffect(() => {
        loadTeamContext();
    }, [selectedTeamId]);

    const loadTeamContext = async () => {
        setLoading(true);
        try {
            if (isAdmin) {
                // Admin can view any team
                const activeSeasonRes = await seasonService.getActive();
                const currentSeason = activeSeasonRes.data;
                setSeason(currentSeason);

                const teamsRes = await teamService.getAll(currentSeason?._id);
                setAllTeams(teamsRes.data || []);

                let targetTeamId = selectedTeamId;
                if (!targetTeamId && teamsRes.data?.length > 0) {
                    targetTeamId = teamsRes.data[0]._id;
                    setSelectedTeamId(targetTeamId);
                    setSearchParams({ teamId: targetTeamId });
                }

                if (targetTeamId) {
                    await fetchTeamBooks(targetTeamId);
                }
            } else {
                // Data Collector: Fetch user's assigned team
                const myTeamRes = await teamCollectionService.getMyTeam();
                const userTeam = myTeamRes.data.team;
                setTeam(userTeam);
                setSeason(myTeamRes.data.season);
                setSelectedTeamId(userTeam._id);
                await fetchTeamBooks(userTeam._id);
            }
        } catch (err) {
            console.error('Error loading team collection context:', err);
            MySwal.fire({
                icon: 'error',
                title: 'Access Restricted',
                text: err.response?.data?.message || 'Failed to load team data. Please contact administrator.'
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamBooks = async (teamId) => {
        try {
            const res = await teamCollectionService.getTeamBooks(teamId);
            setTeam(res.data.team);
            const bookList = res.data.books || [];
            setBooks(bookList);

            // If a book is specified in query param, select it; otherwise select first book
            const paramBook = searchParams.get('book');
            const matchingBook = bookList.find(b => String(b.bookNumber) === String(paramBook));
            if (matchingBook) {
                selectBook(matchingBook.bookNumber, teamId);
            } else if (bookList.length > 0) {
                selectBook(bookList[0].bookNumber, teamId);
            } else {
                setSelectedBookNumber('');
                setCollectionData(null);
                setReceipts([]);
            }
        } catch (err) {
            console.error('Error fetching team books:', err);
        }
    };

    // 2. Select Book and Load Receipts
    const selectBook = async (bookNumber, teamId = selectedTeamId) => {
        if (!teamId || !bookNumber) return;
        
        if (hasUnsavedChanges) {
            const confirmed = await confirmAction({
                title: 'Unsaved Changes',
                text: 'You have unsaved changes in the current book. Discard and switch book?',
                confirmText: 'Switch Book',
                cancelText: 'Stay Here',
                variant: 'warning'
            });
            if (!confirmed) return;
        }

        setSelectedBookNumber(bookNumber);
        setSearchParams({ teamId, book: bookNumber });
        setLoading(true);

        try {
            const res = await teamCollectionService.getBookReceipts(teamId, bookNumber);
            setCollectionData(res.data);
            setReceipts(res.data.receipts || []);
            setHasUnsavedChanges(false);
        } catch (err) {
            console.error('Error loading book receipts:', err);
            MySwal.fire('Error', err.response?.data?.message || 'Failed to load book receipts', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Handle receipt amount change
    const handleAmountChange = (index, value) => {
        const cleaned = value.replace(/[^0-9]/g, '');
        const numVal = cleaned === '' ? 0 : parseInt(cleaned, 10);

        setReceipts(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], amount: numVal };
            return copy;
        });
        setHasUnsavedChanges(true);
    };

    // Handle donor name / remarks change
    const handleFieldChange = (index, field, value) => {
        setReceipts(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
        setHasUnsavedChanges(true);
    };

    // Toggle cancelled status
    const toggleCancelled = (index) => {
        setReceipts(prev => {
            const copy = [...prev];
            const isCurrentlyCancelled = copy[index].isCancelled;
            copy[index] = {
                ...copy[index],
                isCancelled: !isCurrentlyCancelled,
                amount: !isCurrentlyCancelled ? 0 : copy[index].amount
            };
            return copy;
        });
        setHasUnsavedChanges(true);
    };

    // Fast keyboard navigation between receipt inputs
    const handleKeyDown = (e, index) => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = index + 1;
            if (inputRefs.current[nextIndex]) {
                inputRefs.current[nextIndex].focus();
                inputRefs.current[nextIndex].select?.();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = index - 1;
            if (inputRefs.current[prevIndex]) {
                inputRefs.current[prevIndex].focus();
                inputRefs.current[prevIndex].select?.();
            }
        }
    };

    // Live calculation of totals
    const liveStats = useMemo(() => {
        let total = 0;
        let activeCount = 0;
        let cancelledCount = 0;

        receipts.forEach(r => {
            if (r.isCancelled) {
                cancelledCount++;
            } else if (r.amount > 0) {
                total += r.amount;
                activeCount++;
            }
        });

        const avg = activeCount > 0 ? Math.round(total / activeCount) : 0;
        const progressPercent = receipts.length > 0 ? Math.round((activeCount / receipts.length) * 100) : 0;
        return { total, activeCount, cancelledCount, avg, progressPercent };
    }, [receipts]);

    // Check if editing is locked
    // If status is APPROVED, it is LOCKED for data collectors (only admins can edit or reopen)
    const isApproved = collectionData?.status === 'APPROVED';
    const isLocked = isApproved && !isAdmin;

    // Save Draft
    const handleSaveDraft = async () => {
        if (!selectedTeamId || !selectedBookNumber) return;
        setSaving(true);
        try {
            await teamCollectionService.saveBookReceipts(selectedTeamId, selectedBookNumber, {
                receipts,
                isDraft: true
            });
            setHasUnsavedChanges(false);
            
            // Refresh book list & current collection
            await fetchTeamBooks(selectedTeamId);
            const refreshRes = await teamCollectionService.getBookReceipts(selectedTeamId, selectedBookNumber);
            setCollectionData(refreshRes.data);

            MySwal.fire({
                icon: 'success',
                title: 'Draft Saved',
                text: `Book #${selectedBookNumber} progress saved with ₹${liveStats.total.toLocaleString('en-IN')} total.`,
                timer: 1800,
                showConfirmButton: false
            });
        } catch (err) {
            console.error('Error saving draft:', err);
            MySwal.fire('Error', err.response?.data?.message || 'Failed to save draft', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Submit for Admin Approval
    const handleSubmitForApproval = async () => {
        if (!selectedTeamId || !selectedBookNumber) return;

        if (liveStats.activeCount === 0) {
            const proceed = await confirmAction({
                title: 'No Collections Entered?',
                text: 'All receipts currently have ₹0. Are you sure you want to submit this book with zero collection?',
                confirmText: 'Yes, Submit Anyway',
                variant: 'warning'
            });
            if (!proceed) return;
        }

        const confirmed = await confirmAction({
            title: `Submit Book #${selectedBookNumber}?`,
            text: `You are submitting ₹${liveStats.total.toLocaleString('en-IN')} total (${liveStats.activeCount} receipts entered) for Admin review. You can still make edits before approval.`,
            confirmText: 'Yes, Submit for Review',
            variant: 'info'
        });

        if (!confirmed) return;

        setSubmitting(true);
        try {
            // First save latest edits
            await teamCollectionService.saveBookReceipts(selectedTeamId, selectedBookNumber, {
                receipts,
                isDraft: false
            });

            // Then submit for approval
            await teamCollectionService.submitBookCollection(selectedTeamId, selectedBookNumber);
            setHasUnsavedChanges(false);

            await fetchTeamBooks(selectedTeamId);
            const refreshRes = await teamCollectionService.getBookReceipts(selectedTeamId, selectedBookNumber);
            setCollectionData(refreshRes.data);

            MySwal.fire({
                icon: 'success',
                title: 'Submitted Successfully!',
                text: `Book #${selectedBookNumber} submitted for Admin review. The Administrator will review and approve it.`,
            });
        } catch (err) {
            console.error('Error submitting for approval:', err);
            MySwal.fire('Submission Error', err.response?.data?.message || 'Failed to submit collection', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Admin Action: Approve Collection
    const handleAdminApprove = async () => {
        if (!collectionData?._id) return;
        const confirmed = await confirmAction({
            title: `Approve Book #${selectedBookNumber}?`,
            text: `This will approve the verified collection of ₹${liveStats.total.toLocaleString('en-IN')} and sync it directly to the Team's Settlement records.`,
            confirmText: 'Approve & Sync',
            variant: 'success'
        });

        if (!confirmed) return;

        try {
            await teamCollectionService.approveSubmission(collectionData._id, {
                adminRemarks: 'Verified and approved by administrator'
            });
            await fetchTeamBooks(selectedTeamId);
            const refreshRes = await teamCollectionService.getBookReceipts(selectedTeamId, selectedBookNumber);
            setCollectionData(refreshRes.data);

            MySwal.fire('Approved!', 'Collection approved and synced with Team Settlement.', 'success');
        } catch (err) {
            console.error('Error approving collection:', err);
            MySwal.fire('Error', err.response?.data?.message || 'Failed to approve collection', 'error');
        }
    };

    // Admin Action: Reopen for Team Editing
    const handleAdminReopen = async () => {
        if (!collectionData?._id) return;

        const { value: reason } = await MySwal.fire({
            title: `Reopen Book #${selectedBookNumber} for Editing?`,
            input: 'textarea',
            inputLabel: 'Reason for Reopening (displayed to Team)',
            inputPlaceholder: 'e.g. Please check receipt #14 amount against counterfoil...',
            showCancelButton: true,
            confirmButtonText: 'Reopen Book',
            confirmButtonColor: '#E65100',
            inputValidator: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please provide a reason so the team knows what needs correction!';
                }
            }
        });

        if (reason) {
            try {
                await teamCollectionService.reopenSubmission(collectionData._id, { reason });
                await fetchTeamBooks(selectedTeamId);
                const refreshRes = await teamCollectionService.getBookReceipts(selectedTeamId, selectedBookNumber);
                setCollectionData(refreshRes.data);

                MySwal.fire('Reopened!', 'The team can now edit and resubmit this collection.', 'success');
            } catch (err) {
                console.error('Error reopening collection:', err);
                MySwal.fire('Error', err.response?.data?.message || 'Failed to reopen collection', 'error');
            }
        }
    };

    // Filter receipts list
    const filteredReceipts = useMemo(() => {
        return receipts.filter((r) => {
            if (filterCancelledOnly && !r.isCancelled) return false;
            if (!searchFilter.trim()) return true;
            const q = searchFilter.toLowerCase();
            return (
                String(r.receiptNumber).includes(q) ||
                (r.remarks && r.remarks.toLowerCase().includes(q)) ||
                String(r.amount).includes(q)
            );
        });
    }, [receipts, searchFilter, filterCancelledOnly]);

    // Status Helper
    const renderStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        Approved & Locked
                    </span>
                );
            case 'SUBMITTED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                        <Clock size={13} className="text-blue-600" />
                        Submitted for Approval
                    </span>
                );
            case 'REOPENED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle size={13} className="text-amber-600" />
                        Reopened for Editing
                    </span>
                );
            case 'DRAFT':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <Edit3 size={13} className="text-slate-500" />
                        Draft (In Progress)
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
                        Not Started
                    </span>
                );
        }
    };

    if (loading && !team) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
                <div className="w-12 h-12 border-4 border-[#1E5FA8] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-600 font-semibold">Loading Team Collection Portal...</p>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-36 sm:pb-16">
            
            {/* Top Header Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#E6F0FA]/60 to-transparent rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 sm:p-3 bg-[#E6F0FA] rounded-xl sm:rounded-2xl text-[#1E5FA8] shadow-sm shrink-0">
                                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0F3B66] tracking-tight">
                                        {team ? `${team.placeName} Collection Register` : 'Team Collection Register'}
                                    </h1>
                                    {team?.state && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#E6F0FA] text-[#1E5FA8] uppercase tracking-wider">
                                            {team.state}
                                        </span>
                                    )}
                                    {!isAdmin && (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-blue-50 text-blue-700 uppercase tracking-wider border border-blue-200">
                                            Field Envoy
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                                    Dedicated team portal for receipt book entry, direct submission, and verification.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Team Selector for Admins */}
                    {isAdmin && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200 w-full lg:w-auto">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap px-1">
                                    Team:
                                </label>
                                <select
                                    value={selectedTeamId}
                                    onChange={(e) => {
                                        setSelectedTeamId(e.target.value);
                                        setSearchParams({ teamId: e.target.value });
                                    }}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-[#0F3B66] focus:outline-none focus:ring-2 focus:ring-[#1E5FA8] shadow-sm"
                                >
                                    {allTeams.map(t => (
                                        <option key={t._id} value={t._id}>
                                            {t.placeName} ({t.state})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => navigate('/collection-approvals')}
                                className="px-3 py-2 bg-[#0F3B66] hover:bg-[#1E5FA8] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
                            >
                                <ShieldCheck size={14} />
                                Approvals Dashboard
                            </button>
                        </div>
                    )}
                </div>

                {/* Team Info Strip */}
                {team && (
                    <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
                        <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Books</span>
                            <span className="text-sm sm:text-base font-bold text-[#0F3B66]">{books.length} Books</span>
                        </div>
                        <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Season</span>
                            <span className="text-sm sm:text-base font-bold text-[#1E5FA8]">{season?.name || 'Current'}</span>
                        </div>
                        <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Logged In User</span>
                            <span className="text-xs sm:text-sm font-bold text-slate-700 truncate block">{currentUser.displayName || currentUser.username}</span>
                        </div>
                        <div className="bg-slate-50/80 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Access Role</span>
                            <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 bg-blue-50 text-blue-700 uppercase">
                                {currentUser.role === 'admin' ? 'Super Admin' : 'Field Envoy'}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* 1. Book Selection Carousel / Grid */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-bold text-[#0F3B66] flex items-center gap-2">
                        <span>Select Assigned Receipt Book</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#E6F0FA] text-[#1E5FA8] font-bold">
                            {books.length} Available
                        </span>
                    </h2>
                    <span className="text-xs text-slate-400 font-medium">
                        {books.length > 1 ? (
                            <>
                                <span className="sm:hidden">Swipe to switch books &rarr;</span>
                                <span className="hidden sm:inline">Click on a book to enter or edit receipts</span>
                            </>
                        ) : (
                            'Click on a book to enter or edit receipts'
                        )}
                    </span>
                </div>

                {books.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-800">
                        <AlertCircle className="mx-auto mb-2 text-amber-600" size={32} />
                        <h3 className="font-bold text-base">No Receipt Books Assigned Yet</h3>
                        <p className="text-sm mt-1 text-amber-700">
                            Please contact administrator to assign receipt books to {team?.placeName || 'your team'}.
                        </p>
                    </div>
                ) : (
                    <div className="flex sm:grid overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 snap-x snap-mandatory scrollbar-none -mx-1 px-1">
                        {books.map((b) => {
                            const isSelected = String(b.bookNumber) === String(selectedBookNumber);
                            return (
                                <button
                                    key={b.bookNumber}
                                    onClick={() => selectBook(b.bookNumber)}
                                    className={`text-left p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group shrink-0 sm:shrink min-w-[240px] sm:min-w-0 snap-start ${
                                        isSelected
                                            ? 'bg-gradient-to-br from-[#E6F0FA] to-white border-[#1E5FA8] shadow-md ring-2 ring-[#1E5FA8]/20'
                                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                    }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-0 right-0 w-2 h-full bg-[#1E5FA8]" />
                                    )}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-[#0F3B66] text-white shadow-xs">
                                            Book #{b.bookNumber}
                                        </span>
                                        {renderStatusBadge(b.status)}
                                    </div>

                                    <div className="text-xs text-slate-500 font-medium mb-3">
                                        Receipts: #{b.startPage} – #{b.endPage}
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-end justify-between">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Collected</span>
                                            <span className="text-sm sm:text-base font-black text-[#0F3B66]">
                                                ₹{(b.totalCollected || 0).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-[#1E5FA8] group-hover:translate-x-1 transition-transform flex items-center">
                                            {isSelected ? 'Active' : 'Select'} <ChevronRight size={14} />
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Selected Book Workspace */}
            {selectedBookNumber && collectionData && (
                <div className="space-y-6">
                    
                    {/* Status Notification Banners */}
                    {isApproved && (
                        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-sm">
                            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                                <Lock size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-emerald-900 text-base">
                                        Collection Approved & Locked
                                    </h3>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">
                                        Verified
                                    </span>
                                </div>
                                <p className="text-sm text-emerald-800 mt-1">
                                    This receipt book collection was reviewed and approved by administrator on{' '}
                                    <span className="font-bold">
                                        {collectionData.approvedAt ? new Date(collectionData.approvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Admin'}
                                    </span>.
                                    {isLocked && (
                                        <span className="block mt-1 font-semibold text-emerald-950">
                                            Editing is currently locked for team members. If corrections are required, please contact the administrator to reopen this book.
                                        </span>
                                    )}
                                    {isAdmin && (
                                        <span className="block mt-1 font-medium text-emerald-900">
                                            As an administrator, you have full override permission and can reopen or adjust this book at any time.
                                        </span>
                                    )}
                                </p>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={handleAdminReopen}
                                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap self-center"
                                >
                                    <Unlock size={14} />
                                    Reopen Book
                                </button>
                            )}
                        </div>
                    )}

                    {collectionData.status === 'REOPENED' && (
                        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-sm">
                            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-amber-900 text-base">
                                        Reopened by Administrator for Editing
                                    </h3>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                                        Needs Revision
                                    </span>
                                </div>
                                <p className="text-sm text-amber-900 mt-1">
                                    <span className="font-bold">Admin Reason / Instructions: </span>
                                    "{collectionData.reopenReason || 'Please review and make necessary corrections before resubmitting.'}"
                                </p>
                                <p className="text-xs text-amber-700 mt-1">
                                    You can edit the receipts below and click <strong>"Submit for Admin Approval"</strong> once finished.
                                </p>
                            </div>
                        </div>
                    )}

                    {collectionData.status === 'SUBMITTED' && (
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-sm">
                            <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
                                <Clock size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-black text-blue-900 text-base">
                                    Submitted for Admin Review
                                </h3>
                                <p className="text-sm text-blue-800 mt-1">
                                    This collection was submitted on{' '}
                                    <span className="font-bold">
                                        {collectionData.submittedAt ? new Date(collectionData.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'recently'}
                                    </span>.
                                    The administrator will verify and approve the entries. You may still make edits and save them before approval.
                                </p>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={handleAdminApprove}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap self-center"
                                >
                                    <CheckCircle2 size={15} />
                                    Approve Now
                                </button>
                            )}
                        </div>
                    )}

                    {/* Live Summary Bar & Actions */}
                    <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
                        <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
                                <div className="bg-slate-50/60 p-2.5 sm:p-0 sm:bg-transparent rounded-xl sm:rounded-none">
                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Total Collection
                                    </span>
                                    <span className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0F3B66] truncate block">
                                        ₹{liveStats.total.toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="bg-slate-50/60 p-2.5 sm:p-0 sm:bg-transparent rounded-xl sm:rounded-none">
                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Receipts Used
                                    </span>
                                    <span className="text-xl sm:text-2xl lg:text-3xl font-black text-[#1E5FA8] truncate block">
                                        {liveStats.activeCount} <span className="text-xs sm:text-sm font-semibold text-slate-400">/ {receipts.length}</span>
                                    </span>
                                </div>
                                <div className="bg-slate-50/60 p-2.5 sm:p-0 sm:bg-transparent rounded-xl sm:rounded-none">
                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Cancelled
                                    </span>
                                    <span className="text-xl sm:text-2xl lg:text-3xl font-black text-rose-600 truncate block">
                                        {liveStats.cancelledCount}
                                    </span>
                                </div>
                                <div className="bg-slate-50/60 p-2.5 sm:p-0 sm:bg-transparent rounded-xl sm:rounded-none">
                                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Average / Receipt
                                    </span>
                                    <span className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-700 truncate block">
                                        ₹{liveStats.avg.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>

                            {/* Mobile Progress Bar */}
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className="bg-gradient-to-r from-[#1E5FA8] to-emerald-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${liveStats.progressPercent}%` }}
                                    title={`${liveStats.progressPercent}% Completed`}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {hasUnsavedChanges && (
                                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 animate-pulse">
                                    Unsaved Changes
                                </span>
                            )}

                            {/* View Audit Trail */}
                            <button
                                onClick={() => setShowAuditHistory(!showAuditHistory)}
                                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                                title="View activity and approval history"
                            >
                                <History size={15} />
                                {showAuditHistory ? 'Hide History' : 'History'}
                            </button>

                            {/* Save Draft Button */}
                            {!isLocked && (
                                <button
                                    onClick={handleSaveDraft}
                                    disabled={saving || submitting}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#0F3B66] font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Save size={15} />
                                    {saving ? 'Saving...' : 'Save Draft'}
                                </button>
                            )}

                            {/* Submit for Approval Button */}
                            {!isLocked && (
                                <button
                                    onClick={handleSubmitForApproval}
                                    disabled={saving || submitting}
                                    className="px-5 py-2.5 bg-[#1E5FA8] hover:bg-[#0F3B66] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Send size={15} />
                                    {submitting ? 'Submitting...' : 'Submit for Approval'}
                                </button>
                            )}

                            {/* Admin Overrides */}
                            {isAdmin && (
                                <div className="flex items-center gap-2">
                                    {collectionData.status !== 'APPROVED' && (
                                        <button
                                            onClick={handleAdminApprove}
                                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                                        >
                                            <CheckCircle2 size={15} />
                                            Admin Approve
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Audit History Timeline (Collapsible) */}
                    {showAuditHistory && (
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                            <h3 className="text-base font-bold text-[#0F3B66] flex items-center gap-2">
                                <History size={18} className="text-[#1E5FA8]" />
                                Activity & Approval Audit Trail for Book #{selectedBookNumber}
                            </h3>

                            {collectionData.history && collectionData.history.length > 0 ? (
                                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-100">
                                    {collectionData.history.slice().reverse().map((event, idx) => (
                                        <div key={idx} className="relative flex items-start gap-4 pl-8">
                                            <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#1E5FA8]" />
                                            <div className="bg-slate-50 rounded-2xl p-3 flex-1 border border-slate-100">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <span className="text-xs font-bold text-[#0F3B66] uppercase tracking-wider">
                                                        {event.action} by {event.performerName || 'User'}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-slate-400">
                                                        {new Date(event.timestamp).toLocaleString('en-IN', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                {event.notes && (
                                                    <p className="text-xs text-slate-600 mt-1 font-medium">
                                                        {event.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No previous audit logs recorded.</p>
                            )}
                        </div>
                    )}

                    {/* 2. Collection Entry Section */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        
                        {/* Controls Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 bg-slate-50/50">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <h3 className="font-bold text-[#0F3B66] text-sm sm:text-base">
                                        Receipts #{collectionData.startPage} – #{collectionData.endPage}
                                    </h3>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                        {filteredReceipts.length}
                                    </span>
                                </div>

                                {/* View Switcher (Visible on mobile/tablet) */}
                                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 md:hidden">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('cards')}
                                        className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                            viewMode === 'cards' ? 'bg-[#1E5FA8] text-white shadow-sm' : 'text-slate-500'
                                        }`}
                                        title="Cards View"
                                    >
                                        <LayoutGrid size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('table')}
                                        className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                            viewMode === 'table' ? 'bg-[#1E5FA8] text-white shadow-sm' : 'text-slate-500'
                                        }`}
                                        title="Table View"
                                    >
                                        <List size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                                {/* Search Filter */}
                                <div className="relative flex-1 sm:w-60">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search receipt # or remarks..."
                                        value={searchFilter}
                                        onChange={(e) => setSearchFilter(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 sm:py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    {/* Filter cancelled */}
                                    <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={filterCancelledOnly}
                                            onChange={(e) => setFilterCancelledOnly(e.target.checked)}
                                            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                                        />
                                        Cancelled Only
                                    </label>

                                    {/* View Switcher (Desktop) */}
                                    <div className="hidden md:flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('table')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                viewMode === 'table' ? 'bg-[#1E5FA8] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            <List size={13} />
                                            Table
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('cards')}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                viewMode === 'cards' ? 'bg-[#1E5FA8] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                                            }`}
                                        >
                                            <LayoutGrid size={13} />
                                            Cards
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* View Mode 1: Mobile-Optimized Card Grid */}
                        {viewMode === 'cards' ? (
                            <div className="p-3 sm:p-5 bg-slate-50/40">
                                {filteredReceipts.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 font-medium">
                                        No receipts match the search query.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {filteredReceipts.map((r) => {
                                            const originalIndex = receipts.findIndex(item => item.receiptNumber === r.receiptNumber);
                                            const isCancelled = r.isCancelled;

                                            return (
                                                <div 
                                                    key={r.receiptNumber}
                                                    className={`p-3.5 rounded-2xl border transition-all ${
                                                        isCancelled 
                                                            ? 'bg-rose-50/60 border-rose-200 text-slate-400' 
                                                            : r.amount > 0 
                                                                ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-100' 
                                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2 mb-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-[#0F3B66] text-white shadow-xs">
                                                                #{r.receiptNumber}
                                                            </span>
                                                            {isCancelled ? (
                                                                <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-lg">
                                                                    Void
                                                                </span>
                                                            ) : r.amount > 0 ? (
                                                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                                                                    <Check size={11} /> Entered
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                                                                    Pending
                                                                </span>
                                                            )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            disabled={isLocked}
                                                            onClick={() => toggleCancelled(originalIndex)}
                                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                                                isCancelled
                                                                    ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                                                    : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600'
                                                            } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                                                        >
                                                            {isCancelled ? 'Restore' : 'Void'}
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="relative">
                                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                                                ₹
                                                            </span>
                                                            <input
                                                                ref={(el) => (inputRefs.current[originalIndex] = el)}
                                                                type="text"
                                                                inputMode="numeric"
                                                                disabled={isLocked || isCancelled}
                                                                value={r.amount === 0 ? '' : r.amount}
                                                                placeholder="0"
                                                                onChange={(e) => handleAmountChange(originalIndex, e.target.value)}
                                                                onKeyDown={(e) => handleKeyDown(e, originalIndex)}
                                                                className={`w-full text-right font-black pl-8 pr-3 py-2.5 rounded-xl text-lg sm:text-base transition-all ${
                                                                    isLocked || isCancelled
                                                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                                        : 'bg-slate-50 border border-slate-200 text-[#0F3B66] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]'
                                                                }`}
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <input
                                                                type="text"
                                                                disabled={isLocked || isCancelled}
                                                                placeholder={isCancelled ? 'Void / Cancelled' : 'Remarks / Mode (Cash, GPay...)'}
                                                                value={r.remarks || ''}
                                                                onChange={(e) => handleFieldChange(originalIndex, 'remarks', e.target.value)}
                                                                className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                                                                    isLocked || isCancelled
                                                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                                        : 'bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]'
                                                                }`}
                                                            />

                                                            {/* Quick Payment Mode Preset Chips for Field Envoy */}
                                                            {!isLocked && !isCancelled && (
                                                                <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto scrollbar-none">
                                                                    {['Cash', 'UPI / GPay', 'Cheque'].map(chip => {
                                                                        const isChipActive = r.remarks === chip;
                                                                        return (
                                                                            <button
                                                                                key={chip}
                                                                                type="button"
                                                                                onClick={() => handleFieldChange(originalIndex, 'remarks', isChipActive ? '' : chip)}
                                                                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap ${
                                                                                    isChipActive
                                                                                        ? 'bg-[#1E5FA8] text-white border-[#1E5FA8] shadow-xs'
                                                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                                                }`}
                                                                            >
                                                                                {chip === 'Cash' ? 'Cash' : chip === 'UPI / GPay' ? 'UPI / GPay' : ' Cheque'}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* View Mode 2: Standard Desktop Table */
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="py-3 px-4 w-24 text-center">Receipt #</th>
                                            <th className="py-3 px-4 w-52 text-right">Amount (₹)</th>
                                            <th className="py-3 px-4">Remarks / Mode</th>
                                            <th className="py-3 px-4 w-28 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {filteredReceipts.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                                                    No receipts match the search query.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredReceipts.map((r) => {
                                                const originalIndex = receipts.findIndex(item => item.receiptNumber === r.receiptNumber);
                                                const isCancelled = r.isCancelled;

                                                return (
                                                    <tr 
                                                        key={r.receiptNumber}
                                                        className={`transition-colors ${
                                                            isCancelled 
                                                                ? 'bg-rose-50/50 text-slate-400' 
                                                                : r.amount > 0 
                                                                    ? 'bg-blue-50/20 hover:bg-blue-50/40' 
                                                                    : 'hover:bg-slate-50/60'
                                                        }`}
                                                    >
                                                        {/* Receipt # */}
                                                        <td className="py-2.5 px-4 text-center font-black text-[#0F3B66]">
                                                            #{r.receiptNumber}
                                                        </td>

                                                        {/* Amount Entry */}
                                                        <td className="py-2.5 px-4 text-right">
                                                            <div className="relative inline-block w-full">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                                                    ₹
                                                                </span>
                                                                <input
                                                                    ref={(el) => (inputRefs.current[originalIndex] = el)}
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    disabled={isLocked || isCancelled}
                                                                    value={r.amount === 0 ? '' : r.amount}
                                                                    placeholder="0"
                                                                    onChange={(e) => handleAmountChange(originalIndex, e.target.value)}
                                                                    onKeyDown={(e) => handleKeyDown(e, originalIndex)}
                                                                    className={`w-full text-right font-black pl-6 pr-3 py-2 rounded-xl text-sm transition-all ${
                                                                        isLocked || isCancelled
                                                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                                            : 'bg-white border border-slate-200 text-[#0F3B66] focus:outline-none focus:ring-2 focus:ring-[#1E5FA8] focus:border-[#1E5FA8] shadow-sm'
                                                                    }`}
                                                                />
                                                            </div>
                                                        </td>

                                                        {/* Remarks */}
                                                        <td className="py-2.5 px-4">
                                                            <div className="space-y-1">
                                                                <input
                                                                    type="text"
                                                                    disabled={isLocked || isCancelled}
                                                                    placeholder={isCancelled ? 'Void / Cancelled' : 'e.g. Cash / UPI / Cheque / Remarks'}
                                                                    value={r.remarks || ''}
                                                                    onChange={(e) => handleFieldChange(originalIndex, 'remarks', e.target.value)}
                                                                    className={`w-full px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                                                        isLocked || isCancelled
                                                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                                            : 'bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E5FA8] focus:border-[#1E5FA8]'
                                                                    }`}
                                                                />
                                                                {!isLocked && !isCancelled && (
                                                                    <div className="flex items-center gap-1 pt-0.5 overflow-x-auto scrollbar-none">
                                                                        {['Cash', 'UPI / GPay', 'Cheque'].map(chip => {
                                                                            const isChipActive = r.remarks === chip;
                                                                            return (
                                                                                <button
                                                                                    key={chip}
                                                                                    type="button"
                                                                                    onClick={() => handleFieldChange(originalIndex, 'remarks', isChipActive ? '' : chip)}
                                                                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap ${
                                                                                        isChipActive
                                                                                            ? 'bg-[#1E5FA8] text-white border-[#1E5FA8] shadow-xs'
                                                                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                                                    }`}
                                                                                >
                                                                                    {chip === 'Cash' ? 'Cash' : chip === 'UPI / GPay' ? 'UPI / GPay' : ' Cheque'}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Cancelled Toggle */}
                                                        <td className="py-2.5 px-4 text-center">
                                                            <button
                                                                type="button"
                                                                disabled={isLocked}
                                                                onClick={() => toggleCancelled(originalIndex)}
                                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                                                    isCancelled
                                                                        ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                                } ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                                                            >
                                                                {isCancelled ? 'Cancelled' : 'Active'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Fast Keyboard Hint Footer */}
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 px-4 gap-1">
                            <span className="hidden sm:inline">
                                💡 <strong>Tip:</strong> Press <strong>Enter</strong> or <strong>Down Arrow</strong> to quickly jump to the next receipt amount.
                            </span>
                            <span className="font-bold text-[#0F3B66] text-xs sm:text-[11px]">
                                Current Book Total: ₹{liveStats.total.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>

                    {/* Fixed Bottom Save & Submit Bar - ALWAYS VISIBLE across all screen sizes and scroll positions */}
                    {!isLocked ? (
                        <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(15,59,102,0.12)] px-3 sm:px-6 py-2.5 sm:py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => navigate(isAdmin ? '/' : '/field-data')}
                                        className="p-2 text-slate-400 hover:text-[#0F3B66] hover:bg-slate-100 rounded-xl transition-colors shrink-0"
                                        title="Back to Dashboard"
                                        aria-label="Back to Dashboard"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                                                Book #{selectedBookNumber}
                                            </span>
                                            {hasUnsavedChanges && (
                                                <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-md animate-pulse shrink-0">
                                                    Unsaved
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-base sm:text-xl font-black text-[#0F3B66] leading-none block">
                                            ₹{liveStats.total.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <span className="hidden sm:inline-block text-xs font-bold px-2.5 py-1 rounded-xl bg-blue-50 text-[#1E5FA8] border border-blue-100 whitespace-nowrap">
                                        {liveStats.activeCount} / {receipts.length} entered ({liveStats.progressPercent}%)
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={handleSaveDraft}
                                        disabled={saving || submitting}
                                        className={`px-3.5 sm:px-5 py-2.5 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                                            hasUnsavedChanges 
                                                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' 
                                                : 'bg-slate-100 hover:bg-slate-200 text-[#0F3B66]'
                                        }`}
                                    >
                                        <Save size={15} />
                                        <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                                    </button>
                                    <button
                                        onClick={handleSubmitForApproval}
                                        disabled={saving || submitting}
                                        className="px-4 sm:px-5 py-2.5 bg-[#1E5FA8] hover:bg-[#0F3B66] text-white font-bold text-xs rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                                    >
                                        <Send size={15} />
                                        <span>{submitting ? 'Submitting...' : 'Submit to Admin'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* When Locked: Fixed bar indicating approval status */
                        <div className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_25px_rgba(15,59,102,0.12)] px-4 py-2.5 sm:py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <button
                                        type="button"
                                        onClick={() => navigate(isAdmin ? '/' : '/field-data')}
                                        className="p-2 text-slate-400 hover:text-[#0F3B66] hover:bg-slate-100 rounded-xl transition-colors"
                                        title="Back"
                                        aria-label="Back"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                        <span className="text-xs font-bold text-emerald-800">Approved & Locked</span>
                                        <span className="text-sm font-black text-[#0F3B66]">₹{liveStats.total.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={handleAdminReopen}
                                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                                    >
                                        <Unlock size={14} />
                                        Reopen Book
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            )}

        </div>
    );
}
