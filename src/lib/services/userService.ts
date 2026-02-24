import crypto from 'crypto';
import { getDb, UserDocument, COLLECTIONS } from '../mongodb';

// In-memory fallback keď MongoDB nie je dostupné
const inMemoryUsers = new Map<string, UserDocument>();

async function isMongoAvailable(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

// Hash hesla
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generovanie tokenov
export function generateToken(userId: string): string {
  const payload = {
    userId,
    type: 'access',
    exp: Date.now() + 3600 * 1000, // 1 hodina
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function generateRefreshToken(userId: string): string {
  const payload = {
    userId,
    type: 'refresh',
    exp: Date.now() + 30 * 24 * 3600 * 1000, // 30 dní
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Nájsť používateľa podľa emailu
export async function findUserByEmail(email: string): Promise<UserDocument | null> {
  const normalizedEmail = email.toLowerCase().trim();

  // Skúsiť MongoDB
  try {
    if (await isMongoAvailable()) {
      const db = await getDb();
      const user = await db.collection<UserDocument>(COLLECTIONS.USERS).findOne({
        email: normalizedEmail,
      });
      if (user) return user;
    }
  } catch (error) {
    console.warn('[UserService] MongoDB not available, using in-memory fallback');
  }

  // Fallback na in-memory
  return inMemoryUsers.get(normalizedEmail) || null;
}

// Vytvoriť nového používateľa
export async function createUser(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}): Promise<UserDocument> {
  const now = new Date();
  const user: UserDocument = {
    email: data.email.toLowerCase().trim(),
    passwordHash: hashPassword(data.password),
    firstName: data.firstName?.trim() || '',
    lastName: data.lastName?.trim() || '',
    phone: data.phone?.trim() || '',
    createdAt: now,
    updatedAt: now,
    preferredLanguage: 'sk',
    ecarupLinked: false,
  };

  // Skúsiť MongoDB
  try {
    if (await isMongoAvailable()) {
      const db = await getDb();
      const result = await db.collection<UserDocument>(COLLECTIONS.USERS).insertOne(user);
      return { ...user, _id: result.insertedId.toString() };
    }
  } catch (error) {
    console.warn('[UserService] MongoDB insert failed, using in-memory:', error);
  }

  // Fallback na in-memory
  const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const memUser = { ...user, _id: id };
  inMemoryUsers.set(user.email, memUser);
  console.log(`[UserService] User stored in-memory: ${user.email} (id: ${id})`);
  return memUser;
}

// Overiť heslo
export async function verifyPassword(email: string, password: string): Promise<UserDocument | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const passwordHash = hashPassword(password);
  if (user.passwordHash !== passwordHash) return null;

  return user;
}

// Aktualizovať používateľa
export async function updateUser(
  email: string,
  updates: Partial<UserDocument>
): Promise<boolean> {
  try {
    const db = await getDb();

    const result = await db.collection<UserDocument>(COLLECTIONS.USERS).updateOne(
      { email: email.toLowerCase().trim() },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('[UserService] Error updating user:', error);
    return false;
  }
}

// Prepojiť s eCarUp
export async function linkEcarupAccount(
  email: string,
  ecarupData: {
    customerId: string;
    accessToken: string;
    refreshToken: string;
  }
): Promise<boolean> {
  return updateUser(email, {
    ecarupLinked: true,
    ecarupCustomerId: ecarupData.customerId,
    ecarupAccessToken: ecarupData.accessToken,
    ecarupRefreshToken: ecarupData.refreshToken,
  });
}

// Získať počet používateľov
export async function getUserCount(): Promise<number> {
  try {
    if (await isMongoAvailable()) {
      const db = await getDb();
      return await db.collection(COLLECTIONS.USERS).countDocuments();
    }
  } catch {
    // fallback
  }
  return inMemoryUsers.size;
}

// Pomocná funkcia - formátovanie používateľa pre API odpoveď
export function formatUserForResponse(user: UserDocument) {
  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
    preferredLanguage: user.preferredLanguage,
  };
}
