import { useState, useRef, useEffect } from 'react';
import { User, Menu, Calendar, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ user, onMenuClick }) {
    const navigate = useNavigate();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef(null);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [profileRef]);

    const isDataCollector = user?.role === 'data_collector';

    return (
        <header className="h-20 bg-white border-b border-slate-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 backdrop-blur-sm bg-white/80">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
                <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <Menu size={24} />
                </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-6">
                {!isDataCollector && (
                    <button
                        onClick={() => navigate('/season')}
                        className="flex items-center gap-2 p-2 px-3 sm:px-4 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
                        title="Change Season"
                    >
                        <Calendar size={18} />
                        <span className="hidden sm:inline">Season</span>
                    </button>
                )}

                <div className="hidden sm:block h-8 w-[1px] bg-slate-100 mx-1"></div>

                <div className="relative pl-2" ref={profileRef}>
                    <div
                        className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none"
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-black text-slate-900 leading-tight capitalize">{user?.username || 'Admin'}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {isDataCollector ? 'Field Officer' : 'Office Admin'}
                            </p>
                        </div>
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold shadow-sm ring-2 ring-white hover:bg-indigo-200 transition-colors">
                            <User size={20} />
                        </div>
                    </div>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 animate-in fade-in zoom-in duration-200">
                            <div className="px-4 py-3 border-b border-slate-50 sm:hidden">
                                <p className="text-sm font-bold text-slate-900">{user?.username || 'Admin'}</p>
                                <p className="text-xs text-slate-500">{isDataCollector ? 'Field Officer' : 'Office Admin'}</p>
                            </div>

                            {!isDataCollector && (
                                <button
                                    onClick={() => { setIsProfileOpen(false); navigate('/settings'); }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors"
                                >
                                    <Settings size={16} /> Settings
                                </button>
                            )}

                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                            >
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
