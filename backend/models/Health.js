const mongoose = require('mongoose');
 
// 1. Define the schema for a single day
const daySchema = new mongoose.Schema({
  date: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    // Changed: 'null' as a string is different from the primitive null. 
    // It's safer to allow it to be optional or use an empty string.
    enum: ['meeting', 'no-meeting', 'holiday', null], 
    default: null 
  },
  keypoints: {
    type: String,
    default: ''
  },
  attendance: {
    type: String,
    default: ''
  },
  attendees: {
    type: Number,
    default: null
  },
  totalStrength: {
    type: Number,
    default: null
  }
}, { _id: false }); // Added _id: false so each day doesn't get its own unique ID

// 2. Define the main Health schema
const healthSchema = new mongoose.Schema({
  month: { 
    type: String, 
    required: true 
  },
  year: { 
    type: Number, 
    required: true 
  },
  dept: {
    type: String,
    default: 'fg' // Per-department: fg | pm | rm
  },
  shift: { 
    type: String, 
    default: '1' 
  },
  // 3. IMPORTANT: Use the daySchema here instead of just "Array"
  days: [daySchema] 
}, { timestamps: true });

// 4. Indexing for faster lookups (Optional but recommended)
healthSchema.index({ month: 1, year: 1, dept: 1, shift: 1 }, { unique: true });

module.exports = mongoose.model('Health', healthSchema);