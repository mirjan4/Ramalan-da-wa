import express from 'express';
import Season from '../models/Season.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const seasons = await Season.find().sort({ createdAt: -1 });
        res.json(seasons);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    const { name } = req.body;
    try {
        // If active, deactivate others
        const season = new Season({ name });
        await season.save();
        res.json(season);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/:id/activate', async (req, res) => {
    try {
        await Season.updateMany({}, { isActive: false });
        const season = await Season.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
        res.json(season);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/active', async (req, res) => {
    try {
        const season = await Season.findOne({ isActive: true });
        res.json(season);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
