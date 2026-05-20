const mongoose = require('mongoose');

const LoginLogSchema = new mongoose.Schema({
  userId:    { type: String },
  empId:     { type: String },
  empName:   { type: String },
  role:      { type: String },
  dept:      { type: String },
  action:    { type: String, enum: ['login', 'logout'], required: true },
  timestamp: { type: Date,   default: Date.now },
}, { timestamps: false });

LoginLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('LoginLog', LoginLogSchema);
