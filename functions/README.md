Firebase Cloud Function: EasyPayIO webhook

What this does
- Provides an HTTPS webhook `easypayWebhook` that verifies a signature header (HMAC-SHA256) and stores the incoming event in Firestore.
- When a payment.succeeded event contains `userUid`, the function marks `users/{userUid}.subscription = true` and stores a `payments` document.

Setup
1. Install Firebase CLI and authenticate:

```bash
npm install -g firebase-tools
firebase login
```

2. From this `functions` folder install deps (or run from project root if using monorepo):

```bash
cd functions
npm install
```

3. Set the EasyPay secret (used to verify webhook signatures):

```bash
firebase functions:config:set easypay.secret="YOUR_SECRET_FROM_EASYPAY"
```

4. Deploy the function:

```bash
firebase deploy --only functions:easypayWebhook
```

Local testing
- To run the emulator (recommended for dev):

```bash
firebase emulators:start --only functions,firestore
```

- Example curl to emulate a signed event (replace SECRET):

```bash
BODY='{"event":"payment.succeeded","data":{"userUid":"TEST_UID","amount":499,"txId":"tx_123"}}'
SIG=$(printf "%s" "$BODY" | openssl dgst -sha256 -hmac "YOUR_SECRET" -hex | sed 's/^.* //')
curl -X POST -H "Content-Type: application/json" -H "x-easypay-signature: $SIG" http://localhost:5001/<YOUR_PROJECT>/us-central1/easypayWebhook -d "$BODY"
```

Notes
- Adjust signature verification to the exact scheme your gateway uses. This example uses HMAC-SHA256 over raw request body.
- For production, ensure the function's URL is the webhook endpoint configured in your EasyPayIO merchant dashboard and that you use the production secret.
