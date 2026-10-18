import { useState, useEffect, useMemo } from 'react';
import { teamService, seasonService } from '../services/api';
import { Users, Filter, MapPin, Edit3, Plus, Search, BookOpen, PlusCircle, Settings2, ArrowUpRight, Trash2, Printer, Calendar, History, Sparkles, Check, X, Loader2, ArrowUpDown } from 'lucide-react';
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
    const [showActivateModal, setShowActivateModal] = useState(false);
    const [sourceSeasonId, setSourceSeasonId] = useState('');
    const [sourceTeams, setSourceTeams] = useState([]);
    const [selectedTeamIds, setSelectedTeamIds] = useState([]);
    const [modalSearchQuery, setModalSearchQuery] = useState('');
    const [loadingSourceTeams, setLoadingSourceTeams] = useState(false);
    const [activating, setActivating] = useState(false);
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

    const currentSeasonObj = useMemo(() => {
        return seasons.find(s => s._id === selectedSeason) || null;
    }, [seasons, selectedSeason]);

    const openActivateModal = async () => {
        const otherSeasons = seasons.filter(s => s._id !== selectedSeason);
        const defaultSource = otherSeasons[0]?._id || '';
        setSourceSeasonId(defaultSource);
        setSelectedTeamIds([]);
        setModalSearchQuery('');
        setShowActivateModal(true);
        if (defaultSource) {
            loadSourceTeams(defaultSource);
        }
    };

    const loadSourceTeams = async (srcId) => {
        setLoadingSourceTeams(true);
        try {
            const res = await teamService.getAll(srcId);
            const srcList = res.data || [];
            setSourceTeams(srcList);
            // Default select teams that are not yet in the target season
            const currentPlaceNames = new Set(teams.map(t => t.placeName.trim().toLowerCase()));
            const availableIds = srcList
                .filter(t => !currentPlaceNames.has(t.placeName.trim().toLowerCase()))
                .map(t => t._id);
            setSelectedTeamIds(availableIds);
        } catch (err) {
            console.error("Failed to load source teams:", err);
        } finally {
            setLoadingSourceTeams(false);
        }
    };

    const handleSourceSeasonChange = (id) => {
        setSourceSeasonId(id);
        loadSourceTeams(id);
    };

    const handleToggleTeam = (id) => {
        setSelectedTeamIds(prev =>
            prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (availableIds) => {
        if (selectedTeamIds.length === availableIds.length) {
            setSelectedTeamIds([]);
        } else {
            setSelectedTeamIds(availableIds);
        }
    };

    const handleActivateTeams = async () => {
        if (selectedTeamIds.length === 0) return;
        setActivating(true);
        try {
            const res = await teamService.copyFromSeason({
                sourceSeasonId,
                targetSeasonId: selectedSeason,
                teamIds: selectedTeamIds
            });

            await MySwal.fire({
                title: 'Teams Activated!',
                text: res.data.message || `Successfully activated ${res.data.count} team(s) in this season.`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });

            setShowActivateModal(false);
            fetchTeams(selectedSeason);
        } catch (err) {
            console.error("Activation failed:", err);
            MySwal.fire({
                title: 'Activation Failed',
                text: err.response?.data?.message || 'Failed to activate teams.',
                icon: 'error'
            });
        } finally {
            setActivating(false);
        }
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

    const stats = useMemo(() => {
        const totalTeams = teams.length;
        const totalMembers = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
        const totalBooks = teams.reduce((acc, t) => acc + (t.receiptBooks?.length || 0), 0);
        return { totalTeams, totalMembers, totalBooks };
    }, [teams]);

    const filteredTeams = teams.filter(team =>
        team.placeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.members.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const filteredSourceTeams = useMemo(() => {
        if (!modalSearchQuery) return sourceTeams;
        const q = modalSearchQuery.toLowerCase();
        return sourceTeams.filter(st =>
            st.placeName.toLowerCase().includes(q) ||
            st.state?.toLowerCase().includes(q) ||
            st.members?.some(m => m.name.toLowerCase().includes(q))
        );
    }, [sourceTeams, modalSearchQuery]);

    return (
        <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto print:p-0 print:max-w-none print:m-0">
            <div className="print:hidden">
                {/* Header Area */}
                <div id="report-summary" className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 mb-6 sm:mb-8 print:hidden">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="p-2.5 sm:p-3 bg-[#1E5FA8] text-white rounded-2xl shadow-lg shadow-[#1E5FA8]/20 shrink-0">
                            <Users size={24} className="sm:w-[26px] sm:h-[26px]" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                                <h1 className="text-xl sm:text-2xl font-bold text-[#0F3B66] tracking-tight">Teams Management</h1>
                                {currentSeasonObj && (
                                    <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                                        currentSeasonObj.isActive 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                            : 'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}>
                                        {currentSeasonObj.isActive && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        )}
                                        {currentSeasonObj.name} {currentSeasonObj.isActive ? '• Active' : '• Archived'}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 sm:mt-1">
                                Organize field officers and assign collection books
                            </p>
                        </div>
                    </div>

                    {/* Primary Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        {isAdmin && seasons.length > 1 && (
                            <button
                                onClick={openActivateModal}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200/80 text-[#1E5FA8] rounded-xl font-bold shadow-sm transition-all text-xs sm:text-sm whitespace-nowrap"
                                title="Activate teams from previous season"
                            >
                                <History size={16} />
                                <span>Activate from Past Season</span>
                            </button>
                        )}

                        <Link
                            to="/team-tools"
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold shadow-sm transition-all text-xs sm:text-sm whitespace-nowrap"
                        >
                            <Settings2 size={16} className="text-slate-500" />
                            <span>Bulk Tools</span>
                        </Link>

                        <Link
                            to="/add-team"
                            className="btn-primary flex items-center gap-2 px-5 py-2.5 shadow-md shadow-[#1E5FA8]/20 text-xs sm:text-sm font-bold whitespace-nowrap"
                        >
                            <Plus size={18} strokeWidth={2.5} />
                            <span>Create Team</span>
                        </Link>
                    </div>
                </div>

                {/* Search & Season Filter Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Find team by place, state, or member name..."
                            className="input-field pl-12 pr-10 h-12 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {seasons.length > 0 && (
                        <div className="relative sm:w-72">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[#1E5FA8] pointer-events-none">
                                <Calendar size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Season</span>
                            </div>
                            <select
                                className="input-field pl-24 pr-10 h-12 cursor-pointer appearance-none font-bold text-[#0F3B66] text-sm"
                                value={selectedSeason}
                                onChange={(e) => handleSeasonChange(e.target.value)}
                            >
                                {seasons.map((s) => (
                                    <option key={s._id} value={s._id}>
                                        {s.name} {s.isActive ? '(Active)' : ''}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ArrowUpDown size={14} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Sub-toolbar Meta Stats Strip */}
                {!loading && teams.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-2 mb-8 text-xs text-slate-500">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-700">
                                {searchQuery ? (
                                    <>Showing <span className="text-[#1E5FA8] font-black">{filteredTeams.length}</span> of {teams.length} teams</>
                                ) : (
                                    <><span className="text-[#1E5FA8] font-black">{teams.length}</span> Teams Registered</>
                                )}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-medium">
                                <span className="font-bold text-slate-700">{stats.totalMembers}</span> Field Officers
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-medium">
                                <span className="font-bold text-slate-700">{stats.totalBooks}</span> Receipt Books
                            </span>
                        </div>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-xs font-bold text-[#1E5FA8] hover:underline"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                )}

                {/* Main Table Section */}
                <div id="report-table" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-20 text-center text-slate-400 flex flex-col items-center gap-3">
                            <Loader2 className="animate-spin text-[#1E5FA8]" size={36} />
                            <span className="text-xs font-bold uppercase tracking-wider">Loading team registries...</span>
                        </div>
                    ) : filteredTeams.length === 0 ? (
                        <div className="col-span-full py-16 px-6 text-center bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center gap-4 animate-in fade-in duration-300">
                            <div className="p-4 bg-[#E6F0FA] text-[#1E5FA8] rounded-2xl">
                                <Users size={36} />
                            </div>
                            <div className="max-w-md">
                                <h3 className="text-lg font-bold text-[#0F3B66]">
                                    {searchQuery ? 'No matching teams found' : `No teams registered in Season ${currentSeasonObj?.name || ''}`}
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    {searchQuery
                                        ? `No teams match "${searchQuery}". Try a different search term or clear the filter.`
                                        : 'Get started by activating existing teams from a previous season or register new teams for this operational period.'}
                                </p>
                            </div>
                            {!searchQuery && (
                                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                                    {isAdmin && seasons.length > 1 && (
                                        <button
                                            onClick={openActivateModal}
                                            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs font-bold shadow-md"
                                        >
                                            <Sparkles size={16} /> Activate Teams from Past Season
                                        </button>
                                    )}
                                    <Link
                                        to="/add-team"
                                        className="btn-secondary flex items-center gap-2 px-5 py-2.5 text-xs font-bold border border-slate-200"
                                    >
                                        <Plus size={16} /> Create Team from Scratch
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : filteredTeams.map((team) => (
                        <div key={team._id} className="glass-card p-4 sm:p-6 border-none bg-white hover:shadow-xl transition-all duration-300 group flex flex-col h-fit">
                            {/* Header with Icon Buttons */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-1.5 text-[#1E5FA8] mb-0.5 opacity-80">
                                        <MapPin size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{team.state}</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-[#0F3B66] leading-tight truncate">{team.placeName}</h3>
                                </div>

                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => navigate(`/team-collection?teamId=${team._id}`)}
                                        className="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 hover:bg-[#0F3B66] hover:text-white hover:border-[#0F3B66] transition-all shadow-sm"
                                        title="Team Collection Register"
                                    >
                                        <BookOpen size={18} />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/edit-team/${team._id}`)}
                                        className="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 hover:bg-[#1E5FA8] hover:text-white hover:border-[#1E5FA8] transition-all shadow-sm"
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
                                            className="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 hover:bg-[#EF4444] hover:text-white hover:border-[#EF4444] transition-all shadow-sm"
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
                                        className="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 hover:bg-[#10B981] hover:text-white hover:border-[#10B981] transition-all shadow-sm"
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
                                        <div key={i} className="flex justify-between items-center text-xs px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 font-bold text-slate-700 group-hover:border-[#E6F0FA] transition-colors">
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
                            <div
                                onClick={() => navigate(`/assign-book?teamId=${team._id}`)}
                                className="pt-4 border-t border-slate-50 mt-auto cursor-pointer group/books hover:bg-[#E6F0FA]/40 -mx-6 px-6 -mb-6 pb-6 transition-all"
                                title="Manage Receipt Books"
                            >
                                <div className="flex justify-between items-center mb-2 mt-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 group-hover/books:text-[#1E5FA8] transition-colors">
                                        <BookOpen size={12} /> Receipt Books ({team.receiptBooks?.length || 0})
                                    </div>
                                    <ArrowUpRight size={14} className="text-slate-300 group-hover/books:text-[#1E5FA8] opacity-0 group-hover/books:opacity-100 transition-all transform group-hover/books:translate-x-1" />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {team.receiptBooks && team.receiptBooks.length > 0 ? (
                                        team.receiptBooks
                                            .slice()
                                            .sort((a, b) => Number(a.bookNumber) - Number(b.bookNumber))
                                            .map((b, i) => (
                                                <span key={i} className="px-2 py-1 bg-white border border-slate-200 group-hover/books:border-[#A3C4E8] rounded text-[10px] font-bold text-slate-600 group-hover/books:text-[#1E5FA8] transition-colors">
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

            {/* Modal for Activating Teams from Previous Season */}
            {showActivateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[85vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-[#1E5FA8] text-white rounded-xl shadow-md">
                                    <History size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-[#0F3B66] tracking-tight">Activate Teams in Season</h2>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Roll over teams and members from a previous season to <span className="font-bold text-[#1E5FA8]">{seasons.find(s => s._id === selectedSeason)?.name || 'current season'}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowActivateModal(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1">
                                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Select Source Season</label>
                                    <select
                                        value={sourceSeasonId}
                                        onChange={(e) => handleSourceSeasonChange(e.target.value)}
                                        className="input-field font-bold text-[#0F3B66] h-11 text-xs"
                                    >
                                        <option value="">-- Choose Season --</option>
                                        {seasons.filter(s => s._id !== selectedSeason).map(s => (
                                            <option key={s._id} value={s._id}>
                                                {s.name} {s.isActive ? '(Active)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {sourceTeams.length > 0 && (
                                    <div className="flex-1">
                                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Filter Teams</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search place, state, member..."
                                                className="input-field pl-9 h-11 text-xs"
                                                value={modalSearchQuery}
                                                onChange={(e) => setModalSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {loadingSourceTeams ? (
                                <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
                                    <Loader2 className="animate-spin text-[#1E5FA8]" size={32} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Loading source teams...</span>
                                </div>
                            ) : sourceTeams.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-xs font-bold uppercase tracking-wider">No teams found in this season.</p>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            {filteredSourceTeams.length} Teams {modalSearchQuery ? 'Matching' : 'in Season'} • {selectedTeamIds.length} Selected
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const currentPlaceNames = new Set(teams.map(t => t.placeName.trim().toLowerCase()));
                                                const availableIds = sourceTeams
                                                    .filter(t => !currentPlaceNames.has(t.placeName.trim().toLowerCase()))
                                                    .map(t => t._id);
                                                handleSelectAll(availableIds);
                                            }}
                                            className="text-xs font-bold text-[#1E5FA8] hover:underline"
                                        >
                                            {selectedTeamIds.length > 0 ? 'Deselect All' : 'Select All Available'}
                                        </button>
                                    </div>

                                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                                        {filteredSourceTeams.map(st => {
                                            const currentPlaceNames = new Set(teams.map(t => t.placeName.trim().toLowerCase()));
                                            const alreadyExists = currentPlaceNames.has(st.placeName.trim().toLowerCase());
                                            const isSelected = selectedTeamIds.includes(st._id);

                                            return (
                                                <div
                                                    key={st._id}
                                                    onClick={() => !alreadyExists && handleToggleTeam(st._id)}
                                                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${alreadyExists
                                                        ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'
                                                        : isSelected
                                                            ? 'bg-[#E6F0FA]/60 border-[#1E5FA8] shadow-sm cursor-pointer'
                                                            : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${alreadyExists
                                                            ? 'border-slate-300 bg-slate-200 text-slate-400'
                                                            : isSelected
                                                                ? 'bg-[#1E5FA8] border-[#1E5FA8] text-white'
                                                                : 'border-slate-300 bg-white'
                                                            }`}>
                                                            {isSelected && <Check size={14} strokeWidth={3} />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-bold text-[#0F3B66]">{st.placeName}</h4>
                                                                {st.state && (
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                                                        {st.state}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                                {st.members?.length > 0
                                                                    ? `${st.members.length} members: ${st.members.map(m => m.name).join(', ')}`
                                                                    : 'No members assigned'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {alreadyExists && (
                                                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                                                            Already in Season
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setShowActivateModal(false)}
                                className="btn-secondary px-5"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleActivateTeams}
                                disabled={selectedTeamIds.length === 0 || activating}
                                className="btn-primary flex items-center gap-2 px-6 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {activating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                <span>Activate {selectedTeamIds.length} Teams</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
}