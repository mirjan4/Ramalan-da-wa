import express from 'express';
import Season from '../models/Season.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const seasons = await Season.find().sort({ createdAt: -1 });
        res.json(seasons);
    } catch (err) {
        console.error('DEBUG - Fetch Seasons Error:', err);
        // Temporary detailed error for debugging
        res.status(500).json({
            debug: true,
            message: err.message,
            name: err.name,
            stack: err.stack
        });
    }
});

router.post('/', async (req, res) => {
    const { name } = req.body;
    try {
        const season = new Season({ name });
        await season.save();
        res.json(season);
    } catch (err) {
        console.error('DEBUG - Create Season Error:', err);
        res.status(500).json({ message: err.message, name: err.name });
    }
});

router.put('/:id/activate', async (req, res) => {
    try {
        await Season.updateMany({}, { isActive: false });
        const season = await Season.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
        res.json(season);
    } catch (err) {
        console.error('DEBUG - Activate Season Error:', err);
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
