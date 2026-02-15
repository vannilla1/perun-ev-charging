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

// POST /api/charging/start
// Spustenie nabíjania na stanici
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stationId, connectorId } = body;

    if (!stationId) {
      return NextResponse.json(
        { error: 'ID stanice je povinné' },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Nepodarilo sa autentifikovať s API' },
        { status: 401 }
      );
    }

    // 1. Najprv získame detail stanice pre overenie
    const stationResponse = await fetch(
      `${ECARUP_API_BASE}/v1/station/${stationId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!stationResponse.ok) {
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
        `${ECARUP_API_BASE}/v1/station/${stationId}/connectors/${connector.id}/active-charging`,
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

    const sessionId = `session-${Date.now()}-${stationId}-${connector.id}`;

    // Vrátime eCarUp payment URL ak existuje
    const paymentUrl = stationData.paymentUrl || `https://ecarup.com/charge/${stationId}`;

    return NextResponse.json({
      success: true,
      sessionId,
      stationId,
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
