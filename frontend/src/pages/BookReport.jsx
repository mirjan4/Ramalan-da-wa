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
                team.receiptBooks.forEach(book => {
                    const usedPages = (book.usedEndPage && book.usedStartPage)
                        ? (Number(book.usedEndPage) - Number(book.usedStartPage) + 1) : 0;
                    const totalPagesInBook = (book.endPage - book.startPage + 1);
                    const remainingPages = totalPagesInBook - usedPages;

                    let status = 'unused';
                    if (bookNumberCounts[book.bookNumber.toString()] > 1) status = 'conflict';
                    else if (usedPages === totalPagesInBook) status = 'completed';
                    else if (usedPages > 0 || Number(book.collectedAmount) > 0) status = 'used';

                    books.push({
                        ...book,
                        teamName: team.placeName + ', ' + team.state,
                        placeName: team.placeName,
                        state: team.state,
                        teamId: team._id,
                        usedPages,
                        remainingPages,
                        totalPages: totalPagesInBook,
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
        const used = filteredBooks.filter(b => b.status === 'used' || b.status === 'completed').length;
        const unused = filteredBooks.filter(b => b.status === 'unused').length;
        const completed = filteredBooks.filter(b => b.status === 'completed').length;
        const amount = filteredBooks.reduce((acc, b) => acc + (Number(b.collectedAmount) || 0), 0);
        const remaining = filteredBooks.reduce((acc, b) => acc + (Number(b.remainingPages) || 0), 0);
        const uniqueTeams = new Set(filteredBooks.map(b => b.teamId)).size;

        return { total, used, unused, completed, amount, remaining, uniqueTeams };
    }, [filteredBooks]);

    const handleExportCSV = () => {
        const headers = ['Team Name', 'State', 'Book Number', 'Start Page', 'End Page', 'Used Pages', 'Remaining', 'Collected', 'Status'];
        const rows = sortedBooks.map(b => [
            b.placeName, 
            b.state, 
            b.bookNumber, 
            b.startPage, 
            b.endPage, 
            b.usedPages, 
            b.remainingPages, 
            b.collectedAmount, 
            b.status.toUpperCase()
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `book_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-100 ring-emerald-500/10';
            case 'used': return 'bg-blue-50 text-blue-700 border-blue-100 ring-blue-500/10';
            case 'unused': return 'bg-slate-50 text-slate-600 border-slate-100 ring-slate-500/10';
            case 'conflict': return 'bg-rose-50 text-rose-700 border-rose-100 ring-rose-500/10';
            default: return 'bg-slate-50 text-slate-400 border-slate-100';
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen bg-[#f8fafc]">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 print:hidden">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <BookOpen className="text-indigo-600 w-8 h-8" />
                        Receipt Book Audit Report
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic">Detailed record of book assignments and utilization status</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                    <button
                        onClick={() => navigate('/assign-book')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                    >
                        <BookPlus size={18} />
                        <span className="hidden sm:inline">Assign Book</span>
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="grid grid-cols-1 gap-6 mb-8 print:hidden">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-slate-400 font-black text-xs uppercase tracking-widest">
                        <Filter size={14} /> Advanced Filters
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Season Selector */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 ml-1">Reporting Season</label>
                            <select
                                value={selectedSeason}
                                onChange={(e) => setSelectedSeason(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700"
                            >
                                {seasons.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} {s.isActive ? '(Active)' : ''}</option>
                                ))}
                            </select>
                        </div>

                        {/* Team Filter */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 ml-1">Filter by Team</label>
                            <select
                                value={filters.teamId}
                                onChange={(e) => setFilters({ ...filters, teamId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700"
                            >
                                <option value="">All Teams ({teams.length})</option>
                                {teams.map(t => (
                                    <option key={t._id} value={t._id}>{t.placeName}, {t.state}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 ml-1">Book Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700"
                            >
                                <option value="all">All Statuses</option>
                                <option value="used">Partially Used / Active</option>
                                <option value="unused">Unused Books</option>
                                <option value="completed">Fully Completed (50 Pages)</option>
                            </select>
                        </div>

                        {/* Search */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 ml-1">Search Database</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Book # or Team..."
                                    value={filters.searchPath}
                                    onChange={(e) => setFilters({ ...filters, searchPath: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-3">
                        <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                            <Users size={20} />
                        </span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 leading-none">{stats.uniqueTeams}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Teams</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-3">
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                            <BookOpen size={20} />
                        </span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 leading-none">{stats.total}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Books Assigned</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-3">
                        <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                            <CheckCircle2 size={20} />
                        </span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 leading-none">{stats.used}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Used (Active)</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-3">
                        <span className="p-2 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-slate-500 group-hover:text-white transition-colors duration-300">
                            <ClipboardList size={20} />
                        </span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 leading-none">{stats.unused}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Unused Count</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-3">
                        <span className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                            <TrendingUp size={20} />
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-slate-400">₹</span>
                        <p className="text-2xl font-black text-slate-900 leading-none">{stats.amount.toLocaleString()}</p>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Collection</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-3">
                        <span className="p-2 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                            <Layers size={20} />
                        </span>
                    </div>
                    <p className="text-2xl font-black text-slate-900 leading-none">{stats.remaining}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Remaining Pages</p>
                </div>
            </div>

            {/* Main Table Section */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative mb-8 print:border-none print:shadow-none">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-widest">
                                <th className="px-6 py-5 cursor-pointer hover:bg-slate-800 transition-colors group" onClick={() => handleSort('teamName')}>
                                    <div className="flex items-center gap-2">
                                        Team / Location {renderSortIcon('teamName')}
                                    </div>
                                </th>
                                <th className="px-6 py-5 cursor-pointer hover:bg-slate-800 transition-colors group" onClick={() => handleSort('bookNumber')}>
                                    <div className="flex items-center gap-2">
                                        Book # {renderSortIcon('bookNumber')}
                                    </div>
                                </th>
                                <th className="px-6 py-5">Range (Pgs)</th>
                                <th className="px-6 py-5 text-center cursor-pointer hover:bg-slate-800 transition-colors group" onClick={() => handleSort('usedPages')}>
                                    <div className="flex items-center justify-center gap-2">
                                        Used {renderSortIcon('usedPages')}
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-center cursor-pointer hover:bg-slate-800 transition-colors group" onClick={() => handleSort('remainingPages')}>
                                    <div className="flex items-center justify-center gap-2">
                                        Rem. {renderSortIcon('remainingPages')}
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-right cursor-pointer hover:bg-slate-800 transition-colors group" onClick={() => handleSort('collectedAmount')}>
                                    <div className="flex items-center justify-end gap-2">
                                        Collection Amount {renderSortIcon('collectedAmount')}
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
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
                                        <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-sm">#{book.bookNumber}</span>
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
                                        <span className={`font-black text-sm ${book.remainingPages < book.totalPages ? 'text-indigo-600' : 'text-slate-300'}`}>
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
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between print:hidden">
                        <p className="text-xs text-slate-500 font-bold">
                            Showing <span className="text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, sortedBooks.length)}</span> of <span className="text-slate-900">{sortedBooks.length}</span> results
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all font-bold"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex items-center px-4 font-black text-xs text-indigo-600">
                                Page {currentPage} of {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all font-bold"
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
        @media print {
          body { background: white !important; }
          .p-8 { padding: 0 !important; }
          table { width: 100% !important; border: 1px solid #e2e8f0 !important; }
          th { background: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; }
          .bg-[#f8fafc] { background: white !important; }
          .rounded-3xl { border-radius: 0 !important; }
          .shadow-xl { box-shadow: none !important; }
          .glass-card { border: none !important; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}} />
        </div>
    );
}
