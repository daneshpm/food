// Creates a Razorpay order server-side. This must happen before checkout
// opens (web or native), so the payment signature returned afterward can be
// verified against a specific order_id/amount pair the client never had a
// chance to tamper with - see verify-razorpay-payment.js.
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

  const keyId = process.env.VITE_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return res.status(500).json({ success: false, error: 'Razorpay is not configured on the server (VITE_RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).' });
  }

  try {
    const { amount } = req.body; // amount in rupees
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'A positive amount (in rupees) is required' });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
      }),
    });

    const rzpData = await rzpResponse.json();
    if (!rzpResponse.ok) {
      console.error('Razorpay order creation failed:', rzpData);
      return res.status(502).json({ success: false, error: rzpData.error?.description || 'Failed to create Razorpay order' });
    }

    return res.status(200).json({ success: true, orderId: rzpData.id, amount: rzpData.amount, currency: rzpData.currency });
  } catch (err) {
    console.error('create-razorpay-order error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
