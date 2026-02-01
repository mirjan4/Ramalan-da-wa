import mongoose from 'mongoose';

const fieldDataSchema = new mongoose.Schema({
    masjidName: { type: String, required: true },
    place: { type: String, required: true },
    location: {
        latitude: { type: Number },
        longitude: { type: Number },
        address: { type: String }
    },
    contactPerson: {
        name: { type: String, required: true },
        designation: { type: String }, // Made optional generic
        phone: { type: String, required: true }
    },
    collectionInfo: { type: String }, // General collection notes
    yearsOfCollection: { type: Number },
    remarks: { type: String, default: '' },
    season: { type: mongoose.Schema.Types.ObjectId, ref: 'Season', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    isLocked: { type: Boolean, default: false }
}, { timestamps: true });

// Index for efficient querying
fieldDataSchema.index({ season: 1, createdBy: 1 });
fieldDataSchema.index({ masjidName: 'text', place: 'text' });

export default mongoose.model('FieldData', fieldDataSchema);
