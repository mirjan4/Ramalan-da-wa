import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
import authRoutes from './routes/auth.js';
import seasonRoutes from './routes/season.js';
import teamRoutes from './routes/team.js';
import settlementRoutes from './routes/settlement.js';
import dashboardRoutes from './routes/dashboard.js';

app.get('/', (req, res) => {
    res.json({ message: "Ramalan Da'wa API is running" });
});

app.use('/api/auth', authRoutes);
app.use('/api/seasons', seasonRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/dashboard', dashboardRoutes);

// MongoDB Connection
import Admin from './models/Admin.js';
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        // Auto-seed admin if database is empty
        const count = await Admin.countDocuments();
        if (count === 0) {
            const admin = new Admin({
                username: process.env.ADMIN_USERNAME || 'admin',
                password: process.env.ADMIN_PASSWORD || 'admin123',
            });
            await admin.save();
            console.log('Default admin created: admin / admin123');
        }
    })
    .catch((err) => console.error('Could not connect to MongoDB', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
