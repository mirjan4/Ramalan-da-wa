import express from 'express';
import jwt from 'jsonwebtoken';
import Season from '../models/Season.js';
import Team from '../models/Team.js';
import FieldData from '../models/FieldData.js';
import BankAccount from '../models/BankAccount.js';
import SeasonBankAmount from '../models/SeasonBankAmount.js';

const router = express.Router();

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

router.get('/', async (req, res) => {
    try {
        const seasons = await Season.find().sort({ createdAt: -1 }).lean();
        // Enrich with counts for teams, field data, and season bank totals
        const enriched = await Promise.all(seasons.map(async (s) => {
            const teamCount = await Team.countDocuments({ season: s._id });
            const recordCount = await FieldData.countDocuments({ season: s._id });
            const bankAmounts = await SeasonBankAmount.find({ season: s._id }).lean();
            const totalBankAmount = bankAmounts.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
            return {
                ...s,
                teamCount,
                recordCount,
                bankAccountsCount: bankAmounts.length,
                totalBankAmount
            };
        }));
        res.json(enriched);
    } catch (err) {
        console.error('DEBUG - Fetch Seasons Error:', err);
        res.status(500).json({
            debug: true,
            message: err.message,
            name: err.name,
            stack: err.stack
        });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    const { name, isLocked } = req.body;
    try {
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Season name is required' });
        }
        const season = new Season({ 
            name: name.trim(),
            isLocked: !!isLocked
        });
        await season.save();
        res.json(season);
    } catch (err) {
        console.error('DEBUG - Create Season Error:', err);
        res.status(500).json({ message: err.message, name: err.name });
    }
});

// Update season name and rules (Active status, Lock rule)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, isActive, isLocked } = req.body;
        const updateData = {};

        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ message: 'Season name cannot be empty' });
            }
            updateData.name = name.trim();
        }

        if (isLocked !== undefined) {
            updateData.isLocked = !!isLocked;
            // Rule enforcement: sync isLocked status to all field data entries in this season
            await FieldData.updateMany(
                { season: req.params.id },
                { $set: { isLocked: !!isLocked } }
            );
        }

        if (isActive === true) {
            await Season.updateMany({}, { isActive: false });
            updateData.isActive = true;
        }

        const season = await Season.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!season) {
            return res.status(404).json({ message: 'Season not found' });
        }
        res.json(season);
    } catch (err) {
        console.error('DEBUG - Update Season Error:', err);
        res.status(500).json({ message: err.message, name: err.name });
    }
});

router.put('/:id/activate', authenticateToken, async (req, res) => {
    try {
        await Season.updateMany({}, { isActive: false });
        const season = await Season.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
        res.json(season);
    } catch (err) {
        console.error('DEBUG - Activate Season Error:', err);
        res.status(500).json({ message: err.message, name: err.name });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const season = await Season.findById(req.params.id);
        if (!season) {
            return res.status(404).json({ message: 'Season not found' });
        }
        if (season.isActive) {
            return res.status(400).json({ message: 'Cannot delete the active operational season. Please activate another season first.' });
        }
        // Integrity rule check: ensure no teams exist for this season
        const teamCount = await Team.countDocuments({ season: req.params.id });
        if (teamCount > 0) {
            return res.status(400).json({ 
                message: `Cannot delete season: ${teamCount} team(s) are registered in this season. Remove or reassign them first.` 
            });
        }
        // Integrity rule check: ensure no field data records exist
        const fieldDataCount = await FieldData.countDocuments({ season: req.params.id });
        if (fieldDataCount > 0) {
            return res.status(400).json({ 
                message: `Cannot delete season: ${fieldDataCount} field data record(s) exist in this season.` 
            });
        }

        // Clean up linked season bank amount records
        await SeasonBankAmount.deleteMany({ season: req.params.id });
        await Season.findByIdAndDelete(req.params.id);
        res.json({ message: 'Season deleted successfully' });
    } catch (err) {
        console.error('DEBUG - Delete Season Error:', err);
        res.status(500).json({ message: err.message, name: err.name });
    }
});

router.get('/active', async (req, res) => {
    try {
        const season = await Season.findOne({ isActive: true });
        res.json(season);
    } catch (err) {
        console.error('DEBUG - Get Active Season Error:', err);
        res.status(500).json({
            debug: true,
            message: err.message,
            name: err.name,
            stack: err.stack
        });
    }
});

// ==========================================
// SEASON-WISE BANK AMOUNTS ENDPOINTS
// ==========================================

// GET /api/seasons/:seasonId/bank-amounts - Fetch all bank accounts and amounts for a season
router.get('/:seasonId/bank-amounts', async (req, res) => {
    try {
        const { seasonId } = req.params;
        const bankAmounts = await SeasonBankAmount.find({ season: seasonId })
            .populate('bankAccount', 'bankName accountNumber isActive')
            .sort({ createdAt: -1 })
            .lean();

        // Calculate total bank amount specifically for this season
        const totalBankAmount = bankAmounts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        res.json({
            seasonId,
            bankAmounts,
            totalBankAmount
        });
    } catch (err) {
        console.error('Fetch season bank amounts error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// POST /api/seasons/:seasonId/bank-amounts - Add a bank account and amount to a season
router.post('/:seasonId/bank-amounts', authenticateToken, async (req, res) => {
    try {
        const { seasonId } = req.params;
        const { bankAccountId, amount, notes } = req.body;

        if (!bankAccountId) {
            return res.status(400).json({ message: 'Please select a bank account' });
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount < 0) {
            return res.status(400).json({ message: 'Amount must be a valid non-negative number' });
        }

        // Verify season exists
        const season = await Season.findById(seasonId);
        if (!season) {
            return res.status(404).json({ message: 'Season not found' });
        }

        // Verify bank account exists
        const bankAccount = await BankAccount.findById(bankAccountId);
        if (!bankAccount) {
            return res.status(404).json({ message: 'Selected bank account not found' });
        }

        // Prevent duplicate bank account entries within the same season
        const existing = await SeasonBankAmount.findOne({
            season: seasonId,
            bankAccount: bankAccountId
        });
        if (existing) {
            return res.status(400).json({
                message: `Bank account "${bankAccount.bankName}" has already been added to this season. You can edit the existing amount instead of creating a duplicate.`
            });
        }

        const seasonBankAmount = new SeasonBankAmount({
            season: seasonId,
            bankAccount: bankAccountId,
            amount: numAmount,
            notes: notes ? String(notes).trim() : ''
        });

        await seasonBankAmount.save();
        await seasonBankAmount.populate('bankAccount', 'bankName accountNumber isActive');

        // Immediately recalculate total for this season
        const allSeasonBanks = await SeasonBankAmount.find({ season: seasonId }).lean();
        const totalBankAmount = allSeasonBanks.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        res.status(201).json({
            seasonBankAmount,
            totalBankAmount,
            message: `Added ₹${numAmount.toLocaleString('en-IN')} for ${bankAccount.bankName}`
        });
    } catch (err) {
        console.error('Add season bank amount error:', err);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'This bank account is already added to this season' });
        }
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// PUT /api/seasons/:seasonId/bank-amounts/:id - Update amount/notes for a season bank entry
router.put('/:seasonId/bank-amounts/:id', authenticateToken, async (req, res) => {
    try {
        const { seasonId, id } = req.params;
        const { amount, notes, bankAccountId } = req.body;

        const record = await SeasonBankAmount.findOne({ _id: id, season: seasonId });
        if (!record) {
            return res.status(404).json({ message: 'Season bank record not found' });
        }

        if (amount !== undefined) {
            const numAmount = Number(amount);
            if (isNaN(numAmount) || numAmount < 0) {
                return res.status(400).json({ message: 'Amount must be a valid non-negative number' });
            }
            record.amount = numAmount;
        }

        if (notes !== undefined) {
            record.notes = String(notes).trim();
        }

        if (bankAccountId && bankAccountId !== record.bankAccount.toString()) {
            const duplicate = await SeasonBankAmount.findOne({
                _id: { $ne: id },
                season: seasonId,
                bankAccount: bankAccountId
            });
            if (duplicate) {
                return res.status(400).json({ message: 'This bank account is already registered in this season' });
            }
            record.bankAccount = bankAccountId;
        }

        await record.save();
        await record.populate('bankAccount', 'bankName accountNumber isActive');

        // Recalculate total
        const allSeasonBanks = await SeasonBankAmount.find({ season: seasonId }).lean();
        const totalBankAmount = allSeasonBanks.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        res.json({
            seasonBankAmount: record,
            totalBankAmount,
            message: 'Season bank amount updated successfully'
        });
    } catch (err) {
        console.error('Update season bank amount error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// DELETE /api/seasons/:seasonId/bank-amounts/:id - Remove a bank account entry from a season
router.delete('/:seasonId/bank-amounts/:id', authenticateToken, async (req, res) => {
    try {
        const { seasonId, id } = req.params;
        const deleted = await SeasonBankAmount.findOneAndDelete({ _id: id, season: seasonId });
        if (!deleted) {
            return res.status(404).json({ message: 'Season bank record not found' });
        }

        // Recalculate total
        const allSeasonBanks = await SeasonBankAmount.find({ season: seasonId }).lean();
        const totalBankAmount = allSeasonBanks.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        res.json({
            message: 'Bank account entry removed from season',
            totalBankAmount
        });
    } catch (err) {
        console.error('Delete season bank amount error:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

export default router;
