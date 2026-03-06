import { useState, useEffect } from 'react';
import { ChevronUp, Compass, LayoutPanelTop, Table as TableIcon, Banknote, Coins } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function ScrollFeatures() {
    const [showTop, setShowTop] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Capturing scroll listener to catch events from any overflow container
        const handleScroll = (e) => {
            const target = e.target;
            const scrollTop = target.scrollTop !== undefined
                ? target.scrollTop
                : (window.pageYOffset || document.documentElement.scrollTop);

            if (scrollTop > 400) {
                setShowTop(true);
            } else if (scrollTop < 100) {
                // Check if ANY main container is still scrolled
                const anyScrolled = Array.from(document.querySelectorAll('main, .overflow-y-auto'))
                    .some(el => el.scrollTop > 400);

                // Also check window scroll
                const windowScrolled = (window.pageYOffset || document.documentElement.scrollTop) > 400;

                if (!anyScrolled && !windowScrolled) setShowTop(false);
            }
        };

        window.addEventListener('scroll', handleScroll);

        // Reset state on navigation
        return () => {
            window.removeEventListener('scroll', handleScroll);
            setShowTop(false);
            setShowMenu(false);
        };
    }, [location.pathname]);

    const scrollToTop = () => {
        // Find all potential scroll containers and reset them
        const containers = document.querySelectorAll('main, .overflow-y-auto');
        containers.forEach(container => {
            if (container.scrollTop > 0) {
                container.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });

        // Final fallback to window scroll
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const findScrollParent = (el) => {
        let parent = el.parentElement;
        while (parent && parent !== document.body) {
            const style = window.getComputedStyle(parent);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') return parent;
            parent = parent.parentElement;
        }
        return document.querySelector('main') || window;
    };

    const scrollToId = (id) => {
        const element = document.getElementById(id);
        if (element) {
            const scrollParent = findScrollParent(element);
            if (scrollParent && scrollParent !== window) {
                const parentRect = scrollParent.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();
                const relativeTop = elementRect.top - parentRect.top + scrollParent.scrollTop;
                scrollParent.scrollTo({ top: relativeTop - 20, behavior: 'smooth' });
            } else {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
        setShowMenu(false);
    };

    const allowedPaths = [
        '/teams',
        '/book-report',
        '/reports',
        '/denomination-report',
        '/field-data',
        '/settings'
    ];
    const isNavPage = allowedPaths.includes(location.pathname);

    // Only render the component on allowed pages
    if (!isNavPage) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3 print:hidden">
            {/* Quick Navigation Menu */}
            {showMenu && (
                <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-5 duration-300">
                    <button onClick={() => scrollToId('dashboard')} className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-100 shadow-2xl rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all hover:-translate-x-1">
                        <LayoutPanelTop size={14} className="text-[#1E5FA8]" /> Dashboard
                    </button>
                    <button onClick={() => scrollToId('report-table')} className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-100 shadow-2xl rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all hover:-translate-x-1">
                        <TableIcon size={14} className="text-emerald-500" /> Main Content
                    </button>
                    {location.pathname === '/denomination-report' && (
                        <>
                            <button onClick={() => scrollToId('denom-notes')} className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-100 shadow-2xl rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all hover:-translate-x-1">
                                <Banknote size={14} className="text-[#1E5FA8]" /> Paper Notes
                            </button>
                            <button onClick={() => scrollToId('denom-coins')} className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-100 shadow-2xl rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all hover:-translate-x-1">
                                <Coins size={14} className="text-amber-500" /> Metallic Coins
                            </button>
                        </>
                    )}
                </div>
            )}

            <div className="flex gap-3">
                {/* Menu Toggle - ALWAYS visible on allowed pages */}
               

                {/* Back to Top Button - Dynamic appearance */}
                {showTop && (
                    <button
                        onClick={scrollToTop}
                        className="p-3 bg-white/90 backdrop-blur-md border border-slate-100 text-slate-900 rounded-2xl shadow-xl hover:bg-slate-900 hover:text-white transition-all animate-in zoom-in slide-in-from-right-4 duration-300 group"
                        title="Back to Top"
                    >
                        <ChevronUp size={20} className="group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                )}
            </div>
        </div>
    );
}
