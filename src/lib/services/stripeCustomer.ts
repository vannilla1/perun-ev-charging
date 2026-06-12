/**
 * Stripe Customer Helper — väzba Stripe customera na prihláseného používateľa
 * a overovanie vlastníctva platobných objektov (IDOR ochrana).
 */

import Stripe from 'stripe';
import type { UserDocument } from '../mongodb';
import { updateUser } from './userService';

/**
 * Vráti Stripe customerId patriaci POUŽÍVATEĽOVI (nikdy nedôverovať klientovi).
 * Poradie: uložené stripeCustomerId → vyhľadanie podľa emailu → (voliteľne) vytvorenie.
 * Nájdené/vytvorené ID sa perzistuje do používateľského dokumentu.
 */
export async function resolveOwnStripeCustomerId(
  stripe: Stripe,
  user: UserDocument,
  options: { createIfMissing?: boolean } = {}
): Promise<string | null> {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Vyhľadať existujúceho customera podľa emailu používateľa
  const existing = await stripe.customers.list({ email: user.email, limit: 1 });
  if (existing.data.length > 0) {
    const customerId = existing.data[0].id;
    updateUser(user.email, { stripeCustomerId: customerId }).catch(() => {});
    return customerId;
  }

  if (!options.createIfMissing) {
    return null;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    metadata: {
      source: 'eperun-app',
      userId: String(user._id || user.email),
    },
  });
  updateUser(user.email, { stripeCustomerId: customer.id }).catch(() => {});
  return customer.id;
}

/**
 * Overí, či PaymentIntent patrí prihlásenému používateľovi.
 * Kontroluje: metadata.userId, receipt_email, uložené stripeCustomerId
 * a email Stripe customera.
 */
export async function paymentIntentBelongsToUser(
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent,
  userId: string,
  user: UserDocument | null
): Promise<boolean> {
  // 1. metadata.userId — nastavované pri vytváraní predautorizácie
  if (paymentIntent.metadata?.userId && paymentIntent.metadata.userId === userId) {
    return true;
  }

  if (!user) return false;
  const email = user.email?.toLowerCase();

  // 2. receipt_email zhoduje sa s emailom používateľa
  if (email && paymentIntent.receipt_email?.toLowerCase() === email) {
    return true;
  }

  // 3. customer match
  const piCustomerId =
    typeof paymentIntent.customer === 'string'
      ? paymentIntent.customer
      : paymentIntent.customer?.id;
  if (!piCustomerId) return false;

  if (user.stripeCustomerId && piCustomerId === user.stripeCustomerId) {
    return true;
  }

  // 4. email Stripe customera zhoduje sa s emailom používateľa
  if (!email) return false;
  try {
    const customer = await stripe.customers.retrieve(piCustomerId);
    if (typeof customer !== 'string' && !customer.deleted && customer.email?.toLowerCase() === email) {
      return true;
    }
  } catch {
    // Customer sa nepodarilo načítať — vlastníctvo nepotvrdené
  }

  return false;
}

/**
 * Overí, či je platobná metóda pripojená k danému Stripe customerovi.
 */
export async function paymentMethodBelongsToCustomer(
  stripe: Stripe,
  paymentMethodId: string,
  customerId: string
): Promise<boolean> {
  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    const pmCustomerId =
      typeof paymentMethod.customer === 'string'
        ? paymentMethod.customer
        : paymentMethod.customer?.id;
    return pmCustomerId === customerId;
  } catch {
    return false;
  }
}
