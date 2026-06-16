const nodemailer = require('nodemailer');
const path = require('path');
const User = require('../models/User');

const DEPT_FULL = {
  fgmw:  'Finished Goods Warehouse',
  pmw:   'Packing Material Warehouse',
  rmw:   'Raw Material Warehouse',
  ppp:   'Primary Packing Production',
  pop:   'Post Production',
  qcmad: 'QC & Microbiology Lab',
  pro:   'Production',
  spp:   'Secondary Packing Production',
  fac:   'Facilities',
};

const MODULE_NAMES = { Q: 'Quality', D: 'Delivery', S: 'Safety', H: 'Health' };

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    // Verify transporter and log any SMTP connectivity/auth issues early
    transporter.verify()
      .then(() => console.log('✅ SMTP transporter verified'))
      .catch(err => console.error('❌ SMTP transporter verification failed:', err && err.message ? err.message : err));
  }
  return transporter;
};

/**
 * Sends a missed-shift email alert to the HOD.
 * @param {object} opts
 * @param {string} opts.hodEmail
 * @param {string} opts.hodName
 * @param {string} opts.dept
 * @param {string} opts.shift
 * @param {string[]} opts.missedModules  e.g. ['Q','D','S']
 * @param {string} opts.date             YYYY-MM-DD
 * @param {string} opts.startTime        HH:MM
 * @param {string} opts.endTime          HH:MM
 */
const sendShiftMissedAlert = async ({ toEmails, ccEmails = [], recipientName, supervisorName, supervisorId, supervisorEmail, dept, shift, missedModules, date, startTime, endTime }) => {
  const deptName    = DEPT_FULL[dept] || dept.toUpperCase();
  const moduleList  = missedModules.map(m => `${m} — ${MODULE_NAMES[m] || m}`).join(', ');
  const subject     = `[PivotPath] Missed Shift Update — ${deptName} | Shift ${shift} | ${date}`;

  const moduleRows = missedModules
    .map(m => `<tr><td style="padding:4px 0;color:#64748b;width:130px;">Module:</td><td style="color:#dc2626;font-weight:bold;">${m} — ${MODULE_NAMES[m] || m}</td></tr>`)
    .join('');

  const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <div style="background:#059669;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <img src="cid:pivotpathlogo" alt="PivotPath Logo" style="max-height: 56px; margin-bottom: 12px; background: white; padding: 6px; border-radius: 6px;" />
    <h1 style="color:white;margin:0;font-size:20px;">PivotPath Quality Management</h1>
    <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:13px;">Automated Shift Alert</p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
    <p style="color:#334155;font-size:14px;">Dear <strong>${recipientName || 'Team'}</strong>,</p>
    <p style="color:#334155;font-size:14px;">
      This is an automated notification informing you that the supervisor responsible for
      <strong>${deptName}</strong> has <strong style="color:#dc2626;">failed to submit
      the required shift update(s) on time</strong> for Shift ${shift} on ${date}.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
      <h3 style="color:#dc2626;margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Missed Update Details</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:4px 0;color:#64748b;width:130px;">Department:</td><td style="color:#1e293b;font-weight:bold;">${deptName}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;width:130px;">Supervisor:</td><td style="color:#1e293b;font-weight:bold;">${supervisorName || 'Not Assigned'} ${supervisorId ? `(${supervisorId})` : ''}</td></tr>
        ${supervisorEmail ? `<tr><td style="padding:4px 0;color:#64748b;width:130px;">Sup. Email:</td><td style="color:#1e293b;font-weight:bold;">${supervisorEmail}</td></tr>` : ''}
        ${moduleRows}
        <tr><td style="padding:4px 0;color:#64748b;">Shift:</td><td style="color:#1e293b;font-weight:bold;">Shift ${shift}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Date:</td><td style="color:#1e293b;font-weight:bold;">${date}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Shift Window:</td><td style="color:#1e293b;font-weight:bold;">${startTime} – ${endTime} IST</td></tr>
      </table>
    </div>
    <p style="color:#334155;font-size:14px;">
      The following module updates were expected by <strong>${endTime} IST</strong>
      but no records were submitted: <strong>${moduleList}</strong>.
    </p>
    <p style="color:#334155;font-size:14px;">Please follow up with the responsible supervisor immediately. <em>(A copy of this alert has been sent to the Superadmin team for visibility.)</em></p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
    <p style="color:#94a3b8;font-size:11px;margin:0;">
      This is an automated message from the PivotPath Quality Management System. Do not reply to this email.
    </p>
  </div>`;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"PivotPath QMS" <${process.env.SMTP_USER}>`,
    to:   toEmails.join(', '),
    subject,
    html,
    attachments: [
      {
          filename: 'pivotPathLogo.svg',
          path: path.join(__dirname, '../../frontend/src/assest/pivotPathLogo.svg'),
          cid: 'pivotpathlogo'
      }
    ],
    ...(ccEmails && ccEmails.length > 0 ? { cc: ccEmails.join(', ') } : {})
  };

      try {
        const info = await getTransporter().sendMail(mailOptions);
        console.log(`📨 Shift email queued: ${info.messageId} -> ${toEmails.join(', ')}`);
        return info;
      } catch (err) {
        console.error('❌ Failed to send shift alert email:', err && err.message ? err.message : err);
        console.error('Mail options:', {
          to: toEmails,
          cc: ccEmails,
          subject,
        });
        throw err;
      }
};

module.exports = { sendShiftMissedAlert };

/**
 * Notify HOD when a user submits a pillar record.
 * opts: { empId, empName, dept, shift, module, deptType }
 */
const notifyHod = async ({ empId, empName, dept, shift, module: mod, deptType }) => {
  const fallbackEmail = process.env.FALLBACK_HOD_EMAIL || 'admin-fallback@company.com';

  // Find HOD for the department. Department field may be comma-separated, so use regex like other parts of the app.
  const deptRegex = new RegExp(`(^|,)\\s*${dept}\\s*(,|$)`, 'i');
  let hod;
  try {
    hod = await User.findOne({ role: 'hod', department: { $regex: deptRegex } }).lean();
  } catch (err) {
    console.error('❌ Error querying HOD from DB:', err && err.message ? err.message : err);
  }

  const hodEmail = (hod && (hod.gmail || hod.email)) || fallbackEmail;
  const hodName = (hod && hod.name) || 'HOD';

  const deptName = DEPT_FULL[dept] || dept.toUpperCase();
  const pillar = (mod || '').toString().toUpperCase();

  const subject = `[PivotPath] New ${pillar} Log — ${deptName} | Shift ${shift}`;

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
    <div style="background:#0f766e;padding:18px;border-radius:8px 8px 0 0;text-align:center;color:#fff;">
      <h2 style="margin:0;font-size:18px;">New ${pillar} Submission</h2>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">PivotPath — ${deptName}</p>
    </div>
    <div style="background:#fff;padding:18px;border:1px solid #e6eef0;border-top:none;border-radius:0 0 8px 8px;color:#1f2937;">
      <p>Dear <strong>${hodName}</strong>,</p>
      <p>A new <strong>${pillar}</strong> entry was submitted. Summary:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
        <tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;width:35%;color:#6b7280;">Department</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-weight:700;">${deptName}</td></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;color:#6b7280;">Pillar / Module</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-weight:700;">${pillar}</td></tr>
        <tr><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;color:#6b7280;">Shift</td><td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-weight:700;">${shift}</td></tr>
        <tr><td style="padding:6px 8px;color:#6b7280;">Submitted By</td><td style="padding:6px 8px;font-weight:700;">${empName || 'Unknown'} ${empId ? `(${empId})` : ''}</td></tr>
      </table>
      <p style="margin-top:12px;color:#374151;font-size:13px;">Please review and acknowledge this entry.</p>
      <p style="margin-top:14px;font-size:12px;color:#9ca3af;">This is an automated notification from PivotPath Quality Management System.</p>
    </div>
  </div>`;

  const mailOptions = {
    from: process.env.SMTP_FROM || `"PivotPath QMS" <${process.env.SMTP_USER}>`,
    to: hodEmail,
    subject,
    html,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log(`📨 notifyHod email sent: ${info.messageId} -> ${hodEmail}`);
    return info;
  } catch (err) {
    console.error('❌ notifyHod failed to send email:', err && err.message ? err.message : err);
    throw err;
  }
};

module.exports = { sendShiftMissedAlert, notifyHod };
