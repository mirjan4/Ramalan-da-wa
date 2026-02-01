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
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        res.json({
            token,
            admin: {
                username: admin.username,
                displayName: admin.displayName,
                role: admin.role
            }
        });
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
        if (newPassword.length < 4) {
            return res.status(400).json({ message: 'New password must be at least 4 characters' });
        }

        admin.password = newPassword;
        await admin.save();

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all users (Admin only)
router.get('/users', authenticateToken, async (req, res) => {
    try {
        // Only admins can view users
        const requestingUser = await Admin.findById(req.user.id);
        if (requestingUser.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const users = await Admin.find({}, '-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new user (Admin only - for data collectors)
router.post('/users', authenticateToken, async (req, res) => {
    try {
        // Only admins can create users
        const requestingUser = await Admin.findById(req.user.id);
        if (requestingUser.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { username, password, displayName, role } = req.body;

        // Check if username already exists
        const existingUser = await Admin.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Validate password
        if (password.length < 4) {
            return res.status(400).json({ message: 'Password must be at least 4 characters' });
        }

        const newUser = new Admin({
            username,
            password,
            displayName: displayName || '',
            role: role || 'data_collector'
        });

        await newUser.save();

        res.status(201).json({
            message: 'User created successfully',
            user: {
                _id: newUser._id,
                username: newUser.username,
                displayName: newUser.displayName,
                role: newUser.role
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete user (Admin only)
router.delete('/users/:id', authenticateToken, async (req, res) => {
    try {
        // Only admins can delete users
        const requestingUser = await Admin.findById(req.user.id);
        if (requestingUser.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Prevent deleting yourself
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        const user = await Admin.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.deleteOne();
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user (Admin only)
router.put('/users/:id', authenticateToken, async (req, res) => {
    try {
        // Only admins can update users
        const requestingUser = await Admin.findById(req.user.id);
        if (requestingUser.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { username, displayName, password } = req.body;
        const user = await Admin.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields if provided
        if (username) {
            // Check uniqueness if changing username
            if (username !== user.username) {
                const exists = await Admin.findOne({ username });
                if (exists) return res.status(400).json({ message: 'Username taken' });
            }
            user.username = username;
        }

        if (displayName) user.displayName = displayName;

        // Update password only if provided (and not empty)
        if (password && password.trim() !== '') {
            user.password = password; // Request handling should hash this? The model pre-save hook likely handles hashing if it's modified. 
            // WAIT: I should check if the User model has a pre-save hook for hashing. 
            // In the `POST /users` route, it does `new Admin({ ... })` then `.save()`. 
            // Usually simpler to just assign it here and let the model handle it, OR manually hash if no hook exists.
            // Let's assume standard behavior but verify later. If previous code used bcrypt in the route, I should too.
            // Looking at `POST /users` in `auth.js` (lines 142-184), it passes `password` directly to `new Admin()`.
            // Looking at `PUT /change-password` (lines 98-123), it sets `admin.password = newPassword` and saves.
            // This strongly implies the `Admin` model has a pre-save hook. I will stick to that pattern.
        }

        await user.save();
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
