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

// Cache pre ceny staníc (1 hodina — ceny sa menia zriedka)
let stationPricesCache: Map<string, { pricePerKwh: number; pricePerH: number }> = new Map();
let pricesCacheExpiry: number | null = null;
const PRICES_CACHE_TTL = 60 * 60 * 1000; // 1 hodina

// Cache pre špeciálnych používateľov (emaily s individuálnymi cenami)
let stationSpecialUsersCache: Map<string, Set<string>> = new Map();

// Flagy na zabránenie concurrent fetching
let isFetchingStates = false;
let isFetchingPrices = false;

// Promise pre prvý fetch — ostatné requesty na ňu čakajú
let initialFetchPromise: Promise<void> | null = null;
let initialPriceFetchPromise: Promise<void> | null = null;

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

// Získanie detailu stanice pre stav konektorov + špeciálnych používateľov
async function getStationDetail(stationId: string, accessToken: string): Promise<{ id: string; state: string; specialUsers: string[] } | null> {
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

    // Extrahovať emaily špeciálnych používateľov zo všetkých konektorov
    const specialUsers: string[] = [];
    for (const connector of (data.connectors || [])) {
      const users = connector.access?.specialUsers || [];
      for (const user of users) {
        if (user.email && !specialUsers.includes(user.email.toLowerCase())) {
          specialUsers.push(user.email.toLowerCase());
        }
      }
    }

    if (state) {
      return { id: stationId, state, specialUsers };
    }
    return null;
  } catch {
    return null;
  }
}

// Získanie verejnej ceny stanice z charging history
// Filtruje špeciálne/individuálne ceny viazané na konkrétnych používateľov
async function getStationPrice(
  stationId: string,
  accessToken: string,
  specialUserEmails: Set<string>,
): Promise<{ id: string; pricePerKwh: number; pricePerH: number } | null> {
  try {
    const response = await fetch(
      `${ECARUP_API_BASE}/v1/history/station/${stationId}`,
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
    const histories = data.histories || [];

    // 1. Hľadať verejnú cenu — záznamy od NIE-špeciálnych používateľov
    // Špeciálni = email v zozname specialUsers (majú individuálne ceny)
    // Akceptujeme anonymné tokeny (väčšina verejných používateľov), ale len ak
    // sú nedávne (< 6 mesiacov), lebo ceny sa menia a staré záznamy sú nespoľahlivé
    const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - SIX_MONTHS_MS);

    for (const h of histories) {
      const priceInfo = h.station?.priceInformation;
      if (!priceInfo || (priceInfo.pricePerKwh <= 0 && priceInfo.pricePerH <= 0)) continue;

      const driver = (h.driverIdentifier || '').toLowerCase();

      // Preskočiť špeciálnych používateľov (emaily s individuálnymi cenami)
      if (specialUserEmails.size > 0 && specialUserEmails.has(driver)) continue;

      // Skontrolovať dátum záznamu — staré záznamy môžu mať neaktuálne ceny
      const recordDate = h.startTime ? new Date(h.startTime) : null;
      if (recordDate && recordDate < cutoffDate) {
        // Starý záznam (> 6 mesiacov) — preskočiť, cena mohla byť medzitým zmenená
        continue;
      }

      // Nedávny záznam od ne-špeciálneho používateľa — verejná cena
      return {
        id: stationId,
        pricePerKwh: priceInfo.pricePerKwh || 0,
        pricePerH: priceInfo.pricePerH || 0,
      };
    }

    // 2. Žiadny nedávny verejný záznam. Ak existujú záznamy s cenou (staré alebo špeciálne),
    // nevieme aktuálnu verejnú cenu → vrátiť null pre sieťový medián.
    const hasAnyPricedRecord = histories.some((h: Record<string, unknown>) => {
      const priceInfo = (h.station as Record<string, unknown>)?.priceInformation as Record<string, number> | undefined;
      return priceInfo && priceInfo.pricePerKwh > 0;
    });
    if (hasAnyPricedRecord) {
      console.log(`[Prices] Station ${stationId}: no recent public price found, returning null for median fallback`);
      return null;
    }

    // 3. Žiadne záznamy s cenou vôbec — skontrolovať bez špeciálnych používateľov
    // (stanica bez specialUsers a bez ceny = zadarmo)
    if (histories.length > 0) {
      return { id: stationId, pricePerKwh: 0, pricePerH: 0 };
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
    const newSpecialUsersCache = new Map<string, Set<string>>();

    for (let i = 0; i < stations.length; i += BATCH_SIZE) {
      const batch = stations.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(station => getStationDetail(station.id, accessToken))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          newCache.set(result.value.id, result.value.state);
          // Uložiť špeciálnych používateľov pre neskoršie filtrovanie cien
          if (result.value.specialUsers.length > 0) {
            newSpecialUsersCache.set(result.value.id, new Set(result.value.specialUsers));
          }
        }
      });

      if (i + BATCH_SIZE < stations.length) {
        await sleep(BATCH_DELAY);
      }
    }

    stationStatesCache = newCache;
    stationSpecialUsersCache = newSpecialUsersCache;
    statesCacheExpiry = Date.now() + STATES_CACHE_TTL;
    const specialCount = newSpecialUsersCache.size;
    console.log(`[States] Cached ${newCache.size}/${stations.length} states (${specialCount} stations with special users) in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('[States] Fetch failed:', error);
  } finally {
    isFetchingStates = false;
    initialFetchPromise = null;
  }
}

// Fetch cien z history v batchoch
async function fetchPricesInBatches(
  stations: Array<{ id: string; name?: string }>,
  accessToken: string,
): Promise<void> {
  if (isFetchingPrices) return;
  isFetchingPrices = true;

  const startTime = Date.now();
  console.log(`[Prices] Fetching prices for ${stations.length} stations in batches of ${BATCH_SIZE}...`);

  try {
    const newCache = new Map<string, { pricePerKwh: number; pricePerH: number }>();

    for (let i = 0; i < stations.length; i += BATCH_SIZE) {
      const batch = stations.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(station => {
          const specialUsers = stationSpecialUsersCache.get(station.id) || new Set<string>();
          return getStationPrice(station.id, accessToken, specialUsers);
        })
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          newCache.set(result.value.id, {
            pricePerKwh: result.value.pricePerKwh,
            pricePerH: result.value.pricePerH,
          });
        }
      });

      if (i + BATCH_SIZE < stations.length) {
        await sleep(BATCH_DELAY);
      }
    }

    // Dedenie cien medzi L↔P pármi na rovnakej lokácii
    // Ak jedna strana nemá cenu (0) ale jej partner áno, zdediť cenu
    const stationsWithNames = stations.filter(s => s.name);
    for (const station of stationsWithNames) {
      const name = (station.name || '').trim();
      const cached = newCache.get(station.id);
      const hasPaid = cached && cached.pricePerKwh > 0;

      if (!hasPaid) {
        // Nájsť párový partner (L↔P)
        let partnerName = '';
        if (name.endsWith(' L')) {
          partnerName = name.slice(0, -2) + ' P';
        } else if (name.endsWith(' P')) {
          partnerName = name.slice(0, -2) + ' L';
        }

        if (partnerName) {
          const partner = stationsWithNames.find(s => (s.name || '').trim() === partnerName);
          if (partner) {
            const partnerPrice = newCache.get(partner.id);
            if (partnerPrice && partnerPrice.pricePerKwh > 0) {
              newCache.set(station.id, { ...partnerPrice });
            }
          }
        }
      }
    }

    // Fallback: Ak stanica nemá cenu z histórie a NIE JE Drahňov, použiť sieťový medián
    // Drahňov je jediná stanica, ktorá je reálne zadarmo
    const paidPrices = Array.from(newCache.values())
      .map(p => p.pricePerKwh)
      .filter(p => p > 0)
      .sort((a, b) => a - b);

    if (paidPrices.length > 0) {
      const medianPrice = paidPrices[Math.floor(paidPrices.length / 2)];
      // Nájsť aj mediánovú pricePerH
      const paidPerH = Array.from(newCache.values())
        .map(p => p.pricePerH)
        .filter(p => p > 0)
        .sort((a, b) => a - b);
      const medianPerH = paidPerH.length > 0 ? paidPerH[Math.floor(paidPerH.length / 2)] : 0;

      console.log(`[Prices] Network median: ${medianPrice.toFixed(2)} €/kWh, ${medianPerH.toFixed(2)} €/h`);

      for (const station of stations) {
        const name = (station.name || '').trim();
        const isDrahov = name.toLowerCase().includes('drahňov') || name.toLowerCase().includes('drahnov');
        const cached = newCache.get(station.id);
        const hasPaid = cached && cached.pricePerKwh > 0;

        if (!hasPaid && !isDrahov) {
          // Stanica nemá cenu z histórie a nie je Drahňov — použiť sieťový medián
          newCache.set(station.id, { pricePerKwh: medianPrice, pricePerH: medianPerH });
        }
      }
    }

    const withPrice = Array.from(newCache.values()).filter(p => p.pricePerKwh > 0).length;
    stationPricesCache = newCache;
    pricesCacheExpiry = Date.now() + PRICES_CACHE_TTL;
    console.log(`[Prices] Cached ${newCache.size}/${stations.length} prices (${withPrice} paid, ${stations.length - withPrice} free) in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('[Prices] Fetch failed:', error);
  } finally {
    isFetchingPrices = false;
    initialPriceFetchPromise = null;
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

      stationsListCache = stations;
      stationsListCacheExpiry = Date.now() + STATIONS_LIST_CACHE_TTL;
    }

    // 2. Ak cache stavov je prázdna (prvé načítanie), ČAKAŤ na fetch
    const isFirstLoad = stationStatesCache.size === 0;
    const statesNeedRefresh = !statesCacheExpiry || Date.now() > statesCacheExpiry;

    if (isFirstLoad && !isFetchingStates) {
      initialFetchPromise = fetchStatesInBatches(
        stations as Array<{ id: string }>,
        accessToken,
      );
      await initialFetchPromise;
    } else if (isFirstLoad && initialFetchPromise) {
      await initialFetchPromise;
    } else if (statesNeedRefresh && !isFetchingStates) {
      fetchStatesInBatches(
        stations as Array<{ id: string }>,
        accessToken,
      ).catch(() => { /* handled inside */ });
    }

    // 3. Ceny — prvé načítanie blokuje, potom stale-while-revalidate
    const isFirstPriceLoad = stationPricesCache.size === 0;
    const pricesNeedRefresh = !pricesCacheExpiry || Date.now() > pricesCacheExpiry;

    if (isFirstPriceLoad && !isFetchingPrices) {
      initialPriceFetchPromise = fetchPricesInBatches(
        stations as Array<{ id: string; name?: string }>,
        accessToken,
      );
      await initialPriceFetchPromise;
    } else if (isFirstPriceLoad && initialPriceFetchPromise) {
      // Iný request už fetchuje ceny — čakať na neho
      await initialPriceFetchPromise;
    } else if (pricesNeedRefresh && !isFetchingPrices) {
      // Fire-and-forget — ceny sa menia zriedka
      fetchPricesInBatches(
        stations as Array<{ id: string; name?: string }>,
        accessToken,
      ).catch(() => { /* handled inside */ });
    }

    // 4. Pridať stavy a ceny z cache
    const stationsWithData = stations.map((station: Record<string, unknown>) => {
      const price = stationPricesCache.get(station.id as string);
      return {
        ...station,
        connectors: (station.connectors as Array<Record<string, unknown>> | undefined)?.map(connector => ({
          ...connector,
          state: stationStatesCache.get(station.id as string) || (connector as Record<string, unknown>).state,
          pricePerKwh: price?.pricePerKwh,
          pricePerH: price?.pricePerH,
        })),
      };
    });

    // 5. Vrátiť odpoveď
    return NextResponse.json(
      { stations: stationsWithData },
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
