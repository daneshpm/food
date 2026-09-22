import crypto from 'crypto';

// Verifies the HMAC-SHA256 signature Razorpay returns after a successful
// payment (order_id + "|" + payment_id, signed with the key secret). This is
// the only trustworthy proof a payment actually happened - the payment id
// alone is just a string the browser (or native app) reports and can't be
// trusted on its own. Used by both the web and native (Capacitor/Cordova)
// checkout paths in Checkout.tsx, since both go through the same order_id
// and both hand back the same three fields on success.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return res.status(500).json({ success: false, error: 'Razorpay is not configured on the server (RAZORPAY_KEY_SECRET).' });
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing Razorpay payment fields' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const valid =
      expectedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

    if (!valid) {
      return res.status(400).json({ success: false, valid: false, error: 'Payment signature verification failed' });
    }

    return res.status(200).json({ success: true, valid: true });
  } catch (err) {
    console.error('verify-razorpay-payment error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
