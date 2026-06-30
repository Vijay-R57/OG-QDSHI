const mongoose = require('mongoose');

const monthSchema = new mongoose.Schema({
  monthName: String,
  plan: {
    value: { type: String, default: '' }
  },
  actual: {
    value: { type: String, default: '' },
    textColor: { type: String, default: 'black' },
    arrowDir: { type: String, enum: ['up', 'down', 'none'], default: 'none' },
    arrowColor: { type: String, enum: ['red', 'green', 'black'], default: 'black' }
  }
}, { _id: false });

const plantDashboardSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  kpi: { type: String, required: true },
  uom: { type: String, default: '' },
  ytdAvg: { type: String, default: '' },
  ytd: {
    plan: {
      value: { type: String, default: '' }
    },
    actual: {
      value: { type: String, default: '' },
      textColor: { type: String, default: 'black' },
      arrowDir: { type: String, enum: ['up', 'down', 'none'], default: 'none' },
      arrowColor: { type: String, enum: ['red', 'green', 'black'], default: 'black' }
    }
  },
  order: { type: Number, default: 0 },
  months: [monthSchema]
});

plantDashboardSchema.index({ year: 1, kpi: 1 }, { unique: true });

module.exports = mongoose.model('PlantDashboard', plantDashboardSchema);
