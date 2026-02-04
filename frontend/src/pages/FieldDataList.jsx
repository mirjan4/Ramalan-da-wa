import { useState, useEffect } from 'react';
import { fieldDataService, seasonService } from '../services/api';
import { MapPin, Plus, Search, FileText, Lock, Globe, Phone, User, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { confirmDelete, confirmAction } from '../utils/swal';

export default function FieldDataList() {
    const [fieldData, setFieldData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSeason, setActiveSeason] = useState(null);
    const navigate = useNavigate();

    // Check role to conditionally render features
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role === 'admin';

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const seasonRes = await seasonService.getActive();
            setActiveSeason(seasonRes.data);

            // Fetch data for the active season
            const dataRes = await fieldDataService.getAll(seasonRes.data._id);
            setFieldData(dataRes.data);
        } catch (err) {
            console.error("Failed to fetch data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLockSeason = async (isLocked) => {
        const confirmed = await confirmAction({
            title: isLocked ? "Lock Season Data?" : "Unlock Season Data?",
            text: `Are you sure you want to ${isLocked ? 'LOCK' : 'UNLOCK'} all field data for this season? This affects editing capabilities for all members.`,
            confirmText: isLocked ? "Lock All" : "Unlock All",
            variant: isLocked ? "warning" : "info"
        });

        if (confirmed) {
            try {
                await fieldDataService.lockBySeason(activeSeason._id, isLocked);
                fetchInitialData();
            } catch (err) {
                alert('Failed to update lock status');
            }
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
        // Simple CSV Export
        const headers = ["Masjid / Shop Name", "Place", "District", "Contact Name", "Phone", "Designation", "Years of Collection", "Remarks", "Created By"];
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

    const filteredData = fieldData.filter(item =>
        item.masjidName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.place.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.contactPerson?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                        <MapPin size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Field Data Collection</h1>
                        <p className="text-slate-500 font-medium text-sm md:text-base">
                            {activeSeason ? activeSeason.name : 'Loading Season...'}
                            {isAdmin && <span className="ml-2 text-indigo-600">• {filteredData.length} entries</span>}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search masjid / shop, place..."
                            className="input-field pl-10 py-2.5"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => navigate('/field-data/new')}
                        className="btn-primary bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 py-2.5"
                    >
                        <Plus size={18} /> <span className="hidden sm:inline">Add New</span>
                    </button>

                    {isAdmin && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleExport}
                                className="p-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                                title="Export CSV"
                            >
                                <FileText size={18} />
                            </button>
                            <button
                                onClick={() => handleLockSeason(!fieldData[0]?.isLocked)}
                                className={`p-3 border rounded-xl transition-colors ${fieldData[0]?.isLocked
                                    ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                                    : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-600'
                                    }`}
                                title={fieldData[0]?.isLocked ? "Unlock Season Data" : "Lock Season Data"}
                            >
                                <Lock size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-400 italic">Loading data...</div>
                ) : filteredData.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-slate-400 italic">
                        {searchQuery ? 'No matches found.' : 'No data collected yet. Click "Add New" to start.'}
                    </div>
                ) : (
                    filteredData.map((item) => (
                        <div
                            key={item._id}
                            onClick={() => navigate(`/field-data/edit/${item._id}`)}
                            className="glass-card p-5 bg-white hover:shadow-xl transition-all duration-300 cursor-pointer group border-l-4 border-l-transparent hover:border-l-indigo-500"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                        {item.masjidName}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mt-1">
                                        <MapPin size={12} />
                                        <span className="uppercase tracking-wide">{item.place}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {item.isLocked && <Lock size={14} className="text-rose-400" />}
                                    {isAdmin && (
                                        <button
                                            onClick={(e) => handleDeleteClick(e, item._id)}
                                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                            title="Delete Entry"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-2 mb-1">
                                        <User size={14} className="text-indigo-500" />
                                        <span className="text-xs font-bold text-slate-700">{item.contactPerson.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 pl-6">
                                        {item.contactPerson.designation && <span className="uppercase font-medium">{item.contactPerson.designation}</span>}
                                        <div className="flex items-center gap-1">
                                            <Phone size={10} /> {item.contactPerson.phone}
                                        </div>
                                    </div>
                                </div>
                                {item.yearsOfCollection && (
                                    <div className="text-xs text-slate-600 bg-amber-50 px-2 py-1 rounded inline-block font-medium w-full text-center border border-amber-100">
                                        <span className="font-bold">{item.yearsOfCollection}</span> Years of Collection
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
        </div>
    );
}
