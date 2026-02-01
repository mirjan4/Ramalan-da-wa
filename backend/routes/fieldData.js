import express from 'express';
import FieldData from '../models/FieldData.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// JWT Middleware with role checking
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Role-based middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
};

// Get all field data (Admin: all data, Data Collector: only their own)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { seasonId } = req.query;
        let query = {};

        if (seasonId) query.season = seasonId;

        // Data collectors can only see their own entries
        if (req.user.role === 'data_collector') {
            query.createdBy = req.user.id;
        }

        const fieldData = await FieldData.find(query)
            .populate('season', 'name')
            .populate('createdBy', 'username displayName')
            .sort({ createdAt: -1 });

        res.json(fieldData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get single field data entry
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const fieldData = await FieldData.findById(req.params.id)
            .populate('season', 'name')
            .populate('createdBy', 'username displayName');

        if (!fieldData) {
            return res.status(404).json({ message: 'Field data not found' });
        }

        // Data collectors can only access their own entries
        if (req.user.role === 'data_collector' && fieldData.createdBy._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(fieldData);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new field data entry
router.post('/', authenticateToken, async (req, res) => {
    try {
        const fieldData = new FieldData({
            ...req.body,
            createdBy: req.user.id
        });

        await fieldData.save();
        const populated = await FieldData.findById(fieldData._id)
            .populate('season', 'name')
            .populate('createdBy', 'username displayName');

        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update field data entry
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const fieldData = await FieldData.findById(req.params.id);

        if (!fieldData) {
            return res.status(404).json({ message: 'Field data not found' });
        }

        // Check if locked
        if (fieldData.isLocked) {
            return res.status(403).json({ message: 'This entry is locked and cannot be edited' });
        }

        // Data collectors can only edit their own entries
        if (req.user.role === 'data_collector' && fieldData.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        Object.assign(fieldData, req.body);
        await fieldData.save();

        const populated = await FieldData.findById(fieldData._id)
            .populate('season', 'name')
            .populate('createdBy', 'username displayName');

        res.json(populated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete field data entry (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const fieldData = await FieldData.findById(req.params.id);

        if (!fieldData) {
            return res.status(404).json({ message: 'Field data not found' });
        }

        await fieldData.deleteOne();
        res.json({ message: 'Field data deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Lock/Unlock field data by season (Admin only)
router.put('/season/:seasonId/lock', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { isLocked } = req.body;
        const result = await FieldData.updateMany(
            { season: req.params.seasonId },
            { isLocked }
        );

        res.json({
            message: `${result.modifiedCount} entries ${isLocked ? 'locked' : 'unlocked'}`,
            modifiedCount: result.modifiedCount
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
