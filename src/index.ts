// src/index.ts
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import router from './routes/index';
import { requestLogger } from './middleware/requestLogger.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { startNotificationWorker } from './workers/notification.worker';

const app = express();
const PORT = process.env.PORT || 3000;

// ── 1. Built-in Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 2. Request Logger ───────────────────────────────────────────────
app.use(requestLogger);

// ── 3. Application Routes ───────────────────────────────────────────
app.use('/api/v1', router);

// ── 4. Not Found Handler (404) ─────────────────────────────────────
app.use(notFoundHandler);

// ── 5. Global Error Handler ────────────────────────────────────────
app.use(errorHandler);

// ── 6. Start Notification Worker ───────────────────────────────────
startNotificationWorker();

// ── 7. Start Server ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.success('Server', `PMI Donorku API berjalan di http://localhost:${PORT}/api/v1`);
    logger.info('Server', `Mode: ${process.env.NODE_ENV || 'development'}`);
    logger.info('Server', `Health check: http://localhost:${PORT}/api/v1/health`);
  });
}

export default app;
