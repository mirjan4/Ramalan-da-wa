import { User, Menu, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ user, onMenuClick }) {
    const navigate = useNavigate();

    return (
        <header className="h-20 bg-white border-b border-slate-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm bg-white/80">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
                <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <Menu size={24} />
                </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-6">
                <button
                    onClick={() => navigate('/season')}
                    className="hidden sm:flex items-center gap-2 p-2 px-4 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
                    title="Change Season"
                >
                    <RefreshCw size={18} />
                    <span>Season</span>
                </button>

                <div className="hidden sm:block h-8 w-[1px] bg-slate-100 mx-1"></div>

                <div className="flex items-center gap-2 sm:gap-3 pl-2">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-black text-slate-900 leading-tight capitalize">{user?.username || 'Admin'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Office Admin</p>
                    </div>
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold shadow-sm ring-2 ring-white">
                        <User size={20} />
                    </div>
                </div>
            </div>
        </header>
    );
}
