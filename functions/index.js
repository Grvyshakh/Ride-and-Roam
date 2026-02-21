const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Helper: safe JSON parse
function safeJsonParse(s){
  try{ return JSON.parse(s); }catch(e){ return null; }
}

// Replace header name with whatever EasyPayIO sends (example uses 'x-easypay-signature')
exports.easypayWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const signature = req.get('x-easypay-signature') || req.get('X-EASYPAY-SIGNATURE') || req.get('x-signature') || req.get('X-Signature');
  const body = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const payload = safeJsonParse(body.toString()) || req.body;

  const secret = (functions.config() && functions.config().easypay && functions.config().easypay.secret) || process.env.EASYPAY_SECRET;
  if (!secret) {
    console.error('Missing EasyPay secret (functions config: easypay.secret)');
    // allow manual testing if no secret configured
  }

  // Signature verification: support multiple common gateway formats.
  // 1) Simple HMAC header: signature = hex(hmac_sha256(raw_body, secret))
  // 2) Timestamped scheme (Stripe-like): signature header contains e.g. "t=1600000000,v1=hexsig"
  if (secret) {
    const crypto = require('crypto');
    const header = signature || '';
    let verified = false;

    try {
      if (!header) {
        console.warn('No signature header present');
      } else if (header.indexOf('t=') === 0 || header.includes('t=')) {
        // Timestamped format: parse t and v1
        // e.g. "t=1600000000,v1=abcdef..."
        const parts = header.split(',').reduce((acc, p) => {
          const kv = p.split('=');
          if (kv.length === 2) acc[kv[0].trim()] = kv[1].trim();
          return acc;
        }, {});
        const ts = parts.t;
        const sig = parts.v1 || parts.signature || parts.sig;
        if (ts && sig) {
          const tolerance = 5 * 60; // 5 minutes
          const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(ts, 10));
          if (age > tolerance) {
            console.warn('Signature timestamp outside tolerance', { age });
            return res.status(401).send('Signature timestamp outside tolerance');
          }
          const signedPayload = Buffer.from(ts + '.' + body);
          const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
          const expectedBuf = Buffer.from(expected, 'utf8');
          const sigBuf = Buffer.from(sig, 'utf8');
          if (expectedBuf.length === sigBuf.length && crypto.timingSafeEqual(expectedBuf, sigBuf)) {
            verified = true;
          }
        }
      } else {
        // Plain header: compare HMAC-SHA256 of raw body
        const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
        const expectedBuf = Buffer.from(expected, 'utf8');
        const sigBuf = Buffer.from(header, 'utf8');
        if (expectedBuf.length === sigBuf.length && crypto.timingSafeEqual(expectedBuf, sigBuf)) {
          verified = true;
        }
      }
    } catch (ex) {
      console.error('Error during signature verification', ex);
      return res.status(401).send('Invalid signature');
    }

    if (!verified) {
      console.warn('Signature verification failed', { header: signature });
      return res.status(401).send('Invalid signature');
    }
  }

  // At this point the webhook payload is considered valid.
  // Expected payload example:
  // { "event": "payment.succeeded", "data": { "userUid": "UID", "amount": 499, "currency":"USD", "txId":"abc123" } }
  try {
    const event = payload && (payload.event || payload.type || 'unknown');
    const data = payload && (payload.data || payload.payload || payload);

    // Store raw event for auditing
    const evtRef = await db.collection('easypay_events').add({
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      raw: payload,
      headers: req.headers
    });

    if (event && (event === 'payment.succeeded' || (data && data.status === 'success') || payload.status === 'success')) {
      const userUid = data && data.userUid;
      const txId = data && (data.txId || data.transactionId || data.id);
      const amount = data && data.amount;

      if (userUid) {
        const userRef = db.collection('users').doc(userUid);
        await userRef.set({
          subscription: true,
          subscriptionAt: admin.firestore.FieldValue.serverTimestamp(),
          lastPayment: {
            txId: txId || null,
            amount: amount || null,
            raw: data
          }
        }, { merge: true });

        // Persist a payment record
        await db.collection('payments').add({
          userUid,
          txId: txId || null,
          amount: amount || null,
          receivedAt: admin.firestore.FieldValue.serverTimestamp(),
          raw: data
        });

        return res.status(200).send('ok');
      } else {
        // No user mapping — still store event and return 200 so gateway won't retry.
        return res.status(200).send('ok-no-user');
      }
    }

    // Unhandled event type — respond 200 to acknowledge
    return res.status(200).send('ignored');

  } catch (err) {
    console.error('Webhook handler error', err);
    return res.status(500).send('server error');
  }
});

// Create a payment session by calling EasyPay API (or return a test URL when not configured)
exports.createPaymentSession = functions.https.onRequest(async (req, res) => {
  // Allow CORS for browser clients (set to specific origin in production)
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    const body = req.body || {};
    const amount = Number(body.amount || 0);
    const currency = body.currency || 'INR';
    const productName = body.productName || '';
    const returnUrl = body.returnUrl || null;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const configApiKey = (functions.config() && functions.config().easypay && functions.config().easypay.key) || process.env.EASYPAY_API_KEY;
    const configApiBase = (functions.config() && functions.config().easypay && functions.config().easypay.base) || process.env.EASYPAY_API_BASE || 'https://api.easypay.io';

    // If an API key is configured, call the remote EasyPay API to create a session
    if (configApiKey) {
      const endpoint = configApiBase.replace(/\/$/, '') + '/v1/payments';
      const payload = {
        amount: Math.round(amount * 100) / 100, // keep cents/paise precision as provided
        currency: currency,
        product_name: productName,
        return_url: returnUrl,
        metadata: body.metadata || {}
      };

      // Use global fetch (Node 18+). Authorization header uses Bearer token if required by provider
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + configApiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('EasyPay API returned error', response.status, text);
        return res.status(502).json({ error: 'gateway_error', details: text });
      }

      const data = await response.json();

      // Expecting the gateway to return a payment URL in a common field
      const paymentUrl = data.payment_url || data.checkout_url || data.url || data.redirect_url || data.hosted_checkout_url;
      if (!paymentUrl) {
        return res.status(502).json({ error: 'no_payment_url', raw: data });
      }

      return res.status(200).json({ paymentUrl, raw: data });
    }

    // No API key configured: return a simulated/test payment URL for local development
    const simulatedUrl = (returnUrl || 'about:blank') + (returnUrl ? (returnUrl.indexOf('?') === -1 ? '?test_payment=1' : '&test_payment=1') : '');
    return res.status(200).json({ paymentUrl: simulatedUrl, simulated: true });

  } catch (err) {
    console.error('createPaymentSession error', err);
    return res.status(500).json({ error: 'server_error', details: String(err) });
  }
});
