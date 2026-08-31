import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import farmerRoutes from './routes/farmers.js';
import alertRoutes from './routes/alerts.js';
import authRoutes from './routes/auth.js';
import weatherRoutes from './routes/weather.js';
import marketRoutes from './routes/market.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

const app = express();

// Security & performance middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 5000 : 2000, // Increased to prevent 429s during dev
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/farmers', farmerRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/market', marketRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;
