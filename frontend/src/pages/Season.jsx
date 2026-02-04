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
            <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Season Management</h1>

            <div className="glass-card p-6 mb-8 border-none bg-white">
                <h2 className="text-lg font-bold mb-4">Create New Season</h2>
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
                    <div key={season._id} className={`glass-card p-6 border-none flex mt-2 justify-between items-center transition-all ${season.isActive ? 'bg-indigo-50/50 ring-2 ring-indigo-500' : 'bg-white'}`}>
                        <div>
                            <h3 className={`text-xl font-bold ${season.isActive ? 'text-indigo-900' : 'text-slate-800'}`}>
                                {season.name}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Created on: {new Date(season.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        {season.isActive ? (
                            <span className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-100 px-4 py-2 rounded-full">
                                <CheckCircle size={18} /> Active Season
                            </span>
                        ) : (
                            <button onClick={() => handleActivate(season._id, season.name)} className="btn-secondary flex items-center gap-2 hover:bg-slate-100">
                                <Circle size={18} /> Set as Active
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
