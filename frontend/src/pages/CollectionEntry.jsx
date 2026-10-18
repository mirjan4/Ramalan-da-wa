
import { useState, useEffect, useMemo } from 'react';
import { teamService, settlementService, bankAccountService, seasonBankService, seasonService } from '../services/api';
import TeamSelect from '../components/TeamSelect';
import { Calculator, Save, AlertCircle, Scale, Printer, Trash2, ChevronDown, ChevronUp, Banknote, Building2, Plus, Landmark, CheckCircle2 } from 'lucide-react';
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
  const [bankAccounts, setBankAccounts] = useState([
    { bankName: '', amount: '', refNo: '' }
  ]);
  const [masterBanks, setMasterBanks] = useState([]);
  const [seasonBanks, setSeasonBanks] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [expense, setExpense] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    bankAccountService.getAll().then(res => setMasterBanks(res.data || [])).catch(() => {});
    seasonService.getActive().then(res => {
      if (res.data) {
        setCurrentSeason(res.data);
        seasonBankService.getBySeason(res.data._id).then(sbRes => {
          setSeasonBanks(sbRes.data.bankAmounts || []);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const [manualExpense, setManualExpense] = useState(false);

  // --- Denomination Counter State ---
  // Each entry has a unique key, face value, label, and type (note vs coin)
  const DENOMS = [
    // Notes
    { key: 'note_500', value: 500, label: '₹500', type: 'note' },
    { key: 'note_200', value: 200, label: '₹200', type: 'note' },
    { key: 'note_100', value: 100, label: '₹100', type: 'note' },
    { key: 'note_50', value: 50, label: '₹50', type: 'note' },
    { key: 'note_20', value: 20, label: '₹20', type: 'note' },
    { key: 'note_10', value: 10, label: '₹10', type: 'note' },
    { key: 'note_5', value: 5, label: '₹5', type: 'note' },
    // Coins
    { key: 'coin_20', value: 20, label: '₹20', type: 'coin' },
    { key: 'coin_10', value: 10, label: '₹10', type: 'coin' },
    { key: 'coin_5', value: 5, label: '₹5', type: 'coin' },
    { key: 'coin_2', value: 2, label: '₹2', type: 'coin' },
    { key: 'coin_1', value: 1, label: '₹1', type: 'coin' },
  ];
  const NOTE_DENOMS = DENOMS.filter(d => d.type === 'note');
  const COIN_DENOMS = DENOMS.filter(d => d.type === 'coin');

  const [showDenomPanel, setShowDenomPanel] = useState(false);
  const [useDenomination, setUseDenomination] = useState(false);
  const [denomCounts, setDenomCounts] = useState(
    Object.fromEntries(DENOMS.map(d => [d.key, '']))
  );

  // Derived total from denominations
  const cashFromDenom = useMemo(() =>
    DENOMS.reduce((sum, d) => sum + d.value * (parseInt(denomCounts[d.key]) || 0), 0)
    , [denomCounts]);

  // Sync denomination total → cashAmount whenever active
  useEffect(() => {
    if (useDenomination) setCashAmount(cashFromDenom);
  }, [cashFromDenom, useDenomination]);

  const handleDenomChange = (key, val) => {
    // Allow optional leading minus followed by digits (e.g. "-2" for adjustments)
    const parsed = val.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, ''); // allow '-' only at start
    setDenomCounts(prev => ({ ...prev, [key]: parsed }));
    setUseDenomination(true);
  };

  const clearDenoms = () => {
    setDenomCounts(Object.fromEntries(DENOMS.map(d => [d.key, ''])));
    setUseDenomination(false);
    setCashAmount(0);
  };

  // --- Bank Accounts State & Calculations ---
  // Sum up all added bank accounts
  const totalBankAmount = useMemo(() => {
    return bankAccounts.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  }, [bankAccounts]);

  // Keep bankAmount in sync with totalBankAmount
  useEffect(() => {
    setBankAmount(totalBankAmount);
  }, [totalBankAmount]);

  const addBankAccount = () => {
    setBankAccounts(prev => [...prev, { bankName: '', amount: '', refNo: '' }]);
  };

  const updateBankAccount = (index, field, value) => {
    setBankAccounts(prev => {
      const copy = [...prev];
      if (field === 'amount') {
        const cleaned = String(value).replace(/[^0-9]/g, '');
        copy[index] = { ...copy[index], amount: cleaned === '' ? '' : Number(cleaned) };
      } else {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  const removeBankAccount = (index) => {
    setBankAccounts(prev => {
      if (prev.length <= 1) {
        return [{ bankName: '', amount: '', refNo: '' }];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Quick add a season bank account to the breakup list
  const handleAddSeasonBankToBreakup = (sb) => {
    const bankName = sb.bankAccount?.bankName;
    if (!bankName) return;

    const exists = bankAccounts.some(b => b.bankName === bankName);
    if (exists) {
      return MySwal.fire({
        title: 'Already in List',
        text: `"${bankName}" is already added to this financial breakup.`,
        icon: 'info',
        timer: 1500,
        showConfirmButton: false
      });
    }

    if (bankAccounts.length === 1 && !bankAccounts[0].bankName && !bankAccounts[0].amount) {
      setBankAccounts([{
        bankName: bankName,
        amount: '',
        refNo: sb.notes || ''
      }]);
    } else {
      setBankAccounts(prev => [...prev, {
        bankName: bankName,
        amount: '',
        refNo: sb.notes || ''
      }]);
    }
  };

  // Quick create a new master bank account on the fly
  const handleQuickCreateBank = async () => {
    const { value: bankName } = await MySwal.fire({
      title: 'Register New Bank Account',
      text: 'Enter bank name to store permanently in the database:',
      input: 'text',
      inputPlaceholder: 'e.g. State Bank of India, Federal Bank',
      showCancelButton: true,
      confirmButtonText: 'Create & Select',
      inputValidator: (val) => {
        if (!val || !val.trim()) return 'Bank name cannot be empty';
        if (masterBanks.some(b => b.bankName.trim().toLowerCase() === val.trim().toLowerCase())) {
          return 'A bank account with this name already exists';
        }
      }
    });

    if (bankName && bankName.trim()) {
      try {
        const res = await bankAccountService.create({ bankName: bankName.trim() });
        const created = res.data;
        const updated = await bankAccountService.getAll();
        setMasterBanks(updated.data || []);

        // Also refresh season banks if applicable
        const sId = team?.season?._id || team?.season || currentSeason?._id;
        if (sId) {
          seasonBankService.getBySeason(sId).then(sbRes => {
            setSeasonBanks(sbRes.data.bankAmounts || []);
          }).catch(() => {});
        }

        if (bankAccounts.length === 1 && !bankAccounts[0].bankName) {
          updateBankAccount(0, 'bankName', created.bankName);
        } else {
          setBankAccounts(prev => [...prev, { bankName: created.bankName, amount: '', refNo: '' }]);
        }

        MySwal.fire({
          title: 'Bank Created!',
          text: `"${created.bankName}" is now available in the dropdown for all seasons.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (err) {
        MySwal.fire('Error', err.response?.data?.message || 'Failed to create bank', 'error');
      }
    }
  };

  useEffect(() => {
    if (selectedTeamId) {
      teamService.getById(selectedTeamId).then(res => {
        const teamData = res.data;
        const initializedBooks = (teamData.receiptBooks || []).map(book => {
          const bookStart = book.startPage || (Number(book.bookNumber) * 50 - 49);
          const bookEnd = book.endPage || (Number(book.bookNumber) * 50);
          const collected = Number(book.collectedAmount) || 0;
          const startP = book.usedStartPage || bookStart;
          // When collection is 0, end page is same number as start page
          const endP = collected > 0 ? (book.usedEndPage || bookEnd) : startP;

          return {
            ...book,
            startPage: bookStart,
            endPage: bookEnd,
            usedStartPage: startP,
            usedEndPage: endP,
            collectedAmount: collected
          };
        }).sort((a, b) => Number(a.bookNumber) - Number(b.bookNumber));
        setTeam(teamData);
        setReceiptBooks(initializedBooks);
        setCashAmount(teamData.cashAmount || 0);
        setCashRef(teamData.cashRef || '');
        setBankAmount(teamData.bankAmount || 0);
        setBankRef(teamData.bankRef || '');
        setAdvanceAmount(teamData.advanceAmount || 0);

        // Initialize bank accounts from saved team record
        if (teamData.bankAccounts && teamData.bankAccounts.length > 0) {
          setBankAccounts(teamData.bankAccounts.map(b => ({
            bankName: b.bankName || '',
            amount: b.amount || '',
            refNo: b.refNo || ''
          })));
        } else if (teamData.bankAmount > 0) {
          setBankAccounts([{
            bankName: teamData.bankRef || 'Primary Bank',
            amount: teamData.bankAmount,
            refNo: teamData.bankRef || ''
          }]);
        } else {
          setBankAccounts([{ bankName: '', amount: '', refNo: '' }]);
        }

        // Fetch bank accounts configured specifically for this team's season
        const seasonId = teamData.season?._id || teamData.season;
        if (seasonId) {
          setCurrentSeason(teamData.season);
          seasonBankService.getBySeason(seasonId).then(sbRes => {
            setSeasonBanks(sbRes.data.bankAmounts || []);
          }).catch(() => setSeasonBanks([]));
        }

        // Initialize denominations from existing record if available
        if (teamData.denominationCounts && Object.keys(teamData.denominationCounts).length > 0) {
          setDenomCounts(teamData.denominationCounts);
          setUseDenomination(true);
        } else {
          setDenomCounts(Object.fromEntries(DENOMS.map(d => [d.key, ''])));
          setUseDenomination(false);
        }

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
    if (field === 'collectedAmount') {
      const numVal = Number(value) || 0;
      if (numVal === 0 || value === '') {
        updated[index].usedEndPage = updated[index].usedStartPage;
      } else if (Number(updated[index].usedEndPage) === Number(updated[index].usedStartPage)) {
        const bEnd = updated[index].endPage || (Number(updated[index].bookNumber) * 50);
        updated[index].usedEndPage = bEnd;
      }
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
    const validBankAccounts = bankAccounts.filter(b => (b.bankName && b.bankName.trim()) || Number(b.amount) > 0);
    const combinedBankRef = validBankAccounts.map(b => b.bankName + (b.refNo ? ` (${b.refNo})` : '')).filter(Boolean).join(', ') || bankRef;

    const cleanedBooks = receiptBooks.map(b => {
      const colAmt = Number(b.collectedAmount) || 0;
      const startP = Number(b.usedStartPage) || Number(b.startPage) || (Number(b.bookNumber) * 50 - 49);
      return {
        ...b,
        collectedAmount: colAmt,
        usedStartPage: startP,
        usedEndPage: colAmt === 0 ? startP : (Number(b.usedEndPage) || startP)
      };
    });

    try {
      await settlementService.finalizeComplete(selectedTeamId, {
        receiptBooks: cleanedBooks,
        cashAmount: Number(cashAmount),
        cashRef,
        bankAmount: Number(totalBankAmount),
        bankRef: combinedBankRef,
        bankAccounts: validBankAccounts,
        expense: Number(expense),
        denominationCounts: useDenomination ? denomCounts : {}
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
    <div className="p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 print:hidden">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-[#1E5FA8] text-white rounded-2xl shadow-lg shrink-0">
            <Scale size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F3B66] tracking-tight">Settlement Finalization</h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5 sm:mt-1">Audit team collections and operational expenses</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="btn-secondary flex items-center gap-2 px-5 py-2.5 self-end sm:self-auto"
        >
          <Printer size={18} />
          <span className="text-xs sm:text-sm font-bold">Print Preview</span>
        </button>
      </div>

      <div className="glass-card p-4 sm:p-6 lg:p-8 border-none bg-white mb-6 sm:mb-8 print:hidden">
        <TeamSelect selectedId={selectedTeamId} onSelect={setSelectedTeamId} filterLocked={false} />
      </div>

      {team?.isLocked && !isAdmin && (
        <div className="p-4 rounded-2xl mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-pulse bg-rose-50 border border-rose-200 text-rose-700">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <div>
              <p className="font-black text-sm uppercase tracking-wider">Settlement Locked</p>
              <p className="text-xs font-bold opacity-80">
                This record is finalized and locked. Editing is restricted to administrators.
              </p>
            </div>
          </div>
          <div className="text-[10px] font-black bg-white/50 px-2.5 py-1 rounded-md uppercase tracking-widest self-start sm:self-auto">
            Audit ID: {team._id.slice(-6)}
          </div>
        </div>
      )}

      {team && (
        <>
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print:hidden">
            {/* Part 1: Receipt Books */}
            <div className="glass-card p-4 sm:p-6 lg:p-8 border-none bg-white">
              <h2 className="text-base sm:text-lg font-bold mb-4 sm:mb-6 text-[#0F3B66] flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Calculator className="text-[#1E5FA8]" size={20} /> Receipt Book Entries
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{receiptBooks.length} Books Assigned</span>
              </h2>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-[600px]">
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
                            onWheel={e => e.target.blur()}
                            className="w-24 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1E5FA8]/10 focus:border-[#1E5FA8] outline-none transition-all text-sm font-bold text-[#0F3B66]"
                            value={book.usedStartPage ?? 0}
                            onChange={e => updateBookEntry(idx, 'usedStartPage', e.target.value)}
                          />
                        </td>
                        <td className="py-4">
                          <input
                            type="number"
                            onWheel={e => e.target.blur()}
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
                            onWheel={e => e.target.blur()}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Part 2: Mode Breakup */}
              <div className="glass-card p-4 sm:p-6 lg:p-8 border-none bg-white h-full shadow-sm">
                <h2 className="text-base sm:text-lg font-bold mb-4 sm:mb-6 text-[#0F3B66]">Financial Breakage</h2>
                <div className="space-y-4">

                  {/* --- Denomination Counter --- */}
                  <div className="rounded-2xl border border-slate-100 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowDenomPanel(p => !p)}
                      className="w-full flex items-center justify-between px-3.5 sm:px-4 py-3 bg-[#E6F0FA] hover:bg-[#d5e8f8] transition-colors"
                    >
                      <span className="flex items-center gap-2 font-bold text-xs sm:text-sm text-[#0F3B66]">
                        <Banknote size={16} className="text-[#1E5FA8] shrink-0" />
                        <span className="truncate">Cash Denomination Counter</span>
                        {useDenomination && (
                          <span className="ml-1 sm:ml-2 text-[9px] sm:text-[10px] bg-[#1E5FA8] text-white px-2 py-0.5 rounded-full font-black">ACTIVE</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 sm:gap-2 text-[#1E5FA8] shrink-0">
                        {useDenomination && (
                          <span className="text-xs sm:text-sm font-black">₹{cashFromDenom.toLocaleString()}</span>
                        )}
                        {showDenomPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </button>

                    {showDenomPanel && (
                      <div className="p-3 sm:p-4 bg-white space-y-4">

                        {/* Notes Section */}
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-[#1E5FA8] rounded-sm inline-block"></span> Notes
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {NOTE_DENOMS.map(d => (
                              <div key={d.key} className="flex flex-col items-center bg-slate-50 rounded-xl px-2 py-2 border border-slate-100 gap-1">
                                <span className="text-[11px] font-black text-[#1E5FA8]">{d.label}</span>
                                <span className="text-[9px] text-slate-300">×</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="0"
                                  className="w-full bg-transparent text-sm font-bold text-[#0F3B66] outline-none border-b border-slate-200 focus:border-[#1E5FA8] text-center"
                                  value={denomCounts[d.key]}
                                  onChange={e => handleDenomChange(d.key, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Coins Section */}
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <span className="w-3 h-3 bg-amber-400 rounded-full inline-block"></span> Coins
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {COIN_DENOMS.map(d => (
                              <div key={d.key} className="flex flex-col items-center bg-amber-50 rounded-xl px-2 py-2 border border-amber-100 gap-1">
                                <span className="text-[11px] font-black text-amber-600">{d.label}</span>
                                <span className="text-[9px] text-slate-300">×</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="0"
                                  className="w-full bg-transparent text-sm font-bold text-[#0F3B66] outline-none border-b border-amber-200 focus:border-amber-500 text-center"
                                  value={denomCounts[d.key]}
                                  onChange={e => handleDenomChange(d.key, e.target.value)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Denomination breakdown summary */}
                        <div className="bg-[#E6F0FA] rounded-xl p-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[10px] mb-2">
                            {DENOMS.map(d => {
                              const count = parseInt(denomCounts[d.key]) || 0;
                              if (!count) return null;
                              const subtotal = d.value * count;
                              const isNeg = count < 0;
                              return (
                                <span key={d.key} className={`font-bold ${isNeg ? 'text-rose-600' : 'text-[#0F3B66]'}`}>
                                  {d.label} × {count} = {isNeg ? '-' : ''}₹{Math.abs(subtotal).toLocaleString()}
                                </span>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between border-t border-[#1E5FA8]/20 pt-2">
                            <span className="text-[11px] font-black text-[#0F3B66]">Cash Total</span>
                            <span className={`text-base sm:text-lg font-black ${cashFromDenom < 0 ? 'text-rose-500' : 'text-[#1E5FA8]'}`}>
                              {cashFromDenom < 0 ? '-' : ''}₹{Math.abs(cashFromDenom).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={clearDenoms}
                            className="text-[10px] font-bold text-rose-400 hover:text-rose-600 transition-colors"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cash Amount & Ref */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-end">
                    <div>
                      <label className="label flex items-center gap-2">
                        Cash Amount (₹)
                        {useDenomination && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black">AUTO</span>
                        )}
                      </label>
                      <input
                        required
                        type="number"
                        onWheel={e => e.target.blur()}
                        className={`input-field text-lg font-bold text-[#1E5FA8] ${useDenomination ? 'bg-[#E6F0FA] cursor-not-allowed' : ''}`}
                        value={cashAmount}
                        readOnly={useDenomination}
                        onChange={e => !useDenomination && setCashAmount(e.target.value)}
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

                  {/* Bank Accounts Section */}
                  <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-3 sm:p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[#E6F0FA] text-[#1E5FA8] rounded-lg">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-[#0F3B66]">Bank Accounts</span>
                            <span className="text-[11px] text-slate-400 font-medium">({bankAccounts.length})</span>
                          </div>
                          {(team?.season?.name || currentSeason?.name) && (
                            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                              <Landmark size={11} className="text-[#1E5FA8]" />
                              Season: <strong className="text-[#0F3B66]">{team?.season?.name || currentSeason?.name}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="bg-[#1E5FA8]/10 text-[#1E5FA8] px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-black text-xs sm:text-sm border border-[#1E5FA8]/20">
                          <span className="text-[10px] font-bold uppercase text-slate-500">Total:</span>
                          <span>₹{totalBankAmount.toLocaleString()}</span>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={handleQuickCreateBank}
                            className="flex items-center gap-1 text-xs font-bold bg-white hover:bg-slate-100 text-[#1E5FA8] border border-slate-200 hover:border-[#1E5FA8] px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
                            title="Register a new permanent bank account"
                          >
                            <Plus size={13} /> New Bank
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={addBankAccount}
                          className="flex items-center gap-1 text-xs font-bold bg-[#1E5FA8] hover:bg-[#164882] text-white px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95"
                        >
                          <Plus size={14} /> Add Bank
                        </button>
                      </div>
                    </div>

                    {/* Season Configured Bank Accounts Quick Pills */}
                    {seasonBanks.length > 0 && (
                      <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                          <Landmark size={12} className="text-[#1E5FA8]" />
                          Season Banks:
                        </span>
                        {seasonBanks.map(sb => {
                          const bName = sb.bankAccount?.bankName;
                          if (!bName) return null;
                          const isAdded = bankAccounts.some(b => b.bankName === bName);
                          return (
                            <button
                              key={sb._id}
                              type="button"
                              onClick={() => handleAddSeasonBankToBreakup(sb)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                                isAdded
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                                  : 'bg-slate-50 hover:bg-[#E6F0FA] text-[#1E5FA8] border-slate-200 hover:border-[#1E5FA8]'
                              }`}
                              title={isAdded ? 'Already added to list' : `Click to add ${bName}`}
                            >
                              <span>{bName}</span>
                              {isAdded ? (
                                <CheckCircle2 size={12} className="text-emerald-600" />
                              ) : (
                                <Plus size={12} className="text-slate-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Bank Accounts Rows */}
                    <div className="space-y-2.5">
                      {bankAccounts.map((account, index) => {
                        return (
                          <div
                            key={index}
                            className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs hover:border-[#1E5FA8]/40 transition-colors"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-center">
                              {/* Bank Name Selector */}
                              <div className="sm:col-span-5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Bank Account {bankAccounts.length > 1 ? `#${index + 1}` : ''}
                                </label>
                                <select
                                  required
                                  className="w-full text-xs sm:text-sm font-semibold text-[#0F3B66] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:bg-white focus:border-[#1E5FA8] outline-none transition-all cursor-pointer"
                                  value={account.bankName}
                                  onChange={e => updateBankAccount(index, 'bankName', e.target.value)}
                                >
                                  <option value="">-- Select Bank Account --</option>
                                  {masterBanks.map(mb => (
                                    <option key={mb._id} value={mb.bankName}>
                                      {mb.bankName}
                                    </option>
                                  ))}
                                  {account.bankName &&
                                    !masterBanks.some(b => b.bankName === account.bankName) && (
                                      <option value={account.bankName}>
                                        {account.bankName}
                                      </option>
                                  )}
                                </select>
                              </div>

                              {/* Amount */}
                              <div className="sm:col-span-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Amount (₹)
                                </label>
                                <input
                                  type="number"
                                  onWheel={e => e.target.blur()}
                                  placeholder="0"
                                  className="w-full text-xs sm:text-sm font-bold text-[#1E5FA8] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:border-[#1E5FA8] outline-none transition-all"
                                  value={account.amount}
                                  onChange={e => updateBankAccount(index, 'amount', e.target.value)}
                                />
                              </div>

                              {/* Ref / UTR No */}
                              <div className="sm:col-span-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                  Ref / UTR No
                                </label>
                                <input
                                  type="text"
                                  placeholder="Optional Ref / Cheque"
                                  className="w-full text-xs sm:text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:border-[#1E5FA8] outline-none transition-all"
                                  value={account.refNo}
                                  onChange={e => updateBankAccount(index, 'refNo', e.target.value)}
                                />
                              </div>

                              {/* Delete Action */}
                              <div className="sm:col-span-1 flex justify-end sm:justify-center pt-1 sm:pt-4">
                                <button
                                  type="button"
                                  onClick={() => removeBankAccount(index)}
                                  title={bankAccounts.length > 1 ? "Remove Bank Account" : "Clear Bank Account"}
                                  className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Master Banks Datalist for autocomplete */}
                    <datalist id="master-banks-list">
                      {masterBanks.map(b => (
                        <option key={b._id} value={b.bankName} />
                      ))}
                    </datalist>

                    {/* Auto-sum footer note */}
                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs pt-2 px-1 border-t border-slate-200/70 text-slate-500">
                      <span className="text-[11px] font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        Auto-calculated from all bank accounts
                      </span>
                      <span className="font-bold text-[#0F3B66]">
                        Total Bank Amount: <span className="text-sm font-black text-[#1E5FA8]">₹{totalBankAmount.toLocaleString()}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`mt-6 p-4 rounded-2xl flex items-center gap-3 border transition-all ${isBalanced ? 'bg-emerald-50 border-emerald-100 text-[#10B981]' : 'bg-rose-50 border-rose-100 text-[#EF4444]'}`}>
                  <AlertCircle size={20} className="shrink-0" />
                  <span className="font-bold text-xs">
                    {isBalanced
                      ? 'Breakage reconciled with net balance.'
                      : `Discrepancy Detected: ₹${Math.abs(balance - breakupTotal).toLocaleString()} (Target: ₹${balance.toLocaleString()})`}
                  </span>
                </div>
              </div>

              {/* Part 3: Expenses & Final Settlement */}
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-4 sm:p-6 lg:p-8 h-full flex flex-col justify-between">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Financial Summary
                  </h2>

                  <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-lg uppercase tracking-widest font-bold">
                    Consolidated
                  </span>
                </div>


                <div className="space-y-5 sm:space-y-6">

                  {/* Team Collection */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 sm:pb-4">
                    <span className="text-xs sm:text-sm text-slate-500">
                      Team Collection
                    </span>

                    <span className="text-base sm:text-lg font-bold text-slate-900">
                      ₹{totalCalculated.toLocaleString()}
                    </span>
                  </div>


                  {/* Advance */}
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3 sm:pb-4">
                    <span className="text-xs sm:text-sm text-slate-500">
                      Advance Granted (+)
                    </span>

                    <span className="text-base sm:text-lg font-bold text-blue-600">
                      ₹{advanceAmount.toLocaleString()}
                    </span>
                  </div>


                  {/* Operational Expense */}
                  <div>

                    <label className="text-xs sm:text-sm font-medium text-slate-600 flex items-center gap-2">
                      Operational Expense (-)

                      {totalCalculated > 0 && (
                        <span className="text-xs text-slate-400">
                          ({((Number(expense) / totalCalculated) * 100).toFixed(1)}%)
                        </span>
                      )}
                    </label>


                    <input
                      required
                      type="number"
                      onWheel={e => e.target.blur()}
                      value={expense}
                      onChange={e => handleExpenseChange(e.target.value)}
                      className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 sm:py-3 text-xl sm:text-2xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />


                    {/* Expense Percentage Bar */}
                    {totalCalculated > 0 && (
                      <div className="mt-3">

                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Expense Ratio</span>
                          <span>
                            {((Number(expense) / totalCalculated) * 100).toFixed(1)}%
                          </span>
                        </div>

                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">

                          <div
                            className={`h-full rounded-full ${((Number(expense) / totalCalculated) * 100) > 35
                                ? "bg-red-500"
                                : ((Number(expense) / totalCalculated) * 100) > 20
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                            style={{
                              width: `${Math.min(
                                ((Number(expense) / totalCalculated) * 100),
                                100
                              )}%`
                            }}
                          />

                        </div>

                      </div>
                    )}


                    {/* Suggestion */}
                    <div className="flex justify-between items-center mt-3">

                      <span className="text-xs text-slate-400 italic">
                        Standard: ₹{suggestedExpense.toLocaleString()} (25%)
                      </span>

                      <button
                        type="button"
                        onClick={() => setExpense(suggestedExpense)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                      >
                        Auto Suggest
                      </button>

                    </div>

                  </div>


                  {/* Net Surplus */}
                  <div className="border-t border-slate-100 pt-4 sm:pt-6">

                    <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">
                      Net Surplus
                    </span>

                    <div className="mt-1 flex items-end justify-between">

                      <span
                        className={`text-3xl sm:text-4xl font-black tracking-tight ${balance >= 0 ? "text-emerald-600" : "text-red-500"
                          }`}
                      >
                        ₹{balance.toLocaleString()}
                      </span>


                    </div>

                  </div>

                </div>

              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
              <button type="button" onClick={() => navigate('/')} className="w-full sm:w-auto btn-secondary px-6 sm:px-8 py-2.5 sm:py-3">Return</button>
              <button
                type="button"
                onClick={handlePrint}
                className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-white border-slate-200"
              >
                <Printer size={18} /> Preview Sheet
              </button>
              <button
                type="submit"
                disabled={loading || !isBalanced || (team.isLocked && !isAdmin)}
                className={`w-full sm:w-auto btn-primary flex items-center justify-center gap-2 px-8 sm:px-10 py-2.5 sm:py-3 shadow-lg shadow-blue-900/10 ${team.isLocked && !isAdmin ? 'bg-slate-200 text-slate-400 cursor-not-allowed grayscale shadow-none' : ''}`}
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
              netBalance={balance}
              cash={cashAmount}
              bank={bankAmount}
              bankAccounts={bankAccounts}
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
