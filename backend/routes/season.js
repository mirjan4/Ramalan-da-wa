import express from 'express';
import jwt from 'jsonwebtoken';
import Season from '../models/Season.js';
import Team from '../models/Team.js';
import FieldData from '../models/FieldData.js';

const router = express.Router();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

router.get('/', async (req, res) => {
    try {
        const seasons = await Season.find().sort({ createdAt: -1 }).lean();
        // Enrich with counts for teams and field data
        const enriched = await Promise.all(seasons.map(async (s) => {
            const teamCount = await Team.countDocuments({ season: s._id });
            const recordCount = await FieldData.countDocuments({ season: s._id });
            return {
                ...s,
                teamCount,
                recordCount
            };
        }));
        res.json(enriched);
    } catch (err) {
        console.error('DEBUG - Fetch Seasons Error:', err);
        res.status(500).json({
            debug: true,
            message: err.message,
            name: err.name,
            stack: err.stack
        });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    const { name, isLocked } = req.body;
    try {
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Season name is required' });
        }
        const season = new Season({ 
            name: name.trim(),
            isLocked: !!isLocked
        });
        await season.save();
        res.json(season);
    } catch (err) {
        console.error('DEBUG - Create Season Error:', err);
        res.status(500).json({ message: err.message, name: err.name });
    }
});

// Update season name and rules (Active status, Lock rule)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, isActive, isLocked } = req.body;
        const updateData = {};

        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ message: 'Season name cannot be empty' });
            }
            updateData.name = name.trim();
        }

        if (isLocked !== undefined) {
            updateData.isLocked = !!isLocked;
            // Rule enforcement: sync isLocked status to all field data entries in this season
            await FieldData.updateMany(
                { season: req.params.id },
                { $set: { isLocked: !!isLocked } }
            );
        }

        if (isActive === true) {
            await Season.updateMany({}, { isActive: false });
            updateData.isActive = true;
        }

        const season = await Season.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!season) {
            return res.status(404).json({ message: 'Season not found' });
        }
        res.json(season);
    } catch (err) {
        console.error('DEBUG - Update Season Error:', err);
        res.status(500).json({ message: err.message, name: err.name });
    }
});

router.put('/:id/activate', authenticateToken, async (req, res) => {
    try {
        await Season.updateMany({}, { isActive: false });
        const season = await Season.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
        res.json(season);
    } catch (err) {
        console.error('DEBUG - Activate Season Error:', err);
        res.status(500).json({ message: err.message, name: err.name });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const season = await Season.findById(req.params.id);
        if (!season) {
            return res.status(404).json({ message: 'Season not found' });
        }
        if (season.isActive) {
            return res.status(400).json({ message: 'Cannot delete the active operational season. Please activate another season first.' });
        }
        // Integrity rule check: ensure no teams exist for this season
        const teamCount = await Team.countDocuments({ season: req.params.id });
        if (teamCount > 0) {
            return res.status(400).json({ 
                message: `Cannot delete season: ${teamCount} team(s) are registered in this season. Remove or reassign them first.` 
            });
        }
        // Integrity rule check: ensure no field data records exist
        const fieldDataCount = await FieldData.countDocuments({ season: req.params.id });
        if (fieldDataCount > 0) {
            return res.status(400).json({ 
                message: `Cannot delete season: ${fieldDataCount} field data record(s) exist in this season.` 
            });
        }

        await Season.findByIdAndDelete(req.params.id);
        res.json({ message: 'Season deleted successfully' });
    } catch (err) {
        console.error('DEBUG - Delete Season Error:', err);
        res.status(500).json({ message: err.message, name: err.name });
    }
});

router.get('/active', async (req, res) => {
    try {
        const season = await Season.findOne({ isActive: true });
        res.json(season);
    } catch (err) {
        console.error('DEBUG - Get Active Season Error:', err);
        res.status(500).json({
            debug: true,
            message: err.message,
            name: err.name,
            stack: err.stack
        });
    }
});

export default router;
