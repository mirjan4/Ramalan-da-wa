import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ShieldCheck, CheckCircle2, Clock, AlertTriangle, Eye, 
    Unlock, Check, Search, Filter, RefreshCw, BookOpen, 
    ArrowUpRight, X, Calendar, User, FileText, ChevronRight
} from 'lucide-react';
import { teamCollectionService, seasonService } from '../services/api';
import { MySwal, confirmAction } from '../utils/swal';

export default function CollectionApprovals() {
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState('');
    
    // Filters
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Inspection Modal State
    const [inspectingItem, setInspectingItem] = useState(null);
    const [inspectModalOpen, setInspectModalOpen] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedSeasonId) {
            fetchSubmissions();
        }
    }, [selectedSeasonId, statusFilter]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const seasonRes = await seasonService.getAll();
            const seasonList = seasonRes.data || [];
            setSeasons(seasonList);

            const active = seasonList.find(s => s.status === 'ACTIVE') || seasonList[0];
            if (active) {
                setSelectedSeasonId(active._id);
            }
        } catch (err) {
            console.error('Error loading seasons:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const params = { seasonId: selectedSeasonId };
            if (statusFilter !== 'ALL') {
                params.status = statusFilter;
            }
            const res = await teamCollectionService.getAdminSubmissions(params);
            setSubmissions(res.data || []);
        } catch (err) {
            console.error('Error fetching submissions:', err);
            MySwal.fire('Error', err.response?.data?.message || 'Failed to load submissions', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Admin Action: Approve Collection
    const handleApprove = async (submission) => {
        const confirmed = await confirmAction({
            title: `Approve ${submission.team?.placeName} Book #${submission.bookNumber}?`,
            text: `This will verify ₹${submission.totalCollected.toLocaleString('en-IN')} (${submission.receiptCount} receipts) and automatically sync it with the Team Settlement records.`,
            confirmText: 'Yes, Approve & Sync',
            variant: 'success'
        });

        if (!confirmed) return;

        try {
            await teamCollectionService.approveSubmission(submission._id, {
                adminRemarks: 'Verified and approved by admin'
            });
            MySwal.fire('Approved!', `Book #${submission.bookNumber} approved and synced.`, 'success');
            if (inspectModalOpen && inspectingItem?._id === submission._id) {
                setInspectModalOpen(false);
            }
            fetchSubmissions();
        } catch (err) {
            console.error('Error approving submission:', err);
            MySwal.fire('Error', err.response?.data?.message || 'Failed to approve', 'error');
        }
    };

    // Admin Action: Reopen for Editing
    const handleReopen = async (submission) => {
        const { value: reason } = await MySwal.fire({
            title: `Reopen Book #${submission.bookNumber} for Editing?`,
            input: 'textarea',
            inputLabel: 'Reason for Reopening (sent to team)',
            inputPlaceholder: 'e.g. Please check receipts #10 to #15 and verify amounts against counterfoils...',
            showCancelButton: true,
            confirmButtonText: 'Reopen Book',
            confirmButtonColor: '#E65100',
            inputValidator: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please provide a reason so the team knows what needs revision!';
                }
            }
        });

        if (reason) {
            try {
                await teamCollectionService.reopenSubmission(submission._id, { reason });
                MySwal.fire('Reopened!', 'The team has been granted permission to edit and resubmit.', 'success');
                if (inspectModalOpen && inspectingItem?._id === submission._id) {
                    setInspectModalOpen(false);
                }
                fetchSubmissions();
            } catch (err) {
                console.error('Error reopening submission:', err);
                MySwal.fire('Error', err.response?.data?.message || 'Failed to reopen', 'error');
            }
        }
    };

    // Inspect Details Modal
    const handleOpenInspect = (submission) => {
        setInspectingItem(submission);
        setInspectModalOpen(true);
    };

    // Filter by search query
    const filteredSubmissions = useMemo(() => {
        if (!searchQuery.trim()) return submissions;
        const q = searchQuery.toLowerCase();
        return submissions.filter(s => 
            (s.team?.placeName && s.team.placeName.toLowerCase().includes(q)) ||
            (s.team?.state && s.team.state.toLowerCase().includes(q)) ||
            String(s.bookNumber).includes(q) ||
            String(s.totalCollected).includes(q)
        );
    }, [submissions, searchQuery]);

    // Metrics
    const metrics = useMemo(() => {
        const pendingCount = submissions.filter(s => s.status === 'SUBMITTED').length;
        const approvedCount = submissions.filter(s => s.status === 'APPROVED').length;
        const reopenedCount = submissions.filter(s => s.status === 'REOPENED').length;
        const totalAmount = submissions.reduce((sum, s) => sum + (s.totalCollected || 0), 0);
        return { pendingCount, approvedCount, reopenedCount, totalAmount };
    }, [submissions]);

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        Approved & Synced
                    </span>
                );
            case 'SUBMITTED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                        <Clock size={13} className="text-blue-600" />
                        Pending Review
                    </span>
                );
            case 'REOPENED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle size={13} className="text-amber-600" />
                        Reopened
                    </span>
                );
            case 'DRAFT':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Draft
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            
            {/* Header Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#E6F0FA]/60 to-transparent rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 sm:p-3 bg-[#E6F0FA] rounded-xl sm:rounded-2xl text-[#1E5FA8] shadow-sm shrink-0">
                                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0F3B66] tracking-tight">
                                    Team Collection Approvals
                                </h1>
                                <p className="text-xs sm:text-sm font-medium text-slate-500">
                                    Review, verify, and approve team receipt book collection entries with automatic settlement synchronization.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Season Selector */}
                    <div className="flex items-center gap-2 sm:gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 self-stretch md:self-auto justify-between sm:justify-start">
                        <span className="text-xs font-bold text-slate-500 uppercase px-1">Season:</span>
                        <select
                            value={selectedSeasonId}
                            onChange={(e) => setSelectedSeasonId(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-[#0F3B66] focus:outline-none focus:ring-2 focus:ring-[#1E5FA8]"
                        >
                            {seasons.map(s => (
                                <option key={s._id} value={s._id}>
                                    {s.name} ({s.year}) {s.status === 'ACTIVE' ? '★ Active' : ''}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={fetchSubmissions}
                            className="p-1.5 sm:p-2 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
                            title="Refresh Submissions"
                        >
                            <RefreshCw size={15} />
                        </button>
                    </div>
                </div>

                {/* Metric Summary Strips */}
                <div className="mt-5 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Review</span>
                        <span className="text-xl sm:text-2xl lg:text-3xl font-black text-blue-600">{metrics.pendingCount}</span>
                    </div>
                    <div className="p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Approved & Locked</span>
                        <span className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600">{metrics.approvedCount}</span>
                    </div>
                    <div className="p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Reopened</span>
                        <span className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-600">{metrics.reopenedCount}</span>
                    </div>
                    <div className="p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Recorded</span>
                        <span className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0F3B66]">
                            ₹{metrics.totalAmount.toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 overflow-x-auto">
                    {[
                        { key: 'ALL', label: 'All' },
                        { key: 'SUBMITTED', label: 'Pending Review' },
                        { key: 'APPROVED', label: 'Approved' },
                        { key: 'REOPENED', label: 'Reopened' },
                        { key: 'DRAFT', label: 'Drafts' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                statusFilter === tab.key
                                    ? 'bg-[#1E5FA8] text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-72">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search team or book number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1E5FA8] shadow-sm"
                    />
                </div>
            </div>

            {/* Submissions List Container */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                
                {loading ? (
                    <div className="py-12 text-center text-slate-400">
                        <div className="w-8 h-8 border-3 border-[#1E5FA8] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading submissions...
                    </div>
                ) : filteredSubmissions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-medium">
                        No team submissions found matching current criteria.
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View (md and up) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-3.5 px-6">Team & State</th>
                                        <th className="py-3.5 px-4 text-center">Book & Range</th>
                                        <th className="py-3.5 px-4 text-right">Total Collection</th>
                                        <th className="py-3.5 px-4 text-center">Receipts</th>
                                        <th className="py-3.5 px-4">Submitted By</th>
                                        <th className="py-3.5 px-4 text-center">Status</th>
                                        <th className="py-3.5 px-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {filteredSubmissions.map((s) => (
                                        <tr key={s._id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="font-bold text-[#0F3B66]">
                                                    {s.team?.placeName || 'Unknown Team'}
                                                </div>
                                                <div className="text-xs text-slate-400 font-medium">
                                                    {s.team?.state || 'State'}
                                                </div>
                                            </td>

                                            <td className="py-4 px-4 text-center">
                                                <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-[#0F3B66] font-black text-xs inline-block">
                                                    Book #{s.bookNumber}
                                                </span>
                                                <div className="text-[11px] text-slate-400 mt-0.5">
                                                    #{s.startPage} – #{s.endPage}
                                                </div>
                                            </td>

                                            <td className="py-4 px-4 text-right">
                                                <span className="font-black text-[#0F3B66] text-base">
                                                    ₹{s.totalCollected.toLocaleString('en-IN')}
                                                </span>
                                            </td>

                                            <td className="py-4 px-4 text-center">
                                                <span className="font-bold text-slate-600">
                                                    {s.receiptCount}
                                                </span>
                                                <span className="text-xs text-slate-400"> / 50</span>
                                            </td>

                                            <td className="py-4 px-4">
                                                <div className="text-xs font-bold text-slate-700">
                                                    {s.submittedBy?.displayName || s.submittedBy?.username || 'Team Member'}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </div>
                                            </td>

                                            <td className="py-4 px-4 text-center">
                                                {renderStatusBadge(s.status)}
                                            </td>

                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleOpenInspect(s)}
                                                        className="p-2 hover:bg-[#E6F0FA] text-[#1E5FA8] rounded-xl transition-colors"
                                                        title="Inspect receipts breakdown"
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    {s.status === 'SUBMITTED' && (
                                                        <button
                                                            onClick={() => handleApprove(s)}
                                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1"
                                                            title="Approve and sync to team settlement"
                                                        >
                                                            <Check size={14} />
                                                            Approve
                                                        </button>
                                                    )}

                                                    {s.status === 'APPROVED' && (
                                                        <button
                                                            onClick={() => handleReopen(s)}
                                                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1"
                                                            title="Reopen book for team editing"
                                                        >
                                                            <Unlock size={14} />
                                                            Reopen
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => navigate(`/team-collection?teamId=${s.team?._id}&book=${s.bookNumber}`)}
                                                        className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-colors"
                                                        title="Open in Team Register"
                                                    >
                                                        <ArrowUpRight size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View (screens < md) */}
                        <div className="block md:hidden divide-y divide-slate-100">
                            {filteredSubmissions.map((s) => (
                                <div key={s._id} className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h4 className="font-bold text-[#0F3B66] text-base leading-snug">
                                                {s.team?.placeName || 'Unknown Team'}
                                            </h4>
                                            <span className="text-xs text-slate-400 font-medium">{s.team?.state}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[#0F3B66] font-black text-xs">
                                                Book #{s.bookNumber}
                                            </span>
                                            {renderStatusBadge(s.status)}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Collected</span>
                                            <span className="text-lg font-black text-[#0F3B66]">
                                                ₹{s.totalCollected.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Receipts</span>
                                            <span className="text-sm font-bold text-slate-700">
                                                {s.receiptCount} <span className="text-xs text-slate-400">/ 50</span>
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-slate-500 flex items-center justify-between">
                                        <span>
                                            By: <strong className="text-slate-700">{s.submittedBy?.displayName || s.submittedBy?.username || 'Team'}</strong>
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <button
                                            onClick={() => handleOpenInspect(s)}
                                            className="flex-1 py-2 bg-[#E6F0FA] text-[#1E5FA8] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <Eye size={14} />
                                            Inspect
                                        </button>

                                        {s.status === 'SUBMITTED' && (
                                            <button
                                                onClick={() => handleApprove(s)}
                                                className="flex-1 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                                            >
                                                <Check size={14} />
                                                Approve
                                            </button>
                                        )}

                                        {s.status === 'APPROVED' && (
                                            <button
                                                onClick={() => handleReopen(s)}
                                                className="flex-1 py-2 bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                                            >
                                                <Unlock size={14} />
                                                Reopen
                                            </button>
                                        )}

                                        <button
                                            onClick={() => navigate(`/team-collection?teamId=${s.team?._id}&book=${s.bookNumber}`)}
                                            className="p-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors"
                                            title="Open in Team Register"
                                        >
                                            <ArrowUpRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

            </div>

            {/* Inspection Breakdown Modal */}
            {inspectModalOpen && inspectingItem && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
                    <div className="bg-white rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Modal Header */}
                        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base sm:text-xl font-black text-[#0F3B66]">
                                        {inspectingItem.team?.placeName} — Book #{inspectingItem.bookNumber}
                                    </h2>
                                    {renderStatusBadge(inspectingItem.status)}
                                </div>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                                    Receipts #{inspectingItem.startPage} to #{inspectingItem.endPage} • Season: {inspectingItem.season?.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setInspectModalOpen(false)}
                                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Stats Bar */}
                        <div className="p-3 sm:px-6 sm:py-4 bg-white border-b border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Amount</span>
                                <span className="text-base sm:text-xl font-black text-[#0F3B66]">
                                    ₹{inspectingItem.totalCollected.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Active Receipts</span>
                                <span className="text-base sm:text-xl font-black text-[#1E5FA8]">
                                    {inspectingItem.receiptCount} <span className="text-xs text-slate-400">/ 50</span>
                                </span>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Submitted By</span>
                                <span className="text-xs sm:text-sm font-bold text-slate-700 truncate block">
                                    {inspectingItem.submittedBy?.displayName || inspectingItem.submittedBy?.username || 'Team'}
                                </span>
                            </div>
                        </div>

                        {/* Receipts Scrollable Table */}
                        <div className="p-3 sm:p-6 overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                                        <th className="py-2.5 px-3 w-20 sm:w-24 text-center">Receipt #</th>
                                        <th className="py-2.5 px-3 text-right w-28 sm:w-36">Amount (₹)</th>
                                        <th className="py-2.5 px-3">Remarks / Mode</th>
                                        <th className="py-2.5 px-3 text-center w-24 sm:w-28">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(inspectingItem.receipts || []).map((r) => (
                                        <tr key={r.receiptNumber} className={r.isCancelled ? 'bg-rose-50/40 text-slate-400' : r.amount > 0 ? 'bg-blue-50/20' : ''}>
                                            <td className="py-2 px-3 text-center font-black text-[#0F3B66]">
                                                #{r.receiptNumber}
                                            </td>
                                            <td className="py-2 px-3 text-right font-black text-slate-800">
                                                {r.isCancelled ? '—' : `₹${r.amount.toLocaleString('en-IN')}`}
                                            </td>
                                            <td className="py-2 px-3 text-slate-600">
                                                {r.remarks || '—'}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                {r.isCancelled ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                                                        Cancelled
                                                    </span>
                                                ) : r.amount > 0 ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                                        Entered
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">Blank</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer with Actions */}
                        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                            <button
                                onClick={() => setInspectModalOpen(false)}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-100 text-center"
                            >
                                Close
                            </button>

                            <div className="flex items-center gap-2">
                                {inspectingItem.status === 'APPROVED' ? (
                                    <button
                                        onClick={() => handleReopen(inspectingItem)}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <Unlock size={14} />
                                        Reopen for Editing
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleApprove(inspectingItem)}
                                        className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <Check size={14} />
                                        Approve & Sync Settlement
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
