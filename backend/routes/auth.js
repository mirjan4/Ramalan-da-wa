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

        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1d' }
        );
        res.json({
            token,
            admin: {
                username: admin.username,
                displayName: admin.displayName,
                role: admin.role,
                forcePasswordChange: admin.forcePasswordChange
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// Seed admin if not exists
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
        console.error('Seed error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

router.put('/update-profile', authenticateToken, async (req, res) => {
    const { username, displayName } = req.body;
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        if (username !== admin.username) {
            const existingAdmin = await Admin.findOne({ username });
            if (existingAdmin) return res.status(400).json({ message: 'Username already taken' });
        }

        admin.username = username;
        admin.displayName = displayName || '';
        await admin.save();

        res.json({ message: 'Profile updated successfully', admin: { username: admin.username, displayName: admin.displayName } });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.put('/change-password', authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const admin = await Admin.findById(req.user.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

        if (newPassword.length < 4) return res.status(400).json({ message: 'New password must be at least 4 characters' });

        admin.password = newPassword;
        admin.forcePasswordChange = false;
        await admin.save();

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.get('/users', authenticateToken, async (req, res) => {
    try {
        const users = await Admin.find({}, '-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error('Fetch users error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.post('/users', authenticateToken, async (req, res) => {
    const { username, password, displayName, role } = req.body;
    try {
        const exists = await Admin.findOne({ username });
        if (exists) return res.status(400).json({ message: 'Username already exists' });

        const newUser = new Admin({
            username,
            password,
            displayName: displayName || '',
            role: role || 'data_collector',
            forcePasswordChange: true
        });
        await newUser.save();
        res.status(201).json({ message: 'User created successfully', user: { username: newUser.username, role: newUser.role } });
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.delete('/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot delete your own account' });
        await Admin.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.put('/users/:id', authenticateToken, async (req, res) => {
    const { username, displayName, password } = req.body;
    try {
        const user = await Admin.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (username && username !== user.username) {
            const exists = await Admin.findOne({ username });
            if (exists) return res.status(400).json({ message: 'Username taken' });
            user.username = username;
        }
        if (displayName) user.displayName = displayName;
        if (password && password.trim() !== '') user.password = password;

        await user.save();
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        console.error('Update user error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

export default router;
