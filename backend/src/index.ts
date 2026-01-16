// ============================================================================
// AgentHub Backend - Main Entry Point
// Express server with REST API, Socket.IO, and signal resolver
// ============================================================================

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { getDb, isUsingPostgres } from './db/selector';
import { createApiRouter } from './routes/api';
import { startResolver } from './services/resolver';

const PORT = parseInt(process.env.PORT || '3002');
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

async function main() {
  console.log('🚀 Starting AgentHub Backend...');
  console.log(`   Mode: ${isUsingPostgres() ? 'PostgreSQL' : 'In-Memory'}`);

  // Initialize database
  const db = await getDb();

  // Create Express app
  const app = express();
  const httpServer = createServer(app);

  // Configure Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: CORS_ORIGINS,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Middleware - CORS with preflight
  app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.options('*', cors()); // Enable preflight for all routes
  app.use(express.json());

  // Request logging
  app.use((req, _res, next) => {
    if (req.path !== '/api/health') {
      console.log(`${req.method} ${req.path}`);
    }
    next();
  });

  // API routes
  app.use('/api', createApiRouter(db));

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join feed room by default
    socket.join('feed');

    // Subscribe to specific strategy
    socket.on('subscribe:strategy', (strategyId: number) => {
      socket.join(`strategy:${strategyId}`);
      console.log(`📡 ${socket.id} subscribed to strategy ${strategyId}`);
    });

    // Unsubscribe from strategy
    socket.on('unsubscribe:strategy', (strategyId: number) => {
      socket.leave(`strategy:${strategyId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  // Expose io instance for broadcasting from other modules
  app.set('io', io);

  // Start signal resolver
  startResolver({
    db,
    io,
    intervalMs: 10_000, // Check every 10 seconds
  });

  // Start server
  httpServer.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`   CORS origins: ${CORS_ORIGINS.join(', ')}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down...');
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
