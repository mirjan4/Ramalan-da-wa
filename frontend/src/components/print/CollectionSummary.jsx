import React from 'react';

const CollectionSummary = ({ total, expense, advance, netBalance, cash, bank, totalReceived, cashRef, bankRef, status, children }) => {
    return (
        <div className="avoid-break mt-6">
            <div className="border-2 border-black mb-6 font-mono text-[10pt] shadow-sm">
                <div className="bg-slate-50 border-b-2 border-black p-1 text-center font-bold uppercase tracking-widest text-[11pt]">
                    Collection Summary
                </div>
                <div className="p-3 space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-700">Total Collection</span>
                        <span className="font-bold">: ₹ {total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-700">Expense (-)</span>
                        <span className="font-bold">: ₹ {Number(expense).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-700">Advance Given (-)</span>
                        <span className="font-bold">: ₹ {Number(advance).toLocaleString()}</span>
                    </div>

                    <div className="border-t border-dashed border-slate-300 my-2 opacity-75"></div>

                    <div className="flex justify-between items-center bg-slate-50 -mx-3 px-3 py-1 border-y border-dashed border-slate-300">
                        <span className="font-bold uppercase tracking-tight text-[10pt]">Net Balance (Due to Office)</span>
                        <span className="font-black text-[11pt]">: ₹ {netBalance.toLocaleString()}</span>
                    </div>

                    <div className="border-t border-dashed border-slate-300 my-2 opacity-75"></div>

                    <div className="flex justify-between items-center">
                        <span className="text-slate-600">Actual Cash {cashRef && <span className="text-[9pt] font-normal text-slate-500">({cashRef})</span>}</span>
                        <span className="font-medium">: ₹ {Number(cash).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-600">Actual Bank {bankRef && <span className="text-[9pt] font-normal text-slate-500">({bankRef})</span>}</span>
                        <span className="font-medium">: ₹ {Number(bank).toLocaleString()}</span>
                    </div>

                    <div className="border-t-2 border-black my-2"></div>

                    <div className="flex justify-between items-center font-black text-[11pt]">
                        <span className="uppercase tracking-tighter">Total Received</span>
                        <span>: ₹ {totalReceived.toLocaleString()}</span>
                    </div>
                </div>
            </div>

           

            {/* Signatures */}
            <br />
            <br />
            <br />
            <br />
            <div className="grid grid-cols-2 gap-12 mb-2 px-4">

                <div className="text-center pt-6 border-t border-black">
                    <p className="font-bold text-[10pt] uppercase">Team Representative</p>
                    <p className="text-[8pt] text-slate-500 uppercase mt-1">(Sign & Date)</p>
                </div>
                <div className="text-center pt-6 border-t border-black">
                    <p className="font-bold text-[10pt] uppercase">Office Accountant</p>
                    <p className="text-[8pt] text-slate-500 uppercase mt-1">(Sign & Stamp)</p>
                </div>
            </div>

            {children}
        </div>
    );
};

export default CollectionSummary;
