import { useState, useEffect, useMemo } from 'react';
import { fieldDataService, seasonService, userService } from '../services/api';
import {
    MapPin, Plus, Search, FileText, Lock, Globe, Phone, User, Users, Trash2,
    LayoutGrid, List, ArrowUpDown, SortAsc, SortDesc, Filter,
    BarChart2, TrendingUp, CheckCircle2, ClipboardList,
    ChevronLeft, ChevronRight, AlertCircle, UserX, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { confirmDelete, confirmAction } from '../utils/swal';

export default function FieldDataList() {
    const [fieldData, setFieldData] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSeason, setActiveSeason] = useState(null);
    const [viewType, setViewType] = useState('grid'); // 'grid' or 'report'
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
    const [selectedTeam, setSelectedTeam] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [showInactiveModal, setShowInactiveModal] = useState(false);
    const itemsPerPage = 10;
    const navigate = useNavigate();

    // Check role to conditionally render features
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role === 'admin';

    const filteredData = useMemo(() => {
        return fieldData.filter(item => {
            const matchesSearch = item.masjidName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.place.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.contactPerson?.name.toLowerCase().includes(searchQuery.toLowerCase());

            const itemUserId = item.createdBy?._id || item.createdBy?.username;
            const matchesTeam = selectedTeam === 'all' || itemUserId === selectedTeam;

            return matchesSearch && matchesTeam;
        });
    }, [fieldData, searchQuery, selectedTeam]);

    // Graph Data: Entries per Team (Memoized)
    const teamStats = useMemo(() => {
        const statsMap = new Map();
        filteredData.forEach(item => {
            const name = item.createdBy?.displayName || item.createdBy?.username || 'Unknown';
            statsMap.set(name, (statsMap.get(name) || 0) + 1);
        });

        return Array.from(statsMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [filteredData]);

    // Summary Statistics (Memoized based on filtered data)
    const stats = useMemo(() => {
        if (!isAdmin) return { totalEntries: 0, activeTeams: 0, inactiveCount: 0, totalTeams: 0, totalCollection: 0 };

        const totalEntries = filteredData.length;

        // 1. Get ONLY the "data_collector" users (exclude admins)
        const teamUsers = allUsers.filter(u => u.role !== 'admin');
        const totalTeams = teamUsers.length;

        // 2. Identify which of these team users actually have entries
        const activeUserIdsFromFieldData = new Set(
            fieldData.map(item => String(item.createdBy?._id || item.createdBy?.username))
        );

        // Active Teams: Users who have at least one entry
        const activeTeams = teamUsers.filter(u =>
            activeUserIdsFromFieldData.has(String(u._id)) || activeUserIdsFromFieldData.has(String(u.username))
        ).length;

        // 3. Inactive Teams = Teams with zero collection records
        const inactiveCount = totalTeams - activeTeams;

        const totalCollection = filteredData.reduce((acc, item) => {
            const val = parseFloat(String(item.yearsOfCollection || '').replace(/[^0-9.]/g, '') || 0);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);

        return { totalEntries, activeTeams, inactiveCount, totalTeams, totalCollection };
    }, [filteredData, fieldData, allUsers, isAdmin]);

    // Inactive Teams Detail (Memoized)
    const inactiveTeamsDetail = useMemo(() => {
        if (!isAdmin) return [];

        const activeUserIds = new Set(
            fieldData.map(item => String(item.createdBy?._id || item.createdBy?.username))
        );

        const teamUsers = allUsers.filter(u => u.role !== 'admin');

        return teamUsers.filter(u =>
            !activeUserIds.has(String(u._id)) && !activeUserIds.has(String(u.username))
        ).map(u => ({
            id: u._id,
            name: u.displayName || u.username,
            member: 'Team Member'
        }));
    }, [fieldData, allUsers, isAdmin]);

    // Unique Teams/Users for Filter
    const uniqueUsers = useMemo(() => {
        const users = new Map();
        fieldData.forEach(item => {
            if (item.createdBy) {
                const id = item.createdBy._id || item.createdBy.username;
                const name = item.createdBy.displayName || item.createdBy.username;
                users.set(id, name);
            }
        });
        return Array.from(users.entries()).map(([id, name]) => ({ id, name }));
    }, [fieldData]);

    const sortedData = useMemo(() => {
        const data = [...filteredData];
        if (sortConfig.key) {
            data.sort((a, b) => {
                let aVal, bVal;

                if (sortConfig.key === 'collection') {
                    aVal = parseFloat(String(a.yearsOfCollection || '').replace(/[^0-9.]/g, '') || 0);
                    bVal = parseFloat(String(b.yearsOfCollection || '').replace(/[^0-9.]/g, '') || 0);
                } else if (sortConfig.key === 'createdAt') {
                    aVal = new Date(a.createdAt || 0).getTime();
                    bVal = new Date(b.createdAt || 0).getTime();
                } else {
                    aVal = a[sortConfig.key];
                    bVal = b[sortConfig.key];
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [filteredData, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(start, start + itemsPerPage);
    }, [sortedData, currentPage]);

    // Reset pagination when filtering
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedTeam]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="opacity-30" />;
        return sortConfig.direction === 'asc' ? <SortAsc size={14} className="text-[#1E5FA8]" /> : <SortDesc size={14} className="text-[#1E5FA8]" />;
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const seasonRes = await seasonService.getActive();
            const sid = seasonRes.data._id;
            setActiveSeason(seasonRes.data);

            const [dataRes, usersRes] = await Promise.all([
                fieldDataService.getAll(sid),
                userService.getAll()
            ]);

            setFieldData(dataRes.data);
            setAllUsers(usersRes.data);
        } catch (err) {
            console.error("Failed to fetch data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = async (e, id) => {
        e.stopPropagation();
        const confirmed = await confirmDelete(
            "Delete Entry?",
            "This will permanently remove this field collection record. This action cannot be undone."
        );

        if (confirmed) {
            try {
                await fieldDataService.delete(id);
                setFieldData(prev => prev.filter(item => item._id !== id));
            } catch (err) {
                alert('Failed to delete entry');
            }
        }
    };

    const handleExport = () => {
        const headers = ["Masjid / Shop Name", "Place", "Land Mark", "Contact Name", "Phone", "Designation", " Collection", "Remarks", "Created By"];
        const csvContent = [
            headers.join(","),
            ...fieldData.map(item => [
                `"${item.masjidName}"`,
                `"${item.place}"`,
                `"${item.location?.address || ''}"`,
                `"${item.contactPerson?.name}"`,
                `"${item.contactPerson?.phone}"`,
                `"${item.contactPerson?.designation || ''}"`,
                `"${item.yearsOfCollection || ''}"`,
                `"${item.remarks || ''}"`,
                `"${item.createdBy?.displayName || item.createdBy?.username}"`
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `field_data_${activeSeason?.name || 'export'}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col gap-6 mb-10">
                <div id="report-summary" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#1E5FA8] text-white rounded-2xl shadow-lg">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-[#0F3B66] tracking-tight">Field Data Operations</h1>
                            <p className="text-sm font-medium text-slate-500 mt-1">
                                Season {activeSeason ? activeSeason.name : '...'}
                                <span className="ml-2 text-[#1E5FA8] font-bold">• {filteredData.length} records</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto self-end md:self-center">
                        <button
                            onClick={() => navigate('/field-data/new')}
                            className="btn-primary flex items-center gap-2 px-6"
                        >
                            <Plus size={18} /> <span className="font-bold">New Registry</span>
                        </button>

                        {isAdmin && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setViewType(viewType === 'grid' ? 'report' : 'grid')}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm border ${viewType === 'report'
                                        ? 'bg-[#0F3B66] text-white border-[#0F3B66]'
                                        : 'bg-white text-[#1E5FA8] border-slate-200 hover:bg-[#E6F0FA]'
                                        }`}
                                    title={viewType === 'grid' ? "Audit Report" : "Grid Explorer"}
                                >
                                    {viewType === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
                                    <span className="hidden lg:inline">{viewType === 'grid' ? "Registry Audit" : "Registry Grid"}</span>
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="btn-secondary p-3 text-slate-600"
                                    title="Export Registry"
                                >
                                    <FileText size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm mb-10">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Identify collections by institution or area identification..."
                            className="input-field pl-12 h-12"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {isAdmin && (
                        <div className="relative md:w-80">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[#1E5FA8] pointer-events-none">
                                <Filter size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Unit</span>
                            </div>
                            <select
                                value={selectedTeam}
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                className="input-field pl-24 h-12 cursor-pointer appearance-none"
                            >
                                <option value="all">All Field Units</option>
                                {uniqueUsers.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                <ArrowUpDown size={14} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Admin Summary Section */}
            {isAdmin && stats && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-[#1E5FA8] shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <span className="p-2 bg-[#E6F0FA] text-[#1E5FA8] rounded-xl group-hover:bg-[#1E5FA8] group-hover:text-white transition-colors duration-300">
                                    <BarChart2 size={20} />
                                </span>
                            </div>
                            <p className="text-2xl font-black text-[#0F3B66] leading-none relative z-10">{stats.totalEntries}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 relative z-10">Total Submissions</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-[#10B981] shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <span className="p-2 bg-emerald-50 text-[#10B981] rounded-xl group-hover:bg-[#10B981] group-hover:text-white transition-colors duration-300">
                                    <Users size={20} />
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2 relative z-10">
                                <p className="text-2xl font-black text-[#0F3B66] leading-none">{stats.activeTeams}</p>
                                <span className="text-[12px] font-bold text-slate-300">/ {stats.totalTeams}</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 relative z-10">Reporting Units</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border-l-4 border-l-[#1E5FA8]/30 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <span className="p-2 bg-[#E6F0FA] text-[#1E5FA8] rounded-xl group-hover:bg-[#1E5FA8] group-hover:text-white transition-colors duration-300">
                                    <TrendingUp size={20} />
                                </span>
                            </div>
                            <div className="flex items-baseline gap-1 relative z-10">
                                <span className="text-xs font-bold text-slate-400">₹</span>
                                <p className="text-2xl font-black text-[#0F3B66] leading-none">{stats.totalCollection.toLocaleString()}</p>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 relative z-10">Projected Collection</p>
                        </div>

                        <div
                            onClick={() => stats.inactiveCount > 0 && setShowInactiveModal(true)}
                            className={`bg-white p-6 rounded-2xl border-l-4 shadow-sm transition-all overflow-hidden relative ${stats.inactiveCount > 0 ? 'border-l-[#F59E0B] hover:shadow-md cursor-pointer group' : 'border-l-slate-200 opacity-50'}`}
                        >
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <span className={`p-2 rounded-xl transition-colors duration-300 ${stats.inactiveCount > 0 ? 'bg-amber-50 text-[#F59E0B] group-hover:bg-[#F59E0B] group-hover:text-white' : 'bg-slate-50 text-slate-400'}`}>
                                    <UserX size={20} />
                                </span>
                            </div>
                            <p className={`text-2xl font-black leading-none relative z-10 ${stats.inactiveCount > 0 ? 'text-[#F59E0B]' : 'text-slate-400'}`}>{stats.inactiveCount}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 relative z-10">Pending Units</p>
                            {stats.inactiveCount > 0 && (
                                <div className="absolute top-2 right-2">
                                    <span className="flex h-2 w-2 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Warning Alert for Inactive Teams */}
                    {stats.inactiveCount > 0 && (
                        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-amber-900 uppercase">Attention Required</h4>
                                    <p className="text-xs text-amber-700 font-medium">{stats.inactiveCount} teams {stats.inactiveCount === 1 ? 'has' : 'have'} not submitted any field data yet.</p>
                                </div>
                            </div>

                        </div>
                    )}
                </>
            )}

            {/* Content Area */}
            {viewType === 'grid' ? (
                <div id="report-table" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {loading ? (
                        <div className="col-span-full py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading field collections...</div>
                    ) : filteredData.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-3xl border border-slate-100 flex flex-col items-center gap-4">
                            <ClipboardList size={48} className="text-slate-200" />
                            <p className="font-bold uppercase tracking-widest text-xs">
                                {searchQuery ? 'No matching entries found.' : 'No data collected yet for this season.'}
                            </p>
                        </div>
                    ) : (
                        filteredData.map((item) => (
                            <div
                                key={item._id}
                                onClick={() => navigate(`/field-data/edit/${item._id}`)}
                                className="glass-card p-5 bg-white hover:shadow-xl transition-all duration-300 cursor-pointer group border-l-4 border-l-transparent hover:border-l-[#1E5FA8] rounded-2xl border border-slate-100 shadow-sm"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-[#0F3B66] line-clamp-1 group-hover:text-[#1E5FA8] transition-colors">
                                            {item.masjidName}
                                        </h3>
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mt-1">
                                            <MapPin size={12} />
                                            <span className="uppercase tracking-wide">{item.place}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isAdmin && (
                                            <button
                                                onClick={(e) => handleDeleteClick(e, item._id)}
                                                className="p-1.5 text-slate-300 hover:text-[#EF4444] hover:bg-rose-50 rounded-lg transition-all"
                                                title="Delete Record"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="p-2.5 bg-[#F8FAF8] rounded-2xl border border-slate-50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <User size={14} className="text-[#1E5FA8]" />
                                            <span className="text-xs font-bold text-[#0F3B66]">{item.contactPerson.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-500 pl-6">
                                            {item.contactPerson.designation && <span className="uppercase font-medium">{item.contactPerson.designation}</span>}
                                            <div className="flex items-center gap-1">
                                                <Phone size={10} /> {item.contactPerson.phone}
                                            </div>
                                        </div>
                                    </div>
                                    {item.yearsOfCollection && (
                                        <div className="text-[11px] text-slate-500 bg-[#F1F5F9] px-2 py-1.5 rounded-xl font-bold w-full text-center border border-slate-100">
                                            <span className="text-[#1E5FA8]">{item.yearsOfCollection}</span>  COLLECTION IDENTIFIED
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-[10px] text-slate-400 font-medium">
                                    <div className="flex items-center gap-1">
                                        <span>Collected by:</span>
                                        <span className="text-slate-600 font-bold">
                                            {item.createdBy?.displayName || item.createdBy?.username || 'Unknown'}
                                        </span>
                                    </div>
                                    {item.location?.latitude && (
                                        <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                            <Globe size={10} /> GPS
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-[#E6F0FA] text-[#1E5FA8] rounded-lg">
                                <BarChart2 size={18} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-[#0F3B66] uppercase tracking-tight">Deployment Performance Audit</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Efficiency metrics per field unit member</p>
                            </div>
                        </div>

                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {teamStats.length === 0 ? (
                                <p className="text-center py-10 text-slate-400 text-xs italic font-medium">No performance data available for current filters.</p>
                            ) : (
                                teamStats.map((team, idx) => {
                                    const maxCount = teamStats[0]?.count || 1;
                                    const percentage = (team.count / maxCount) * 100;

                                    return (
                                        <div key={idx} className="group">
                                            <div className="flex justify-between items-center mb-1.5 px-1">
                                                <span className="text-xs font-bold text-slate-500 group-hover:text-[#1E5FA8] transition-colors uppercase tracking-tight">
                                                    {team.name}
                                                </span>
                                                <span className="text-[10px] font-black text-[#0F3B66] bg-[#E6F0FA] px-2 py-0.5 rounded min-w-[30px] text-center">
                                                    {team.count}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[#1E5FA8] to-[#0F3B66] rounded-full transition-all duration-1000 ease-out shadow-sm"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div id="report-table" className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-[#0F3B66] text-white text-[10px] uppercase font-bold tracking-widest whitespace-nowrap">
                                        <th className="px-6 py-4">Reporting Unit</th>
                                        <th className="px-6 py-4">Institution Identifier</th>
                                        <th className="px-6 py-4">Sub-Area</th>
                                        <th className="px-6 py-4">Primary Correspondent</th>
                                        <th className="px-6 py-4">Mobile Identity</th>
                                        <th className="px-6 py-4 text-right cursor-pointer hover:bg-[#1E5FA8] transition-colors group" onClick={() => handleSort('collection')}>
                                            <div className="flex items-center justify-end gap-2">
                                                Net Weight {renderSortIcon('collection')}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 text-center cursor-pointer hover:bg-[#1E5FA8] transition-colors group" onClick={() => handleSort('createdAt')}>
                                            <div className="flex items-center justify-center gap-2">
                                                Authority Date {renderSortIcon('createdAt')}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedData.map((item) => (
                                        <tr
                                            key={item._id}
                                            className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                            onClick={() => navigate(`/field-data/edit/${item._id}`)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[#1E5FA8]">{item.createdBy?.displayName || item.createdBy?.username}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Team Envoy</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-[#0F3B66] group-hover:text-[#1E5FA8] transition-colors">{item.masjidName}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded uppercase tracking-wide">{item.place}</span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-700">{item.contactPerson.name}</td>
                                            <td className="px-6 py-4 font-mono text-xs">{item.contactPerson.phone}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-black text-slate-900">
                                                    {item.yearsOfCollection ? `₹ ${item.yearsOfCollection}` : '---'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-xs text-slate-500 font-medium">
                                                {new Date(item.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 bg-slate-50 border-t border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Showing <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> of <span className="text-slate-900">{sortedData.length}</span> entries
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
                                                            ? 'bg-[#1E5FA8] text-white shadow-md'
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
                </div>
            )}

            {/* Inactive Teams Modal */}
            {showInactiveModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl">
                                    <UserX size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Inactive Teams</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{inactiveTeamsDetail.length} Pending Submissions</p>
                                </div>
                            </div>
                            <button onClick={() => setShowInactiveModal(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors focus:outline-none">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-50/30">
                            <div className="space-y-3">
                                {inactiveTeamsDetail.map((team, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:border-indigo-100 hover:shadow-md transition-all group">
                                        <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-50 text-[#1E5FA8] border border-slate-100 flex items-center justify-center font-black uppercase text-sm group-hover:bg-[#1E5FA8] group-hover:text-white group-hover:border-[#1E5FA8] transition-colors shadow-sm">
                                            {team.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#0F3B66] group-hover:text-[#1E5FA8] transition-colors">{team.name}</h3>
                                            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <User size={12} className="text-[#1E5FA8]" /> Deployment Envoy
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-white border-t border-slate-100">
                            <button onClick={() => setShowInactiveModal(false)} className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 transition-all focus:outline-none focus:ring-4 focus:ring-slate-100">
                                Close
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
