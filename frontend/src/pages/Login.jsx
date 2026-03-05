import { useState } from 'react';
import { authService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Lock, User, LogIn, Eye, EyeOff } from 'lucide-react';

export default function Login({ setUser }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authService.login(formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.admin));
      setUser(res.data.admin);

      if (res.data.admin.forcePasswordChange) {
        navigate('/settings');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E6F0FA]/30 p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-[2rem] bg-[#1E5FA8] text-white shadow-2xl shadow-blue-900/20 mb-6 -rotate-2 transform">
            <LogIn size={32} />
          </div>
          <h1 className="text-3xl font-bold text-[#0F3B66] tracking-tight">Login Page</h1>
          <p className="text-slate-500 mt-2 font-medium">Ramalan Da'wah {new Date().getFullYear()}</p>
        </div>

        <div className="glass-card p-10 border-none bg-white shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><User size={18} /></span>
                <input
                  required
                  className="input-field pl-12 h-12"
                  placeholder="Username"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Password</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"><Lock size={18} /></span>
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  className="input-field pl-12 pr-12 h-12"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#1E5FA8] focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-[#EF4444] text-[11px] font-bold rounded-xl text-center animate-shake uppercase tracking-tight">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary h-12 shadow-lg shadow-blue-900/10 text-sm tracking-wide"
            >
              {loading ? 'Validating Credentials...' : 'Login'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
          Markaz Ramalan Da’wa © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
