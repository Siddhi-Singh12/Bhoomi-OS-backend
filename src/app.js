const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');
const { authenticateUser } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const farmerRoutes = require('./routes/farmer.routes');
const farmRoutes = require('./routes/farm.routes');
const analysisRoutes = require('./routes/analysis.routes');
const proofPacketRoutes = require('./routes/proofPacket.routes');
const alertRoutes = require('./routes/alert.routes');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(logger.requestLogger);
app.use(authenticateUser);

// Serve static PDF proof packets
app.use('/proofs', express.static(path.join(__dirname, '../public/proofs')));

// Health Check & Root info
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Bhoomi OS Backend (Verified Evidence Layer for Agriculture)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/farmers', farmerRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/proof-packets', proofPacketRoutes);
app.use('/api/alerts', alertRoutes);

// 404 Fallback
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
