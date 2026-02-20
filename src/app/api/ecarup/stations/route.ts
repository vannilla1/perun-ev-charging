import { NextResponse } from 'next/server';

const ECARUP_API_BASE = 'https://public-api.ecarup.com';
const OAUTH_TOKEN_URL = 'https://api.smart-me.com/oauth/token';

// Server-side cache pre token
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

// Cache pre zoznam staníc (2 minúty)
let stationsListCache: Array<Record<string, unknown>> | null = null;
let stationsListCacheExpiry: number | null = null;
const STATIONS_LIST_CACHE_TTL = 2 * 60 * 1000; // 2 minúty

// Cache pre stavy staníc (2 minúty, obnovované na pozadí)
let stationStatesCache: Map<string, string> = new Map();
let statesCacheExpiry: number | null = null;
const STATES_CACHE_TTL = 2 * 60 * 1000; // 2 minúty

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
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const state = data.connectors?.[0]?.state;
    if (state) {
      return { id: stationId, state };
    }
    return null;
  } catch {
    return null;
  }
}

// Background refresh stavov staníc - NEBLOKUJE odpoveď
async function refreshStatesInBackground(
  stations: Array<{ id: string }>,
  accessToken: string,
): Promise<void> {
  if (isFetchingStates) return; // Už prebieha refresh
  isFetchingStates = true;

  const startTime = Date.now();
  console.log(`[Background] Refreshing states for ${stations.length} stations...`);

  try {
    // Fetch ALL station details in parallel (nie v batchoch – je to na pozadí)
    const results = await Promise.allSettled(
      stations.map(station => getStationDetail(station.id, accessToken))
    );

    const newCache = new Map<string, string>();
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        newCache.set(result.value.id, result.value.state);
      }
    });

    stationStatesCache = newCache;
    statesCacheExpiry = Date.now() + STATES_CACHE_TTL;
    console.log(`[Background] Cached states for ${newCache.size} stations in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('[Background] State refresh failed:', error);
  } finally {
    isFetchingStates = false;
  }
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
    // 1. Použiť cache zoznamu staníc ak je platná
    const stationsListNeedsRefresh = !stationsListCache || !stationsListCacheExpiry || Date.now() > stationsListCacheExpiry;

    let stations: Array<Record<string, unknown>>;

    if (!stationsListNeedsRefresh && stationsListCache) {
      stations = stationsListCache;
    } else {
      const response = await fetch(
        `${ECARUP_API_BASE}/v1/stations?filter=${filter}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
          cache: 'no-store',
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
      stations = data.stations || [];

      // Uložiť do cache
      stationsListCache = stations;
      stationsListCacheExpiry = Date.now() + STATIONS_LIST_CACHE_TTL;
    }

    // 2. Pridať stavy z cache (aj zastaralé – stale-while-revalidate)
    const stationsWithState = stations.map((station: Record<string, unknown>) => ({
      ...station,
      connectors: (station.connectors as Array<Record<string, unknown>> | undefined)?.map(connector => ({
        ...connector,
        state: stationStatesCache.get(station.id as string) || (connector as Record<string, unknown>).state,
      })),
    }));

    // 3. Ak treba refresh stavov, spustiť na POZADÍ (neblokuje odpoveď)
    const statesNeedRefresh = !statesCacheExpiry || Date.now() > statesCacheExpiry;
    if (statesNeedRefresh && !isFetchingStates) {
      // Fire-and-forget – nečakáme na výsledok
      refreshStatesInBackground(
        stations as Array<{ id: string }>,
        accessToken,
      ).catch(() => { /* handled inside */ });
    }

    // 4. Vrátiť odpoveď OKAMŽITE
    return NextResponse.json(
      { stations: stationsWithState },
      {
        headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
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
