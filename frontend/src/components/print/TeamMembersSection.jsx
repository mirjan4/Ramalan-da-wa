import React from 'react';

const TeamMembersSection = ({ members }) => {
    return (
        <section className="mb-6 avoid-break">
            <h3 className="text-[11pt] font-bold uppercase tracking-wide border-b border-black mb-2 inline-block">Team Members</h3>
            <table className="w-full text-[10pt]">
                <thead>
                    <tr className="bg-slate-50 font-bold border-b border-black">
                        <th className="text-left w-[40%]">Name</th>
                        <th className="text-left w-[30%]">Class</th>
                        <th className="text-left w-[30%]">Phone</th>
                    </tr>
                </thead>
                <tbody>
                    {members.map((member, idx) => (
                        <tr key={idx}>
                            <td>{member.name}</td>
                            <td>{member.class}</td>
                            <td>{member.phone}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
};

export default TeamMembersSection;
