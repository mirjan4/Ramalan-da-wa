import React from 'react';

const ReceiptBookDetails = ({ books, total }) => {
    const activeBooks = books
        .filter(b => Number(b.collectedAmount) > 0)
        .sort((a, b) => Number(a.bookNumber) - Number(b.bookNumber));

    const unusedBooks = books
        .filter(b => Number(b.collectedAmount) <= 0)
        .sort((a, b) => Number(a.bookNumber) - Number(b.bookNumber));

    return (
        <section className="mb-6 avoid-break">
            <div className="flex justify-between items-end border-b border-black mb-2">
                <h3 className="text-[11pt] font-bold uppercase tracking-wide inline-block">Receipt Book Details</h3>
                <span className="text-[9pt] font-bold text-slate-500 uppercase pb-0.5">{books.length} Books Assigned</span>
            </div>
            <table className="w-full text-[10pt] mb-2">
                <thead>
                    <tr className="bg-slate-50 font-bold border-b border-black">
                        <th className="text-center w-16">Sl No</th>
                        <th className="text-center w-18">Book #</th>
                        <th className="text-center w-28">Start No</th>
                        <th className="text-center w-28">End No</th>
                        <th className="text-right">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {activeBooks.map((book, idx) => (
                        <tr key={idx}>
                            <td className="text-center font-mono">{idx + 1}</td>
                            <td className="text-center font-bold">{book.bookNumber}</td>
                            <td className="text-center font-mono">{book.usedStartPage}</td>
                            <td className="text-center font-mono">{book.usedEndPage}</td>
                            <td className="text-right font-medium">{Number(book.collectedAmount).toLocaleString()}</td>
                        </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold border-t-2 border-black">
                        <td colSpan="4" className="text-right uppercase text-[9pt] pr-4 tracking-tight">Total Collection :</td>
                        <td className="text-right">₹{total.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            {unusedBooks.length > 0 && (
                <div className="mt-1 text-[9pt] italic text-slate-500">
                    <span className="font-bold not-italic text-black">Unused Books:</span> {unusedBooks.map(b => b.bookNumber).join(', ')}
                </div>
            )}
        </section>
    );
};

export default ReceiptBookDetails;
