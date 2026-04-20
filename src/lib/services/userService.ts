import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { getDb, UserDocument, COLLECTIONS } from '../mongodb';

// JWT secret — musí byť nastavený v env premenných
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'perun-ev-charging-default-secret-change-me'
);

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

// Hash hesla (bcrypt so salt rounds = 12)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Porovnanie hesla s hashom (podporuje aj legacy SHA-256)
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  // Ak hash začína $2, je to bcrypt
  if (hash.startsWith('$2')) {
    return bcrypt.compare(password, hash);
  }
  // Legacy SHA-256 fallback — pre staré účty
  const crypto = await import('crypto');
  const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
  return sha256Hash === hash;
}

// Generovanie podpísaného JWT access tokenu
export async function generateToken(userId: string): Promise<string> {
  return new SignJWT({ userId, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
}

// Generovanie podpísaného JWT refresh tokenu
export async function generateRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ userId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

// Verifikácia a dekódovanie JWT tokenu
export async function verifyToken(token: string): Promise<{ userId: string; type: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      type: payload.type as string,
    };
  } catch {
    // Fallback: skúsiť legacy Base64 formát (pre existujúce tokeny)
    try {
      const json = Buffer.from(token, 'base64').toString('utf-8');
      const parsed = JSON.parse(json);
      if (parsed.userId && parsed.exp && parsed.exp > Date.now()) {
        return { userId: parsed.userId, type: parsed.type || 'access' };
      }
    } catch {
      // Ani legacy formát nefunguje
    }
    return null;
  }
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
  } catch {
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
    passwordHash: await hashPassword(data.password),
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

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) return null;

  // Auto-migrate: ak je starý SHA-256 hash, upgradnúť na bcrypt
  if (!user.passwordHash.startsWith('$2')) {
    try {
      const newHash = await hashPassword(password);
      const db = await getDb();
      await db.collection<UserDocument>(COLLECTIONS.USERS).updateOne(
        { email: user.email },
        { $set: { passwordHash: newHash, updatedAt: new Date() } }
      );
      console.log(`[UserService] Migrated password hash to bcrypt for: ${user.email}`);
    } catch {
      // Nepodarilo sa migrovať, ale login pokračuje
    }
  }

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
    accessToken?: string;
    refreshToken?: string;
    smartmeBasicAuth?: string;
  }
): Promise<boolean> {
  const updateData: Record<string, unknown> = {
    ecarupLinked: true,
    ecarupCustomerId: ecarupData.customerId,
  };
  if (ecarupData.accessToken) updateData.ecarupAccessToken = ecarupData.accessToken;
  if (ecarupData.refreshToken) updateData.ecarupRefreshToken = ecarupData.refreshToken;
  if (ecarupData.smartmeBasicAuth) updateData.smartmeBasicAuth = ecarupData.smartmeBasicAuth;
  return updateUser(email, updateData);
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
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
    preferredLanguage: user.preferredLanguage,
  };
}
