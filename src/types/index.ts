// Základné typy pre EV Nabíjačka aplikáciu

// Nabíjacia stanica
export interface ChargingStation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: StationStatus;
  connectors: Connector[];
  pricePerKwh: number;
  pricePerH?: number;
  operator: string;
  openingHours?: string;
  amenities?: string[];
  rating?: number;
  reviewCount?: number;
}

export type StationStatus = 'available' | 'occupied' | 'offline' | 'maintenance';

// Konektor
export interface Connector {
  id: string;
  type: ConnectorType;
  power: number; // kW
  status: ConnectorStatus;
  pricePerKwh?: number;
  currentSession?: ChargingSession;
}

export type ConnectorType = 'Type2' | 'CCS' | 'CHAdeMO' | 'Type1' | 'Tesla';
export type ConnectorStatus = 'available' | 'charging' | 'offline' | 'reserved';

// Nabíjacia relácia
export interface ChargingSession {
  id: string;
  stationId: string;
  stationName: string;
  connectorId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  energyDelivered: number; // kWh
  currentPower?: number; // kW
  cost: number; // EUR
  status: SessionStatus;
}

export type SessionStatus = 'active' | 'completed' | 'cancelled' | 'error';

// História nabíjaní
export interface ChargingHistory {
  sessions: ChargingSession[];
  totalEnergy: number; // kWh
  totalCost: number; // EUR
  totalSessions: number;
}

// Používateľ
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
  preferredLanguage: 'sk' | 'en';
}

// Platobná metóda
export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'bank';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

// API Response typy
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

// eCarUp OAuth Response
export interface ECarUpTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// Navigačné typy
export type NavigationTab = 'map' | 'charging' | 'history' | 'profile';

// Filter typy
export interface StationFilters {
  connectorTypes?: ConnectorType[];
  minPower?: number;
  maxPrice?: number;
  onlyAvailable?: boolean;
  maxDistance?: number; // km
}
