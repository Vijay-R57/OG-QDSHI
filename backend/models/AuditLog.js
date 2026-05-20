const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  date:      { type: String,  required: true },
  timestamp: { type: Date,    default: Date.now },
  empId:     { type: String,  required: true },
  empName:   { type: String,  required: true },
  dept:      { type: String,  required: true },
  shift:     { type: String,  required: true },
  module:    { type: String,  default: null },      // 'Q','D','S','H' or null
  deptType:  { type: String,  default: 'special' }, // 'qdsh' | 'special'
  action:    { type: String,  default: 'save' },
}, { timestamps: false });

AuditLogSchema.index({ dept: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
