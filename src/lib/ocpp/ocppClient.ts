/**
 * OCPP 1.6J WebSocket Client
 * Pre integraciu s eCarUp OCPP Central System
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import {
  OCPPMessageType,
  OCPPAction,
  OCPPCall,
  OCPPCallResult,
  OCPPCallError,
  OCPPMessage,
  OCPPConnectionState,
  RemoteStartTransactionRequest,
  RemoteStartTransactionResponse,
  RemoteStopTransactionRequest,
  RemoteStopTransactionResponse,
  StatusNotificationRequest,
  MeterValuesRequest,
  StartTransactionRequest,
  StopTransactionRequest,
  HeartbeatResponse,
} from './types';

// Environment configuration
const OCPP_WS_URL = process.env.ECARUP_OCPP_WS_URL || '';
const OCPP_AUTH_TOKEN = process.env.ECARUP_OCPP_AUTH_TOKEN || '';

// Constants
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const RECONNECT_DELAY = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
const MESSAGE_TIMEOUT = 30000; // 30 seconds

interface PendingMessage {
  resolve: (result: Record<string, unknown>) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

class OCPPClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private state: OCPPConnectionState = 'disconnected';
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private chargePointId: string;

  constructor(chargePointId: string) {
    super();
    this.chargePointId = chargePointId;
  }

  /**
   * Connect to OCPP Central System
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    if (!OCPP_WS_URL) {
      throw new Error('ECARUP_OCPP_WS_URL is not configured');
    }

    this.state = 'connecting';
    this.emit('stateChange', this.state);

    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL with charge point ID
        const wsUrl = `${OCPP_WS_URL}/${this.chargePointId}`;

        this.ws = new WebSocket(wsUrl, ['ocpp1.6'], {
          headers: {
            'Authorization': `Bearer ${OCPP_AUTH_TOKEN}`,
          },
        });

        this.ws.on('open', () => {
          console.log(`[OCPP] Connected to ${wsUrl}`);
          this.state = 'connected';
          this.reconnectAttempts = 0;
          this.emit('stateChange', this.state);
          this.emit('connected');
          this.startHeartbeat();
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data.toString());
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          console.log(`[OCPP] Connection closed: ${code} - ${reason.toString()}`);
          this.handleDisconnect();
        });

        this.ws.on('error', (error: Error) => {
          console.error('[OCPP] WebSocket error:', error);
          this.emit('error', error);
          if (this.state === 'connecting') {
            reject(error);
          }
        });
      } catch (error) {
        this.state = 'error';
        this.emit('stateChange', this.state);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from OCPP Central System
   */
  disconnect(): void {
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.state = 'disconnected';
    this.emit('stateChange', this.state);
    this.emit('disconnected');

    // Reject all pending messages
    for (const [id, pending] of this.pendingMessages) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
      this.pendingMessages.delete(id);
    }
  }

  /**
   * Send RemoteStartTransaction command
   */
  async remoteStartTransaction(
    connectorId: number,
    idTag: string
  ): Promise<RemoteStartTransactionResponse> {
    const request: RemoteStartTransactionRequest = {
      connectorId,
      idTag,
    };

    const result = await this.sendCall('RemoteStartTransaction', request);
    return result as RemoteStartTransactionResponse;
  }

  /**
   * Send RemoteStopTransaction command
   */
  async remoteStopTransaction(
    transactionId: number
  ): Promise<RemoteStopTransactionResponse> {
    const request: RemoteStopTransactionRequest = {
      transactionId,
    };

    const result = await this.sendCall('RemoteStopTransaction', request);
    return result as RemoteStopTransactionResponse;
  }

  /**
   * Get current connection state
   */
  getState(): OCPPConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  // Private methods

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private async sendCall<T extends Record<string, unknown>>(
    action: OCPPAction,
    payload: T
  ): Promise<Record<string, unknown>> {
    if (!this.isConnected()) {
      throw new Error('Not connected to OCPP Central System');
    }

    const messageId = this.generateMessageId();
    const message: OCPPCall = [OCPPMessageType.CALL, messageId, action, payload];

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(messageId);
        reject(new Error(`Request timeout for ${action}`));
      }, MESSAGE_TIMEOUT);

      this.pendingMessages.set(messageId, { resolve, reject, timeout });

      try {
        this.ws?.send(JSON.stringify(message));
        console.log(`[OCPP] Sent ${action}:`, JSON.stringify(payload));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingMessages.delete(messageId);
        reject(error);
      }
    });
  }

  private sendCallResult(
    messageId: string,
    payload: Record<string, unknown>
  ): void {
    const message: OCPPCallResult = [OCPPMessageType.CALLRESULT, messageId, payload];
    this.ws?.send(JSON.stringify(message));
    console.log(`[OCPP] Sent response for ${messageId}`);
  }

  private sendCallError(
    messageId: string,
    errorCode: string,
    errorDescription: string
  ): void {
    const message: OCPPCallError = [
      OCPPMessageType.CALLERROR,
      messageId,
      errorCode,
      errorDescription,
      {},
    ];
    this.ws?.send(JSON.stringify(message));
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as OCPPMessage;
      const messageType = message[0];

      switch (messageType) {
        case OCPPMessageType.CALL:
          this.handleIncomingCall(message as OCPPCall);
          break;
        case OCPPMessageType.CALLRESULT:
          this.handleCallResult(message as OCPPCallResult);
          break;
        case OCPPMessageType.CALLERROR:
          this.handleCallError(message as OCPPCallError);
          break;
        default:
          console.warn('[OCPP] Unknown message type:', messageType);
      }
    } catch (error) {
      console.error('[OCPP] Error parsing message:', error);
    }
  }

  private handleIncomingCall(message: OCPPCall): void {
    const [, messageId, action, payload] = message;
    console.log(`[OCPP] Received ${action}:`, JSON.stringify(payload));

    switch (action) {
      case 'StatusNotification':
        this.emit('statusNotification', payload as unknown as StatusNotificationRequest);
        this.sendCallResult(messageId, {});
        break;

      case 'MeterValues':
        this.emit('meterValues', payload as unknown as MeterValuesRequest);
        this.sendCallResult(messageId, {});
        break;

      case 'StartTransaction':
        this.emit('startTransaction', payload as unknown as StartTransactionRequest);
        // Respond with transaction ID and authorization
        this.sendCallResult(messageId, {
          idTagInfo: { status: 'Accepted' },
          transactionId: Date.now(), // Generate transaction ID
        });
        break;

      case 'StopTransaction':
        this.emit('stopTransaction', payload as unknown as StopTransactionRequest);
        this.sendCallResult(messageId, {
          idTagInfo: { status: 'Accepted' },
        });
        break;

      case 'Heartbeat':
        this.sendCallResult(messageId, {
          currentTime: new Date().toISOString(),
        });
        break;

      default:
        console.warn(`[OCPP] Unhandled action: ${action}`);
        this.sendCallError(messageId, 'NotImplemented', `Action ${action} not implemented`);
    }
  }

  private handleCallResult(message: OCPPCallResult): void {
    const [, messageId, payload] = message;
    const pending = this.pendingMessages.get(messageId);

    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(messageId);
      pending.resolve(payload);
    } else {
      console.warn(`[OCPP] No pending message for ID: ${messageId}`);
    }
  }

  private handleCallError(message: OCPPCallError): void {
    const [, messageId, errorCode, errorDescription] = message;
    const pending = this.pendingMessages.get(messageId);

    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(messageId);
      pending.reject(new Error(`${errorCode}: ${errorDescription}`));
    } else {
      console.warn(`[OCPP] No pending message for error ID: ${messageId}`);
    }
  }

  private handleDisconnect(): void {
    this.stopHeartbeat();
    this.ws = null;

    if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      this.state = 'reconnecting';
      this.emit('stateChange', this.state);
      this.reconnectAttempts++;

      console.log(`[OCPP] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

      setTimeout(() => {
        this.connect().catch(console.error);
      }, RECONNECT_DELAY);
    } else {
      this.state = 'error';
      this.emit('stateChange', this.state);
      this.emit('error', new Error('Max reconnection attempts reached'));
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.sendCall('Heartbeat', {});
      } catch (error) {
        console.error('[OCPP] Heartbeat failed:', error);
      }
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Connection manager for multiple charge points
class OCPPConnectionManager {
  private connections: Map<string, OCPPClient> = new Map();

  /**
   * Get or create connection for a charge point
   */
  getConnection(chargePointId: string): OCPPClient {
    let client = this.connections.get(chargePointId);

    if (!client) {
      client = new OCPPClient(chargePointId);
      this.connections.set(chargePointId, client);
    }

    return client;
  }

  /**
   * Connect to a charge point
   */
  async connect(chargePointId: string): Promise<OCPPClient> {
    const client = this.getConnection(chargePointId);

    if (!client.isConnected()) {
      await client.connect();
    }

    return client;
  }

  /**
   * Disconnect from a charge point
   */
  disconnect(chargePointId: string): void {
    const client = this.connections.get(chargePointId);

    if (client) {
      client.disconnect();
      this.connections.delete(chargePointId);
    }
  }

  /**
   * Disconnect from all charge points
   */
  disconnectAll(): void {
    for (const [id, client] of this.connections) {
      client.disconnect();
      this.connections.delete(id);
    }
  }

  /**
   * Send RemoteStartTransaction to a charge point
   */
  async remoteStartTransaction(
    chargePointId: string,
    connectorId: number,
    idTag: string
  ): Promise<RemoteStartTransactionResponse> {
    const client = await this.connect(chargePointId);
    return client.remoteStartTransaction(connectorId, idTag);
  }

  /**
   * Send RemoteStopTransaction to a charge point
   */
  async remoteStopTransaction(
    chargePointId: string,
    transactionId: number
  ): Promise<RemoteStopTransactionResponse> {
    const client = await this.connect(chargePointId);
    return client.remoteStopTransaction(transactionId);
  }
}

// Export singleton instance
export const ocppConnectionManager = new OCPPConnectionManager();
export { OCPPClient };
