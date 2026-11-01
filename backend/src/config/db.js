const mongoose = require('mongoose');
const { config } = require('./env');

/**
 * Connects to the persistent MongoDB instance configured by MONGODB_URI
 * (MongoDB Atlas or a local mongod). There is intentionally NO in-memory
 * fallback: if the database is unreachable the server refuses to start,
 * so submitted data can never silently vanish on restart.
 */
async function connectDB(uri = config.mongoUri) {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: true,
  });
  const { host, name } = conn.connection;
  console.log(`[MongoDB] Connected to ${host}/${name}`);
  return conn;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
