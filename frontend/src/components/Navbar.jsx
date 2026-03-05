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
        <header className="h-16 bg-white border-b border-slate-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 transition-shadow">
            <div className="flex items-center gap-4 flex-1">
                <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-500 hover:text-[#1E5FA8] hover:bg-[#E6F0FA] rounded-xl transition-colors">
                    <Menu size={22} />
                </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-4">
                {!isDataCollector && (
                    <button
                        onClick={() => navigate('/season')}
                        className="flex items-center gap-2 p-2 px-4 text-[#0F3B66] hover:text-[#1E5FA8] hover:bg-[#E6F0FA] rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest border border-transparent hover:border-[#1E5FA8]/20"
                        title="Deploy Season"
                    >
                        <Calendar size={16} />
                        <span className="hidden sm:inline">Active Season</span>
                    </button>
                )}

                <div className="hidden sm:block h-8 w-[1px] bg-slate-100 mx-2"></div>

                <div className="relative" ref={profileRef}>
                    <div
                        className="flex items-center gap-3 cursor-pointer select-none p-1.5 pr-2 hover:bg-slate-50 rounded-2xl transition-all duration-300 border border-transparent hover:border-slate-100"
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                    >
                        <div className="w-8 h-8 bg-[#1E5FA8] text-white rounded-xl flex items-center justify-center font-bold shadow-sm shadow-blue-900/10">
                            <User size={18} />
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-[11px] font-black text-[#0F3B66] leading-tight uppercase tracking-tight">{user?.username || 'Admin'}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                {isDataCollector ? 'Field Envoy' : 'Admin'}
                            </p>
                        </div>
                    </div>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="px-5 py-3 border-b border-slate-50 sm:hidden">
                                <p className="text-[11px] font-black text-[#0F3B66] uppercase">{user?.username || 'Admin'}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{isDataCollector ? 'Field Envoy' : 'Administrative Chief'}</p>
                            </div>

                            <div className="px-2">
                                {!isDataCollector && (
                                    <button
                                        onClick={() => { setIsProfileOpen(false); navigate('/settings'); }}
                                        className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-[#E6F0FA] hover:text-[#1E5FA8] rounded-xl flex items-center gap-3 transition-all uppercase tracking-tight"
                                    >
                                        <Settings size={16} /> Settings
                                    </button>
                                )}

                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-[#EF4444] hover:bg-rose-50 rounded-xl flex items-center gap-3 transition-all uppercase tracking-tight"
                                >
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
