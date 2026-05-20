const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  rowIndex:    { type: Number, required: true },
  targetValue: { type: String, default: '' },
  actualValue: { type: String, default: '' },
  statusRag:   { type: String, default: '' },
  remarks:     { type: String, default: '' },
  actionOwner: { type: String, default: '' },
}, { _id: false });

const EngineeringEntrySchema = new mongoose.Schema({
  date:    { type: String, required: true },
  shift:   { type: String, required: true },
  empId:   { type: String, default: '' },
  empName: { type: String, default: '' },
  entries: [entrySchema],
}, { timestamps: true });

EngineeringEntrySchema.index({ date: 1, shift: 1 }, { unique: true });

module.exports = mongoose.model('EngineeringEntry', EngineeringEntrySchema);
