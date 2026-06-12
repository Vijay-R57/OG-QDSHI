const cron = require('node-cron');
const nodemailer = require('nodemailer');
const Metric = require('../models/Metrics');
const User = require('../models/User');

const WATCHDOG_DEPTS = ['fgmw', 'pmw', 'rmw', 'ppp', 'pop', 'qcmad', 'pro', 'spp', 'fac'];
const WATCHDOG_SHIFTS = ['1', '2', '3'];

const DEPT_LABELS = {
  fgmw: 'Finished Goods Warehouse',
  pmw: 'Packing Material Warehouse',
  rmw: 'Raw Material Warehouse',
  ppp: 'Primary Packing Production',
  pop: 'Post Production',
  qcmad: 'QC & Microbiology Lab',
  pro: 'Production',
  spp: 'Secondary Packing Production',
  fac: 'Facilities',
};

const CRON_SCHEDULES = [
  { shift: '1', expression: '30 14 * * *' },
  { shift: '2', expression: '30 22 * * *' },
  { shift: '3', expression: '30 06 * * *' },
];

const getIstDateString = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

const getDeptRegex = (dept) => new RegExp(`(^|,)\\s*${dept}\\s*(,|$)`, 'i');

const getTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP environment variables are required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const findHodForDepartment = async (dept) => {
  const deptRegex = getDeptRegex(dept);
  const hod = await User.findOne({ role: 'hod', department: { $regex: deptRegex } }).lean();
  return hod || null;
};

const findSuperadminEmails = async () => {
  const superadmins = await User.find({ role: 'superadmin' }).lean();
  return superadmins
    .map((user) => user.gmail || user.email)
    .filter((address) => !!address);
};

const buildWatchdogEmailHtml = ({ deptName, shift, date, hodName, status }) => {
  return `
  <div style="font-family:Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937;">
    <div style="background:#111827; padding:24px 28px; border-radius:16px 16px 0 0; text-align:center; color:#ffffff;">
      <div style="display:inline-flex; align-items:center; gap:10px; background:#dc2626; padding:6px 14px; border-radius:999px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">
        ⚠️ Urgent Escalation
      </div>
      <h1 style="margin:18px 0 4px; font-size:22px; font-weight:800;">Compliance Alert — ${deptName}</h1>
      <p style="margin:0; color:rgba(255,255,255,0.72); font-size:14px;">Watchdog detected missing shift update for the monitored department.</p>
    </div>

    <div style="background:#ffffff; padding:24px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 16px 16px;">
      <p style="margin:0 0 16px; font-size:14px; color:#374151;">Dear ${hodName},</p>
      <p style="margin:0 0 20px; font-size:14px; color:#4b5563;">This is an automated escalation from the PivotPath operational watchdog. The following target update was not found by the scheduled cutoff.</p>
      <table style="width:100%; border-collapse:collapse; font-size:14px; color:#374151;">
        <tr>
          <td style="padding:12px 16px; background:#f8fafc; border:1px solid #e5e7eb; font-weight:700; width:38%;">Target Department</td>
          <td style="padding:12px 16px; background:#ffffff; border:1px solid #e5e7eb;">${deptName}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px; background:#f8fafc; border:1px solid #e5e7eb; font-weight:700;">Audited Production Shift</td>
          <td style="padding:12px 16px; background:#ffffff; border:1px solid #e5e7eb;">Shift ${shift}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px; background:#f8fafc; border:1px solid #e5e7eb; font-weight:700;">Compliance Date</td>
          <td style="padding:12px 16px; background:#ffffff; border:1px solid #e5e7eb;">${date}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px; background:#f8fafc; border:1px solid #e5e7eb; font-weight:700;">Status</td>
          <td style="padding:12px 16px; background:#ffffff; border:1px solid #e5e7eb; color:#b91c1c; font-weight:700;">${status}</td>
        </tr>
      </table>
      <div style="margin-top:20px; padding:16px; border-radius:12px; background:#fef2f2; color:#991b1b; font-size:13px; line-height:1.6;">
        This message is generated automatically by the PivotPath Watchdog System. Please escalate to the responsible supervisor immediately.
      </div>
    </div>
  </div>`;
};

const sendWatchdogEmail = async ({ hodEmail, hodName, superadminEmails, deptName, shift, date }) => {
  const transporter = getTransporter();
  const subject = `[PivotPath Watchdog] Critical Non-Compliance — ${deptName}, Shift ${shift}`;
  const status = 'CRITICAL NON-COMPLIANCE';
  const html = buildWatchdogEmailHtml({ deptName, shift, date, hodName, status });
  const cc = Array.isArray(superadminEmails) && superadminEmails.length > 0 ? superadminEmails.join(', ') : undefined;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"PivotPath Watchdog" <${process.env.SMTP_USER}>`,
    to: hodEmail,
    cc,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

const auditDepartmentShift = async (dept, shift) => {
  const date = getIstDateString();
  const deptName = DEPT_LABELS[dept] || dept.toUpperCase();

  const existingMetric = await Metric.findOne({ date, dept, shift }).lean();
  if (existingMetric) {
    return { compliant: true, dept, shift, date };
  }

  const hod = await findHodForDepartment(dept);
  const hodEmail = (hod && (hod.gmail || hod.email)) || process.env.FALLBACK_HOD_EMAIL || 'admin-fallback@company.com';
  const hodName = (hod && hod.name) || 'HOD';
  const superadminEmails = await findSuperadminEmails();

  const info = await sendWatchdogEmail({ hodEmail, hodName, superadminEmails, deptName, shift, date });
  return { compliant: false, dept, shift, date, hodEmail, superadminEmails, messageId: info.messageId };
};

const runWatchdogCheck = async (shift) => {
  const results = [];
  for (const dept of WATCHDOG_DEPTS) {
    try {
      const result = await auditDepartmentShift(dept, shift);
      results.push(result);
      if (!result.compliant) {
        console.log(`📧 Escalation email sent for ${dept} shift ${shift}: ${result.hodEmail}`);
      }
    } catch (err) {
      console.error(`❌ Watchdog error for dept=${dept} shift=${shift}:`, err && err.message ? err.message : err);
    }
  }
  return results;
};

const initWatchdogScheduler = () => {
  try {
    const transporter = getTransporter();
    transporter.verify().then(() => console.log('✅ Watchdog SMTP transporter verified')).catch((err) => {
      console.error('❌ Watchdog SMTP transporter verification failed:', err && err.message ? err.message : err);
    });
  } catch (err) {
    console.error('❌ Watchdog scheduler cannot initialize SMTP transporter:', err.message);
    return;
  }

  CRON_SCHEDULES.forEach(({ shift, expression }) => {
    cron.schedule(expression, async () => {
      console.log(`⏰ Watchdog triggered for shift ${shift} at ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
      await runWatchdogCheck(shift);
    }, {
      timezone: 'Asia/Kolkata',
    });
    console.log(`✅ Scheduled watchdog check for shift ${shift} at '${expression}' Asia/Kolkata`);
  });
};

module.exports = { initWatchdogScheduler, runWatchdogCheck };
