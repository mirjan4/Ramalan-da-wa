import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ username });
        if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, admin: { username: admin.username } });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Seed admin if not exists (for initial setup)
router.post('/seed', async (req, res) => {
    try {
        const count = await Admin.countDocuments();
        if (count === 0) {
            const admin = new Admin({
                username: process.env.ADMIN_USERNAME || 'admin',
                password: process.env.ADMIN_PASSWORD || 'admin123',
            });
            await admin.save();
            return res.json({ message: 'Admin seeded successfully' });
        }
        res.json({ message: 'Admin already exists' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
