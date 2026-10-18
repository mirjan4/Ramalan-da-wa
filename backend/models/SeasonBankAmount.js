import mongoose from 'mongoose';

const seasonBankAmountSchema = new mongoose.Schema({
    season: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Season',
        required: [true, 'Season ID is required'],
        index: true,
    },
    bankAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BankAccount',
        required: [true, 'Bank Account ID is required'],
        index: true,
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative'],
        default: 0,
    },
    notes: {
        type: String,
        trim: true,
        default: '',
    },
}, {
    timestamps: true,
    collection: 'season_bank_amounts',
});

// Compound unique index: A bank account cannot be duplicated within the same season
seasonBankAmountSchema.index({ season: 1, bankAccount: 1 }, { unique: true });

export default mongoose.models.SeasonBankAmount || mongoose.model('SeasonBankAmount', seasonBankAmountSchema);
