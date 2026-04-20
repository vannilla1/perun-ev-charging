/**
 * Auth Helper - extrahuje informácie o používateľovi z JWT tokenu
 */

import { ObjectId } from 'mongodb';
import { getDb, COLLECTIONS, UserDocument } from '../mongodb';
import { verifyToken } from './userService';

/**
 * Dekóduje a overí JWT token (podpísaný aj legacy base64)
 */
export async function decodeToken(token: string): Promise<{ userId: string; type: string } | null> {
  return verifyToken(token);
}

/**
 * Synchronná verzia pre jednoduchú kontrolu (legacy fallback)
 * DEPRECATED — používať async decodeToken namiesto toho
 */
export function decodeTokenSync(token: string): { userId: string; type: string; exp: number } | null {
  try {
    const json = Buffer.from(token, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
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

    const user = await db.collection<UserDocument>(COLLECTIONS.USERS).findOne({
      $or: orConditions,
    });

    if (!user?.smartmeBasicAuth) return null;

    return {
      basicAuth: user.smartmeBasicAuth,
      email: user.email,
      userId: String(user._id || user.email),
    };
  } catch (error) {
    console.error('[AuthHelper] Error getting smartme auth:', error);
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
