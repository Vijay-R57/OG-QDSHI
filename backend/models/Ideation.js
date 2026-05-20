const mongoose = require('mongoose');

const ideationSchema = new mongoose.Schema({
  empId:      { type: String, required: true },
  problem:    { type: String, required: true },
  solution:   { type: String, required: true },
  benefits:   [String],
  department: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Ideation', ideationSchema);
