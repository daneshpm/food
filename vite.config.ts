import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {defineConfig, loadEnv} from 'vite';

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

            // Handle Admin Login
            if (req.url && req.url.includes('/api/login') && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  const { email = '', password = '' } = data;
                  const adminEmail = process.env.ADMIN_EMAIL || '';
                  const adminPassword = process.env.ADMIN_PASSWORD || '';
                  const adminToken = process.env.ADMIN_AUTH_TOKEN || 'admin-authenticated-token';

                  if (adminEmail && adminPassword && email.trim().toLowerCase() === adminEmail.trim().toLowerCase() && password.trim() === adminPassword.trim()) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                      success: true,
                      token: adminToken,
                      user: {
                        id: 'admin-1',
                        name: 'Admin',
                        email: adminEmail,
                        role: 'super_admin'
                      }
                    }));
                  } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Invalid email or password' }));
                  }
                } catch (e) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, message: 'Invalid request body' }));
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
