import { useState, useEffect } from 'react';
import { teamService, seasonService } from '../services/api';
import { Plus, Trash2, UserPlus, MapPin, Globe, Save, Users, Edit3 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { MySwal } from '../utils/swal';

export default function AddTeam() {
  const { id } = useParams();
  const [activeSeason, setActiveSeason] = useState(null);
  const [formData, setFormData] = useState({
    placeName: '',
    state: '',
    advanceAmount: 0,
    members: [{ name: '', class: '', phone: '' }]
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    seasonService.getActive().then(res => setActiveSeason(res.data));

    if (id) {
      teamService.getById(id).then(res => {
        setFormData({
          placeName: res.data.placeName,
          state: res.data.state,
          advanceAmount: res.data.advanceAmount || 0,
          members: res.data.members
        });
      });
    }
  }, [id]);

  const addMember = () => {
    setFormData({
      ...formData,
      members: [...formData.members, { name: '', class: '', phone: '' }]
    });
  };

  const removeMember = (index) => {
    const updatedMembers = formData.members.filter((_, i) => i !== index);
    setFormData({ ...formData, members: updatedMembers });
  };

  const updateMember = (index, field, value) => {
    const updatedMembers = [...formData.members];
    updatedMembers[index][field] = value;
    setFormData({ ...formData, members: updatedMembers });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeSeason && !id) return MySwal.fire('No Active Season', 'You must create and activate a season before creating teams.', 'warning');
    setLoading(true);
    try {
      if (id) {
        await teamService.update(id, formData);
        await MySwal.fire({
          title: 'Updated!',
          text: 'Team details have been updated successfully.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        await teamService.create({ ...formData, season: activeSeason._id });
        await MySwal.fire({
          title: 'Created!',
          text: 'New team has been successfully registered.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
      navigate('/teams');
    } catch (err) {
      console.error(err);
      MySwal.fire('Error', 'Failed to save team details. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <div className={`p-3 ${id ? 'bg-[#F59E0B]' : 'bg-[#1E5FA8]'} text-white rounded-2xl shadow-lg`}>
          {id ? <Edit3 size={24} /> : <Plus size={24} />}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#0F3B66] tracking-tight">
            {id ? 'Modify Team Profile' : 'Register New Team'}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Configure field operational areas and personnel</p>
        </div>
      </div>

      {(!activeSeason && !id) ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl">
          Warning: You cannot create a team without an active season. Please go to Season Management first.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="glass-card p-8 border-none bg-white">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-[#0F3B66]">
              <MapPin className="text-[#1E5FA8]" size={20} /> Operational Area Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Place Name</label>
                <input
                  required
                  className="input-field"
                  placeholder="e.g. Kozhikode"
                  value={formData.placeName}
                  onChange={e => setFormData({ ...formData, placeName: e.target.value })}
                />
              </div>
              <div>
                <label className="label">State / District</label>
                <input
                  required
                  className="input-field"
                  placeholder="e.g. Kerala"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-[#1E5FA8]">Initial Advance Amount (₹)</label>
                <input
                  type="number"
                  className="input-field border-[#E6F0FA] bg-[#E6F0FA]/30 font-bold"
                  placeholder="0"
                  value={formData.advanceAmount}
                  onChange={e => setFormData({ ...formData, advanceAmount: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-8 border-none bg-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 text-[#0F3B66]">
                <UserPlus className="text-[#1E5FA8]" size={20} /> Designated Field Officers
              </h2>
              <button type="button" onClick={addMember} className="btn-secondary flex items-center gap-2 text-sm px-4">
                <Plus size={16} /> Add Officer
              </button>
            </div>

            <div className="space-y-4">
              {formData.members.map((member, idx) => (
                <div key={idx} className="p-6 rounded-xl bg-slate-50 border border-slate-100 flex flex-col md:flex-row gap-4 relative">
                  <div className="flex-[2]">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Full Name</label>
                    <input
                      required
                      className="input-field"
                      placeholder="Name"
                      value={member.name}
                      onChange={e => updateMember(idx, 'name', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Class</label>
                    <input
                      required
                      className="input-field"
                      placeholder="Class"
                      value={member.class}
                      onChange={e => updateMember(idx, 'class', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Phone Number</label>
                    <input
                      required
                      className="input-field"
                      placeholder="Phone"
                      value={member.phone}
                      onChange={e => updateMember(idx, 'phone', e.target.value)}
                    />
                  </div>
                  {formData.members.length > 1 && (
                    <button type="button" onClick={() => removeMember(idx)} className="mt-6 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors self-end md:self-center">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button type="button" onClick={() => navigate('/teams')} className="btn-secondary px-8">Return</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 px-10 shadow-sm">
              <Save size={18} /> {loading ? 'Processing...' : (id ? 'Update Record' : 'Register Team')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
