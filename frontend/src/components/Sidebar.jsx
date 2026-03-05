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
    { icon: <BookOpen size={20} />, label: 'Book  Report', path: '/book-report' },
    { icon: <Scale size={20} />, label: 'Settlement & Collection', path: '/collection' },
    { icon: <FileText size={20} />, label: 'Reports', path: '/reports' },
    { icon: <MapPin size={20} />, label: 'Field Data', path: '/field-data' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ] : [
    { icon: <MapPin size={20} />, label: 'Field Data Entry', path: '/field-data' },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-100 flex flex-col p-6 transition-transform duration-300 lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between mb-10 px-2 group cursor-pointer" onClick={() => navigate('/')}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#E6F0FA] rounded-2xl shadow-sm transition-transform group-hover:scale-105">
            <img className='w-10 h-10 object-contain' src="markaz-logo.png" alt="Markaz Logo" />
          </div>
          <div>
            <h2 className="font-bold text-lg tracking-tight text-[#0F3B66]">Ramalan Da'wah</h2>
            <p className="text-[10px] font-bold tracking-tight text-[#1E5FA8] -mt-1 opacity-80 leading-none">Admin Portal</p>
          </div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="lg:hidden p-2 text-slate-300 hover:text-[#EF4444] transition-colors">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => { if (window.innerWidth < 1024) onClose(); }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${isActive
                ? 'bg-[#E6F0FA] text-[#1E5FA8] shadow-sm shadow-blue-900/5'
                : 'text-slate-400 hover:bg-slate-50 hover:text-[#1E5FA8]'
                }`}
            >
              <span className={isActive ? 'text-[#1E5FA8]' : 'text-slate-300 group-hover:text-[#1E5FA8] transition-colors'}>
                {item.icon}
              </span>
              <span className={`text-sm font-bold transition-all ${isActive ? 'translate-x-1' : 'opacity-80'}`}>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-[#1E5FA8] rounded-full shadow-sm animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-[#EF4444] transition-all duration-300 group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">Logout</span>
        </button>
        <p className="px-5 mt-4 text-[10px] font-medium text-slate-300 text-center italic">Version 2.4.1 Audit-Core</p>
      </div>
    </aside>
  );
}
