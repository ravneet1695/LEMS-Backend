require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const http = require('http');
const socketIO = require('socket.io');

// Initialize app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:4200',
        methods: ['GET', 'POST'],
    },
});

// Connect to database
connectDB();

// Register models to avoid schema registration errors
require('./models/Group');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/content', require('./routes/content'));
app.use('/api/role-config', require('./routes/accessConfig'));
app.use('/api/access-config', require('./routes/accessConfig'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/organization-configs', require('./routes/organizationConfigs'));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});

// Socket.IO for real-time features
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join test room
    socket.on('join-test', (testId) => {
        socket.join(`test-${testId}`);
        console.log(`Client ${socket.id} joined test room: test-${testId}`);
    });

    // Timer sync
    socket.on('timer-update', (data) => {
        socket.to(`test-${data.testId}`).emit('timer-sync', data);
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Make io accessible to routes
app.set('io', io);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5003;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});
