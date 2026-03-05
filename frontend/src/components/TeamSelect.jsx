import { useState, useEffect } from 'react';
import { teamService, seasonService } from '../services/api';

export default function TeamSelect({ onSelect, selectedId, filterLocked = false }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const seasonRes = await seasonService.getActive();
        if (seasonRes.data) {
          const teamsRes = await teamService.getAll(seasonRes.data._id);
          let filteredTeams = teamsRes.data.sort((a, b) => {
            if (a.isLocked === b.isLocked) return a.placeName.localeCompare(b.placeName);
            return a.isLocked ? 1 : -1; // Pending first
          });
          if (filterLocked) {
            filteredTeams = filteredTeams.filter(t => !t.isLocked);
          }
          setTeams(filteredTeams);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, [filterLocked]);

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">Choose team</label>
      <div className="relative">
        <select
          className="input-field h-12 pr-10 appearance-none font-bold text-[#0F3B66] cursor-pointer"
          value={selectedId || ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={loading}
        >
          <option value="">-- Choose  Field Unit --</option>
          {teams.map((team) => (
            <option
              key={team._id}
              value={team._id}
              className={team.isLocked ? 'text-slate-400' : 'text-[#0F3B66] font-bold'}
            >
              {team.isLocked ? '🔒' : '🕒'} • {team.placeName} ({team.state})
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
      {teams.length === 0 && !loading && (
        <p className="text-[10px] font-bold text-[#F59E0B] mt-2 uppercase tracking-tight flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          No active deployment units found
        </p>
      )}
    </div>
  );
}
