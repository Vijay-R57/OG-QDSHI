const express  = require('express');
const router   = express.Router();
const LoginLog = require('../models/LoginLog');

// POST — record a login or logout event
router.post('/', async (req, res) => {
  const { userId, empId, empName, role, dept, action } = req.body;
  if (!action) return res.status(400).json({ error: 'action is required' });
  try {
    const log = await LoginLog.create({ userId, empId, empName, role, dept, action, timestamp: new Date() });
    res.json({ success: true, log });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all logs (superadmin dashboard)
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 300;
    const logs  = await LoginLog.find().sort({ timestamp: -1 }).limit(limit);
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE a single log entry
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await LoginLog.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Log not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
