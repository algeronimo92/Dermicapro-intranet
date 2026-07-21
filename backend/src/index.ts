import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';
import { requestLogger } from './middlewares/requestLogger';
import prisma from './config/database';
import fs from 'fs';
import path from 'path';

const app = express();

// Confiar en proxy (nginx) para headers X-Forwarded-*
app.set('trust proxy', 1);

// El catálogo público no usa cookies/credenciales y permite cualquier origen;
// el resto de la API usa el CORS restringido con credenciales.
// Se separan por completo (en vez de solapar dos app.use(cors())) para que
// nunca convivan Allow-Origin: * y Allow-Credentials: true en la misma respuesta.
const restrictedCors = cors({ origin: config.cors.origin, credentials: true });
const publicCors = cors({ origin: '*', credentials: false });
app.use((req, res, next) => {
  if (req.path.startsWith('/api/public')) return publicCors(req, res, next);
  return restrictedCors(req, res, next);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Rate limiting global (disabled in development)
if (config.env === 'production') {
  app.use('/api', generalLimiter);
}

if (!fs.existsSync(config.upload.directory)) {
  fs.mkdirSync(config.upload.directory, { recursive: true });
}

app.use('/uploads', express.static(path.resolve(config.upload.directory)));

// Health check endpoint for Docker
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
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

app.use('/api', routes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
