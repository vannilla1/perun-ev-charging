import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import Stripe from 'stripe';
import { getAuthenticatedUser } from '@/lib/services/authHelper';
import { paymentIntentBelongsToUser } from '@/lib/services/stripeCustomer';

// Stripe is optional - only initialize if key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// POST /api/payments/capture
// Capture skutočnej sumy po ukončení nabíjania
export async function POST(request: NextRequest) {
  const t = await getTranslations('api');
  try {
    // Auth kontrola — potrebujeme celý user dokument pre ownership check
    const user = await getAuthenticatedUser(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: t('common.notSignedIn') }, { status: 401 });
    }
    const userId = String(user._id || user.email);

    if (!stripe) {
      return NextResponse.json(
        { error: t('payments.stripeNotConfigured') },
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
        { error: t('payments.paymentIntentIdRequired') },
        { status: 400 }
      );
    }

    if (actualAmount === undefined || actualAmount < 0) {
      return NextResponse.json(
        { error: t('payments.actualAmountRequired') },
        { status: 400 }
      );
    }

    // Získame PaymentIntent pre overenie
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Ownership: capture len na vlastných PaymentIntentoch
    if (!(await paymentIntentBelongsToUser(stripe, paymentIntent, userId, user))) {
      return NextResponse.json(
        { error: t('payments.paymentIntentNotOwned') },
        { status: 403 }
      );
    }

    if (paymentIntent.status !== 'requires_capture') {
      return NextResponse.json(
        {
          error: t('payments.notCapturable'),
          currentStatus: paymentIntent.status,
        },
        { status: 400 }
      );
    }

    // Konverzia EUR na centy + server-side clamp: nikdy viac než predautorizácia
    // a nikdy nezmyselná hodnota (klient môže poslať čokoľvek).
    const amountToCapture = Math.min(
      Math.round(actualAmount * 100),
      paymentIntent.amount
    );
    if (!Number.isFinite(amountToCapture) || amountToCapture <= 0) {
      return NextResponse.json(
        { error: t('payments.invalidCaptureAmount') },
        { status: 400 }
      );
    }

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
        { error: t('payments.captureFailed') },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: t('payments.captureFailed') },
      { status: 500 }
    );
  }
}
