import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {defineConfig, loadEnv} from 'vite';

// Mints real Firebase custom tokens for the local dev mock, mirroring
// api/_firebaseAdmin.cjs - unlike that file, this one can stay a plain ESM
// import: the documented ESM-crashes-on-Vercel issue is specific to
// Vercel's serverless function bundler, not to Node running vite.config.ts
// directly, so there's no need for the .cjs/require() workaround here.
// Needs FIREBASE_SERVICE_ACCOUNT (or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)
// in .env.local - without it, admin/hotel login mocks fall back to the old
// behavior (no customToken, matching production's own graceful-degradation
// when Firebase Admin isn't configured).
let firebaseAdminApp: { db: any; auth: any } | null = null;
async function getDevFirebaseAdmin(env: Record<string, string>) {
  if (firebaseAdminApp) return firebaseAdminApp;
  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    const { getFirestore } = await import('firebase-admin/firestore');

    if (getApps().length === 0) {
      const serviceAccountBase64 = env.FIREBASE_SERVICE_ACCOUNT;
      let credential;
      if (serviceAccountBase64) {
        const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
        credential = cert(serviceAccount);
      } else if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
        credential = cert({
          projectId: env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        });
      }
      if (!credential) {
        firebaseAdminApp = { db: null, auth: null };
        return firebaseAdminApp;
      }
      initializeApp({ credential });
    }
    firebaseAdminApp = { db: getFirestore(), auth: getAuth() };
  } catch (err) {
    console.error('Local dev: Firebase Admin init failed:', err);
    firebaseAdminApp = { db: null, auth: null };
  }
  return firebaseAdminApp;
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['robots.txt', 'logo.png', 'pwa-icon-192.png', 'pwa-icon-512.png'],
        manifest: {
          name: "Mom's Magic",
          short_name: "Mom's Magic",
          description: "Order fresh food online from Mom's Magic. Fast delivery in BTM Layout, Bangalore and nearby areas.",
          theme_color: "#050505",
          background_color: "#050505",
          display: "standalone",
          orientation: "portrait",
          start_url: ".",
          scope: "/",
          icons: [
            {
              src: "pwa-icon-192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "pwa-icon-512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "pwa-icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,ico,json}'],
          // Import the Firebase Cloud Messaging service worker script
          // to combine FCM background push alerts with PWA offline caching!
          importScripts: ['/firebase-messaging-sw.js']
        },
        devOptions: {
          enabled: false,
          type: 'module'
        }
      }),
      {
        name: 'api-mock-server',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const settingsPath = path.resolve(__dirname, 'src/data/adminSettings.json');

            // Handle Admin Login (mirrors api/login.cjs, including minting a
            // real Firebase custom token when Firebase Admin is configured)
            if (req.url && req.url.includes('/api/login') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const data = JSON.parse(body);
                  const { email = '', password = '' } = data;
                  const adminEmail = env.ADMIN_EMAIL || '';
                  const adminPassword = env.ADMIN_PASSWORD || '';
                  const adminToken = env.ADMIN_AUTH_TOKEN || 'admin-authenticated-token';

                  if (!(adminEmail && adminPassword && email.trim().toLowerCase() === adminEmail.trim().toLowerCase() && password.trim() === adminPassword.trim())) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Invalid email or password' }));
                    return;
                  }

                  const uid = 'admin-' + crypto.createHash('sha256').update(adminEmail.trim().toLowerCase()).digest('hex').slice(0, 24);
                  let customToken = null;

                  const { db, auth } = await getDevFirebaseAdmin(env);
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
                      console.error('Local dev: failed to provision admin Firebase session:', err);
                    }
                  } else {
                    console.warn('Local dev: FIREBASE_SERVICE_ACCOUNT not set in .env.local - admin login will succeed but without a real Firebase Auth session, so Firestore-rule-gated data will be inaccessible.');
                  }

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    success: true,
                    token: adminToken,
                    customToken,
                    user: {
                      id: uid,
                      name: 'Super Admin',
                      email: adminEmail,
                      role: 'super_admin'
                    }
                  }));
                } catch (e) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, message: 'Invalid request body' }));
                }
              });
              return;
            }

            // Handle Hotel/Kitchen Login (mirrors api/hotel-auth.cjs's
            // `mode: 'login'` path - there was previously no local mock for
            // this endpoint at all, so HotelLogin.tsx could never succeed
            // locally regardless of credentials)
            if (req.url && req.url.includes('/api/hotel-auth') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const data = JSON.parse(body);
                  const { db, auth } = await getDevFirebaseAdmin(env);
                  if (!db || !auth) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Firebase Admin credentials are not configured (set FIREBASE_SERVICE_ACCOUNT in .env.local).' }));
                    return;
                  }

                  if (data.mode !== 'login') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Unknown mode' }));
                    return;
                  }

                  const { email = '', password = '' } = data;
                  if (!email.trim() || !password.trim()) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Email and password are required' }));
                    return;
                  }

                  const snap = await db.collection('hotels').where('email', '==', email.trim()).limit(1).get();
                  if (snap.empty) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Invalid kitchen credentials' }));
                    return;
                  }
                  const hotelDoc = snap.docs[0];
                  const hotelData = hotelDoc.data();
                  const storedPassword = hotelData.passwordHash || hotelData.password;

                  const verifyPassword = (plain: string, stored: string) => {
                    if (typeof stored !== 'string') return false;
                    if (stored.startsWith('scrypt:')) {
                      const [, salt, hash] = stored.split(':');
                      if (!salt || !hash) return false;
                      const computed = crypto.scryptSync(plain, salt, 64).toString('hex');
                      const a = Buffer.from(computed, 'hex');
                      const b = Buffer.from(hash, 'hex');
                      return a.length === b.length && crypto.timingSafeEqual(a, b);
                    }
                    return plain === stored;
                  };

                  if (!verifyPassword(password.trim(), storedPassword)) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Invalid kitchen credentials' }));
                    return;
                  }

                  await auth.getUser(hotelDoc.id).catch(async () => {
                    await auth.createUser({ uid: hotelDoc.id, email: hotelData.email, emailVerified: true });
                  });
                  await db.collection('staff').doc(hotelDoc.id).set(
                    { email: hotelData.email, name: hotelData.name || 'Kitchen Partner', role: 'hotel', updatedAt: new Date().toISOString() },
                    { merge: true }
                  );
                  const customToken = await auth.createCustomToken(hotelDoc.id);

                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    success: true,
                    customToken,
                    hotel: { id: hotelDoc.id, name: hotelData.name || 'Kitchen Partner', email: hotelData.email }
                  }));
                } catch (e) {
                  console.error('Local dev: hotel-auth error:', e);
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, message: 'Internal server error' }));
                }
              });
              return;
            }

            // Handle GET Admin Settings
            if (req.url && req.url.includes('/api/settings') && req.method === 'GET') {
              try {
                const settingsData = fs.readFileSync(settingsPath, 'utf8');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(settingsData);
              } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Failed to load settings' }));
              }
              return;
            }

            // Handle POST Admin Settings
            if (req.url && req.url.includes('/api/settings') && req.method === 'POST') {
              const authHeader = req.headers['authorization'];
              if (!authHeader || !authHeader.includes('mock-jwt-admin-token-123456')) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Unauthorized access' }));
                return;
              }

              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', () => {
                try {
                  const newSettings = JSON.parse(body);
                  newSettings.lastUpdated = new Date().toISOString();
                  fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2), 'utf8');
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, settings: newSettings }));
                } catch (e) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, message: 'Invalid settings format' }));
                }
              });
              return;
            }

            // Handle POST Send Telegram (LOCAL DEV MOCK)
            // The dev machine's network blocks api.telegram.org from Node.js.
            // Return 503 immediately so the browser's built-in direct fallback
            // in Checkout.tsx takes over — it calls Telegram directly from the
            // browser, which is NOT blocked. No error logging needed here.
            if (req.url && req.url.includes('/api/send-telegram') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', () => {
                // Drain the body so the socket isn't left hanging
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: false,
                  error: 'Local dev: proxy unavailable – browser direct call will handle this'
                }));
              });
              return;
            }

            // Handle Create Razorpay Order (LOCAL DEV) - real call to
            // Razorpay's API using VITE_RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET
            // from .env.local, same logic as api/create-razorpay-order.js,
            // so dev and prod behave the same.
            if (req.url && req.url.includes('/api/create-razorpay-order') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                const keyId = env.VITE_RAZORPAY_KEY_ID;
                const keySecret = env.RAZORPAY_KEY_SECRET;
                if (!keyId || !keySecret) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: 'Razorpay is not configured (VITE_RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing from .env.local).' }));
                  return;
                }
                try {
                  const { amount } = JSON.parse(body);
                  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
                  const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
                    body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR' }),
                  });
                  const rzpData = await rzpResponse.json();
                  if (!rzpResponse.ok) {
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: rzpData.error?.description || 'Failed to create Razorpay order' }));
                    return;
                  }
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, orderId: rzpData.id, amount: rzpData.amount, currency: rzpData.currency }));
                } catch (e) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
                }
              });
              return;
            }

            // Handle Verify Razorpay Payment (LOCAL DEV MOCK) - identical
            // signature check to api/verify-razorpay-payment.js.
            if (req.url && req.url.includes('/api/verify-razorpay-payment') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', () => {
                const keySecret = env.RAZORPAY_KEY_SECRET;
                if (!keySecret) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: 'Razorpay is not configured (RAZORPAY_KEY_SECRET missing from .env.local).' }));
                  return;
                }
                try {
                  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = JSON.parse(body);
                  const expected = crypto
                    .createHmac('sha256', keySecret)
                    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                    .digest('hex');
                  const valid = expected === razorpay_signature;
                  res.writeHead(valid ? 200 : 400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: valid, valid }));
                } catch (e) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, error: 'Invalid request' }));
                }
              });
              return;
            }

            // Handle POST Send Push Notification (LOCAL DEV MOCK)
            if (req.url && req.url.includes('/api/send-push') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', () => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: true,
                  successCount: 3,
                  failureCount: 0,
                  message: 'Local dev mock: Broadcasted push alert to 3 active PWA installations.'
                }));
              });
              return;
            }

            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: 'all',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-motion': ['framer-motion'],
            'vendor-lucide': ['lucide-react'],
            'vendor-leaflet': ['leaflet'],
            'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth']
          }
        }
      }
    }
  };
});
