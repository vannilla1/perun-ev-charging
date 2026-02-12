import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Inicializácia Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// POST /api/payments/setup-intent
// Vytvorenie SetupIntent pre uloženie platobnej metódy
export async function POST(request: NextRequest) {
  try {
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
