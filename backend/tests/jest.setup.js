const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Create an in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  console.log('Connected to in-memory MongoDB for testing');

  // Make sure we don't use the default MongoDB database
  process.env.MONGODB_URI = mongoUri;
  
  // Close any open handles that might be left from imports
  jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from the database
  await mongoose.disconnect();
  // Stop the MongoDB server
  await mongoServer.stop();
  console.log('Disconnected from in-memory MongoDB');
});

// Clear all collections after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
});

// Global timeout for all tests
jest.setTimeout(30000);