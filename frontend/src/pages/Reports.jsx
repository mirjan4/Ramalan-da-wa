import { useState, useEffect } from 'react';
import { teamService, seasonService } from '../services/api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Download, Filter, Table as TableIcon, FileSpreadsheet, Edit3, Search, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MySwal } from '../utils/swal';

export default function Reports() {
    const [teams, setTeams] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSeasons();
    }, []);

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

    const filteredAndSortedTeams = teams
        .filter(team =>
            team.placeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.state.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'high-to-low') return b.totalCollection - a.totalCollection;
            if (sortBy === 'low-to-high') return a.totalCollection - b.totalCollection;
            return 0;
        });

    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Collection Report');

        // Define columns
        worksheet.columns = [
            { header: 'Place Name', key: 'place', width: 25 },
            { header: 'State', key: 'state', width: 15 },
            { header: 'Members Name', key: 'name', width: 25 },
            { header: 'Class', key: 'class', width: 15 },
            { header: 'Phone', key: 'phone', width: 20 },
            { header: 'Total Collection', key: 'total', width: 20 },
            { header: 'Advance', key: 'advance', width: 15 },
            { header: 'Expense', key: 'expense', width: 15 },
            { header: 'Balance', key: 'balance', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
        ];

        // Styling Headers
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F46E5' }, // Indigo-600
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        let currentRow = 2;
        filteredAndSortedTeams.forEach((team) => {
            const startRow = currentRow;
            team.members.forEach((member, memberIdx) => {
                worksheet.addRow({
                    place: team.placeName,
                    state: team.state,
                    name: member.name,
                    class: member.class,
                    phone: member.phone,
                    total: team.totalCollection,
                    advance: team.advanceAmount || 0,
                    expense: team.expense,
                    balance: team.balance,
                    status: team.status,
                });
                currentRow++;
            });

            const endRow = currentRow - 1;

            // Merge cells for team details
            if (endRow >= startRow) {
                ['A', 'B', 'F', 'G', 'H', 'I', 'J'].forEach((col) => {
                    worksheet.mergeCells(`${col}${startRow}:${col}${endRow}`);
                    // Center aligned for merged cells
                    worksheet.getCell(`${col}${startRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
                });
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
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Consolidated Reports</h1>
                    <p className="text-slate-500 mt-1">Review team performace and export audit-ready data.</p>
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

                    <button
                        onClick={exportToExcel}
                        className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 shadow-emerald-200"
                    >
                        <FileSpreadsheet size={18} /> Export
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden border-none bg-white shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 text-xs uppercase tracking-widest font-black border-b border-slate-100">
                                <th className="px-6 py-5 cursor-default">Place / State</th>
                                <th className="px-6 py-5 cursor-default">Members</th>
                                <th
                                    className="px-6 py-5 text-center cursor-pointer hover:bg-slate-100 transition-colors group select-none"
                                    onClick={toggleSort}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        Collection
                                        <span className="text-indigo-500">
                                            {sortBy === 'high-to-low' ? '▼' : sortBy === 'low-to-high' ? '▲' : '⇅'}
                                        </span>
                                    </div>
                                </th>
                                <th className="px-6 py-5 text-center cursor-default">Advance</th>
                                <th className="px-6 py-5 text-center cursor-default">Expense</th>
                                <th className="px-6 py-5 text-center cursor-default">Balance</th>
                                <th className="px-6 py-5 text-center cursor-default">Status</th>
                                <th className="px-6 py-5 text-center cursor-default">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="7" className="py-20 text-center text-slate-400 italic">Loading records...</td></tr>
                            ) : filteredAndSortedTeams.length === 0 ? (
                                <tr><td colSpan="7" className="py-20 text-center text-slate-400 italic">No records found matching your criteria.</td></tr>
                            ) : filteredAndSortedTeams.map((team) => (
                                <tr key={team._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{team.placeName}</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase">{team.state}</div>
                                    </td>
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
                                    <td className="px-6 py-4 text-center font-black text-slate-900">
                                        ₹{team.totalCollection.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-indigo-600">
                                        ₹{(team.advanceAmount || 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-rose-500">
                                        ₹{(team.expense || 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-black text-lg ${team.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            ₹{(team.balance || 0).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${team.status === 'SETTLED' ? 'bg-emerald-100 text-emerald-700' :
                                            team.status === 'SHORTAGE' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {team.status || 'PENDING'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => navigate(`/collection?teamId=${team._id}`)}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 mx-auto font-bold text-sm"
                                        >
                                            <Edit3 size={16} /> Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
