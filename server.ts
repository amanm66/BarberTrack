import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as admin from 'firebase-admin';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());

// Webhooks must receive raw body for signature verification
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

let stripeClient: Stripe | null = null;
function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is missing');
    stripeClient = new Stripe(key, { apiVersion: '2023-10-16' as any });
  }
  return stripeClient;
}

let firebaseAdminApp: admin.app.App | null = null;
function getFirebaseAdmin() {
  if (!firebaseAdminApp) {
    try {
      if (!admin.apps.length) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
           const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
           firebaseAdminApp = admin.initializeApp({
             credential: admin.credential.cert(serviceAccount)
           });
        } else {
           firebaseAdminApp = admin.initializeApp({
             credential: admin.credential.applicationDefault()
           });
        }
      } else {
        firebaseAdminApp = admin.app();
      }
    } catch(e) {
      console.error("Firebase admin init error:", e);
      throw new Error("Failed to initialize Firebase Admin");
    }
  }
  return firebaseAdminApp;
}

app.post('/api/webhook', async (req, res) => {
  const stripe = getStripe();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error("STRIPE_WEBHOOK_SECRET missing.");
    res.status(400).send("Webhook Secret Missing");
    return;
  }

  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const uid = session.client_reference_id;
    if (uid) {
       try {
         const adminApp = getFirebaseAdmin();
         const db = admin.firestore(adminApp);
         
         await db.collection('users').doc(uid).update({
           plan: 'premium',
           premiumSince: admin.firestore.FieldValue.serverTimestamp()
         });
         
         console.log(`User ${uid} upgraded to premium.`);
       } catch (dbErr) {
         console.error('Failed to update firestore user plan:', dbErr);
         res.status(500).send('Database Error');
         return;
       }
    }
  }

  res.send();
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
      return;
    }
    const token = authHeader.split('Bearer ')[1];
    const adminApp = getFirebaseAdmin();
    const decodedToken = await admin.auth(adminApp).verifyIdToken(token);
    const uid = decodedToken.uid;

    const stripe = getStripe();
    const { email } = req.body; // uid is derived securely from token
    const appUrl = process.env.APP_URL || `http://localhost:${3000}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      client_reference_id: uid,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'BarberTrack Premium',
              description: 'Unlimited sales tracking and advanced analytics.',
            },
            unit_amount: 999, // £9.99
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${appUrl}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?canceled=true`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const token = authHeader.split('Bearer ')[1];
    const adminApp = getFirebaseAdmin();
    const decodedToken = await admin.auth(adminApp).verifyIdToken(token);
    const uid = decodedToken.uid;

    const stripe = getStripe();
    const { email } = req.body;

    if (!uid || !email) {
      res.status(400).json({ error: 'Missing uid or email' });
      return;
    }

    // Find customer by email and cancel their active subscriptions
    const customers = await stripe.customers.list({ email });
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: 'active' });
      for (const sub of subscriptions.data) {
        await stripe.subscriptions.cancel(sub.id);
        console.log(`Canceled subscription ${sub.id} for user ${uid}`);
      }
    }

    // Update firestore to basic using admin sdk
    try {
      const adminApp = getFirebaseAdmin();
      const db = admin.firestore(adminApp);
      await db.collection('users').doc(uid).update({
        plan: 'basic',
        premiumSince: null
      });
      console.log(`User ${uid} downgraded to basic.`);
    } catch (dbErr) {
      console.error('Failed to update firestore user plan during downgrade:', dbErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
