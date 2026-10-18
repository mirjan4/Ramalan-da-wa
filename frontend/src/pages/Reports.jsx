import { useState, useEffect, useMemo } from 'react';
import { teamService, seasonService, bankAccountService } from '../services/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, Filter, Users, Table as TableIcon, FileSpreadsheet, Edit3, ArrowUpDown, Printer, Settings2, ChevronDown, Check, ChevronLeft, ChevronRight, Coins, Banknote, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MySwal } from '../utils/swal';
import ExportModal from '../components/ExportModal';
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
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [printTeam, setPrintTeam] = useState(null);
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [masterBanks, setMasterBanks] = useState([]);
    const [visibleColumns, setVisibleColumns] = useState({
        members: true,
        collection: true,
        advance: true,
        expense: true,
        totalBank: true,
        balance: true,
        cashRef: false,
        bankRef: false,
        status: true,
        actions: true
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFields, setExportFields] = useState([]);
    const [dynamicBankMeta, setDynamicBankMeta] = useState({ bankNames: [], hasUnallocatedBank: false });

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedSeason, sortBy, selectedTeamId]);

    const filteredAndSortedTeams = teams
        .filter(team => {
            const matchesTeam = !selectedTeamId || team._id === selectedTeamId;
            return matchesTeam;
        })
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

    // --- Aggregated Summary Totals (from filtered teams) ---
    const summaryTotals = filteredAndSortedTeams.reduce((acc, team) => ({
        collection: acc.collection + (team.totalCollection || 0),
        bank: acc.bank + (team.bankAmount || 0),
        cash: acc.cash + (team.cashAmount || 0),
    }), { collection: 0, bank: 0, cash: 0 });

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

    const fetchMasterBanks = async () => {
        try {
            const res = await bankAccountService.getAll();
            setMasterBanks(res.data || []);
        } catch (err) {
            console.error('Failed to fetch master banks:', err);
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
        fetchMasterBanks();
    }, []);

    // Derive all unique bank names across master bank accounts and team entries
    const allBankNames = useMemo(() => {
        const bankNamesMap = new Map();
        masterBanks.forEach(mb => {
            if (mb.bankName && mb.bankName.trim()) {
                const trimmed = mb.bankName.trim();
                const key = trimmed.toLowerCase();
                if (!bankNamesMap.has(key)) {
                    bankNamesMap.set(key, trimmed);
                }
            }
        });
        teams.forEach(team => {
            if (Array.isArray(team.bankAccounts)) {
                team.bankAccounts.forEach(b => {
                    if (b.bankName && b.bankName.trim()) {
                        const trimmed = b.bankName.trim();
                        const key = trimmed.toLowerCase();
                        if (!bankNamesMap.has(key)) {
                            bankNamesMap.set(key, trimmed);
                        }
                    }
                });
            }
        });
        return Array.from(bankNamesMap.values());
    }, [masterBanks, teams]);

    // Check if any team has unallocated bankAmount not covered by individual bank columns
    const hasUnallocatedBank = useMemo(() => {
        return filteredAndSortedTeams.some(team => {
            const totalBank = Number(team.bankAmount) || 0;
            if (totalBank <= 0) return false;
            let allocated = 0;
            if (Array.isArray(team.bankAccounts)) {
                team.bankAccounts.forEach(b => {
                    if (b.bankName && allBankNames.some(name => name.toLowerCase() === b.bankName.trim().toLowerCase())) {
                        allocated += (Number(b.amount) || 0);
                    }
                });
            }
            return (totalBank - allocated) > 0.01;
        });
    }, [filteredAndSortedTeams, allBankNames]);

    const isColVisible = (id) => {
        if (visibleColumns[id] !== undefined) {
            return Boolean(visibleColumns[id]);
        }
        // Bank name columns are unchecked by default in Display Columns
        if (id.startsWith('bank_')) {
            return false;
        }
        return true;
    };

    const toggleColumn = (id) => {
        setVisibleColumns(prev => {
            const currentlyVisible = isColVisible(id);
            return {
                ...prev,
                [id]: !currentlyVisible
            };
        });
    };

    const totalVisibleColumnCount = useMemo(() => {
        let count = 1; // Team Identification
        if (isColVisible('members')) count++;
        if (isColVisible('collection')) count++;
        if (isColVisible('advance')) count++;
        if (isColVisible('expense')) count++;
        allBankNames.forEach(bName => {
            if (isColVisible(`bank_${bName}`)) count++;
        });
        if (hasUnallocatedBank && isColVisible('bank_other')) count++;
        if (isColVisible('totalBank')) count++;
        if (isColVisible('balance')) count++;
        if (isColVisible('cashRef')) count++;
        if (isColVisible('bankRef')) count++;
        if (isColVisible('status')) count++;
        if (isColVisible('actions')) count++;
        return count;
    }, [visibleColumns, allBankNames, hasUnallocatedBank]);

    useEffect(() => {
        if (printTeam) {
            setTimeout(() => {
                window.print();
                setPrintTeam(null);
            }, 100);
        }
    }, [printTeam]);

    const handleOpenExportModal = async () => {
        let currentMasterBanks = masterBanks;
        if (!currentMasterBanks || currentMasterBanks.length === 0) {
            try {
                const res = await bankAccountService.getAll();
                currentMasterBanks = res.data || [];
                setMasterBanks(currentMasterBanks);
            } catch (err) {
                console.error('Failed to fetch master banks:', err);
            }
        }

        const bankNames = allBankNames;
        setDynamicBankMeta({ bankNames, hasUnallocatedBank });

        // Available fields for user selection
        const fields = [
            { key: 'place', label: 'Place Name (State)', category: 'General' },
            { key: 'name', label: 'Members Name', category: 'Field Officers' },
            { key: 'class', label: 'Class', category: 'Field Officers' },
            { key: 'phone', label: 'Phone', category: 'Field Officers' },
            { key: 'total', label: 'Total Collection', category: 'Financials' },
            { key: 'advance', label: 'Advance', category: 'Financials' },
            { key: 'expense', label: 'Expense (without Advance)', category: 'Financials' },
        ];

        // Each bank gets a selectable checkbox
        bankNames.forEach((bName, idx) => {
            fields.push({
                key: `bank_${idx}`,
                label: bName,
                category: 'Bank Accounts'
            });
        });

        if (hasUnallocatedBank) {
            fields.push({
                key: 'bank_other',
                label: 'Other Bank',
                category: 'Bank Accounts'
            });
        }

        fields.push({
            key: 'totalBank',
            label: 'Total Bank Amount',
            category: 'Financials'
        });

        fields.push(
            { key: 'balance', label: 'Balance / Surplus', category: 'Financials' },
            { key: 'cashRef', label: 'Cash Reference', category: 'Audit References' },
            { key: 'bankRef', label: 'Bank Reference', category: 'Audit References' },
            { key: 'status', label: 'Status', category: 'General' }
        );

        setExportFields(fields);
        setShowExportModal(true);
    };

    const executeExcelExport = async (selectedKeys) => {
        if (!selectedKeys || selectedKeys.length === 0) return;

        const { bankNames, hasUnallocatedBank } = dynamicBankMeta;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Institutional Report');

        // Master definition of all possible columns
        const allPossibleColumns = [
            { header: 'Place Name(state)', key: 'place', width: 30, isMemberLevel: false },
            { header: 'Members Name', key: 'name', width: 25, isMemberLevel: true },
            { header: 'Class', key: 'class', width: 10, isMemberLevel: true },
            { header: 'Phone', key: 'phone', width: 18, isMemberLevel: true },
            { header: 'Total Collection', key: 'total', width: 16, isMemberLevel: false },
            { header: 'Advance', key: 'advance', width: 15, isMemberLevel: false },
            { header: 'Expense (with out Advance)', key: 'expense', width: 22, isMemberLevel: false },
        ];

        bankNames.forEach((bName, idx) => {
            allPossibleColumns.push({
                header: bName,
                key: `bank_${idx}`,
                width: Math.max(16, bName.length + 4),
                isMemberLevel: false
            });
        });

        if (hasUnallocatedBank) {
            allPossibleColumns.push({
                header: 'Other Bank',
                key: 'bank_other',
                width: 16,
                isMemberLevel: false
            });
        }

        allPossibleColumns.push({
            header: 'Total Bank',
            key: 'totalBank',
            width: 16,
            isMemberLevel: false
        });

        allPossibleColumns.push(
            { header: 'Balance', key: 'balance', width: 15, isMemberLevel: false },
            { header: 'Cash Ref', key: 'cashRef', width: 15, isMemberLevel: false },
            { header: 'Bank Ref', key: 'bankRef', width: 22, isMemberLevel: false },
            { header: 'Status', key: 'status', width: 15, isMemberLevel: false }
        );

        // Filter to only user-selected columns
        const activeColumns = allPossibleColumns.filter(c => selectedKeys.includes(c.key));
        worksheet.columns = activeColumns.map(c => ({
            header: c.header,
            key: c.key,
            width: c.width
        }));

        // Header Styling - Premium institutional blue
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E5FA8' },
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        headerRow.height = 30;

        let currentRow = 2;
        filteredAndSortedTeams.forEach((team) => {
            const startRow = currentRow;
            const bankAmount = Number(team.bankAmount) || 0;
            const advance = Number(team.advanceAmount) || 0;
            const totalExpense = Number(team.expense) || 0;
            const total = Number(team.totalCollection) || 0;

            // Institutional Rule: Expense (without Advance) = Operational Expense - Advance
            const expWithoutAdv = Math.max(0, totalExpense - advance);

            // Institutional Balance Rule: Total Collection - Advance - ExpWithoutAdv - Bank
            const calcBalance = total - advance - expWithoutAdv - bankAmount;

            // Calculate bank amounts per bank column
            const bankValues = {};
            let allocatedSum = 0;
            bankNames.forEach((bName, idx) => {
                let amt = 0;
                if (Array.isArray(team.bankAccounts)) {
                    team.bankAccounts.forEach(b => {
                        if (b.bankName && b.bankName.trim().toLowerCase() === bName.toLowerCase()) {
                            amt += (Number(b.amount) || 0);
                        }
                    });
                }
                bankValues[`bank_${idx}`] = amt;
                allocatedSum += amt;
            });

            if (hasUnallocatedBank) {
                const unallocated = Math.max(0, bankAmount - allocatedSum);
                bankValues['bank_other'] = unallocated;
            }

            const totalColCount = activeColumns.length;

            if (!team.members || team.members.length === 0) {
                const fullRow = {
                    place: `${team.placeName}(${team.state})`,
                    name: '-',
                    class: '-',
                    phone: '-',
                    total: total,
                    advance: advance,
                    expense: expWithoutAdv,
                    ...bankValues,
                    totalBank: bankAmount,
                    balance: calcBalance,
                    cashRef: team.cashRef || '',
                    bankRef: team.bankRef || '',
                    status: team.status || 'PENDING',
                };
                const rowObj = {};
                activeColumns.forEach(c => {
                    rowObj[c.key] = fullRow[c.key] ?? '';
                });
                worksheet.addRow(rowObj);
                for (let col = 1; col <= totalColCount; col++) {
                    worksheet.getCell(startRow, col).alignment = { vertical: 'middle', horizontal: 'center' };
                }
                currentRow++;
            } else {
                team.members.forEach((member, memberIdx) => {
                    const fullRow = {
                        place: memberIdx === 0 ? `${team.placeName}(${team.state})` : '',
                        name: member.name,
                        class: member.class,
                        phone: member.phone,
                        total: memberIdx === 0 ? total : '',
                        advance: memberIdx === 0 ? advance : '',
                        expense: memberIdx === 0 ? expWithoutAdv : '',
                        totalBank: memberIdx === 0 ? bankAmount : '',
                        balance: memberIdx === 0 ? calcBalance : '',
                        cashRef: memberIdx === 0 ? (team.cashRef || '') : '',
                        bankRef: memberIdx === 0 ? (team.bankRef || '') : '',
                        status: memberIdx === 0 ? (team.status || 'PENDING') : '',
                    };

                    bankNames.forEach((_, idx) => {
                        fullRow[`bank_${idx}`] = memberIdx === 0 ? bankValues[`bank_${idx}`] : '';
                    });
                    if (hasUnallocatedBank) {
                        fullRow['bank_other'] = memberIdx === 0 ? bankValues['bank_other'] : '';
                    }

                    const rowObj = {};
                    activeColumns.forEach(c => {
                        rowObj[c.key] = fullRow[c.key] ?? '';
                    });
                    worksheet.addRow(rowObj);
                    currentRow++;
                });

                const endRow = currentRow - 1;

                // Merge cells for team-level columns across member rows
                if (endRow > startRow) {
                    activeColumns.forEach((colDef, colIndexZero) => {
                        const colNumber = colIndexZero + 1;
                        if (!colDef.isMemberLevel) {
                            worksheet.mergeCells(startRow, colNumber, endRow, colNumber);
                        }
                        worksheet.getCell(startRow, colNumber).alignment = { vertical: 'middle', horizontal: 'center' };
                    });
                } else {
                    for (let col = 1; col <= totalColCount; col++) {
                        worksheet.getCell(startRow, col).alignment = { vertical: 'middle', horizontal: 'center' };
                    }
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
            text: `The collection report with ${activeColumns.length} fields has been downloaded successfully.`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    };

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 sm:gap-6 mb-6 sm:mb-10 print:hidden">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#0F3B66] tracking-tight">Financial Reports</h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 sm:mt-1">Review team performance and export collection data.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 w-full xl:w-auto">

                    <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            className="input-field pl-10 text-xs sm:text-sm"
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                        >
                            <option value="">All Teams</option>
                            {teams.map((t) => (
                                <option key={t._id} value={t._id}>{t.placeName} ({t.state})</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative flex-1 min-w-[130px] sm:min-w-[150px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select
                            className="input-field pl-10 font-bold text-xs sm:text-sm"
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
                            <span className="hidden sm:inline">View</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${showColumnMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showColumnMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowColumnMenu(false)}></div>
                                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 z-20 animate-in zoom-in-95 duration-200 origin-top-right max-h-96 overflow-y-auto custom-scrollbar">
                                    <p className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Columns</p>
                                    <div className="grid grid-cols-1 gap-1">
                                        {[
                                            { id: 'members', label: 'Members' },
                                            { id: 'collection', label: 'Collection' },
                                            { id: 'advance', label: 'Advance Amount' },
                                            { id: 'expense', label: 'Expense' },
                                            ...allBankNames.map(bName => ({
                                                id: `bank_${bName}`,
                                                label: bName
                                            })),
                                            ...(hasUnallocatedBank ? [{ id: 'bank_other', label: 'Other Bank' }] : []),
                                            { id: 'totalBank', label: 'Total Bank' },
                                            { id: 'balance', label: 'Net Balance' },
                                            { id: 'cashRef', label: 'Cash Ref' },
                                            { id: 'bankRef', label: 'Bank Ref' },
                                            { id: 'status', label: 'Status' },
                                            { id: 'actions', label: 'Actions' }
                                        ].map((col) => (
                                            <button
                                                key={col.id}
                                                onClick={() => toggleColumn(col.id)}
                                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold transition-all ${isColVisible(col.id) ? 'bg-[#E6F0FA] text-[#1E5FA8]' : 'text-slate-500 hover:bg-slate-50'}`}
                                            >
                                                <span className="truncate">{col.label}</span>
                                                {isColVisible(col.id) && <Check size={14} className="shrink-0 ml-2" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={handleOpenExportModal}
                        className="btn-primary bg-[#10B981] hover:bg-[#059669] flex items-center gap-2 shadow-sm"
                    >
                        <FileSpreadsheet size={15} /> Export
                    </button>
                </div>
            </div>

            {/* ── Summary Cards ── */}
            <div id="report-summary" className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-8 print:hidden">
                {/* Total Collection */}
                <div className="bg-white rounded-2xl border border-slate-100 border-l-4 border-l-[#1E5FA8] p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 bg-[#E6F0FA] rounded-xl shrink-0">
                        <Banknote size={22} className="text-[#1E5FA8]" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Collection</p>
                        <p className="text-xl sm:text-2xl font-black text-[#0F3B66] tracking-tight">
                            ₹{summaryTotals.collection.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{filteredAndSortedTeams.length} teams</p>
                    </div>
                </div>

                {/* Bank Amount */}
                <div className="bg-white rounded-2xl border border-slate-100 border-l-4 border-l-[#10B981] p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 bg-emerald-50 rounded-xl shrink-0">
                        <Wallet size={22} className="text-[#10B981]" />
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Bank Amount</p>
                        <p className="text-xl sm:text-2xl font-black text-[#0F3B66] tracking-tight">
                            ₹{summaryTotals.bank.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Across all teams</p>
                    </div>
                </div>

                {/* Total Cash in Hand — clickable */}
                <div
                    onClick={() => navigate('/denomination-report')}
                    className="bg-white rounded-2xl border border-slate-100 border-l-4 border-l-[#F59E0B] p-4 sm:p-5 shadow-sm flex items-center gap-3 sm:gap-4 cursor-pointer hover:shadow-md hover:border-amber-200 hover:bg-amber-50/30 transition-all group"
                >
                    <div className="p-2.5 sm:p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors shrink-0">
                        <Coins size={22} className="text-[#F59E0B]" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Cash in Hand</p>
                        <p className="text-xl sm:text-2xl font-black text-[#0F3B66] tracking-tight">
                            ₹{summaryTotals.cash.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">From denomination counts · <span className="text-[#F59E0B] font-bold">View details →</span></p>
                    </div>
                </div>
            </div>

            <div id="report-table" className="glass-card overflow-hidden border-none bg-white shadow-xl print:hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[950px]">
                        <thead>
                            <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest font-bold border-b border-slate-100">
                                <th className="px-6 py-4 cursor-default">Team Identification</th>
                                {isColVisible('members') && <th className="px-6 py-4 cursor-default">Field Officers</th>}
                                {isColVisible('collection') && (
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
                                {isColVisible('advance') && <th className="px-6 py-4 text-center cursor-default">Advance</th>}
                                {isColVisible('expense') && <th className="px-6 py-4 text-center cursor-default">Expense</th>}
                                {allBankNames.map((bName) => (
                                    isColVisible(`bank_${bName}`) && (
                                        <th key={bName} className="px-6 py-4 text-center cursor-default whitespace-nowrap">
                                            {bName}
                                        </th>
                                    )
                                ))}
                                {hasUnallocatedBank && isColVisible('bank_other') && (
                                    <th className="px-6 py-4 text-center cursor-default whitespace-nowrap">
                                        Other Bank
                                    </th>
                                )}
                                {isColVisible('totalBank') && <th className="px-6 py-4 text-center cursor-default whitespace-nowrap">Total Bank</th>}
                                {isColVisible('balance') && <th className="px-6 py-4 text-center cursor-default">Surplus</th>}
                                {isColVisible('cashRef') && <th className="px-6 py-4 text-center cursor-default">Cash Ref</th>}
                                {isColVisible('bankRef') && <th className="px-6 py-4 text-center cursor-default">Bank Ref</th>}
                                {isColVisible('status') && <th className="px-6 py-4 text-center cursor-default">Status</th>}
                                {isColVisible('actions') && <th className="px-6 py-4 text-center cursor-default">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={totalVisibleColumnCount} className="py-20 text-center text-slate-400 italic">Loading records...</td></tr>
                            ) : paginatedTeams.length === 0 ? (
                                <tr><td colSpan={totalVisibleColumnCount} className="py-20 text-center text-slate-400 italic">No records found matching your criteria.</td></tr>
                            ) : paginatedTeams.map((team) => (
                                <tr key={team._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{team.placeName}</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">{team.state}</div>
                                    </td>
                                    {isColVisible('members') && (
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
                                    {isColVisible('collection') && (
                                        <td className="px-6 py-4 text-center font-black text-slate-900">
                                            ₹{team.totalCollection.toLocaleString()}
                                        </td>
                                    )}
                                    {isColVisible('advance') && (
                                        <td className="px-6 py-4 text-center font-bold text-[#1E5FA8]">
                                            ₹{(team.advanceAmount || 0).toLocaleString()}
                                        </td>
                                    )}
                                    {isColVisible('expense') && (
                                        <td className="px-6 py-4 text-center font-bold text-rose-500">
                                            ₹{(team.expense || 0).toLocaleString()}
                                        </td>
                                    )}
                                    {allBankNames.map((bName) => {
                                        if (!isColVisible(`bank_${bName}`)) return null;

                                        const matchingAccounts = Array.isArray(team.bankAccounts)
                                            ? team.bankAccounts.filter(b => b.bankName && b.bankName.trim().toLowerCase() === bName.trim().toLowerCase())
                                            : [];
                                        const amt = matchingAccounts.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
                                        const refs = matchingAccounts.map(b => b.refNo).filter(Boolean);

                                        return (
                                            <td key={bName} className="px-6 py-4 text-center whitespace-nowrap">
                                                {amt > 0 ? (
                                                    <div>
                                                        <span className="font-semibold text-slate-700">
                                                            ₹{amt.toLocaleString()}
                                                        </span>
                                                        {refs.length > 0 && (
                                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                                {refs.join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 font-medium">-</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    {hasUnallocatedBank && isColVisible('bank_other') && (() => {
                                        const totalBank = Number(team.bankAmount) || 0;
                                        let allocated = 0;
                                        if (Array.isArray(team.bankAccounts)) {
                                            team.bankAccounts.forEach(b => {
                                                if (b.bankName && allBankNames.some(name => name.toLowerCase() === b.bankName.trim().toLowerCase())) {
                                                    allocated += (Number(b.amount) || 0);
                                                }
                                            });
                                        }
                                        const unallocated = Math.max(0, totalBank - allocated);
                                        return (
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                {unallocated > 0 ? (
                                                    <span className="font-semibold text-slate-700">
                                                        ₹{unallocated.toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 font-medium">-</span>
                                                )}
                                            </td>
                                        );
                                    })()}
                                    {isColVisible('totalBank') && (
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <div className="font-bold text-[#1E5FA8]">
                                                ₹{(team.bankAmount || 0).toLocaleString()}
                                            </div>
                                            {(!team.bankAccounts || team.bankAccounts.length === 0) && team.bankRef ? (
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    {team.bankRef}
                                                </div>
                                            ) : null}
                                        </td>
                                    )}
                                    {isColVisible('balance') && (
                                        <td className="px-6 py-4 text-center">
                                            <span className={`font-black text-lg ${team.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                ₹{(team.balance || 0).toLocaleString()}
                                            </span>
                                        </td>
                                    )}
                                    {isColVisible('cashRef') && (
                                        <td className="px-6 py-4 text-center text-sm font-mono text-slate-500">
                                            {team.cashRef || '-'}
                                        </td>
                                    )}
                                    {isColVisible('bankRef') && (
                                        <td className="px-6 py-4 text-center text-sm font-mono text-slate-500">
                                            {team.bankRef || '-'}
                                        </td>
                                    )}
                                    {isColVisible('status') && (
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${team.status === 'SETTLED' ? 'bg-emerald-100 text-emerald-700' :
                                                team.status === 'SHORTAGE' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {team.status || 'PENDING'}
                                            </span>
                                        </td>
                                    )}
                                    {isColVisible('actions') && (
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
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 print:hidden">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sm:text-left">
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

            {/* Field Selection Export Modal */}
            <ExportModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={executeExcelExport}
                fields={exportFields}
                title="Export Data"
                description="Choose which fields to include in the export. All fields are selected by default."
                exportFormat="Excel"
            />
        </div>
    );
}
