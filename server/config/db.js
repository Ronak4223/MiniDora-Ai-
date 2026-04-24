import mongoose from 'mongoose';

let connected = false;

export async function connectDB() {
  if (connected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('⚪ MONGODB_URI not set — DB disabled (localStorage fallback active)');
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      dbName: process.env.MONGODB_DB || 'minidora',
    });
    connected = true;
    console.log('✅ MongoDB connected');

    mongoose.connection.on('disconnected', () => {
      connected = false;
      console.warn('⚠️  MongoDB disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      connected = true;
      console.log('✅ MongoDB reconnected');
    });
  } catch (err) {
    console.warn(`⚠️  MongoDB connection failed: ${err.message}`);
    console.log('   App continues without DB — messages use localStorage only');
  }
}

export const dbReady = () =>
  connected && mongoose.connection.readyState === 1;
