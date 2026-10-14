import express from 'express';
import mongoose from 'mongoose';
import Team from '../models/Team.js';
import Season from '../models/Season.js';
import FieldData from '../models/FieldData.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(401).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Permission denied' });
        next();
    };
};

router.get('/', async (req, res) => {
    const { seasonId } = req.query;
    try {
        const query = seasonId ? { season: seasonId } : {};
        const teams = await Team.find(query).populate('season');
        res.json(teams);
    } catch (err) {
        console.error('Fetch teams error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.post('/copy-from-season', authenticateToken, async (req, res) => {
    const { sourceSeasonId, targetSeasonId, teamIds } = req.body;
    try {
        if (!sourceSeasonId || !targetSeasonId) {
            return res.status(400).json({ message: 'Both sourceSeasonId and targetSeasonId are required' });
        }

        const query = { season: sourceSeasonId };
        if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
            const validIds = teamIds.filter(id => id && mongoose.Types.ObjectId.isValid(id));
            query._id = { $in: validIds };
        }

        const sourceTeams = await Team.find(query);
        if (sourceTeams.length === 0) {
            return res.status(404).json({ message: 'No teams found in the source season' });
        }

        const existingTargetTeams = await Team.find({ season: targetSeasonId });
        const existingPlaceNames = new Set(existingTargetTeams.map(t => t.placeName.trim().toLowerCase()));

        const teamsToCreate = [];
        for (const st of sourceTeams) {
            const placeKey = st.placeName.trim().toLowerCase();
            if (!existingPlaceNames.has(placeKey)) {
                teamsToCreate.push({
                    placeName: st.placeName,
                    state: st.state,
                    season: targetSeasonId,
                    members: st.members.map(m => ({
                        name: m.name,
                        class: m.class,
                        phone: m.phone
                    })),
                    advanceAmount: 0,
                    totalCollection: 0,
                    cashAmount: 0,
                    cashRef: '',
                    bankAmount: 0,
                    bankRef: '',
                    expense: 0,
                    balance: 0,
                    status: 'PENDING',
                    isLocked: false,
                    receiptBooks: []
                });
                existingPlaceNames.add(placeKey);
            }
        }

        if (teamsToCreate.length === 0) {
            return res.status(400).json({
                message: 'All selected teams from the source season already exist in the target season.'
            });
        }

        const createdTeams = await Team.insertMany(teamsToCreate);
        res.status(201).json({
            message: `Successfully activated ${createdTeams.length} team(s) in the new season.`,
            count: createdTeams.length,
            teams: createdTeams
        });
    } catch (err) {
        console.error('Copy teams error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.post('/', async (req, res) => {
    const { placeName, state, season, members, advanceAmount } = req.body;
    try {
        const team = new Team({ placeName, state, season, members, advanceAmount });
        await team.save();
        res.json(team);
    } catch (err) {
        console.error('Create team error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.put('/:id/assign-books', async (req, res) => {
    const { receiptBooks } = req.body;
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        if (team.isLocked) return res.status(403).json({ message: 'Team is locked and cannot be modified' });

        // Smart Protection: Check if any "used" books are being removed
        for (const oldBook of team.receiptBooks) {
            const isUsed = oldBook.collectedAmount > 0 || oldBook.isEntered;
            if (isUsed) {
                const stillExists = receiptBooks.find(b => String(b.bookNumber) === String(oldBook.bookNumber));
                if (!stillExists) {
                    return res.status(403).json({
                        message: `Rule Violation: Book #${oldBook.bookNumber} cannot be removed because collection data has already been recorded for it. Finalize the settlement or clear the amounts first.`
                    });
                }
            }
        }

        team.receiptBooks = receiptBooks.map(book => {
            const bNum = parseInt(book.bookNumber);
            if (!isNaN(bNum) && bNum > 0) {
                const start = (bNum * 50) - 49;
                const existing = team.receiptBooks.find(eb => String(eb.bookNumber) === String(bNum));
                return {
                    ...book,
                    startPage: start,
                    endPage: start + 49,
                    usedStartPage: existing?.usedStartPage || book.usedStartPage,
                    usedEndPage: existing?.usedEndPage || book.usedEndPage,
                    collectedAmount: existing?.collectedAmount || book.collectedAmount || 0,
                    isEntered: existing?.isEntered || book.isEntered || false
                };
            }
            return book;
        }).filter(b => b.bookNumber); // Remove any empty rows

        // Recalculate total collection to keep team stats in sync
        team.totalCollection = team.receiptBooks.reduce((acc, book) => acc + (Number(book.collectedAmount) || 0), 0);

        // If team is being made "bookless", ensure it's not considered as having a shortage/settled status falsely
        if (team.receiptBooks.length === 0) {
            team.status = 'PENDING';
            team.balance = 0;
            team.totalCollection = 0;
        }

        await team.save();
        res.json(team);
    } catch (err) {
        console.error('Assign books error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.put('/:id', async (req, res) => {
    const { placeName, state, members, advanceAmount } = req.body;
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        if (team.isLocked) return res.status(403).json({ message: 'Record is locked' });

        team.placeName = placeName || team.placeName;
        team.state = state || team.state;
        team.members = members || team.members;
        team.advanceAmount = advanceAmount !== undefined ? advanceAmount : team.advanceAmount;

        await team.save();
        res.json(team);
    } catch (err) {
        console.error('Update team error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const team = await Team.findById(req.params.id).populate('season');
        if (!team) return res.status(404).json({ message: 'Team not found' });
        res.json(team);
    } catch (err) {
        console.error('Fetch team details error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        // Rule 1: No settlement done
        if (team.isLocked || team.totalCollection > 0) {
            return res.status(403).json({
                message: 'Deletion Denied: This team has already finalized their settlement and the record is locked for audit.'
            });
        }

        // Rule 2: No field collection entered
        const fieldDataExists = await FieldData.findOne({
            place: team.placeName,
            season: team.season
        });

        if (fieldDataExists) {
            return res.status(403).json({
                message: 'Deletion Denied: Local field collection entries (masjid/shop data) have already been recorded for this team. Remove field data first.'
            });
        }

        await team.deleteOne();
        res.json({ message: 'Team deleted successfully' });
    } catch (err) {
        console.error('Delete team error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

export default router;
