import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, BookOpen, Banknote, Scale, FileText, LogOut, LayoutDashboard, Calendar, X, Settings, MapPin } from 'lucide-react';
import { confirmAction } from '../utils/swal';

export default function Sidebar({ setUser, isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmed = await confirmAction({
      title: 'Logout?',
      text: 'Are you sure you want to end your session?',
      confirmText: 'Yes, Sign Out',
      variant: 'warning'
    });

    if (confirmed) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      navigate('/login');
      onClose();
    }
  };

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const role = currentUser.role || 'admin';

  const navItems = role === 'admin' ? [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Users size={20} />, label: 'Team Management', path: '/teams' },
    { icon: <Scale size={20} />, label: 'Settlement & Collection', path: '/collection' },
    { icon: <FileText size={20} />, label: 'Reports', path: '/reports' },
    { icon: <MapPin size={20} />, label: 'Field Data', path: '/field-data' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ] : [
    { icon: <MapPin size={20} />, label: 'Field Data Entry', path: '/field-data' },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-white flex flex-col p-6 shadow-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between mb-12 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-xl shadow-lg ring-4 ring-indigo-500/20">
            <img className='w-12 h-12 bg-white rounded-full object-contain p-2 border-2 border-indigo-500 ' src="markaz-logo.png" alt="" />
          </div>
          <div>
            <h2 className="font-black text-xl tracking-tight">Ramalan Da’wa</h2>
            <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold -mt-1">Admin Portal</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => { if (window.innerWidth < 1024) onClose(); }}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${location.pathname === item.path
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-bold'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            <span className={location.pathname === item.path ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400 transition-colors'}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-slate-400 hover:bg-rose-500 hover:text-white transition-all duration-300"
        >
          <LogOut size={20} />
          <span className="font-bold">Logout</span>
        </button>
      </div>
    </aside>
  );
}
