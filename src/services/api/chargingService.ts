import type { ChargingSession } from '@/types';

// eCarUp Active Charging Response (podľa API dokumentácie)
interface ActiveChargingResponse {
  driverId?: string;
  status: string;
  startTime?: string;
  meterValue?: number;
  price?: number;
  transactionId?: string;
}

interface StartChargingResponse {
  sessionId: string;
  status: string;
  message?: string;
  stationId?: string;
  connectorId?: string;
  startTime?: string;
}

interface StopChargingResponse {
  success: boolean;
  session: ChargingSession;
  message?: string;
}

interface SessionStatusResponse {
  sessionId: string;
  status: ChargingSession['status'];
  currentPower: number;
  energyDelivered: number;
  duration: number;
  estimatedCost: number;
  pricePerKwh?: number;
  voltage?: number;
  current?: number;
  stateOfCharge?: number;
}

// Získanie aktívneho nabíjania na konektore
export async function getActiveCharging(
  stationId: string,
  connectorId: string
): Promise<ActiveChargingResponse | null> {
  try {
    const response = await fetch(
      `/api/charging/active?stationId=${stationId}&connectorId=${connectorId}`
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('getActiveCharging error:', error);
    return null;
  }
}

// Spustenie nabíjania
export async function startCharging(
  stationId: string,
  connectorId: string
): Promise<StartChargingResponse> {
  try {
    const response = await fetch('/api/charging/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stationId, connectorId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Nepodarilo sa spustiť nabíjanie');
    }

    return data;
  } catch (error) {
    console.error('startCharging error:', error);
    throw error;
  }
}

// Zastavenie nabíjania
export async function stopCharging(sessionId: string): Promise<StopChargingResponse> {
  try {
    const response = await fetch('/api/charging/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Nepodarilo sa zastaviť nabíjanie');
    }

    return data;
  } catch (error) {
    console.error('stopCharging error:', error);
    throw error;
  }
}

// Získanie stavu nabíjacej relácie
export async function getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
  try {
    const response = await fetch(`/api/charging/status?sessionId=${sessionId}`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Nepodarilo sa získať stav nabíjania');
    }

    return data;
  } catch (error) {
    console.error('getSessionStatus error:', error);
    // Fallback na mock hodnoty ak API zlyhá
    return {
      sessionId,
      status: 'active',
      currentPower: 22 + Math.random() * 3 - 1.5,
      energyDelivered: Math.random() * 30,
      duration: Math.floor(Math.random() * 7200),
      estimatedCost: Math.random() * 15,
    };
  }
}

// Parsovanie QR kódu stanice
export function parseStationQRCode(qrData: string): { stationId: string; connectorId?: string } | null {
  try {
    // Formát 1: JSON objekt
    if (qrData.startsWith('{')) {
      const parsed = JSON.parse(qrData);
      return {
        stationId: parsed.stationId || parsed.id,
        connectorId: parsed.connectorId,
      };
    }

    // Formát 2: URL s parametrami
    if (qrData.startsWith('http')) {
      const url = new URL(qrData);
      const stationId = url.searchParams.get('stationId') || url.searchParams.get('id');
      const connectorId = url.searchParams.get('connectorId');
      if (stationId) {
        return { stationId, connectorId: connectorId || undefined };
      }
    }

    // Formát 3: eCarUp formát (ecarup://stationId/connectorId)
    if (qrData.startsWith('ecarup://')) {
      const parts = qrData.replace('ecarup://', '').split('/');
      return {
        stationId: parts[0],
        connectorId: parts[1],
      };
    }

    // Formát 4: Jednoduchý kód stanice (napr. "ST-12345")
    if (/^[A-Z]{2,3}-\d{4,}$/i.test(qrData)) {
      return { stationId: qrData.toUpperCase() };
    }

    // Formát 5: Číslo stanice
    if (/^\d{4,}$/.test(qrData)) {
      return { stationId: qrData };
    }

    // Formát 6: Alfanumerický kód
    if (/^[A-Z0-9]{4,}$/i.test(qrData)) {
      return { stationId: qrData.toUpperCase() };
    }

    return null;
  } catch {
    return null;
  }
}

// Validácia kódu stanice
export function validateStationCode(code: string): boolean {
  if (code.length < 4) return false;

  const validFormats = [
    /^[A-Z]{2,3}-\d{4,}$/i,
    /^\d{4,}$/,
    /^[A-Z0-9]{6,}$/i,
  ];

  return validFormats.some((regex) => regex.test(code));
}

// Výpočet odhadovanej ceny
export function calculateEstimatedCost(energyKwh: number, pricePerKwh: number): number {
  return Math.round(energyKwh * pricePerKwh * 100) / 100;
}

// Formátovanie trvania
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

// Export pre chargingService objekt (pre spätnú kompatibilitu)
export const chargingService = {
  startCharging,
  stopCharging,
  getSessionStatus,
  getActiveCharging,
  parseQRCode: parseStationQRCode,
};
