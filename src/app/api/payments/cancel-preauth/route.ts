import { NextRequest, NextResponse } from 'next/server';
import { getFormatter, getTranslations } from 'next-intl/server';
import Stripe from 'stripe';
import { getAuthenticatedUser } from '@/lib/services/authHelper';
import { paymentIntentBelongsToUser } from '@/lib/services/stripeCustomer';

// Stripe is optional - only initialize if key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// POST /api/payments/cancel-preauth
// Zrušenie predautorizácie ak nabíjanie zlyhá alebo je zrušené.
// Bezpečnosť: len vlastné PaymentIntenty — inak by útočník vedel rušiť cudzie
// predautorizácie a blokovať nabíjanie iných používateľov.
export async function POST(request: NextRequest) {
  const t = await getTranslations('api');
  const format = await getFormatter();
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: t('payments.stripeNotConfigured') },
        { status: 503 }
      );
    }

    const user = await getAuthenticatedUser(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 });
    }

    const body = await request.json();
    const { paymentIntentId, reason } = body;

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: t('payments.paymentIntentIdRequired') },
        { status: 400 }
      );
    }

    // Získame PaymentIntent pre overenie
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    const ownerId = String(user._id || user.email);
    if (!(await paymentIntentBelongsToUser(stripe, paymentIntent, ownerId, user))) {
      return NextResponse.json(
        { error: t('payments.paymentIntentNotOwned') },
        { status: 403 }
      );
    }

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
          error: t('payments.notCancellable'),
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
      message: t('payments.preauthCancelled', {
        amount: format.number(releasedAmount, { style: 'currency', currency: 'EUR' }),
      }),
    });
  } catch (error) {
    console.error('Cancel preauth error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: t('payments.cancelPreauthFailed') },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: t('payments.cancelPreauthFailed') },
      { status: 500 }
    );
  }
}
