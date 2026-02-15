/**
 * Guest Charging Session Service
 * Správa nabíjacích relácií pre neregistrovaných používateľov
 */

import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export type GuestSessionStatus =
  | 'pending'          // Čaká na platbu
  | 'authorized'       // Platba autorizovaná, čaká na OCPP start
  | 'starting'         // OCPP RemoteStart odoslaný
  | 'charging'         // Nabíjanie prebieha
  | 'stopping'         // OCPP RemoteStop odoslaný
  | 'completed'        // Nabíjanie dokončené, platba strhnutá
  | 'failed'           // Zlyhanie
  | 'cancelled';       // Zrušené používateľom

export interface GuestChargingSession {
  _id?: ObjectId;
  sessionId: string;
  email: string;

  // Station info
  stationId: string;
  stationName: string;
  connectorId: string;

  // Stripe info
  stripeCustomerId: string;
  paymentIntentId: string;
  preAuthAmount: number;

  // OCPP info
  ocppTransactionId?: number;
  idTag: string;
  chargePointId: string;

  // Session data
  startTime?: Date;
  endTime?: Date;
  energyDelivered: number;
  pricePerKwh: number;
  actualCost: number;

  // Status
  status: GuestSessionStatus;
  errorMessage?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSessionData {
  email: string;
  stationId: string;
  stationName: string;
  connectorId: string;
  stripeCustomerId: string;
  paymentIntentId: string;
  preAuthAmount: number;
  pricePerKwh: number;
  chargePointId: string;
}

export interface CompleteSessionData {
  energyDelivered: number;
  actualCost: number;
  endTime: Date;
}

const COLLECTION_NAME = 'guest_sessions';

function generateSessionId(): string {
  return `gs-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateIdTag(): string {
  // Generate unique OCPP idTag for this session
  return `GUEST-${Date.now().toString(36).toUpperCase()}`;
}

export const guestSessionService = {
  /**
   * Create a new guest charging session
   */
  async createSession(data: CreateSessionData): Promise<GuestChargingSession> {
    const db = await getDb();
    const collection = db.collection<GuestChargingSession>(COLLECTION_NAME);

    const session: Omit<GuestChargingSession, '_id'> = {
      sessionId: generateSessionId(),
      email: data.email,
      stationId: data.stationId,
      stationName: data.stationName,
      connectorId: data.connectorId,
      stripeCustomerId: data.stripeCustomerId,
      paymentIntentId: data.paymentIntentId,
      preAuthAmount: data.preAuthAmount,
      pricePerKwh: data.pricePerKwh,
      chargePointId: data.chargePointId,
      idTag: generateIdTag(),
      energyDelivered: 0,
      actualCost: 0,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(session as GuestChargingSession);
    return { ...session, _id: result.insertedId };
  },

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<GuestChargingSession | null> {
    const db = await getDb();
    const collection = db.collection<GuestChargingSession>(COLLECTION_NAME);
    return collection.findOne({ sessionId });
  },

  /**
   * Get session by payment intent ID
   */
  async getSessionByPaymentIntent(paymentIntentId: string): Promise<GuestChargingSession | null> {
    const db = await getDb();
    const collection = db.collection<GuestChargingSession>(COLLECTION_NAME);
    return collection.findOne({ paymentIntentId });
  },

  /**
   * Get session by OCPP transaction ID
   */
  async getSessionByTransactionId(transactionId: number): Promise<GuestChargingSession | null> {
    const db = await getDb();
    const collection = db.collection<GuestChargingSession>(COLLECTION_NAME);
    return collection.findOne({ ocppTransactionId: transactionId });
  },

  /**
   * Get active session for a station/connector
   */
  async getActiveSessionForConnector(
    stationId: string,
    connectorId: string
  ): Promise<GuestChargingSession | null> {
    const db = await getDb();
    const collection = db.collection<GuestChargingSession>(COLLECTION_NAME);
    return collection.findOne({
      stationId,
      connectorId,
      status: { $in: ['authorized', 'starting', 'charging'] },
    });
  },

  /**
   * Update session status
   */
  async updateStatus(
    sessionId: string,
    status: GuestSessionStatus,
    additionalData?: Partial<GuestChargingSession>
  ): Promise<void> {
    const db = await getDb();
    const collection = db.collection<GuestChargingSession>(COLLECTION_NAME);

    await collection.updateOne(
      { sessionId },
      {
        $set: {
          status,
          ...additionalData,
          updatedAt: new Date(),
        },
      }
    );
  },

  /**
   * Mark session as authorized (payment successful)
   */
  async markAuthorized(sessionId: string): Promise<void> {
    await this.updateStatus(sessionId, 'authorized');
  },

  /**
   * Mark session as starting (OCPP RemoteStart sent)
   */
  async markStarting(sessionId: string): Promise<void> {
    await this.updateStatus(sessionId, 'starting');
  },

  /**
   * Mark session as charging (OCPP confirmed start)
   */
  async markCharging(sessionId: string, ocppTransactionId: number): Promise<void> {
    await this.updateStatus(sessionId, 'charging', {
      ocppTransactionId,
      startTime: new Date(),
    });
  },

  /**
   * Mark session as stopping (OCPP RemoteStop sent)
   */
  async markStopping(sessionId: string): Promise<void> {
    await this.updateStatus(sessionId, 'stopping');
  },

  /**
   * Update energy usage during charging
   */
  async updateEnergyUsage(sessionId: string, energyDelivered: number): Promise<void> {
    const db = await getDb();
    const collection = db.collection<GuestChargingSession>(COLLECTION_NAME);

    const session = await this.getSession(sessionId);
    if (!session) return;

    const actualCost = energyDelivered * session.pricePerKwh;

    await collection.updateOne(
      { sessionId },
      {
        $set: {
          energyDelivered,
          actualCost,
          updatedAt: new Date(),
        },
      }
    );
  },

  /**
   * Complete session (charging finished, payment captured)
   */
  async completeSession(
    sessionId: string,
    data: CompleteSessionData
  ): Promise<void> {
    await this.updateStatus(sessionId, 'completed', {
      energyDelivered: data.energyDelivered,
      actualCost: data.actualCost,
      endTime: data.endTime,
    });
  },

  /**
   * Mark session as failed
   */
  async markFailed(sessionId: string, errorMessage: string): Promise<void> {
    await this.updateStatus(sessionId, 'failed', { errorMessage });
  },

  /**
   * Mark session as cancelled
   */
  async markCancelled(sessionId: string): Promise<void> {
    await this.updateStatus(sessionId, 'cancelled');
  },

  /**
   * Get sessions by email (for receipt/history)
   */
  async getSessionsByEmail(email: string, limit = 10): Promise<GuestChargingSession[]> {
    const db = await getDb();
    const collection = db.collection<GuestChargingSession>(COLLECTION_NAME);
    return collection
      .find({ email })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  },

  /**
   * Clean up old pending sessions (older than 1 hour)
   */
  async cleanupPendingSessions(): Promise<number> {
    const db = await getDb();
    const collection = db.collection<GuestChargingSession>(COLLECTION_NAME);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await collection.updateMany(
      {
        status: 'pending',
        createdAt: { $lt: oneHourAgo },
      },
      {
        $set: {
          status: 'cancelled',
          errorMessage: 'Session expired',
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount;
  },
};
