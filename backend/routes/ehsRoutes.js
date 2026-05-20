const express  = require('express');
const router   = express.Router();
const EhsEntry = require('../models/EhsEntry');
const { checkTimeLock, createAuditLog, notifyHod } = require('../utils/saveHelpers');

// GET /api/ehs?date=YYYY-MM-DD&shift=1
router.get('/', async (req, res) => {
  const { date, shift } = req.query;
  if (!date || !shift) return res.status(400).json({ error: 'date and shift are required' });
  try {
    const doc = await EhsEntry.findOne({ date, shift });
    res.json({
      entries: doc ? doc.entries : [],
      empId:   doc?.empId   || '',
      empName: doc?.empName || '',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ehs/save
router.post('/save', async (req, res) => {
  const { date, shift, entries, empId, empName } = req.body;
  if (!date || !shift || !Array.isArray(entries))
    return res.status(400).json({ error: 'date, shift and entries are required' });
  if (!empId || !empName)
    return res.status(400).json({ error: 'Employee ID and Employee Name are required' });

  const lockCheck = await checkTimeLock('ehs', shift);
  if (!lockCheck.allowed) return res.status(403).json({ error: lockCheck.message });

  try {
    await EhsEntry.findOneAndUpdate(
      { date, shift },
      { $set: { entries, empId, empName } },
      { upsert: true, new: true }
    );
    createAuditLog({ date, empId, empName, dept: 'ehs', shift, deptType: 'special' });
    notifyHod({ empId, empName, dept: 'ehs', shift, deptType: 'special' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
