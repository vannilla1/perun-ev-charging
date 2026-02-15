import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe is optional - only initialize if key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// POST /api/payments/cancel-preauth
// Zrušenie predautorizácie ak nabíjanie zlyhá alebo je zrušené
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe nie je nakonfigurovaný' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { paymentIntentId, reason } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'PaymentIntent ID je povinné' },
        { status: 400 }
      );
    }

    // Získame PaymentIntent pre overenie
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Skontrolujeme či je možné zrušiť
    const cancellableStatuses = [
      'requires_payment_method',
      'requires_capture',
      'requires_confirmation',
      'requires_action',
      'processing',
    ];

    if (!cancellableStatuses.includes(paymentIntent.status)) {
      return NextResponse.json(
        {
          error: 'PaymentIntent nie je možné zrušiť',
          currentStatus: paymentIntent.status,
        },
        { status: 400 }
      );
    }

    // Zrušenie PaymentIntent
    const cancelledIntent = await stripe.paymentIntents.cancel(
      paymentIntentId,
      {
        cancellation_reason: reason === 'fraudulent' ? 'fraudulent' :
                             reason === 'duplicate' ? 'duplicate' :
                             'abandoned',
      }
    );

    const releasedAmount = paymentIntent.amount / 100;

    return NextResponse.json({
      success: true,
      releasedAmount,
      currency: 'EUR',
      paymentIntentId: cancelledIntent.id,
      status: cancelledIntent.status,
      message: `Predautorizácia ${releasedAmount.toFixed(2)} EUR bola zrušená`,
    });
  } catch (error) {
    console.error('Cancel preauth error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Nepodarilo sa zrušiť predautorizáciu' },
      { status: 500 }
    );
  }
}
