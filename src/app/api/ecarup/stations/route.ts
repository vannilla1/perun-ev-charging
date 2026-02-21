import { NextResponse } from 'next/server';

const ECARUP_API_BASE = 'https://public-api.ecarup.com';
const OAUTH_TOKEN_URL = 'https://api.smart-me.com/oauth/token';

// Server-side cache pre token
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

// Cache pre zoznam staníc (2 minúty)
let stationsListCache: Array<Record<string, unknown>> | null = null;
let stationsListCacheExpiry: number | null = null;
const STATIONS_LIST_CACHE_TTL = 2 * 60 * 1000;

// Cache pre stavy staníc (2 minúty, obnovované na pozadí)
let stationStatesCache: Map<string, string> = new Map();
let statesCacheExpiry: number | null = null;
const STATES_CACHE_TTL = 2 * 60 * 1000;

// Flag na zabránenie concurrent fetching
let isFetchingStates = false;

// Promise pre prvý fetch — ostatné requesty na ňu čakajú
let initialFetchPromise: Promise<void> | null = null;

const BATCH_SIZE = 8;
const BATCH_DELAY = 200; // ms medzi batchmi

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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Refresh stavov v batchoch — nepreťažuje API
async function fetchStatesInBatches(
  stations: Array<{ id: string }>,
  accessToken: string,
): Promise<void> {
  if (isFetchingStates) return;
  isFetchingStates = true;

  const startTime = Date.now();
  console.log(`[States] Fetching states for ${stations.length} stations in batches of ${BATCH_SIZE}...`);

  try {
    const newCache = new Map<string, string>();

    for (let i = 0; i < stations.length; i += BATCH_SIZE) {
      const batch = stations.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(station => getStationDetail(station.id, accessToken))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          newCache.set(result.value.id, result.value.state);
        }
      });

      // Pauza medzi batchmi aby sme nepreťažili API
      if (i + BATCH_SIZE < stations.length) {
        await sleep(BATCH_DELAY);
      }
    }

    stationStatesCache = newCache;
    statesCacheExpiry = Date.now() + STATES_CACHE_TTL;
    console.log(`[States] Cached ${newCache.size}/${stations.length} states in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('[States] Fetch failed:', error);
  } finally {
    isFetchingStates = false;
    initialFetchPromise = null;
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

    // 2. Ak cache stavov je prázdna (prvé načítanie), ČAKAŤ na fetch
    const isFirstLoad = stationStatesCache.size === 0;
    const statesNeedRefresh = !statesCacheExpiry || Date.now() > statesCacheExpiry;

    if (isFirstLoad && !isFetchingStates) {
      // Prvé načítanie — blokujeme a čakáme na stavy
      initialFetchPromise = fetchStatesInBatches(
        stations as Array<{ id: string }>,
        accessToken,
      );
      await initialFetchPromise;
    } else if (isFirstLoad && initialFetchPromise) {
      // Iný request počas prvého načítania — čakáme na ten istý promise
      await initialFetchPromise;
    } else if (statesNeedRefresh && !isFetchingStates) {
      // Následné refreshe — fire-and-forget (stale-while-revalidate)
      fetchStatesInBatches(
        stations as Array<{ id: string }>,
        accessToken,
      ).catch(() => { /* handled inside */ });
    }

    // 3. Pridať stavy z cache
    const stationsWithState = stations.map((station: Record<string, unknown>) => ({
      ...station,
      connectors: (station.connectors as Array<Record<string, unknown>> | undefined)?.map(connector => ({
        ...connector,
        state: stationStatesCache.get(station.id as string) || (connector as Record<string, unknown>).state,
      })),
    }));

    // 4. Vrátiť odpoveď
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
