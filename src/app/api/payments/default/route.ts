import { NextRequest, NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import Stripe from 'stripe';
import { getAuthenticatedUser } from '@/lib/services/authHelper';
import {
  resolveOwnStripeCustomerId,
  paymentMethodBelongsToCustomer,
} from '@/lib/services/stripeCustomer';

// Stripe is optional - only initialize if key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// POST /api/payments/default
// Nastavenie predvolenej platobnej metódy.
// Bezpečnosť: customerId sa odvodzuje zo session (klientom poslané sa ignoruje
// okrem zhody s vlastným) a paymentMethodId musí patriť danému customerovi.
export async function POST(request: NextRequest) {
  const t = await getTranslations('api');
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
    const { customerId, paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: t('payments.paymentMethodIdRequired') },
        { status: 400 }
      );
    }

    const ownCustomerId = await resolveOwnStripeCustomerId(stripe, user);
    if (!ownCustomerId) {
      return NextResponse.json(
        { error: t('payments.noStripeCustomer') },
        { status: 403 }
      );
    }
    // Legacy klient stále posiela customerId v body — akceptujeme len vlastné
    if (customerId && customerId !== ownCustomerId) {
      return NextResponse.json(
        { error: t('payments.foreignCustomer') },
        { status: 403 }
      );
    }
    if (!(await paymentMethodBelongsToCustomer(stripe, paymentMethodId, ownCustomerId))) {
      return NextResponse.json(
        { error: t('payments.paymentMethodNotOwned') },
        { status: 403 }
      );
    }

    // Aktualizácia zákazníka s predvolenou platobnou metódou
    await stripe.customers.update(ownCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set default payment method error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: t('payments.setDefaultFailed') },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: t('payments.setDefaultFailed') },
      { status: 500 }
    );
  }
}
