const express = require('express');
const router  = express.Router();
const Metric  = require('../models/Metrics');
const { checkTimeLock, createAuditLog, notifyHod, nowIST, formatISTDate } = require('../utils/saveHelpers');

const DEPT_CONFIG = {
  fgmw:   'Finished Goods Warehouse',
  pmw:    'Packing Material Warehouse',
  rmw:    'Raw Material Warehouse',
  ppp:    'Primary Packing Production',
  pop:    'Post Production',
  qcmad:  'QC & Microbiology Lab',
  pro:    'Production',
  spp:    'Secondary Packing Production',
  fac:    'Facilities',
  unknown: 'Unassigned Department',
};

const TYPE_MAP = { Q: 'Quality', D: 'Delivery', S: 'Safety', H: 'Health', I: 'Improvement' };

const getLabel = (letter, dept) => {
  const deptName = DEPT_CONFIG[dept] || 'General';
  const isProduction = ['ppp', 'pro', 'spp'].includes(dept);
  const typeLabel = letter === 'D' ? (isProduction ? 'Production' : 'Dispatch') : TYPE_MAP[letter] || 'Metric';
  return `${deptName} ${typeLabel}`;
};

// GET metrics (filtered by shift & dept)
router.get('/', async (req, res) => {
  try {
    const { shift, dept } = req.query;
    const query = {};
    if (dept) query.dept = dept;

    const metrics = await Metric.find(query);
    if (!shift) return res.json(metrics);

    const shiftMetrics = metrics.map(m => {
      const sd = m.shifts?.[shift] || {};
      return {
        _id: m._id, letter: m.letter, dept: m.dept,
        label: m.label || getLabel(m.letter, m.dept),
        alerts: sd.alerts ?? 0, success: sd.success ?? 0,
        daysData: sd.daysData ?? [], issueLogs: sd.issueLogs ?? [],
        staffLogs: sd.staffLogs ?? [], activityLogs: sd.activityLogs ?? [],
      };
    });
    res.json(shiftMetrics);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST update metrics
router.post('/update', async (req, res) => {
  const { letter, dept, shift, daysData, alerts, success, issueLogs, empId, empName } = req.body;

  if (!shift) return res.status(400).json({ error: 'Shift is required' });
  if (!dept || !DEPT_CONFIG[dept]) return res.status(400).json({ error: 'Invalid department' });

  // Time lock check
  const lockCheck = await checkTimeLock(dept, shift);
  if (!lockCheck.allowed) return res.status(403).json({ error: lockCheck.message });

  try {
    const updated = await Metric.findOneAndUpdate(
      { letter, dept },
      {
        $setOnInsert: { label: getLabel(letter, dept) },
        $set: {
          [`shifts.${shift}.daysData`]:   daysData   ?? [],
          [`shifts.${shift}.alerts`]:     alerts     ?? 0,
          [`shifts.${shift}.success`]:    success    ?? 0,
          [`shifts.${shift}.issueLogs`]:  issueLogs  ?? [],
        },
      },
      { upsert: true, new: true }
    );

    // Async side-effects (non-blocking)
    if (empId && empName) {
      const today = formatISTDate(nowIST());
      createAuditLog({ date: today, empId, empName, dept, shift, module: letter, deptType: 'qdsh' });
      notifyHod({ empId, empName, dept, shift, module: letter, deptType: 'qdsh' });
    }

    const sd = updated.shifts?.[shift] || {};
    res.json({ _id: updated._id, letter: updated.letter, dept: updated.dept, label: updated.label, ...sd.toObject?.() || sd });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST staff logs
router.post('/staff', async (req, res) => {
  const { letter, dept, shift, logs, empId, empName } = req.body;
  if (!shift) return res.status(400).json({ error: 'Shift is required' });
  if (!dept || !DEPT_CONFIG[dept]) return res.status(400).json({ error: 'Invalid department' });

  const lockCheck = await checkTimeLock(dept, shift);
  if (!lockCheck.allowed) return res.status(403).json({ error: lockCheck.message });

  try {
    const updated = await Metric.findOneAndUpdate(
      { letter, dept },
      { $setOnInsert: { label: getLabel(letter, dept) }, $set: { [`shifts.${shift}.staffLogs`]: logs ?? [] } },
      { upsert: true, new: true }
    );
    if (empId && empName) {
      const today = formatISTDate(nowIST());
      notifyHod({ empId, empName, dept, shift, module: letter, deptType: 'qdsh' });
      createAuditLog({ date: today, empId, empName, dept, shift, module: letter, deptType: 'qdsh' });
    }
    res.json(updated.shifts?.[shift]?.staffLogs || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST activity logs
router.post('/activity', async (req, res) => {
  const { letter, dept, shift, logs } = req.body;
  if (!shift) return res.status(400).json({ error: 'Shift is required' });
  if (!dept || !DEPT_CONFIG[dept]) return res.status(400).json({ error: 'Invalid department' });

  const lockCheck = await checkTimeLock(dept, shift);
  if (!lockCheck.allowed) return res.status(403).json({ error: lockCheck.message });

  try {
    const updated = await Metric.findOneAndUpdate(
      { letter, dept },
      { $setOnInsert: { label: getLabel(letter, dept) }, $set: { [`shifts.${shift}.activityLogs`]: logs ?? [] } },
      { upsert: true, new: true }
    );
    res.json(updated.shifts?.[shift]?.activityLogs || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
