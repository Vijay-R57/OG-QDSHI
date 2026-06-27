const express = require('express');
const router = express.Router();
const PlantDashboard = require('../models/PlantDashboard');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const INITIAL_KPIS = [
  { kpi: 'Energy Index (Kilo watts / Volume)', uom: 'Nos', order: 1 },
  { kpi: 'Exhibit batches performance', uom: 'Nos', order: 2 },
  { kpi: 'OEE PACKAGING - CAM Lines', uom: '%', order: 3 },
  { kpi: 'OEE PACKAGING - CVC Lines', uom: '%', order: 4 },
  { kpi: 'Goods Transfer Value', uom: 'Cr.', order: 5 },
  { kpi: 'Substantiated Market Complaints', uom: 'Nos.', order: 6 },
  { kpi: 'Regulatory Audit Observation', uom: 'Nos.', order: 7 },
  { kpi: 'CAPA', uom: 'Nos.', order: 8 },
  { kpi: 'Deviations - Compliance', uom: 'Nos.', order: 9 },
  { kpi: 'Production Delivery [Volume]', uom: 'Mn', order: 10 },
  { kpi: 'Lead Time - Uncoated Tabs (Standard 5 days)', uom: 'Days', order: 11 },
  { kpi: 'Lead Time - Coated (Standard 7 days)', uom: 'Days', order: 12 },
  { kpi: 'Lead Time - Hard Gelatin Capsule (Standard 5 days)', uom: 'Days', order: 13 },
  { kpi: 'Lead Time - Soft Gelatin Capsule (Standard 9 days)', uom: 'Days', order: 14 },
  { kpi: 'OOS', uom: 'Nos.', order: 15 },
  { kpi: 'Right First Time (BMR, BPR, AWS)', uom: '%', order: 16 },
  { kpi: 'Technical Training', uom: 'Nos.', order: 17 },
  { kpi: 'Cost per 1000 pills', uom: 'Rs.', order: 18 },
  { kpi: 'Lot Acceptance Rate', uom: 'Ratio', order: 19 }
];

// Get data for a specific year, initializing if it doesn't exist
router.get('/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    if (!year) return res.status(400).json({ message: 'Invalid year' });

    let data = await PlantDashboard.find({ year }).sort({ order: 1 });
    
    // If no data exists for this year, initialize with the default KPIs
    if (data.length === 0) {
      const initialDocs = INITIAL_KPIS.map(item => ({
        year,
        kpi: item.kpi,
        uom: item.uom,
        order: item.order,
        ytdAvg: '',
        months: MONTHS.map(m => ({
          monthName: m,
          plan: { value: '' },
          actual: { value: '', textColor: 'black', arrowDir: 'none', arrowColor: 'black' }
        }))
      }));
      
      await PlantDashboard.insertMany(initialDocs);
      data = await PlantDashboard.find({ year }).sort({ order: 1 });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update a specific cell
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    // updateData expects the full document or the fields to update.
    
    const updated = await PlantDashboard.findByIdAndUpdate(
      id, 
      { $set: updateData },
      { new: true }
    );
    
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
