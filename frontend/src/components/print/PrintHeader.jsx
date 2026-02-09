import React from 'react';

const PrintHeader = ({ season, location, date, subtitle = "Settlement Sheet", dateLabel = "Settlement Date" }) => {
    return (
        <div className="mb-4 text-center border-b-2 border-black pb-2">
            <h1 className="text-xl font-bold uppercase tracking-widest leading-none mb-1">
                {season || 'Ramalan Season'}
            </h1>
            <p className="text-[10pt] font-bold uppercase tracking-[0.2em]">{subtitle}</p>

            <div className="flex justify-between items-end mt-4 text-[10pt]">
                <div className="text-left">
                    <span className="font-bold uppercase tracking-wider text-slate-600 text-[9pt] block mb-0.5">Location</span>
                    <span className="font-bold">{location}</span>
                </div>
                <div className="text-right">
                    <span className="font-bold uppercase tracking-wider text-slate-600 text-[9pt] block mb-0.5">{dateLabel}</span>
                    <span className="font-bold">{date}</span>
                </div>
            </div>
        </div>
    );
};

export default PrintHeader;
