import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Disable buffering so queries don't hang when DB is disconnected
mongoose.set('bufferCommands', false);

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/social_dashboard';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      autoIndex: true
    });
    console.log(`🍃 Connected to MongoDB Compass (${conn.connection.host}:${conn.connection.port}/${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.warn('⚠️ MongoDB is not currently running. Running in Fast Offline/Cache Mode (0ms latency fallback).');
    return null;
  }
}
