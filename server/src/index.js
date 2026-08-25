import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import { connectDB } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// API Routes
app.use('/api', apiRoutes);

// Root greeting
app.get('/', (req, res) => {
  res.json({
    message: 'Social Analytics & Omnichannel Performance Dashboard Backend API is running.',
    endpoints: {
      health: 'GET /api/health',
      projects: 'GET, POST /api/projects',
      projectDetail: 'GET, PUT, DELETE /api/projects/:id',
      projectSync: 'POST /api/projects/:id/sync',
      syncSheet: 'POST /api/sync-sheet'
    }
  });
});

// Start Server after connecting to MongoDB
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Dashboard Server running at http://localhost:${PORT}`);
  });
}

startServer();
