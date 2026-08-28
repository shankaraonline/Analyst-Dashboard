import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Disable buffering so queries don't hang when DB is disconnected
mongoose.set('bufferCommands', false);

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('⚠️ MONGODB_URI is not set in .env. Running in Fast Offline/Cache Mode.');
    return null;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    console.log(`🍃 Connected to MongoDB (${conn.connection.host}/${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.warn(`⚠️ MongoDB connection error: ${error.message}. Running in Fast Offline/Cache Mode.`);
    return null;
  }
}
