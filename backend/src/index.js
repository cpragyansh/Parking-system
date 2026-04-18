import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import seedSuperAdmin from './utils/seedData.js';
import authRoutes from './routes/authRoutes.js';
import parkingRoutes from './routes/parkingRoutes.js';
import entryExitRoutes from './routes/entryExitRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

dotenv.config();

// Connect to MongoDB
connectDB().then(() => {
    seedSuperAdmin();
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});

// Middleware
app.use(cors());
app.use(express.json());

// Set socket.io instance to req, to be used in routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Socket.io logic
io.on('connection', (socket) => {
    console.log(`User connected to socket: ${socket.id}`);
    
    // Join a room specific to a parking lot
    socket.on('join_parking_lot', (parkingLotId) => {
        socket.join(parkingLotId);
        console.log(`User ${socket.id} joined parking lot ${parkingLotId}`);
    });

    socket.on('leave_parking_lot', (parkingLotId) => {
        socket.leave(parkingLotId);
        console.log(`User ${socket.id} left parking lot ${parkingLotId}`);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/parking-lots', parkingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', entryExitRoutes);

// Basic Route
app.get('/', (req, res) => {
    res.send('ParkFlow API is running...');
});

const PORT = process.env.PORT || 5000;

// Start Server
if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export { app, server, io };
