import { useState, useEffect } from 'react';
import { seasonService } from '../services/api';
import { Plus, CheckCircle, Circle } from 'lucide-react';
import { confirmAction } from '../utils/swal';

export default function Season() {
    const [seasons, setSeasons] = useState([]);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSeasons();
    }, []);

    const fetchSeasons = async () => {
        try {
            const res = await seasonService.getAll();
            setSeasons(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name) return;
        setLoading(true);
        try {
            await seasonService.create({ name });
            setName('');
            fetchSeasons();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (id, seasonName) => {
        const confirmed = await confirmAction({
            title: "Activate Season?",
            text: `Are you sure you want to activate "${seasonName}"? This will deactivate the current active season.`,
            confirmText: "Activate Now",
            variant: "info"
        });

        if (confirmed) {
            try {
                await seasonService.activate(id);
                fetchInitialData ? fetchInitialData() : fetchSeasons();
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-10">
                <h1 className="text-2xl font-bold text-[#0F3B66] tracking-tight">Season Management</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">Configure and manage operational collection years</p>
            </div>

            <div className="glass-card p-6 mb-8 border-none bg-white shadow-sm">
                <h2 className="text-lg font-bold mb-4 text-[#0F3B66]">Register New Season</h2>
                <form onSubmit={handleCreate} className="flex gap-4">
                    <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Ramadan 2026"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 whitespace-nowrap">
                        <Plus size={18} /> Create Season
                    </button>
                </form>
            </div>

            <div className="space-y-4">
                {seasons.map((season) => (
                    <div key={season._id} className={`glass-card p-6 border-none flex mt-2 justify-between items-center transition-all ${season.isActive ? 'bg-[#E6F0FA]/50 ring-2 ring-[#1E5FA8]' : 'bg-white shadow-sm'}`}>
                        <div>
                            <h3 className={`text-xl font-bold ${season.isActive ? 'text-[#0F3B66]' : 'text-slate-800'}`}>
                                {season.name}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                REGISTRATION DATE: {new Date(season.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        {season.isActive ? (
                            <span className="flex items-center gap-2 text-[#1E5FA8] font-bold bg-[#E6F0FA] px-4 py-2 rounded-xl">
                                <CheckCircle size={18} /> Active Unit
                            </span>
                        ) : (
                            <button onClick={() => handleActivate(season._id, season.name)} className="btn-secondary flex items-center gap-2 text-sm">
                                <Circle size={18} /> Activate
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
