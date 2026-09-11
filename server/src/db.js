import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Global cached connection for serverless / Vercel execution
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('⚠️ MONGODB_URI is not set in environment. Running in Fast Offline/Cache Mode.');
    return null;
  }

  // If already connected, reuse existing connection
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      autoIndex: true,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      console.log(`🍃 Connected to MongoDB (${mongooseInstance.connection.host}/${mongooseInstance.connection.name})`);
      return mongooseInstance;
    }).catch((error) => {
      cached.promise = null;
      console.warn(`⚠️ MongoDB connection error: ${error.message}. Running in Fast Offline/Cache Mode.`);
      return null;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    return null;
  }

  return cached.conn;
}
