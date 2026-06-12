/**
 * Auth Helper - extrahuje informácie o používateľovi z JWT tokenu
 */

import { ObjectId } from 'mongodb';
import { getDb, COLLECTIONS, UserDocument } from '../mongodb';
import { verifyToken } from './userService';
import { decryptSecret } from './secretVault';

/**
 * Dekóduje a overí podpísaný JWT token
 */
export async function decodeToken(token: string): Promise<{ userId: string; type: string } | null> {
  return verifyToken(token);
}

/**
 * Načíta používateľský dokument pre prihláseného používateľa (podľa auth hlavičky).
 * Vráti null ak token chýba, je neplatný, alebo používateľ neexistuje v DB.
 */
export async function getAuthenticatedUser(authHeader: string | null): Promise<UserDocument | null> {
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return null;

  try {
    const db = await getDb();

    // Skúsiť ObjectId konverziu pre _id query
    const orConditions: Record<string, unknown>[] = [
      { email: payload.userId },
      { ecarupCustomerId: payload.userId },
    ];
    try {
      if (ObjectId.isValid(payload.userId)) {
        orConditions.unshift({ _id: new ObjectId(payload.userId) });
      }
    } catch {
      // Nie je platné ObjectId, preskočiť
    }

    return await db.collection<UserDocument>(COLLECTIONS.USERS).findOne({
      $or: orConditions,
    });
  } catch (error) {
    console.error('[AuthHelper] Error loading authenticated user:', error);
    return null;
  }
}

/**
 * Získa smart-me Basic Auth token z databázy pre prihláseného používateľa
 */
export async function getSmartmeAuth(authHeader: string | null): Promise<{
  basicAuth: string;
  email: string;
  userId: string;
} | null> {
  const user = await getAuthenticatedUser(authHeader);
  if (!user?.smartmeBasicAuth) return null;

  try {
    return {
      // Hodnota môže byť zašifrovaná (enc:v1:...) alebo legacy base64 — decryptSecret rieši oboje
      basicAuth: decryptSecret(user.smartmeBasicAuth),
      email: user.email,
      userId: String(user._id || user.email),
    };
  } catch (error) {
    console.error('[AuthHelper] Error decrypting smartme auth:', error);
    return null;
  }
}

/**
 * Overí auth header a vráti userId
 */
export async function requireAuth(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const payload = await verifyToken(token);
  return payload?.userId || null;
}
