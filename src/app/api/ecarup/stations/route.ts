import { NextResponse } from 'next/server';

const ECARUP_API_BASE = 'https://public-api.ecarup.com';
const OAUTH_TOKEN_URL = 'https://api.smart-me.com/oauth/token';

// Server-side cache pre token
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

// Cache pre stavy staníc (30 sekúnd pre aktuálnejšie dáta)
let stationStatesCache: Map<string, string> = new Map();
let statesCacheExpiry: number | null = null;
const STATES_CACHE_TTL = 30 * 1000; // 30 sekúnd

// Flag na zabránenie concurrent fetching
let isFetchingStates = false;

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.NEXT_PUBLIC_SMARTME_CLIENT_ID;
  const clientSecret = process.env.SMARTME_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('OAuth credentials not configured');
    return null;
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      console.error('Failed to get OAuth token:', response.status);
      return null;
    }

    const data = await response.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000 * 0.9);

    return cachedToken;
  } catch (error) {
    console.error('OAuth request failed:', error);
    return null;
  }
}

// Získanie detailu stanice pre stav konektorov
async function getStationDetail(stationId: string, accessToken: string): Promise<{ id: string; state: string } | null> {
  try {
    const response = await fetch(
      `${ECARUP_API_BASE}/v1/station/${stationId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        cache: 'no-store', // Vždy čerstvé dáta
      }
    );

    if (!response.ok) {
      console.warn(`Station ${stationId} detail fetch failed: ${response.status}`);
      return null; // Vrátiť null - nepoznáme stav
    }

    const data = await response.json();
    // Získať stav z prvého konektora
    const state = data.connectors?.[0]?.state;
    if (state) {
      return { id: stationId, state };
    }
    return null;
  } catch (error) {
    console.warn(`Station ${stationId} detail fetch error:`, error);
    return null;
  }
}

// Fetch states in batches to avoid overwhelming the API
async function fetchStatesInBatches(
  stations: Array<{ id: string }>,
  accessToken: string,
  batchSize: number = 10
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (let i = 0; i < stations.length; i += batchSize) {
    const batch = stations.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(station => getStationDetail(station.id, accessToken))
    );

    batchResults.forEach(result => {
      if (result) {
        results.set(result.id, result.state);
      }
    });
  }

  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || '0';

  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Failed to authenticate with eCarUp API' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(
      `${ECARUP_API_BASE}/v1/stations?filter=${filter}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        cache: 'no-store', // Vždy čerstvé dáta
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('eCarUp API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch stations', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const stations = data.stations || [];

    // Ak cache nie je platná a nikto iný práve nefetchuje, získať stavy
    const needsRefresh = !statesCacheExpiry || Date.now() > statesCacheExpiry;

    if (needsRefresh && !isFetchingStates) {
      isFetchingStates = true;
      console.log('Fetching station states in batches...');

      try {
        // Fetch states in batches of 10 to avoid overwhelming the API
        stationStatesCache = await fetchStatesInBatches(stations, accessToken, 10);
        statesCacheExpiry = Date.now() + STATES_CACHE_TTL;
        console.log(`Cached states for ${stationStatesCache.size} stations`);
      } finally {
        isFetchingStates = false;
      }
    }

    // Pridať stav ku každej stanici z cache (nepoužívať default - nechať pôvodný stav z API)
    const stationsWithState = stations.map((station: { id: string; connectors?: Array<{ state?: string }> }) => ({
      ...station,
      connectors: station.connectors?.map(connector => ({
        ...connector,
        // Použiť stav z cache ak existuje, inak ponechať pôvodný stav konektora
        state: stationStatesCache.get(station.id) || connector.state,
      })),
    }));

    // Pridať cache-control header pre klienta
    return NextResponse.json(
      { stations: stationsWithState },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('eCarUp API request failed:', error);
    return NextResponse.json(
      { error: 'API request failed' },
      { status: 500 }
    );
  }
}
