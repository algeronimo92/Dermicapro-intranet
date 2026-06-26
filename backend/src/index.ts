import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import routes from './routes';
import platformRoutes from './routes/platform';
import { errorHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';
import { requestLogger } from './middlewares/requestLogger';
import { tenantResolver } from './middlewares/tenantResolver';
import { disconnectAllTenants } from './platform/tenant-prisma';
import platformPool, { ensurePlatformTables } from './platform/db';
import prisma from './config/database';
import { startMetricsCron, stopMetricsCron } from './platform/cron';
import fs from 'fs';
import path from 'path';

const app = express();

app.set('trust proxy', 1);

app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

if (config.env === 'production') {
  app.use('/api', generalLimiter);
}

if (!fs.existsSync(config.upload.directory)) {
  fs.mkdirSync(config.upload.directory, { recursive: true });
}

// Serve uploads: tenant-scoped when tenant context exists, fallback to root
app.use('/uploads', tenantResolver, (req: any, res: any, next: any) => {
  if (req.tenant) {
    const tenantDir = path.resolve(config.upload.directory, req.tenant.slug);
    express.static(tenantDir)(req, res, next);
  } else {
    express.static(path.resolve(config.upload.directory))(req, res, next);
  }
});

app.get('/health', async (_req, res) => {
  try {
    await platformPool.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Tenant resolution runs before all API routes
app.use('/api', tenantResolver);
app.use('/api', routes);
app.use('/platform', platformRoutes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await platformPool.query('SELECT 1');
    console.log('Platform database connected successfully');

    await ensurePlatformTables();
    console.log('Platform tables verified');

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
    startMetricsCron();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const shutdown = async () => {
  console.log('Shutting down...');
  stopMetricsCron();
  await disconnectAllTenants();
  await platformPool.end();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
