import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';

dotenv.config();

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        await Admin.deleteMany({});
        const admin = new Admin({
            username: process.env.ADMIN_USERNAME || 'admin',
            password: process.env.ADMIN_PASSWORD || 'admin123',
        });
        await admin.save();
        console.log('Admin re-seeded successfully: admin / admin123');
    } catch (err) {
        console.error('SEED ERROR:', err);
    } finally {
        mongoose.connection.close();
    }
}

seed();
