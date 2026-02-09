import React from 'react';

const PrintContainer = ({ children }) => {
    return (
        <div className="hidden print:block print:w-full bg-white mx-auto print:h-auto print:overflow-visible text-black font-sans leading-tight">
            {children}
        </div>
    );
};

export default PrintContainer;
