import { NextRequest, NextResponse } from 'next/server';

const ECARUP_API_BASE = 'https://public-api.ecarup.com';
const OAUTH_TOKEN_URL = 'https://api.smart-me.com/oauth/token';

// Cache pre token
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

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

// Funkcia na vyhľadanie stanice podľa serial ID alebo EVSE ID
async function findStationByIdentifier(identifier: string, accessToken: string): Promise<string | null> {
  try {
    // Získame všetky stanice a hľadáme podľa rôznych identifikátorov
    const response = await fetch(
      `${ECARUP_API_BASE}/v1/stations`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch stations:', response.status);
      return null;
    }

    const data = await response.json();
    const stations = data.stations || data || [];

    // Hľadáme stanicu podľa rôznych identifikátorov
    for (const station of stations) {
      // Priame zhody na stanici
      if (station.id === identifier ||
          station.serial === identifier ||
          station.evseId === identifier ||
          station.evseid === identifier) {
        return station.id;
      }

      // Skontrolovať konektory
      if (station.connectors) {
        for (const connector of station.connectors) {
          if (connector.id === identifier ||
              connector.serial === identifier ||
              connector.evseId === identifier ||
              connector.evseid === identifier) {
            return station.id;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding station by identifier:', error);
    return null;
  }
}

// POST /api/charging/start
// Spustenie nabíjania na stanici
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stationId, connectorId, originalUrl } = body;

    if (!stationId) {
      return NextResponse.json(
        { error: 'ID stanice je povinné' },
        { status: 400 }
      );
    }

    // Ak máme originalUrl a stationId je špeciálny marker, presmerujeme na eCarUp
    if (stationId === 'ecarup-redirect' && originalUrl) {
      return NextResponse.json({
        success: true,
        redirectUrl: originalUrl,
        message: 'Presmerovanie na eCarUp platobný portál',
      });
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nepodarilo sa autentifikovať s API' },
        { status: 401 }
      );
    }

    // Skúsime nájsť stanicu podľa identifikátora (serial, EVSE ID, alebo priame ID)
    let resolvedStationId = stationId;

    // Najprv skúsime priamy prístup k stanici
    console.log(`Trying direct station lookup: ${stationId}`);
    let stationFound = false;

    try {
      const directResponse = await fetch(
        `${ECARUP_API_BASE}/v1/station/${stationId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        }
      );
      stationFound = directResponse.ok;
    } catch {
      stationFound = false;
    }

    // Ak priamy prístup nefunguje, skúsime vyhľadať podľa identifikátora
    if (!stationFound) {
      console.log(`Direct lookup failed, searching by identifier: ${stationId}`);
      const foundId = await findStationByIdentifier(stationId, accessToken);
      if (foundId) {
        resolvedStationId = foundId;
        console.log(`Resolved identifier ${stationId} to station ID ${resolvedStationId}`);
      } else {
        console.log(`Station not found by identifier: ${stationId}`);
      }
    }

    // 1. Najprv získame detail stanice pre overenie
    const stationResponse = await fetch(
      `${ECARUP_API_BASE}/v1/station/${resolvedStationId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!stationResponse.ok) {
      // Ak máme originalUrl, presmerujeme na eCarUp namiesto chyby
      if (originalUrl) {
        console.log(`Station not found, redirecting to original URL: ${originalUrl}`);
        return NextResponse.json({
          success: true,
          redirectUrl: originalUrl,
          message: 'Stanica nebola nájdená v našom systéme. Presmerovanie na eCarUp.',
        });
      }
      return NextResponse.json(
        { error: 'Stanica nebola nájdená' },
        { status: 404 }
      );
    }

    const stationData = await stationResponse.json();

    // 2. Nájdeme správny konektor
    const connector = connectorId && connectorId !== 'default'
      ? stationData.connectors?.find((c: { id: string }) => c.id === connectorId)
      : stationData.connectors?.[0];

    if (!connector) {
      return NextResponse.json(
        { error: 'Konektor nebol nájdený' },
        { status: 404 }
      );
    }

    // 3. Skontrolujeme či je konektor dostupný
    const connectorState = connector.state || 'UNKNOWN';

    if (connectorState === 'UNAVAILABLE' || connectorState === 'FAULTED') {
      return NextResponse.json(
        { error: 'Konektor nie je dostupný', connectorState },
        { status: 409 }
      );
    }

    // 4. Skontrolujeme či už neprebieha nabíjanie
    try {
      const activeResponse = await fetch(
        `${ECARUP_API_BASE}/v1/station/${resolvedStationId}/connectors/${connector.id}/active-charging`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
          cache: 'no-store',
        }
      );

      if (activeResponse.ok) {
        const activeCharging = await activeResponse.json();

        if (activeCharging && activeCharging.status === 'Charging') {
          return NextResponse.json(
            {
              error: 'Na tomto konektore už prebieha nabíjanie',
              activeCharging: {
                startTime: activeCharging.startTime,
                meterValue: activeCharging.meterValue,
              }
            },
            { status: 409 }
          );
        }
      }
    } catch (activeError) {
      console.log('Active charging check skipped:', activeError);
    }

    // 5. eCarUp Public API nepodporuje remote start
    // Vrátime informácie pre klienta aby mohol pokračovať
    // V realite by používateľ musel:
    // - Použiť RFID kartu
    // - Alebo eCarUp mobilnú aplikáciu
    // - Alebo platobný portál cez QR kód

    const sessionId = `session-${Date.now()}-${resolvedStationId}-${connector.id}`;

    // Vrátime eCarUp payment URL ak existuje
    const paymentUrl = stationData.paymentUrl || `https://ecarup.com/charge/${resolvedStationId}`;

    return NextResponse.json({
      success: true,
      sessionId,
      stationId: resolvedStationId,
      originalStationId: stationId !== resolvedStationId ? stationId : undefined,
      connectorId: connector.id,
      connectorNumber: connector.number,
      status: 'pending_authorization',
      message: 'Pripojte kábel a autorizujte nabíjanie na stanici.',
      station: {
        name: stationData.name,
        address: [stationData.street, stationData.city].filter(Boolean).join(', '),
        maxPower: connector.maxpower ? connector.maxpower / 1000 : null,
        plugType: connector.plugtype,
      },
      // Pre prípad že chceme presmerovať na eCarUp platbu
      paymentUrl,
      startTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Start charging error:', error);
    return NextResponse.json(
      { error: 'Nepodarilo sa spustiť nabíjanie' },
      { status: 500 }
    );
  }
}
