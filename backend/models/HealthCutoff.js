const mongoose = require('mongoose');

const healthCutoffSchema = new mongoose.Schema({
  cutoffTime: { type: String, default: '17:00' }, // HH:MM 24-hour
  overrides: [{
    date:  { type: Number, required: true },
    month: { type: String, required: true },
    year:  { type: Number, required: true },
    dept:  { type: String, required: true },
    shift: { type: String, required: true },
    _id: false,
  }],
});

module.exports = mongoose.model('HealthCutoff', healthCutoffSchema);
