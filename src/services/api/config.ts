// eCarUp API konfigurácia
// Dokumentácia: https://public-api.ecarup.com/swagger/index.html
// GitHub: https://github.com/eCarUp/ecarup-api-examples

export const API_CONFIG = {
  // eCarUp Public API
  baseUrl: process.env.NEXT_PUBLIC_ECARUP_API_URL || 'https://public-api.ecarup.com',

  // OAuth 2.0 identity server (smart-me)
  // Získanie credentials: www.smart-me.com → username → settings → API & Access → Create OAuth Application
  oauthUrl: process.env.NEXT_PUBLIC_OAUTH_URL || 'https://smart-me.com/oauth/token',

  // Client credentials (z smart-me dashboard)
  clientId: process.env.NEXT_PUBLIC_ECARUP_CLIENT_ID || '',
  clientSecret: process.env.ECARUP_CLIENT_SECRET || '',

  // OAuth scope pre eCarUp API
  scope: 'ecarup',

  // Request configuration
  timeout: 30000, // 30 sekúnd
  retryAttempts: 3,
  retryDelay: 1000, // 1 sekunda
};

// eCarUp API Endpointy (podľa Swagger dokumentácie)
export const API_ENDPOINTS = {
  // Stations - /v1/stations
  stations: {
    // GET /v1/stations - všetky stanice (filter: 0=all, 1=owned, 2=accessible, 3=public)
    list: '/v1/stations',
    // GET /v1/station/{id} - detail stanice
    detail: (id: string) => `/v1/station/${id}`,
  },

  // Active Charging
  charging: {
    // GET /v1/station/{stationId}/connectors/{connectorId}/active-charging
    active: (stationId: string, connectorId: string) =>
      `/v1/station/${stationId}/connectors/${connectorId}/active-charging`,
  },

  // History - /v1/history
  history: {
    // GET /v1/history/station/{id} - história stanice
    byStation: (stationId: string) => `/v1/history/station/${stationId}`,
    // GET /v1/history/driver - história aktuálneho používateľa
    byDriver: '/v1/history/driver',
  },
};

// Station filter typy
export const STATION_FILTER = {
  ALL: 0,
  OWNED: 1,
  ACCESSIBLE: 2,
  PUBLIC: 3,
} as const;

// HTTP status kódy
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};
