const crypto = require('crypto');
const { getFirebaseAdmin } = require('./_firebaseAdmin.cjs');

// In-memory IP rate limiter for serverless environment
const loginAttempts = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxAttempts = 5;      // Max 5 attempts per minute per IP

  const userRecord = loginAttempts.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > userRecord.resetTime) {
    userRecord.count = 1;
    userRecord.resetTime = now + windowMs;
  } else {
    userRecord.count += 1;
  }

  loginAttempts.set(ip, userRecord);
  return userRecord.count > maxAttempts;
}

module.exports = async function handler(req, res) {
  // 1. Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // 2. CORS Restriction
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  const requestOrigin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin === '*' ? (requestOrigin || '*') : allowedOrigin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // 3. Rate Limiting Check (5 attempts / min per IP)
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again in 60 seconds.',
      correlationId: `err_rate_${Date.now().toString(36)}`
    });
  }

  try {
    const { email = '', password = '' } = req.body || {};
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminAuthToken = process.env.ADMIN_AUTH_TOKEN || 'admin-session-authenticated-token';

    if (!adminEmail || !adminPassword) {
      console.error('Server Configuration Error: Critical ADMIN_EMAIL or ADMIN_PASSWORD env var missing.');
      return res.status(500).json({
        success: false,
        message: 'Server authentication services unavailable.',
        correlationId: `err_cfg_${Date.now().toString(36)}`
      });
    }

    if (email.trim().toLowerCase() !== adminEmail.trim().toLowerCase() || password.trim() !== adminPassword.trim()) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Credentials verified. Also establish a real Firebase Auth session so
    // Firestore rules can actually verify "is this an admin" server-side,
    // instead of the client trusting a plain localStorage flag (which is
    // what this project did before - anyone could grant themselves admin
    // access with one devtools call). The uid is deterministic (derived
    // from the admin email) so the same admin always maps to the same
    // staff/{uid} doc.
    const uid = 'admin-' + crypto.createHash('sha256').update(adminEmail.trim().toLowerCase()).digest('hex').slice(0, 24);
    let customToken = null;

    const { db, auth } = getFirebaseAdmin();
    if (db && auth) {
      try {
        await auth.getUser(uid).catch(async () => {
          await auth.createUser({ uid, email: adminEmail, emailVerified: true });
        });
        await db.collection('staff').doc(uid).set(
          { email: adminEmail, name: 'Super Admin', role: 'admin', updatedAt: new Date().toISOString() },
          { merge: true }
        );
        customToken = await auth.createCustomToken(uid);
      } catch (err) {
        console.error('Failed to provision admin Firebase session:', err);
      }
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT not configured - admin login will not get a real Firebase Auth session, and Firestore-rule-gated admin data (hotels/riders/staff) will be inaccessible until it is set.');
    }

    return res.status(200).json({
      success: true,
      token: adminAuthToken,
      customToken,
      user: {
        id: uid,
        name: 'Super Admin',
        email: adminEmail,
        role: 'super_admin'
      }
    });
  } catch (error) {
    const correlationId = `err_${Date.now().toString(36)}`;
    console.error(`[${correlationId}] Auth Handler Exception:`, error);
    return res.status(400).json({
      success: false,
      message: 'Invalid request payload.',
      correlationId
    });
  }
};
