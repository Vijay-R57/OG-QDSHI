require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI is not set in .env');
  process.exit(1);
}

console.log('Attempting MongoDB connection to:', uri);

(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connected to MongoDB successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB connection failed:');
    console.error(err);
    if (err && err.reason) console.error('Reason:', err.reason);
    process.exit(2);
  }
})();
