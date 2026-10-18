import { useState, useEffect } from 'react';
import { teamService, settlementService } from '../services/api';
import TeamSelect from '../components/TeamSelect';
import { Scale, ShieldAlert, Lock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { confirmAction, MySwal } from '../utils/swal';

export default function Settlement() {
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [team, setTeam] = useState(null);
  const [expense, setExpense] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedTeamId) {
      teamService.getById(selectedTeamId).then(res => {
        setTeam(res.data);
        setExpense(res.data.expense || 0);
      });
    } else {
      setTeam(null);
    }
  }, [selectedTeamId]);

  const balance = (team?.totalCollection || 0) + (team?.advanceAmount || 0) - Number(expense);
  const status = balance >= 0 ? 'SETTLED' : 'SHORTAGE';

  const handleFinalize = async () => {
    const confirmed = await confirmAction({
      title: "Finalize Settlement?",
      text: "Once finalized, this team's record will be locked for audit safety and cannot be edited. Proceed?",
      confirmText: "Finalize & Lock",
      variant: "warning"
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      await settlementService.finalize(selectedTeamId, { expense: Number(expense) });
      await MySwal.fire({
        title: 'Settled!',
        text: 'Record has been successfully locked for audit.',
        icon: 'success',
        confirmButtonText: 'Great!',
        timer: 2000
      });
      navigate('/');
    } catch (err) {
      console.error(err);
      MySwal.fire('Error', 'Failed to finalize settlement', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="p-2.5 sm:p-3 bg-amber-600 text-white rounded-2xl shadow-lg shrink-0">
          <Scale size={24} />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Final Settlement</h1>
      </div>

      <div className="glass-card p-4 sm:p-8 border-none bg-white mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl shadow-sm">
        <TeamSelect selectedId={selectedTeamId} onSelect={setSelectedTeamId} filterLocked={true} />
      </div>

      {team && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="glass-card p-5 sm:p-6 border-none bg-indigo-50/50 rounded-2xl">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-1">Total Collection</span>
              <span className="text-xl sm:text-2xl font-black text-indigo-900">₹{team.totalCollection.toLocaleString()}</span>
            </div>
            <div className="glass-card p-5 sm:p-6 border-none bg-slate-50 rounded-2xl">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Financial Data</span>
              <div className="text-xs sm:text-sm font-medium text-slate-600">
                Advance: ₹{(team.advanceAmount || 0).toLocaleString()}<br />
                Cash: ₹{team.cashAmount.toLocaleString()}<br />
                Bank: ₹{team.bankAmount.toLocaleString()}
              </div>
            </div>
            <div className="glass-card p-5 sm:p-6 border-none bg-white shadow-sm ring-1 ring-slate-100 rounded-2xl sm:col-span-2 md:col-span-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Status Forecast</span>
              <span className={`text-lg sm:text-xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {status}
              </span>
            </div>
          </div>

          <div className="glass-card p-4 sm:p-8 border-none bg-white rounded-2xl sm:rounded-3xl shadow-sm">
            <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-slate-800">Expense & Final Calculation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-end">
              <div>
                <label className="label">Total Expense (₹)</label>
                <input
                  type="number"
                  onWheel={e => e.target.blur()}
                  className="input-field text-xl sm:text-2xl font-bold border-amber-200 focus:ring-amber-500"
                  value={expense}
                  onChange={e => setExpense(e.target.value)}
                  placeholder="0"
                />
                <p className="mt-2 text-xs sm:text-sm text-slate-400 italic">Enter the single total expense amount for the team.</p>
              </div>
              <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl flex flex-col items-start md:items-end shadow-xl">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Final Balance (Handover)</span>
                <span className={`text-2xl sm:text-4xl font-black ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ₹{balance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-100 p-4 sm:p-6 rounded-2xl flex items-start gap-3 sm:gap-4">
            <div className="p-2 bg-rose-500 text-white rounded-lg shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-rose-900">Audit Safety Protocol</h4>
              <p className="text-rose-700 text-xs sm:text-sm mt-1 leading-relaxed">
                Clicking "Finalize & Lock" will mark this team as settled.
                <strong> All collection entries, receipt books, and expenses will become read-only.</strong>
                This action is irreversible to ensure audit safety and prevent data tampering.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
            <button type="button" onClick={() => navigate('/')} className="w-full sm:w-auto btn-secondary px-6 sm:px-8 py-3 text-xs sm:text-sm font-bold">Cancel</button>
            <button
              onClick={handleFinalize}
              disabled={loading}
              className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 px-8 sm:px-10 py-3 bg-slate-900 hover:bg-black shadow-slate-200 text-xs sm:text-sm font-bold"
            >
              <Lock size={18} /> {loading ? 'Finalizing...' : 'Finalize & Lock Record'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
