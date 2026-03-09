/**
 * Smart-me API Service
 * Priame ovládanie Pico nabíjačiek cez smart-me REST API s Basic Auth
 */

const SMARTME_API_BASE = 'https://smart-me.com/api';

interface SmartmeDevice {
  id: string; // UUID
  name: string;
  serial: number;
  activePower: number | null;
  counterReading: number | null;
  counterReadingUnit: string | null;
  switchOn: boolean | null;
  chargingStationState: number | null; // 0=Booting, 1=ReadyNoCar, 2=ReadyCarConnected, 3=StartedWaitForCar, 4=Charging, 5=Installation, 6=Authorize, 7=Offline
  voltage: number | null;
  current: number | null;
  currentL1: number | null;
  currentL2: number | null;
  currentL3: number | null;
  valueDate: string | null;
}

interface PicoChargingData {
  state: number; // ChargingStationState enum
  activeChargingPower: number; // kW
  activeChargingEnergy: number; // kWh
  duration: number; // seconds
  valueDate: string;
  maxAllowedChargingCurrent: number; // A
  minStationCurrent: number;
  maxStationCurrent: number;
  connectionMode: number;
  lastSeen: string | null;
}

interface SmartmeAction {
  name: string;
  obisCode: string;
  actionType: number; // 0=OnOff, 1=Analog
  minValue: number | null;
  maxValue: number | null;
}

// Mapovanie ChargingStationState na text
export const CHARGING_STATE_NAMES: Record<number, string> = {
  0: 'Booting',
  1: 'ReadyNoCarConnected',
  2: 'ReadyCarConnected',
  3: 'StartedWaitForCar',
  4: 'Charging',
  5: 'Installation',
  6: 'Authorize',
  7: 'Offline',
};

async function smartmeRequest<T>(path: string, basicAuth: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${SMARTME_API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Smart-me API ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Získanie všetkých Pico nabíjačiek používateľa
 */
export async function getPicoStations(basicAuth: string): Promise<SmartmeDevice[]> {
  return smartmeRequest<SmartmeDevice[]>('/Pico', basicAuth);
}

/**
 * Získanie live nabíjacích dát pre Pico stanicu
 */
export async function getPicoChargingData(deviceId: string, basicAuth: string): Promise<PicoChargingData> {
  return smartmeRequest<PicoChargingData>(`/pico/charging/${deviceId}`, basicAuth);
}

/**
 * Získanie dostupných akcií pre zariadenie
 */
export async function getDeviceActions(deviceId: string, basicAuth: string): Promise<SmartmeAction[]> {
  return smartmeRequest<SmartmeAction[]>(`/actions/${deviceId}`, basicAuth);
}

/**
 * Vykonanie akcie na zariadení (napr. zapnutie/vypnutie)
 */
export async function executeAction(deviceId: string, actions: { obisCode: string; value: number }[], basicAuth: string): Promise<void> {
  await smartmeRequest<void>('/actions', basicAuth, {
    method: 'POST',
    body: JSON.stringify({
      deviceID: deviceId,
      actions: actions.map(a => ({ obisCode: a.obisCode, value: a.value })),
    }),
  });
}

/**
 * Prepnutie switch stavu zariadenia (zapnúť/vypnúť nabíjanie)
 */
export async function switchDevice(deviceId: string, switchOn: boolean, basicAuth: string): Promise<void> {
  const url = `${SMARTME_API_BASE}/Devices/${deviceId}?switchState=${switchOn}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Smart-me switch ${response.status}: ${text}`);
  }
}

/**
 * Získanie detailu jedného zariadenia
 */
export async function getDevice(deviceId: string, basicAuth: string): Promise<SmartmeDevice> {
  return smartmeRequest<SmartmeDevice>(`/Devices/${deviceId}`, basicAuth);
}

/**
 * Nájdenie Pico zariadenia podľa eCarUp station ID
 * Skúšame:
 * 1. Priame UUID zhody
 * 2. Zhodu podľa mena
 * 3. Zhodu podľa serial čísla
 */
export async function findPicoByStationId(
  ecarupStationId: string,
  ecarupStationName: string | undefined,
  basicAuth: string
): Promise<SmartmeDevice | null> {
  const picoStations = await getPicoStations(basicAuth);

  if (!picoStations || picoStations.length === 0) {
    console.log('[SmartMe] No Pico stations found for this user');
    return null;
  }

  console.log(`[SmartMe] Found ${picoStations.length} Pico stations`);

  // 1. Priame ID zhody (eCarUp môže používať smart-me UUID)
  const byId = picoStations.find(p => p.id === ecarupStationId);
  if (byId) {
    console.log(`[SmartMe] Matched by ID: ${byId.name} (${byId.id})`);
    return byId;
  }

  // 2. Zhoda podľa mena stanice
  if (ecarupStationName) {
    const nameLower = ecarupStationName.toLowerCase();
    const byName = picoStations.find(p =>
      p.name && (
        p.name.toLowerCase() === nameLower ||
        p.name.toLowerCase().includes(nameLower) ||
        nameLower.includes(p.name.toLowerCase())
      )
    );
    if (byName) {
      console.log(`[SmartMe] Matched by name: ${byName.name} (${byName.id})`);
      return byName;
    }
  }

  // 3. Zhoda podľa serial čísla
  const bySerial = picoStations.find(p => String(p.serial) === ecarupStationId);
  if (bySerial) {
    console.log(`[SmartMe] Matched by serial: ${bySerial.name} (${bySerial.id})`);
    return bySerial;
  }

  // Log všetky stanice pre debug
  console.log('[SmartMe] No match found. Available Pico stations:');
  picoStations.forEach(p => {
    console.log(`  - ${p.name} (id: ${p.id}, serial: ${p.serial}, state: ${CHARGING_STATE_NAMES[p.chargingStationState ?? -1] || 'unknown'})`);
  });

  return null;
}

export type { SmartmeDevice, PicoChargingData, SmartmeAction };
