import express from 'express';
import Team from '../models/Team.js';

const router = express.Router();

router.put('/:id/collection', async (req, res) => {
    const { receiptBooks, cashAmount, cashRef, bankAmount, bankRef } = req.body;
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        if (team.isLocked) return res.status(403).json({ message: 'Collection is locked. This team has already finalized their settlement.' });

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

router.put('/:id/finalize', async (req, res) => {
    const { expense } = req.body;
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        if (team.isLocked) return res.status(403).json({ message: 'Team already settled' });

        team.expense = Number(expense) || 0;
        team.balance = team.totalCollection + (team.advanceAmount || 0) - team.expense;
        team.status = team.balance >= 0 ? 'SETTLED' : 'SHORTAGE';
        team.isLocked = true; // Finalize locks the record

        await team.save();
        res.json(team);
    } catch (err) {
        console.error('Finalize error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

router.put('/:id/finalize-complete', async (req, res) => {
    const { receiptBooks, cashAmount, cashRef, bankAmount, bankRef, expense } = req.body;
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        if (team.isLocked) return res.status(403).json({ message: 'Team already settled and record is locked.' });

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
