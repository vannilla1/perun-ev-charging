import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe is optional - only initialize if key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// POST /api/payments/capture
// Capture skutočnej sumy po ukončení nabíjania
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
      paymentIntentId,
      actualAmount,
      energyDelivered,
      duration,
      sessionId,
    } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'PaymentIntent ID je povinné' },
        { status: 400 }
      );
    }

    if (actualAmount === undefined || actualAmount < 0) {
      return NextResponse.json(
        { error: 'Skutočná suma je povinná a musí byť nezáporná' },
        { status: 400 }
      );
    }

    // Získame PaymentIntent pre overenie
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'requires_capture') {
      return NextResponse.json(
        {
          error: 'PaymentIntent nie je v stave na capture',
          currentStatus: paymentIntent.status,
        },
        { status: 400 }
      );
    }

    // Konverzia EUR na centy
    const amountToCapture = Math.round(actualAmount * 100);

    // Capture skutočnej sumy (môže byť menej ako predautorizácia)
    const capturedIntent = await stripe.paymentIntents.capture(
      paymentIntentId,
      {
        amount_to_capture: amountToCapture,
        metadata: {
          ...paymentIntent.metadata,
          actualAmount: actualAmount.toString(),
          energyDelivered: energyDelivered?.toString() || '',
          duration: duration?.toString() || '',
          sessionId: sessionId || '',
          capturedAt: new Date().toISOString(),
        },
      }
    );

    // Rozdiel medzi predautorizáciou a skutočnou sumou sa automaticky uvoľní
    const preAuthAmount = paymentIntent.amount / 100;
    const releasedAmount = preAuthAmount - actualAmount;

    return NextResponse.json({
      success: true,
      capturedAmount: actualAmount,
      preAuthAmount,
      releasedAmount: releasedAmount > 0 ? releasedAmount : 0,
      currency: 'EUR',
      paymentIntentId: capturedIntent.id,
      status: capturedIntent.status,
    });
  } catch (error) {
    console.error('Capture error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Nepodarilo sa dokončiť platbu' },
      { status: 500 }
    );
  }
}
