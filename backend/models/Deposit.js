import mongoose from 'mongoose';

const depositSchema = new mongoose.Schema({
    season: { type: mongoose.Schema.Types.ObjectId, ref: 'Season', required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    breakdown: { type: Map, of: Number }, // To store denomination counts
    reference: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.Deposit || mongoose.model('Deposit', depositSchema);
