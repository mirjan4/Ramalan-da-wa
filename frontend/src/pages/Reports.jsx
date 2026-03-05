import { useState, useEffect } from 'react';
import { teamService, seasonService } from '../services/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, Filter, Table as TableIcon, FileSpreadsheet, Edit3, Search, ArrowUpDown, Printer, Settings2, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MySwal } from '../utils/swal';
import PrintContainer from '../components/print/PrintContainer';
import PrintHeader from '../components/print/PrintHeader';
import TeamMembersSection from '../components/print/TeamMembersSection';
import ReceiptBookDetails from '../components/print/ReceiptBookDetails';
import CollectionSummary from '../components/print/CollectionSummary';
import PrintFooter from '../components/print/PrintFooter';

export default function Reports() {
    const [teams, setTeams] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [printTeam, setPrintTeam] = useState(null);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [visibleColumns, setVisibleColumns] = useState({
        members: true,
        collection: true,
        advance: true,
        expense: true,
        balance: true,
        cashRef: false,
        bankRef: false,
        status: true,
        actions: true
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedSeason, sortBy]);

    const filteredAndSortedTeams = teams
        .filter(team =>
            team.placeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (team.cashRef && team.cashRef.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (team.bankRef && team.bankRef.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => {
            if (sortBy === 'high-to-low') return b.totalCollection - a.totalCollection;
            if (sortBy === 'low-to-high') return a.totalCollection - b.totalCollection;
            return 0;
        });

    const totalPages = Math.ceil(filteredAndSortedTeams.length / itemsPerPage);
    const paginatedTeams = filteredAndSortedTeams.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const fetchSeasons = async () => {
        try {
            const res = await seasonService.getAll();
            setSeasons(res.data);
            const active = res.data.find(s => s.isActive);
            if (active) {
                setSelectedSeason(active._id);
                fetchTeams(active._id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchTeams = async (seasonId) => {
        setLoading(true);
        try {
            const res = await teamService.getAll(seasonId);
            setTeams(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSeasonChange = (id) => {
        setSelectedSeason(id);
        fetchTeams(id);
    };

    const toggleSort = () => {
        if (sortBy === 'high-to-low') setSortBy('low-to-high');
        else if (sortBy === 'low-to-high') setSortBy('');
        else setSortBy('high-to-low');
    };

    useEffect(() => {
        fetchSeasons();
    }, []);

    useEffect(() => {
        if (printTeam) {
            setTimeout(() => {
                window.print();
                setPrintTeam(null);
            }, 100);
        }
    }, [printTeam]);

    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Institutional Report');

        // Define industrial standard columns
        worksheet.columns = [
            { header: 'Place Name(state)', key: 'place', width: 30 },
            { header: 'Members Name', key: 'name', width: 25 },
            { header: 'Class', key: 'class', width: 10 },
            { header: 'Phone', key: 'phone', width: 18 },
            { header: 'Total Collection', key: 'total', width: 15 },
            { header: 'Advance', key: 'advance', width: 15 },
            { header: 'Expense (with out Advance)', key: 'expense', width: 22 },
            { header: 'Bank', key: 'bank', width: 15 },
            { header: 'Balance', key: 'balance', width: 15 },
            { header: 'Cash Ref', key: 'cashRef', width: 15 },
            { header: 'Bank Ref', key: 'bankRef', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
        ];

        // Header Styling - Premium institutional blue
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E5FA8' },
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 30;

        let currentRow = 2;
        filteredAndSortedTeams.forEach((team) => {
            const startRow = currentRow;
            const bankAmount = team.bankAmount || 0;
            const advance = team.advanceAmount || 0;
            const totalExpense = team.expense || 0;
            const total = team.totalCollection || 0;

            // Institutional Rule: Expense (without Advance) = Operational Expense - Advance
            const expWithoutAdv = Math.max(0, totalExpense - advance);

            // Institutional Balance Rule: Total Collection - Advance - ExpWithoutAdv - Bank
            const calcBalance = total - advance - expWithoutAdv - bankAmount;

            if (!team.members || team.members.length === 0) {
                worksheet.addRow({
                    place: `${team.placeName}(${team.state})`,
                    name: '-',
                    class: '-',
                    phone: '-',
                    total: total,
                    advance: advance,
                    expense: expWithoutAdv,
                    bank: bankAmount,
                    balance: calcBalance,
                    cashRef: team.cashRef || '',
                    bankRef: team.bankRef || '',
                    status: team.status || 'PENDING',
                });
                currentRow++;
            } else {
                team.members.forEach((member, memberIdx) => {
                    worksheet.addRow({
                        place: memberIdx === 0 ? `${team.placeName}(${team.state})` : '',
                        name: member.name,
                        class: member.class,
                        phone: member.phone,
                        total: memberIdx === 0 ? total : '',
                        advance: memberIdx === 0 ? advance : '',
                        expense: memberIdx === 0 ? expWithoutAdv : '',
                        bank: memberIdx === 0 ? bankAmount : '',
                        balance: memberIdx === 0 ? calcBalance : '',
                        cashRef: memberIdx === 0 ? (team.cashRef || '') : '',
                        bankRef: memberIdx === 0 ? (team.bankRef || '') : '',
                        status: memberIdx === 0 ? (team.status || 'PENDING') : '',
                    });
                    currentRow++;
                });

                const endRow = currentRow - 1;

                // Merge cells for team-level data
                if (endRow > startRow) {
                    ['A', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].forEach((col) => {
                        worksheet.mergeCells(`${col}${startRow}:${col}${endRow}`);
                        worksheet.getCell(`${col}${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
                    });
                } else {
                    // Even if not merged, center align team data for consistency
                    ['A', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].forEach((col) => {
                        worksheet.getCell(`${col}${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
                    });
                }
            }
        });

        // Add borders to all cells
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Ramalan_Report_${new Date().toLocaleDateString()}.xlsx`);
        MySwal.fire({
            title: 'Report Generated!',
            text: 'The collection report has been downloaded successfully.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-[#0F3B66] tracking-tight">Financial Reports</h1>
                    <p className="text-sm font-medium text-slate-500 mt-1">Review team performance and export audit-ready collection data.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Find team or place..."
                            className="input-field pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>


                    <div className="relative flex-1 min-w-[180px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            className="input-field pl-10"
                            value={selectedSeason}
                            onChange={(e) => handleSeasonChange(e.target.value)}
                        >
                            {seasons.map((s) => (
                                <option key={s._id} value={s._id}>{s.name} {s.isActive ? '(Active)' : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            className="btn-secondary flex items-center gap-2 px-4 py-2.5 relative"
                        >
                            <Settings2 size={18} />
                            <span className="hidden sm:inline">Column View</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${showColumnMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showColumnMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowColumnMenu(false)}></div>
                                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 z-20 animate-in zoom-in-95 duration-200 origin-top-right">
                                    <p className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Columns</p>
                                    <div className="grid grid-cols-1 gap-1">
                                        {[
                                            { id: 'members', label: 'Members' },
                                            { id: 'collection', label: 'Collection' },
                                            { id: 'advance', label: 'Advance Amount' },
                                            { id: 'expense', label: 'Expense' },
                                            { id: 'balance', label: 'Net Balance' },
                                            { id: 'cashRef', label: 'Cash Ref' },
                                            { id: 'bankRef', label: 'Bank Ref' },
                                            { id: 'status', label: 'Status' },
                                            { id: 'actions', label: 'Actions' }
                                        ].map((col) => (
                                            <button
                                                key={col.id}
                                                onClick={() => setVisibleColumns(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
                                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold transition-all ${visibleColumns[col.id] ? 'bg-[#E6F0FA] text-[#1E5FA8]' : 'text-slate-500 hover:bg-slate-50'}`}
                                            >
                                                {col.label}
                                                {visibleColumns[col.id] && <Check size={14} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={exportToExcel}
                        className="btn-primary bg-[#10B981] hover:bg-[#059669] flex items-center gap-2 shadow-sm"
                    >
                        <FileSpreadsheet size={18} /> Export Excel
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden border-none bg-white shadow-xl print:hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest font-bold border-b border-slate-100">
                                <th className="px-6 py-4 cursor-default">Team Identification</th>
                                {visibleColumns.members && <th className="px-6 py-4 cursor-default">Field Officers</th>}
                                {visibleColumns.collection && (
                                    <th
                                        className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                                        onClick={toggleSort}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            Collection
                                            <span className="text-[#1E5FA8]">
                                                {sortBy === 'high-to-low' ? '▼' : sortBy === 'low-to-high' ? '▲' : '⇅'}
                                            </span>
                                        </div>
                                    </th>
                                )}
                                {visibleColumns.advance && <th className="px-6 py-4 text-center cursor-default">Advance</th>}
                                {visibleColumns.expense && <th className="px-6 py-4 text-center cursor-default">Expense</th>}
                                {visibleColumns.balance && <th className="px-6 py-4 text-center cursor-default">Surplus</th>}
                                {visibleColumns.cashRef && <th className="px-6 py-4 text-center cursor-default">Cash Ref</th>}
                                {visibleColumns.bankRef && <th className="px-6 py-4 text-center cursor-default">Bank Ref</th>}
                                {visibleColumns.status && <th className="px-6 py-4 text-center cursor-default">Status</th>}
                                {visibleColumns.actions && <th className="px-6 py-4 text-center cursor-default">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="py-20 text-center text-slate-400 italic">Loading records...</td></tr>
                            ) : paginatedTeams.length === 0 ? (
                                <tr><td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="py-20 text-center text-slate-400 italic">No records found matching your criteria.</td></tr>
                            ) : paginatedTeams.map((team) => (
                                <tr key={team._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{team.placeName}</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">{team.state}</div>
                                    </td>
                                    {visibleColumns.members && (
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                {team.members.map((m, i) => (
                                                    <div key={i} className="text-sm text-slate-600 flex items-center gap-2">
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                        <span className="font-medium text-slate-700">{m.name}</span>
                                                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{m.class}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    )}
                                    {visibleColumns.collection && (
                                        <td className="px-6 py-4 text-center font-black text-slate-900">
                                            ₹{team.totalCollection.toLocaleString()}
                                        </td>
                                    )}
                                    {visibleColumns.advance && (
                                        <td className="px-6 py-4 text-center font-bold text-[#1E5FA8]">
                                            ₹{(team.advanceAmount || 0).toLocaleString()}
                                        </td>
                                    )}
                                    {visibleColumns.expense && (
                                        <td className="px-6 py-4 text-center font-bold text-rose-500">
                                            ₹{(team.expense || 0).toLocaleString()}
                                        </td>
                                    )}
                                    {visibleColumns.balance && (
                                        <td className="px-6 py-4 text-center">
                                            <span className={`font-black text-lg ${team.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                ₹{(team.balance || 0).toLocaleString()}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.cashRef && (
                                        <td className="px-6 py-4 text-center text-sm font-mono text-slate-500">
                                            {team.cashRef || '-'}
                                        </td>
                                    )}
                                    {visibleColumns.bankRef && (
                                        <td className="px-6 py-4 text-center text-sm font-mono text-slate-500">
                                            {team.bankRef || '-'}
                                        </td>
                                    )}
                                    {visibleColumns.status && (
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${team.status === 'SETTLED' ? 'bg-emerald-100 text-emerald-700' :
                                                team.status === 'SHORTAGE' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {team.status || 'PENDING'}
                                            </span>
                                        </td>
                                    )}
                                    {visibleColumns.actions && (
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/collection?teamId=${team._id}`)}
                                                    className="p-2 text-[#1E5FA8] hover:bg-[#E6F0FA] rounded-lg transition-colors flex items-center gap-1 font-bold text-sm"
                                                    title="Edit Record"
                                                >
                                                    <Edit3 size={16} />
                                                    <span className="hidden lg:inline"></span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPrintTeam(team)}
                                                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 font-bold text-sm"
                                                    title="Print Report"
                                                >
                                                    <Printer size={16} />
                                                    <span className="hidden lg:inline"></span>
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 bg-slate-50 border-t border-slate-100 print:hidden">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Showing <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredAndSortedTeams.length)}</span> of <span className="text-slate-900">{filteredAndSortedTeams.length}</span> entries
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => {
                                    const page = i + 1;
                                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === page
                                                    ? 'bg-[#1E5FA8] text-white shadow-md shadow-[#1E5FA8]/20'
                                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-[#E6F0FA] hover:text-[#1E5FA8]'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    } else if ((page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2)) {
                                        return <span key={page} className="text-slate-300">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Printable Settlement Sheet */}
            {printTeam && (
                <PrintContainer>
                    <PrintHeader
                        season={seasons.find(s => s._id === selectedSeason)?.name}
                        location={`${printTeam.placeName}, ${printTeam.state}`}
                        date={new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    />

                    <TeamMembersSection members={printTeam.members} />

                    <ReceiptBookDetails
                        books={printTeam.receiptBooks || []}
                        total={printTeam.totalCollection}
                    />

                    <CollectionSummary
                        total={printTeam.totalCollection}
                        expense={printTeam.expense || 0}
                        advance={printTeam.advanceAmount || 0}
                        netBalance={printTeam.totalCollection + (printTeam.advanceAmount || 0) - (printTeam.expense || 0)}
                        cash={printTeam.cashAmount || 0}
                        bank={printTeam.bankAmount || 0}
                        totalReceived={(printTeam.cashAmount || 0) + (printTeam.bankAmount || 0)}
                        cashRef={printTeam.cashRef}
                        bankRef={printTeam.bankRef}
                        status={printTeam.status}
                    >
                        <PrintFooter />
                    </CollectionSummary>
                </PrintContainer>
            )}
        </div>
    );
}
