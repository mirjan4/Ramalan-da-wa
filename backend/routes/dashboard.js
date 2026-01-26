import express from 'express';
import Team from '../models/Team.js';
import Season from '../models/Season.js';

const router = express.Router();

router.get('/stats', async (req, res) => {
    const { seasonId } = req.query;
    try {
        const query = seasonId ? { season: seasonId } : {};
        const teams = await Team.find(query);

        const stats = {
            totalTeams: teams.length,
            settledTeams: teams.filter(t => t.status === 'SETTLED').length,
            pendingTeams: teams.filter(t => t.status !== 'SETTLED').length,
            totalCollection: teams.reduce((acc, team) => acc + (team.totalCollection || 0), 0),
            cashTotal: teams.reduce((acc, team) => acc + (team.cashAmount || 0), 0),
            bankTotal: teams.reduce((acc, team) => acc + (team.bankAmount || 0), 0),
            totalExpense: teams.reduce((acc, team) => acc + (team.expense || 0), 0),
            netBalance: teams.reduce((acc, team) => acc + (team.balance || 0), 0),
            teams: teams.map(t => ({ name: t.placeName, collection: t.totalCollection, expense: t.expense }))
        };

        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
