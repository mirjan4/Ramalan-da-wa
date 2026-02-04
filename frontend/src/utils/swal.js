import Swal from 'sweetalert2';

// Create a custom styled SweetAlert2 configuration
export const MySwal = Swal.mixin({
    customClass: {
        confirmButton: 'px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg mx-2',
        cancelButton: 'px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200 mx-2',
        popup: 'rounded-3xl border-none shadow-2xl p-8',
        title: 'text-2xl font-black text-slate-900 mb-2',
        htmlContainer: 'text-slate-500 leading-relaxed'
    },
    buttonsStyling: false
});

export const confirmDelete = async (title = 'Are you sure?', text = "This action cannot be undone.") => {
    const result = await MySwal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Delete',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        iconColor: '#f43f5e' // rose-500
    });

    return result.isConfirmed;
};

export const confirmAction = async ({ title, text, confirmText, variant = 'info' }) => {
    const colors = {
        danger: '#f43f5e',
        warning: '#f59e0b',
        info: '#6366f1',
        success: '#10b981'
    };

    const result = await MySwal.fire({
        title,
        text,
        icon: variant === 'danger' ? 'error' : variant,
        showCancelButton: true,
        confirmButtonText: confirmText || 'Proceed',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        iconColor: colors[variant] || colors.info
    });

    return result.isConfirmed;
};

export default MySwal;
