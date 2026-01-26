import mongoose from 'mongoose';

const seasonSchema = new mongoose.Schema({
    name: { type: String, required: true },
    isActive: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Season', seasonSchema);
