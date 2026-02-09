import { useState, useEffect } from 'react';
import { teamService, seasonService } from '../services/api';
import { Users, Filter, MapPin, Edit3, Plus, Search, BookOpen, PlusCircle, Settings2, ArrowUpRight, Trash2, Printer } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { confirmDelete, MySwal } from '../utils/swal';
import PrintContainer from '../components/print/PrintContainer';
import PrintHeader from '../components/print/PrintHeader';
import TeamMembersSection from '../components/print/TeamMembersSection';
import PrintFooter from '../components/print/PrintFooter';

export default function TeamsList() {
    const [teams, setTeams] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [printingTeam, setPrintingTeam] = useState(null);
    const navigate = useNavigate();

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role === 'admin';

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

    const handlePrintSheet = (team) => {
        setPrintingTeam(team);
        setTimeout(() => {
            window.print();
            setPrintingTeam(null);
        }, 100);
    };

    const handleDeleteTeam = async (e, id, placeName) => {
        e.stopPropagation();
        const confirmed = await confirmDelete(
            `Delete Team: ${placeName}?`,
            "Team deletion is only allowed if no field collection entries or final settlements have been recorded."
        );

        if (confirmed) {
            try {
                await teamService.delete(id);
                MySwal.fire('Deleted!', 'Team has been removed successfully.', 'success');
                setTeams(prev => prev.filter(t => t._id !== id));
            } catch (err) {
                console.error(err);
                MySwal.fire({
                    title: 'Restricted Action',
                    text: err.response?.data?.message || 'Failed to delete team',
                    icon: 'error'
                });
            }
        }
    };

    const filteredTeams = teams.filter(team =>
        team.placeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.members.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="p-8 max-w-7xl mx-auto print:p-0 print:max-w-none print:m-0">
            <div className="print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                            <Users size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Team Management</h1>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Find team..."
                                className="input-field pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Link
                            to="/team-tools"
                            className="btn-secondary flex items-center gap-2 mr-2"
                        >
                            <Settings2 size={18} /> Import / Export
                        </Link>
                        <Link
                            to="/add-team"
                            className="btn-primary bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
                        >
                            <Plus size={18} /> New Team
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-20 text-center text-slate-400 italic font-medium">Loading teams...</div>
                    ) : filteredTeams.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-slate-400 italic font-medium">No teams found.</div>
                    ) : filteredTeams.map((team) => (
                        <div key={team._id} className="glass-card p-6 border-none bg-white hover:shadow-2xl transition-all duration-300 group flex flex-col h-fit">
                            {/* Header with Icon Buttons */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-1.5 text-indigo-600 mb-0.5 opacity-80">
                                        <MapPin size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{team.state}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 leading-tight truncate">{team.placeName}</h3>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/edit-team/${team._id}`)}
                                        className="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                                        title="Edit Team"
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTeam(e, team._id, team.placeName);
                                            }}
                                            className="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-sm"
                                            title="Delete Team"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePrintSheet(team);
                                        }}
                                        className="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm"
                                        title="Print Team Issue Sheet"
                                    >
                                        <Printer size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Members Section */}
                            <div className="space-y-3 mb-4">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Users size={12} /> Members ({team.members.length})
                                </div>
                                <div className="space-y-2">
                                    {team.members.map((m, i) => (
                                        <div key={i} className="flex justify-between items-center text-xs px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 font-bold text-slate-700 group-hover:border-indigo-50 transition-colors">
                                            <div className="flex flex-col">
                                                <span>{m.name}</span>
                                                <span className="text-[9px] font-normal text-slate-400">{m.phone}</span>
                                            </div>
                                            <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-[9px] uppercase tracking-tighter text-slate-500">
                                                {m.class || 'N/A'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Books Section */}
                            {/* Books Section */}
                            <div
                                onClick={() => navigate(`/assign-book?teamId=${team._id}`)}
                                className="pt-4 border-t border-slate-50 mt-auto cursor-pointer group/books hover:bg-indigo-50/30 -mx-6 px-6 -mb-6 pb-6 transition-all"
                                title="Manage Receipt Books"
                            >
                                <div className="flex justify-between items-center mb-2 mt-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover/books:text-indigo-600 transition-colors">
                                        <BookOpen size={12} /> Receipt Books ({team.receiptBooks?.length || 0})
                                    </div>
                                    <ArrowUpRight size={14} className="text-slate-300 group-hover/books:text-indigo-600 opacity-0 group-hover/books:opacity-100 transition-all transform group-hover/books:translate-x-1" />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {team.receiptBooks && team.receiptBooks.length > 0 ? (
                                        team.receiptBooks
                                            .slice()
                                            .sort((a, b) => Number(a.bookNumber) - Number(b.bookNumber))
                                            .map((b, i) => (
                                                <span key={i} className="px-2 py-1 bg-white border border-slate-200 group-hover/books:border-indigo-200 rounded text-[10px] font-bold text-slate-600 group-hover/books:text-indigo-700 transition-colors">
                                                    {b.bookNumber}
                                                </span>
                                            ))
                                    ) : (
                                        <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-1 rounded border border-transparent group-hover/books:border-indigo-100 group-hover/books:bg-white transition-colors">Assign Books</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hidden Printable Team Issue Sheet */}
            {printingTeam && (
                <PrintContainer>
                    <PrintHeader
                        season={seasons.find(s => s._id === selectedSeason)?.name}
                        location={`${printingTeam.placeName}, ${printingTeam.state}`}
                        date={new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        subtitle="Team Issue Sheet"
                        dateLabel="Issued Date"
                    />

                    <TeamMembersSection members={printingTeam.members} />

                    {/* Receipt Books Issue Section */}
                    <section className="mb-6 avoid-break">
                        <div className="flex justify-between items-end border-b border-black mb-2">
                            <h3 className="text-[11pt] font-bold uppercase tracking-wide inline-block">Receipt Books Issued</h3>
                            <span className="text-[9pt] font-bold text-slate-500 uppercase pb-0.5">{printingTeam.receiptBooks?.length || 0} Books Assigned</span>
                        </div>
                        <table className="w-full text-[10pt]">
                            <thead>
                                <tr className="bg-slate-50 font-bold border-b border-black">
                                    <th className="text-center w-18">Book #</th>
                                    <th className="text-center w-28">Starts</th>
                                    <th className="text-center w-28">Ends</th>
                                    <th className="">Collection Entry (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {printingTeam.receiptBooks
                                    ?.slice()
                                    .sort((a, b) => Number(a.bookNumber) - Number(b.bookNumber))
                                    .map((b, i) => (
                                        <tr key={i} className="h-10 avoid-break">
                                            <td className="text-center font-bold text-lg">{b.bookNumber}</td>
                                            <td className="text-center text-slate-600">{(b.bookNumber * 50) - 49}</td>
                                            <td className="text-center text-slate-300 italic text-[9pt]"></td>
                                            <td className="text-center text-slate-300 italic text-[9pt]"></td>
                                        </tr>
                                    ))}
                                <tr className="bg-slate-50 font-bold border-t-2 border-black h-12">
                                    <td colSpan="3" className="text-right uppercase text-[9pt] pr-4 tracking-tight">Total Collection Amount:</td>
                                    <td className="text-left px-4 text-lg">₹ </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    {/* Advance Summary */}
                    <div className="avoid-break mt-6">
                        <div className="flex justify-between items-center p-3 border-2 border-black mb-4 bg-slate-50">
                            <span className="text-[10pt] font-black uppercase tracking-tight">Advance Disbursement (Already Given)</span>
                            <span className="text-xl font-black">₹ {(printingTeam.advanceAmount || 0).toLocaleString()}</span>
                        </div>

                        <PrintFooter />
                    </div>
                </PrintContainer>
            )}
        </div>
    );
}