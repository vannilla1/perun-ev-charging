import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthenticatedUser } from '@/lib/services/authHelper';
import { resolveOwnStripeCustomerId } from '@/lib/services/stripeCustomer';

// Stripe is optional - only initialize if key is provided
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// POST /api/payments/setup-intent
// Vytvorenie SetupIntent pre uloženie platobnej metódy.
// Bezpečnosť: vyžaduje prihlásenie a SetupIntent sa viaže VÝHRADNE na
// vlastného Stripe customera (klientom poslané customerId sa ignoruje okrem
// zhody s vlastným) — bez auth by hocikto vytváral customerov/intenty.
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const { customerId } = body as { customerId?: string };

    // Resolvni (alebo vytvor) VLASTNÉHO Stripe customera — naviazaného na účet
    const ownCustomerId = await resolveOwnStripeCustomerId(stripe, user, {
      createIfMissing: true,
    });
    if (!ownCustomerId) {
      return NextResponse.json(
        { error: 'Nepodarilo sa vytvoriť zákaznícky účet' },
        { status: 500 }
      );
    }
    if (customerId && customerId !== ownCustomerId) {
      return NextResponse.json(
        { error: 'Prístup k cudziemu zákazníkovi nie je povolený' },
        { status: 403 }
      );
    }

    // Vytvorenie SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: ownCustomerId,
      payment_method_types: ['card'],
      metadata: {
        source: 'eperun-app',
        userId: String(user._id || user.email),
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: ownCustomerId,
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
