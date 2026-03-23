import { useState, useEffect, useMemo } from 'react';
import { teamService, seasonService, settlementService, depositService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Printer, Filter, Banknote, Coins, Wallet, CheckCircle2, AlertCircle, Save, Lock, ArrowUpDown, LayoutGrid, History, Send, Landmark, Trash2, Boxes, HandCoins
} from 'lucide-react';
import { confirmAction, MySwal } from '../utils/swal';

// --- Denomination Master ---
const DENOMS = [
    { key: 'note_500', value: 500, label: '₹500', type: 'note' },
    { key: 'note_200', value: 200, label: '₹200', type: 'note' },
    { key: 'note_100', value: 100, label: '₹100', type: 'note' },
    { key: 'note_50', value: 50, label: '₹50', type: 'note' },
    { key: 'note_20', value: 20, label: '₹20', type: 'note' },
    { key: 'note_10', value: 10, label: '₹10', type: 'note' },
    { key: 'note_5', value: 5, label: '₹5', type: 'note' },
    { key: 'coin_20', value: 20, label: '₹20', type: 'coin' },
    { key: 'coin_10', value: 10, label: '₹10', type: 'coin' },
    { key: 'coin_5', value: 5, label: '₹5', type: 'coin' },
    { key: 'coin_2', value: 2, label: '₹2', type: 'coin' },
    { key: 'coin_1', value: 1, label: '₹1', type: 'coin' },
];

const NOTE_DENOMS = DENOMS.filter(d => d.type === 'note');
const COIN_DENOMS = DENOMS.filter(d => d.type === 'coin');
const ALL_DENOMS = DENOMS;

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

export default function DenominationReport() {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState('');
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [teamData, setTeamData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Office State
    const [deposits, setDeposits] = useState([]);
    const [depositCounts, setDepositCounts] = useState(Object.fromEntries(ALL_DENOMS.map(d => [d.key, ''])));
    
    // Individual Team state
    const [counts, setCounts] = useState(Object.fromEntries(ALL_DENOMS.map(d => [d.key, ''])));

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role === 'admin';

    useEffect(() => {
        seasonService.getAll().then(res => {
            const active = res.data.find(s => s.isActive);
            if (active) setSelectedSeason(active._id);
            setSeasons(res.data);
        });
    }, []);

    useEffect(() => {
        if (selectedSeason) {
            setLoading(true);
            Promise.all([
                teamService.getAll(selectedSeason),
                depositService.getAll(selectedSeason)
            ]).then(([teamsRes, depositsRes]) => {
                setTeams(teamsRes.data);
                // Handle Map/Object conversion for breakdown if needed
                const normalizedDeposits = depositsRes.data.map(d => ({
                    ...d,
                    breakdown: d.breakdown instanceof Map ? Object.fromEntries(d.breakdown) : (d.breakdown || {})
                }));
                setDeposits(normalizedDeposits);
            }).finally(() => setLoading(false));
        }
    }, [selectedSeason]);

    useEffect(() => {
        if (selectedTeamId) {
            setLoading(true);
            teamService.getById(selectedTeamId).then(res => {
                setTeamData(res.data);
                const rawCounts = res.data.denominationCounts instanceof Map ? Object.fromEntries(res.data.denominationCounts) : (res.data.denominationCounts || {});
                const newCounts = Object.fromEntries(ALL_DENOMS.map(d => [d.key, rawCounts[d.key] || '']));
                setCounts(newCounts);
            }).finally(() => setLoading(false));
        } else {
            setTeamData(null);
        }
    }, [selectedTeamId]);

    // --- Core Audit Logic (Fixing consistency for Grand Total) ---
    const officeInventory = useMemo(() => {
        const receivedCounts = Object.fromEntries(ALL_DENOMS.map(d => [d.key, 0]));
        let totalAdvancesGiven = 0;

        teams.forEach(t => {
            totalAdvancesGiven += (t.advanceAmount || 0);
            if (t.denominationCounts) {
                const raw = t.denominationCounts instanceof Map ? Object.fromEntries(t.denominationCounts) : t.denominationCounts;
                ALL_DENOMS.forEach(d => receivedCounts[d.key] += (Number(raw[d.key]) || 0));
            }
        });

        // Sum of all denominations received
        const receivedValue = ALL_DENOMS.reduce((acc, d) => acc + (receivedCounts[d.key] * d.value), 0);

        const depositedCounts = Object.fromEntries(ALL_DENOMS.map(d => [d.key, 0]));
        deposits.forEach(d => {
            ALL_DENOMS.forEach(denom => depositedCounts[denom.key] += (Number(d.breakdown?.[denom.key]) || 0));
        });

        // Sum of all denominations deposited
        const depositedValue = ALL_DENOMS.reduce((acc, d) => acc + (depositedCounts[d.key] * d.value), 0);

        // Core remaining inventory
        const remainingCounts = Object.fromEntries(ALL_DENOMS.map(d => [d.key, (receivedCounts[d.key] - depositedCounts[d.key])]));
        
        // --- IMPORTANT: Calculate Grand Total solely from remaining denominations to ensure table consistency ---
        const remainingValue = ALL_DENOMS.reduce((acc, d) => acc + (remainingCounts[d.key] * d.value), 0);

        return {
            received: { val: receivedValue, denoms: receivedCounts },
            deposited: { val: depositedValue, denoms: depositedCounts },
            advances: totalAdvancesGiven,
            remaining: { val: remainingValue, denoms: remainingCounts }
        };
    }, [teams, deposits]);

    const activeEntryTotal = useMemo(() => ALL_DENOMS.reduce((acc, d) => acc + (Number(selectedTeamId ? counts[d.key] : depositCounts[d.key]) || 0) * d.value, 0), [selectedTeamId, counts, depositCounts]);
    const teamDiff = activeEntryTotal - (teamData?.cashAmount || 0);

    const handleCountChange = (key, val, mode) => {
        if (val === '' || (Number(val) >= 0 && Number.isInteger(Number(val)))) {
            if (mode === 'office') setDepositCounts(prev => ({ ...prev, [key]: val }));
            else { if (!(teamData?.isLocked && !isAdmin)) setCounts(prev => ({ ...prev, [key]: val })); }
        }
    };

    const handleTeamSync = async () => {
        if (!selectedTeamId || (teamData?.isLocked && !isAdmin)) return;
        const confirmed = await confirmAction({ title: "Sync Audit?", text: `Reconcile ₹${fmt(activeEntryTotal)}?`, confirmText: "Sync", variant: "success" });
        if (!confirmed) return;
        setIsSaving(true);
        try {
            await settlementService.submitCollection(selectedTeamId, { ...teamData, cashAmount: activeEntryTotal, denominationCounts: counts });
            MySwal.fire({ title: 'Success', icon: 'success', timer: 1500, showConfirmButton: false });
            const res = await teamService.getById(selectedTeamId);
            setTeamData(res.data);
            const teamsRes = await teamService.getAll(selectedSeason);
            setTeams(teamsRes.data);
        } catch (err) { MySwal.fire('Error', 'Update failed', 'error'); }
        finally { setIsSaving(false); }
    };

    const handleOfficeDeposit = async () => {
        if (activeEntryTotal === 0) return;
        const confirmed = await confirmAction({ title: "Finalize Deposit?", text: `Deposit ₹${fmt(activeEntryTotal)} to bank?`, confirmText: "Confirm", variant: "info" });
        if (!confirmed) return;
        
        setIsSaving(true);
        try {
            const res = await depositService.create({
                season: selectedSeason,
                amount: activeEntryTotal,
                date: new Date().toISOString(),
                breakdown: depositCounts
            });
            
            const newDeposit = {
                ...res.data,
                breakdown: res.data.breakdown instanceof Map ? Object.fromEntries(res.data.breakdown) : (res.data.breakdown || {})
            };
            
            setDeposits(prev => [newDeposit, ...prev]);
            setDepositCounts(Object.fromEntries(ALL_DENOMS.map(d => [d.key, ''])));
            MySwal.fire({ title: 'Deposited', icon: 'success', timer: 1500, showConfirmButton: false });
        } catch (err) {
            MySwal.fire('Error', 'Deposit failed', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const removeDeposit = async (id) => {
        const confirmed = await confirmAction({ title: "Revoke?", text: "Restore vault counts?", confirmText: "Delete", variant: "warning" });
        if (confirmed) {
            try {
                await depositService.delete(id);
                setDeposits(prev => prev.filter(d => d._id !== id));
                MySwal.fire({ title: 'Revoked', icon: 'success', timer: 1500, showConfirmButton: false });
            } catch (err) {
                MySwal.fire('Error', 'Failed to delete', 'error');
            }
        }
    };

    const renderRows = (group, countsMap, mode) => group.map(d => {
        const remaining = officeInventory.remaining.denoms[d.key];
        const isOfficeMode = !selectedTeamId;
        return (
            <div key={d.key} className="relative flex flex-col gap-1 py-4 border-b border-slate-50 last:border-0 group">
                <div className="flex items-center gap-4">
                    <div className="w-16 md:w-20"><span className="text-sm font-black text-slate-400 group-hover:text-slate-900 transition-colors">{d.label.replace('₹','')}</span></div>
                    <div className="flex-1">
                        <div className="relative">
                            <input type="number" min="0" className="w-full border rounded-lg px-4 py-3 text-sm font-black transition-all outline-none bg-slate-50 border-slate-100 text-[#0F3B66] focus:bg-white focus:border-[#1E5FA8]" value={countsMap[d.key]} onChange={(e) => handleCountChange(d.key, e.target.value, mode)} />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300"></div>
                        </div>
                    </div>
                    <div className="w-24 md:w-32 text-right"><span className="text-xs font-medium text-slate-400">₹</span><span className="text-base font-black text-slate-900 ml-1">{fmt((Number(countsMap[d.key]) || 0) * d.value)}</span></div>
                </div>
                {isOfficeMode && (
                    <div className="flex justify-between items-center ml-16 md:ml-20 mt-1">
                        <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${remaining > 0 ? 'bg-emerald-400' : 'bg-slate-200'}`}></div>
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">In Safe: <span className={`${remaining > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{remaining}</span></span>
                        </div>
                    </div>
                )}
            </div>
        );
    });

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans print:bg-white print:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="print:hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-5">
                            <button onClick={() => navigate('/reports')} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-[#0F3B66] transition-all"><ArrowLeft size={20} /></button>
                            <div>
                                <h1 className="text-3xl font-black text-[#0F3B66] tracking-tight">Denomination Report</h1>
                                <p className="text-sm font-medium text-slate-500 mt-0.5 uppercase tracking-widest flex items-center gap-2"><Boxes size={14} /> Comprehensive Cash Controls</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative group min-w-[140px]">
                                <select className="input-field py-2.5 text-[10px] pr-8" value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)}>
                                    {seasons.map(s => <option key={s._id} value={s._id}>{s.name} {s.isActive ? 'ACTIVE' : ''}</option>)}
                                </select>
                            </div>
                            <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 bg-[#1E5FA8]"><Printer size={18} /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 border-l-4 border-l-[#1E5FA8]">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Received (Handovers)</p>
                            <h3 className="text-2xl font-black text-[#0F3B66]">₹{fmt(officeInventory.received.val)}</h3>
                        </div>
                        <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 border-l-4 border-l-[#F59E0B]">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Advances Distribution</p>
                            <h3 className="text-2xl font-black text-[#F59E0B]">₹{fmt(officeInventory.advances)}</h3>
                        </div>
                        <div className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Deposited to Bank</p>
                            <h3 className="text-2xl font-black text-emerald-600">₹{fmt(officeInventory.deposited.val)}</h3>
                        </div>
                        <div className="bg-[#0F3B66] p-7 rounded-[2rem] shadow-xl shadow-[#0F3B66]/20 transition-all duration-300">
                            <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-2">Grand Total Safe Balance</p>
                            <h3 className="text-2xl font-black text-white">₹{fmt(officeInventory.remaining.val)}</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Workflow Focus</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-[#0F3B66]" value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>
                                    <option value="">Central Vault Management</option>
                                    {teams.map(t => <option key={t._id} value={t._id}>{t.isLocked ? '🔒' : '🕒'} {t.placeName}</option>)}
                                </select>
                            </div>

                            {!selectedTeamId && (
                                <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2"><History size={16} /> Audit Record Log</h3>
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {deposits.length === 0 ? <div className="text-center py-10 text-slate-300 italic text-sm">Waiting for entries...</div> : deposits.map(d => (
                                            <div key={d._id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">{new Date(d.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                    <p className="text-sm font-black text-[#0F3B66]">₹{fmt(d.amount)}</p>
                                                </div>
                                                <button onClick={() => removeDeposit(d._id)} className="p-2 text-slate-200 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-8">
                            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                                <div className="p-8 md:p-10">
                                    <h2 className="text-2xl font-black text-[#0F3B66] mb-10 flex items-center gap-4">
                                        <div className={`p-4 rounded-2xl ${selectedTeamId ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-[#1E5FA8]'}`}><Landmark size={24} /></div>
                                        <div>{selectedTeamId ? `Team Audit: ${teamData?.placeName}` : 'Physical Denomination Entry'}<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory Reconcilation</p></div>
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                        <div>
                                            <div className="pb-2 mb-4 border-b border-slate-100 flex items-center gap-2"><Banknote size={16} className="text-slate-300" /><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paper Notes</h4></div>
                                            {renderRows(NOTE_DENOMS, selectedTeamId ? counts : depositCounts, selectedTeamId ? 'team' : 'office')}
                                        </div>
                                        <div>
                                            <div className="pb-2 mb-4 border-b border-slate-100 flex items-center gap-2"><Coins size={16} className="text-slate-300" /><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vault Coins</h4></div>
                                            {renderRows(COIN_DENOMS, selectedTeamId ? counts : depositCounts, selectedTeamId ? 'team' : 'office')}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-8 md:p-10 border-t border-slate-100">
                                    <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                                        <div className="flex flex-wrap gap-10">
                                            {selectedTeamId ? (
                                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Status</p><p className={`text-2xl font-black ${teamDiff === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{teamDiff === 0 ? 'SYNCHRONIZED' : `${teamDiff > 0 ? '+' : ''}${fmt(teamDiff)}`}</p></div>
                                            ) : (
                                                <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Post-Deposit Vault Balance</p><p className="text-2xl font-black text-[#1E5FA8]">₹{fmt(officeInventory.remaining.val - activeEntryTotal)}</p></div>
                                            )}
                                        </div>
                                        <button
                                            onClick={selectedTeamId ? handleTeamSync : handleOfficeDeposit}
                                            disabled={isSaving || (selectedTeamId ? (teamData?.isLocked && !isAdmin) : activeEntryTotal === 0)}
                                            className={`flex items-center justify-center gap-3 px-12 py-5 rounded-[2rem] font-bold text-sm shadow-xl transition-all ${selectedTeamId ? ((teamData?.isLocked && !isAdmin) ? 'bg-emerald-50 text-emerald-600 shadow-none' : 'bg-[#1E5FA8] text-white hover:bg-[#0F3B66]') : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'} disabled:opacity-50`}
                                        >
                                             {selectedTeamId ? (teamData?.isLocked && !isAdmin ? <><CheckCircle2 size={18} /> Verified</> : <><Send size={18} /> Sync Counts</>) : <><Landmark size={18} /> Finalize Deposit</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── CLEAN PRINT REPORT (Consistently Calculated Sum) ── */}
                <div className="hidden print:block font-serif">
                    <br />
                    <br />
                    <br />
                    <br />

                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-300 text-slate-900 uppercase tracking-widest text-[9px]">
                                <th className="py-2 text-left px-2">Denomination</th>
                                <th className="py-2 text-center">Remaining Count</th>
                                <th className="py-2 text-right px-2">Total Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {ALL_DENOMS.map(d => {
                                const count = officeInventory.remaining.denoms[d.key];
                                if (count === 0) return null;
                                return (
                                    <tr key={d.key} className="text-slate-900">
                                        <td className="py-4 px-2 font-bold text-sm">{d.label}</td>
                                        <td className="py-4 text-center font-bold text-sm">{fmt(count)}</td>
                                        <td className="py-4 px-2 text-right font-black text-sm">₹{fmt(count * d.value)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-4 border-double border-slate-900">
                                <td colSpan="2" className="py-10 px-2 text-right">
                                    <span className="text-lg font-black uppercase italic text-slate-900">Grand Total </span>
                                </td>
                                <td className="py-10 px-2 text-right">
                                    <span className="text-3xl font-black text-slate-900 border-b-2 border-slate-900 pb-1">₹{fmt(officeInventory.remaining.val)}</span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="mt-20 flex justify-between items-end px-2">
                       </div>
                </div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `@media print { @page { size: portrait; margin: 1.5cm; } body { background: white !important; } .print\\:hidden { display: none !important; } .print\\:block { display: block !important; } } .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}} />
        </div>
    );
}