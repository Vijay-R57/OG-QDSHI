require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const dns      = require('dns');

try {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);
} catch (err) {
  console.warn("⚠️ Custom DNS servers could not be set:", err.message);
}

// ── Serverless-safe MongoDB connection cache ─────────────────────────────────
// Vercel serverless functions are stateless — each cold start needs a fresh
// connection. We cache it on the module scope so warm invocations reuse it.
let _dbInitialised = false;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return; // already connected

  await mongoose.connect(process.env.MONGO_URI);

  if (!_dbInitialised) {
    _dbInitialised = true;

    const Metric = require('./models/Metrics');
    const Health = require('./models/Health');

    const DEPT_CONFIG = {
      fgmw: 'Finished Goods Warehouse', pmw: 'Packing Material Warehouse',
      rmw: 'Raw Material Warehouse',    ppp: 'Primary Packing Production',
      pop: 'Post Production',           qcmad: 'QC & Microbiology Lab',
      pro: 'Production',                spp: 'Secondary Packing Production',
      fac: 'Facilities'
    };
    const LETTERS  = ['Q', 'D', 'S', 'H', 'I'];
    const TYPE_MAP  = { Q:'Quality', D:'Delivery', S:'Safety', H:'Health', I:'Improvement' };
    const OLD_TO_NEW = { fg:'fgmw', pm:'pmw', rm:'rmw', pp:'ppp' };
    const getLabel  = (l, d) => {
      const n = DEPT_CONFIG[d] || 'General';
      const t = l === 'D' ? (['ppp','pro','spp'].includes(d) ? 'Production' : 'Dispatch') : (TYPE_MAP[l] || 'Metric');
      return `${n} ${t}`;
    };

    try { await Metric.collection.dropIndex('letter_1'); } catch (_) {}
    for (const [o, n] of Object.entries(OLD_TO_NEW)) {
      const r = await Metric.collection.updateMany({ dept: o }, { $set: { dept: n } });
      if (r.modifiedCount > 0) console.log(`Migrated ${r.modifiedCount}: ${o}→${n}`);
    }
    await Metric.collection.updateMany(
      { $or: [{ dept: { $exists: false } }, { dept: null }, { dept: '' }] },
      { $set: { dept: 'fgmw' } }
    );
    const all = await Metric.find();
    for (const m of all) {
      const lbl = getLabel(m.letter, m.dept);
      if (m.label !== lbl) { m.label = lbl; await m.save(); }
    }
    for (const l of LETTERS) {
      for (const d of Object.keys(DEPT_CONFIG)) {
        await Metric.collection.updateOne(
          { letter: l, dept: d },
          { $setOnInsert: { letter: l, dept: d, label: getLabel(l, d), shifts: { '1':{}, '2':{}, '3':{} } } },
          { upsert: true }
        );
      }
    }
    await Health.collection.updateMany(
      { $or: [{ dept: 'COMMON' }, { dept: { $exists: false } }] },
      { $set: { dept: 'fgmw' } }
    );

    const { startShiftAlertJob } = require('./jobs/shiftAlertJob');
    startShiftAlertJob();
    console.log('✅ DB initialised');
  }
}

const metricRoutes      = require('./routes/metricRoutes');
const userRoutes        = require('./routes/userRoutes');
const healthRoutes      = require('./routes/healthRoutes');
const ideationRoutes    = require('./routes/IdeationRoutes');
const ehsRoutes          = require('./routes/ehsRoutes');
const engineeringRoutes  = require('./routes/engineeringRoutes');
const hrRoutes           = require('./routes/hrRoutes');
const timeLockRoutes     = require('./routes/timeLockRoutes');
const loginLogRoutes     = require('./routes/loginLogRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { startShiftAlertJob } = require('./jobs/shiftAlertJob');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// Strip Vercel multi-service routing prefix
app.use((req, res, next) => {
  if (req.url.startsWith('/_/backend')) req.url = req.url.substring('/_/backend'.length);
  next();
});

// ✅ Ensure MongoDB is connected before every request (serverless-safe)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error:', err.message);
    res.status(503).json({ error: 'Database unavailable', detail: err.message });
  }
});

app.use('/api/metrics',      metricRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/health',       healthRoutes);
app.use('/api/ideation',     ideationRoutes);
app.use('/api/ehs',           ehsRoutes);
app.use('/api/engineering',   engineeringRoutes);
app.use('/api/hr',            hrRoutes);
app.use('/api/timelock',      timeLockRoutes);
app.use('/api/loginlog',      loginLogRoutes);
app.use('/api/notifications', notificationRoutes);


// ✅ CENTRAL CONFIG (IMPORTANT — SAME AS FRONTEND)
const DEPT_CONFIG = {
  fgmw: 'Finished Goods Warehouse',
  pmw: 'Packing Material Warehouse',
  rmw: 'Raw Material Warehouse',
  ppp: 'Primary Packing Production',
  pop: 'Post Production',
  qcmad: 'QC & Microbiology Lab',
  pro: 'Production',
  spp: 'Secondary Packing Production',
  fac: 'Facilities'
};

const LETTERS = ['Q', 'D', 'S', 'H', 'I'];

const TYPE_MAP = {
  Q: 'Quality',
  D: 'Delivery',
  S: 'Safety',
  H: 'Health',
  I: 'Improvement'
};

// Graceful Shutdown (local dev only)
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('🛑 MongoDB connection closed');
  process.exit(0);
});

// Local dev server — Vercel ignores this and uses module.exports instead
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

// ✅ Required for Vercel serverless deployment
module.exports = app;
