import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Models (Safe initialization)
import Admin from './models/Admin.js';
import Season from './models/Season.js';
import Team from './models/Team.js';
import FieldData from './models/FieldData.js';

// Routes
import authRoutes from './routes/auth.js';
import seasonRoutes from './routes/season.js';
import teamRoutes from './routes/team.js';
import settlementRoutes from './routes/settlement.js';
import dashboardRoutes from './routes/dashboard.js';
import fieldDataRoutes from './routes/fieldData.js';

app.get('/', (req, res) => {
    res.json({ message: "Ramalan Da'wa API is running" });
});

// Diagnostic Route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
        dbState: mongoose.connection.readyState,
        env: {
            hasUri: !!process.env.MONGODB_URI,
            hasSecret: !!process.env.JWT_SECRET,
            nodeEnv: process.env.NODE_ENV
        }
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/field-data', fieldDataRoutes);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI is not defined!');
}

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('--- MongoDB Connected ---');
        // Seed admin if empty
        try {
            const count = await Admin.countDocuments();
            if (count === 0) {
                const admin = new Admin({
                    username: process.env.ADMIN_USERNAME || 'admin',
                    password: process.env.ADMIN_PASSWORD || 'admin123',
                });
                await admin.save();
                console.log('Default admin seeded.');
            }
        } catch (err) {
            console.error('Seeding error:', err.message);
        }
    })
    .catch((err) => {
        console.error('--- MongoDB Connection FAILED ---');
        console.error('Reason:', err.message);
    });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
