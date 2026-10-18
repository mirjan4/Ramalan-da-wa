import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, ShieldCheck, Menu, MapPin, Edit3 } from 'lucide-react';

export default function MobileBottomNav({ user, onOpenSidebar }) {
    const location = useLocation();
    const isAdmin = user?.role === 'admin';
    const isDataCollector = user?.role === 'data_collector';

    // Check if a path is active
    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const isEnvoyActive = isActive('/team-collection');

    // On the dedicated Team Collection page, the collection workspace has its own fixed Save & Submit action bar
    if (location.pathname === '/team-collection') {
        return null;
    }

    return (
        <nav 
            aria-label="Mobile Bottom Navigation"
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(15,59,102,0.08)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around print:hidden select-none"
        >
            {isAdmin ? (
                <>
                    {/* 1. Dashboard */}
                    <Link
                        to="/"
                        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all group ${
                            isActive('/') && !isEnvoyActive && location.pathname === '/'
                                ? 'text-[#1E5FA8]' 
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <div className={`p-1 rounded-xl transition-all ${
                            isActive('/') && location.pathname === '/' ? 'bg-[#E6F0FA] text-[#1E5FA8]' : ''
                        }`}>
                            <LayoutDashboard size={20} />
                        </div>
                        <span className="text-[10px] font-bold tracking-tight mt-0.5">Home</span>
                    </Link>

                    {/* 2. Teams */}
                    <Link
                        to="/teams"
                        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all group ${
                            isActive('/teams') ? 'text-[#1E5FA8]' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <div className={`p-1 rounded-xl transition-all ${
                            isActive('/teams') ? 'bg-[#E6F0FA] text-[#1E5FA8]' : ''
                        }`}>
                            <Users size={20} />
                        </div>
                        <span className="text-[10px] font-bold tracking-tight mt-0.5">Teams</span>
                    </Link>

                    {/* 3. CENTER HERO: Field Envoy Portal Quick Link */}
                    <Link
                        to="/team-collection"
                        className="flex flex-col items-center justify-center -mt-4 px-2 group"
                        title="Open Field Envoy Portal"
                    >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 duration-200 ${
                            isEnvoyActive
                                ? 'bg-gradient-to-tr from-[#0F3B66] to-[#1E5FA8] text-white ring-4 ring-[#E6F0FA] shadow-blue-900/30'
                                : 'bg-gradient-to-tr from-[#1E5FA8] to-[#0F3B66] text-white ring-4 ring-white shadow-blue-900/20 hover:scale-105'
                        }`}>
                            <BookOpen size={22} className={isEnvoyActive ? 'animate-pulse' : ''} />
                        </div>
                        <span className={`text-[10px] font-black tracking-tight mt-1 whitespace-nowrap ${
                            isEnvoyActive ? 'text-[#1E5FA8]' : 'text-[#0F3B66]'
                        }`}>
                            Envoy Portal
                        </span>
                    </Link>

                    {/* 4. Approvals */}
                    <Link
                        to="/collection-approvals"
                        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all group ${
                            isActive('/collection-approvals') ? 'text-[#1E5FA8]' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <div className={`p-1 rounded-xl transition-all ${
                            isActive('/collection-approvals') ? 'bg-[#E6F0FA] text-[#1E5FA8]' : ''
                        }`}>
                            <ShieldCheck size={20} />
                        </div>
                        <span className="text-[10px] font-bold tracking-tight mt-0.5">Approvals</span>
                    </Link>

                    {/* 5. Menu Drawer */}
                    <button
                        type="button"
                        onClick={onOpenSidebar}
                        className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-all group"
                        aria-label="Open full menu"
                    >
                        <div className="p-1 rounded-xl group-hover:bg-slate-100 transition-all">
                            <Menu size={20} />
                        </div>
                        <span className="text-[10px] font-bold tracking-tight mt-0.5">More</span>
                    </button>
                </>
            ) : (
                /* Field Envoy / Data Collector Bottom Bar */
                <>
                    {/* 1. Field Envoy Portal Quick Link (Primary) */}
                    <Link
                        to="/team-collection"
                        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all group ${
                            isEnvoyActive ? 'text-[#1E5FA8]' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <div className={`p-1.5 rounded-xl transition-all ${
                            isEnvoyActive ? 'bg-[#E6F0FA] text-[#1E5FA8] shadow-xs' : ''
                        }`}>
                            <BookOpen size={22} />
                        </div>
                        <span className={`text-[11px] font-black tracking-tight mt-0.5 ${
                            isEnvoyActive ? 'text-[#1E5FA8]' : 'text-slate-500'
                        }`}>
                            Envoy Portal
                        </span>
                    </Link>

                    {/* 2. Field Data Entry */}
                    <Link
                        to="/field-data"
                        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all group ${
                            isActive('/field-data') ? 'text-[#1E5FA8]' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <div className={`p-1.5 rounded-xl transition-all ${
                            isActive('/field-data') ? 'bg-[#E6F0FA] text-[#1E5FA8] shadow-xs' : ''
                        }`}>
                            <MapPin size={22} />
                        </div>
                        <span className={`text-[11px] font-bold tracking-tight mt-0.5 ${
                            isActive('/field-data') ? 'text-[#1E5FA8]' : 'text-slate-500'
                        }`}>
                            Field Data
                        </span>
                    </Link>

                    {/* 3. Menu / Profile Drawer */}
                    <button
                        type="button"
                        onClick={onOpenSidebar}
                        className="flex flex-col items-center justify-center flex-1 py-1 text-slate-400 hover:text-slate-600 transition-all group"
                        aria-label="Open menu"
                    >
                        <div className="p-1.5 rounded-xl group-hover:bg-slate-100 transition-all">
                            <Menu size={22} />
                        </div>
                        <span className="text-[11px] font-bold tracking-tight mt-0.5 text-slate-500">
                            Menu
                        </span>
                    </button>
                </>
            )}
        </nav>
    );
}
