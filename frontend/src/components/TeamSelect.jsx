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
    <div className="mb-6">
      <label className="label">Select Team / Place</label>
      <select
        className="input-field"
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        disabled={loading}
      >
        <option value="">-- Choose a Team --</option>
        {teams.map((team) => (
          <option
            key={team._id}
            value={team._id}
            className={team.isLocked ? 'text-slate-400 italic' : 'font-bold'}
          >
            {team.isLocked ? '🔒' : '🕒'} {team.placeName} ({team.state}) {team.isLocked ? '' : ' '}
          </option>
        ))}
      </select>
      {teams.length === 0 && !loading && (
        <p className="text-sm text-amber-600 mt-2">No eligible teams found for the active season.</p>
      )}
    </div>
  );
}
