import { useState, useEffect } from 'react';
import { teamService, seasonService } from '../services/api';
import TeamSelect from '../components/TeamSelect';
import { BookPlus, Trash2, Plus, Save, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MySwal } from '../utils/swal';

export default function AssignReceiptBook() {
  const [searchParams] = useSearchParams();
  const [selectedTeamId, setSelectedTeamId] = useState(searchParams.get('teamId') || '');
  const [receiptBooks, setReceiptBooks] = useState([{ bookNumber: '', startPage: '', endPage: '' }]);
  const [usedBooks, setUsedBooks] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedTeamId) {
      // Fetch Team Data
      teamService.getById(selectedTeamId).then(res => {
        if (res.data.receiptBooks && res.data.receiptBooks.length > 0) {
          const sortedBooks = [...res.data.receiptBooks].sort((a, b) => Number(a.bookNumber) - Number(b.bookNumber));
          setReceiptBooks(sortedBooks);
        } else {
          setReceiptBooks([{ bookNumber: '', startPage: '', endPage: '' }]);
        }
      });

      // Fetch Used Books from other teams
      seasonService.getActive().then(async (res) => {
        if (res.data) {
          const allTeamsRes = await teamService.getAll(res.data._id);
          const occupied = new Set();
          allTeamsRes.data.forEach(t => {
            if (t._id !== selectedTeamId) {
              t.receiptBooks.forEach(b => occupied.add(String(b.bookNumber)));
            }
          });
          setUsedBooks(occupied);
        }
      });
    }
  }, [selectedTeamId]);

  const handleAddBook = () => {
    setReceiptBooks([...receiptBooks, { bookNumber: '', startPage: '', endPage: '' }]);
  };

  const removeBook = (index) => {
    setReceiptBooks(receiptBooks.filter((_, i) => i !== index));
  };

  const updateBook = (index, field, value) => {
    const updated = [...receiptBooks];
    updated[index][field] = value;

    // Auto-calculate pages if bookNumber is updated
    if (field === 'bookNumber' && value) {
      const bNum = parseInt(value);
      if (!isNaN(bNum) && bNum > 0) {
        const start = (bNum * 50) - 49;
        const end = start + 49;
        updated[index].startPage = start;
        updated[index].endPage = end;
      }
    }
    setReceiptBooks(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeamId) return MySwal.fire('Oops!', 'Please select a team first.', 'warning');

    const hasConflicts = receiptBooks.some(b => usedBooks.has(String(b.bookNumber)));
    if (hasConflicts) return MySwal.fire({
      title: 'Conflicts Detected',
      text: 'Some book numbers are already assigned to other teams. Please correct the entries marked in red.',
      icon: 'error'
    });

    setLoading(true);
    try {
      await teamService.assignBooks(selectedTeamId, receiptBooks);
      await MySwal.fire({
        title: 'Success!',
        text: 'Receipt books assigned successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      navigate('/teams');
    } catch (err) {
      console.error(err);
      MySwal.fire({
        title: 'Update Failed',
        text: err.response?.data?.message || 'Failed to assign books.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
          <BookPlus size={24} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Assign Receipt Books</h1>
      </div>

      <div className="glass-card p-8 border-none bg-white mb-8">
        <TeamSelect selectedId={selectedTeamId} onSelect={setSelectedTeamId} filterLocked={true} />
      </div>

      {selectedTeamId && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-card p-8 border-none bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">Book Details ({receiptBooks.length})</h2>
              <div className="flex gap-2">
                {receiptBooks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const canClear = receiptBooks.every(b => !(b.isEntered || b.collectedAmount > 0));
                      if (canClear) setReceiptBooks([]);
                      else MySwal.fire('Protection Active', 'Cannot clear all books because some have collection data. Remove them individually or clear data first.', 'warning');
                    }}
                    className="btn-secondary text-rose-600 border-rose-200 bg-rose-50 flex items-center gap-2 text-sm"
                  >
                    <Trash2 size={16} /> Clear All
                  </button>
                )}
                <button type="button" onClick={handleAddBook} className="btn-secondary text-blue-600 border-blue-200 bg-blue-50 flex items-center gap-2 text-sm">
                  <Plus size={16} /> Add Book
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {receiptBooks.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                  <BookPlus size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-slate-400 font-medium italic">No receipt books assigned to this team.</p>
                  <button type="button" onClick={handleAddBook} className="mt-4 text-blue-600 font-bold text-sm hover:underline">
                    + Assign First Book
                  </button>
                </div>
              ) : receiptBooks.map((book, idx) => (
                <div key={idx} className="p-6 rounded-xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row gap-4 relative">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Book Number</label>
                    <div className="relative">
                      <input
                        required
                        type="number"
                        min="1"
                        className={`input-field font-bold ${book.isEntered || (book.collectedAmount > 0) ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''} ${usedBooks.has(String(book.bookNumber)) && !book._id ? 'border-rose-500 focus:ring-rose-200 text-rose-600' : ''}`}
                        placeholder="e.g. 1"
                        value={book.bookNumber}
                        readOnly={book.isEntered || (book.collectedAmount > 0)}
                        onChange={e => updateBook(idx, 'bookNumber', e.target.value)}
                      />
                      {(book.isEntered || (book.collectedAmount > 0)) && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 flex items-center gap-1 bg-slate-100 pl-2">
                          <AlertCircle size={14} />
                          <span className="text-[10px] font-black uppercase">Used</span>
                        </div>
                      )}
                      {usedBooks.has(String(book.bookNumber)) && !book._id && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 flex items-center gap-1 bg-white pl-2">
                          <AlertCircle size={16} />
                          <span className="text-xs font-bold">Assigned</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Start Page</label>
                    <input
                      required
                      type="number"
                      className={`input-field ${book.isEntered || (book.collectedAmount > 0) ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                      placeholder="1"
                      value={book.startPage}
                      readOnly={book.isEntered || (book.collectedAmount > 0)}
                      onChange={e => updateBook(idx, 'startPage', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">End Page</label>
                    <input
                      required
                      type="number"
                      className={`input-field ${book.isEntered || (book.collectedAmount > 0) ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                      placeholder="50"
                      value={book.endPage}
                      readOnly={book.isEntered || (book.collectedAmount > 0)}
                      onChange={e => updateBook(idx, 'endPage', e.target.value)}
                    />
                  </div>
                  {!(book.isEntered || (book.collectedAmount > 0)) && (
                    <button type="button" onClick={() => removeBook(idx)} className="mt-6 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors self-end md:self-center">
                      <Trash2 size={20} />
                    </button>
                  )}
                  {(book.isEntered || (book.collectedAmount > 0)) && (
                    <div className="mt-6 p-2 text-slate-300 self-end md:self-center cursor-help" title="Locked: Collection already recorded for this book.">
                      <Trash2 size={20} className="grayscale" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-500 italic">Note: These books are for audit tracking and do not have intrinsic values assigned here.</p>
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => navigate('/')} className="btn-secondary px-8 py-3">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 px-10 py-3 bg-blue-600 hover:bg-blue-700 shadow-blue-200">
              <Save size={18} /> {loading ? 'Assigning...' : 'Save Assignments'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
