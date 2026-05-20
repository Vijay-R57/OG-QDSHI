const mongoose = require('mongoose');

const AlertLogSchema = new mongoose.Schema({
  dept:   { type: String, required: true },
  shift:  { type: String, required: true },
  date:   { type: String, required: true }, // IST date YYYY-MM-DD
  sentAt: { type: Date, default: Date.now },
}, { timestamps: false });

AlertLogSchema.index({ dept: 1, shift: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AlertLog', AlertLogSchema);
