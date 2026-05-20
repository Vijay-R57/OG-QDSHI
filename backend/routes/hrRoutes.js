const express  = require('express');
const router   = express.Router();
const HrEntry  = require('../models/HrEntry');
const { checkTimeLock, createAuditLog, notifyHod } = require('../utils/saveHelpers');

// GET /api/hr?date=YYYY-MM-DD&shift=1
router.get('/', async (req, res) => {
  const { date, shift } = req.query;
  if (!date || !shift) return res.status(400).json({ error: 'date and shift are required' });
  try {
    const doc = await HrEntry.findOne({ date, shift });
    res.json({
      entries: doc ? doc.entries : [],
      empId:   doc?.empId   || '',
      empName: doc?.empName || '',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/hr/save
router.post('/save', async (req, res) => {
  const { date, shift, entries, empId, empName } = req.body;
  if (!date || !shift || !Array.isArray(entries))
    return res.status(400).json({ error: 'date, shift and entries are required' });
  if (!empId || !empName)
    return res.status(400).json({ error: 'Employee ID and Employee Name are required' });

  const lockCheck = await checkTimeLock('hr', shift);
  if (!lockCheck.allowed) return res.status(403).json({ error: lockCheck.message });

  try {
    await HrEntry.findOneAndUpdate(
      { date, shift },
      { $set: { entries, empId, empName } },
      { upsert: true, new: true }
    );
    createAuditLog({ date, empId, empName, dept: 'hr', shift, deptType: 'special' });
    notifyHod({ empId, empName, dept: 'hr', shift, deptType: 'special' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
