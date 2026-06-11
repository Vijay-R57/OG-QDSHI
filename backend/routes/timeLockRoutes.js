const express  = require('express');
const router   = express.Router();
const TimeLock = require('../models/TimeLock');

// GET all locks (superadmin UI)
router.get('/', async (req, res) => {
  try {
    const locks = await TimeLock.find().sort({ dept: 1, shift: 1 });
    res.json(locks);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET lock for a specific dept+shift (frontend check)
router.get('/:dept/:shift', async (req, res) => {
  try {
    const lock = await TimeLock.findOne({ dept: req.params.dept, shift: req.params.shift });
    res.json(lock || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST upsert (superadmin sets/updates one or many locks)
router.post('/', async (req, res) => {
  const { locks, dept, shift, startTime, endTime, enabled } = req.body;

  const saveLock = async (lockPayload) => {
    const { dept: d, shift: s, startTime: st, endTime: et, enabled: en } = lockPayload;
    if (!d || !s || !st || !et) throw new Error('dept, shift, startTime, endTime required');
    return await TimeLock.findOneAndUpdate(
      { dept: d, shift: s },
      { $set: { startTime: st, endTime: et, enabled: en !== undefined ? en : true } },
      { upsert: true, new: true }
    );
  };

  try {
    if (Array.isArray(locks)) {
      const results = await Promise.all(locks.map(saveLock));
      return res.json(results);
    }

    if (!dept || !shift || !startTime || !endTime)
      return res.status(400).json({ error: 'dept, shift, startTime, endTime required' });

    const lock = await saveLock({ dept, shift, startTime, endTime, enabled });
    res.json(lock);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE a lock
router.delete('/:id', async (req, res) => {
  try {
    await TimeLock.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
