import express from 'express';
import Team from '../models/Team.js';
import Season from '../models/Season.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const { seasonId } = req.query;
    try {
        const query = seasonId ? { season: seasonId } : {};
        const teams = await Team.find(query).populate('season');
        res.json(teams);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    const { placeName, state, season, members, advanceAmount } = req.body;
    try {
        const team = new Team({ placeName, state, season, members, advanceAmount });
        await team.save();
        res.json(team);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/:id/assign-books', async (req, res) => {
    const { receiptBooks } = req.body;
    try {
        const team = await Team.findById(req.params.id);
        if (team.isLocked) return res.status(403).json({ message: 'Team is locked' });

        // Enforce audit safety page calculations
        team.receiptBooks = receiptBooks.map(book => {
            const bNum = parseInt(book.bookNumber);
            if (!isNaN(bNum) && bNum > 0) {
                const start = (bNum * 50) - 49;
                return {
                    ...book,
                    startPage: start,
                    endPage: start + 49
                };
            }
            return book;
        });
        await team.save();
        res.json(team);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { placeName, state, members, advanceAmount } = req.body;
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        team.placeName = placeName || team.placeName;
        team.state = state || team.state;
        team.members = members || team.members;
        team.advanceAmount = advanceAmount !== undefined ? advanceAmount : team.advanceAmount;

        await team.save();
        res.json(team);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const team = await Team.findById(req.params.id).populate('season');
        res.json(team);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
