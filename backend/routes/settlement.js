import express from 'express';
import Team from '../models/Team.js';

const router = express.Router();

// Collection Entry Update
router.put('/:id/collection', async (req, res) => {
    const { receiptBooks, cashAmount, cashRef, bankAmount, bankRef } = req.body;
    try {
        const team = await Team.findById(req.params.id);
        if (team.isLocked) return res.status(403).json({ message: 'Team is locked' });

        team.receiptBooks = receiptBooks;
        team.cashAmount = Number(cashAmount) || 0;
        team.cashRef = cashRef || '';
        team.bankAmount = Number(bankAmount) || 0;
        team.bankRef = bankRef || '';

        // totalCollection = Sum of all receipt book collections
        team.totalCollection = receiptBooks.reduce((acc, book) => acc + (Number(book.collectedAmount) || 0), 0);

        await team.save();
        res.json(team);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Final Settlement
router.put('/:id/finalize', async (req, res) => {
    const { expense } = req.body;
    try {
        const team = await Team.findById(req.params.id);
        if (team.isLocked) return res.status(403).json({ message: 'Team already settled' });

        team.expense = Number(expense) || 0;
        team.balance = team.totalCollection + (team.advanceAmount || 0) - team.expense;
        team.status = team.balance >= 0 ? 'SETTLED' : 'SHORTAGE';

        await team.save();
        res.json(team);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Unified Final Settlement (Collection + Expense + Lock)
router.put('/:id/finalize-complete', async (req, res) => {
    console.log('Finalize complete hit for ID:', req.params.id);
    const { receiptBooks, cashAmount, cashRef, bankAmount, bankRef, expense } = req.body;
    try {
        const team = await Team.findById(req.params.id);
        if (team.isLocked) return res.status(403).json({ message: 'Team already settled' });

        // Update Collection Details
        team.receiptBooks = receiptBooks;
        team.cashAmount = Number(cashAmount) || 0;
        team.cashRef = cashRef || '';
        team.bankAmount = Number(bankAmount) || 0;
        team.bankRef = bankRef || '';

        // totalCollection = Sum of all receipt book collections
        team.totalCollection = receiptBooks.reduce((acc, book) => acc + (Number(book.collectedAmount) || 0), 0);

        // Update Expense Details
        team.expense = Number(expense) || 0;
        team.balance = team.totalCollection + (team.advanceAmount || 0) - team.expense;
        team.status = team.balance >= 0 ? 'SETTLED' : 'SHORTAGE';

        await team.save();
        res.json(team);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
