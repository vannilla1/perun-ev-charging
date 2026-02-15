import { isDemoMode } from './client';
import { STATION_FILTER } from './config';
import type { ChargingStation, StationFilters } from '@/types';

// eCarUp API response typy (podľa Swagger dokumentácie)
interface ECarUpStationResponse {
  stations: ECarUpStation[];
}

interface ECarUpStation {
  id: string;
  name: string;
  street?: string;
  city?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  connectors: ECarUpConnector[];
  stationGroups?: ECarUpStationGroup[];
}

interface ECarUpConnector {
  id: string;
  number?: number;
  name?: string;
  description?: string;
  plugtype: string;  // napr. "PLUG_TYPE_TYPE2"
  maxpower: number;  // vo Wattoch
  status?: string;
  state?: string;  // "AVAILABLE" alebo "UNAVAILABLE" z detailu stanice
  pricePerKwh?: number;
  access?: {
    type: string;  // "PUBLIC" alebo "PRIVATE"
  };
}

interface ECarUpStationGroup {
  id: string;
  name: string;
}

// Konverzia eCarUp formátu na náš formát
function mapECarUpStation(station: ECarUpStation): ChargingStation {
  // Filtrovať stanice bez platných súradníc
  const hasValidLocation = station.latitude !== 0 && station.longitude !== 0;

  // Stanica bez konektorov = offline
  const hasConnectors = station.connectors && station.connectors.length > 0;

  // Skontrolovať či je stanica UNAVAILABLE (z API state)
  const isUnavailable = station.connectors?.some(c => c.state === 'UNAVAILABLE');

  // Určenie celkového statusu stanice na základe konektorov
  const hasAvailable = station.connectors?.some(c => c.state === 'AVAILABLE' || c.status === 'Available');
  const allOffline = station.connectors?.every(c => c.status === 'Offline' || c.state === 'UNAVAILABLE');

  // Default je offline - stanica musí explicitne mať dostupný konektor
  let status: ChargingStation['status'] = 'offline';
  if (!hasConnectors) status = 'offline';  // Bez konektorov = offline
  else if (isUnavailable) status = 'offline';  // UNAVAILABLE = offline (šedá)
  else if (allOffline) status = 'offline';
  else if (hasAvailable) status = 'available';  // Aspoň jeden konektor dostupný
  else status = 'occupied';  // Má konektory ale žiadny nie je available

  return {
    id: station.id,
    name: station.name || 'Nabíjacia stanica',
    address: [station.street, station.city].filter(Boolean).join(', ') || (hasValidLocation ? 'ePerun nabíjacia stanica' : 'Neznáma adresa'),
    latitude: station.latitude,
    longitude: station.longitude,
    status,
    connectors: (station.connectors || []).map((c) => ({
      id: c.id,
      type: mapConnectorType(c.plugtype),
      power: Math.round((c.maxpower || 0) / 1000), // Konverzia z W na kW
      status: mapConnectorStatus(c.state || c.status || 'Available'),
      pricePerKwh: c.pricePerKwh,
    })),
    pricePerKwh: station.connectors?.[0]?.pricePerKwh || 0.35,
    operator: station.stationGroups?.[0]?.name || 'ePerun',
  };
}

function mapConnectorType(type: string): ChargingStation['connectors'][0]['type'] {
  const typeMap: Record<string, ChargingStation['connectors'][0]['type']> = {
    'Type2': 'Type2',
    'Type 2': 'Type2',
    'PLUG_TYPE_TYPE2': 'Type2',
    'CCS': 'CCS',
    'CCS2': 'CCS',
    'PLUG_TYPE_CCS': 'CCS',
    'CHAdeMO': 'CHAdeMO',
    'Chademo': 'CHAdeMO',
    'PLUG_TYPE_CHADEMO': 'CHAdeMO',
    'Type1': 'Type1',
    'Type 1': 'Type1',
    'PLUG_TYPE_TYPE1': 'Type1',
    'Tesla': 'Tesla',
    'PLUG_TYPE_TESLA': 'Tesla',
    'Schuko': 'Type2',
    'PLUG_TYPE_SCHUKO': 'Type2',
  };
  return typeMap[type] || 'Type2';
}

function mapConnectorStatus(status: string): ChargingStation['connectors'][0]['status'] {
  const statusMap: Record<string, ChargingStation['connectors'][0]['status']> = {
    'Available': 'available',
    'AVAILABLE': 'available',
    'Charging': 'charging',
    'CHARGING': 'charging',
    'Offline': 'offline',
    'OFFLINE': 'offline',
    'UNAVAILABLE': 'offline',  // UNAVAILABLE = offline (šedá)
    'Reserved': 'reserved',
    'RESERVED': 'reserved',
    'Occupied': 'charging',
    'OCCUPIED': 'charging',
    'Faulted': 'offline',
    'FAULTED': 'offline',
  };
  // Default je offline namiesto available - bezpečnejšie
  return statusMap[status] || 'offline';
}

// isDemoMode je importovaný z client.ts

// Zlúčenie staníc na rovnakej lokácii (L a P konektory) do jednej stanice
function mergeNearbyStations(stations: ChargingStation[]): ChargingStation[] {
  const LOCATION_THRESHOLD = 0.0001; // ~10 metrov
  const merged: ChargingStation[] = [];
  const processed = new Set<string>();

  for (const station of stations) {
    if (processed.has(station.id)) continue;

    // Nájsť všetky stanice na rovnakej lokácii
    const nearbyStations = stations.filter(s =>
      !processed.has(s.id) &&
      Math.abs(s.latitude - station.latitude) < LOCATION_THRESHOLD &&
      Math.abs(s.longitude - station.longitude) < LOCATION_THRESHOLD
    );

    if (nearbyStations.length > 1) {
      // Zlúčiť stanice
      const allConnectors = nearbyStations.flatMap(s =>
        s.connectors.map(c => ({
          ...c,
          // Pridať info o strane (L/P) do názvu konektora
          name: s.name.includes(' L') ? 'Ľavá' : s.name.includes(' P') ? 'Pravá' : undefined,
        }))
      );

      // Určiť celkový stav - ak aspoň jeden konektor je dostupný, stanica je dostupná
      const hasAvailable = allConnectors.some(c => c.status === 'available');
      const allOffline = allConnectors.every(c => c.status === 'offline');
      let mergedStatus: ChargingStation['status'] = 'available';
      if (allOffline) mergedStatus = 'offline';
      else if (!hasAvailable) mergedStatus = 'occupied';

      // Vytvoriť zlúčenú stanicu
      const baseName = station.name.replace(/ [LP]$/, '').trim();
      merged.push({
        ...station,
        id: nearbyStations.map(s => s.id).join('_'),
        name: baseName,
        status: mergedStatus,
        connectors: allConnectors,
      });

      // Označiť všetky ako spracované
      nearbyStations.forEach(s => processed.add(s.id));
    } else {
      // Samostatná stanica
      merged.push(station);
      processed.add(station.id);
    }
  }

  return merged;
}

// Získanie všetkých staníc cez server-side proxy (kvôli CORS)
export async function getStations(filter: number = STATION_FILTER.ALL): Promise<ChargingStation[]> {
  try {
    // Použiť lokálny API proxy namiesto priameho volania na eCarUp (kvôli CORS)
    const response = await fetch(`/api/ecarup/stations?filter=${filter}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data: ECarUpStationResponse = await response.json();
    const allStations = (data.stations || []).map(mapECarUpStation);

    // Filtrovať stanice s platnými súradnicami (latitude a longitude !== 0)
    const validStations = allStations.filter(s => s.latitude !== 0 && s.longitude !== 0);

    // Zlúčiť stanice na rovnakej lokácii (L a P)
    const mergedStations = mergeNearbyStations(validStations);

    console.log(`Loaded ${mergedStations.length} stations from API (${validStations.length} before merge, ${allStations.length - validStations.length} filtered without coordinates)`);
    return mergedStations;
  } catch (error) {
    console.error('Failed to fetch stations from API, using mock data:', error);
    return getMockStations();
  }
}

// Získanie staníc v okolí (client-side filtrovanie keďže API nepodporuje nearby)
export async function getNearbyStations(
  latitude: number,
  longitude: number,
  radius: number = 10 // km
): Promise<ChargingStation[]> {
  const stations = await getStations();

  // Filtrovanie podľa vzdialenosti
  return stations.filter(station => {
    const distance = calculateDistance(latitude, longitude, station.latitude, station.longitude);
    return distance <= radius;
  });
}

// Haversine formula pre výpočet vzdialenosti
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Polomer Zeme v km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Získanie detailu stanice cez server-side proxy
export async function getStationById(id: string): Promise<ChargingStation | null> {
  if (isDemoMode()) {
    const stations = getMockStations();
    return stations.find(s => s.id === id) || null;
  }

  try {
    const response = await fetch(`/api/ecarup/station/${id}`);
    if (!response.ok) {
      return null;
    }
    const data: ECarUpStation = await response.json();
    return mapECarUpStation(data);
  } catch {
    return null;
  }
}

// Filtrovanie staníc
export function filterStations(
  stations: ChargingStation[],
  filters: StationFilters
): ChargingStation[] {
  return stations.filter((station) => {
    if (filters.onlyAvailable && station.status !== 'available') {
      return false;
    }

    if (filters.connectorTypes && filters.connectorTypes.length > 0) {
      const hasMatchingConnector = station.connectors.some((c) =>
        filters.connectorTypes!.includes(c.type)
      );
      if (!hasMatchingConnector) return false;
    }

    if (filters.minPower) {
      const hasEnoughPower = station.connectors.some((c) => c.power >= filters.minPower!);
      if (!hasEnoughPower) return false;
    }

    if (filters.maxPrice && station.pricePerKwh > filters.maxPrice) {
      return false;
    }

    return true;
  });
}

// Mock dáta pre demo mód a fallback
export function getMockStations(): ChargingStation[] {
  return [
    {
      id: '1',
      name: 'Aupark Shopping Center',
      address: 'Einsteinova 18, Bratislava',
      latitude: 48.1314,
      longitude: 17.1082,
      status: 'available',
      connectors: [
        { id: 'c1', type: 'Type2', power: 22, status: 'available' },
        { id: 'c2', type: 'CCS', power: 50, status: 'available' },
      ],
      pricePerKwh: 0.35,
      operator: 'ZSE Drive',
      rating: 4.5,
      reviewCount: 28,
    },
    {
      id: '2',
      name: 'Eurovea',
      address: 'Pribinova 8, Bratislava',
      latitude: 48.1408,
      longitude: 17.1225,
      status: 'occupied',
      connectors: [
        { id: 'c3', type: 'Type2', power: 22, status: 'charging' },
        { id: 'c4', type: 'CCS', power: 100, status: 'available' },
      ],
      pricePerKwh: 0.42,
      operator: 'GreenWay',
      rating: 4.2,
      reviewCount: 45,
    },
    {
      id: '3',
      name: 'IKEA Bratislava',
      address: 'Ivanská cesta 18, Bratislava',
      latitude: 48.1683,
      longitude: 17.1836,
      status: 'available',
      connectors: [
        { id: 'c5', type: 'Type2', power: 11, status: 'available' },
        { id: 'c6', type: 'Type2', power: 11, status: 'available' },
      ],
      pricePerKwh: 0.29,
      operator: 'IKEA',
      rating: 4.0,
      reviewCount: 15,
    },
    {
      id: '4',
      name: 'Central Shopping Center',
      address: 'Metodova 6, Bratislava',
      latitude: 48.1545,
      longitude: 17.1285,
      status: 'offline',
      connectors: [
        { id: 'c7', type: 'CHAdeMO', power: 50, status: 'offline' },
      ],
      pricePerKwh: 0.38,
      operator: 'ZSE Drive',
      rating: 3.8,
      reviewCount: 12,
    },
    {
      id: '5',
      name: 'Avion Shopping Park',
      address: 'Ivanská cesta 16, Bratislava',
      latitude: 48.1695,
      longitude: 17.1798,
      status: 'available',
      connectors: [
        { id: 'c8', type: 'Type2', power: 22, status: 'available' },
        { id: 'c9', type: 'CCS', power: 150, status: 'available' },
        { id: 'c10', type: 'CHAdeMO', power: 50, status: 'available' },
      ],
      pricePerKwh: 0.40,
      operator: 'Ionity',
      rating: 4.7,
      reviewCount: 52,
    },
    {
      id: '6',
      name: 'Bory Mall',
      address: 'Lamač 6780, Bratislava',
      latitude: 48.1892,
      longitude: 17.0531,
      status: 'available',
      connectors: [
        { id: 'c11', type: 'Type2', power: 22, status: 'available' },
        { id: 'c12', type: 'Type2', power: 22, status: 'charging' },
      ],
      pricePerKwh: 0.32,
      operator: 'ZSE Drive',
      rating: 4.3,
      reviewCount: 31,
    },
  ];
}
