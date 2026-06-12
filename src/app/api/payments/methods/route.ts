import { NextRequest, NextResponse } from 'next/server';
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

// GET /api/payments/methods
// Získanie platobných metód PRIHLÁSENÉHO zákazníka.
// Bezpečnosť: customerId sa NIKDY nepreberá od klienta — odvodzuje sa zo
// session používateľa (IDOR ochrana: cudzie customerId = 403).
export async function GET(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe nie je nakonfigurovaný', methods: [] },
        { status: 200 }
      );
    }

    const user = await getAuthenticatedUser(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Neautorizovaný prístup' }, { status: 401 });
    }

    const ownCustomerId = await resolveOwnStripeCustomerId(stripe, user);
    if (!ownCustomerId) {
      // Používateľ ešte nemá Stripe customera — žiadne uložené karty
      return NextResponse.json({ methods: [] });
    }

    // Legacy klient môže stále posielať ?customerId= — akceptujeme len vlastné
    const requestedCustomerId = new URL(request.url).searchParams.get('customerId');
    if (requestedCustomerId && requestedCustomerId !== ownCustomerId) {
      return NextResponse.json(
        { error: 'Prístup k cudziemu zákazníkovi nie je povolený' },
        { status: 403 }
      );
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: ownCustomerId,
      type: 'card',
    });

    // Získanie default payment method
    const customer = await stripe.customers.retrieve(ownCustomerId);
    const defaultPaymentMethodId =
      typeof customer !== 'string' && !customer.deleted
        ? customer.invoice_settings?.default_payment_method
        : null;

    const methods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      type: pm.card?.brand || 'card',
      last4: pm.card?.last4,
      expiryMonth: pm.card?.exp_month,
      expiryYear: pm.card?.exp_year,
      isDefault: pm.id === defaultPaymentMethodId,
    }));

    return NextResponse.json({ methods });
  } catch (error) {
    console.error('Get payment methods error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Nepodarilo sa získať platobné metódy' },
      { status: 500 }
    );
  }
}

// DELETE /api/payments/methods
// Odstránenie platobnej metódy — len vlastnej (overenie väzby na customera).
export async function DELETE(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe nie je nakonfigurovaný' },
        { status: 503 }
      );
    }

    const user = await getAuthenticatedUser(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ error: 'Neautorizovaný prístup' }, { status: 401 });
    }

    const body = await request.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID je povinné' },
        { status: 400 }
      );
    }

    const ownCustomerId = await resolveOwnStripeCustomerId(stripe, user);
    if (
      !ownCustomerId ||
      !(await paymentMethodBelongsToCustomer(stripe, paymentMethodId, ownCustomerId))
    ) {
      return NextResponse.json(
        { error: 'Platobná metóda nepatrí prihlásenému používateľovi' },
        { status: 403 }
      );
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete payment method error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Nepodarilo sa odstrániť platobnú metódu' },
      { status: 500 }
    );
  }
}
