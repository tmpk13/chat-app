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
  console.log('Connected to in-memory MongoDB');
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
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});