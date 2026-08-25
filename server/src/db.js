import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/social_dashboard';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    console.log(`🍃 Connected to MongoDB Compass (${conn.connection.host}:${conn.connection.port}/${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    return null;
  }
}
