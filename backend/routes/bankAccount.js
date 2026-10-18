import express from 'express';
import jwt from 'jsonwebtoken';
import BankAccount from '../models/BankAccount.js';
import SeasonBankAmount from '../models/SeasonBankAmount.js';

const router = express.Router();

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) return res.status(401).json({ message: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

// 1. GET /api/bank-accounts - Get all bank accounts with season usage count
router.get('/', async (req, res) => {
    try {
        const accounts = await BankAccount.find().sort({ bankName: 1 }).lean();
        // Enrich each bank account with usage count across seasons
        const enriched = await Promise.all(accounts.map(async (acc) => {
            const usageCount = await SeasonBankAmount.countDocuments({ bankAccount: acc._id });
            return {
                ...acc,
                usageCount,
            };
        }));
        res.json(enriched);
    } catch (err) {
        console.error('Fetch bank accounts error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// 2. POST /api/bank-accounts - Create a new master bank account
router.post('/', authenticateToken, async (req, res) => {
    const { bankName, accountNumber } = req.body;
    try {
        if (!bankName || !bankName.trim()) {
            return res.status(400).json({ message: 'Bank name is required' });
        }

        const normalizedName = bankName.trim().toLowerCase();
        const existing = await BankAccount.findOne({ bankNameLower: normalizedName });
        if (existing) {
            return res.status(400).json({
                message: `Bank account "${existing.bankName}" already exists. Duplicate bank accounts are not permitted.`
            });
        }

        const account = new BankAccount({
            bankName: bankName.trim(),
            accountNumber: accountNumber ? accountNumber.trim() : '',
            isActive: true,
        });

        await account.save();
        res.status(201).json(account);
    } catch (err) {
        console.error('Create bank account error:', err);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Bank account with this name already exists' });
        }
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// 3. PUT /api/bank-accounts/:id - Edit an existing bank account name/details
router.put('/:id', authenticateToken, async (req, res) => {
    const { bankName, accountNumber, isActive } = req.body;
    try {
        const account = await BankAccount.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ message: 'Bank account not found' });
        }

        if (bankName !== undefined) {
            if (!bankName.trim()) {
                return res.status(400).json({ message: 'Bank name cannot be empty' });
            }
            const normalizedName = bankName.trim().toLowerCase();
            const duplicate = await BankAccount.findOne({
                _id: { $ne: req.params.id },
                bankNameLower: normalizedName,
            });
            if (duplicate) {
                return res.status(400).json({
                    message: `Another bank account named "${duplicate.bankName}" already exists.`
                });
            }
            account.bankName = bankName.trim();
        }

        if (accountNumber !== undefined) {
            account.accountNumber = accountNumber.trim();
        }

        if (isActive !== undefined) {
            account.isActive = !!isActive;
        }

        await account.save();
        res.json(account);
    } catch (err) {
        console.error('Update bank account error:', err);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Bank account with this name already exists' });
        }
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// 4. DELETE /api/bank-accounts/:id - Delete a bank account (with relational integrity check)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const account = await BankAccount.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ message: 'Bank account not found' });
        }

        // Integrity check: verify if any season bank amount records reference this bank account
        const usageCount = await SeasonBankAmount.countDocuments({ bankAccount: req.params.id });
        if (usageCount > 0) {
            return res.status(400).json({
                message: `Cannot delete "${account.bankName}" because it is currently linked to ${usageCount} season bank record(s). Remove it from those seasons first.`
            });
        }

        await BankAccount.findByIdAndDelete(req.params.id);
        res.json({ message: `Bank account "${account.bankName}" deleted successfully` });
    } catch (err) {
        console.error('Delete bank account error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

export default router;
