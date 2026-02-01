import { useState, useEffect } from 'react';
import { teamService, seasonService } from '../services/api';
import { Users, Filter, MapPin, Edit3, Plus, Search, BookOpen, PlusCircle, Settings2, ArrowUpRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function TeamsList() {
    const [teams, setTeams] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
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

    const filteredTeams = teams.filter(team =>
        team.placeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.members.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
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

                            <button
                                onClick={() => navigate(`/edit-team/${team._id}`)}
                                className="p-2 rounded-xl bg-slate-50 text-slate-400 border border-slate-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                                title="Edit Team"
                            >
                                <Edit3 size={18} />
                            </button>
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
                                    <BookOpen size={12} /> Receipt Books
                                </div>
                                <ArrowUpRight size={14} className="text-slate-300 group-hover/books:text-indigo-600 opacity-0 group-hover/books:opacity-100 transition-all transform group-hover/books:translate-x-1" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {team.receiptBooks && team.receiptBooks.length > 0 ? (
                                    team.receiptBooks.map((b, i) => (
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
    );
}
