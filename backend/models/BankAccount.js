import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema({
    bankName: {
        type: String,
        required: [true, 'Bank name is required'],
        trim: true,
    },
    bankNameLower: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
        index: true,
    },
    accountNumber: {
        type: String,
        trim: true,
        default: '',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    collection: 'bank_accounts',
});

// Pre-validate hook to keep bankNameLower in sync without next callback (Mongoose 9+)
bankAccountSchema.pre('validate', function () {
    if (this.bankName) {
        this.bankName = this.bankName.trim();
        this.bankNameLower = this.bankName.toLowerCase();
    }
});

export default mongoose.models.BankAccount || mongoose.model('BankAccount', bankAccountSchema);
