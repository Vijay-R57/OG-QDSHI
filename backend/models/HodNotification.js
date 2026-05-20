const mongoose = require('mongoose');

const HodNotificationSchema = new mongoose.Schema({
  hodDept:   { type: String, required: true },
  empId:     { type: String },
  empName:   { type: String },
  dept:      { type: String },
  shift:     { type: String },
  module:    { type: String, default: null },
  deptType:  { type: String },
  message:   { type: String },
  timestamp: { type: Date,    default: Date.now },
  read:      { type: Boolean, default: false },
}, { timestamps: false });

HodNotificationSchema.index({ hodDept: 1, read: 1, timestamp: -1 });

module.exports = mongoose.model('HodNotification', HodNotificationSchema);
