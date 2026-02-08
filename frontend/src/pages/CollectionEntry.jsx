import { useState, useEffect } from 'react';
import { teamService, settlementService } from '../services/api';
import TeamSelect from '../components/TeamSelect';
import { Calculator, Save, AlertCircle, Scale, Printer, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MySwal } from '../utils/swal';

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
      MySwal.fire('Error', 'Failed to save settlement: ' + err.message, 'error');
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
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
            <Scale size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Team Settlement</h1>
            <p className="text-slate-500 font-medium">Record collection and single total expense together</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="btn-secondary flex items-center gap-2 px-6 py-3 border-slate-200"
        >
          <Printer size={18} />
        </button>
      </div>

      <div className="glass-card p-8 border-none bg-white mb-8 print:hidden">
        <TeamSelect selectedId={selectedTeamId} onSelect={setSelectedTeamId} filterLocked={false} />
      </div>

      {team && (
        <>
          <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
            {/* Part 1: Receipt Books */}
            <div className="glass-card p-8 border-none bg-white">
              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                <Calculator className="text-indigo-600" size={20} /> Receipt Book Entries
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase tracking-widest font-bold border-b border-slate-100">
                      <th className="pb-4">Book #</th>
                      <th className="pb-4">Used Start</th>
                      <th className="pb-4">Used End</th>
                      <th className="pb-4">Used Pages</th>
                      <th className="pb-4">Amount (₹)</th>
                      <th className="pb-4 text-center print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {receiptBooks.length === 0 ? (
                      <tr><td colSpan="5" className="py-8 text-center text-slate-400">No books assigned to this team.</td></tr>
                    ) : receiptBooks.map((book, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 font-bold text-slate-700">{book.bookNumber}</td>
                        <td className="py-4">
                          <input
                            type="number"
                            className="w-24 px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={book.usedStartPage || ''}
                            onChange={e => updateBookEntry(idx, 'usedStartPage', e.target.value)}
                          />
                        </td>
                        <td className="py-4">
                          <input
                            type="number"
                            className="w-24 px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={book.usedEndPage || ''}
                            onChange={e => updateBookEntry(idx, 'usedEndPage', e.target.value)}
                          />
                        </td>
                        <td className="py-4 text-slate-600 font-medium font-['Inter']">
                          {(book.usedEndPage && book.usedStartPage)
                            ? (Number(book.usedEndPage) - Number(book.usedStartPage) + 1)
                            : 0}
                        </td>
                        <td className="py-4">
                          <input
                            required
                            type="number"
                            className="w-32 px-3 py-1.5 border-2 border-slate-100 focus:border-indigo-500 rounded-lg outline-none font-bold text-slate-900"
                            value={book.collectedAmount || ''}
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
              <div className="glass-card p-8 border-none bg-white h-full">
                <h2 className="text-xl font-bold mb-6 text-slate-800">Mode of Collection</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="label">Cash Amount (₹)</label>
                      <input
                        required
                        type="number"
                        className="input-field text-lg font-bold text-indigo-700"
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
                        className="input-field text-lg font-bold text-indigo-700"
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
                <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 border ${isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                  <AlertCircle size={20} />
                  <span className="font-semibold text-sm">
                    {isBalanced
                      ? 'Mode breakup matches final net balance.'
                      : `Diff: ₹${Math.abs(balance - breakupTotal)} (Must equal ₹${balance})`}
                  </span>
                </div>
              </div>

              {/* Part 3: Expenses & Final Settlement */}
              <div className="glass-card p-8 border-none bg-slate-900 text-white h-full">
                <h2 className="text-xl font-bold mb-6 flex justify-between items-center">
                  <span>Final Settlement</span>
                  <span className="text-[10px] bg-white/10 px-2 py-1 rounded uppercase tracking-tighter text-slate-400">Advance Adjusted</span>
                </h2>
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-4">
                    <span className="text-slate-400">Total Collection</span>
                    <span className="font-bold">₹{totalCalculated.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-4">
                    <span className="text-slate-400">Advance Given (+)</span>
                    <span className="font-bold text-indigo-400">₹{advanceAmount.toLocaleString()}</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Total Expense (-)</label>
                    <input
                      required
                      type="number"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-2xl font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={expense}
                      onChange={e => handleExpenseChange(e.target.value)}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-[10px] text-slate-500 italic">Suggested: ₹{suggestedExpense.toLocaleString()} (25%)</p>
                      <button
                        type="button"
                        onClick={() => setExpense(suggestedExpense)}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
                      >
                        Apply Suggestion
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                    <div>
                      <span className="text-sm font-medium text-slate-400 block mb-1 uppercase tracking-widest">Final Net Balance</span>
                      <span className={`text-4xl font-black ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{balance.toLocaleString()}
                      </span>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-black text-xs tracking-widest ${balance >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {status}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => navigate('/')} className="btn-secondary px-8 py-4">Cancel</button>
              <button
                type="button"
                onClick={handlePrint}
                className="btn-secondary flex items-center gap-2 px-8 py-4 bg-white hover:bg-slate-50"
              >
                <Printer size={20} /> Print
              </button>
              <button
                type="submit"
                disabled={loading || !isBalanced}
                className="btn-primary flex items-center gap-2 px-12 py-4 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 text-lg"
              >
                <Save size={20} /> {loading ? 'Saving...' : 'Save & Update Record'}
              </button>
            </div>
          </form>

          {/* Printable Settlement Sheet */}
          {/* Printable Settlement Sheet */}
          <div className="hidden print:block p-8 bg-white text-black font-sans text-[11px] leading-tight mx-auto max-w-[210mm] min-h-screen relative flex flex-col">

            {/* Header */}
            <div className="text-center border-b-2 border-black pb-2 mb-4">
              <h1 className="text-xl font-bold uppercase tracking-widest">
                {team.season?.name || 'Ramalan Season'}
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Settlement & Final Audit Sheet</p>
            </div>

            {/* Meta Info */}
            <div className="flex justify-between items-end mb-4 border-b border-black pb-2">
              <div className="flex gap-8">
                <p><strong className="uppercase text-[9px] mr-2 text-slate-600">Location:</strong> <span className="font-bold text-sm">{team.placeName}, {team.state}</span></p>
              </div>
              <div className="text-right">
                <p><strong className="uppercase text-[9px] mr-2 text-slate-600">Date:</strong> <span className="font-bold">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span></p>
              </div>
            </div>

            {/* Team Members */}
            <section className="mb-4 break-inside-avoid">
              <h2 className="text-[10px] font-bold mb-1 uppercase tracking-wider border-b border-black w-fit">Team Members</h2>
              <table className="w-full border-collapse border border-black text-[10px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-black p-1 text-left w-1/3">Name</th>
                    <th className="border border-black p-1 text-left w-1/3">Class</th>
                    <th className="border border-black p-1 text-left w-1/3">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {team.members.map((m, i) => (
                    <tr key={i}>
                      <td className="border border-black p-1 pl-2 font-medium">{m.name}</td>
                      <td className="border border-black p-1 pl-2">{m.class}</td>
                      <td className="border border-black p-1 pl-2">{m.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Receipt Books */}
            <section className="mb-4 break-inside-avoid">
              <h2 className="text-[10px] font-bold mb-1 uppercase tracking-wider border-b border-black w-fit">Receipt Book Details</h2>
              <table className="w-full border-collapse border border-black text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-center">
                    <th className="border border-black p-1 w-16">Book #</th>
                    <th className="border border-black p-1 w-24">Start No</th>
                    <th className="border border-black p-1 w-24">End No</th>
                    <th className="border border-black p-1 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptBooks.filter(b => Number(b.collectedAmount) > 0).map((b, i) => (
                    <tr key={i}>
                      <td className="border border-black p-1 text-center font-bold">{b.bookNumber}</td>
                      <td className="border border-black p-1 text-center font-mono text-slate-700">{b.usedStartPage}</td>
                      <td className="border border-black p-1 text-center font-mono text-slate-700">{b.usedEndPage}</td>
                      <td className="border border-black p-1 pr-2 text-right font-medium">{Number(b.collectedAmount).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t-2 border-black">
                    <td colSpan="3" className="border border-black p-1 pr-3 text-right uppercase text-[9px] tracking-wide">Total Collection From Books:</td>
                    <td className="border border-black p-1 pr-2 text-right">₹{totalCalculated.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {receiptBooks.some(b => Number(b.collectedAmount) <= 0) && (
                <div className="mt-1 text-[9px] text-slate-500 italic">
                  <span className="font-bold">Unused:</span> {receiptBooks.filter(b => Number(b.collectedAmount) <= 0).map(b => b.bookNumber).join(', ')}
                </div>
              )}
            </section>

            {/* Unified Summary & Footer Block - Guaranteed Grouping */}
            <div className="break-inside-avoid mt-auto">

              {/* Boxed Collection Summary */}
              <div className="border-2 border-black mb-4 text-[10px] font-mono shadow-sm">
                <div className="border-b-2 border-black bg-slate-50 p-1 text-center font-bold uppercase tracking-widest text-[11px]">
                  Collection Summary
                </div>
                <div className="p-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Total Collection</span>
                    <span className="font-bold">: ₹ {totalCalculated.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Expense (-)</span>
                    <span className="font-bold">: ₹ {Number(expense).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Advance Given (-)</span>
                    <span className="font-bold">: ₹ {Number(advanceAmount).toLocaleString()}</span>
                  </div>

                  <div className="border-t border-dashed border-black my-1 opacity-50"></div>

                  <div className="flex justify-between items-center font-bold text-[11px] bg-slate-50 -mx-2 px-2 py-0.5 border-y border-dashed border-slate-300">
                    <span className="uppercase tracking-tight">Net Balance (Due to Office)</span>
                    <span>: ₹ {netProfit.toLocaleString()}</span>
                  </div>

                  <div className="border-t border-dashed border-black my-1 opacity-50"></div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span className="">Actual Cash {cashRef && <span className="text-[9px]">({cashRef})</span>}</span>
                    <span className="font-medium text-black">: ₹ {Number(cashAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="">Actual Bank {bankRef && <span className="text-[9px]">({bankRef})</span>}</span>
                    <span className="font-medium text-black">: ₹ {Number(bankAmount).toLocaleString()}</span>
                  </div>

                  <div className="border-t-2 border-black my-1"></div>

                  <div className="flex justify-between items-center font-black text-sm">
                    <span className="uppercase tracking-tighter">Total Received</span>
                    <span>: ₹ {breakupTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

             <div>
              <br />
              <br />
              <br />
             </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 mb-2">
                <div className="text-center pt-6 border-t border-black">
                  <p className="font-bold text-[10px] uppercase">Team Representative</p>
                  <p className="text-[8px] text-slate-500 uppercase mt-0.5">(Sign & Date)</p>
                </div>
                <div className="text-center pt-6 border-t border-black">
                  <p className="font-bold text-[10px] uppercase">Office Accountant</p>
                  <p className="text-[8px] text-slate-500 uppercase mt-0.5">(Sign & Stamp)</p>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center text-[8px] text-slate-400 italic pt-2 border-t border-dotted border-slate-300">
                This is a computer-generated settlement sheet. Generated on {new Date().toLocaleString()}.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
