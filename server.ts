import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
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

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const stripe = getStripe();
    const { email, uid } = req.body;
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

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
