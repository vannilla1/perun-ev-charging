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

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  // Ak máme cached connection, použijeme ho
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  // Vytvorenie nového klienta
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 5,
  });

  // Pripojenie
  await client.connect();

  const db = client.db(MONGODB_DB);

  // Cache pre budúce použitie
  cachedClient = client;
  cachedDb = db;

  console.log('[MongoDB] Connected to:', MONGODB_DB);

  return { client, db };
}

// Pomocná funkcia na získanie databázy
export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
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
