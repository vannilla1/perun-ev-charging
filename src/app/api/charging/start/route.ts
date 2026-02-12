import { NextRequest, NextResponse } from 'next/server';

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

    // eCarUp Public API je primárne na čítanie
    // Pre spustenie nabíjania je potrebný OCPP protokol alebo fyzická interakcia
    //
    // Možnosti implementácie v produkcii:
    // 1. OCPP 1.6/2.0 websocket pripojenie na stanicu
    // 2. Integrácia s eCarUp backend systémom (vyžaduje partnerský prístup)
    // 3. Smart-me Direct API (ak sú stanice smart-me zariadenia)

    const apiUrl = process.env.NEXT_PUBLIC_ECARUP_API_URL || 'https://public-api.ecarup.com';

    // Pokus o získanie stavu konektora pred spustením
    try {
      const accessToken = await getAccessToken();

      // Kontrola či je konektor dostupný
      const statusResponse = await fetch(
        `${apiUrl}/v1/station/${stationId}/connectors/${connectorId || 'default'}/active-charging`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (statusResponse.ok) {
        const activeCharging = await statusResponse.json();

        if (activeCharging && activeCharging.status === 'Charging') {
          return NextResponse.json(
            { error: 'Na tomto konektore už prebieha nabíjanie' },
            { status: 409 }
          );
        }
      }
    } catch (apiError) {
      console.log('API check skipped:', apiError);
    }

    // Pre demo/MVP vrátime simulovanú odpoveď
    // V produkcii by tu bola skutočná OCPP integrácia
    const sessionId = `session-${Date.now()}-${stationId}`;

    return NextResponse.json({
      success: true,
      sessionId,
      stationId,
      connectorId: connectorId || 'default',
      status: 'starting',
      message: 'Nabíjanie sa pripravuje. Pripojte kábel k vozidlu.',
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

// Pomocná funkcia na získanie access tokenu
async function getAccessToken(): Promise<string> {
  const oauthUrl = process.env.NEXT_PUBLIC_OAUTH_URL || 'https://smart-me.com/oauth/token';
  const clientId = process.env.NEXT_PUBLIC_ECARUP_CLIENT_ID || '';
  const clientSecret = process.env.ECARUP_CLIENT_SECRET || '';

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', 'ecarup');

  const response = await fetch(oauthUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    throw new Error('Failed to get access token');
  }

  const data = await response.json();
  return data.access_token;
}
