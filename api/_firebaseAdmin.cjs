const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');

// Shared Firebase Admin SDK init for every api/*.cjs function that needs it.
//
// This is CommonJS (.cjs), not ESM, deliberately, even though this project
// is "type": "module" - confirmed in a sibling project that an ESM version
// of this exact helper (import admin from 'firebase-admin', or even the
// modular firebase-admin/app subpath imports) crashes on Vercel with
// FUNCTION_INVOCATION_FAILED at module load, before any of its own
// try/catch ever runs, despite working fine in local `node --check` and
// isolated dynamic import() tests. require() of the same subpaths works
// identically locally and on Vercel. Don't convert this back to `import`
// without redeploying and testing on Vercel first.
//
// Auth: set FIREBASE_SERVICE_ACCOUNT to the base64 of the whole service
// account JSON file (Firebase Console -> Project Settings -> Service
// Accounts -> Generate new private key):
//   node -e "console.log(Buffer.from(require('fs').readFileSync('serviceAccountKey.json')).toString('base64'))"
// Falls back to FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY if that's
// already what's configured.
let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  initialized = true;

  try {
    if (getApps().length > 0) return;

    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT;
    let credential;

    if (serviceAccountBase64) {
      const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
      credential = cert(serviceAccount);
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (clientEmail && privateKey) {
        credential = cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') });
      }
    }

    if (credential) {
      initializeApp({ credential });
    }
  } catch (error) {
    console.error('Firebase admin init error:', error);
  }
}

function getFirebaseAdmin() {
  ensureInitialized();
  if (getApps().length === 0) {
    return { db: null, auth: null, messaging: null };
  }
  try {
    return { db: getFirestore(), auth: getAuth(), messaging: getMessaging() };
  } catch (error) {
    console.error('Firebase admin service init error:', error);
    return { db: null, auth: null, messaging: null };
  }
}

module.exports = { getFirebaseAdmin };
