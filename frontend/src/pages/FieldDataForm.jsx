import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fieldDataService, seasonService } from '../services/api';
import { MapPin, Save, User, Building2, FileText, ArrowLeft, Globe, Loader2 } from 'lucide-react';
import { MySwal } from '../utils/swal';

export default function FieldDataForm() {
    const { id } = useParams();
    const isEditMode = !!id;
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [fetchingLocation, setFetchingLocation] = useState(false);
    const [activeSeason, setActiveSeason] = useState(null);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        masjidName: '',
        place: '',
        location: {
            latitude: '',
            longitude: '',
            address: ''
        },
        contactPerson: {
            name: '',
            designation: '',
            phone: ''
        },
        yearsOfCollection: '',
        remarks: ''
    });

    useEffect(() => {
        const init = async () => {
            try {
                // Get active season
                const seasonRes = await seasonService.getActive();
                setActiveSeason(seasonRes.data);

                // If edit mode, fetch data
                if (isEditMode) {
                    setLoading(true);
                    const dataRes = await fieldDataService.getById(id);
                    setFormData(dataRes.data);
                }
            } catch (err) {
                setError('Failed to load initial data. ' + (err.response?.data?.message || err.message));
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [id, isEditMode]);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            MySwal.fire('Not Supported', 'Geolocation is not supported by your browser.', 'error');
            return;
        }

        setFetchingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    location: {
                        ...prev.location,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }
                }));
                setFetchingLocation(false);
            },
            (error) => {
                MySwal.fire('GPS Error', 'Unable to retrieve your location. Please check permissions.', 'error');
                setFetchingLocation(false);
            }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!activeSeason) throw new Error("No active season found");

            const payload = { ...formData, season: activeSeason._id };

            if (isEditMode) {
                await fieldDataService.update(id, payload);
                await MySwal.fire({
                    title: 'Updated!',
                    text: 'Field data has been successfully updated.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await fieldDataService.create(payload);
                await MySwal.fire({
                    title: 'Saved!',
                    text: 'Field data entry has been successfully recorded.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            navigate('/field-data');
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save data");
        } finally {
            setLoading(false);
        }
    };

    if (!activeSeason && !loading && !error) return <div className="p-8 text-center">Loading context...</div>;

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto">
            <button
                onClick={() => navigate('/field-data')}
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm mb-6 transition-colors"
            >
                <ArrowLeft size={16} /> Back to List
            </button>

            <div className="glass-card bg-white p-6 md:p-8 border-none shadow-xl">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            {isEditMode ? 'Edit Field Data' : 'New Entry'}
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">
                            {activeSeason?.name} • Please fill in all required details accurately.
                        </p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <MapPin size={24} />
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-xl animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Location Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Building2 size={14} /> Location Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="label">Masjid / Shop Name *</label>
                                <input
                                    required
                                    className="input-field font-bold"
                                    placeholder="e.g. Town Juma Masjid"
                                    value={formData.masjidName}
                                    onChange={e => setFormData({ ...formData, masjidName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Place / Area *</label>
                                <input
                                    required
                                    className="input-field"
                                    placeholder="e.g. Calicut City"
                                    value={formData.place}
                                    onChange={e => setFormData({ ...formData, place: e.target.value })}
                                />
                            </div>
                            <div className="col-span-full">
                                <label className="label">Detailed Address / Landmarks</label>
                                <textarea
                                    className="input-field h-20 resize-none py-2"
                                    placeholder="Near Central Bus Stand..."
                                    value={formData.location.address}
                                    onChange={e => setFormData({ ...formData, location: { ...formData.location, address: e.target.value } })}
                                />
                            </div>
                        </div>

                        {/* GPS Module */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-xs text-slate-500 font-medium">
                                <span className="block font-bold text-slate-700 mb-0.5">GPS Coordinates</span>
                                {formData.location.latitude ? (
                                    <span className="font-mono text-emerald-600">
                                        {Number(formData.location.latitude).toFixed(6)}, {Number(formData.location.longitude).toFixed(6)}
                                    </span>
                                ) : 'Location not captured'}
                            </div>
                            <button
                                type="button"
                                onClick={handleGetLocation}
                                disabled={fetchingLocation}
                                className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 shadow-sm hover:shadow text-indigo-600 text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all"
                            >
                                {fetchingLocation ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                                {formData.location.latitude ? 'Update GPS' : 'Capture GPS'}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 my-6"></div>

                    {/* Contact Person Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <User size={14} /> Contact Person
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                                <label className="label">Name *</label>
                                <input
                                    required
                                    className="input-field"
                                    placeholder="Full Name"
                                    value={formData.contactPerson.name}
                                    onChange={e => setFormData({ ...formData, contactPerson: { ...formData.contactPerson, name: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="label">Designation</label>
                                <input
                                    className="input-field"
                                    placeholder="e.g. Secretary / President"
                                    value={formData.contactPerson.designation}
                                    onChange={e => setFormData({ ...formData, contactPerson: { ...formData.contactPerson, designation: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="label">Phone Number *</label>
                                <input
                                    required
                                    type="tel"
                                    className="input-field"
                                    placeholder="10-digit mobile"
                                    value={formData.contactPerson.phone}
                                    onChange={e => setFormData({ ...formData, contactPerson: { ...formData.contactPerson, phone: e.target.value } })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 my-6"></div>

                    {/* Additional Info */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={14} /> Details
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="label"> Collection Done this years</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="e.g. 5"
                                    value={formData.yearsOfCollection}
                                    onChange={e => setFormData({ ...formData, yearsOfCollection: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label">Remarks</label>
                                <textarea
                                    className="input-field h-24 resize-none py-2"
                                    placeholder="Any other relevant details..."
                                    value={formData.remarks}
                                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/field-data')}
                            className="flex-1 py-4 btn-secondary text-slate-500 font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (isEditMode && formData.isLocked)}
                            className="flex-[2] py-4 btn-primary bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 text-lg flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            {isEditMode ? 'Update Data' : 'Save Entry'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
