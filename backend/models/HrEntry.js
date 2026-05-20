const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
  rowIndex:   { type: Number, required: true },
  plan:       { type: String, default: '' },
  actual:     { type: String, default: '' },
  percentage: { type: String, default: '' },
  statusRag:  { type: String, default: '' },
  remarks:    { type: String, default: '' },
}, { _id: false });

const HrEntrySchema = new mongoose.Schema({
  date:    { type: String, required: true },
  shift:   { type: String, required: true },
  empId:   { type: String, default: '' },
  empName: { type: String, default: '' },
  entries: [entrySchema],
}, { timestamps: true });

HrEntrySchema.index({ date: 1, shift: 1 }, { unique: true });

module.exports = mongoose.model('HrEntry', HrEntrySchema);
