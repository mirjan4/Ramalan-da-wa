import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    class: { type: String, required: true },
    phone: { type: String, required: true },
});

const receiptBookSchema = new mongoose.Schema({
    bookNumber: { type: String, required: true },
    startPage: { type: Number, required: true },
    endPage: { type: Number, required: true },
    // These are filled during collection entry
    usedStartPage: { type: Number },
    usedEndPage: { type: Number },
    collectedAmount: { type: Number, default: 0 },
    isEntered: { type: Boolean, default: false },
});

const teamSchema = new mongoose.Schema({
    placeName: { type: String, required: true },
    state: { type: String, required: true },
    season: { type: mongoose.Schema.Types.ObjectId, ref: 'Season', required: true },
    members: [memberSchema],
    receiptBooks: [receiptBookSchema],
    // Settlement data
    totalCollection: { type: Number, default: 0 },
    cashAmount: { type: Number, default: 0 },
    cashRef: { type: String, default: '' },
    bankAmount: { type: Number, default: 0 },
    bankRef: { type: String, default: '' },
    advanceAmount: { type: Number, default: 0 },
    expense: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ['PENDING', 'SETTLED', 'SHORTAGE'], default: 'PENDING' },
    isLocked: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Team || mongoose.model('Team', teamSchema);
