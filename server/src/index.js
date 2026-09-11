import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.js';
import authRoutes from './routes/auth.js';
import { connectDB } from './db.js';
import { seedAdminUser } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS — allow localhost (dev), Vercel domains, and production domain
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, same-origin)
    if (!origin) return callback(null, true);
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.endsWith('.vercel.app') ||
      origin.includes('shankaraonlinesolutions.com') ||
      process.env.ALLOWED_ORIGIN === origin
    ) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Ensure DB is connected and seeded before handling any API requests (critical for Vercel serverless cold starts)
let adminSeeded = false;
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      const conn = await connectDB();
      if (conn && !adminSeeded) {
        adminSeeded = true;
        await seedAdminUser();
      }
    } catch (err) {
      console.warn('DB initialization error in middleware:', err.message);
    }
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// In production / fullstack mode: Serve client build files if present
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Fallback: SPA routing or API greeting
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexHtmlPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexHtmlPath, (err) => {
    if (err) {
      res.json({
        message: 'Social Analytics & Omnichannel Performance Dashboard Backend API is running.',
        endpoints: {
          auth: 'POST /api/auth/login, GET /api/auth/verify',
          health: 'GET /api/health',
          projects: 'GET, POST /api/projects',
          projectDetail: 'GET, PUT, DELETE /api/projects/:id',
          projectSync: 'POST /api/projects/:id/sync',
          syncSheet: 'POST /api/sync-sheet'
        }
      });
    }
  });
});

// Initialize DB connection for local development
if (process.env.VERCEL !== '1') {
  connectDB().then(async (conn) => {
    if (conn && !adminSeeded) {
      adminSeeded = true;
      await seedAdminUser();
    }
    app.listen(PORT, () => {
      console.log(`🚀 Dashboard Server running on port ${PORT}`);
    });
  });
}

export default app;
