const { getFirebaseAdmin } = require('./_firebaseAdmin.cjs');

const { db, messaging } = getFirebaseAdmin();
const initialized = !!db && !!messaging;
if (!initialized) {
  console.warn("FCM credentials missing. Running send-push API in simulated local dev mode.");
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers['authorization'];
  const requiredToken = process.env.ADMIN_AUTH_TOKEN;
  if (requiredToken && (!authHeader || !authHeader.includes(requiredToken))) {
    return res.status(401).json({ success: false, error: 'Unauthorized access' });
  }

  const { title, message, imageUrl, deepLink } = req.body;

  if (!title || !message) {
    return res.status(400).json({ success: false, error: 'Title and message are required' });
  }

  // 1. Local Development Simulation Fallback Mode
  if (!initialized || !db || !messaging) {
    console.log(`[Mock FCM Broadcast] Title: "${title}" Message: "${message}"`);
    return res.status(200).json({
      success: true,
      successCount: 5,
      failureCount: 0,
      mode: 'mocked'
    });
  }

  // 2. Real Production FCM Multicast Send Mode
  try {
    const tokensSnapshot = await db.collection('deviceTokens').get();
    const tokens = [];
    tokensSnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.token) {
        tokens.push(data.token);
      }
    });

    if (tokens.length === 0) {
      return res.status(200).json({
        success: true,
        successCount: 0,
        failureCount: 0,
        message: 'No registered device tokens found in Firestore.'
      });
    }

    const payload = {
      notification: {
        title: title,
        body: message,
      },
      data: {
        url: deepLink || '/',
      }
    };

    if (imageUrl) {
      payload.notification.imageUrl = imageUrl;
      payload.data.image = imageUrl;
    }

    const chunks = [];
    const chunkSize = 500;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      chunks.push(tokens.slice(i, i + chunkSize));
    }

    let successCount = 0;
    let failureCount = 0;

    for (const chunk of chunks) {
      const response = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: payload.notification,
        data: payload.data
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      const tokensToDelete = [];
      response.responses.forEach((resp, index) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            tokensToDelete.push(chunk[index]);
          }
        }
      });

      if (tokensToDelete.length > 0) {
        const batch = db.batch();
        tokensToDelete.forEach(t => {
          const docRef = db.collection('deviceTokens').doc(t);
          batch.delete(docRef);
        });
        await batch.commit();
      }
    }

    return res.status(200).json({
      success: true,
      successCount,
      failureCount,
      mode: 'production'
    });

  } catch (err) {
    console.error("FCM broadcast error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal Server Error broadcasting push notifications.'
    });
  }
};
