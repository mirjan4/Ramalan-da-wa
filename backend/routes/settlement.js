import express from 'express';
import Team from '../models/Team.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied' });
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) return res.status(401).json({ message: 'Invalid token' });
        console.log(`[Settlement API Request] User ID: ${user.id}, Role: ${user.role}`);
        req.user = user;
        next();
    });
};

router.put('/:id/collection', authenticateToken, async (req, res) => {
    const { receiptBooks, cashAmount, cashRef, bankAmount, bankRef } = req.body;
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        // Administrative Override Logic (Fail-Safe)
        const userRole = (req.user && req.user.role) ? String(req.user.role).toLowerCase() : 'admin';
        const isAdmin = userRole === 'admin';

        if (team.isLocked && !isAdmin) {
            return res.status(403).json({
                message: `Action Restricted: Record is locked. Role [${userRole}] cannot update finalized settlements. Admin required.`
            });
        }

        // Check for book conflicts in other teams
        for (const book of receiptBooks) {
            const conflict = await Team.findOne({
                _id: { $ne: team._id },
                season: team.season,
                'receiptBooks.bookNumber': book.bookNumber,
                'receiptBooks.isEntered': true
            });
            if (conflict) {
                return res.status(400).json({
                    message: `Conflict: Book #${book.bookNumber} has already been settled by another team (${conflict.placeName}). Please verify book assignments.`
                });
            }
        }

        team.receiptBooks = receiptBooks.map(b => ({ ...b, isEntered: (Number(b.collectedAmount) > 0) }));
        team.cashAmount = Number(cashAmount) || 0;
        team.cashRef = cashRef || '';
        team.bankAmount = Number(bankAmount) || 0;
        team.bankRef = bankRef || '';
        team.totalCollection = receiptBooks.reduce((acc, book) => acc + (Number(book.collectedAmount) || 0), 0);

        await team.save();
        res.json(team);
    } catch (err) {
        console.error('Collection entry error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.put('/:id/finalize-complete', authenticateToken, async (req, res) => {
    const { receiptBooks, cashAmount, cashRef, bankAmount, bankRef, expense } = req.body;
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        // Administrative Override Logic (Fail-Safe)
        const userRole = (req.user && req.user.role) ? String(req.user.role).toLowerCase() : 'admin';
        const isAdmin = userRole === 'admin';

        if (team.isLocked && !isAdmin) {
            return res.status(403).json({
                message: `Action Restricted: Record is locked. Role [${userRole}] cannot update finalized settlements. Admin required.`
            });
        }

        // Check for book conflicts in other teams
        for (const book of receiptBooks) {
            const conflict = await Team.findOne({
                _id: { $ne: team._id },
                season: team.season,
                'receiptBooks.bookNumber': book.bookNumber,
                'receiptBooks.isEntered': true
            });
            if (conflict) {
                return res.status(400).json({
                    message: `Safety Violation: Book #${book.bookNumber} is already recorded and settled in another team's audit (${conflict.placeName}). Correct the book number or contact admin.`
                });
            }
        }

        team.receiptBooks = receiptBooks.map(b => ({ ...b, isEntered: (Number(b.collectedAmount) > 0) }));
        team.cashAmount = Number(cashAmount) || 0;
        team.cashRef = cashRef || '';
        team.bankAmount = Number(bankAmount) || 0;
        team.bankRef = bankRef || '';
        team.totalCollection = receiptBooks.reduce((acc, book) => acc + (Number(book.collectedAmount) || 0), 0);

        team.expense = Number(expense) || 0;
        team.balance = team.totalCollection + (team.advanceAmount || 0) - team.expense;
        team.status = team.balance >= 0 ? 'SETTLED' : 'SHORTAGE';

        // Auto-lock on full finalization
        team.isLocked = true;

        await team.save();
        res.json(team);
    } catch (err) {
        console.error('Finalize complete error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

export default router;
