const mongoose = require('mongoose');

// 1. Define Sub-Schemas
const IssueLogSchema = new mongoose.Schema({
  date: String,
  rawDate: String,
  // Delivery / Production Metrics
  planned: { type: Number, default: 0 },    // Target Output
  dispatched: { type: Number, default: 0 },  // Actual Output
  breakdowns: { type: Number, default: 0 }, // Downtime in mins
  pbrDelay: { type: Number, default: 0 },
  qcDelay: { type: Number, default: 0 },
  
  // Primary Packing / Production Specifics
  waste: { type: Number, default: 0 },      // Material waste
  lineId: { type: String, default: 'L1' },  // Packing Line ID
  batchNumber: { type: String, default: '' },

  // Quality / Safety / Health
  reason: String,
  incident: String,
  affected: Number,
  severity: String,
  timestamp: { type: Date, default: Date.now },
  deviationType: { type: String, enum: ['Human Error', 'Process Error', ''], default: '' },
  numSafetyIncidents: { type: Number, default: 0 },
  numNearMiss: { type: Number, default: 0 },
  numUnsafeActs: { type: Number, default: 0 },
}, { _id: false });

const StaffLogSchema = new mongoose.Schema({
  id: String, 
  name: String, 
  action: String, 
  time: String,
}, { _id: false });

const ActivityLogSchema = new mongoose.Schema({
  id: String, 
  name: String, 
  action: String, 
  time: String,
}, { _id: false });

// 2. Define the Shift Data Container
const ShiftDataSchema = new mongoose.Schema({
  alerts: { type: Number, default: 0 },
  success: { type: Number, default: 0 },
  daysData: [String],
  issueLogs: [IssueLogSchema],
  staffLogs: [StaffLogSchema],
  activityLogs: [ActivityLogSchema],
}, { _id: false });

// 3. Main Metric Schema
const MetricSchema = new mongoose.Schema({
  letter: { type: String, required: true }, // Q, D, S, H, I
  dept: { type: String, default: 'unknown' }, // fgmw | pmw | rmw | ppp | pop | qcmad | pro | spp | fac
  label: String,
  
  // Shift-specific storage
  shifts: {
    '1': { type: ShiftDataSchema, default: () => ({}) },
    '2': { type: ShiftDataSchema, default: () => ({}) },
    '3': { type: ShiftDataSchema, default: () => ({}) },
  }
}, { timestamps: true });

MetricSchema.index({ letter: 1, dept: 1 }, { unique: true });

module.exports = mongoose.model('Metric', MetricSchema);