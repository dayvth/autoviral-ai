import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';

import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { logger } from './lib/logger';
import { initQueues } from './lib/queue';
import { initScheduler } from './lib/scheduler';

// Routes
import authRoutes from './routes/auth';
import nicheRoutes from './routes/niches';
import videoRoutes from './routes/videos';
import scriptRoutes from './routes/scripts';
import trendRoutes from './routes/trends';
import socialRoutes from './routes/social';
import uploadRoutes from './routes/uploads';
import analyticsRoutes from './routes/analytics';
import scheduleRoutes from './routes/schedules';
import billingRoutes from './routes/billing';
import settingsRoutes from './routes/settings';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhooks';

const app = express();
const httpServer = createServer(app);

// Socket.IO for real-time progress updates
export const io = new SocketIO(httpServer, {
  cors: {
    origin: process.env.APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Core middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Raw body for Stripe webhooks (must be before json parser)
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const ALLOWED_ORIGINS = [
  process.env.APP_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      // Allow configured origins and any *.vercel.app subdomain
      if (ALLOWED_ORIGINS.includes(origin) || /\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);

// Health check (no rate limit)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: process.env.npm_package_version ?? '1.0.0', timestamp: new Date().toISOString() });
});

// DB connectivity check
app.get('/health/db', async (_req, res) => {
  try {
    const { prisma } = await import('./lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected', url: (process.env.DIRECT_URL || process.env.DATABASE_URL || '').replace(/:([^:@]+)@/, ':***@') });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message, url: (process.env.DIRECT_URL || process.env.DATABASE_URL || '').replace(/:([^:@]+)@/, ':***@') });
  }
});

// API routes
app.use('/api/auth', rateLimiter({ max: 20, window: 60_000 }), authRoutes);
app.use('/api/niches', rateLimiter(), nicheRoutes);
app.use('/api/videos', rateLimiter(), videoRoutes);
app.use('/api/scripts', rateLimiter(), scriptRoutes);
app.use('/api/trends', rateLimiter(), trendRoutes);
app.use('/api/social', rateLimiter(), socialRoutes);
app.use('/api/uploads', rateLimiter(), uploadRoutes);
app.use('/api/analytics', rateLimiter(), analyticsRoutes);
app.use('/api/schedules', rateLimiter(), scheduleRoutes);
app.use('/api/billing', rateLimiter(), billingRoutes);
app.use('/api/settings', rateLimiter(), settingsRoutes);
app.use('/api/admin', rateLimiter({ max: 200 }), adminRoutes);
app.use('/api/webhooks', webhookRoutes);

app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join:user', (userId: string) => {
    socket.join(`user:${userId}`);
    logger.info(`Socket ${socket.id} joined room user:${userId}`);
  });

  socket.on('join:job', (jobId: string) => {
    socket.join(`job:${jobId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = Number(process.env.PORT ?? 4000);

async function bootstrap() {
  await initQueues();
  await initScheduler();

  httpServer.listen(PORT, () => {
    logger.info(`🚀 AutoViral AI API running on port ${PORT}`);
    logger.info(`📡 WebSocket ready on port ${PORT}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});

export default app;
