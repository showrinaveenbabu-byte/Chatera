const mongoose = require('mongoose');

/**
 * Global cache for MongoDB connection across serverless invocations (Vercel)
 * Prevents opening multiple simultaneous connections during hot-reloads and lambda invocations.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Database connection error: MONGODB_URI environment variable is not defined. ' +
        'Please add MONGODB_URI to your Vercel or environment configuration.'
      );
    } else {
      console.warn('[DB] No MONGODB_URI provided. Falling back to local mongodb://127.0.0.1:27017/communication_app');
    }
  }

  const connectionUri = uri || 'mongodb://127.0.0.1:27017/communication_app';

  // If already connected, reuse connection
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(connectionUri, opts).then((mongooseInstance) => {
      console.log(`[DB] MongoDB connected successfully to: ${mongooseInstance.connection.host}/${mongooseInstance.connection.name}`);
      return mongooseInstance;
    }).catch((err) => {
      cached.promise = null;
      console.error('[DB] MongoDB connection error:', err.message);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}

/**
 * Express middleware to guarantee DB connection is active before processing queries
 */
async function ensureDbConnected(req, res, next) {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    next();
  } catch (err) {
    console.error('[DB Middleware Error]:', err.message);
    return res.status(503).json({
      error: 'Database Unavailable',
      msg: 'Unable to connect to database. Please verify your database configuration and try again.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

module.exports = { connectDB, ensureDbConnected };
