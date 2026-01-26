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
    const [expandedTeams, setExpandedTeams] = useState({});
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

    const toggleSection = (teamId, section) => {
        setExpandedTeams(prev => ({
            ...prev,
            [teamId]: prev[teamId] === section ? null : section
        }));
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
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-1.5 text-indigo-600 mb-0.5 opacity-80">
                                    <MapPin size={12} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{team.state}</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 leading-tight truncate">{team.placeName}</h3>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleSection(team._id, 'members')}
                                    title="View Members / Master Data"
                                    className={`p-2 rounded-xl border transition-all ${expandedTeams[team._id] === 'members' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-indigo-600 hover:bg-white hover:border-indigo-100'}`}
                                >
                                    <Settings2 size={18} />
                                </button>
                                <button
                                    onClick={() => toggleSection(team._id, 'books')}
                                    title="View / Assign Books"
                                    className={`p-2 rounded-xl border transition-all ${expandedTeams[team._id] === 'books' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-indigo-600 hover:bg-white hover:border-indigo-100'}`}
                                >
                                    <PlusCircle size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Collapsible Content */}
                        <div className="overflow-hidden transition-all">
                            {expandedTeams[team._id] === 'members' && (
                                <div className="mt-4 pt-4 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Members</div>
                                        <button
                                            onClick={() => navigate(`/edit-team/${team._id}`)}
                                            className="text-[10px] font-black uppercase text-indigo-600 hover:underline flex items-center gap-1"
                                        >
                                            Edit All <ArrowUpRight size={12} />
                                        </button>
                                    </div>
                                    <div className="space-y-1.5">
                                        {team.members.map((m, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs px-2.5 py-2 bg-slate-50 rounded-lg border border-slate-100 font-bold text-slate-700">
                                                {m.name} <span className="opacity-40 text-[9px] uppercase tracking-tighter">CL {m.class}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {expandedTeams[team._id] === 'books' && (
                                <div className="mt-4 pt-4 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt Books</div>
                                        <button
                                            onClick={() => navigate(`/assign-book?teamId=${team._id}`)}
                                            className="text-[10px] font-black uppercase text-indigo-600 hover:underline flex items-center gap-1"
                                        >
                                            Manage <ArrowUpRight size={12} />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {team.receiptBooks.length > 0 ? team.receiptBooks.map((b, i) => (
                                            <span key={i} className="px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-indigo-700">{b.bookNumber}</span>
                                        )) : <span className="text-[10px] text-slate-400 italic">No books assigned</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
