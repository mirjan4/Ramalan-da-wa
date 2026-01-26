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

// JWT Middleware
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

// Update Profile
router.put('/update-profile', authenticateToken, async (req, res) => {
    const { username, displayName } = req.body;
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        // Check if username is already taken by another admin
        if (username !== admin.username) {
            const existingAdmin = await Admin.findOne({ username });
            if (existingAdmin) {
                return res.status(400).json({ message: 'Username already taken' });
            }
        }

        admin.username = username;
        admin.displayName = displayName || '';
        await admin.save();

        res.json({
            message: 'Profile updated successfully',
            admin: {
                username: admin.username,
                displayName: admin.displayName
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Change Password
router.put('/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Validate new password
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        admin.password = newPassword;
        await admin.save();

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
