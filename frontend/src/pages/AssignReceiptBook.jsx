import { useState, useEffect } from 'react';
import { teamService } from '../services/api';
import TeamSelect from '../components/TeamSelect';
import { BookPlus, Trash2, Plus, Save } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AssignReceiptBook() {
  const [searchParams] = useSearchParams();
  const [selectedTeamId, setSelectedTeamId] = useState(searchParams.get('teamId') || '');
  const [receiptBooks, setReceiptBooks] = useState([{ bookNumber: '', startPage: '', endPage: '' }]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedTeamId) {
      teamService.getById(selectedTeamId).then(res => {
        if (res.data.receiptBooks && res.data.receiptBooks.length > 0) {
          setReceiptBooks(res.data.receiptBooks);
        } else {
          setReceiptBooks([{ bookNumber: '', startPage: '', endPage: '' }]);
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
    if (!selectedTeamId) return alert('Select a team');
    setLoading(true);
    try {
      await teamService.assignBooks(selectedTeamId, receiptBooks);
      alert('Receipt books assigned successfully');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Error assigning books');
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
              <h2 className="text-xl font-bold text-slate-800">Book Details</h2>
              <button type="button" onClick={handleAddBook} className="btn-secondary text-blue-600 border-blue-200 bg-blue-50 flex items-center gap-2 text-sm">
                <Plus size={16} /> Add Another Book
              </button>
            </div>

            <div className="space-y-4">
              {receiptBooks.map((book, idx) => (
                <div key={idx} className="p-6 rounded-xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row gap-4 relative">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Book Number</label>
                    <input
                      required
                      type="number"
                      min="1"
                      className="input-field"
                      placeholder="e.g. 1"
                      value={book.bookNumber}
                      onChange={e => updateBook(idx, 'bookNumber', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Start Page</label>
                    <input
                      required
                      type="number"
                      className="input-field"
                      placeholder="1"
                      value={book.startPage}
                      onChange={e => updateBook(idx, 'startPage', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">End Page</label>
                    <input
                      required
                      type="number"
                      className="input-field"
                      placeholder="50"
                      value={book.endPage}
                      onChange={e => updateBook(idx, 'endPage', e.target.value)}
                    />
                  </div>
                  {receiptBooks.length > 1 && (
                    <button type="button" onClick={() => removeBook(idx)} className="mt-6 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors self-end md:self-center">
                      <Trash2 size={20} />
                    </button>
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
