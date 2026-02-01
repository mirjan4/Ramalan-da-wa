import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    displayName: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'data_collector'], default: 'admin' },
}, { timestamps: true });

// Hash password before saving
adminSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

export default mongoose.model('Admin', adminSchema);
