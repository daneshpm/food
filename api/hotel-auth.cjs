const crypto = require('crypto');
const { getFirebaseAdmin } = require('./_firebaseAdmin.cjs');

// Replaces HotelLogin.tsx's previous approach of querying the `hotels`
// Firestore collection directly from the browser and comparing a plaintext
// `password` field client-side (where('password', '==', password)) - that
// required Firestore rules to let unauthenticated clients read the hotels
// collection just to make login possible, which meant every kitchen's
// plaintext password was readable by anyone who ran the same query from
// devtools. Verification now happens here, server-side, via the Admin SDK,
// which Firestore rules can't restrict.

const loginAttempts = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxAttempts = 5;
  const record = loginAttempts.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count += 1;
  }
  loginAttempts.set(ip, record);
  return record.count > maxAttempts;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  if (stored.startsWith('scrypt:')) {
    const [, salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const computed = crypto.scryptSync(password, salt, 64).toString('hex');
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  // Legacy plaintext password from before this fix. Compared directly here
  // (once, server-side - never exposed to a client query), then upgraded
  // to a real hash immediately below so it self-heals on next login.
  return password === stored;
}

const checkAdminAuth = (req) => {
  const authHeader = req.headers['authorization'];
  const requiredToken = process.env.ADMIN_AUTH_TOKEN;
  return !!requiredToken && !!authHeader && authHeader.includes(requiredToken);
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { db, auth } = getFirebaseAdmin();
  if (!db || !auth) {
    return res.status(500).json({ success: false, message: 'Firebase Admin credentials are not configured on the server (set FIREBASE_SERVICE_ACCOUNT).' });
  }

  const { mode } = req.body || {};

  // Admin sets/resets a hotel's password. Gated by the same ADMIN_AUTH_TOKEN
  // bearer check api/settings.js and api/send-push.js already use.
  if (mode === 'set-password') {
    if (!checkAdminAuth(req)) {
      return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }
    const { hotelId, password } = req.body;
    if (!hotelId || !password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'hotelId and a password of at least 6 characters are required' });
    }
    try {
      await db.collection('hotels').doc(hotelId).set({ passwordHash: hashPassword(password), password: null }, { merge: true });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Error setting hotel password:', err);
      return res.status(500).json({ success: false, message: err.message || 'Failed to set password' });
    }
  }

  // Hotel login: public, rate-limited (matches api/login.js's pattern).
  if (mode === 'login') {
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    if (isRateLimited(clientIp)) {
      return res.status(429).json({ success: false, message: 'Too many login attempts. Please try again in 60 seconds.' });
    }

    const { email = '', password = '' } = req.body;
    if (!email.trim() || !password.trim()) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
      const snap = await db.collection('hotels').where('email', '==', email.trim()).limit(1).get();
      if (snap.empty) {
        return res.status(401).json({ success: false, message: 'Invalid kitchen credentials' });
      }
      const hotelDoc = snap.docs[0];
      const data = hotelDoc.data();
      const storedPassword = data.passwordHash || data.password;

      if (!verifyPassword(password.trim(), storedPassword)) {
        return res.status(401).json({ success: false, message: 'Invalid kitchen credentials' });
      }

      // Lazily upgrade legacy plaintext passwords to a real hash now that we
      // know it matches.
      if (!data.passwordHash) {
        await hotelDoc.ref.set({ passwordHash: hashPassword(password.trim()), password: null }, { merge: true });
      }

      // Mint a real Firebase Auth session using the EXISTING hotel doc id as
      // the uid, so every other place in this app that already keys data by
      // hotelId (menu items, orders, HotelPanel, AdminPage) keeps working
      // unchanged - no id migration needed. Also ensure a staff/{uid} doc
      // with role 'hotel' exists, since that's what HotelPanel.tsx's
      // legitimate (non-bypassed) auth check looks up.
      await auth.getUser(hotelDoc.id).catch(async () => {
        await auth.createUser({ uid: hotelDoc.id, email: data.email, emailVerified: true });
      });
      await db.collection('staff').doc(hotelDoc.id).set(
        { email: data.email, name: data.name || 'Kitchen Partner', role: 'hotel', updatedAt: new Date().toISOString() },
        { merge: true }
      );
      const customToken = await auth.createCustomToken(hotelDoc.id);

      return res.status(200).json({
        success: true,
        customToken,
        hotel: { id: hotelDoc.id, name: data.name || 'Kitchen Partner', email: data.email }
      });
    } catch (err) {
      console.error('Hotel login error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  return res.status(400).json({ success: false, message: 'Unknown mode' });
};
