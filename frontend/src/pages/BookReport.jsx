import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamService, seasonService } from '../services/api';
import {
    BookOpen, Filter, Search, Download, Printer, BookPlus,
    TrendingUp, CheckCircle2, AlertTriangle,
    Users, Layers, ChevronLeft, ChevronRight,
    ClipboardList, PieChart as PieChartIcon,
    ArrowUpDown, SortAsc, SortDesc
} from 'lucide-react';
import { MySwal } from '../utils/swal';
import ExportModal from '../components/ExportModal';

export default function BookReport() {
    const navigate = useNavigate();
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        teamId: '',
        status: 'all', // all, used, unused, completed
        searchPath: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFields, setExportFields] = useState([]);
    const [dynamicBankMeta, setDynamicBankMeta] = useState({ bankNames: [], hasUnallocatedBank: false });

    // Sorting
    const [sortConfig, setSortConfig] = useState({ key: 'bookNumber', direction: 'asc' });

    useEffect(() => {
        const init = async () => {
            try {
                const seasonRes = await seasonService.getAll();
                setSeasons(seasonRes.data);
                const active = seasonRes.data.find(s => s.isActive);
                if (active) setSelectedSeason(active._id);
            } catch (err) {
                console.error('Failed to fetch seasons:', err);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!selectedSeason) return;
        const fetchTeams = async () => {
            setLoading(true);
            try {
                const res = await teamService.getAll(selectedSeason);
                setTeams(res.data);
            } catch (err) {
                console.error('Failed to fetch teams:', err);
                MySwal.fire('Error', 'Failed to load report data', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, [selectedSeason]);

    // Transform teams into flattened book records
    const allBooks = useMemo(() => {
        const books = [];
        const bookNumberCounts = {};

        // First pass to count book numbers for conflict detection
        teams.forEach(team => {
            team.receiptBooks?.forEach(book => {
                const num = book.bookNumber.toString();
                bookNumberCounts[num] = (bookNumberCounts[num] || 0) + 1;
            });
        });

        teams.forEach(team => {
            if (team.receiptBooks) {
                const isSettled = team.isLocked; // team.isLocked is our audit settled source of truth

                team.receiptBooks.forEach(book => {
                    const collected = Number(book.collectedAmount) || 0;
                    const bookStart = Number(book.startPage) || (Number(book.bookNumber) * 50 - 49);
                    const bookEnd = Number(book.endPage) || (Number(book.bookNumber) * 50);
                    const totalPagesInBook = Math.max(0, bookEnd - bookStart + 1);

                    // When collection is 0, no pages are used (0 used, all remaining)
                    let usedPages = 0;
                    let remainingPages = totalPagesInBook;

                    if (collected > 0) {
                        const usedStart = Number(book.usedStartPage) || bookStart;
                        const usedEnd = Number(book.usedEndPage) || bookEnd;
                        if (usedStart > 0 && usedEnd >= usedStart) {
                            usedPages = Math.min(totalPagesInBook, Math.max(0, usedEnd - usedStart + 1));
                            remainingPages = Math.max(0, totalPagesInBook - usedPages);
                        }
                    }

                    let status = 'unused';
                    // 1. Conflict Check (highest priority for audit)
                    if (bookNumberCounts[String(book.bookNumber)] > 1) {
                        status = 'conflict';
                    }
                    // 2. Running Check (Team not yet settled)
                    else if (!isSettled) {
                        status = 'running';
                    }
                    // 3. Settled Logic
                    else {
                        if (collected <= 0 || usedPages === 0) {
                            status = 'unused';
                        } else if (remainingPages === 0) {
                            status = 'completed';
                        } else {
                            status = 'used';
                        }
                    }

                    const validBanks = Array.isArray(team.bankAccounts)
                        ? team.bankAccounts.filter(b => (b.bankName && b.bankName.trim()) || Number(b.amount) > 0)
                        : [];
                    const bankName = validBanks.length > 0
                        ? validBanks.map(b => b.bankName).filter(Boolean).join(', ')
                        : (team.bankRef ? team.bankRef.split('(')[0].trim() : (team.bankAmount > 0 ? 'Bank' : '-'));

                    books.push({
                        ...book,
                        teamName: String(team.placeName) + ', ' + String(team.state),
                        placeName: team.placeName,
                        state: team.state,
                        teamId: String(team._id),
                        bankName: bankName || '-',
                        bankAmount: Number(team.bankAmount) || 0,
                        usedPages,
                        remainingPages,
                        totalPages: totalPagesInBook,
                        collectedAmount: collected,
                        status
                    });
                });
            }
        });
        return books;
    }, [teams]);

    // Filter Logic
    const filteredBooks = useMemo(() => {
        return allBooks.filter(book => {
            const matchTeam = !filters.teamId || book.teamId === filters.teamId;
            const matchStatus = filters.status === 'all' || book.status === filters.status;
            const matchSearch = !filters.searchPath ||
                book.bookNumber.toString().includes(filters.searchPath) ||
                book.teamName.toLowerCase().includes(filters.searchPath.toLowerCase());

            return matchTeam && matchStatus && matchSearch;
        });
    }, [allBooks, filters]);

    // Sorting Logic
    const sortedBooks = useMemo(() => {
        const sortable = [...filteredBooks];
        if (sortConfig.key) {
            sortable.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Force numeric comparison for specific keys
                if (['bookNumber', 'collectedAmount', 'usedPages', 'remainingPages'].includes(sortConfig.key)) {
                    aVal = Number(aVal) || 0;
                    bVal = Number(bVal) || 0;
                } else if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortable;
    }, [filteredBooks, sortConfig]);

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <SortAsc size={14} className="text-indigo-400" />
            : <SortDesc size={14} className="text-indigo-400" />;
    };

    // Pagination
    const totalPages = Math.ceil(sortedBooks.length / itemsPerPage);
    const currentData = sortedBooks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Statistics
    const stats = useMemo(() => {
        const total = filteredBooks.length;
        const running = filteredBooks.filter(b => b.status === 'running').length;
        const used = filteredBooks.filter(b => b.status === 'used').length;
        const unused = filteredBooks.filter(b => b.status === 'unused').length;
        const completed = filteredBooks.filter(b => b.status === 'completed').length;
        const amount = filteredBooks.reduce((acc, b) => acc + (Number(b.collectedAmount) || 0), 0);
        const remaining = filteredBooks.reduce((acc, b) => acc + (Number(b.remainingPages) || 0), 0);
        const uniqueTeams = new Set(filteredBooks.map(b => b.teamId)).size;

        return { total, running, used, unused, completed, amount, remaining, uniqueTeams };
    }, [filteredBooks]);

    const handleOpenExportModal = () => {
        // Collect all distinct bank names from teams
        const bankNamesSet = new Set();
        teams.forEach(team => {
            if (Array.isArray(team.bankAccounts)) {
                team.bankAccounts.forEach(b => {
                    if (b.bankName && b.bankName.trim()) {
                        bankNamesSet.add(b.bankName.trim());
                    }
                });
            }
        });
        const bankNames = Array.from(bankNamesSet);

        const hasUnallocatedBank = teams.some(team => {
            const totalBank = Number(team.bankAmount) || 0;
            if (totalBank <= 0) return false;
            let allocated = 0;
            if (Array.isArray(team.bankAccounts)) {
                team.bankAccounts.forEach(b => {
                    if (b.bankName && bankNames.some(name => name.toLowerCase() === b.bankName.trim().toLowerCase())) {
                        allocated += (Number(b.amount) || 0);
                    }
                });
            }
            return (totalBank - allocated) > 0.01;
        });

        setDynamicBankMeta({ bankNames, hasUnallocatedBank });

        const fields = [
            { key: 'placeName', label: 'Team Name' },
            { key: 'state', label: 'State' },
            { key: 'bookNumber', label: 'Book Number' },
            { key: 'startPage', label: 'Start Page' },
            { key: 'endPage', label: 'End Page' },
            { key: 'usedPages', label: 'Used Pages' },
            { key: 'remainingPages', label: 'Remaining Pages' },
            { key: 'collectedAmount', label: 'Collected Amount' },
        ];

        bankNames.forEach((bName, idx) => {
            fields.push({
                key: `bank_${idx}`,
                label: bName
            });
        });

        if (hasUnallocatedBank) {
            fields.push({
                key: 'bank_other',
                label: 'Other Bank'
            });
        }

        fields.push({
            key: 'totalBank',
            label: 'Total Bank'
        });

        fields.push({
            key: 'status',
            label: 'Status'
        });

        setExportFields(fields);
        setShowExportModal(true);
    };

    const executeCSVExport = async (selectedKeys) => {
        if (!selectedKeys || selectedKeys.length === 0) return;

        const { bankNames, hasUnallocatedBank } = dynamicBankMeta;

        const allDefs = [
            { key: 'placeName', header: 'Team Name', getValue: (b) => `"${(b.placeName || '').replace(/"/g, '""')}"` },
            { key: 'state', header: 'State', getValue: (b) => `"${(b.state || '').replace(/"/g, '""')}"` },
            { key: 'bookNumber', header: 'Book Number', getValue: (b) => b.bookNumber },
            { key: 'startPage', header: 'Start Page', getValue: (b) => b.startPage },
            { key: 'endPage', header: 'End Page', getValue: (b) => b.endPage },
            { key: 'usedPages', header: 'Used Pages', getValue: (b) => b.usedPages },
            { key: 'remainingPages', header: 'Remaining', getValue: (b) => b.remainingPages },
            { key: 'collectedAmount', header: 'Collected', getValue: (b) => b.collectedAmount },
        ];

        bankNames.forEach((bName, idx) => {
            allDefs.push({
                key: `bank_${idx}`,
                header: bName,
                getValue: (b) => {
                    const team = teams.find(t => String(t._id) === String(b.teamId));
                    let amt = 0;
                    if (team && Array.isArray(team.bankAccounts)) {
                        team.bankAccounts.forEach(acc => {
                            if (acc.bankName && acc.bankName.trim().toLowerCase() === bName.toLowerCase()) {
                                amt += (Number(acc.amount) || 0);
                            }
                        });
                    }
                    return amt;
                }
            });
        });

        if (hasUnallocatedBank) {
            allDefs.push({
                key: 'bank_other',
                header: 'Other Bank',
                getValue: (b) => {
                    const team = teams.find(t => String(t._id) === String(b.teamId));
                    const totalBank = team ? (Number(team.bankAmount) || 0) : (Number(b.bankAmount) || 0);
                    let allocatedSum = 0;
                    if (team && Array.isArray(team.bankAccounts)) {
                        team.bankAccounts.forEach(acc => {
                            if (acc.bankName && bankNames.some(name => name.toLowerCase() === acc.bankName.trim().toLowerCase())) {
                                allocatedSum += (Number(acc.amount) || 0);
                            }
                        });
                    }
                    return Math.max(0, totalBank - allocatedSum);
                }
            });
        }

        allDefs.push({
            key: 'totalBank',
            header: 'Total Bank',
            getValue: (b) => {
                const team = teams.find(t => String(t._id) === String(b.teamId));
                return team ? (Number(team.bankAmount) || 0) : (Number(b.bankAmount) || 0);
            }
        });

        allDefs.push({
            key: 'status',
            header: 'Status',
            getValue: (b) => b.status.toUpperCase()
        });

        const activeDefs = allDefs.filter(d => selectedKeys.includes(d.key));
        const headers = activeDefs.map(d => `"${d.header.replace(/"/g, '""')}"`);

        const rows = sortedBooks.map(b => {
            return activeDefs.map(d => d.getValue(b));
        });

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `book_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        MySwal.fire({
            title: 'Audit Exported!',
            text: `Receipt book audit with ${activeDefs.length} fields exported successfully.`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    };

    const handlePrint = () => window.print();

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-emerald-50 text-[#10B981] border-emerald-100';
            case 'used': return 'bg-amber-50 text-[#F59E0B] border-amber-100';
            case 'unused': return 'bg-slate-50 text-slate-400 border-slate-100';
            case 'running': return 'bg-[#E6F0FA] text-[#1E5FA8] border-[#A3C4E8]';
            case 'conflict': return 'bg-rose-50 text-[#EF4444] border-rose-100';
            default: return 'bg-slate-50 text-slate-400 border-slate-100';
        }
    };

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen">
            {/* Header Area */}
            <div id="report-summary" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8 print:hidden">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 bg-[#1E5FA8] text-white rounded-2xl shadow-lg shrink-0">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-[#0F3B66] tracking-tight">Receipt Book Report</h1>
                        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 sm:mt-1">Record of book assignments and utilization</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                        onClick={handleOpenExportModal}
                        className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs sm:text-sm px-4 py-2 sm:py-2.5"
                    >
                        <Download size={16} />
                        <span>Export Audit</span>
                    </button>
                    <button
                        onClick={() => navigate('/assign-book')}
                        className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2 text-xs sm:text-sm px-4 py-2 sm:py-2.5"
                    >
                        <BookPlus size={16} />
                        <span>Assign Books</span>
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="grid grid-cols-1 gap-6 mb-8 print:hidden">
                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-slate-400 font-black text-xs uppercase tracking-widest">
                        <Filter size={14} /> Advanced Filters
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Season Selector */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reporting Season</label>
                            <select
                                value={selectedSeason}
                                onChange={(e) => setSelectedSeason(e.target.value)}
                                className="input-field"
                            >
                                {seasons.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} {s.isActive ? '(Active)' : ''}</option>
                                ))}
                            </select>
                        </div>

                        {/* Team Filter */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Team Filter</label>
                            <select
                                value={filters.teamId}
                                onChange={(e) => setFilters({ ...filters, teamId: e.target.value })}
                                className="input-field"
                            >
                                <option value="">All Field Units</option>
                                {teams.map(t => (
                                    <option key={t._id} value={t._id}>{t.placeName}, {t.state}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Audit Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="input-field"
                            >
                                <option value="all">All Books</option>
                                <option value="running">🔄 Running</option>
                                <option value="unused">⚪ Unused</option>
                                <option value="used">🟡 Partial</option>
                                <option value="completed">🟢 Complete</option>
                            </select>
                        </div>

                        {/* Search */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identity Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Book # or Team..."
                                    value={filters.searchPath}
                                    onChange={(e) => setFilters({ ...filters, searchPath: e.target.value })}
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-10">
                <div className="bg-white p-5 rounded-2xl border-l-4 border-l-[#1E5FA8] shadow-sm hover:shadow-md transition-all group">
                    <p className="text-2xl font-black text-[#0F3B66] leading-none">{stats.total}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <BookOpen size={12} className="text-[#1E5FA8]" /> Total Audit Book
                    </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border-l-4 border-l-[#10B981] shadow-sm hover:shadow-md transition-all group">
                    <p className="text-2xl font-black text-[#0F3B66] leading-none">{stats.completed}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-[#10B981]" /> Fully Completed
                    </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border-l-4 border-l-[#F59E0B] shadow-sm hover:shadow-md transition-all group">
                    <p className="text-2xl font-black text-[#0F3B66] leading-none">{stats.used}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <Layers size={12} className="text-[#F59E0B]" /> Partially Used
                    </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border-l-4 border-l-[#1E5FA8]/30 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-slate-400">₹</span>
                        <p className="text-2xl font-black text-[#0F3B66] leading-none">{stats.amount.toLocaleString()}</p>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <TrendingUp size={12} className="text-[#1E5FA8]" /> Total Collection
                    </p>
                </div>
            </div>

            {/* Main Table Section */}
            <div id="report-table" className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative mb-8 print:border-none print:shadow-none">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-[#0F3B66] text-white text-[10px] uppercase font-bold tracking-widest">
                                <th className="px-6 py-4 cursor-pointer hover:bg-[#1E5FA8] transition-colors group" onClick={() => handleSort('teamName')}>
                                    <div className="flex items-center gap-2">
                                        Field Unit {renderSortIcon('teamName')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:bg-[#1E5FA8] transition-colors group" onClick={() => handleSort('bookNumber')}>
                                    <div className="flex items-center gap-2">
                                        Book Identifier {renderSortIcon('bookNumber')}
                                    </div>
                                </th>
                                <th className="px-6 py-4">Page Range</th>
                                <th className="px-6 py-4 text-center cursor-pointer hover:bg-[#1E5FA8] transition-colors group" onClick={() => handleSort('usedPages')}>
                                    <div className="flex items-center justify-center gap-2">
                                        Used {renderSortIcon('usedPages')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center cursor-pointer hover:bg-[#1E5FA8] transition-colors group" onClick={() => handleSort('remainingPages')}>
                                    <div className="flex items-center justify-center gap-2">
                                        Unused {renderSortIcon('remainingPages')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-right cursor-pointer hover:bg-[#1E5FA8] transition-colors group" onClick={() => handleSort('collectedAmount')}>
                                    <div className="flex items-center justify-end gap-2">
                                        Net Collection {renderSortIcon('collectedAmount')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-center">Audit Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 border-4 border-[#1E5FA8] border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-4">Generating Audit Data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : currentData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <AlertTriangle className="mx-auto text-slate-200 mb-4" size={48} />
                                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No matching book records found</p>
                                    </td>
                                </tr>
                            ) : currentData.map((book, idx) => (
                                <tr key={`${book.teamId}-${book.bookNumber}-${idx}`} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800">{book.teamName}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Assigned Unit</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono font-black text-[#1E5FA8] bg-[#E6F0FA] px-2 py-1 rounded text-sm">#{book.bookNumber}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600 font-bold text-xs bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg w-fit">
                                            <span>{book.startPage}</span>
                                            <span className="text-slate-300">→</span>
                                            <span>{book.endPage}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-black text-sm ${book.usedPages > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                            {book.usedPages}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-black text-sm ${book.remainingPages < book.totalPages ? 'text-[#1E5FA8]' : 'text-slate-300'}`}>
                                            {book.remainingPages}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <p className={`font-black text-sm ${Number(book.collectedAmount) > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                            ₹ {(Number(book.collectedAmount) || 0).toLocaleString()}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black border uppercase tracking-wider ${getStatusColor(book.status)}`}>
                                            {book.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {sortedBooks.length > itemsPerPage && (
                    <div className="p-4 sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
                        <p className="text-xs text-slate-500 font-bold text-center sm:text-left">
                            Showing <span className="text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, sortedBooks.length)}</span> of <span className="text-slate-900">{sortedBooks.length}</span> results
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 hover:bg-[#E6F0FA] transition-all"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex items-center px-3 sm:px-4 font-black text-xs text-[#1E5FA8]">
                                Page {currentPage} of {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 hover:bg-[#E6F0FA] transition-all"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Audit Footnote */}
            <div className="text-center pb-12 print:mt-10">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                    <PieChartIcon size={12} /> Institutional Audit Record • Generated by Ramalan Da‘wa Systems
                </p>
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                @media print {
                    @page { margin: 20mm; }
                    body { background: white; }
                    .h-\\[100dvh\\] { height: auto !important; overflow: visible !important; }
                    .overflow-y-auto { overflow: visible !important; }
                    .max-w-4xl { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
                    /* Force colors to print */
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}} />

            {/* Field Selection Export Modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={executeCSVExport}
                fields={exportFields}
                title="Export Data"
                description="Choose which fields to include in the export. All fields are selected by default."
                exportFormat="CSV"
            />
        </div>
    );
}
