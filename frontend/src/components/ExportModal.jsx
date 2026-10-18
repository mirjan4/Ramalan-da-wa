import { useState, useEffect, useRef } from 'react';
import { X, FileSpreadsheet, Download } from 'lucide-react';

/**
 * Modern, Compact Export Fields Selection Modal
 *
 * @param {boolean} isOpen - Whether modal is visible
 * @param {function} onClose - Function to call on cancel/close
 * @param {function} onExport - Function called with array of selected keys: (selectedKeys) => void | Promise<void>
 * @param {Array<{key: string, label: string, category?: string}>} fields - Available fields to select from
 * @param {string} [title="Export Data"] - Modal title
 * @param {string} [description="Choose which fields to include in the export."] - Subtitle message
 * @param {string} [exportFormat="Excel"] - File format indication (e.g. "Excel" or "CSV")
 */
export default function ExportModal({
    isOpen,
    onClose,
    onExport,
    fields = [],
    title = "Export Data",
    description = "Choose which fields to include in the export.",
    exportFormat = "Excel",
}) {
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [isExporting, setIsExporting] = useState(false);
    const selectAllCheckboxRef = useRef(null);

    // Initialize or reset selections whenever modal opens or fields change
    useEffect(() => {
        if (isOpen && fields.length > 0) {
            setSelectedKeys(fields.map(f => f.key));
        }
    }, [isOpen, fields]);

    // Update indeterminate state on the Select All checkbox element
    const allSelected = fields.length > 0 && selectedKeys.length === fields.length;
    const isIndeterminate = selectedKeys.length > 0 && selectedKeys.length < fields.length;

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            selectAllCheckboxRef.current.indeterminate = isIndeterminate;
        }
    }, [isIndeterminate]);

    // Handle Escape key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && !isExporting) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isExporting, onClose]);

    if (!isOpen) return null;

    const handleToggleAll = () => {
        if (allSelected) {
            setSelectedKeys([]);
        } else {
            setSelectedKeys(fields.map(f => f.key));
        }
    };

    const handleToggleField = (key) => {
        setSelectedKeys(prev => {
            if (prev.includes(key)) {
                return prev.filter(k => k !== key);
            } else {
                return [...prev, key];
            }
        });
    };

    const handleConfirmExport = async () => {
        if (selectedKeys.length === 0 || isExporting) return;
        setIsExporting(true);
        try {
            await onExport(selectedKeys);
            onClose();
        } catch (err) {
            console.error('Export error:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const selectedCount = selectedKeys.length;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Darkened Backdrop Overlay */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
                onClick={!isExporting ? onClose : undefined}
            />

            {/* Compact, Modern Modal Card */}
            <div className="relative w-full max-w-[440px] bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shrink-0">
                            <FileSpreadsheet size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none truncate">
                                    {title}
                                </h3>
                                {exportFormat && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/70 leading-none">
                                        {exportFormat}
                                    </span>
                                )}
                            </div>
                            {description && (
                                <p className="text-[11px] text-slate-400 font-medium truncate mt-1 leading-none">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isExporting}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
                        title="Close (Esc)"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Select All Bar with Subtle Divider Below */}
                <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer select-none group">
                        <input
                            ref={selectAllCheckboxRef}
                            type="checkbox"
                            checked={allSelected}
                            onChange={handleToggleAll}
                            disabled={isExporting || fields.length === 0}
                            className="w-3.5 h-3.5 rounded text-[#10B981] accent-[#10B981] focus:ring-0 border-slate-300 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                            Select All
                        </span>
                    </label>

                    <span className="text-[11px] font-medium text-slate-400">
                        <strong className="text-slate-700 font-bold">{selectedCount}</strong> of {fields.length} selected
                    </span>
                </div>

                {/* Scrollable Fields Section (Two neat columns on desktop, one column on mobile) */}
                <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex-1 max-h-[280px]">
                    {fields.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs italic">
                            No export fields available for the current dataset.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                            {fields.map((field) => {
                                const isChecked = selectedKeys.includes(field.key);
                                return (
                                    <label
                                        key={field.key}
                                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer select-none group ${
                                            isChecked
                                                ? 'bg-emerald-50/60 text-slate-900'
                                                : 'hover:bg-slate-50 text-slate-600'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => handleToggleField(field.key)}
                                            disabled={isExporting}
                                            className="w-3.5 h-3.5 rounded text-[#10B981] accent-[#10B981] focus:ring-0 border-slate-300 cursor-pointer shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs truncate leading-tight transition-colors ${
                                                isChecked
                                                    ? 'font-semibold text-slate-800'
                                                    : 'font-medium text-slate-600 group-hover:text-slate-800'
                                            }`}>
                                                {field.label}
                                            </p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Compact Footer */}
                <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/40 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isExporting}
                        className="px-3.5 py-1.5 rounded-lg font-semibold text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirmExport}
                        disabled={selectedCount === 0 || isExporting}
                        className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                            selectedCount === 0 || isExporting
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                                : 'bg-[#10B981] hover:bg-[#059669] text-white active:scale-95 shadow-emerald-200/50'
                        }`}
                    >
                        {isExporting ? (
                            <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Download size={13} />
                                <span>Export ({selectedCount})</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
