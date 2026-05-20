const express          = require('express');
const router           = express.Router();
const HodNotification  = require('../models/HodNotification');

// GET notifications for a HOD dept
router.get('/', async (req, res) => {
  const { dept, unreadOnly } = req.query;
  if (!dept) return res.status(400).json({ error: 'dept is required' });
  try {
    const query = { hodDept: dept };
    if (unreadOnly === 'true') query.read = false;
    const notes = await HodNotification.find(query).sort({ timestamp: -1 }).limit(50);
    res.json(notes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET unread count
router.get('/count', async (req, res) => {
  const { dept } = req.query;
  if (!dept) return res.status(400).json({ error: 'dept is required' });
  try {
    const count = await HodNotification.countDocuments({ hodDept: dept, read: false });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH mark all read — accepts dept from query param OR body
router.patch('/read', async (req, res) => {
  const dept = req.query.dept || req.body?.dept;
  if (!dept) return res.status(400).json({ error: 'dept is required' });
  try {
    await HodNotification.updateMany({ hodDept: dept, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
