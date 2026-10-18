import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Team from '../models/Team.js';
import Season from '../models/Season.js';
import Admin from '../models/Admin.js';
import TeamCollection from '../models/TeamCollection.js';

const router = express.Router();

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });
    
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) return res.status(401).json({ message: 'Invalid or expired token' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admin privileges required' });
    }
    next();
};

// Helper: Resolve team linked to user
const resolveUserTeam = async (user) => {
    if (!user) return null;
    const activeSeason = await Season.findOne({ status: 'ACTIVE' }) || await Season.findOne().sort({ createdAt: -1 });
    const adminUser = await Admin.findById(user.id);
    
    if (adminUser?.team) {
        const team = await Team.findById(adminUser.team).populate('season');
        if (team) return { team, season: team.season || activeSeason };
    }

    if (adminUser?.displayName && activeSeason) {
        const team = await Team.findOne({ 
            placeName: { $regex: new RegExp(`^${adminUser.displayName.trim()}$`, 'i') }, 
            season: activeSeason._id 
        }).populate('season');
        if (team) return { team, season: activeSeason };
    }

    if (adminUser?.username && activeSeason) {
        const prefix = adminUser.username.replace(/[^a-zA-Z]/g, '');
        if (prefix.length >= 3) {
            const team = await Team.findOne({
                placeName: { $regex: new RegExp(`^${prefix}`, 'i') },
                season: activeSeason._id
            }).populate('season');
            if (team) return { team, season: activeSeason };
        }
    }

    return null;
};

// Verify user has permission to access teamId
const verifyTeamAccess = async (req, teamId) => {
    if (req.user.role === 'admin') return true;
    const resolved = await resolveUserTeam(req.user);
    if (!resolved || !resolved.team) return false;
    return resolved.team._id.toString() === teamId.toString();
};

// 1. GET /my-team - Get current user's team details and assigned books
router.get('/my-team', authenticateToken, async (req, res) => {
    try {
        const activeSeason = await Season.findOne({ status: 'ACTIVE' }) || await Season.findOne().sort({ createdAt: -1 });
        
        if (req.user.role === 'admin') {
            const requestedTeamId = req.query.teamId;
            if (requestedTeamId) {
                const team = await Team.findById(requestedTeamId).populate('season');
                if (!team) return res.status(404).json({ message: 'Team not found' });
                return res.json({ team, season: team.season || activeSeason, isAdmin: true });
            }
            return res.json({ isAdmin: true, season: activeSeason, message: 'Admin user' });
        }

        const resolved = await resolveUserTeam(req.user);
        if (!resolved || !resolved.team) {
            return res.status(404).json({ 
                message: 'No assigned team found for your user account. Please contact system administrator.' 
            });
        }

        res.json({ team: resolved.team, season: resolved.season, isAdmin: false });
    } catch (err) {
        console.error('Error fetching user team:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// 2. GET /team/:teamId/books - Get assigned books with their collection status
router.get('/team/:teamId/books', authenticateToken, async (req, res) => {
    const { teamId } = req.params;
    try {
        const hasAccess = await verifyTeamAccess(req, teamId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied: You can only view your own team data.' });
        }

        const team = await Team.findById(teamId).populate('season');
        if (!team) return res.status(404).json({ message: 'Team not found' });

        const books = team.receiptBooks || [];
        const collections = await TeamCollection.find({
            team: teamId,
            season: team.season?._id || team.season
        });

        const collectionMap = new Map();
        collections.forEach(c => {
            collectionMap.set(String(c.bookNumber), c);
        });

        const bookSummary = books.map(b => {
            const c = collectionMap.get(String(b.bookNumber));
            return {
                bookNumber: b.bookNumber,
                startPage: b.startPage,
                endPage: b.endPage,
                status: c ? c.status : 'NOT_STARTED',
                totalCollected: c ? c.totalCollected : (b.collectedAmount || 0),
                receiptCount: c ? c.receiptCount : 0,
                usedStartPage: c ? c.usedStartPage : b.usedStartPage,
                usedEndPage: c ? c.usedEndPage : b.usedEndPage,
                submittedAt: c?.submittedAt,
                approvedAt: c?.approvedAt,
                reopenedAt: c?.reopenedAt,
                reopenReason: c?.reopenReason || '',
                collectionId: c?._id || null,
                updatedAt: c?.updatedAt
            };
        }).sort((a, b) => Number(a.bookNumber) - Number(b.bookNumber));

        res.json({
            team: {
                _id: team._id,
                placeName: team.placeName,
                state: team.state,
                season: team.season
            },
            books: bookSummary
        });
    } catch (err) {
        console.error('Error fetching team books:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// 3. GET /team/:teamId/book/:bookNumber - Get receipts for a specific book
router.get('/team/:teamId/book/:bookNumber', authenticateToken, async (req, res) => {
    const { teamId, bookNumber } = req.params;
    try {
        const hasAccess = await verifyTeamAccess(req, teamId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied: You can only view your own team data.' });
        }

        const team = await Team.findById(teamId).populate('season');
        if (!team) return res.status(404).json({ message: 'Team not found' });

        const assignedBook = (team.receiptBooks || []).find(b => String(b.bookNumber) === String(bookNumber));
        if (!assignedBook) {
            return res.status(404).json({ message: `Receipt book #${bookNumber} is not assigned to this team.` });
        }

        const seasonId = team.season?._id || team.season;
        let collection = await TeamCollection.findOne({
            team: teamId,
            season: seasonId,
            bookNumber: String(bookNumber)
        }).populate('submittedBy', 'displayName username')
          .populate('approvedBy', 'displayName username')
          .populate('reopenedBy', 'displayName username');

        if (!collection) {
            // Generate virtual collection with 50 receipt slots
            const receipts = [];
            for (let page = assignedBook.startPage; page <= assignedBook.endPage; page++) {
                receipts.push({
                    receiptNumber: page,
                    amount: 0,
                    donorName: '',
                    remarks: '',
                    isCancelled: false
                });
            }

            return res.json({
                isNew: true,
                team: { _id: team._id, placeName: team.placeName, state: team.state },
                season: seasonId,
                bookNumber: assignedBook.bookNumber,
                startPage: assignedBook.startPage,
                endPage: assignedBook.endPage,
                receipts,
                totalCollected: 0,
                receiptCount: 0,
                status: 'DRAFT',
                history: []
            });
        }

        // If existing collection has fewer receipts than page range, ensure complete slots
        const existingPagesMap = new Map();
        collection.receipts.forEach(r => existingPagesMap.set(r.receiptNumber, r));
        
        let needsFilling = false;
        const completeReceipts = [];
        for (let page = collection.startPage; page <= collection.endPage; page++) {
            if (existingPagesMap.has(page)) {
                completeReceipts.push(existingPagesMap.get(page));
            } else {
                needsFilling = true;
                completeReceipts.push({
                    receiptNumber: page,
                    amount: 0,
                    donorName: '',
                    remarks: '',
                    isCancelled: false
                });
            }
        }

        const result = collection.toObject();
        if (needsFilling) {
            result.receipts = completeReceipts;
        }

        res.json({
            isNew: false,
            ...result,
            team: { _id: team._id, placeName: team.placeName, state: team.state }
        });
    } catch (err) {
        console.error('Error fetching book collection:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// 4. PUT /team/:teamId/book/:bookNumber - Save/update receipts (Draft or In-Progress)
router.put('/team/:teamId/book/:bookNumber', authenticateToken, async (req, res) => {
    const { teamId, bookNumber } = req.params;
    const { receipts, isDraft } = req.body;
    try {
        const hasAccess = await verifyTeamAccess(req, teamId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied: You can only edit your own team data.' });
        }

        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        const assignedBook = (team.receiptBooks || []).find(b => String(b.bookNumber) === String(bookNumber));
        if (!assignedBook) {
            return res.status(404).json({ message: `Receipt book #${bookNumber} is not assigned to this team.` });
        }

        const seasonId = team.season;
        let collection = await TeamCollection.findOne({
            team: teamId,
            season: seasonId,
            bookNumber: String(bookNumber)
        });

        // Enforce post-approval lock unless user is admin
        if (collection && collection.status === 'APPROVED' && req.user.role !== 'admin') {
            return res.status(403).json({
                message: 'This receipt book collection has already been approved by an administrator and is locked for editing. Please request the administrator to reopen it if corrections are necessary.'
            });
        }

        // Clean & compute totals from receipt list
        let totalCollected = 0;
        let receiptCount = 0;
        let firstUsedPage = null;
        let lastUsedPage = null;

        const sanitizedReceipts = (receipts || []).map(r => {
            const num = Number(r.receiptNumber);
            const amt = Math.max(0, Number(r.amount) || 0);
            const isCancelled = Boolean(r.isCancelled);

            if (!isCancelled && amt > 0) {
                totalCollected += amt;
                receiptCount += 1;
                if (firstUsedPage === null || num < firstUsedPage) firstUsedPage = num;
                if (lastUsedPage === null || num > lastUsedPage) lastUsedPage = num;
            }

            return {
                receiptNumber: num,
                amount: isCancelled ? 0 : amt,
                donorName: (r.donorName || '').trim(),
                remarks: (r.remarks || '').trim(),
                isCancelled
            };
        });

        const performerUser = await Admin.findById(req.user.id);
        const performerName = performerUser?.displayName || performerUser?.username || 'Team Member';

        if (!collection) {
            collection = new TeamCollection({
                team: teamId,
                season: seasonId,
                bookNumber: String(bookNumber),
                startPage: assignedBook.startPage,
                endPage: assignedBook.endPage,
                receipts: sanitizedReceipts,
                totalCollected,
                receiptCount,
                usedStartPage: firstUsedPage || assignedBook.startPage,
                usedEndPage: lastUsedPage || assignedBook.endPage,
                status: 'DRAFT',
                history: [{
                    action: 'CREATED',
                    performedBy: req.user.id,
                    performerName,
                    timestamp: new Date(),
                    notes: 'Initial collection entry created'
                }]
            });
        } else {
            collection.receipts = sanitizedReceipts;
            collection.totalCollected = totalCollected;
            collection.receiptCount = receiptCount;
            collection.usedStartPage = firstUsedPage || collection.startPage;
            collection.usedEndPage = lastUsedPage || collection.endPage;

            // Retain status if REOPENED or SUBMITTED, otherwise DRAFT
            if (collection.status !== 'REOPENED' && collection.status !== 'SUBMITTED') {
                collection.status = 'DRAFT';
            }

            collection.history.push({
                action: 'UPDATED',
                performedBy: req.user.id,
                performerName,
                timestamp: new Date(),
                notes: isDraft ? 'Draft progress saved' : 'Receipt entries updated'
            });
        }

        await collection.save();

        res.json({
            message: 'Collection data saved successfully',
            collection
        });
    } catch (err) {
        console.error('Error saving book collection:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// 5. POST /team/:teamId/book/:bookNumber/submit - Submit collection for admin approval
router.post('/team/:teamId/book/:bookNumber/submit', authenticateToken, async (req, res) => {
    const { teamId, bookNumber } = req.params;
    try {
        const hasAccess = await verifyTeamAccess(req, teamId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Access denied: You can only submit your own team data.' });
        }

        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        const seasonId = team.season;
        const collection = await TeamCollection.findOne({
            team: teamId,
            season: seasonId,
            bookNumber: String(bookNumber)
        });

        if (!collection) {
            return res.status(400).json({ message: 'Cannot submit: No collection entries found. Please save entries first.' });
        }

        if (collection.status === 'APPROVED' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'This book collection has already been approved and locked.' });
        }

        const performerUser = await Admin.findById(req.user.id);
        const performerName = performerUser?.displayName || performerUser?.username || 'Team Member';

        collection.status = 'SUBMITTED';
        collection.submittedBy = req.user.id;
        collection.submittedAt = new Date();

        collection.history.push({
            action: 'SUBMITTED',
            performedBy: req.user.id,
            performerName,
            timestamp: new Date(),
            notes: `Submitted with ₹${collection.totalCollected.toLocaleString('en-IN')} total (${collection.receiptCount} receipts) for Admin Approval`
        });

        await collection.save();

        res.json({
            message: 'Receipt book collection successfully submitted for Admin approval.',
            collection
        });
    } catch (err) {
        console.error('Error submitting collection:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// 6. GET /admin/submissions - Admin view of all team submissions
router.get('/admin/submissions', authenticateToken, requireAdmin, async (req, res) => {
    const { seasonId, status, teamId } = req.query;
    try {
        let activeSeasonId = seasonId;
        if (!activeSeasonId) {
            const activeSeason = await Season.findOne({ status: 'ACTIVE' }) || await Season.findOne().sort({ createdAt: -1 });
            if (activeSeason) activeSeasonId = activeSeason._id;
        }

        const filter = {};
        if (activeSeasonId) filter.season = activeSeasonId;
        if (status) filter.status = status;
        if (teamId) filter.team = teamId;

        const submissions = await TeamCollection.find(filter)
            .populate('team', 'placeName state')
            .populate('season', 'name year')
            .populate('submittedBy', 'displayName username')
            .populate('approvedBy', 'displayName username')
            .populate('reopenedBy', 'displayName username')
            .sort({ updatedAt: -1 });

        res.json(submissions);
    } catch (err) {
        console.error('Error fetching submissions for admin:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// 7. POST /admin/submissions/:id/approve - Admin approves collection and auto-syncs with Team Settlement
router.post('/admin/submissions/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { adminRemarks } = req.body;
    try {
        const collection = await TeamCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection submission not found' });

        const adminUser = await Admin.findById(req.user.id);
        const adminName = adminUser?.displayName || adminUser?.username || 'Administrator';

        collection.status = 'APPROVED';
        collection.approvedBy = req.user.id;
        collection.approvedAt = new Date();
        if (adminRemarks) collection.adminRemarks = adminRemarks;

        collection.history.push({
            action: 'APPROVED',
            performedBy: req.user.id,
            performerName: adminName,
            timestamp: new Date(),
            notes: adminRemarks ? `Approved: ${adminRemarks}` : 'Approved and verified by admin'
        });

        await collection.save();

        // Auto-sync into Team receiptBooks & update totalCollection
        const team = await Team.findById(collection.team);
        if (team) {
            const bookIndex = (team.receiptBooks || []).findIndex(b => String(b.bookNumber) === String(collection.bookNumber));
            if (bookIndex !== -1) {
                team.receiptBooks[bookIndex].collectedAmount = collection.totalCollected;
                team.receiptBooks[bookIndex].usedStartPage = collection.usedStartPage || collection.startPage;
                team.receiptBooks[bookIndex].usedEndPage = collection.usedEndPage || collection.endPage;
                team.receiptBooks[bookIndex].isEntered = true;
            } else {
                team.receiptBooks.push({
                    bookNumber: collection.bookNumber,
                    startPage: collection.startPage,
                    endPage: collection.endPage,
                    usedStartPage: collection.usedStartPage || collection.startPage,
                    usedEndPage: collection.usedEndPage || collection.endPage,
                    collectedAmount: collection.totalCollected,
                    isEntered: true
                });
            }

            // Recalculate team totals
            team.totalCollection = team.receiptBooks.reduce((sum, b) => sum + (b.collectedAmount || 0), 0);
            team.balance = (team.totalCollection || 0) 
                - (team.cashAmount || 0) 
                - (team.bankAmount || 0) 
                - (team.advanceAmount || 0) 
                + (team.expense || 0);

            await team.save();
        }

        res.json({
            message: `Book #${collection.bookNumber} collection approved and synced with Team settlement.`,
            collection
        });
    } catch (err) {
        console.error('Error approving collection:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// 8. POST /admin/submissions/:id/reopen - Admin reopens collection for team corrections
router.post('/admin/submissions/:id/reopen', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    try {
        const collection = await TeamCollection.findById(id);
        if (!collection) return res.status(404).json({ message: 'Collection submission not found' });

        const adminUser = await Admin.findById(req.user.id);
        const adminName = adminUser?.displayName || adminUser?.username || 'Administrator';

        collection.status = 'REOPENED';
        collection.reopenedBy = req.user.id;
        collection.reopenedAt = new Date();
        collection.reopenReason = reason || 'Admin requested modifications';

        collection.history.push({
            action: 'REOPENED',
            performedBy: req.user.id,
            performerName: adminName,
            timestamp: new Date(),
            notes: reason ? `Reopened for edits: ${reason}` : 'Reopened for corrections by admin'
        });

        await collection.save();

        res.json({
            message: `Book #${collection.bookNumber} collection reopened for team edits.`,
            collection
        });
    } catch (err) {
        console.error('Error reopening collection:', err);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

export default router;
