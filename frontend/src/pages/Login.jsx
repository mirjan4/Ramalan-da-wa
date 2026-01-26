import { useState } from 'react';
import { authService } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Lock, User, LogIn } from 'lucide-react';

export default function Login({ setUser }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
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
      navigate('/');
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50/30 p-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-indigo-600 text-white shadow-2xl mb-4 rotate-3 transform">
            <LogIn size={32} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin Login</h1>
          <p className="text-slate-500 mt-2 font-medium">Ramalan Da’wa Management System</p>
        </div>

        <div className="glass-card p-10 border-none bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><User size={20} /></span>
                <input
                  required
                  className="input-field pl-10"
                  placeholder="admin"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Lock size={20} /></span>
                <input
                  required
                  type="password"
                  className="input-field pl-10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-lg text-center animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-slate-400 text-sm font-medium">
          Office Use Only • Audit Safe System v1.0
        </p>
      </div>
    </div>
  );
}
