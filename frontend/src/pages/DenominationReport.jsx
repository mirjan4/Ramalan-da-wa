import { useState, useEffect, useMemo } from 'react';
import { teamService, seasonService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Printer, Filter
} from 'lucide-react';

const NOTE_DENOMS = [
    { key: 'note_500', value: 500, label: '500' },
    { key: 'note_200', value: 200, label: '200' },
    { key: 'note_100', value: 100, label: '100' },
    { key: 'note_50', value: 50, label: '50' },
    { key: 'note_20', value: 20, label: '20' },
    { key: 'note_10', value: 10, label: '10' },
    { key: 'note_5', value: 5, label: '5' },
];

const COIN_DENOMS = [
    { key: 'coin_20', value: 20, label: '20' },
    { key: 'coin_10', value: 10, label: '10' },
    { key: 'coin_5', value: 5, label: '5' },
    { key: 'coin_2', value: 2, label: '2' },
    { key: 'coin_1', value: 1, label: '1' },
];

const ALL_DENOMS = [...NOTE_DENOMS, ...COIN_DENOMS];
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

export default function DenominationReport() {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [loadingTeams, setLoadingTeams] = useState(false);

    useEffect(() => {
        seasonService.getAll().then(res => {
            setSeasons(res.data);
            const active = res.data.find(s => s.isActive);
            if (active) setSelectedSeason(active._id);
        }).catch(err => console.error('Failed to fetch seasons:', err));
    }, []);

    useEffect(() => {
        if (selectedSeason) {
            setLoadingTeams(true);
            teamService.getAll(selectedSeason)
                .then(res => setTeams(res.data))
                .finally(() => setLoadingTeams(false));
            setSelectedTeamId(''); // Reset team when season changes
        }
    }, [selectedSeason]);

    const aggregatedCounts = useMemo(() => {
        const totals = Object.fromEntries(ALL_DENOMS.map(d => [d.key, 0]));
        const sourceTeams = selectedTeamId
            ? teams.filter(t => t._id === selectedTeamId)
            : teams;

        sourceTeams.forEach(team => {
            if (team.denominationCounts) {
                Object.entries(team.denominationCounts).forEach(([key, count]) => {
                    if (totals.hasOwnProperty(key)) totals[key] += (Number(count) || 0);
                });
            }
        });
        return totals;
    }, [teams, selectedTeamId]);

    const noteRows = NOTE_DENOMS.map(d => ({
        ...d,
        count: aggregatedCounts[d.key] || 0,
        amount: d.value * (aggregatedCounts[d.key] || 0),
    }));

    const coinRows = COIN_DENOMS.map(d => ({
        ...d,
        count: aggregatedCounts[d.key] || 0,
        amount: d.value * (aggregatedCounts[d.key] || 0),
    }));

    const noteTotal = noteRows.reduce((s, r) => s + r.amount, 0);
    const coinTotal = coinRows.reduce((s, r) => s + r.amount, 0);
    const grandTotal = noteTotal + coinTotal;

    return (
        <div className="h-[100dvh] bg-white font-sans text-slate-900 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 md:px-8 py-6 md:py-10 overflow-hidden">

                {/* ── Header (Hidden on Print) ── */}
                <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-10 print:hidden">
                    <div className="flex items-start gap-4">
                        <button
                            onClick={() => navigate('/reports')}
                            className="group p-2.5 rounded-full border border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-900 transition-all mt-1 md:mt-0"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-light text-slate-900 tracking-tight">Denomination Analysis</h1>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Audit Summary</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group flex-1 md:flex-none">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-slate-500 transition-colors" size={14} />
                            <select
                                className="w-full md:w-auto pl-9 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest outline-none focus:bg-white focus:border-slate-300 transition-all appearance-none cursor-pointer"
                                value={selectedSeason}
                                onChange={e => setSelectedSeason(e.target.value)}
                            >
                                {seasons.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} {s.isActive ? 'ACTIVE' : ''}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative group flex-1 md:flex-none">
                            <select
                                className="w-full md:w-auto pl-4 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest outline-none focus:bg-white focus:border-slate-300 transition-all appearance-none cursor-pointer"
                                value={selectedTeamId}
                                onChange={e => setSelectedTeamId(e.target.value)}
                            >
                                <option value="">All Teams (Consolidated)</option>
                                {teams.map(t => (
                                    <option key={t._id} value={t._id}>{t.placeName} ({t.state})</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => window.print()}
                            className="p-2 border border-slate-900 text-slate-900 rounded-lg hover:bg-slate-900 hover:text-white transition-all"
                        >
                            <Printer size={16} />
                        </button>
                    </div>
                </div>

                {/* ── Stats Row (Static) ── */}
                <div id="report-summary" className="flex-none grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 mb-8 print:hidden">
                    <div className="border-l border-slate-100 pl-4 py-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Currency</p>
                        <p className="text-lg md:text-xl font-light text-slate-900">₹{fmt(noteTotal)}</p>
                    </div>
                    <div className="border-l border-slate-100 pl-4 py-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Coins</p>
                        <p className="text-lg md:text-xl font-light text-slate-900">₹{fmt(coinTotal)}</p>
                    </div>
                </div>

                {/* ── Scrollable Area (The Table) ── */}
                <div className="flex-1 overflow-y-auto pr-2 -mr-2 scrollbar-hide print:overflow-visible print:pr-0 print:mr-0">
                    <div className="space-y-10">
                        {/* Print Header (Only visible when printing) */}
                        <div className="hidden print:block mb-6">
                            <h1 className="text-xl font-bold">Denomination Report</h1>
                            <p className="text-sm text-slate-500">{seasons.find(s => s._id === selectedSeason)?.name}</p>
                        </div>

                        <table className="w-full border-collapse">
                            <thead>
                                <tr id="report-table" className="border-b border-slate-100 italic">
                                    <th className="pb-4 text-left text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Unit</th>
                                    <th className="pb-4 text-center text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Inv</th>
                                    <th className="pb-4 text-right text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                <tr id="denom-notes" className="bg-slate-50/30"><td colSpan={3} className="py-3 px-2 text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Notes</td></tr>
                                {noteRows.map(row => (
                                    <tr key={row.key} className="group">
                                        <td className="py-4 md:py-6 px-2"><span className="text-base md:text-lg font-light text-slate-900">{row.label}</span></td>
                                        <td className="py-4 md:py-6 text-center font-light text-slate-600 text-sm">{row.count}</td>
                                        <td className="py-4 md:py-6 text-right font-light text-slate-900 text-base md:text-lg">₹{fmt(row.amount)}</td>
                                    </tr>
                                ))}
                                <tr id="denom-coins" className="bg-slate-50/30"><td colSpan={3} className="py-3 px-2 text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Coins</td></tr>
                                {coinRows.map(row => (
                                    <tr key={row.key} className="group">
                                        <td className="py-4 md:py-6 px-2"><span className="text-base md:text-lg font-light text-slate-900">₹{row.label}</span></td>
                                        <td className="py-4 md:py-6 text-center font-light text-slate-600 text-sm">{row.count}</td>
                                        <td className="py-4 md:py-6 text-right font-light text-slate-900 text-base md:text-lg">₹{fmt(row.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Grand Total (Fixed Bottom) ── */}
                <div className="flex-none pt-6 border-t-2 border-slate-900 mt-4 print:mt-10">
                    <div className="flex flex-row justify-between items-end mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">Grand Total</p>
                        </div>
                        <p className="text-4xl md:text-3xl font-light text-slate-900 tracking-tighter">
                            <span className="text-xl md:text-2xl mr-1 text-slate-300">₹</span>{fmt(grandTotal)}
                        </p>
                    </div>
                </div>
            </div>

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