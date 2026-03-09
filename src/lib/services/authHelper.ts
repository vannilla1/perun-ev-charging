/**
 * Auth Helper - extrahuje informácie o používateľovi z JWT tokenu
 */

import { getDb, COLLECTIONS, UserDocument } from '../mongodb';

interface TokenPayload {
  userId: string;
  type: string;
  exp: number;
}

/**
 * Dekóduje JWT token (base64 encoded JSON)
 */
export function decodeToken(token: string): TokenPayload | null {
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
  const payload = decodeToken(token);
  if (!payload || !payload.userId) return null;

  // Kontrola expirácie
  if (payload.exp && payload.exp < Date.now()) return null;

  try {
    const db = await getDb();
    const user = await db.collection<UserDocument>(COLLECTIONS.USERS).findOne({
      $or: [
        { _id: payload.userId },
        { email: payload.userId },
        { ecarupCustomerId: payload.userId },
      ],
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
