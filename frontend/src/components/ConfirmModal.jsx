import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Are you sure?",
    message = "This action cannot be undone.",
    confirmText = "Delete",
    cancelText = "Cancel",
    variant = "danger" // danger, warning, info
}) {
    if (!isOpen) return null;

    const variants = {
        danger: {
            icon: <AlertTriangle className="text-rose-600" size={24} />,
            bg: "bg-rose-50",
            btn: "bg-rose-600 hover:bg-rose-700 shadow-rose-200",
            border: "border-rose-100"
        },
        warning: {
            icon: <AlertTriangle className="text-amber-600" size={24} />,
            bg: "bg-amber-50",
            btn: "bg-amber-600 hover:bg-amber-700 shadow-amber-200",
            border: "border-amber-100"
        },
        info: {
            icon: <AlertTriangle className="text-indigo-600" size={24} />,
            bg: "bg-indigo-50",
            btn: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200",
            border: "border-indigo-100"
        }
    };

    const style = variants[variant] || variants.danger;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 sm:p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-3 rounded-2xl ${style.bg} ${style.border} border`}>
                            {style.icon}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 leading-relaxed">{message}</p>

                    <div className="flex flex-col sm:flex-row gap-3 mt-8">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] ${style.btn}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
