import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe is optional - only initialize if key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// Default pre-authorization amount in EUR
const DEFAULT_PREAUTH_AMOUNT = parseFloat(process.env.DEFAULT_PREAUTH_AMOUNT || '30');

// POST /api/payments/preauth
// Vytvorenie PaymentIntent s predautorizáciou (capture_method: 'manual')
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe nie je nakonfigurovaný' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      email,
      stationId,
      connectorId,
      amount = DEFAULT_PREAUTH_AMOUNT,
      stationName,
    } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email je povinný' },
        { status: 400 }
      );
    }

    if (!stationId) {
      return NextResponse.json(
        { error: 'ID stanice je povinné' },
        { status: 400 }
      );
    }

    // Vytvorenie alebo získanie zákazníka
    let customer: Stripe.Customer;

    // Skúsime nájsť existujúceho zákazníka podľa emailu
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      // Vytvorenie nového guest zákazníka
      customer = await stripe.customers.create({
        email,
        metadata: {
          type: 'guest',
          source: 'eperun-charging',
        },
      });
    }

    // Konverzia EUR na centy
    const amountInCents = Math.round(amount * 100);

    // Vytvorenie PaymentIntent s manual capture (predautorizácia)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      customer: customer.id,
      capture_method: 'manual', // KEY: Toto robí predautorizáciu
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // Zakážeme redirecty pre lepší UX
      },
      metadata: {
        type: 'guest_charging',
        stationId,
        connectorId: connectorId || 'default',
        stationName: stationName || '',
        preAuthAmount: amount.toString(),
      },
      description: `EV nabíjanie - ${stationName || stationId}`,
      receipt_email: email,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId: customer.id,
      preAuthAmount: amount,
      currency: 'EUR',
    });
  } catch (error) {
    console.error('PreAuth error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Nepodarilo sa vytvoriť predautorizáciu' },
      { status: 500 }
    );
  }
}
