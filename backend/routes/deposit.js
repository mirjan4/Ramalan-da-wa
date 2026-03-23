import express from 'express';
import Deposit from '../models/Deposit.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) return res.status(401).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

router.get('/', authenticateToken, async (req, res) => {
    const { seasonId } = req.query;
    try {
        const query = seasonId ? { season: seasonId } : {};
        const deposits = await Deposit.find(query).sort({ date: -1 });
        res.json(deposits);
    } catch (err) {
        console.error('Fetch deposits error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    const { season, amount, date, breakdown, reference } = req.body;
    try {
        const deposit = new Deposit({ season, amount, date, breakdown, reference });
        await deposit.save();
        res.json(deposit);
    } catch (err) {
        console.error('Create deposit error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await Deposit.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deposit deleted successfully' });
    } catch (err) {
        console.error('Delete deposit error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

export default router;
