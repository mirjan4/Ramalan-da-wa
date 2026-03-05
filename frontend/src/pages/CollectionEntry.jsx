import { useState, useEffect } from 'react';
import { teamService, settlementService } from '../services/api';
import TeamSelect from '../components/TeamSelect';
import { Calculator, Save, AlertCircle, Scale, Printer, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MySwal } from '../utils/swal';
import PrintContainer from '../components/print/PrintContainer';
import PrintHeader from '../components/print/PrintHeader';
import TeamMembersSection from '../components/print/TeamMembersSection';
import ReceiptBookDetails from '../components/print/ReceiptBookDetails';
import CollectionSummary from '../components/print/CollectionSummary';
import PrintFooter from '../components/print/PrintFooter';

export default function CollectionEntry() {
  const [searchParams] = useSearchParams();
  const [selectedTeamId, setSelectedTeamId] = useState(searchParams.get('teamId') || '');
  const [team, setTeam] = useState(null);
  const [receiptBooks, setReceiptBooks] = useState([]);
  const [cashAmount, setCashAmount] = useState(0);
  const [cashRef, setCashRef] = useState('');
  const [bankAmount, setBankAmount] = useState(0);
  const [bankRef, setBankRef] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [expense, setExpense] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const [manualExpense, setManualExpense] = useState(false);

  useEffect(() => {
    if (selectedTeamId) {
      teamService.getById(selectedTeamId).then(res => {
        const teamData = res.data;
        const initializedBooks = (teamData.receiptBooks || []).map(book => ({
          ...book,
          usedStartPage: book.usedStartPage || (book.bookNumber * 50 - 49),
          usedEndPage: book.usedEndPage || (book.bookNumber * 50),
          collectedAmount: book.collectedAmount || 0
        })).sort((a, b) => Number(a.bookNumber) - Number(b.bookNumber));
        setTeam(teamData);
        setReceiptBooks(initializedBooks);
        setCashAmount(teamData.cashAmount || 0);
        setCashRef(teamData.cashRef || '');
        setBankAmount(teamData.bankAmount || 0);
        setBankRef(teamData.bankRef || '');
        setAdvanceAmount(teamData.advanceAmount || 0);

        if (teamData.expense) {
          setExpense(teamData.expense);
          setManualExpense(true);
        } else {
          // Initial calculation for new entries
          const total = initializedBooks.reduce((acc, book) => acc + (Number(book.collectedAmount) || 0), 0);
          setExpense(Math.round(total * 0.25));
        }
      });
    }
  }, [selectedTeamId]);

  const updateBookEntry = (index, field, value) => {
    const updated = [...receiptBooks];
    updated[index][field] = value;

    // Auto-sync logic: If amount is 0, End Page = Start Page
    if (field === 'collectedAmount' && (Number(value) === 0 || value === '')) {
      updated[index].usedEndPage = updated[index].usedStartPage;
    } else if (field === 'usedStartPage' && (Number(updated[index].collectedAmount) === 0)) {
      updated[index].usedEndPage = value;
    }

    setReceiptBooks(updated);
  };

  const removeBookRow = async (index, bookNumber) => {
    const book = receiptBooks[index];
    if (Number(book.collectedAmount) > 0) {
      return MySwal.fire('Cannot Remove', 'This book has a recorded collection amount. Clear the amount first if you wish to unassign it.', 'warning');
    }

    const confirmed = await MySwal.fire({
      title: `Unassign Book #${bookNumber}?`,
      text: "This will remove the book from this team's temporary settlement list. You must click 'Save & Update' to permanently unassign it.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Keep it'
    });

    if (confirmed.isConfirmed) {
      setReceiptBooks(prev => prev.filter((_, i) => i !== index));
    }
  };

  const totalCalculated = receiptBooks.reduce((acc, book) => acc + (Number(book.collectedAmount) || 0), 0);
  const suggestedExpense = Math.round(totalCalculated * 0.25);
  const breakupTotal = Number(cashAmount) + Number(bankAmount);
  const balance = totalCalculated + Number(advanceAmount) - Number(expense);
  const isBalanced = breakupTotal === balance;
  const status = balance >= 0 ? 'SETTLED' : 'SHORTAGE';

  const handleExpenseChange = (val) => {
    setExpense(val);
    setManualExpense(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isBalanced) return MySwal.fire({
      title: 'Balance Mismatch',
      text: 'Final Net Balance must equal Cash + Bank total.',
      icon: 'warning'
    });

    setLoading(true);
    try {
      await settlementService.finalizeComplete(selectedTeamId, {
        receiptBooks,
        cashAmount: Number(cashAmount),
        cashRef,
        bankAmount: Number(bankAmount),
        bankRef,
        expense: Number(expense)
      });
      await MySwal.fire({
        title: 'Settlement Saved!',
        text: 'The team records have been updated and synchronized.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      navigate('/reports');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.message;
      MySwal.fire('Error', 'Failed to save settlement: ' + msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const advanceAdjustment = Number(expense) - Number(advanceAmount);
  const adjType = advanceAdjustment >= 0 ? '(Payable)' : '(Recoverable)';
  const netProfit = totalCalculated - Number(expense);
  const diff = netProfit - breakupTotal;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#1E5FA8] text-white rounded-2xl shadow-lg">
            <Scale size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F3B66] tracking-tight">Settlement Finalization</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">Audit team collections and operational expenses</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="btn-secondary flex items-center gap-2 px-5 py-2.5"
        >
          <Printer size={18} />
        </button>
      </div>

      <div className="glass-card p-8 border-none bg-white mb-8 print:hidden">
        <TeamSelect selectedId={selectedTeamId} onSelect={setSelectedTeamId} filterLocked={false} />
      </div>

      {team?.isLocked && !isAdmin && (
        <div className="p-4 rounded-2xl mb-8 flex items-center justify-between shadow-sm animate-pulse bg-rose-50 border border-rose-200 text-rose-700">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <div>
              <p className="font-black text-sm uppercase tracking-wider">Settlement Locked</p>
              <p className="text-xs font-bold opacity-80">
                This record is finalized and locked. Editing is restricted to administrators.
              </p>
            </div>
          </div>
          <div className="text-[10px] font-black bg-white/50 px-2 py-1 rounded uppercase tracking-widest">
            Audit ID: {team._id.slice(-6)}
          </div>
        </div>
      )}

      {team && (
        <>
          <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
            {/* Part 1: Receipt Books */}
            <div className="glass-card p-8 border-none bg-white">
              <h2 className="text-lg font-bold mb-6 text-[#0F3B66] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calculator className="text-[#1E5FA8]" size={20} /> Receipt Book Entries
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{receiptBooks.length} Books Assigned</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-bold border-b border-slate-100 whitespace-nowrap">
                      <th className="pb-4">Book No</th>
                      <th className="pb-4">Start Page</th>
                      <th className="pb-4">End Page</th>
                      <th className="pb-4">Pages</th>
                      <th className="pb-4">Collection (₹)</th>
                      <th className="pb-4 text-center print:hidden"> Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {receiptBooks.length === 0 ? (
                      <tr><td colSpan="5" className="py-8 text-center text-slate-400">No books assigned to this team.</td></tr>
                    ) : receiptBooks.map((book, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 font-bold text-[#0F3B66]">{book.bookNumber}</td>
                        <td className="py-4">
                          <input
                            type="number"
                            className="w-24 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E5FA8]/10 focus:border-[#1E5FA8] outline-none transition-all text-sm font-bold text-[#0F3B66]"
                            value={book.usedStartPage ?? 0}
                            onChange={e => updateBookEntry(idx, 'usedStartPage', e.target.value)}
                          />
                        </td>
                        <td className="py-4">
                          <input
                            type="number"
                            className="w-24 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E5FA8]/10 focus:border-[#1E5FA8] outline-none transition-all text-sm font-bold text-[#0F3B66]"
                            value={book.usedEndPage ?? 0}
                            onChange={e => updateBookEntry(idx, 'usedEndPage', e.target.value)}
                          />
                        </td>
                        <td className="py-4">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md uppercase tracking-tight">
                            {(book.usedEndPage && book.usedStartPage && Number(book.collectedAmount) > 0)
                              ? `${Number(book.usedEndPage) - Number(book.usedStartPage) + 1}`
                              : '0'}
                          </span>
                        </td>
                        <td className="py-4">
                          <input
                            required
                            type="number"
                            readOnly={team.isLocked && !isAdmin}
                            className={`w-32 px-3 py-2 border-2 rounded-xl outline-none font-black text-[#1E5FA8] ${team.isLocked && !isAdmin ? 'bg-slate-50 border-slate-100 grayscale' : 'border-slate-100 bg-[#F8FAF8] focus:border-[#1E5FA8] focus:bg-white'}`}
                            value={book.collectedAmount ?? 0}
                            onChange={e => updateBookEntry(idx, 'collectedAmount', e.target.value)}
                          />
                        </td>
                        <td className="py-4 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => removeBookRow(idx, book.bookNumber)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            title="Unassign Book"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Part 2: Mode Breakup */}
              <div className="glass-card p-8 border-none bg-white h-full shadow-sm">
                <h2 className="text-lg font-bold mb-6 text-[#0F3B66]">Financial Breakage</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="label">Cash Amount (₹)</label>
                      <input
                        required
                        type="number"
                        className="input-field text-lg font-bold text-[#1E5FA8]"
                        value={cashAmount}
                        onChange={e => setCashAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Cash Ref No</label>
                      <input
                        type="text"
                        placeholder="Optional Ref"
                        className="input-field text-sm"
                        value={cashRef}
                        onChange={e => setCashRef(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="label">Bank Amount (₹)</label>
                      <input
                        required
                        type="number"
                        className="input-field text-lg font-bold text-[#1E5FA8]"
                        value={bankAmount}
                        onChange={e => setBankAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Bank Ref No</label>
                      <input
                        type="text"
                        placeholder="Bank Ref No"
                        className="input-field text-sm"
                        value={bankRef}
                        onChange={e => setBankRef(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className={`mt-6 p-4 rounded-2xl flex items-center gap-3 border transition-all ${isBalanced ? 'bg-emerald-50 border-emerald-100 text-[#10B981]' : 'bg-rose-50 border-rose-100 text-[#EF4444]'}`}>
                  <AlertCircle size={20} />
                  <span className="font-bold text-xs uppercase tracking-tight">
                    {isBalanced
                      ? 'Breakage reconciled with net balance.'
                      : `DISCREPANCY DETECTED: ₹${Math.abs(balance - breakupTotal).toLocaleString()} (TARGET: ₹${balance.toLocaleString()})`}
                  </span>
                </div>
              </div>

              {/* Part 3: Expenses & Final Settlement */}
              <div className="glass-card p-8 border-none bg-[#0F3B66] text-white h-full shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                <h2 className="text-lg font-bold mb-6 flex justify-between items-center text-white relative z-10">
                  <span>Audit Summary</span>
                  <span className="text-[10px] bg-white/10 px-2 py-1 rounded-md uppercase tracking-widest text-[#A3C4E8] font-bold">Consolidated View</span>
                </h2>
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-sm border-b border-white/10 pb-4">
                    <span className="text-[#A3C4E8]">Team Collection</span>
                    <span className="font-bold">₹{totalCalculated.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm border-b border-white/10 pb-4">
                    <span className="text-[#A3C4E8]">Advance Granted (+)</span>
                    <span className="font-bold text-[#E6F0FA]">₹{advanceAmount.toLocaleString()}</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#A3C4E8] mb-1">Operational Expense (-)</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-2xl font-bold text-white focus:bg-white/20 focus:ring-2 focus:ring-[#1E5FA8] outline-none transition-all"
                      value={expense}
                      onChange={e => handleExpenseChange(e.target.value)}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-[10px] text-[#A3C4E8]/60 italic">Standard: ₹{suggestedExpense.toLocaleString()} (25%)</p>
                      <button
                        type="button"
                        onClick={() => setExpense(suggestedExpense)}
                        className="text-[10px] font-bold text-[#1E5FA8] hover:text-[#5A8CC9] transition-colors uppercase tracking-widest"
                      >
                        Auto Suggest
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 flex justify-between items-end relative z-10">
                    <div>
                      <span className="text-[10px] font-bold text-[#A3C4E8] block mb-1 uppercase tracking-widest opacity-80">NET INSTITUTIONAL SURPLUS</span>
                      <span className={`text-4xl font-black tracking-tighter ${balance >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                        ₹{balance.toLocaleString()}
                      </span>
                    </div>
                    <div className={`px-4 py-2 rounded-xl font-bold text-[10px] tracking-widest uppercase border ${balance >= 0 ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'}`}>
                      {status}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => navigate('/')} className="btn-secondary px-8">Return</button>
              <button
                type="button"
                onClick={handlePrint}
                className="btn-secondary flex items-center gap-2 px-8 bg-white border-slate-200"
              >
                <Printer size={20} /> Preview Sheet
              </button>
              <button
                type="submit"
                disabled={loading || !isBalanced || (team.isLocked && !isAdmin)}
                className={`btn-primary flex items-center gap-2 px-10 shadow-lg shadow-blue-900/10 ${team.isLocked && !isAdmin ? 'bg-slate-200 text-slate-400 cursor-not-allowed grayscale shadow-none' : ''}`}
              >
                <Save size={18} /> {loading ? 'Processing...' : 'Authorize Settlement'}
              </button>
            </div>
          </form>

          {/* Printable Settlement Sheet */}
          <PrintContainer>
            <PrintHeader
              season={team.season?.name}
              location={`${team.placeName}, ${team.state}`}
              date={new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            />

            <TeamMembersSection members={team.members} />

            <ReceiptBookDetails
              books={receiptBooks}
              total={totalCalculated}
            />

            <CollectionSummary
              total={totalCalculated}
              expense={expense}
              advance={advanceAmount}
              netBalance={netProfit}
              cash={cashAmount}
              bank={bankAmount}
              totalReceived={breakupTotal}
              cashRef={cashRef}
              bankRef={bankRef}
              status={status}
            >
              <PrintFooter />
            </CollectionSummary>
          </PrintContainer>
        </>
      )}
    </div>
  );
}
