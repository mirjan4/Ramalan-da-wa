import mongoose from 'mongoose';

const receiptEntrySchema = new mongoose.Schema({
    receiptNumber: { type: Number, required: true },
    amount: { type: Number, default: 0 },
    donorName: { type: String, default: '' },
    remarks: { type: String, default: '' },
    isCancelled: { type: Boolean, default: false }
}, { _id: false });

const auditEventSchema = new mongoose.Schema({
    action: { 
        type: String, 
        enum: ['CREATED', 'UPDATED', 'SUBMITTED', 'APPROVED', 'REOPENED'], 
        required: true 
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    performerName: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    notes: { type: String, default: '' }
}, { _id: false });

const teamCollectionSchema = new mongoose.Schema({
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    season: { type: mongoose.Schema.Types.ObjectId, ref: 'Season', required: true },
    bookNumber: { type: String, required: true },
    startPage: { type: Number, required: true },
    endPage: { type: Number, required: true },
    receipts: [receiptEntrySchema],
    totalCollected: { type: Number, default: 0 },
    receiptCount: { type: Number, default: 0 }, // receipts with amount > 0
    usedStartPage: { type: Number },
    usedEndPage: { type: Number },
    status: {
        type: String,
        enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REOPENED'],
        default: 'DRAFT'
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    submittedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    approvedAt: { type: Date },
    reopenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    reopenedAt: { type: Date },
    reopenReason: { type: String, default: '' },
    adminRemarks: { type: String, default: '' },
    history: [auditEventSchema]
}, { timestamps: true });

// Ensure unique collection document per book per team per season
teamCollectionSchema.index({ team: 1, season: 1, bookNumber: 1 }, { unique: true });
teamCollectionSchema.index({ season: 1, status: 1 });
teamCollectionSchema.index({ team: 1, status: 1 });

export default mongoose.models.TeamCollection || mongoose.model('TeamCollection', teamCollectionSchema);
