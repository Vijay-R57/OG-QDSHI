const express   = require('express');
const router    = express.Router();
const Ideation  = require('../models/Ideation');

router.get('/config', (req, res) => {
  res.json({
    sheetCsvUrl: process.env.GOOGLE_SHEET_CSV_URL,
    entries: {
      empId:      process.env.FORM_ENTRY_EMPID,
      problem:    process.env.FORM_ENTRY_PROBLEM,
      solution:   process.env.FORM_ENTRY_SOLUTION,
      benefit:    process.env.FORM_ENTRY_BENEFIT,
      department: process.env.FORM_ENTRY_DEPT,
    }
  });
});

router.post('/submit', async (req, res) => {
  try {
    const { empId, problem, solution, benefits, department } = req.body;

    // Save to MongoDB
    await Ideation.create({ empId, problem, solution, benefits, department });

    // Also forward to Google Form if configured
    if (process.env.GOOGLE_FORM_URL && process.env.FORM_ENTRY_EMPID) {
      try {
        const entries = {
          empId:      process.env.FORM_ENTRY_EMPID,
          problem:    process.env.FORM_ENTRY_PROBLEM,
          solution:   process.env.FORM_ENTRY_SOLUTION,
          benefit:    process.env.FORM_ENTRY_BENEFIT,
          department: process.env.FORM_ENTRY_DEPT,
        };
        const params = new URLSearchParams();
        params.append(entries.empId,      empId);
        params.append(entries.problem,    problem);
        params.append(entries.solution,   solution);
        params.append(entries.department, department);
        (Array.isArray(benefits) ? benefits : [benefits]).forEach(b => params.append(entries.benefit, b));
        await fetch(process.env.GOOGLE_FORM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
          redirect: 'manual',
        });
      } catch (_) { /* Google Form sync optional — don't fail the request */ }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/download', async (req, res) => {
  try {
    const records = await Ideation.find().sort({ submittedAt: -1 }).lean();

    const headers = ['Submitted At', 'Emp ID', 'Department', 'Problem Statement', 'Proposed Solution', 'Benefits'];
    const rows = records.map(r => [
      new Date(r.submittedAt).toLocaleString('en-GB'),
      r.empId,
      r.department,
      r.problem,
      r.solution,
      (r.benefits || []).join(', '),
    ]);

    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(row => row.map(escape).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ideation-submissions.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
