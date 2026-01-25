import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { getPool, runMigrations, checkDatabaseHealth, closePool } from './db/postgres.js';
import { validateTenant, auditLog } from './middleware/tenant.js';
import { createVoiceGateway } from './api/voice.js';

// API Routes
import knowledgeRouter from './api/knowledge.js';
import ermateRouter from './api/ermate.js';
import erpranaRouter from './api/erprana.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint (no tenant validation required)
app.get('/v1/health', async (req, res) => {
  try {
    const dbHealthy = await checkDatabaseHealth();
    
    res.json({
      status: 'ok',
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      version: '1.0.0-alpha'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Apply multi-tenant middleware to all API routes
app.use('/v1', validateTenant);
app.use('/v1', auditLog);

// Mount API routers
app.use('/v1/knowledge', knowledgeRouter);
app.use('/v1/ermate', ermateRouter);
app.use('/v1/erprana', erpranaRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} does not exist`
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Create HTTP server and WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ 
  server,
  path: '/v1/voice/stream'
});

// Initialize voice gateway
createVoiceGateway(wss);

// Startup sequence
async function start() {
  try {
    console.log('🚀 ARYA Core - Starting...');
    console.log(`📍 Environment: ${NODE_ENV}`);
    
    // Initialize database
    console.log('📦 Initializing database connection...');
    getPool();
    
    // Run migrations
    console.log('🔄 Running database migrations...');
    await runMigrations();
    
    // Start server
    server.listen(PORT, () => {
      console.log('');
      console.log('✅ ARYA Core is running!');
      console.log(`🌐 HTTP API:      http://localhost:${PORT}`);
      console.log(`🔌 WebSocket:    ws://localhost:${PORT}/v1/voice/stream`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/v1/health`);
      console.log('');
      console.log('📋 Available Endpoints:');
      console.log('   POST /v1/knowledge/query    - Query knowledge engine');
      console.log('   POST /v1/ermate/auto_fill   - Clinical transcript parsing');
      console.log('   POST /v1/erprana/risk_assess - Patient risk assessment');
      console.log('   WS   /v1/voice/stream       - Audio streaming gateway');
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Failed to start ARYA Core:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
  });
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
  });
  await closePool();
  process.exit(0);
});

// Start the server
start();
