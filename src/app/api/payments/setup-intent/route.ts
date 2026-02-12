import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe is optional - only initialize if key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// POST /api/payments/setup-intent
// Vytvorenie SetupIntent pre uloženie platobnej metódy
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe nie je nakonfigurovaný' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { customerId } = body;

    // Ak nemáme customer ID, vytvoríme nového zákazníka
    let stripeCustomerId = customerId;

    if (!stripeCustomerId) {
      // V produkcii by sme získali údaje z autentifikovaného používateľa
      const customer = await stripe.customers.create({
        metadata: {
          source: 'eperun-app',
        },
      });
      stripeCustomerId = customer.id;
    }

    // Vytvorenie SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        source: 'eperun-app',
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: stripeCustomerId,
    });
  } catch (error) {
    console.error('Setup intent error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Nepodarilo sa pripraviť platbu' },
      { status: 500 }
    );
  }
}
