import { MongoClient, Db } from 'mongodb';

// MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'perun-electromobility';

if (!MONGODB_URI) {
  console.warn('MONGODB_URI not defined, using in-memory fallback');
}

// Globálne premenné pre connection pooling
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let connectionPromise: Promise<{ client: MongoClient; db: Db }> | null = null;

async function _connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 1,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  await client.connect();

  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  console.log('[MongoDB] Connected to:', MONGODB_DB);

  return { client, db };
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  // Ak máme cached connection, overíme že funguje
  if (cachedClient && cachedDb) {
    try {
      await cachedDb.command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch {
      console.log('[MongoDB] Cached connection stale, reconnecting...');
      cachedClient = null;
      cachedDb = null;
    }
  }

  // Mutex — ak už prebieha pripojenie, počkáme na výsledok
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = _connectToDatabase().finally(() => {
    connectionPromise = null;
  });

  return connectionPromise;
}

// Pomocná funkcia na získanie databázy
export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

// Reset cached connection (pre prípad auth errors)
export function resetConnection(): void {
  if (cachedClient) {
    cachedClient.close().catch(() => {});
  }
  cachedClient = null;
  cachedDb = null;
}

// Export typov pre kolekcie
export interface UserDocument {
  _id?: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
  preferredLanguage: string;
  // eCarUp integrácia
  ecarupLinked: boolean;
  ecarupCustomerId?: string;
  ecarupAccessToken?: string;
  ecarupRefreshToken?: string;
  smartmeBasicAuth?: string; // Base64 encoded email:password pre smart-me API
  // Platobné metódy
  paymentMethods?: PaymentMethodDocument[];
  defaultPaymentMethodId?: string;
}

export interface PaymentMethodDocument {
  id: string;
  type: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface ChargingSessionDocument {
  _id?: string;
  userId: string;
  stationId: string;
  stationName: string;
  connectorId: string;
  startTime: Date;
  endTime?: Date;
  energyDelivered: number; // kWh
  cost: number;
  currency: string;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  // eCarUp referencie
  ecarupSessionId?: string;
  ecarupTransactionId?: string;
}

// Názvy kolekcií
export const COLLECTIONS = {
  USERS: 'users',
  SESSIONS: 'charging_sessions',
  STATIONS_CACHE: 'stations_cache',
} as const;
