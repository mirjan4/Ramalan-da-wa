import { useState, useEffect } from 'react';
import { teamService, seasonService } from '../services/api';
import { Download, Upload, FileSpreadsheet, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MySwal } from '../utils/swal';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export default function TeamTools() {
    const [activeSeason, setActiveSeason] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        seasonService.getActive().then(res => setActiveSeason(res.data));
    }, []);

    const handleExport = async () => {
        if (!activeSeason) return;
        setLoading(true);
        try {
            const res = await teamService.getAll(activeSeason._id);
            const teams = res.data;

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Teams Data');

            // Define Columns
            sheet.columns = [
                { header: 'Place Name', key: 'place', width: 25 },
                { header: 'State', key: 'state', width: 10 },
                { header: 'Advance Amount', key: 'advance', width: 15 },
                { header: 'Assigned Books', key: 'books', width: 20 },
                { header: 'Members Name', key: 'name', width: 25 },
                { header: 'Class', key: 'class', width: 10 },
                { header: 'Phone', key: 'phone', width: 15 },
            ];

            // Header Style
            const headerRow = sheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo-600
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 30;

            // Add Data
            teams.forEach(team => {
                const startRow = sheet.lastRow.number + 1;
                const bookStr = team.receiptBooks ? team.receiptBooks.map(b => b.bookNumber).join(', ') : '';

                if (team.members.length === 0) {
                    // Handle empty members case
                    sheet.addRow({
                        place: team.placeName,
                        state: team.state,
                        advance: team.advanceAmount || 0,
                        books: bookStr,
                        name: '', class: '', phone: ''
                    });
                } else {
                    team.members.forEach((m, idx) => {
                        const row = sheet.addRow({
                            place: idx === 0 ? team.placeName : '',
                            state: idx === 0 ? team.state : '',
                            advance: idx === 0 ? (team.advanceAmount || 0) : '',
                            books: idx === 0 ? bookStr : '',
                            name: m.name,
                            class: m.class,
                            phone: m.phone
                        });

                        // Center align Place and State
                        row.getCell('state').alignment = { vertical: 'middle', horizontal: 'center' };
                        row.getCell('place').alignment = { vertical: 'middle', horizontal: 'left' };
                        row.getCell('advance').alignment = { vertical: 'middle', horizontal: 'center' };
                        row.getCell('books').alignment = { vertical: 'middle', horizontal: 'left' };
                    });

                    // Merge Cells if multiple members (Cols A, B, C, D)
                    const endRow = sheet.lastRow.number;
                    if (endRow > startRow) {
                        sheet.mergeCells(`A${startRow}:A${endRow}`);
                        sheet.mergeCells(`B${startRow}:B${endRow}`);
                        sheet.mergeCells(`C${startRow}:C${endRow}`);
                        sheet.mergeCells(`D${startRow}:D${endRow}`);
                    }
                }
            });

            // Add Borders to all cells
            sheet.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `Ramalan_Teams_${activeSeason.name.replace(/\s+/g, '_')}.xlsx`);
            MySwal.fire({
                title: 'Exported!',
                text: 'Teams data has been downloaded as an Excel file.',
                icon: 'success',
                timer: 2000
            });
        } catch (err) {
            console.error(err);
            MySwal.fire('Error', 'Failed to generate Excel export.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleImportTemplate = async () => {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Template');

        sheet.columns = [
            { header: 'Place Name', key: 'place', width: 25 },
            { header: 'State', key: 'state', width: 10 },
            { header: 'Advance Amount', key: 'advance', width: 15 },
            { header: 'Assigned Books', key: 'books', width: 20 },
            { header: 'Members Name', key: 'name', width: 25 },
            { header: 'Class', key: 'class', width: 10 },
            { header: 'Phone', key: 'phone', width: 15 },
        ];

        // Sample Data
        const sampleData = [
            { place: 'Kozhikode', state: 'KL', advance: 5000, books: '101, 102', name: 'Muhammed Ali', class: '10', phone: '9876543210' },
            { place: '', state: '', advance: '', books: '', name: 'Abdulla', class: '9', phone: '9876543211' }, // Merged representation
            { place: 'Malappuram', state: 'KL', advance: 2000, books: '103', name: 'Hassan', class: '12', phone: '9876543212' },
        ];

        // Header Style
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

        sampleData.forEach(d => sheet.addRow(d));

        // Merge sample 1
        sheet.mergeCells('A2:A3');
        sheet.mergeCells('B2:B3');
        sheet.mergeCells('C2:C3');
        sheet.mergeCells('D2:D3');

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), 'Team_Import_Template.xlsx');
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!activeSeason) {
            MySwal.fire('No Active Season', 'Please activate a season before importing teams.', 'warning');
            return;
        }

        setLoading(true);
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(await file.arrayBuffer());
            const sheet = workbook.getWorksheet(1); // First sheet

            if (!sheet) throw new Error("No sheet found in workbook");

            const teamsMap = []; // Linear list of teams
            let currentTeam = null;

            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header

                // Get values safely. ExcelJS can return objects for rich text.
                const getVal = (idx) => {
                    const val = row.getCell(idx).value;
                    if (val && typeof val === 'object' && val.result) return val.result; // Formula result
                    if (val && typeof val === 'object' && val.text) return val.text;   // Rich text
                    return val ? String(val).trim() : '';
                };

                // Helper to get master value if merged
                const getMasterVal = (colIdx) => {
                    const cell = row.getCell(colIdx);
                    if (cell.isMerged && cell.master) {
                        return cell.master.value ? String(cell.master.value).trim() : '';
                    }
                    return getVal(colIdx);
                };

                const placeName = getVal(1);
                // Columns: 1:Place, 2:State, 3:Advance, 4:Books, 5:Name, 6:Class, 7:Phone

                const memberName = getVal(5);
                const memberClass = getVal(6);
                const memberPhone = getVal(7);

                // Effective values (handling Merges & Empty cells logic)
                let effectivePlace = placeName || getMasterVal(1);
                let effectiveState = getVal(2) || getMasterVal(2);
                let effectiveAdvance = getVal(3) || getMasterVal(3);
                let effectiveBooks = getVal(4) || getMasterVal(4);

                // Logic: If PlaceName is present OR different from previous logic, start new team.
                // If it is merged, effectivePlace has value.

                if (effectivePlace) {
                    if (!currentTeam || currentTeam.placeName !== effectivePlace) {
                        // Push old team
                        if (currentTeam) teamsMap.push(currentTeam);

                        // Parse Books
                        const receiptBooks = [];
                        if (effectiveBooks) {
                            const bookNums = String(effectiveBooks).split(',').map(s => s.trim()).filter(Boolean);
                            bookNums.forEach(num => {
                                const bNum = parseInt(num);
                                if (!isNaN(bNum)) {
                                    const start = (bNum * 50) - 49;
                                    const end = start + 49;
                                    receiptBooks.push({ bookNumber: bNum, startPage: start, endPage: end });
                                }
                            });
                        }

                        // New Team
                        currentTeam = {
                            placeName: effectivePlace,
                            state: effectiveState || '',
                            advanceAmount: effectiveAdvance ? Number(effectiveAdvance) : 0,
                            receiptBooks: receiptBooks,
                            members: []
                        };
                    }
                }

                // If we have a current team (either just created or continued), add member
                if (currentTeam && (memberName || memberClass || memberPhone)) {
                    currentTeam.members.push({
                        name: memberName || '',
                        class: memberClass || '',
                        phone: memberPhone || ''
                    });
                }
            });

            // Push last team
            if (currentTeam) teamsMap.push(currentTeam);

            // API Upload
            let successCount = 0;
            let errorCount = 0;

            for (const team of teamsMap) {
                try {
                    await teamService.create({
                        ...team,
                        season: activeSeason._id
                    });
                    successCount++;
                } catch (err) {
                    console.error("Failed to import team:", team.placeName, err);
                    errorCount++;
                }
            }

            await MySwal.fire({
                title: 'Import Complete',
                text: `Processed ${teamsMap.length} groups. Successfully imported ${successCount} teams.`,
                icon: errorCount > 0 ? 'warning' : 'success',
                confirmButtonText: 'Great'
            });

        } catch (err) {
            console.error("Import error", err);
            MySwal.fire('Import Failed', 'Failed to process Excel file. Please check the template format.', 'error');
        } finally {
            setLoading(false);
            e.target.value = null;
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto">
            <button
                onClick={() => navigate('/teams')}
                className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm mb-6 transition-colors"
            >
                <ArrowLeft size={16} /> Back to Teams
            </button>

            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                    <FileSpreadsheet size={24} />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Data Tools</h1>
                    <p className="text-slate-500 mt-1">Advanced Excel Import/Export for Teams.</p>
                </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Export Section */}
                <div className="glass-card p-8 border-none bg-white">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                        <Download className="text-indigo-600" size={20} /> Export Excel
                    </h2>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                        Download formatted Excel sheet showing Teams and their Members in grouped rows (Merged cells).
                    </p>
                    <button
                        onClick={handleExport}
                        disabled={loading || !activeSeason}
                        className="btn-secondary w-full py-3 flex justify-center items-center gap-2 hover:bg-slate-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                        Download .xlsx
                    </button>
                </div>

                {/* Import Section */}
                <div className="glass-card p-8 border-none bg-white">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-800">
                        <Upload className="text-indigo-600" size={20} /> Import Excel
                    </h2>
                    <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                        Upload Excel file with grouped data (Merged Place/State cells supported).
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleImportTemplate}
                            className="text-xs font-bold text-indigo-600 hover:underline text-left"
                        >
                            Download Excel Template
                        </button>

                        <div className="relative">
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleImport}
                                disabled={loading || !activeSeason}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="btn-primary w-full py-3 flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 cursor-pointer">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                Select Excel File
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
