const mongoose = require('mongoose');

const TimeLockSchema = new mongoose.Schema({
  dept:      { type: String,  required: true },
  shift:     { type: String,  required: true },
  startTime: { type: String,  required: true }, // 'HH:MM'
  endTime:   { type: String,  required: true }, // 'HH:MM'
  enabled:   { type: Boolean, default: false },
}, { timestamps: true });

TimeLockSchema.index({ dept: 1, shift: 1 }, { unique: true });

module.exports = mongoose.model('TimeLock', TimeLockSchema);
