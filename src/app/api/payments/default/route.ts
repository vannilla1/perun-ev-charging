import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// POST /api/payments/default
// Nastavenie predvolenej platobnej metódy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, paymentMethodId } = body;

    if (!customerId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Customer ID a Payment Method ID sú povinné' },
        { status: 400 }
      );
    }

    // Aktualizácia zákazníka s predvolenou platobnou metódou
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set default payment method error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Nepodarilo sa nastaviť predvolenú platobnú metódu' },
      { status: 500 }
    );
  }
}
